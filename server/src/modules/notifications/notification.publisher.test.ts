import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createNotificationPublisher,
  type PublisherChannel,
} from './notification.publisher.js';
import {
  NOTIFICATION_QUEUE_DEFAULT,
  notificationQueueName,
} from './notification.queue.js';

const silentLogger = { warn() {} };

type SendMode = 'confirm' | 'nack' | 'never';

interface SentMessage {
  queue: string;
  body: unknown;
  options?: { persistent?: boolean };
}

class FakeChannel implements PublisherChannel {
  readonly asserted: Array<{ queue: string; options?: { durable?: boolean } }> = [];
  readonly sent: SentMessage[] = [];
  closed = false;
  closeCalls = 0;
  private readonly listeners = new Map<string, Array<(...args: unknown[]) => void>>();

  constructor(private readonly mode: SendMode = 'confirm') {}

  async assertQueue(queue: string, options?: { durable?: boolean }): Promise<void> {
    this.asserted.push({ queue, options });
  }

  sendToQueue(
    queue: string,
    content: Buffer,
    options?: { persistent?: boolean },
    callback?: (error?: Error) => void,
  ): boolean {
    this.sent.push({
      queue,
      body: JSON.parse(content.toString('utf8')) as unknown,
      options,
    });

    if (this.mode === 'confirm') callback?.();
    if (this.mode === 'nack') callback?.(new Error('broker nack'));
    return true;
  }

  async close(): Promise<void> {
    this.closeCalls += 1;
    this.closed = true;
  }

