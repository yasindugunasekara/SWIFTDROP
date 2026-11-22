import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { normalizeParcelEvent, parseParcelEvent } from './notification.events.js';
import {
  createNotificationService,
  type NotificationService,
  type Queryable,
} from './notification.service.js';
import type { NormalizedParcelEvent } from './notification.types.js';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const COURIER_ID = '22222222-2222-4222-8222-222222222222';
const PARCEL_ID = '66666666-6666-4666-8666-666666666666';
const MERCHANT_PARCEL_ID = '77777777-7777-4777-8777-777777777777';
const MISSING_PARCEL_ID = '99999999-9999-4999-8999-999999999999';
const TIMESTAMP = '2026-11-22T10:15:00.000Z';

const FIXTURE = `
  CREATE TABLE public.users (
    id UUID PRIMARY KEY,
    role TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE public.parcels (
    id UUID PRIMARY KEY,
    tracking_number VARCHAR(30) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.users(id)
  );

  CREATE TABLE public.courier_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL REFERENCES public.parcels(id),
    courier_id UUID NOT NULL REFERENCES public.users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
  );

  CREATE TABLE public.user_notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  -- Legacy shape, including the GLOBAL unique rule on event_id.
  CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    parcel_id UUID REFERENCES public.parcels(id),
    event_id VARCHAR(100) UNIQUE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
  );

  INSERT INTO public.users (id, role) VALUES
    ('${CUSTOMER_ID}', 'CUSTOMER'),
    ('${COURIER_ID}', 'COURIER'),
    ('33333333-3333-4333-8333-333333333333', 'CUSTOMER'),
    ('44444444-4444-4444-8444-444444444444', 'COURIER');

  INSERT INTO public.parcels (id, tracking_number, customer_id) VALUES
    ('${PARCEL_ID}', 'SWIFT-991122', '${CUSTOMER_ID}'),
    ('${MERCHANT_PARCEL_ID}', 'SWIFT-MERCHANT', NULL);

  INSERT INTO public.courier_assignments (parcel_id, courier_id) VALUES
    ('${PARCEL_ID}', '${COURIER_ID}');

  INSERT INTO public.notifications (user_id, parcel_id, event_id, title, message) VALUES
    ('${CUSTOMER_ID}', NULL, 'legacy-evt-1', 'Legacy title', 'Legacy message');

  INSERT INTO public.user_notification_preferences
    (user_id, push_enabled, email_enabled, sms_enabled)
  VALUES
    ('${CUSTOMER_ID}', TRUE, FALSE, FALSE);
`;

let database: PGlite;
let service: NotificationService;

function adapter(pglite: PGlite): Queryable {
  return {
    async query<R extends Record<string, unknown>>(text: string, values?: unknown[]) {
      const result = await pglite.query(text, values);
      return {
        rows: result.rows as R[],
        rowCount: result.affectedRows ?? result.rows.length,
      };
    },
  };
}

function event(payload: Record<string, unknown>): NormalizedParcelEvent {
  const parsed = parseParcelEvent(payload);
  assert.equal(parsed.success, true, `event payload should be valid: ${JSON.stringify(payload)}`);
  if (!parsed.success) throw new Error('unreachable');
  const normalized = normalizeParcelEvent(parsed.data);
  assert.ok(normalized, 'event should be supported');
  return normalized;
}

before(async () => {
  database = new PGlite();
  await database.exec(FIXTURE);

  const migration = await readFile(
    new URL('../../database/migrations/004_notifications_hardening.sql', import.meta.url),
    'utf8',
  );

  // Apply twice: the project's runner has no migration ledger.
  await database.exec(migration);
  await database.exec(migration);

  service = createNotificationService(adapter(database));
});

after(async () => {
  await database.close();
});

// =============================================================================
// Migration behaviour
// =============================================================================

