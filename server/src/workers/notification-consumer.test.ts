import test from 'node:test';
import assert from 'node:assert/strict';
import {
  processNotificationMessage,
  type ConsumerMessage,
  type NotificationChannel,
  type NotificationLogger,
} from './notification-consumer.js';
import type {
  NotificationService,
  ProcessEventResult,
} from '../modules/notifications/notification.service.js';

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

  constructor(private readonly failures: { dlq?: boolean; retryPublish?: boolean } = {}) {}

  async prefetch(): Promise<void> {}
  async assertQueue(): Promise<void> {}
  async consume(): Promise<void> {}

  ack(): void {
    this.calls.push('ack');
    this.acks += 1;
  }

  sendToQueue(
    queue: string,
    content: Buffer,
    options?: { persistent?: boolean; headers?: Record<string, unknown> },
  ): boolean {
    if (this.failures.dlq && queue === DLQ) throw new Error('DLQ unavailable');
    if (this.failures.retryPublish && queue === MAIN_QUEUE) throw new Error('broker unavailable');
    this.calls.push(`send:${queue}`);
    this.sent.push({ queue, content, options });
    return true;
  }
}

function serviceReturning(result: ProcessEventResult): NotificationService {
  return { async processEvent() { return result; } };
}

function serviceThrowing(error: Error): NotificationService {
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
  assert.deepEqual(channel.calls, [`send:${DLQ}`, 'ack'], 'DLQ copy before ack');
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
  assert.deepEqual(channel.calls, [`send:${DLQ}`, 'ack']);

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
    [`send:${MAIN_QUEUE}`, 'ack'],
    'ack must happen after the retry copy is published',
  );
  assert.equal(channel.sent[0].options?.headers?.['x-retry-count'], 1);
  assert.equal(channel.sent[0].options?.headers?.['x-last-error'], 'connection terminated unexpectedly');
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
  assert.deepEqual(channel.calls, [`send:${DLQ}`, 'ack']);

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
  assert.deepEqual(channel.calls, [`send:${MAIN_QUEUE}`, 'ack']);
  assert.equal(channel.sent[0].options?.headers?.['x-retry-count'], 1);
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

test('if the DLQ copy cannot be published the message is not acknowledged', async () => {
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

test('if the retry copy cannot be published the message is not acknowledged', async () => {
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
