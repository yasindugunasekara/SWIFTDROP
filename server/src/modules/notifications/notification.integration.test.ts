/**
 * Member 07 — gated live integration suite.
 *
 * Run only with a dedicated test PostgreSQL database and an isolated test
 * RabbitMQ broker/vhost:
 *
 *   RUN_NOTIFICATION_INTEGRATION=1
 *   NOTIFICATION_INTEGRATION_CONFIRM=I_AM_USING_DEDICATED_TEST_INFRASTRUCTURE
 *   TEST_DATABASE_URL=postgresql://.../swiftdrop_notifications_test
 *   RABBITMQ_URL=amqp://.../<vhost-containing-test-or-ci>
 *
 * RABBITMQ_URL may use a non-test/ci vhost only when the exact broker/vhost is
 * listed in NOTIFICATION_INTEGRATION_ALLOWED_BROKERS (host:port/vhost or a full
 * amqp:// URL, comma-separated). APP_RABBITMQ_URL and PRODUCTION_RABBITMQ_URL,
 * when configured, must not resolve to the same broker/vhost as RABBITMQ_URL.
 *
 * The suite applies only 001_initial_schema.sql and
 * 004_notifications_hardening.sql. The Supabase auth migrations are excluded
 * because they require Supabase's auth schema/roles and are unrelated to the
 * notification schema under test. It never modifies production data and never
 * prints connection URLs or credentials.
 */

import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import test, { after, before } from 'node:test';
import { Pool } from 'pg';
import type { Channel, ConfirmChannel, ConsumeMessage } from 'amqplib';
import { createApiShutdown } from '../../lifecycle/api-shutdown.js';
import { evaluateNotificationIntegrationGate } from './notification.integration-gate.js';
import type {
  NotificationCursor,
  NormalizedParcelEvent,
  NotificationType,
} from './notification.types.js';
import type { NotificationService, Queryable } from './notification.service.js';
import type { PublisherChannel } from './notification.publisher.js';
import type {
  ConsumerMessage,
  NotificationChannel,
  NotificationConsumerSupervisor,
  NotificationLogger,
} from '../../workers/notification-consumer.js';

const RUN_FLAG = 'RUN_NOTIFICATION_INTEGRATION';
const runRequested = process.env[RUN_FLAG] === '1';
const runTag = randomUUID().replace(/-/g, '').slice(0, 12);

const gate = evaluateNotificationIntegrationGate(process.env);
const liveSkip = runRequested
  ? gate.ok
    ? false
    : gate.error ?? 'Live integration configuration is invalid.'
  : `${RUN_FLAG} is not 1.`;

const fixtures = {
  customerAssigned: randomUUID(),
  courierAssigned: randomUUID(),
  customerB: randomUUID(),
  customerRead: randomUUID(),
  customerPreference: randomUUID(),
  customerConcurrent: randomUUID(),
  customerPagination: randomUUID(),
  parcelAssigned: randomUUID(),
  parcelRead: randomUUID(),
  parcelPreference: randomUUID(),
  parcelPagination: randomUUID(),
  assignment: randomUUID(),
};

const tracking = {
  assigned: `IT-${runTag}-A`,
  read: `IT-${runTag}-R`,
  preference: `IT-${runTag}-P`,
  pagination: `IT-${runTag}-G`,
};

const userIds = [
  fixtures.customerAssigned,
  fixtures.courierAssigned,
  fixtures.customerB,
  fixtures.customerRead,
  fixtures.customerPreference,
  fixtures.customerConcurrent,
  fixtures.customerPagination,
];

const parcelIds = [
  fixtures.parcelAssigned,
  fixtures.parcelRead,
  fixtures.parcelPreference,
  fixtures.parcelPagination,
];

const silentLogger: NotificationLogger = {
  info() {},
  warn() {},
  error() {},
};

interface RecordingLogger {
  logger: NotificationLogger;
  info: string[];
  warn: string[];
  errors: Array<{ message: string; error?: unknown }>;
}

function recordingLogger(): RecordingLogger {
  const info: string[] = [];
  const warn: string[] = [];
  const errors: Array<{ message: string; error?: unknown }> = [];
  return {
    logger: {
      info: message => info.push(message),
      warn: message => warn.push(message),
      error: (message, error) => errors.push({ message, error }),
    },
    info,
    warn,
    errors,
  };
}