test('migration is repeatable and preserves existing notifications and preferences', async () => {
  const notification = await database.query<{
    title: string;
    message: string;
    is_read: boolean;
    type: string;
    read_at: string | null;
    delivery_channels: string[];
  }>(
    `SELECT title, message, is_read, type, read_at, delivery_channels
       FROM public.notifications WHERE event_id = 'legacy-evt-1'`,
  );

  assert.equal(notification.rows.length, 1, 'legacy notification still exists');
  assert.equal(notification.rows[0].title, 'Legacy title');
  assert.equal(notification.rows[0].message, 'Legacy message');
  assert.equal(notification.rows[0].is_read, false);
  assert.equal(notification.rows[0].type, 'SYSTEM', 'new column receives its default');
  assert.equal(notification.rows[0].read_at, null);
  assert.deepEqual(notification.rows[0].delivery_channels, []);

  const preference = await database.query<{
    push_enabled: boolean;
    email_enabled: boolean;
    sms_enabled: boolean;
  }>(
    `SELECT push_enabled, email_enabled, sms_enabled
       FROM public.user_notification_preferences WHERE user_id = $1`,
    [CUSTOMER_ID],
  );

  assert.equal(preference.rows.length, 1, 'existing preferences preserved');
  assert.deepEqual(preference.rows[0], {
    push_enabled: true,
    email_enabled: false,
    sms_enabled: false,
  });
});

test('migration creates the per-recipient unique index and inbox indexes', async () => {
  const indexes = await database.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'notifications'`,
  );
  const names = indexes.rows.map(row => row.indexname);

  assert.ok(names.includes('notifications_user_event_unique'), 'per-recipient unique index');
  assert.ok(names.includes('notifications_user_created_idx'), 'inbox pagination index');
  assert.ok(names.includes('notifications_user_unread_idx'), 'unread count index');
});

test('one event can be stored for two different recipients', async () => {
  await database.query(
    `INSERT INTO public.notifications (user_id, event_id, title, message)
     VALUES ($1, 'evt-1001', 'Customer copy', 'Customer message')`,
    [CUSTOMER_ID],
  );
  await database.query(
    `INSERT INTO public.notifications (user_id, event_id, title, message)
     VALUES ($1, 'evt-1001', 'Courier copy', 'Courier message')`,
    [COURIER_ID],
  );

  const count = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM public.notifications WHERE event_id = 'evt-1001'`,
  );
  assert.equal(count.rows[0].count, 2);
});

test('a duplicate (user_id, event_id) pair is rejected by the database', async () => {
  await assert.rejects(
    database.query(
      `INSERT INTO public.notifications (user_id, event_id, title, message)
       VALUES ($1, 'evt-1001', 'Duplicate', 'Duplicate')`,
      [CUSTOMER_ID],
    ),
    /duplicate key value|unique constraint/i,
  );
});

// =============================================================================
// Service behaviour and idempotency
// =============================================================================

test('COURIER_ASSIGNED creates one notification per recipient and applies preferences', async () => {
  const assigned = event({
    eventId: 'evt-2001',
    event: 'COURIER_ASSIGNED',
    parcelId: PARCEL_ID,
    courierId: COURIER_ID,
    trackingNumber: 'SWIFT-991122',
    timestamp: TIMESTAMP,
  });

  const result = await service.processEvent(assigned);
  assert.deepEqual(result, { status: 'processed', inserted: 2, skipped: 0, recipients: 2 });

  const rows = await database.query<{
    user_id: string;
    type: string;
    title: string;
    delivery_channels: string[];
  }>(
    `SELECT user_id, type, title, delivery_channels
       FROM public.notifications WHERE event_id = 'evt-2001' ORDER BY user_id`,
  );

  assert.equal(rows.rows.length, 2);
  const customerRow = rows.rows.find(row => row.user_id === CUSTOMER_ID);
  const courierRow = rows.rows.find(row => row.user_id === COURIER_ID);

  assert.ok(customerRow && courierRow);
  assert.equal(customerRow.type, 'COURIER_ASSIGNED');
  assert.equal(courierRow.title, 'New delivery assignment');
  // Customer disabled email + SMS; courier has the defaults.
  assert.deepEqual(customerRow.delivery_channels, ['PUSH']);
  assert.deepEqual(courierRow.delivery_channels, ['PUSH', 'EMAIL', 'SMS']);
});

