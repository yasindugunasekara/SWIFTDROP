import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import express from 'express';
import { PGlite } from '@electric-sql/pglite';
import {
  createAuthenticationMiddleware,
  type AuthProfile,
} from '../../middleware/auth.js';
import { AuthServiceError } from '../auth/auth.service.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { createNotificationRouter } from './notification.routes.js';
import {
  createNotificationService,
  type Queryable,
} from './notification.service.js';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

const CUSTOMER_A = '11111111-1111-4111-8111-111111111111';
const COURIER_A = '22222222-2222-4222-8222-222222222222';
const CUSTOMER_B = '33333333-3333-4333-8333-333333333333';
const COURIER_B = '44444444-4444-4444-8444-444444444444';
const DISPATCHER = '55555555-5555-4555-8555-555555555555';

const PARCEL_A = '66666666-6666-4666-8666-666666666666';
const PARCEL_B = '77777777-7777-4777-8777-777777777777';

// Notification ids ordered by created_at DESC / id DESC in the assertions below.
const N_A_1 = 'a1000000-0000-4000-8000-000000000001';
const N_A_2 = 'a1000000-0000-4000-8000-000000000002';
const N_A_3 = 'a1000000-0000-4000-8000-000000000003';
const N_A_4 = 'a1000000-0000-4000-8000-000000000004';
const N_A_5 = 'a1000000-0000-4000-8000-000000000005';
const N_C_1 = 'a2000000-0000-4000-8000-000000000001';
const N_C_2 = 'a2000000-0000-4000-8000-000000000002';
const N_C_3 = 'a2000000-0000-4000-8000-000000000003';
const N_C_4 = 'a2000000-0000-4000-8000-000000000004';
const N_B_1 = 'a3000000-0000-4000-8000-000000000001';

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

  -- Legacy shape; migration 004 upgrades it.
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
`;

const SEED = `
  INSERT INTO public.users (id, role) VALUES
    ('${CUSTOMER_A}', 'CUSTOMER'),
    ('${COURIER_A}', 'COURIER'),
    ('${CUSTOMER_B}', 'CUSTOMER'),
    ('${COURIER_B}', 'COURIER'),
    ('${DISPATCHER}', 'DISPATCHER');

  INSERT INTO public.parcels (id, tracking_number, customer_id) VALUES
    ('${PARCEL_A}', 'SWIFT-991122', '${CUSTOMER_A}'),
    ('${PARCEL_B}', 'SWIFT-443322', '${CUSTOMER_B}');

  INSERT INTO public.notifications
    (id, user_id, parcel_id, event_id, type, title, message, is_read, read_at,
     delivery_channels, created_at)
  VALUES
    ('${N_A_1}', '${CUSTOMER_A}', '${PARCEL_A}', 'evt-a1', 'PARCEL_OUT_FOR_DELIVERY',
     'Out for delivery', 'Your parcel SWIFT-991122 is out for delivery.',
     FALSE, NULL, ARRAY['PUSH','EMAIL']::TEXT[], '2026-11-22T11:00:00Z'),
    ('${N_A_2}', '${CUSTOMER_A}', '${PARCEL_A}', 'evt-a2', 'PARCEL_DELIVERED',
     'Parcel delivered', 'Your parcel SWIFT-991122 has been delivered.',
     TRUE, '2026-11-22T09:30:00Z', ARRAY['PUSH']::TEXT[], '2026-11-22T09:00:00Z'),
    ('${N_A_3}', '${CUSTOMER_A}', NULL, 'evt-a3', 'PARCEL_IN_TRANSIT',
     'Parcel in transit', 'Your parcel is currently in transit.',
     FALSE, NULL, ARRAY[]::TEXT[], '2026-11-22T10:00:00Z'),
    ('${N_A_4}', '${CUSTOMER_A}', NULL, 'evt-a4', 'PARCEL_BOOKED',
     'Parcel booked', 'Your parcel has been successfully booked.',
     FALSE, NULL, ARRAY['SMS']::TEXT[], '2026-11-22T08:00:00Z'),
    ('${N_A_5}', '${CUSTOMER_A}', '${PARCEL_A}', 'evt-a5', 'COURIER_ASSIGNED',
     'Courier assigned', 'A courier has been assigned to your parcel.',
     TRUE, '2026-11-22T12:30:00Z', ARRAY['PUSH','EMAIL','SMS']::TEXT[], '2026-11-22T12:00:00Z'),

    ('${N_C_1}', '${COURIER_A}', '${PARCEL_A}', 'evt-c1', 'COURIER_ASSIGNED',
     'New delivery assignment', 'You have been assigned SWIFT-991122.',
     FALSE, NULL, ARRAY['PUSH']::TEXT[], '2026-11-22T10:30:00Z'),
    ('${N_C_2}', '${COURIER_A}', '${PARCEL_A}', 'evt-c2', 'PARCEL_DELIVERY_FAILED',
     'Delivery failure recorded', 'The failed delivery has been recorded.',
     TRUE, '2026-11-22T09:45:00Z', ARRAY['PUSH']::TEXT[], '2026-11-22T09:30:00Z'),
    ('${N_C_3}', '${COURIER_A}', '${PARCEL_A}', 'evt-c3', 'PARCEL_PICKED_UP',
     'Parcel picked up', 'The parcel has been picked up.',
     FALSE, NULL, ARRAY['PUSH']::TEXT[], '2026-11-22T10:30:00Z'),
    ('${N_C_4}', '${COURIER_A}', '${PARCEL_A}', 'evt-c4', 'PARCEL_IN_TRANSIT',
     'Parcel in transit', 'The parcel is in transit.',
     FALSE, NULL, ARRAY['PUSH']::TEXT[], '2026-11-22T10:30:00Z'),

    ('${N_B_1}', '${CUSTOMER_B}', '${PARCEL_B}', 'evt-b1', 'PARCEL_DELIVERED',
     'Parcel delivered', 'Your parcel SWIFT-443322 has been delivered.',
     FALSE, NULL, ARRAY['PUSH']::TEXT[], '2026-11-22T07:00:00Z'),

    ('a4000000-0000-4000-8000-000000000001', '${COURIER_B}', '${PARCEL_B}', 'evt-d1', 'COURIER_ASSIGNED',
     'New delivery assignment', 'You have been assigned SWIFT-443322.',
     FALSE, NULL, ARRAY['PUSH']::TEXT[], '2026-11-22T06:00:00Z');

  INSERT INTO public.user_notification_preferences
    (user_id, push_enabled, email_enabled, sms_enabled, updated_at)
  VALUES
    ('${CUSTOMER_A}', TRUE, FALSE, FALSE, '2026-11-22T01:00:00Z');