  on(event: 'close' | 'error', listener: (...args: unknown[]) => void): unknown {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  emit(event: 'close' | 'error'): void {
    for (const listener of this.listeners.get(event) ?? []) listener();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

function channelQueue(channels: FakeChannel[]) {
  let index = 0;
  return async () => channels[Math.min(index++, channels.length - 1)] ?? null;
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('publisher initializes lazily, reuses one channel, and preserves queue and payload', async () => {
  let creates = 0;
  const channel = new FakeChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      creates += 1;
      return channel;
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(creates, 0);

  const payload = {
    event: 'PARCEL_STATUS_UPDATED',
    parcelId: '66666666-6666-4666-8666-666666666666',
    status: 'IN_TRANSIT',
    note: 'At the sorting hub',
  };

  assert.equal(await publisher.publish(payload), true);
  assert.equal(creates, 1);
  assert.deepEqual(channel.asserted, [
    { queue: 'notifications.test', options: { durable: true } },
  ]);
  assert.equal(channel.sent.length, 1);
  assert.equal(channel.sent[0].queue, 'notifications.test');
  assert.deepEqual(channel.sent[0].body, payload);
  assert.deepEqual(channel.sent[0].options, { persistent: true });

  assert.equal(await publisher.publish({ second: true }), true);
  assert.equal(creates, 1);
  assert.equal(channel.sent.length, 2);
});

test('concurrent publishes share one initialization attempt', async () => {
  const gate = deferred<FakeChannel>();
  const channel = new FakeChannel();
  let creates = 0;

  const publisher = createNotificationPublisher({
    createConfirmChannel: () => {
      creates += 1;
      return gate.promise;
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  const first = publisher.publish({ n: 1 });
  const second = publisher.publish({ n: 2 });

  await Promise.resolve();
  assert.equal(creates, 1);

  gate.resolve(channel);
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(creates, 1);
  assert.equal(channel.sent.length, 2);
});

test('a nack fails the publish, closes the channel, and the next publish reconnects', async () => {
  const first = new FakeChannel('nack');
  const second = new FakeChannel('confirm');
  const publisher = createNotificationPublisher({
    createConfirmChannel: channelQueue([first, second]),
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  assert.equal(first.closed, true);
  assert.equal(first.closeCalls, 1);
  assert.equal(first.sent.length, 1);

  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(second.sent.length, 1);
});

test('a confirmation timeout returns false without retrying within the same call', async () => {
  const first = new FakeChannel('never');
  const second = new FakeChannel('confirm');
  const publisher = createNotificationPublisher({
    createConfirmChannel: channelQueue([first, second]),
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 20,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  assert.equal(first.sent.length, 1);
  assert.equal(first.closed, true);
  assert.equal(first.closeCalls, 1);

  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(second.sent.length, 1);
});

test('channel close and error events invalidate the cached channel', async () => {
  const first = new FakeChannel();
  const second = new FakeChannel();
  const third = new FakeChannel();
  let creates = 0;

  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      creates += 1;
      return [first, second, third][creates - 1] ?? third;
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), true);
  first.emit('close');
  await flush();
  assert.equal(first.closeCalls, 0);

  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(creates, 2);
  second.emit('error');
  await flush();
  assert.equal(second.closeCalls, 1);

  assert.equal(await publisher.publish({ n: 3 }), true);
  assert.equal(creates, 3);
  assert.equal(third.sent.length, 1);
});

test('a close event invalidates without attempting to close the channel', async () => {
  const first = new FakeChannel();
  const second = new FakeChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: channelQueue([first, second]),
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), true);
  first.emit('close');
  await flush();

  assert.equal(first.closeCalls, 0);
  assert.equal(first.closed, false);
  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(second.sent.length, 1);
});

test('repeated error events close the failed channel at most once', async () => {
  const first = new FakeChannel();
  const second = new FakeChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: channelQueue([first, second]),
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), true);
  first.emit('error');
  first.emit('error');
  first.emit('error');
  await flush();

  assert.equal(first.closeCalls, 1);

  first.emit('close');
  await flush();
  assert.equal(first.closeCalls, 1);

  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(second.sent.length, 1);
});

test('a close event followed by an error never calls close on the channel', async () => {
  const first = new FakeChannel();
  const second = new FakeChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: channelQueue([first, second]),
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), true);
  first.emit('close');
  first.emit('error');
  await flush();

  assert.equal(first.closeCalls, 0);
  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(second.sent.length, 1);
});

test('explicit publisher close after error cleanup does not close twice', async () => {
  const channel = new FakeChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => channel,
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), true);
  channel.emit('error');
  await flush();
  assert.equal(channel.closeCalls, 1);

  await publisher.close();
  assert.equal(channel.closeCalls, 1);
  assert.equal(await publisher.publish({ n: 2 }), false);
});

test('broker unavailability returns false and the cooldown limits reconnect attempts', async () => {
  let nowValue = 0;
  let creates = 0;

  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      creates += 1;
      return null;
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
    failureCooldownMs: 100,
    now: () => nowValue,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  assert.equal(await publisher.publish({ n: 2 }), false);
  assert.equal(creates, 1);

  nowValue = 100;
  assert.equal(await publisher.publish({ n: 3 }), false);
  assert.equal(creates, 2);
});

test('a connection failure is retried on the next publish by default', async () => {
  const channel = new FakeChannel();
  let creates = 0;

  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      creates += 1;
      return creates === 1 ? null : channel;
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(creates, 2);
  assert.equal(channel.sent.length, 1);
});

test('a rejected channel initialization returns false without throwing', async () => {
  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      throw new Error('broker connect failed');
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
});

test('a failed queue declaration closes the channel and returns false', async () => {
  class AssertFailChannel extends FakeChannel {
    async assertQueue(): Promise<void> {
      throw new Error('queue declaration failed');
    }
  }

  const channel = new AssertFailChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => channel,
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  assert.equal(channel.closed, true);
  assert.equal(channel.closeCalls, 1);
});

test('a channel closed during initialization is not cached', async () => {
  class CloseDuringAssertChannel extends FakeChannel {
    async assertQueue(queue: string, options?: { durable?: boolean }): Promise<void> {
      await super.assertQueue(queue, options);
      this.emit('close');
    }
  }

  const first = new CloseDuringAssertChannel();
  const second = new FakeChannel();
  const publisher = createNotificationPublisher({
    createConfirmChannel: channelQueue([first, second]),
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  assert.equal(first.sent.length, 0);
  assert.equal(first.closeCalls, 0);

  assert.equal(await publisher.publish({ n: 2 }), true);
  assert.equal(second.sent.length, 1);
});

test('a late channel after the connection timeout is closed instead of leaked', async () => {
  const gate = deferred<FakeChannel>();
  const channel = new FakeChannel();

  const publisher = createNotificationPublisher({
    createConfirmChannel: () => gate.promise,
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 20,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), false);
  gate.resolve(channel);
  await flush();
  await flush();

  assert.equal(channel.closed, true);
  assert.equal(channel.closeCalls, 1);
});

test('close during initialization closes the late channel and prevents publishing', async () => {
  const gate = deferred<FakeChannel>();
  const channel = new FakeChannel();

  const publisher = createNotificationPublisher({
    createConfirmChannel: () => gate.promise,
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  const pending = publisher.publish({ n: 1 });
  await Promise.resolve();
  const closing = publisher.close();
  gate.resolve(channel);

  assert.equal(await pending, false);
  await closing;
  assert.equal(channel.closed, true);
  assert.equal(channel.closeCalls, 1);
  assert.equal(await publisher.publish({ n: 2 }), false);
});

test('close is idempotent and prevents further publishing', async () => {
  const channel = new FakeChannel();
  let creates = 0;

  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      creates += 1;
      return channel;
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  assert.equal(await publisher.publish({ n: 1 }), true);
  await publisher.close();
  assert.equal(channel.closed, true);
  assert.equal(channel.closeCalls, 1);
  await publisher.close();
  assert.equal(channel.closeCalls, 1);

  assert.equal(await publisher.publish({ n: 2 }), false);
  assert.equal(creates, 1);
});

test('serialization failure returns false before opening a channel', async () => {
  let creates = 0;
  const publisher = createNotificationPublisher({
    createConfirmChannel: async () => {
      creates += 1;
      return new FakeChannel();
    },
    queueName: () => 'notifications.test',
    logger: silentLogger,
    connectTimeoutMs: 100,
    confirmTimeoutMs: 100,
  });

  const circular: Record<string, unknown> = {};
  circular.self = circular;

  assert.equal(await publisher.publish(circular), false);
  assert.equal(creates, 0);
});

test('notificationQueueName resolves the environment at runtime', () => {
  const previous = process.env.RABBITMQ_QUEUE_NOTIFICATIONS;

  try {
    process.env.RABBITMQ_QUEUE_NOTIFICATIONS = 'notifications.custom';
    assert.equal(notificationQueueName(), 'notifications.custom');

    delete process.env.RABBITMQ_QUEUE_NOTIFICATIONS;
    assert.equal(notificationQueueName(), NOTIFICATION_QUEUE_DEFAULT);
  } finally {
    if (previous === undefined) delete process.env.RABBITMQ_QUEUE_NOTIFICATIONS;
    else process.env.RABBITMQ_QUEUE_NOTIFICATIONS = previous;
  }
});
