/**
 * Member 07 — RabbitMQ notification consumer.
 *
 * Delivery guarantees
 *   * The broker is at-least-once, so every message is processed idempotently:
 *     the database enforces UNIQUE (user_id, event_id) and the insert uses
 *     ON CONFLICT DO NOTHING.
 *   * The message is acknowledged ONLY after the database call returns.
 *   * Retry and DLQ copies are published through a publisher-confirm channel.
 *     The original message is acknowledged only after RabbitMQ confirms the
 *     copy, so a false return from sendToQueue (write-buffer backpressure) is
 *     never mistaken for delivery.
 *   * Malformed messages are copied to the dead-letter queue and then acked so
 *     they cannot loop forever.
 *   * Transient database failures are republished with an incremented
 *     x-retry-count header (bounded), then the original is acked. If confirming
 *     the retry or DLQ copy fails, the original is left unacknowledged so the
 *     broker redelivers it.
 *   * One consumer per process; one shared connection, with a dedicated
 *     consumer channel and a dedicated confirm channel.
 */

import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import {
  connectRabbitMQ,
  createRabbitMQChannel,
  createRabbitMQConfirmChannel,
} from '../config/rabbitmq.js';
import { normalizeParcelEvent, parseParcelEvent } from '../modules/notifications/notification.events.js';
import {
  notificationDeadLetterQueueName,
  notificationQueueName,
} from '../modules/notifications/notification.queue.js';
import {
  notificationService,
  type NotificationService,
} from '../modules/notifications/notification.service.js';

// -----------------------------------------------------------------------------
// Public types
// -----------------------------------------------------------------------------

export interface ConsumerMessage {
  content: Buffer;
  properties: {
    headers?: Record<string, unknown>;
  };
}

export interface ConsumerSubscription {
  consumerTag?: string;
}

/** The subset of amqplib's channels this consumer needs. */
export interface NotificationChannel {
  prefetch(count: number): Promise<unknown>;
  assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (message: ConsumerMessage | null) => void,
  ): Promise<ConsumerSubscription>;
  cancel(consumerTag: string): Promise<unknown>;
  close(): Promise<void>;
  on(event: 'close' | 'error', listener: (...args: unknown[]) => void): unknown;
  ack(message: ConsumerMessage): void;
  /** Resolves only after the broker confirms the publish. */
  publish(
    queue: string,
    content: Buffer,
    options?: { persistent?: boolean; headers?: Record<string, unknown> },
  ): Promise<void>;
}

export interface NotificationLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

/** The consumer only needs event processing; the REST methods are unrelated. */
export type NotificationEventProcessor = Pick<NotificationService, 'processEvent'>;

export type ProcessOutcome =
  | 'processed'
  | 'duplicate'
  | 'ignored'
  | 'retried'
  | 'dead-lettered'
  | 'dead-letter-failed';

export interface ProcessNotificationOptions {
  queue?: string;
  deadLetterQueue?: string;
  maxRetries?: number;
  retryDelayMs?: number;
  logger?: NotificationLogger;
}

export type ConsumerLifecycleState =
  | 'idle'
  | 'connecting'
  | 'running'
  | 'waiting'
  | 'stopped';