`;

const profiles: Record<string, AuthProfile> = {
  'customer-a-token': {
    id: CUSTOMER_A,
    authUserId: 'b1000000-0000-4000-8000-000000000001',
    email: 'customer.a@example.com',
    fullName: 'Customer A',
    phone: null,
    role: 'CUSTOMER',
  },
  'customer-b-token': {
    id: CUSTOMER_B,
    authUserId: 'b3000000-0000-4000-8000-000000000003',
    email: 'customer.b@example.com',
    fullName: 'Customer B',
    phone: null,
    role: 'CUSTOMER',
  },
  'courier-a-token': {
    id: COURIER_A,
    authUserId: 'b2000000-0000-4000-8000-000000000002',
    email: 'courier.a@example.com',
    fullName: 'Courier A',
    phone: null,
    role: 'COURIER',
  },
  'courier-b-token': {
    id: COURIER_B,
    authUserId: 'b4000000-0000-4000-8000-000000000004',
    email: 'courier.b@example.com',
    fullName: 'Courier B',
    phone: null,
    role: 'COURIER',
  },
  'dispatcher-token': {
    id: DISPATCHER,
    authUserId: 'b5000000-0000-4000-8000-000000000005',
    email: 'dispatcher@example.com',
    fullName: 'Dispatcher',
    phone: null,
    role: 'DISPATCHER',
  },
};

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------

let database: PGlite;
let server: Server;
let baseUrl: string;

function pgliteQueryable(pglite: PGlite): Queryable {
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

before(async () => {
  database = new PGlite();
  await database.exec(FIXTURE);

  const migration = await readFile(
    new URL('../../database/migrations/004_notifications_hardening.sql', import.meta.url),
    'utf8',
  );
  await database.exec(migration);
  await database.exec(migration);
  await database.exec(SEED);

  const service = createNotificationService(pgliteQueryable(database));
  const authenticate = createAuthenticationMiddleware({
    async authenticate(token: string): Promise<AuthProfile> {
      const profile = profiles[token];
      if (!profile) {
        throw new AuthServiceError(401, 'INVALID_TOKEN', 'Invalid or expired session.');
      }
      return profile;
    },
  });

  const app = express();
  app.use(express.json());
  app.use('/api/v1/notifications', createNotificationRouter({ authenticate, service }));
  app.use(errorHandler);

  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
    server.closeAllConnections();
  });
  await database.close();
});

async function request(
  method: string,
  path: string,
  options: { token?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}/api/v1/notifications${path}`, {
    method,
    headers,
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data, headers: response.headers };
}

