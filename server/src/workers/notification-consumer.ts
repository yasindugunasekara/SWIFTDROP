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

/** The subset of amqplib's channels this consumer needs. */
export interface NotificationChannel {
  prefetch(count: number): Promise<unknown>;
  assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (message: ConsumerMessage | null) => void,
  ): Promise<unknown>;
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

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const DEFAULT_QUEUE = process.env.RABBITMQ_QUEUE_NOTIFICATIONS || 'swiftdrop_notifications_queue';
const DEFAULT_DEAD_LETTER_QUEUE = process.env.RABBITMQ_QUEUE_DLQ || 'swiftdrop_dead_letter_queue';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_DELAY_MS = 2_000;
const PUBLISH_CONFIRM_TIMEOUT_MS = 10_000;
const RETRY_COUNT_HEADER = 'x-retry-count';

let isRunning = false;

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
  const queue = options.queue ?? DEFAULT_QUEUE;
  const deadLetterQueue = options.deadLetterQueue ?? DEFAULT_DEAD_LETTER_QUEUE;

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
// Consumer bootstrap
// -----------------------------------------------------------------------------

export const startNotificationConsumer = async () => {
  if (isRunning) {
    console.warn('⚠️ Notification consumer is already running in this process.');
    return;
  }
  isRunning = true;

  try {
    console.log('🔄 Initializing Member 7 RabbitMQ Notification Consumer...');

    const broker = await connectRabbitMQ();
    if (!broker) {
      isRunning = false;
      console.warn('⚠️ RabbitMQ not available; notification consumer paused.');
      return;
    }

    const consumerChannel = await createRabbitMQChannel();
    const publisherChannel = await createRabbitMQConfirmChannel();
    if (!consumerChannel || !publisherChannel) {
      isRunning = false;
      console.warn('⚠️ Unable to create RabbitMQ channels; notification consumer paused.');
      return;
    }

    consumerChannel.on('close', () => {
      isRunning = false;
      console.warn('⚠️ Notification consumer channel closed.');
    });

    const channel = createChannelAdapter(consumerChannel, publisherChannel);
    const queue = process.env.RABBITMQ_QUEUE_NOTIFICATIONS || DEFAULT_QUEUE;
    const deadLetterQueue = process.env.RABBITMQ_QUEUE_DLQ || DEFAULT_DEAD_LETTER_QUEUE;

    await channel.assertQueue(queue, { durable: true });
    await channel.assertQueue(deadLetterQueue, { durable: true });
    await channel.prefetch(10);

    await channel.consume(queue, (message) => {
      if (!message) return;
      void processNotificationMessage(message, notificationService, channel, {
        queue,
        deadLetterQueue,
      }).catch(error => {
        // processNotificationMessage handles ack/retry itself. This is a final
        // guard so an unexpected bug can never crash the worker process.
        console.error('[notifications] Unhandled consumer error', error);
      });
    });

    console.log(`📡 [Notifications] Consuming '${queue}' (DLQ: '${deadLetterQueue}')`);
  } catch (error) {
    isRunning = false;
    throw error;
  }
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Adapt amqplib's consumer and confirm channels to the interface above. */
function createChannelAdapter(consumer: Channel, publisher: ConfirmChannel): NotificationChannel {
  return {
    prefetch: count => consumer.prefetch(count),
    assertQueue: (queue, options) => consumer.assertQueue(queue, options),
    consume: (queue, onMessage) =>
      consumer.consume(queue, (message: ConsumeMessage | null) => onMessage(message)),
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