export interface NotificationConsumerScheduler {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export interface NotificationConsumerSupervisorOptions {
  createChannel: () => Promise<NotificationChannel | null>;
  processMessage?: (
    message: ConsumerMessage,
    service: NotificationEventProcessor,
    channel: NotificationChannel,
    options: ProcessNotificationOptions,
  ) => Promise<ProcessOutcome>;
  service?: NotificationEventProcessor;
  queue?: string;
  deadLetterQueue?: string;
  logger?: NotificationLogger;
  initialBackoffMs?: number;
  maxBackoffMs?: number;
  prefetchCount?: number;
  scheduler?: NotificationConsumerScheduler;
}

export interface NotificationConsumerSupervisor {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
}

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 2_000;
const PUBLISH_CONFIRM_TIMEOUT_MS = 10_000;
const RETRY_COUNT_HEADER = 'x-retry-count';
const DEFAULT_INITIAL_BACKOFF_MS = 1_000;
const DEFAULT_MAX_BACKOFF_MS = 30_000;
const DEFAULT_PREFETCH_COUNT = 10;

// -----------------------------------------------------------------------------
// Message processing (exported for deterministic tests)
// -----------------------------------------------------------------------------

export async function processNotificationMessage(
  message: ConsumerMessage,
  service: NotificationEventProcessor,
  channel: NotificationChannel,
  options: ProcessNotificationOptions = {},
): Promise<ProcessOutcome> {
  const logger = options.logger ?? console;
  const queue = options.queue ?? notificationQueueName();
  const deadLetterQueue = options.deadLetterQueue ?? notificationDeadLetterQueueName();

  let payload: unknown;
  try {
    payload = JSON.parse(message.content.toString('utf8'));
  } catch (error) {
    return moveToDeadLetter(
      message,
      channel,
      { deadLetterQueue, logger },
      'INVALID_JSON',
      error,
      retryCount(message) + 1,
    );
  }

  const parsed = parseParcelEvent(payload);
  if (!parsed.success) {
    return moveToDeadLetter(
      message,
      channel,
      { deadLetterQueue, logger },
      'INVALID_EVENT',
      parsed.error,
      retryCount(message) + 1,
    );
  }

  const event = normalizeParcelEvent(parsed.data);
  if (!event) {
    // Valid JSON, valid shape, but an event this consumer does not handle.
    // Retrying cannot help, and it is not poison data, so acknowledge it.
    logger.warn(
      `[notifications] Unsupported event ignored: ${parsed.data.event ?? parsed.data.eventType ?? 'unknown'}`,
    );
    channel.ack(message);
    return 'ignored';
  }

  try {
    const result = await service.processEvent(event);

    if (result.status === 'parcel_not_found') {
      // The parcel row may be committed moments after the event is published.
      logger.warn(
        `[notifications] Parcel ${event.parcelId} not found for event ${event.eventId}; treating as transient`,
      );
      return retryOrDeadLetter(
        message,
        channel,
        options,
        queue,
        deadLetterQueue,
        logger,
        new Error(`Parcel ${event.parcelId} not found`),
      );
    }

    if (result.status === 'courier_not_assigned') {
      // The assignment event may reach the broker before Member 05's
      // courier_assignments row is committed. Never trust the payload courierId;
      // retry briefly so the database can become the authoritative source.
      logger.warn(
        `[notifications] No active courier assignment for parcel ${event.parcelId}; ` +
        `delaying event ${event.eventId}`,
      );
      return retryOrDeadLetter(
        message,
        channel,
        options,
        queue,
        deadLetterQueue,
        logger,
        new Error('Courier assignment not yet visible'),
      );
    }

    if (result.status === 'no_recipients') {
      logger.info(
        `[notifications] Event ${event.eventId} has no eligible recipients; acknowledged`,
      );
      channel.ack(message);
      return 'ignored';
    }

    // The database write has committed successfully.
    channel.ack(message);

    if (result.inserted === 0) {
      logger.info(
        `[notifications] Duplicate event ${event.eventId} skipped for ${result.skipped} recipient(s)`,
      );
      return 'duplicate';
    }

    logger.info(
      `[notifications] Event ${event.eventId} (${event.eventType}) created ` +
      `${result.inserted}/${result.recipients} notification(s)`,
    );
    return 'processed';
  } catch (error) {
    return retryOrDeadLetter(message, channel, options, queue, deadLetterQueue, logger, error);
  }
}

async function retryOrDeadLetter(
  message: ConsumerMessage,
  channel: NotificationChannel,
  options: ProcessNotificationOptions,
  queue: string,
  deadLetterQueue: string,
  logger: NotificationLogger,
  error: unknown,
): Promise<ProcessOutcome> {
  const attempt = retryCount(message);
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  if (attempt >= maxRetries) {
    return moveToDeadLetter(
      message,
      channel,
      { deadLetterQueue, logger },
      'MAX_RETRIES_EXCEEDED',
      error,
      attempt + 1,
    );
  }

  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  if (retryDelayMs > 0) await sleep(retryDelayMs);

  const headers: Record<string, unknown> = {
    ...(message.properties.headers ?? {}),
    [RETRY_COUNT_HEADER]: attempt + 1,
    'x-last-error': describeError(error).slice(0, 200),
  };

  try {
    // Waits for a publisher confirm. A false return from sendToQueue only means
    // the channel's write buffer is full; it is not a delivery failure.
    await channel.publish(queue, message.content, { persistent: true, headers });
  } catch (publishError) {
    // The original stays unacknowledged, so the broker will redeliver it.
    logger.error(
      '[notifications] Failed to confirm a retry copy; leaving the original unacknowledged',
      publishError,
    );
    return 'dead-letter-failed';
  }

  // The retry copy is confirmed by the broker, so the original can be acked.
  channel.ack(message);
  logger.warn(
    `[notifications] Transient failure; retry ${attempt + 1}/${maxRetries} scheduled`,
  );
  return 'retried';
}

async function moveToDeadLetter(
  message: ConsumerMessage,
  channel: NotificationChannel,
  options: { deadLetterQueue: string; logger: NotificationLogger },
  reason: string,
  error: unknown,
  attempts: number,
): Promise<ProcessOutcome> {
  const envelope = {
    source: 'notifications',
    reason,
    error: describeError(error).slice(0, 500),
    failedAt: new Date().toISOString(),
    attempts,
    original: message.content.toString('utf8').slice(0, 5_000),
  };

  try {
    await channel.publish(
      options.deadLetterQueue,
      Buffer.from(JSON.stringify(envelope)),
      { persistent: true },
    );
  } catch (publishError) {
    // Never acknowledge before the DLQ copy is confirmed by the broker.
    options.logger.error(
      '[notifications] Failed to confirm the DLQ copy; leaving the original unacknowledged',
      publishError,
    );
    return 'dead-letter-failed';
  }

  options.logger.error(`[notifications] Message moved to DLQ (${reason})`);
  channel.ack(message);
  return 'dead-lettered';
}

// -----------------------------------------------------------------------------
// Consumer supervision and bootstrap
// -----------------------------------------------------------------------------

export function createNotificationConsumerSupervisor(
  options: NotificationConsumerSupervisorOptions,
): NotificationConsumerSupervisor {
  const createChannel = options.createChannel;
  const processMessage = options.processMessage ?? processNotificationMessage;
  const service = options.service ?? notificationService;
  const logger: NotificationLogger = options.logger ?? console;
  const initialBackoffMs = Math.max(1, options.initialBackoffMs ?? DEFAULT_INITIAL_BACKOFF_MS);
  const maxBackoffMs = Math.max(initialBackoffMs, options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS);
  const prefetchCount = Math.max(1, options.prefetchCount ?? DEFAULT_PREFETCH_COUNT);
  const scheduler: NotificationConsumerScheduler = options.scheduler ?? {
    set: (callback, delayMs) => setTimeout(callback, delayMs),
    clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
  };
  const getQueue = () => options.queue ?? notificationQueueName();
  const getDeadLetterQueue = () => options.deadLetterQueue ?? notificationDeadLetterQueueName();

  let state: ConsumerLifecycleState = 'idle';
  // Reads through a function so TypeScript does not narrow the mutable state
  // after an assignment; stop() may change it between awaits.
  const isStopped = () => state === 'stopped';
  let activeChannel: NotificationChannel | null = null;
  let consumerTag: string | null = null;
  let reconnectHandle: unknown = null;
  let reconnectDelayMs = initialBackoffMs;
  let reconnectRequested = false;
  let connectingTask: Promise<void> | null = null;
  let stopTask: Promise<void> | null = null;
  const closedChannels = new WeakSet<NotificationChannel>();

  async function closeChannel(channel: NotificationChannel | null): Promise<void> {
    if (!channel || closedChannels.has(channel)) return;

    closedChannels.add(channel);
    try {
      await channel.close();
    } catch (error) {
      logger.error('[notifications] Failed to close the consumer channel', error);
    }
  }

  function scheduleReconnect(reason: string): void {
    if (state === 'stopped' || reconnectHandle !== null) return;

    const failedChannel = activeChannel;
    activeChannel = null;
    consumerTag = null;
    if (failedChannel) void closeChannel(failedChannel);

    const delay = reconnectDelayMs;
    reconnectDelayMs = Math.min(reconnectDelayMs * 2, maxBackoffMs);
    state = 'waiting';
    logger.warn(`[notifications] Reconnecting notification consumer in ${delay}ms (${reason})`);

    reconnectHandle = scheduler.set(() => {
      reconnectHandle = null;
      if (state === 'stopped') return;
      void runAttempt();
    }, delay);
  }

  function handleDisconnect(
    channel: NotificationChannel,
    reason: string,
    error?: unknown,
  ): void {
    if (state === 'stopped' || channel !== activeChannel) return;

    if (error) logger.error(`[notifications] Consumer ${reason}`, error);
    else logger.warn(`[notifications] Consumer ${reason}`);

    if (state === 'connecting') {
      // The attempt is still in flight. Force a closed/errored channel to
      // settle its pending operations, then let the attempt's completion path
      // decide whether to run again or schedule the next backoff.
      reconnectRequested = true;
      void closeChannel(channel);
      return;
    }

    scheduleReconnect(reason);
  }

  async function connectAndConsume(): Promise<void> {
    if (state === 'stopped' || state === 'connecting' || state === 'running') return;

    state = 'connecting';
    reconnectRequested = false;

    let channel: NotificationChannel | null = null;
    try {
      channel = await createChannel();
      if (!channel) throw new Error('RabbitMQ notification channel unavailable');

      if (isStopped()) {
        await closeChannel(channel);
        return;
      }

      const currentChannel = channel;
      activeChannel = currentChannel;
      consumerTag = null;

      currentChannel.on('close', () => {
        handleDisconnect(currentChannel, 'channel closed');
      });
      currentChannel.on('error', error => {
        handleDisconnect(currentChannel, 'channel error', error);
      });

      const queue = getQueue();
      const deadLetterQueue = getDeadLetterQueue();

      await currentChannel.assertQueue(queue, { durable: true });
      await currentChannel.assertQueue(deadLetterQueue, { durable: true });
      await currentChannel.prefetch(prefetchCount);

      const subscription = await currentChannel.consume(queue, message => {
        if (!message) {
          // amqplib delivers a null message when the broker cancels the
          // consumer. Treat it as a disconnect so the consumer is recreated.
          handleDisconnect(currentChannel, 'consumer cancelled');
          return;
        }

        void processMessage(message, service, currentChannel, {
          queue,
          deadLetterQueue,
        }).catch(error => {
          // processNotificationMessage handles ack/retry itself. This is a final
          // guard so an unexpected bug can never crash the worker process.
          logger.error('[notifications] Unhandled consumer error', error);
        });
      });

      if (isStopped()) {
        await closeChannel(currentChannel);
        return;
      }

      if (reconnectRequested || activeChannel !== currentChannel) {
        await closeChannel(currentChannel);
        if (!isStopped()) {
          scheduleReconnect('channel changed during connection setup');
        }
        return;
      }

      consumerTag = subscription.consumerTag ?? null;
      reconnectDelayMs = initialBackoffMs;
      reconnectRequested = false;
      state = 'running';
      logger.info(`📡 [Notifications] Consuming '${queue}' (DLQ: '${deadLetterQueue}')`);
    } catch (error) {
      if (channel && channel === activeChannel) {
        activeChannel = null;
        consumerTag = null;
      }
      if (channel) await closeChannel(channel);
      if (isStopped()) return;

      const reason = reconnectRequested
        ? 'channel changed during connection setup'
        : 'connection attempt failed';
      reconnectRequested = false;
      logger.error('[notifications] Notification consumer connection attempt failed', error);
      scheduleReconnect(reason);
    }
  }

  function runAttempt(): Promise<void> {
    if (connectingTask) return connectingTask;

    connectingTask = connectAndConsume().finally(() => {
      connectingTask = null;
    });
    return connectingTask;
  }

  async function start(): Promise<void> {
    if (state === 'stopped') {
      if (stopTask) await stopTask;
      state = 'idle';
      reconnectDelayMs = initialBackoffMs;
    }

    if (connectingTask) return connectingTask;
    if (state !== 'idle') return;

    return runAttempt();
  }

  async function stop(): Promise<void> {
    if (state === 'stopped') {
      if (stopTask) return stopTask;
      return;
    }

    state = 'stopped';

    if (reconnectHandle !== null) {
      scheduler.clear(reconnectHandle);
      reconnectHandle = null;
    }

    const channel = activeChannel;
    const tag = consumerTag;
    activeChannel = null;
    consumerTag = null;

    const task = (async () => {
      if (channel && tag) {
        try {
          await channel.cancel(tag);
        } catch (error) {
          logger.error('[notifications] Failed to cancel the consumer', error);
        }
      }

      await closeChannel(channel);

      if (connectingTask) {
        try {
          await connectingTask;
        } catch {
          // connectAndConsume() handles its own failures.
        }
      }
    })();

    stopTask = task;
    try {
      await task;
    } finally {
      if (stopTask === task) stopTask = null;
      logger.info('[notifications] Notification consumer stopped');
    }
  }

  return {
    start,
    stop,
    isRunning: () => state === 'running',
  };
}

const defaultSupervisor = createNotificationConsumerSupervisor({
  createChannel: async () => {
    const broker = await connectRabbitMQ();
    if (!broker) return null;

    const consumerChannel = await createRabbitMQChannel();
    const publisherChannel = await createRabbitMQConfirmChannel();

    if (!consumerChannel || !publisherChannel) {
      if (consumerChannel) {
        try {
          await consumerChannel.close();
        } catch {
          // Best effort; the broker is unavailable or shutting down.
        }
      }
      if (publisherChannel) {
        try {
          await publisherChannel.close();
        } catch {
          // Best effort; the broker is unavailable or shutting down.
        }
      }
      return null;
    }

    return createChannelAdapter(consumerChannel, publisherChannel);
  },
});

export const startNotificationConsumer = (): Promise<void> => defaultSupervisor.start();
export const stopNotificationConsumer = (): Promise<void> => defaultSupervisor.stop();

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Adapt amqplib's consumer and confirm channels to the interface above. */
function createChannelAdapter(consumer: Channel, publisher: ConfirmChannel): NotificationChannel {
  return {
    prefetch: count => consumer.prefetch(count),
    assertQueue: (queue, options) => consumer.assertQueue(queue, options),
    consume: async (queue, onMessage) => {
      const result = await consumer.consume(queue, (message: ConsumeMessage | null) =>
        onMessage(message),
      );
      const consumerTag = (result as { consumerTag?: unknown } | undefined)?.consumerTag;
      return typeof consumerTag === 'string' ? { consumerTag } : {};
    },
    cancel: consumerTag => consumer.cancel(consumerTag),
    close: async () => {
      const closes: Array<Promise<unknown>> = [];
      try {
        closes.push(Promise.resolve(consumer.close()));
      } catch {
        // Best effort; continue to close the confirm channel.
      }
      try {
        closes.push(Promise.resolve(publisher.close()));
      } catch {
        // Best effort; continue to settle any other close operation.
      }
      await Promise.allSettled(closes);
    },
    on: (event, listener) => {
      consumer.on(event, listener as (...args: unknown[]) => void);
      publisher.on(event, listener as (...args: unknown[]) => void);
      return consumer;
    },
    ack: message => consumer.ack(message as ConsumeMessage),
    publish: (queue, content, options) => publishWithConfirm(publisher, queue, content, options),
  };
}

/**
 * Publish through a confirm channel and resolve only when RabbitMQ confirms the
 * message. The boolean returned by sendToQueue is intentionally ignored: in
 * amqplib it reports write-buffer backpressure, not successful delivery.
 */
function publishWithConfirm(
  channel: ConfirmChannel,
  queue: string,
  content: Buffer,
  options?: { persistent?: boolean; headers?: Record<string, unknown> },
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Timed out waiting for a publisher confirm on '${queue}'`));
    }, PUBLISH_CONFIRM_TIMEOUT_MS);
    timer.unref?.();

    const settle = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error instanceof Error ? error : new Error(String(error)));
      else resolve();
    };

    try {
      channel.sendToQueue(queue, content, options, error => settle(error ?? undefined));
    } catch (error) {
      settle(error);
    }
  });
}

function retryCount(message: ConsumerMessage): number {
  const raw = message.properties.headers?.[RETRY_COUNT_HEADER];
  const parsed = typeof raw === 'number'
    ? raw
    : Number.parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message || error.name;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