// -----------------------------------------------------------------------------
// Authentication and authorisation
// -----------------------------------------------------------------------------

test('rejects unauthenticated requests to every endpoint', async () => {
  const calls: Array<[string, string]> = [
    ['GET', '/'],
    ['GET', '/inbox'],
    ['GET', '/unread-count'],
    ['GET', '/preferences'],
    ['PATCH', '/read-all'],
    ['PATCH', `/${N_A_1}/read`],
    ['PUT', '/preferences'],
  ];

  for (const [method, path] of calls) {
    const result = await request(method, path, {
      ...(method === 'PUT' ? { body: { pushEnabled: false } } : {}),
    });
    assert.equal(result.status, 401, `${method} ${path}`);
  }
});

test('rejects roles outside the customer/courier inbox scope', async () => {
  const result = await request('GET', '/', { token: 'dispatcher-token' });
  assert.equal(result.status, 403);
  assert.match(result.data.error, /Forbidden/);
});

// -----------------------------------------------------------------------------
// Inbox reads, isolation and pagination
// -----------------------------------------------------------------------------

test('customer retrieves only their own notifications in stable order', async () => {
  const result = await request('GET', '/', { token: 'customer-a-token' });
  assert.equal(result.status, 200);
  assert.equal(result.data.count, 5);
  assert.equal(result.data.hasMore, false);
  assert.equal(result.data.nextCursor, null);

  assert.deepEqual(
    result.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_5, N_A_1, N_A_3, N_A_2, N_A_4],
  );

  const outForDelivery = result.data.notifications.find(
    (notification: { id: string }) => notification.id === N_A_1,
  );
  assert.equal(outForDelivery.type, 'PARCEL_OUT_FOR_DELIVERY');
  assert.equal(outForDelivery.isRead, false);
  assert.equal(outForDelivery.readAt, null);
  assert.equal(outForDelivery.trackingNumber, 'SWIFT-991122');
  assert.deepEqual(outForDelivery.deliveryChannels, ['PUSH', 'EMAIL']);
  assert.ok(!('user_id' in outForDelivery));
  assert.ok(!('userId' in outForDelivery));

  const delivered = result.data.notifications.find(
    (notification: { id: string }) => notification.id === N_A_2,
  );
  assert.equal(delivered.isRead, true);
  assert.equal(delivered.readAt, '2026-11-22T09:30:00.000Z');
  assert.equal(delivered.createdAt, '2026-11-22T09:00:00.000Z');
});

test('courier retrieves only their own notifications', async () => {
  const result = await request('GET', '/', { token: 'courier-a-token' });
  assert.equal(result.status, 200);
  assert.equal(result.data.count, 4);
  assert.deepEqual(
    result.data.notifications.map((notification: { id: string }) => notification.id),
    [N_C_4, N_C_3, N_C_1, N_C_2],
  );
});

