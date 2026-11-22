import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real helpers with the same transpile-and-run pattern as the
// existing auth tests. The module has no imports or browser APIs.
const source = ts.transpileModule(
  readFileSync(new URL('../src/lib/notification-format.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
).outputText;

const loadedModule = { exports: {} };
vm.runInNewContext(source, {
  module: loadedModule,
  exports: loadedModule.exports,
  Intl,
  Date,
  URLSearchParams,
  Set,
  String,
  Number,
  Math,
  Array,
});
const helpers = loadedModule.exports;

test('buildNotificationQuery omits unset values and encodes the cursor', () => {
  assert.equal(helpers.buildNotificationQuery({}), '');
  assert.equal(helpers.buildNotificationQuery({ limit: 20 }), '?limit=20');
  assert.equal(
    helpers.buildNotificationQuery({ limit: 20, isRead: false }),
    '?limit=20&isRead=false',
  );
  assert.equal(
    helpers.buildNotificationQuery({ limit: 50, isRead: true, cursor: 'abc+123/def' }),
    '?limit=50&isRead=true&cursor=abc%2B123%2Fdef',
  );
});

test('filterToIsRead maps the UI filters to the API value', () => {
  assert.equal(helpers.filterToIsRead('all'), undefined);
  assert.equal(helpers.filterToIsRead('unread'), false);
  assert.equal(helpers.filterToIsRead('read'), true);
});

test('formatRelativeTime renders stable relative labels', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');
  assert.equal(helpers.formatRelativeTime('2026-11-22T11:59:50.000Z', now), 'Just now');
  assert.equal(helpers.formatRelativeTime('2026-11-22T11:55:00.000Z', now), '5 minutes ago');
  assert.equal(helpers.formatRelativeTime('2026-11-22T10:00:00.000Z', now), '2 hours ago');
  assert.equal(helpers.formatRelativeTime('2026-11-21T12:00:00.000Z', now), 'yesterday');
  assert.equal(helpers.formatRelativeTime('2026-11-19T12:00:00.000Z', now), '3 days ago');
  assert.equal(helpers.formatRelativeTime('not-a-date', now), '');
});

test('formatAbsoluteDate returns a readable date and tolerates bad input', () => {
  const formatted = helpers.formatAbsoluteDate('2026-11-22T12:00:00.000Z');
  assert.match(formatted, /Nov/);
  assert.match(formatted, /2026/);
  assert.equal(helpers.formatAbsoluteDate('not-a-date'), '');
});

test('notificationTypeMeta covers every backend type and a safe fallback', () => {
  const types = [
    'PARCEL_BOOKED',
    'COURIER_ASSIGNED',
    'PARCEL_PICKED_UP',
    'PARCEL_IN_TRANSIT',
    'PARCEL_OUT_FOR_DELIVERY',
    'PARCEL_DELIVERED',
    'PARCEL_DELIVERY_FAILED',
  ];
  const labels = new Set();
  for (const type of types) {
    const meta = helpers.notificationTypeMeta(type);
    assert.ok(meta.label);
    assert.ok(meta.tone);
    assert.ok(meta.icon);
    labels.add(meta.label);
  }
  assert.equal(labels.size, types.length);
  const fallback = helpers.notificationTypeMeta('UNKNOWN_TYPE');
  assert.equal(fallback.label, 'Update');
  assert.equal(fallback.tone, 'slate');
  assert.equal(fallback.icon, 'bell');
});

test('mergeNotificationPages appends without duplicating ids', () => {
  const existing = [{ id: 'a' }, { id: 'b' }];
  const incoming = [{ id: 'b' }, { id: 'c' }, { id: 'a' }, { id: 'd' }];
  const merged = helpers.mergeNotificationPages(existing, incoming);
  assert.deepEqual(Array.from(merged, item => item.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(existing.map(item => item.id), ['a', 'b']);
  assert.deepEqual(incoming.map(item => item.id), ['b', 'c', 'a', 'd']);
});

test('notificationEmptyCopy varies by role and filter', () => {
  const customerUnread = helpers.notificationEmptyCopy('CUSTOMER', 'unread');
  assert.equal(customerUnread.title, "You're all caught up");
  assert.match(customerUnread.description, /parcel updates/i);

  const courierAll = helpers.notificationEmptyCopy('COURIER', 'all');
  assert.equal(courierAll.title, 'No notifications yet');
  assert.match(courierAll.description, /assignments/i);

  const read = helpers.notificationEmptyCopy('COURIER', 'read');
  assert.equal(read.title, 'No read notifications');
});
