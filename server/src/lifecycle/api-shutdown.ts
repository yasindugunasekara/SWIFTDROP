import {
  createSingleFlightShutdown,
  defaultShutdownScheduler,
  runShutdownStep,
  type ShutdownLogger,
  type ShutdownScheduler,
} from './shutdown.js';

const DEFAULT_HTTP_DRAIN_TIMEOUT_MS = 10_000;
const DEFAULT_RESOURCE_TIMEOUT_MS = 5_000;

export interface ApiShutdownOptions {
  /** Stop accepting new HTTP requests; resolve when in-flight work drains. */
  stopHttp: () => Promise<void>;
  /** Stop accepting/close WebSocket clients, if this process owns them. */
  closeWebSockets?: () => Promise<void>;
  /** Close the notification publisher channel first. */
  closePublisher: () => Promise<void>;
  /** Close the shared broker connection after the publisher. */
  closeBroker: () => Promise<void>;
  logger?: ShutdownLogger;
  httpDrainTimeoutMs?: number;
  resourceTimeoutMs?: number;
  scheduler?: ShutdownScheduler;
  /** Called once after cleanup; production passes process.exit. */
  exit?: (code: number) => void;
}

/**
 * Shutdown controller for the standalone API process only.
 *
 * Next.js embedded API routes do not use this module: their lifecycle is owned
 * by the Next server and does not guarantee process-level shutdown hooks.
 */
export function createApiShutdown(
  options: ApiShutdownOptions,
): (reason?: string) => Promise<void> {
  const logger: ShutdownLogger = options.logger ?? console;
  const scheduler = options.scheduler ?? defaultShutdownScheduler;
  const httpDrainTimeoutMs =
    options.httpDrainTimeoutMs ?? DEFAULT_HTTP_DRAIN_TIMEOUT_MS;
  const resourceTimeoutMs =
    options.resourceTimeoutMs ?? DEFAULT_RESOURCE_TIMEOUT_MS;

  return createSingleFlightShutdown(async reason => {
    logger.info(`[shutdown] API shutdown started (${reason})`);

    await runShutdownStep(
      'HTTP and WebSocket drain',
      async () => {
        const stops: Array<Promise<void>> = [options.stopHttp()];
        if (options.closeWebSockets) stops.push(options.closeWebSockets());

        const results = await Promise.allSettled(stops);
        const failure = results.find(
          (result): result is PromiseRejectedResult => result.status === 'rejected',
        );
        if (failure) throw failure.reason;
      },
      httpDrainTimeoutMs,
      logger,
      scheduler,
    );

    await runShutdownStep(
      'notification publisher close',
      options.closePublisher,
      resourceTimeoutMs,
      logger,
      scheduler,
    );

    await runShutdownStep(
      'RabbitMQ connection close',
      options.closeBroker,
      resourceTimeoutMs,
      logger,
      scheduler,
    );

    logger.info('[shutdown] API shutdown complete');
    options.exit?.(0);
  }, logger);
}