test('redelivering the same event creates no duplicates', async () => {
  const assigned = event({
    eventId: 'evt-2001',
    event: 'COURIER_ASSIGNED',
    parcelId: PARCEL_ID,
    courierId: COURIER_ID,
    trackingNumber: 'SWIFT-991122',
    timestamp: TIMESTAMP,
  });

  const result = await service.processEvent(assigned);
  assert.deepEqual(result, { status: 'processed', inserted: 0, skipped: 2, recipients: 2 });

  const count = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM public.notifications WHERE event_id = 'evt-2001'`,
  );
  assert.equal(count.rows[0].count, 2, 'still exactly one row per recipient');
});

test('a different event creates separate notifications', async () => {
  const delivered = event({
    eventId: 'evt-2002',
    event: 'PARCEL_DELIVERED',
    parcelId: PARCEL_ID,
    trackingNumber: 'SWIFT-991122',
    timestamp: '2026-11-22T12:00:00.000Z',
  });

  const result = await service.processEvent(delivered);
  assert.equal(result.status, 'processed');
  if (result.status !== 'processed') throw new Error('unreachable');
  assert.equal(result.inserted, 1, 'customer only');

  const count = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM public.notifications WHERE event_id = 'evt-2002'`,
  );
  assert.equal(count.rows[0].count, 1);
});

test('non-courier events notify the customer only', async () => {
  const outForDelivery = event({
    eventId: 'evt-2003',
    event: 'PARCEL_STATUS_UPDATED',
    parcelId: PARCEL_ID,
    status: 'OUT_FOR_DELIVERY',
    trackingNumber: 'SWIFT-991122',
    timestamp: TIMESTAMP,
  });

  const result = await service.processEvent(outForDelivery);
  assert.deepEqual(result, { status: 'processed', inserted: 1, skipped: 0, recipients: 1 });
});

test('concurrent processing of the same event cannot create duplicates', async () => {
  const delivered = event({
    eventId: 'evt-2004',
    event: 'PARCEL_DELIVERED',
    parcelId: PARCEL_ID,
    timestamp: '2026-11-22T13:00:00.000Z',
  });

  const [first, second] = await Promise.all([
    service.processEvent(delivered),
    service.processEvent(delivered),
  ]);

  const inserted = [first, second]
    .map(result => (result.status === 'processed' ? result.inserted : 0))
    .reduce((sum, value) => sum + value, 0);

  assert.equal(inserted, 1, 'only one of the concurrent inserts wins');
  const count = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM public.notifications WHERE event_id = 'evt-2004'`,
  );
  assert.equal(count.rows[0].count, 1);
});

test('a missing parcel is reported as transient instead of creating rows', async () => {
  const missing = event({
    eventId: 'evt-2005',
    event: 'PARCEL_DELIVERED',
    parcelId: MISSING_PARCEL_ID,
  });

  const result = await service.processEvent(missing);
  assert.deepEqual(result, { status: 'parcel_not_found' });
});

test('a parcel with no eligible recipients is reported without creating rows', async () => {
  const merchantParcel = event({
    eventId: 'evt-2006',
    event: 'PARCEL_OUT_FOR_DELIVERY',
    parcelId: MERCHANT_PARCEL_ID,
  });

  const result = await service.processEvent(merchantParcel);
  assert.deepEqual(result, { status: 'no_recipients' });
});

test('migration refuses to run when duplicate recipient/event pairs already exist', async () => {
  const scratch = new PGlite();

  try {
    await scratch.exec(FIXTURE);
    // Simulate a database whose legacy global constraint was never applied.
    await scratch.exec('ALTER TABLE public.notifications DROP CONSTRAINT notifications_event_id_key;');
    await scratch.exec(`
      INSERT INTO public.notifications (user_id, event_id, title, message)
      VALUES
        ('${CUSTOMER_ID}', 'duplicate-evt', 'First', 'First'),
        ('${CUSTOMER_ID}', 'duplicate-evt', 'Second', 'Second');
    `);

    const migration = await readFile(
      new URL('../../database/migrations/004_notifications_hardening.sql', import.meta.url),
      'utf8',
    );

    await assert.rejects(
      () => scratch.exec(migration),
      /duplicate \(user_id, event_id\) pair/i,
      'the migration must stop and report instead of deleting data',
    );

    const count = await scratch.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM public.notifications WHERE event_id = 'duplicate-evt'`,
    );
    assert.equal(count.rows[0].count, 2, 'both duplicate rows are preserved');
  } finally {
    await scratch.close();
  }
});

