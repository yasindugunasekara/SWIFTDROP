/**
 * Member 07 — RabbitMQ notification consumer.
 *
 * Delivery guarantees
 *   * The broker is at-least-once, so every message is processed idempotently:
 *     the database enforces UNIQUE (user_id, event_id) and the insert uses
 *     ON CONFLICT DO NOTHING.
 *   * The message is acknowledged ONLY after the database call returns. A crash
 *     before that point causes a redelivery; the redelivery is harmless.
 *   * Malformed messages are copied to the dead-letter queue and then acked so
 *     they cannot loop forever.
 *   * Transient database failures are republished with an incremented
 *     x-retry-count header (bounded), then the original is acked. If publishing
 *     the retry or DLQ copy fails, the original is left unacknowledged so the
 *     broker redelivers it.
 */

import type { Channel, ConsumeMessage } from 'amqplib';
import { connectRabbitMQ } from '../config/rabbitmq.js';
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

/** The subset of amqplib's Channel this consumer needs. */
export interface NotificationChannel {
  prefetch(count: number): Promise<unknown>;
  assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
  consume(
    queue: string,
    onMessage: (message: ConsumerMessage | null) => void,
  ): Promise<unknown>;
  ack(message: ConsumerMessage): void;
  sendToQueue(
    queue: string,
    content: Buffer,
    options?: { persistent?: boolean; headers?: Record<string, unknown> },
  ): boolean;
}

export interface NotificationLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

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
const RETRY_COUNT_HEADER = 'x-retry-count';

// -----------------------------------------------------------------------------
// Message processing (exported for deterministic tests)
// -----------------------------------------------------------------------------

export async function processNotificationMessage(
  message: ConsumerMessage,
  service: NotificationService,
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
      { queue, deadLetterQueue, logger },
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
      { queue, deadLetterQueue, logger },
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
      return retryOrDeadLetter(message, channel, options, queue, deadLetterQueue, logger,
        new Error(`Parcel ${event.parcelId} not found`));
    }

    if (result.status === 'no_recipients') {
      logger.info(
        `[notifications] Event ${event.eventId} has no eligible recipients; acknowledged`,
      );
      channel.ack(message);
      return 'ignored';
    }

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
      { queue, deadLetterQueue, logger },
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
    channel.sendToQueue(queue, message.content, { persistent: true, headers });
  } catch (publishError) {
    // The original stays unacknowledged, so the broker will redeliver it.
    logger.error(
      '[notifications] Failed to republish a message for retry; leaving it unacknowledged',
      publishError,
    );
    return 'dead-letter-failed';
  }

  // Republish succeeded, so the original can be acknowledged safely.
  channel.ack(message);
  logger.warn(
    `[notifications] Transient failure; retry ${attempt + 1}/${maxRetries} scheduled`,
  );
  return 'retried';
}

async function moveToDeadLetter(
  message: ConsumerMessage,
  channel: NotificationChannel,
  options: { queue: string; deadLetterQueue: string; logger: NotificationLogger },
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
    channel.sendToQueue(
      options.deadLetterQueue,
      Buffer.from(JSON.stringify(envelope)),
      { persistent: true },
    );
  } catch (publishError) {
    // Never acknowledge before the DLQ copy is safely published.
    options.logger.error(
      '[notifications] Failed to publish to the dead-letter queue; leaving the message unacknowledged',
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
  console.log('🔄 Initializing Member 7 RabbitMQ Notification Consumer...');

  const broker = await connectRabbitMQ();
  if (!broker?.channel) {
    console.warn('⚠️ RabbitMQ not available; notification consumer paused.');
    return;
  }

  const channel = createChannelAdapter(broker.channel);
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
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Adapt amqplib's Channel to the small interface above. */
function createChannelAdapter(channel: Channel): NotificationChannel {
  return {
    prefetch: count => channel.prefetch(count),
    assertQueue: (queue, options) => channel.assertQueue(queue, options),
    consume: (queue, onMessage) =>
      channel.consume(queue, (message: ConsumeMessage | null) => onMessage(message)),
    ack: message => channel.ack(message as ConsumeMessage),
    sendToQueue: (queue, content, options) => channel.sendToQueue(queue, content, options),
  };
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