let pool: Pool | undefined;
let admin: Channel | undefined;
let rabbit: typeof import('../../config/rabbitmq.js') | undefined;
let queueModule: typeof import('./notification.queue.js') | undefined;
let serviceModule: typeof import('./notification.service.js') | undefined;
let supervisor: NotificationConsumerSupervisor | undefined;
let publisher:
  | { publish(payload: Record<string, unknown>): Promise<boolean>; close(): Promise<void> }
  | undefined;
let service: NotificationService | undefined;
let processingLogger: RecordingLogger = recordingLogger();
let queue = '';
let dlq = '';
let adminClosed = false;
let setupReady = false;
const publisherChannels: ConfirmChannel[] = [];
const consumerChannels: LiveNotificationChannel[] = [];
const publisherAssertions: Array<{
  queue: string;
  options?: { durable?: boolean };
}> = [];

class LiveNotificationChannel implements NotificationChannel {
  closeCalls = 0;
  cancelCalls = 0;
  cancelTags: string[] = [];
  consumerTag = '';
  private closeStarted = false;

  constructor(
    private readonly consumer: Channel,
    private readonly publisher: ConfirmChannel,
  ) {}

  prefetch(count: number): Promise<unknown> {
    return this.consumer.prefetch(count);
  }

  assertQueue(queueName: string, options?: { durable?: boolean }): Promise<unknown> {
    return this.consumer.assertQueue(queueName, options);
  }

  async consume(
    queueName: string,
    onMessage: (message: ConsumerMessage | null) => void,
  ): Promise<{ consumerTag: string }> {
    const result = await this.consumer.consume(
      queueName,
      (message: ConsumeMessage | null) => onMessage(message),
    );
    this.consumerTag = result.consumerTag;
    return { consumerTag: result.consumerTag };
  }

  cancel(consumerTag: string): Promise<unknown> {
    this.cancelCalls += 1;
    this.cancelTags.push(consumerTag);
    return this.consumer.cancel(consumerTag);
  }

  async close(): Promise<void> {
    if (this.closeStarted) return;
    this.closeStarted = true;
    this.closeCalls += 1;

    const closes: Array<Promise<unknown>> = [];
    try {
      closes.push(Promise.resolve(this.consumer.close()));
    } catch {
      // Best effort; continue to close the confirm channel.
    }
    try {
      closes.push(Promise.resolve(this.publisher.close()));
    } catch {
      // Best effort; continue to settle any remaining close.
    }
    await Promise.allSettled(closes);
  }

  on(event: 'close' | 'error', listener: (...args: unknown[]) => void): unknown {
    this.consumer.on(event, listener as (...args: unknown[]) => void);
    this.publisher.on(event, listener as (...args: unknown[]) => void);
    return this.consumer;
  }

  ack(message: ConsumerMessage): void {
    this.consumer.ack(message as ConsumeMessage);
  }

  publish(
    queueName: string,
    content: Buffer,
    options?: { persistent?: boolean; headers?: Record<string, unknown> },
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.publisher.sendToQueue(queueName, content, options, error => {
        if (error) reject(error instanceof Error ? error : new Error(String(error)));
        else resolve();
      });
    });
  }
}