test('a user cannot read or modify another user\'s notifications', async () => {
  const customerB = await request('GET', '/', { token: 'customer-b-token' });
  assert.equal(customerB.status, 200);
  assert.deepEqual(
    customerB.data.notifications.map((notification: { id: string }) => notification.id),
    [N_B_1],
  );

  const customerA = await request('GET', '/', { token: 'customer-a-token' });
  assert.ok(!customerA.data.notifications.some(
    (notification: { id: string }) => notification.id === N_B_1,
  ));

  const customerCross = await request('PATCH', `/${N_B_1}/read`, { token: 'customer-a-token' });
  assert.equal(customerCross.status, 404);

  const courierCross = await request('PATCH', `/${N_A_1}/read`, { token: 'courier-a-token' });
  assert.equal(courierCross.status, 404);

  const row = await database.query<{ is_read: boolean }>(
    'SELECT is_read FROM public.notifications WHERE id = $1',
    [N_B_1],
  );
  assert.equal(row.rows[0].is_read, false, 'the foreign notification was not modified');
});

test('paginates with a stable keyset cursor and no duplicates', async () => {
  const first = await request('GET', '/?limit=2', { token: 'customer-a-token' });
  assert.equal(first.status, 200);
  assert.equal(first.data.count, 2);
  assert.equal(first.data.hasMore, true);
  assert.equal(typeof first.data.nextCursor, 'string');
  assert.deepEqual(
    first.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_5, N_A_1],
  );

  const second = await request(
    'GET',
    `/?limit=2&cursor=${encodeURIComponent(first.data.nextCursor)}`,
    { token: 'customer-a-token' },
  );
  assert.equal(second.status, 200);
  assert.equal(second.data.hasMore, true);
  assert.deepEqual(
    second.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_3, N_A_2],
  );

  const third = await request(
    'GET',
    `/?limit=2&cursor=${encodeURIComponent(second.data.nextCursor)}`,
    { token: 'customer-a-token' },
  );
  assert.equal(third.status, 200);
  assert.equal(third.data.hasMore, false);
  assert.equal(third.data.nextCursor, null);
  assert.deepEqual(
    third.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_4],
  );

  const all = [
    ...first.data.notifications,
    ...second.data.notifications,
    ...third.data.notifications,
  ].map((notification: { id: string }) => notification.id);
  assert.equal(new Set(all).size, 5, 'no row is skipped or repeated');
});

test('keyset pagination handles equal created_at timestamps without skipping rows', async () => {
  const first = await request('GET', '/?limit=2', { token: 'courier-a-token' });
  assert.deepEqual(
    first.data.notifications.map((notification: { id: string }) => notification.id),
    [N_C_4, N_C_3],
  );
  assert.equal(first.data.hasMore, true);

  const second = await request(
    'GET',
    `/?limit=2&cursor=${encodeURIComponent(first.data.nextCursor)}`,
    { token: 'courier-a-token' },
  );
  assert.deepEqual(
    second.data.notifications.map((notification: { id: string }) => notification.id),
    [N_C_1, N_C_2],
  );
  assert.equal(second.data.hasMore, false);

  const all = [
    ...first.data.notifications,
    ...second.data.notifications,
  ].map((notification: { id: string }) => notification.id);
  assert.equal(new Set(all).size, 4);
});

test('validates pagination query parameters', async () => {
  const invalidPaths = [
    '/?limit=0',
    '/?limit=51',
    '/?limit=abc',
    '/?cursor=not-a-cursor',
    '/?cursor=',
    '/?isRead=maybe',
    '/?type=UNKNOWN',
    '/?unknown=1',
  ];

  for (const path of invalidPaths) {
    const result = await request('GET', path, { token: 'customer-a-token' });
    assert.equal(result.status, 400, path);
    assert.equal(result.data.code, 'VALIDATION_ERROR', path);
  }
});

test('filters by read/unread status and notification type', async () => {
  const unread = await request('GET', '/?isRead=false', { token: 'customer-a-token' });
  assert.deepEqual(
    unread.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_1, N_A_3, N_A_4],
  );

  const read = await request('GET', '/?isRead=true', { token: 'customer-a-token' });
  assert.deepEqual(
    read.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_5, N_A_2],
  );

  const delivered = await request('GET', '/?type=PARCEL_DELIVERED', { token: 'customer-a-token' });
  assert.deepEqual(
    delivered.data.notifications.map((notification: { id: string }) => notification.id),
    [N_A_2],
  );

  const unreadDelivered = await request(
    'GET',
    '/?isRead=false&type=PARCEL_DELIVERED',
    { token: 'customer-a-token' },
  );
  assert.equal(unreadDelivered.data.count, 0);
});

