import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNotificationConsumerSupervisor,
  type ConsumerMessage,
  type NotificationChannel,
  type NotificationConsumerScheduler,
  type NotificationEventProcessor,
  type NotificationLogger,
  type ProcessOutcome,
} from './notification-consumer.js';

type LifecycleEvent = 'close' | 'error';

const silentLogger: NotificationLogger = {
  info() {},
  warn() {},
  error() {},
};

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

class FakeChannel implements NotificationChannel {
  readonly asserted: string[] = [];
  readonly consumedQueues: string[] = [];
  readonly cancelTags: string[] = [];
  private readonly listeners = new Map<LifecycleEvent, Array<(...args: unknown[]) => void>>();

  consumeCalls = 0;
  closeCalls = 0;
  cancelCalls = 0;
  ackCalls = 0;
  publishCalls = 0;
  lastMessageHandler: ((message: ConsumerMessage | null) => void) | null = null;

  constructor(readonly tag = 'consumer-tag') {}

  async prefetch(): Promise<void> {}

  async assertQueue(queue: string): Promise<void> {
    this.asserted.push(queue);
  }

  async consume(
    queue: string,
    onMessage: (message: ConsumerMessage | null) => void,
  ): Promise<{ consumerTag: string }> {
    this.consumeCalls += 1;
    this.consumedQueues.push(queue);
    this.lastMessageHandler = onMessage;
    return { consumerTag: this.tag };
  }

  async cancel(consumerTag: string): Promise<void> {
    this.cancelCalls += 1;
    this.cancelTags.push(consumerTag);
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
  }

  on(event: LifecycleEvent, listener: (...args: unknown[]) => void): unknown {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  emit(event: LifecycleEvent, error?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(error);
  }

  ack(): void {
    this.ackCalls += 1;
  }

  async publish(): Promise<void> {
    this.publishCalls += 1;
  }

  deliver(message: ConsumerMessage | null): void {
    this.lastMessageHandler?.(message);
  }
}

class FakeScheduler implements NotificationConsumerScheduler {
  private nextId = 1;
  private readonly tasks = new Map<
    number,
    { callback: () => void; delayMs: number }
  >();

  set(callback: () => void, delayMs: number): unknown {
    const id = this.nextId;
    this.nextId += 1;
    this.tasks.set(id, { callback, delayMs });
    return id;
  }

  clear(handle: unknown): void {
    this.tasks.delete(handle as number);
  }

  get pending(): number {
    return this.tasks.size;
  }

  get delays(): number[] {
    return Array.from(this.tasks.values(), task => task.delayMs);
  }

  runNext(): number | undefined {
    const next = this.tasks.entries().next();
    if (next.done) return undefined;

    const [id, task] = next.value;
    this.tasks.delete(id);
    task.callback();
    return task.delayMs;
  }
}

const fakeService = {} as NotificationEventProcessor;
const noopProcessMessage = async (): Promise<ProcessOutcome> => 'processed';

function supervisorFor(
  scheduler: FakeScheduler,
  createChannel: () => Promise<NotificationChannel | null>,
) {
  return createNotificationConsumerSupervisor({
    createChannel,
    processMessage: noopProcessMessage,
    service: fakeService,
    queue: 'notifications.test',
    deadLetterQueue: 'notifications.test.dlq',
    logger: silentLogger,
    initialBackoffMs: 1_000,
    maxBackoffMs: 30_000,
    scheduler,
  });
}

test('starts exactly one consumer and ignores duplicate starts', async () => {
  const channel = new FakeChannel();
  let creates = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(scheduler, async () => {
    creates += 1;
    return channel;
  });

  await supervisor.start();
  await supervisor.start();

  assert.equal(creates, 1);
  assert.equal(channel.consumeCalls, 1);
  assert.equal(supervisor.isRunning(), true);

  await supervisor.stop();
});

test('unexpected channel close reconnects after one second', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second][index++] ?? second,
  );

  await supervisor.start();
  first.emit('close');
  await flush();

  assert.equal(supervisor.isRunning(), false);
  assert.equal(first.closeCalls, 1);
  assert.deepEqual(scheduler.delays, [1_000]);

  assert.equal(scheduler.runNext(), 1_000);
  await flush();
  await flush();

  assert.equal(second.consumeCalls, 1);
  assert.equal(supervisor.isRunning(), true);

  await supervisor.stop();
});

test('channel errors reconnect with backoff', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second][index++] ?? second,
  );

  await supervisor.start();
  first.emit('error', new Error('channel failed'));
  await flush();

  assert.deepEqual(scheduler.delays, [1_000]);

  scheduler.runNext();
  await flush();
  await flush();

  assert.equal(second.consumeCalls, 1);
  assert.equal(supervisor.isRunning(), true);

  await supervisor.stop();
});

