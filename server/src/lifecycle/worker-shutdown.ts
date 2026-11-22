import {
  createSingleFlightShutdown,
  defaultShutdownScheduler,
  runShutdownStep,
  type ShutdownLogger,
  type ShutdownScheduler,
} from './shutdown.js';

const DEFAULT_STEP_TIMEOUT_MS = 5_000;

export interface WorkerShutdownOptions {
  /** Stops the notification consumer, its reconnect loop, and its channels. */
  stopConsumer: () => Promise<void>;
  /**
   * Stops the existing webhook worker's retry engine. Its RabbitMQ consumer is
   * attached to the shared connection and is stopped by closeBroker below.
   */
  stopWebhook: () => void;
  /** Closes the worker process's shared RabbitMQ connection. */
  closeBroker: () => Promise<void>;
  logger?: ShutdownLogger;
  stepTimeoutMs?: number;
  scheduler?: ShutdownScheduler;
  /** Called once after cleanup; production passes process.exit. */
  exit?: (code: number) => void;
}

/**
 * Shutdown controller for the long-running worker process.
 *
 * Ordering is deliberate: notification consumer first (stop accepting and
 * clean up its dedicated channels), webhook retry engine second, shared
 * RabbitMQ connection last. The connection is never closed before the other
 * worker resources have been asked to stop.
 */
export function createWorkerShutdown(
  options: WorkerShutdownOptions,
): (reason?: string) => Promise<void> {
  const logger: ShutdownLogger = options.logger ?? console;
  const scheduler = options.scheduler ?? defaultShutdownScheduler;
  const stepTimeoutMs = options.stepTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS;

  return createSingleFlightShutdown(async reason => {
    logger.info(`[shutdown] Worker shutdown started (${reason})`);

    await runShutdownStep(
      'notification consumer stop',
      options.stopConsumer,
      stepTimeoutMs,
      logger,
      scheduler,
    );

    await runShutdownStep(
      'webhook worker stop',
      async () => options.stopWebhook(),
      stepTimeoutMs,
      logger,
      scheduler,
    );

    await runShutdownStep(
      'RabbitMQ connection close',
      options.closeBroker,
      stepTimeoutMs,
      logger,
      scheduler,
    );

    logger.info('[shutdown] Worker shutdown complete');
    options.exit?.(0);
  }, logger);
}