test('returns accurate per-user unread counts', async () => {
  const cases: Array<[string, number]> = [
    ['customer-a-token', 3],
    ['courier-a-token', 3],
    ['customer-b-token', 1],
    ['courier-b-token', 1],
  ];

  for (const [token, expected] of cases) {
    const result = await request('GET', '/unread-count', { token });
    assert.equal(result.status, 200, token);
    assert.equal(result.data.unreadCount, expected, token);
  }
});

// -----------------------------------------------------------------------------
// Read state mutations
// -----------------------------------------------------------------------------

test('marks one notification as read and is idempotent', async () => {
  const first = await request('PATCH', `/${N_A_1}/read`, { token: 'customer-a-token' });
  assert.equal(first.status, 200);
  assert.equal(first.data.notification.id, N_A_1);
  assert.equal(first.data.notification.isRead, true);
  assert.ok(first.data.notification.readAt);

  const countAfterFirst = await request('GET', '/unread-count', { token: 'customer-a-token' });
  assert.equal(countAfterFirst.data.unreadCount, 2);

  const second = await request('PATCH', `/${N_A_1}/read`, { token: 'customer-a-token' });
  assert.equal(second.status, 200);
  assert.equal(
    second.data.notification.readAt,
    first.data.notification.readAt,
    'an existing read_at timestamp is preserved',
  );

  const countAfterSecond = await request('GET', '/unread-count', { token: 'customer-a-token' });
  assert.equal(countAfterSecond.data.unreadCount, 2);
});

test('rejects invalid ids and hides nonexistent or foreign notifications', async () => {
  const invalid = await request('PATCH', '/not-a-uuid/read', { token: 'customer-a-token' });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.data.code, 'VALIDATION_ERROR');

  const missing = await request(
    'PATCH',
    '/ffffffff-ffff-4fff-8fff-ffffffffffff/read',
    { token: 'customer-a-token' },
  );
  assert.equal(missing.status, 404);

  const foreign = await request('PATCH', `/${N_A_3}/read`, { token: 'courier-a-token' });
  assert.equal(foreign.status, 404);
});

test('marks all remaining notifications as read and is idempotent', async () => {
  const all = await request('PATCH', '/read-all', { token: 'customer-a-token' });
  assert.equal(all.status, 200);
  assert.equal(all.data.updatedCount, 2);

  const unreadCount = await request('GET', '/unread-count', { token: 'customer-a-token' });
  assert.equal(unreadCount.data.unreadCount, 0);

  const again = await request('PATCH', '/read-all', { token: 'customer-a-token' });
  assert.equal(again.data.updatedCount, 0);

  const unreadFilter = await request('GET', '/?isRead=false', { token: 'customer-a-token' });
  assert.equal(unreadFilter.data.count, 0);

  const courierCount = await request('GET', '/unread-count', { token: 'courier-a-token' });
  assert.equal(courierCount.data.unreadCount, 3, 'another user is untouched');
});

// -----------------------------------------------------------------------------
// Preferences
// -----------------------------------------------------------------------------

