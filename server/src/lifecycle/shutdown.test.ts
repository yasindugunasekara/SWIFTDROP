import assert from 'node:assert/strict';
import test from 'node:test';
import { createApiShutdown } from './api-shutdown.js';
import { createWorkerShutdown } from './worker-shutdown.js';
import {
  createSingleFlightShutdown,
  runShutdownStep,
  type ShutdownLogger,
  type ShutdownScheduler,
} from './shutdown.js';

class FakeScheduler implements ShutdownScheduler {
  private nextId = 1;
  private readonly tasks = new Map<
    number,
    { callback: () => void; timeoutMs: number }
  >();

  set(callback: () => void, timeoutMs: number): unknown {
    const id = this.nextId;
    this.nextId += 1;
    this.tasks.set(id, { callback, timeoutMs });
    return id;
  }

  clear(handle: unknown): void {
    this.tasks.delete(handle as number);
  }

  get pending(): number {
    return this.tasks.size;
  }

  runNext(): number | undefined {
    const next = this.tasks.entries().next();
    if (next.done) return undefined;

    const [id, task] = next.value;
    this.tasks.delete(id);
    task.callback();
    return task.timeoutMs;
  }
}

function recordingLogger() {
  const info: string[] = [];
  const warn: string[] = [];
  const errors: Array<{ message: string; error?: unknown }> = [];
  const logger: ShutdownLogger = {
    info: message => info.push(message),
    warn: message => warn.push(message),
    error: (message, error) => errors.push({ message, error }),
  };
  return { logger, info, warn, errors };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('single-flight shutdown ignores duplicate signals and returns one task', async () => {
  const gate = deferred<void>();
  const { logger, warn } = recordingLogger();
  let calls = 0;

  const shutdown = createSingleFlightShutdown(async () => {
    calls += 1;
    await gate.promise;
  }, logger);

  const first = shutdown('SIGINT');
  const second = shutdown('SIGTERM');

  assert.equal(first, second);
  await flush();
  assert.equal(calls, 1);

  gate.resolve();
  await first;

  const third = shutdown('SIGTERM');
  assert.equal(third, first);
  assert.equal(calls, 1);
  assert.equal(warn.length, 2);
});

test('runShutdownStep logs a timeout without throwing', async () => {
  const scheduler = new FakeScheduler();
  const { logger, warn } = recordingLogger();

  const step = runShutdownStep(
    'test cleanup',
    () => new Promise<void>(() => undefined),
    50,
    logger,
    scheduler,
  );

  assert.equal(scheduler.runNext(), 50);
  await step;

  assert.equal(warn.length, 1);
  assert.match(warn[0], /test cleanup timed out after 50ms/);
});

test('API shutdown closes HTTP/WebSockets, then publisher, then broker', async () => {
  const events: string[] = [];
  const shutdown = createApiShutdown({
    stopHttp: async () => {
      events.push('http');
    },
    closeWebSockets: async () => {
      events.push('websocket');
    },
    closePublisher: async () => {
      events.push('publisher');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: code => events.push(`exit:${code}`),
  });

  await shutdown('SIGTERM');

  assert.deepEqual(events, [
    'http',
    'websocket',
    'publisher',
    'broker',
    'exit:0',
  ]);
});

test('API shutdown waits for in-flight HTTP drain before closing publisher and broker', async () => {
  const httpDrain = deferred<void>();
  const events: string[] = [];
  const shutdown = createApiShutdown({
    stopHttp: async () => {
      events.push('http:start');
      await httpDrain.promise;
      events.push('http:drain');
    },
    closeWebSockets: async () => {
      events.push('websocket');
    },
    closePublisher: async () => {
      events.push('publisher');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: code => events.push(`exit:${code}`),
  });

  const task = shutdown('SIGTERM');
  await flush();

  assert.deepEqual(events, ['http:start', 'websocket']);

  httpDrain.resolve();
  await task;

  assert.deepEqual(events, [
    'http:start',
    'websocket',
    'http:drain',
    'publisher',
    'broker',
    'exit:0',
  ]);
});

test('API shutdown waits for publisher cleanup before closing the shared broker', async () => {
  const publisherDrain = deferred<void>();
  const events: string[] = [];
  const shutdown = createApiShutdown({
    stopHttp: async () => {
      events.push('http');
    },
    closePublisher: async () => {
      events.push('publisher:start');
      await publisherDrain.promise;
      events.push('publisher:done');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: code => events.push(`exit:${code}`),
  });

  const task = shutdown('SIGTERM');
  await flush();

  assert.deepEqual(events, ['http', 'publisher:start']);

  publisherDrain.resolve();
  await task;

  assert.deepEqual(events, [
    'http',
    'publisher:start',
    'publisher:done',
    'broker',
    'exit:0',
  ]);
});

test('API shutdown proceeds after the HTTP drain timeout', async () => {
  const scheduler = new FakeScheduler();
  const { logger, warn } = recordingLogger();
  const events: string[] = [];

  const shutdown = createApiShutdown({
    stopHttp: () => new Promise<void>(() => undefined),
    closeWebSockets: async () => {
      events.push('websocket');
    },
    closePublisher: async () => {
      events.push('publisher');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger,
    scheduler,
    httpDrainTimeoutMs: 50,
    resourceTimeoutMs: 50,
    exit: code => events.push(`exit:${code}`),
  });

  const task = shutdown('SIGTERM');
  await flush();

  assert.equal(scheduler.runNext(), 50);
  await task;

  assert.deepEqual(events, ['websocket', 'publisher', 'broker', 'exit:0']);
  assert.equal(warn.length, 1);
  assert.match(warn[0], /HTTP and WebSocket drain timed out/);
});

test('API shutdown ignores duplicate signals and exits once', async () => {
  let httpCalls = 0;
  let publisherCalls = 0;
  let brokerCalls = 0;
  let exits = 0;

  const shutdown = createApiShutdown({
    stopHttp: async () => {
      httpCalls += 1;
    },
    closePublisher: async () => {
      publisherCalls += 1;
    },
    closeBroker: async () => {
      brokerCalls += 1;
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: () => {
      exits += 1;
    },
  });

  const first = shutdown('SIGINT');
  const second = shutdown('SIGTERM');
  assert.equal(first, second);

  await first;

  assert.equal(httpCalls, 1);
  assert.equal(publisherCalls, 1);
  assert.equal(brokerCalls, 1);
  assert.equal(exits, 1);
});

test('worker shutdown stops consumer, then webhook, then shared broker', async () => {
  const events: string[] = [];
  const shutdown = createWorkerShutdown({
    stopConsumer: async () => {
      events.push('consumer');
    },
    stopWebhook: () => {
      events.push('webhook');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: code => events.push(`exit:${code}`),
  });

  await shutdown('SIGTERM');

  assert.deepEqual(events, ['consumer', 'webhook', 'broker', 'exit:0']);
});

test('worker shutdown waits for consumer cleanup before webhook and broker', async () => {
  const consumerDrain = deferred<void>();
  const events: string[] = [];
  const shutdown = createWorkerShutdown({
    stopConsumer: async () => {
      events.push('consumer:start');
      await consumerDrain.promise;
      events.push('consumer:done');
    },
    stopWebhook: () => {
      events.push('webhook');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: code => events.push(`exit:${code}`),
  });

  const task = shutdown('SIGTERM');
  await flush();

  assert.deepEqual(events, ['consumer:start']);

  consumerDrain.resolve();
  await task;

  assert.deepEqual(events, [
    'consumer:start',
    'consumer:done',
    'webhook',
    'broker',
    'exit:0',
  ]);
});

test('worker shutdown ignores duplicate signals and exits once', async () => {
  let consumerCalls = 0;
  let webhookCalls = 0;
  let brokerCalls = 0;
  let exits = 0;

  const shutdown = createWorkerShutdown({
    stopConsumer: async () => {
      consumerCalls += 1;
    },
    stopWebhook: () => {
      webhookCalls += 1;
    },
    closeBroker: async () => {
      brokerCalls += 1;
    },
    logger: recordingLogger().logger,
    scheduler: new FakeScheduler(),
    exit: () => {
      exits += 1;
    },
  });

  const first = shutdown('SIGINT');
  const second = shutdown('SIGTERM');
  assert.equal(first, second);

  await first;

  assert.equal(consumerCalls, 1);
  assert.equal(webhookCalls, 1);
  assert.equal(brokerCalls, 1);
  assert.equal(exits, 1);
});

test('worker shutdown proceeds to the broker after a consumer timeout', async () => {
  const scheduler = new FakeScheduler();
  const { logger, warn } = recordingLogger();
  const events: string[] = [];

  const shutdown = createWorkerShutdown({
    stopConsumer: () => new Promise<void>(() => undefined),
    stopWebhook: () => {
      events.push('webhook');
    },
    closeBroker: async () => {
      events.push('broker');
    },
    logger,
    scheduler,
    stepTimeoutMs: 50,
    exit: code => events.push(`exit:${code}`),
  });

  const task = shutdown('SIGTERM');
  await flush();

  assert.equal(scheduler.runNext(), 50);
  await task;

  assert.deepEqual(events, ['webhook', 'broker', 'exit:0']);
  assert.equal(warn.length, 1);
  assert.match(warn[0], /notification consumer stop timed out after 50ms/);
});
