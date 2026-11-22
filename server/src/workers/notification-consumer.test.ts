import test from 'node:test';
import assert from 'node:assert/strict';
import {
  processNotificationMessage,
  type ConsumerMessage,
  type NotificationChannel,
  type NotificationEventProcessor,
  type NotificationLogger,
} from './notification-consumer.js';
import type { ProcessEventResult } from '../modules/notifications/notification.service.js';

const PARCEL_ID = '66666666-6666-4666-8666-666666666666';
const MAIN_QUEUE = 'swiftdrop_notifications_queue';
const DLQ = 'swiftdrop_dead_letter_queue';

const silentLogger: NotificationLogger = {
  info() {},
  warn() {},
  error() {},
};

interface SentMessage {
  queue: string;
  content: Buffer;
  options?: { persistent?: boolean; headers?: Record<string, unknown> };
}

class FakeChannel implements NotificationChannel {
  readonly calls: string[] = [];
  readonly sent: SentMessage[] = [];
  acks = 0;
  private readonly pendingConfirms: Array<() => void> = [];

  constructor(
    private readonly failures: { dlq?: boolean; retryPublish?: boolean } = {},
    private readonly holdConfirms = false,
  ) {}

  async prefetch(): Promise<void> {}
  async assertQueue(): Promise<void> {}
  async consume(): Promise<{ consumerTag: string }> {
    return { consumerTag: 'fake-consumer' };
  }
  async cancel(): Promise<void> {}
  async close(): Promise<void> {}
  on(): this {
    return this;
  }

  ack(): void {
    this.calls.push('ack');
    this.acks += 1;
  }

  publish(
    queue: string,
    content: Buffer,
    options?: { persistent?: boolean; headers?: Record<string, unknown> },
  ): Promise<void> {
    if (this.failures.dlq && queue === DLQ) {
      return Promise.reject(new Error('DLQ unavailable'));
    }
    if (this.failures.retryPublish && queue === MAIN_QUEUE) {
      return Promise.reject(new Error('broker unavailable'));
    }

    this.calls.push(`publish:${queue}`);
    this.sent.push({ queue, content, options });

    if (this.holdConfirms) {
      return new Promise<void>(resolve => { this.pendingConfirms.push(resolve); });
    }
    return Promise.resolve();
  }

  /** Simulates RabbitMQ confirming every held publish. */
  confirmPending(): void {
    const pending = this.pendingConfirms.splice(0);
    for (const resolve of pending) resolve();
  }
}

function serviceReturning(result: ProcessEventResult): NotificationEventProcessor {
  return { async processEvent() { return result; } };
}

function serviceThrowing(error: Error): NotificationEventProcessor {
  return { async processEvent() { throw error; } };
}

function message(payload: unknown, headers: Record<string, unknown> = {}): ConsumerMessage {
  const content = typeof payload === 'string'
    ? Buffer.from(payload, 'utf8')
    : Buffer.from(JSON.stringify(payload), 'utf8');
  return { content, properties: { headers } };
}

const validPayload = {
  eventId: 'evt-1',
  event: 'PARCEL_DELIVERED',
  parcelId: PARCEL_ID,
  timestamp: '2026-11-22T10:00:00.000Z',
};

const options = {
  queue: MAIN_QUEUE,
  deadLetterQueue: DLQ,
  retryDelayMs: 0,
  logger: silentLogger,
};

test('a valid event is acknowledged only after successful processing', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message(validPayload),
    serviceReturning({ status: 'processed', inserted: 2, skipped: 0, recipients: 2 }),
    channel,
    options,
  );

  assert.equal(outcome, 'processed');
  assert.equal(channel.acks, 1);
  assert.deepEqual(channel.calls, ['ack'], 'no retry or DLQ traffic');
  assert.equal(channel.sent.length, 0);
});

test('a duplicate event is acknowledged without a second database effect', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message(validPayload),
    serviceReturning({ status: 'processed', inserted: 0, skipped: 2, recipients: 2 }),
    channel,
    options,
  );

  assert.equal(outcome, 'duplicate');
  assert.equal(channel.acks, 1);
  assert.deepEqual(channel.calls, ['ack']);
});

test('malformed JSON goes to the DLQ and is then acknowledged', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(message('{not-json'), serviceReturning({
    status: 'processed', inserted: 0, skipped: 0, recipients: 0,
  }), channel, options);

  assert.equal(outcome, 'dead-lettered');
  assert.deepEqual(channel.calls, [`publish:${DLQ}`, 'ack'], 'DLQ copy before ack');
  assert.equal(channel.sent[0].options?.persistent, true);

  const envelope = JSON.parse(channel.sent[0].content.toString('utf8'));
  assert.equal(envelope.reason, 'INVALID_JSON');
  assert.equal(envelope.source, 'notifications');
  assert.equal(envelope.original, '{not-json');
});