test('retrieves persisted preferences and creates defaults for a new user', async () => {
  const customerA = await request('GET', '/preferences', { token: 'customer-a-token' });
  assert.equal(customerA.status, 200);
  assert.deepEqual(
    {
      pushEnabled: customerA.data.preferences.pushEnabled,
      emailEnabled: customerA.data.preferences.emailEnabled,
      smsEnabled: customerA.data.preferences.smsEnabled,
    },
    { pushEnabled: true, emailEnabled: false, smsEnabled: false },
  );
  assert.match(customerA.data.preferences.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const customerB = await request('GET', '/preferences', { token: 'customer-b-token' });
  assert.equal(customerB.status, 200);
  assert.deepEqual(
    {
      pushEnabled: customerB.data.preferences.pushEnabled,
      emailEnabled: customerB.data.preferences.emailEnabled,
      smsEnabled: customerB.data.preferences.smsEnabled,
    },
    { pushEnabled: true, emailEnabled: true, smsEnabled: true },
  );

  const row = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM public.user_notification_preferences
      WHERE user_id = $1`,
    [CUSTOMER_B],
  );
  assert.equal(row.rows[0].count, 1, 'defaults were persisted, not just returned');
});

test('updates preferences partially and persists them per user', async () => {
  const updateA = await request('PUT', '/preferences', {
    token: 'customer-a-token',
    body: { emailEnabled: true },
  });
  assert.equal(updateA.status, 200);
  assert.deepEqual(
    {
      pushEnabled: updateA.data.preferences.pushEnabled,
      emailEnabled: updateA.data.preferences.emailEnabled,
      smsEnabled: updateA.data.preferences.smsEnabled,
    },
    { pushEnabled: true, emailEnabled: true, smsEnabled: false },
  );

  const readA = await request('GET', '/preferences', { token: 'customer-a-token' });
  assert.equal(readA.data.preferences.emailEnabled, true);
  assert.equal(readA.data.preferences.pushEnabled, true);
  assert.equal(readA.data.preferences.smsEnabled, false);

  const updateB = await request('PUT', '/preferences', {
    token: 'customer-b-token',
    body: { pushEnabled: false, smsEnabled: false },
  });
  assert.equal(updateB.status, 200);
  assert.deepEqual(
    {
      pushEnabled: updateB.data.preferences.pushEnabled,
      emailEnabled: updateB.data.preferences.emailEnabled,
      smsEnabled: updateB.data.preferences.smsEnabled,
    },
    { pushEnabled: false, emailEnabled: true, smsEnabled: false },
  );

  const readAAgain = await request('GET', '/preferences', { token: 'customer-a-token' });
  assert.equal(readAAgain.data.preferences.pushEnabled, true, 'another user cannot change A');
  assert.equal(readAAgain.data.preferences.smsEnabled, false);
});

test('creates defaults when a partial update is the first preference write', async () => {
  const result = await request('PUT', '/preferences', {
    token: 'courier-b-token',
    body: { smsEnabled: false },
  });

  assert.equal(result.status, 200);
  assert.deepEqual(
    {
      pushEnabled: result.data.preferences.pushEnabled,
      emailEnabled: result.data.preferences.emailEnabled,
      smsEnabled: result.data.preferences.smsEnabled,
    },
    { pushEnabled: true, emailEnabled: true, smsEnabled: false },
  );
});

test('rejects invalid preference payloads without changing saved values', async () => {
  const invalidBodies = [
    { pushEnabled: 'yes' },
    { emailEnabled: null },
    { userId: CUSTOMER_B, pushEnabled: false },
    {},
    { pushEnabled: false, extra: true },
  ];

  for (const body of invalidBodies) {
    const result = await request('PUT', '/preferences', {
      token: 'customer-a-token',
      body,
    });
    assert.equal(result.status, 400, JSON.stringify(body));
    assert.equal(result.data.code, 'VALIDATION_ERROR', JSON.stringify(body));
  }

  const unchanged = await request('GET', '/preferences', { token: 'customer-a-token' });
  assert.deepEqual(
    {
      pushEnabled: unchanged.data.preferences.pushEnabled,
      emailEnabled: unchanged.data.preferences.emailEnabled,
      smsEnabled: unchanged.data.preferences.smsEnabled,
    },
    { pushEnabled: true, emailEnabled: true, smsEnabled: false },
  );
});

// -----------------------------------------------------------------------------
// Compatibility and response hygiene
// -----------------------------------------------------------------------------

test('keeps the deprecated /inbox alias scoped to the caller', async () => {
  const result = await request('GET', '/inbox', { token: 'customer-b-token' });
  assert.equal(result.status, 200);
  assert.deepEqual(
    result.data.notifications.map((notification: { id: string }) => notification.id),
    [N_B_1],
  );
});

test('marks notification responses as non-cacheable', async () => {
  const result = await request('GET', '/', { token: 'customer-a-token' });
  assert.equal(result.headers.get('cache-control'), 'no-store');
});
