/**
 * Member 07 — lazy RabbitMQ notification publisher.
 *
 * Design:
 *   * No connection is opened until the first publish. API startup never
 *     depends on the broker.
 *   * One shared connection, one dedicated publisher-confirm channel. The
 *     consumer uses separate channels and is untouched by this module.
 *   * Concurrent first publishes share one initialization attempt.
 *   * Publishing is confirmed by the broker with a bounded timeout. Failures
 *     return false and never throw into an HTTP request.
 *   * Channel close/error invalidates the cached channel, so the next publish
 *     reconnects on demand.
 *   * A timeout does not retry within the same publish call. The consumer's
 *     event idempotency is the final duplicate guard.
 *
 * This module does not provide guaranteed delivery. A publish failure can
 * still be lost unless the caller adds an outbox or another retry mechanism.
 */

import type { ConfirmChannel } from 'amqplib';
import { createRabbitMQConfirmChannel } from '../../config/rabbitmq.js';
import { notificationQueueName } from './notification.queue.js';

const DEFAULT_CONNECT_TIMEOUT_MS = 6_000;
const DEFAULT_CONFIRM_TIMEOUT_MS = 5_000;
const DEFAULT_CLOSE_TIMEOUT_MS = 1_000;
const DEFAULT_FAILURE_COOLDOWN_MS = 0;

export interface PublisherChannel {
  assertQueue(queue: string, options?: { durable?: boolean }): Promise<unknown>;
  sendToQueue(
    queue: string,
    content: Buffer,
    options?: { persistent?: boolean },
    callback?: (error?: Error) => void,
  ): boolean;
  close(): Promise<void>;
  on(event: 'close' | 'error', listener: (...args: unknown[]) => void): unknown;
}

export interface PublisherLogger {
  warn(message: string, error?: unknown): void;
}

export interface NotificationPublisherOptions {
  /** Opens a dedicated confirm channel on the shared broker connection. */
  createConfirmChannel: () => Promise<PublisherChannel | null>;
  /** Runtime queue-name resolver. Defaults to the shared notification config. */
  queueName?: () => string;
  connectTimeoutMs?: number;
  confirmTimeoutMs?: number;
  failureCooldownMs?: number;
  logger?: PublisherLogger;
  now?: () => number;
}

export interface NotificationPublisher {
  publish(payload: Record<string, unknown>): Promise<boolean>;
  close(): Promise<void>;
}