test('a schema-invalid event goes to the DLQ and is then acknowledged', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message({ event: 'PARCEL_DELIVERED' }),
    serviceReturning({ status: 'processed', inserted: 0, skipped: 0, recipients: 0 }),
    channel,
    options,
  );

  assert.equal(outcome, 'dead-lettered');
  assert.deepEqual(channel.calls, [`publish:${DLQ}`, 'ack']);

  const envelope = JSON.parse(channel.sent[0].content.toString('utf8'));
  assert.equal(envelope.reason, 'INVALID_EVENT');
});

test('an unsupported event is acknowledged and ignored', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message({ event: 'SOMETHING_ELSE', parcelId: PARCEL_ID }),
    serviceReturning({ status: 'processed', inserted: 0, skipped: 0, recipients: 0 }),
    channel,
    options,
  );

  assert.equal(outcome, 'ignored');
  assert.deepEqual(channel.calls, ['ack']);
  assert.equal(channel.sent.length, 0);
});

test('a temporary database failure is republished before the original is acknowledged', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message(validPayload),
    serviceThrowing(new Error('connection terminated unexpectedly')),
    channel,
    options,
  );

  assert.equal(outcome, 'retried');
  assert.deepEqual(
    channel.calls,
    [`publish:${MAIN_QUEUE}`, 'ack'],
    'ack must happen after the retry copy is confirmed',
  );
  assert.equal(channel.sent[0].options?.headers?.['x-retry-count'], 1);
  assert.equal(channel.sent[0].options?.headers?.['x-last-error'], 'connection terminated unexpectedly');
});

test('a pending publisher confirm blocks the acknowledgement', async () => {
  const channel = new FakeChannel({}, true);
  const processing = processNotificationMessage(
    message(validPayload),
    serviceThrowing(new Error('database unavailable')),
    channel,
    options,
  );

  // Give the consumer time to reach the publish call.
  await new Promise(resolve => setTimeout(resolve, 10));
  assert.equal(channel.acks, 0, 'must not ack before the broker confirms the copy');
  assert.deepEqual(channel.calls, [`publish:${MAIN_QUEUE}`]);

  channel.confirmPending();
  assert.equal(await processing, 'retried');
  assert.deepEqual(channel.calls, [`publish:${MAIN_QUEUE}`, 'ack']);
});

test('retries are bounded and then moved to the DLQ', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message(validPayload, { 'x-retry-count': 5 }),
    serviceThrowing(new Error('database still unavailable')),
    channel,
    options,
  );

  assert.equal(outcome, 'dead-lettered');
  assert.deepEqual(channel.calls, [`publish:${DLQ}`, 'ack']);

  const envelope = JSON.parse(channel.sent[0].content.toString('utf8'));
  assert.equal(envelope.reason, 'MAX_RETRIES_EXCEEDED');
  assert.equal(envelope.attempts, 6);
});

test('a missing parcel is treated as transient and retried', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message(validPayload),
    serviceReturning({ status: 'parcel_not_found' }),
    channel,
    options,
  );

  assert.equal(outcome, 'retried');
  assert.deepEqual(channel.calls, [`publish:${MAIN_QUEUE}`, 'ack']);
  assert.equal(channel.sent[0].options?.headers?.['x-retry-count'], 1);
});

test('an assignment with no visible courier is retried without trusting the payload', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message({
      eventId: 'evt-courier',
      event: 'COURIER_ASSIGNED',
      parcelId: PARCEL_ID,
      courierId: '44444444-4444-4444-8444-444444444444',
      timestamp: '2026-11-22T10:00:00.000Z',
    }),
    serviceReturning({ status: 'courier_not_assigned' }),
    channel,
    options,
  );

  assert.equal(outcome, 'retried');
  assert.deepEqual(channel.calls, [`publish:${MAIN_QUEUE}`, 'ack']);
});

test('a parcel with no recipients is acknowledged as ignored', async () => {
  const channel = new FakeChannel();
  const outcome = await processNotificationMessage(
    message(validPayload),
    serviceReturning({ status: 'no_recipients' }),
    channel,
    options,
  );

  assert.equal(outcome, 'ignored');
  assert.deepEqual(channel.calls, ['ack']);
});

test('if the DLQ copy cannot be confirmed the message is not acknowledged', async () => {
  const channel = new FakeChannel({ dlq: true });
  const outcome = await processNotificationMessage(
    message('{not-json'),
    serviceReturning({ status: 'processed', inserted: 0, skipped: 0, recipients: 0 }),
    channel,
    options,
  );

  assert.equal(outcome, 'dead-letter-failed');
  assert.equal(channel.acks, 0, 'no premature acknowledgement');
});

test('if the retry copy cannot be confirmed the message is not acknowledged', async () => {
  const channel = new FakeChannel({ retryPublish: true });
  const outcome = await processNotificationMessage(
    message(validPayload),
    serviceThrowing(new Error('database unavailable')),
    channel,
    options,
  );

  assert.equal(outcome, 'dead-letter-failed');
  assert.equal(channel.acks, 0, 'the broker must redeliver the original');
});