test('reconnect backoff grows exponentially and is capped at 30 seconds', async () => {
  const scheduler = new FakeScheduler();
  let creates = 0;
  const supervisor = supervisorFor(scheduler, async () => {
    creates += 1;
    return null;
  });

  await supervisor.start();
  assert.equal(creates, 1);

  const delays: number[] = [];
  for (let i = 0; i < 8; i += 1) {
    const delay = scheduler.runNext();
    assert.notEqual(delay, undefined);
    delays.push(delay as number);
    await flush();
    await flush();
  }

  assert.deepEqual(delays, [
    1_000,
    2_000,
    4_000,
    8_000,
    16_000,
    30_000,
    30_000,
    30_000,
  ]);
  assert.equal(creates, 9);

  await supervisor.stop();
});

test('backoff resets to one second after a successful reconnect', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  const third = new FakeChannel('third');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second, third][index++] ?? third,
  );

  await supervisor.start();
  first.emit('close');
  await flush();
  assert.deepEqual(scheduler.delays, [1_000]);

  scheduler.runNext();
  await flush();
  await flush();
  assert.equal(second.consumeCalls, 1);

  second.emit('close');
  await flush();
  assert.deepEqual(scheduler.delays, [1_000]);

  scheduler.runNext();
  await flush();
  await flush();
  assert.equal(third.consumeCalls, 1);

  await supervisor.stop();
});

test('duplicate disconnect events schedule only one reconnect loop', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second][index++] ?? second,
  );

  await supervisor.start();
  first.emit('close');
  first.emit('error', new Error('late error'));
  first.emit('close');
  await flush();

  assert.equal(scheduler.pending, 1);
  assert.equal(first.closeCalls, 1);

  scheduler.runNext();
  await flush();
  await flush();

  assert.equal(second.consumeCalls, 1);
  assert.equal(supervisor.isRunning(), true);

  await supervisor.stop();
});

test('broker consumer cancellation schedules a reconnect', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second][index++] ?? second,
  );

  await supervisor.start();
  first.deliver(null);
  await flush();

  assert.deepEqual(scheduler.delays, [1_000]);

  scheduler.runNext();
  await flush();
  await flush();

  assert.equal(second.consumeCalls, 1);

  await supervisor.stop();
});

test('stop cancels and closes the active consumer exactly once', async () => {
  const channel = new FakeChannel('tag-1');
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(scheduler, async () => channel);

  await supervisor.start();
  await supervisor.stop();

  assert.equal(channel.cancelCalls, 1);
  assert.deepEqual(channel.cancelTags, ['tag-1']);
  assert.equal(channel.closeCalls, 1);
  assert.equal(supervisor.isRunning(), false);

  channel.emit('close');
  await flush();
  assert.equal(scheduler.pending, 0);

  await supervisor.stop();
  assert.equal(channel.cancelCalls, 1);
  assert.equal(channel.closeCalls, 1);
});

test('stop while waiting clears the timer and prevents a new consumer', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second][index++] ?? second,
  );

  await supervisor.start();
  first.emit('close');
  await flush();
  assert.equal(scheduler.pending, 1);

  await supervisor.stop();
  assert.equal(scheduler.pending, 0);
  assert.equal(scheduler.runNext(), undefined);

  await flush();
  assert.equal(second.consumeCalls, 0);
  assert.equal(first.closeCalls, 1);
});

test('stop during an in-flight connection closes the late channel without consuming', async () => {
  const gate = deferred<FakeChannel>();
  const channel = new FakeChannel();
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(scheduler, () => gate.promise);

  const startPromise = supervisor.start();
  await flush();

  const stopPromise = supervisor.stop();
  gate.resolve(channel);

  await Promise.all([startPromise, stopPromise]);

  assert.equal(channel.consumeCalls, 0);
  assert.equal(channel.closeCalls, 1);
  assert.equal(scheduler.pending, 0);
  assert.equal(supervisor.isRunning(), false);
});

test('can start again after a clean stop', async () => {
  const first = new FakeChannel('first');
  const second = new FakeChannel('second');
  let index = 0;
  const scheduler = new FakeScheduler();
  const supervisor = supervisorFor(
    scheduler,
    async () => [first, second][index++] ?? second,
  );

  await supervisor.start();
  await supervisor.stop();
  await supervisor.start();

  assert.equal(second.consumeCalls, 1);
  assert.equal(supervisor.isRunning(), true);

  await supervisor.stop();
});