function queryableFromPool(target: Pool): Queryable {
  return {
    async query<R extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      values?: unknown[],
    ): Promise<{ rows: R[]; rowCount: number | null }> {
      const result = await target.query(text, values);
      return { rows: result.rows as R[], rowCount: result.rowCount };
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

const flush = () => new Promise<void>(resolve => setImmediate(resolve));

async function waitFor<T>(
  check: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 20_000,
  intervalMs = 50,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (predicate(value)) return value;
    if (Date.now() >= deadline) {
      throw new Error('Timed out waiting for a live integration condition.');
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

function redactError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(
    /(?:postgres(?:ql)?|amqps?):\/\/\S+/gi,
    '[redacted-connection-url]',
  );
}

async function applyMigrations(target: Pool): Promise<void> {
  const base = await readFile(
    new URL('../../database/migrations/001_initial_schema.sql', import.meta.url),
    'utf8',
  );
  const hardening = await readFile(
    new URL('../../database/migrations/004_notifications_hardening.sql', import.meta.url),
    'utf8',
  );

  await target.query(base);
  await target.query(hardening);
}

async function insertFixtures(target: Pool): Promise<void> {
  const users: Array<{ id: string; role: 'CUSTOMER' | 'COURIER'; email: string; name: string }> = [
    { id: fixtures.customerAssigned, role: 'CUSTOMER', email: `it-${runTag}-assigned-customer@example.test`, name: 'Integration Assigned Customer' },
    { id: fixtures.courierAssigned, role: 'COURIER', email: `it-${runTag}-courier@example.test`, name: 'Integration Courier' },
    { id: fixtures.customerB, role: 'CUSTOMER', email: `it-${runTag}-other-customer@example.test`, name: 'Integration Other Customer' },
    { id: fixtures.customerRead, role: 'CUSTOMER', email: `it-${runTag}-read-customer@example.test`, name: 'Integration Read Customer' },
    { id: fixtures.customerPreference, role: 'CUSTOMER', email: `it-${runTag}-preference-customer@example.test`, name: 'Integration Preference Customer' },
    { id: fixtures.customerConcurrent, role: 'CUSTOMER', email: `it-${runTag}-concurrent-customer@example.test`, name: 'Integration Concurrent Customer' },
    { id: fixtures.customerPagination, role: 'CUSTOMER', email: `it-${runTag}-pagination-customer@example.test`, name: 'Integration Pagination Customer' },
  ];

  for (const user of users) {
    await target.query(
      `INSERT INTO public.users
         (id, email, password_hash, full_name, role, is_active)
       VALUES ($1::uuid, $2, $3, $4, $5::user_role, TRUE)`,
      [user.id, user.email, 'integration-test-disabled', user.name, user.role],
    );
  }

  const parcels: Array<{ id: string; customerId: string; tracking: string }> = [
    { id: fixtures.parcelAssigned, customerId: fixtures.customerAssigned, tracking: tracking.assigned },
    { id: fixtures.parcelRead, customerId: fixtures.customerRead, tracking: tracking.read },
    { id: fixtures.parcelPreference, customerId: fixtures.customerPreference, tracking: tracking.preference },
    { id: fixtures.parcelPagination, customerId: fixtures.customerPagination, tracking: tracking.pagination },
  ];

  for (const parcel of parcels) {
    await target.query(
      `INSERT INTO public.parcels
         (id, tracking_number, customer_id, sender_name, sender_phone,
          pickup_address, recipient_name, recipient_phone, delivery_address,
          weight_kg, total_fee, status)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12::parcel_status)`,
      [
        parcel.id,
        parcel.tracking,
        parcel.customerId,
        'Integration Sender',
        '+94000000000',
        'Integration Pickup',
        'Integration Recipient',
        '+94000000001',
        'Integration Delivery',
        1.0,
        10.0,
        'CONFIRMED',
      ],
    );
  }

  await target.query(
    `INSERT INTO public.courier_assignments
       (id, parcel_id, courier_id, is_active)
     VALUES ($1::uuid, $2::uuid, $3::uuid, TRUE)`,
    [fixtures.assignment, fixtures.parcelAssigned, fixtures.courierAssigned],
  );
}

async function cleanupFixtures(target: Pool): Promise<void> {
  await target.query(
    `DELETE FROM public.notifications
      WHERE user_id = ANY($1::uuid[]) OR parcel_id = ANY($2::uuid[])`,
    [userIds, parcelIds],
  );
  await target.query(
    `DELETE FROM public.user_notification_preferences
      WHERE user_id = ANY($1::uuid[])`,
    [userIds],
  );
  await target.query(
    `DELETE FROM public.courier_assignments
      WHERE parcel_id = ANY($1::uuid[]) OR courier_id = ANY($2::uuid[])`,
    [parcelIds, [fixtures.courierAssigned]],
  );
  await target.query(
    `DELETE FROM public.parcels WHERE id = ANY($1::uuid[])`,
    [parcelIds],
  );
  await target.query(
    `DELETE FROM public.users WHERE id = ANY($1::uuid[])`,
    [userIds],
  );
}

function makeEvent(
  eventId: string,
  eventType: NotificationType,
  parcelId: string,
  trackingNumber: string,
): NormalizedParcelEvent {
  return { eventId, eventType, parcelId, trackingNumber };
}

async function countNotifications(eventId: string): Promise<number> {
  const { rows } = await pool!.query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM public.notifications
      WHERE event_id = $1`,
    [eventId],
  );
  return rows[0]?.count ?? 0;
}

interface DlqEnvelope {
  reason?: string;
  original?: string;
  attempts?: number;
}

async function waitForDlq(
  predicate: (envelope: DlqEnvelope) => boolean,
  timeoutMs = 20_000,
): Promise<DlqEnvelope> {
  return waitFor(
    async () => {
      if (!admin) return null;
      const message = await admin.get(dlq, { noAck: true });
      if (!message) return null;
      try {
        return JSON.parse(message.content.toString('utf8')) as DlqEnvelope;
      } catch {
        return null;
      }
    },
    envelope => envelope !== null && predicate(envelope),
    timeoutMs,
  ) as Promise<DlqEnvelope>;
}

async function createLiveConsumerChannel(): Promise<NotificationChannel | null> {
  const consumer = await rabbit!.createRabbitMQChannel();
  const confirm = await rabbit!.createRabbitMQConfirmChannel();

  if (!consumer || !confirm) {
    if (consumer) {
      try {
        await consumer.close();
      } catch {
        // Best effort.
      }
    }
    if (confirm) {
      try {
        await confirm.close();
      } catch {
        // Best effort.
      }
    }
    return null;
  }

  const channel = new LiveNotificationChannel(consumer, confirm);
  consumerChannels.push(channel);
  return channel;
}

async function createLiveConfirmChannel(): Promise<PublisherChannel | null> {
  const channel = await rabbit!.createRabbitMQConfirmChannel();
  if (!channel) return null;

  publisherChannels.push(channel);
  return {
    assertQueue: (queueName, options) => {
      publisherAssertions.push({ queue: queueName, options });
      return channel.assertQueue(queueName, options);
    },
    sendToQueue: (queueName, content, options, callback) => {
      return channel.sendToQueue(queueName, content, options, error => {
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

async function setup(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL!;
  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.NODE_ENV = 'test';

  queue = `swiftdrop_notifications_it_${runTag}`;
  dlq = `swiftdrop_notifications_it_dlq_${runTag}`;
  process.env.RABBITMQ_QUEUE_NOTIFICATIONS = queue;
  process.env.RABBITMQ_QUEUE_DLQ = dlq;

  pool = new Pool({ connectionString: testDatabaseUrl });
  pool.on('error', () => undefined);

  await applyMigrations(pool);
  await insertFixtures(pool);

  rabbit = await import('../../config/rabbitmq.js');
  queueModule = await import('./notification.queue.js');
  serviceModule = await import('./notification.service.js');
  const publisherModule = await import('./notification.publisher.js');
  const consumerModule = await import('../../workers/notification-consumer.js');

  service = serviceModule.createNotificationService(queryableFromPool(pool));

  const broker = await rabbit.connectRabbitMQ();
  if (!broker) throw new Error('RabbitMQ did not connect for live integration tests.');

  admin = (await rabbit.createRabbitMQChannel()) ?? undefined;
  if (!admin) throw new Error('Unable to create the integration RabbitMQ admin channel.');

  processingLogger = recordingLogger();
  supervisor = consumerModule.createNotificationConsumerSupervisor({
    createChannel: createLiveConsumerChannel,
    processMessage: (message, eventService, channel, options) =>
      consumerModule.processNotificationMessage(message, eventService, channel, {
        ...options,
        retryDelayMs: 20,
        maxRetries: 2,
        logger: processingLogger.logger,
      }),
    logger: silentLogger,
    initialBackoffMs: 50,
    maxBackoffMs: 200,
  });

  await supervisor.start();
  await waitFor(
    async () => supervisor?.isRunning() ?? false,
    running => running,
    15_000,
  );

  publisher = publisherModule.createNotificationPublisher({
    createConfirmChannel: createLiveConfirmChannel,
    connectTimeoutMs: 5_000,
    confirmTimeoutMs: 5_000,
    logger: silentLogger,
  });

  setupReady = true;
}

before(async () => {
  if (!runRequested || !gate.ok) return;
  try {
    await setup();
  } catch (error) {
    throw new Error(`Live notification integration setup failed: ${redactError(error)}`);
  }
});

after(async () => {
  if (!runRequested || !gate.ok) return;

  try {
    if (supervisor) await supervisor.stop();
  } catch {
    // Best effort cleanup.
  }

  try {
    if (publisher) await publisher.close();
  } catch {
    // Best effort cleanup.
  }

  if (admin && !adminClosed) {
    try {
      if (queue) await admin.deleteQueue(queue);
    } catch {
      // Best effort cleanup.
    }
    try {
      if (dlq) await admin.deleteQueue(dlq);
    } catch {
      // Best effort cleanup.
    }
    try {
      await admin.close();
    } catch {
      // Best effort cleanup.
    }
  }

  try {
    if (rabbit) await rabbit.closeRabbitMQ();
  } catch {
    // Best effort cleanup.
  }

  if (pool) {
    try {
      await cleanupFixtures(pool);
    } catch {
      // Best effort cleanup.
    }
    try {
      await pool.end();
    } catch {
      // Best effort cleanup.
    }
  }
});

test('live integration gate is explicitly configured and safe', { skip: !runRequested }, () => {
  assert.equal(gate.ok, true, gate.error);
});

function liveTest(name: string, fn: () => Promise<void>): void {
  test(name, { skip: liveSkip }, async () => {
    assert.equal(
      setupReady,
      true,
      'Live integration setup did not complete; see the setup error.',
    );
    await fn();
  });
}

liveTest('notification migrations 001 and 004 are compatible with real PostgreSQL', async () => {
  const tables = await pool!.query<{ notifications: string | null; preferences: string | null }>(
    `SELECT to_regclass('public.notifications')::text AS notifications,
            to_regclass('public.user_notification_preferences')::text AS preferences`,
  );
  assert.ok(tables.rows[0].notifications);
  assert.ok(tables.rows[0].preferences);

  const columns = await pool!.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'notifications'`,
  );
  const columnNames = new Set(columns.rows.map(row => row.column_name));
  for (const required of ['type', 'read_at', 'delivery_channels']) {
    assert.ok(columnNames.has(required), `missing notifications.${required}`);
  }

  const indexes = await pool!.query<{ indexname: string }>(
    `SELECT indexname
       FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'notifications'`,
  );
  const indexNames = new Set(indexes.rows.map(row => row.indexname));
  for (const required of [
    'notifications_user_event_unique',
    'notifications_user_created_idx',
    'notifications_user_unread_idx',
  ]) {
    assert.ok(indexNames.has(required), `missing index ${required}`);
  }
});

liveTest('per-recipient event uniqueness is enforced on real PostgreSQL', async () => {
  const eventId = `${runTag}-unique`;
  const sql = `INSERT INTO public.notifications
                 (user_id, event_id, type, title, message)
               VALUES ($1::uuid, $2, 'TEST', 'Integration unique', 'Integration unique')`;

  await pool!.query(sql, [fixtures.customerB, eventId]);
  await assert.rejects(
    () => pool!.query(sql, [fixtures.customerB, eventId]),
    (error: unknown) => (error as { code?: string }).code === '23505',
  );
  await pool!.query(sql, [fixtures.customerAssigned, eventId]);

  const count = await countNotifications(eventId);
  assert.equal(count, 2);
});

liveTest('notification service processing is idempotent for duplicate events', async () => {
  const event = makeEvent(
    `${runTag}-service-duplicate`,
    'COURIER_ASSIGNED',
    fixtures.parcelAssigned,
    tracking.assigned,
  );

  const first = await service!.processEvent(event);
  assert.equal(first.status, 'processed');
  if (first.status === 'processed') {
    assert.equal(first.inserted, 2);
    assert.equal(first.skipped, 0);
  }

  const second = await service!.processEvent(event);
  assert.equal(second.status, 'processed');
  if (second.status === 'processed') {
    assert.equal(second.inserted, 0);
    assert.equal(second.skipped, 2);
  }

  assert.equal(await countNotifications(event.eventId), 2);
});

liveTest('customer and courier notifications are isolated by recipient', async () => {
  const assignedEvent = makeEvent(
    `${runTag}-isolation-assigned`,
    'COURIER_ASSIGNED',
    fixtures.parcelAssigned,
    tracking.assigned,
  );
  const deliveredEvent = makeEvent(
    `${runTag}-isolation-delivered`,
    'PARCEL_DELIVERED',
    fixtures.parcelAssigned,
    tracking.assigned,
  );

  await service!.processEvent(assignedEvent);
  await service!.processEvent(deliveredEvent);

  const assignedUsers = new Set(
    (
      await pool!.query<{ user_id: string }>(
        `SELECT user_id FROM public.notifications WHERE event_id = $1`,
        [assignedEvent.eventId],
      )
    ).rows.map(row => row.user_id),
  );
  const deliveredUsers = new Set(
    (
      await pool!.query<{ user_id: string }>(
        `SELECT user_id FROM public.notifications WHERE event_id = $1`,
        [deliveredEvent.eventId],
      )
    ).rows.map(row => row.user_id),
  );

  assert.deepEqual(assignedUsers, new Set([fixtures.customerAssigned, fixtures.courierAssigned]));
  assert.deepEqual(deliveredUsers, new Set([fixtures.customerAssigned]));

  const customerList = await service!.listNotifications(fixtures.customerAssigned, { limit: 100 });
  const courierList = await service!.listNotifications(fixtures.courierAssigned, { limit: 100 });
  const otherList = await service!.listNotifications(fixtures.customerB, { limit: 100 });

  const assignedIds = new Set(
    (await pool!.query<{ id: string; user_id: string }>(
      `SELECT id, user_id FROM public.notifications WHERE event_id = $1`,
      [assignedEvent.eventId],
    )).rows.map(row => row.id),
  );

  assert.ok(customerList.notifications.some(item => assignedIds.has(item.id)));
  assert.ok(courierList.notifications.some(item => assignedIds.has(item.id)));
  assert.equal(otherList.notifications.some(item => assignedIds.has(item.id)), false);
});

liveTest('read and unread state, counts, and mark-all work on real PostgreSQL', async () => {
  const first = makeEvent(
    `${runTag}-read-one`,
    'PARCEL_BOOKED',
    fixtures.parcelRead,
    tracking.read,
  );
  const second = makeEvent(
    `${runTag}-read-two`,
    'PARCEL_IN_TRANSIT',
    fixtures.parcelRead,
    tracking.read,
  );

  await service!.processEvent(first);
  await service!.processEvent(second);

  assert.equal(await service!.getUnreadCount(fixtures.customerRead), 2);
  const unread = await service!.listNotifications(fixtures.customerRead, {
    limit: 100,
    isRead: false,
  });
  assert.equal(unread.notifications.length, 2);

  const target = unread.notifications[0];
  const marked = await service!.markRead(fixtures.customerRead, target.id);
  assert.ok(marked?.isRead);
  assert.ok(marked?.readAt);
  assert.equal(await service!.getUnreadCount(fixtures.customerRead), 1);

  assert.equal(await service!.markAllRead(fixtures.customerRead), 1);
  assert.equal(await service!.getUnreadCount(fixtures.customerRead), 0);

  const readList = await service!.listNotifications(fixtures.customerRead, {
    limit: 100,
    isRead: true,
  });
  assert.equal(readList.notifications.length, 2);
});

liveTest('preferences persist and affect recorded delivery channels', async () => {
  const initial = await service!.getPreferences(fixtures.customerPreference);
  assert.equal(initial.pushEnabled, true);
  assert.equal(initial.emailEnabled, true);
  assert.equal(initial.smsEnabled, true);

  const updated = await service!.updatePreferences(fixtures.customerPreference, {
    pushEnabled: false,
    emailEnabled: true,
    smsEnabled: false,
  });
  assert.equal(updated.pushEnabled, false);
  assert.equal(updated.emailEnabled, true);
  assert.equal(updated.smsEnabled, false);

  const reloaded = await service!.getPreferences(fixtures.customerPreference);
  assert.equal(reloaded.pushEnabled, false);
  assert.equal(reloaded.emailEnabled, true);
  assert.equal(reloaded.smsEnabled, false);

  const event = makeEvent(
    `${runTag}-preference-event`,
    'PARCEL_DELIVERED',
    fixtures.parcelPreference,
    tracking.preference,
  );
  await service!.processEvent(event);

  const { rows } = await pool!.query<{ delivery_channels: string[] }>(
    `SELECT delivery_channels
       FROM public.notifications
      WHERE event_id = $1`,
    [event.eventId],
  );
  assert.deepEqual(rows[0].delivery_channels, ['EMAIL']);
});

liveTest('concurrent first-time preference reads return one row', async () => {
  const [first, second] = await Promise.all([
    service!.getPreferences(fixtures.customerConcurrent),
    service!.getPreferences(fixtures.customerConcurrent),
  ]);

  assert.equal(first.pushEnabled, true);
  assert.equal(second.pushEnabled, true);

  const { rows } = await pool!.query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM public.user_notification_preferences
      WHERE user_id = $1`,
    [fixtures.customerConcurrent],
  );
  assert.equal(rows[0].count, 1);
});

liveTest('cursor pagination is stable over real PostgreSQL', async () => {
  for (let index = 0; index < 25; index += 1) {
    await service!.processEvent(
      makeEvent(
        `${runTag}-page-${index}`,
        'PARCEL_BOOKED',
        fixtures.parcelPagination,
        tracking.pagination,
      ),
    );
  }

  const seen = new Set<string>();
  const sizes: number[] = [];
  let cursor: NotificationCursor | undefined;

  for (let page = 0; page < 3; page += 1) {
    const result = await service!.listNotifications(fixtures.customerPagination, {
      limit: 10,
      ...(cursor ? { cursor } : {}),
    });

    sizes.push(result.notifications.length);
    for (const notification of result.notifications) seen.add(notification.id);

    if (result.nextCursor) {
      const decoded = serviceModule!.decodeNotificationCursor(result.nextCursor);
      assert.ok(decoded);
      cursor = decoded ?? undefined;
    } else {
      cursor = undefined;
    }
  }

  assert.deepEqual(sizes, [10, 10, 5]);
  assert.equal(seen.size, 25);
});

liveTest('publisher declares the durable configured queue, confirms, and the consumer fans out', async () => {
  assert.ok(queueModule);
  assert.equal(queueModule.notificationQueueName(), queue);
  assert.equal(queueModule.notificationDeadLetterQueueName(), dlq);

  const eventId = `${runTag}-pipeline-assigned`;
  const payload = {
    eventId,
    eventType: 'COURIER_ASSIGNED',
    parcelId: fixtures.parcelAssigned,
    trackingNumber: tracking.assigned,
    timestamp: new Date().toISOString(),
  };

  assert.equal(await publisher!.publish(payload), true);
  assert.ok(
    publisherAssertions.some(
      assertion => assertion.queue === queue && assertion.options?.durable === true,
    ),
    'publisher did not assert the configured durable notification queue',
  );

  await waitFor(
    async () => processingLogger.info.filter(message => message.includes(eventId)).length,
    count => count >= 1,
  );
  await waitFor(() => countNotifications(eventId), count => count === 2);

  const { rows } = await pool!.query<{ user_id: string }>(
    `SELECT user_id FROM public.notifications WHERE event_id = $1`,
    [eventId],
  );
  assert.deepEqual(
    new Set(rows.map(row => row.user_id)),
    new Set([fixtures.customerAssigned, fixtures.courierAssigned]),
  );

  const info = await admin!.checkQueue(queue);
  assert.equal(info.queue, queue);
});

liveTest('duplicate delivery does not create duplicate notifications', async () => {
  const eventId = `${runTag}-pipeline-duplicate`;
  const payload = {
    eventId,
    eventType: 'PARCEL_DELIVERED',
    parcelId: fixtures.parcelAssigned,
    trackingNumber: tracking.assigned,
    timestamp: new Date().toISOString(),
  };

  assert.equal(await publisher!.publish(payload), true);
  assert.equal(await publisher!.publish(payload), true);

  await waitFor(
    async () => processingLogger.info.filter(message => message.includes(eventId)).length,
    count => count >= 2,
  );
  await waitFor(() => countNotifications(eventId), count => count === 1);
  assert.equal(await countNotifications(eventId), 1);
});

liveTest('malformed JSON is moved to the DLQ', async () => {
  await admin!.sendToQueue(queue, Buffer.from('{not-json'), { persistent: true });
  const envelope = await waitForDlq(item => item.reason === 'INVALID_JSON');
  assert.equal(envelope.reason, 'INVALID_JSON');
  assert.match(String(envelope.original), /not-json/);
});

liveTest('schema-invalid events are moved to the DLQ', async () => {
  await admin!.sendToQueue(
    queue,
    Buffer.from(JSON.stringify({ event: 'PARCEL_BOOKED' }), 'utf8'),
    { persistent: true },
  );
  const envelope = await waitForDlq(item => item.reason === 'INVALID_EVENT');
  assert.equal(envelope.reason, 'INVALID_EVENT');
});

liveTest('unsupported events are acknowledged without notifications', async () => {
  const eventId = `${runTag}-unsupported`;
  const beforeWarnings = processingLogger.warn.length;

  assert.equal(
    await publisher!.publish({
      eventId,
      eventType: 'PARCEL_UNKNOWN',
      parcelId: fixtures.parcelAssigned,
    }),
    true,
  );

  await waitFor(
    async () => processingLogger.warn.length > beforeWarnings,
    advanced => advanced,
  );
  assert.equal(await countNotifications(eventId), 0);
});

liveTest('transient failures retry and then move to the DLQ', async () => {
  const eventId = `${runTag}-retry`;
  const missingParcelId = randomUUID();

  assert.equal(
    await publisher!.publish({
      eventId,
      eventType: 'PARCEL_BOOKED',
      parcelId: missingParcelId,
      timestamp: new Date().toISOString(),
    }),
    true,
  );

  const envelope = await waitForDlq(item => {
    if (item.reason !== 'MAX_RETRIES_EXCEEDED') return false;
    try {
      return (JSON.parse(String(item.original)) as { eventId?: string }).eventId === eventId;
    } catch {
      return false;
    }
  });

  assert.equal(envelope.reason, 'MAX_RETRIES_EXCEEDED');
  assert.equal(await countNotifications(eventId), 0);
});

liveTest('consumer reconnects after its channel is closed', async () => {
  const beforeChannels = consumerChannels.length;
  assert.ok(beforeChannels > 0);

  await consumerChannels[beforeChannels - 1].close();

  await waitFor(
    async () => ({
      count: consumerChannels.length,
      running: supervisor!.isRunning(),
    }),
    state => state.count > beforeChannels && state.running,
    15_000,
  );

  const eventId = `${runTag}-after-consumer-reconnect`;
  assert.equal(
    await publisher!.publish({
      eventId,
      eventType: 'PARCEL_BOOKED',
      parcelId: fixtures.parcelAssigned,
      trackingNumber: tracking.assigned,
      timestamp: new Date().toISOString(),
    }),
    true,
  );
  await waitFor(() => countNotifications(eventId), count => count >= 1);
});

liveTest('publisher publishes again after its confirm channel is closed', async () => {
  const beforeChannels = publisherChannels.length;
  assert.ok(beforeChannels > 0);

  await publisherChannels[beforeChannels - 1].close();

  const eventId = `${runTag}-after-publisher-reconnect`;
  await waitFor(
    async () =>
      publisher!.publish({
        eventId,
        eventType: 'PARCEL_BOOKED',
        parcelId: fixtures.parcelRead,
        trackingNumber: tracking.read,
        timestamp: new Date().toISOString(),
      }),
    published => published,
    15_000,
  );

  await waitFor(() => countNotifications(eventId), count => count >= 1);
  assert.ok(publisherChannels.length > beforeChannels);
});

liveTest('consumer stops cleanly and releases its queue consumer', async () => {
  const lastChannel = consumerChannels[consumerChannels.length - 1];
  assert.ok(lastChannel);

  await supervisor!.stop();
  assert.equal(supervisor!.isRunning(), false);
  assert.ok(lastChannel.cancelCalls >= 1);
  assert.ok(lastChannel.closeCalls >= 1);

  await waitFor(
    async () => admin!.checkQueue(queue),
    info => info.consumerCount === 0,
    15_000,
  );
});

liveTest('standalone API shutdown drains a real request, then closes publisher and broker once', async () => {
  await admin!.deleteQueue(queue);
  await admin!.deleteQueue(dlq);
  await admin!.close();
  adminClosed = true;

  const slowStarted = deferred<void>();
  const slowRelease = deferred<void>();
  const events: string[] = [];

  const localServer = http.createServer((request, response) => {
    if (request.url === '/slow') {
      slowStarted.resolve();
      void slowRelease.promise.then(() => response.end('ok'));
      return;
    }
    response.end('ok');
  });

  await new Promise<void>(resolve => {
    localServer.listen(0, '127.0.0.1', resolve);
  });
  const { port } = localServer.address() as AddressInfo;
  const slowRequest = fetch(`http://127.0.0.1:${port}/slow`, {
    signal: AbortSignal.timeout(10_000),
  });

  try {
    await slowStarted.promise;

    const shutdown = createApiShutdown({
      stopHttp: () =>
        new Promise<void>((resolve, reject) => {
          events.push('http');
          localServer.close(error => {
            if (error) reject(error);
            else resolve();
          });
          localServer.closeIdleConnections();
        }),
      closePublisher: async () => {
        events.push('publisher');
        await publisher!.close();
      },
      closeBroker: async () => {
        events.push('broker');
        await rabbit!.closeRabbitMQ();
      },
      exit: code => events.push(`exit:${code}`),
      logger: silentLogger,
    });

    const first = shutdown('SIGTERM');
    const second = shutdown('SIGINT');
    assert.equal(first, second);

    await flush();
    assert.deepEqual(events, ['http']);

    slowRelease.resolve();
    const response = await slowRequest;
    assert.equal(response.status, 200);
    await response.text();
    localServer.closeIdleConnections();
    await first;

    assert.deepEqual(events, ['http', 'publisher', 'broker', 'exit:0']);
    assert.equal(await rabbit!.connectRabbitMQ(), null);
  } finally {
    slowRelease.resolve();
    try {
      await slowRequest;
    } catch {
      // The request may already be complete.
    }
    if (localServer.listening) {
      await new Promise<void>(resolve => localServer.close(() => resolve()));
    }
  }
});