/**
 * Resolve with the value, or null after the timeout. A promise that settles
 * late is still observed so it cannot become an unhandled rejection and so a
 * late publisher channel can be closed instead of leaked.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  onLate?: (value: T) => void,
): Promise<T | null> {
  return new Promise<T | null>(resolve => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(null);
    }, timeoutMs);
    timer.unref?.();

    promise.then(
      value => {
        if (settled) {
          if (value !== undefined && value !== null) onLate?.(value);
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

export function createNotificationPublisher(
  options: NotificationPublisherOptions,
): NotificationPublisher {
  const createConfirmChannel = options.createConfirmChannel;
  const queueName = options.queueName ?? notificationQueueName;
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS;
  const confirmTimeoutMs = options.confirmTimeoutMs ?? DEFAULT_CONFIRM_TIMEOUT_MS;
  const failureCooldownMs =
    options.failureCooldownMs ?? DEFAULT_FAILURE_COOLDOWN_MS;
  const logger: PublisherLogger =
    options.logger ?? {
      warn: (message, error) => console.warn(message, error),
    };
  const now = options.now ?? Date.now;

  let channel: PublisherChannel | null = null;
  let connecting: Promise<PublisherChannel | null> | null = null;
  let closing = false;
  let cooldownUntil = 0;

  const markFailure = () => {
    if (failureCooldownMs > 0) cooldownUntil = now() + failureCooldownMs;
  };

  async function closeQuietly(candidate: PublisherChannel | null): Promise<void> {
    if (!candidate) return;
    try {
      await withTimeout(candidate.close(), DEFAULT_CLOSE_TIMEOUT_MS);
    } catch {
      // A close failure must never escape the publisher.
    }
  }

  function attachLifecycle(candidate: PublisherChannel): PublisherChannel {
    const invalidate = () => {
      if (channel === candidate) channel = null;
    };

    candidate.on('close', invalidate);
    candidate.on('error', () => {
      invalidate();
      void closeQuietly(candidate);
    });
    return candidate;
  }

  async function ensureChannel(): Promise<PublisherChannel | null> {
    if (closing) return null;
    if (channel) return channel;
    if (now() < cooldownUntil) return null;
    if (connecting) return connecting;

    connecting = (async () => {
      try {
        const created = await withTimeout(
          createConfirmChannel(),
          connectTimeoutMs,
          lateChannel => {
            void closeQuietly(lateChannel);
          },
        );

        if (!created) {
          markFailure();
          logger.warn('[notifications] RabbitMQ publisher channel unavailable');
          return null;
        }

        let attached: PublisherChannel;
        try {
          attached = attachLifecycle(created);
        } catch (error) {
          await closeQuietly(created);
          markFailure();
          logger.warn('[notifications] Unable to monitor the publisher channel', error);
          return null;
        }

        const declared = await withTimeout(
          attached.assertQueue(queueName(), { durable: true }),
          connectTimeoutMs,
        );

        if (declared === null) {
          await closeQuietly(attached);
          markFailure();
          logger.warn('[notifications] Timed out declaring the notification queue');
          return null;
        }

        if (closing) {
          await closeQuietly(attached);
          return null;
        }

        channel = attached;
        return attached;
      } catch (error) {
        markFailure();
        logger.warn('[notifications] Unable to initialize the RabbitMQ publisher', error);
        return null;
      } finally {
        connecting = null;
      }
    })();

    return connecting;
  }

  function sendWithConfirm(
    candidate: PublisherChannel,
    queue: string,
    content: Buffer,
  ): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      let settled = false;
      const timer = setTimeout(() => settle(false), confirmTimeoutMs);
      timer.unref?.();

      function settle(ok: boolean): void {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ok);
      }

      try {
        candidate.sendToQueue(queue, content, { persistent: true }, error => {
          settle(!error);
        });
      } catch {
        settle(false);
      }
    });
  }

  async function publish(payload: Record<string, unknown>): Promise<boolean> {
    if (closing) return false;

    try {
      let content: Buffer;
      try {
        content = Buffer.from(JSON.stringify(payload));
      } catch (error) {
        logger.warn('[notifications] Unable to serialize a notification event', error);
        return false;
      }

      const active = await ensureChannel();
      if (!active || closing) return false;

      const confirmed = await sendWithConfirm(active, queueName(), content);
      if (confirmed) return true;

      if (channel === active) channel = null;
      markFailure();
      await closeQuietly(active);
      return false;
    } catch (error) {
      logger.warn('[notifications] Unexpected notification publish failure', error);
      return false;
    }
  }

  async function close(): Promise<void> {
    closing = true;
    const current = channel;
    channel = null;

    if (connecting) {
      try {
        await connecting;
      } catch {
        // ensureChannel() handles its own failures.
      }
    }

    const late = channel;
    channel = null;

    const openChannels = new Set<PublisherChannel>();
    if (current) openChannels.add(current);
    if (late) openChannels.add(late);

    for (const openChannel of openChannels) {
      await closeQuietly(openChannel);
    }
  }

  return { publish, close };
}

function adaptConfirmChannel(channel: ConfirmChannel): PublisherChannel {
  return {
    assertQueue: (queue, options) => channel.assertQueue(queue, options),
    sendToQueue: (queue, content, options, callback) => {
      return channel.sendToQueue(queue, content, options, error => {
        if (!callback) return;
        callback(
          error
            ? error instanceof Error
              ? error
              : new Error(String(error))
            : undefined,
        );
      });
    },
    close: () => channel.close(),
    on: (event, listener) => {
      channel.on(event, listener as (...args: unknown[]) => void);
      return channel;
    },
  };
}

export const notificationPublisher = createNotificationPublisher({
  createConfirmChannel: async () => {
    const channel = await createRabbitMQConfirmChannel();
    return channel ? adaptConfirmChannel(channel) : null;
  },
  queueName: notificationQueueName,
});

export const publishNotificationEvent = (
  payload: Record<string, unknown>,
): Promise<boolean> => notificationPublisher.publish(payload);

export const closeNotificationPublisher = (): Promise<void> =>
  notificationPublisher.close();
