/**
 * Shared shutdown primitives.
 *
 * These helpers only coordinate cleanup callbacks. They never import or close
 * RabbitMQ resources themselves; the process entry point that owns a resource
 * supplies the cleanup operation.
 */

export interface ShutdownLogger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string, error?: unknown): void;
}

export interface ShutdownScheduler {
  set(callback: () => void, timeoutMs: number): unknown;
  clear(handle: unknown): void;
}

export const defaultShutdownScheduler: ShutdownScheduler = {
  set: (callback, timeoutMs) => setTimeout(callback, timeoutMs),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export class ShutdownTimeoutError extends Error {
  constructor(
    readonly label: string,
    readonly timeoutMs: number,
  ) {
    super(`${label} timed out after ${timeoutMs}ms`);
    this.name = 'ShutdownTimeoutError';
  }
}

/**
 * Resolve with the operation, or reject with ShutdownTimeoutError after the
 * budget. The original promise remains observed so a late rejection cannot
 * become an unhandled promise rejection.
 */
export function withShutdownTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
  scheduler: ShutdownScheduler = defaultShutdownScheduler,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const handle = scheduler.set(() => {
      if (settled) return;
      settled = true;
      reject(new ShutdownTimeoutError(label, timeoutMs));
    }, timeoutMs);

    promise.then(
      value => {
        if (settled) return;
        settled = true;
        scheduler.clear(handle);
        resolve(value);
      },
      error => {
        if (settled) return;
        settled = true;
        scheduler.clear(handle);
        reject(error);
      },
    );
  });
}

/** Run one cleanup step, logging its success, failure, or timeout. */
export async function runShutdownStep(
  label: string,
  operation: () => Promise<void>,
  timeoutMs: number,
  logger: ShutdownLogger,
  scheduler: ShutdownScheduler = defaultShutdownScheduler,
): Promise<void> {
  try {
    await withShutdownTimeout(
      Promise.resolve().then(operation),
      timeoutMs,
      label,
      scheduler,
    );
    logger.info(`[shutdown] ${label} complete`);
  } catch (error) {
    if (error instanceof ShutdownTimeoutError) {
      logger.warn(`[shutdown] ${error.message}`);
      return;
    }
    logger.error(`[shutdown] ${label} failed`, error);
  }
}

/**
 * Ensure one shutdown operation per process. Repeated signals return the same
 * promise and never run cleanup twice.
 */
export function createSingleFlightShutdown(
  operation: (reason: string) => Promise<void>,
  logger: ShutdownLogger,
): (reason?: string) => Promise<void> {
  let task: Promise<void> | null = null;

  return (reason = 'shutdown') => {
    if (task) {
      logger.warn(`[shutdown] Shutdown already started; ignoring ${reason}`);
      return task;
    }

    logger.info(`[shutdown] Shutdown requested (${reason})`);
    task = Promise.resolve()
      .then(() => operation(reason))
      .catch(error => {
        logger.error('[shutdown] Shutdown failed', error);
      });
    return task;
  };
}
