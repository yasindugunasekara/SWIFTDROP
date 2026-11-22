import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fallbackEventId,
  normalizeParcelEvent,
  parseParcelEvent,
  recipientsFor,
  renderNotification,
} from './notification.events.js';

const PARCEL_ID = '66666666-6666-4666-8666-666666666666';
const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const COURIER_ID = '22222222-2222-4222-8222-222222222222';
const TIMESTAMP = '2026-11-22T10:15:00.000Z';

/** The exact shape Member 04 publishes today (no eventId, no eventType). */
const publishedPayload = {
  event: 'PARCEL_STATUS_UPDATED',
  parcelId: PARCEL_ID,
  trackingNumber: 'SWIFT-991122',
  courierId: COURIER_ID,
  courierName: 'Sunil Silva',
  recipientName: 'Robert Smith',
  recipientPhone: '+94779876543',
  status: 'OUT_FOR_DELIVERY',
  note: '',
  timestamp: TIMESTAMP,
};

function normalized(payload: Record<string, unknown>) {
  const parsed = parseParcelEvent(payload);
  assert.equal(parsed.success, true, 'payload should be schema-valid');
  if (!parsed.success) throw new Error('unreachable');
  const event = normalizeParcelEvent(parsed.data);
  assert.ok(event, 'payload should map to a supported notification event');
  return event!;
}

test('accepts Member 04\'s current payload without eventId', () => {
  const parsed = parseParcelEvent(publishedPayload);
  assert.equal(parsed.success, true);

  const event = normalized(publishedPayload);
  assert.equal(event.eventType, 'PARCEL_OUT_FOR_DELIVERY');
  assert.equal(event.parcelId, PARCEL_ID);
  assert.equal(event.status, 'OUT_FOR_DELIVERY');
  assert.match(event.eventId, /^sha256:[0-9a-f]{64}$/);
  assert.equal(event.eventId.length, 71);
});

test('derives the same event id from a redelivered payload', () => {
  const first = normalized(publishedPayload);
  const second = normalized(structuredClone(publishedPayload));
  assert.equal(first.eventId, second.eventId);
});

test('derives a different event id for a genuinely different event', () => {
  const first = normalized(publishedPayload);
  const second = normalized({ ...publishedPayload, timestamp: '2026-11-22T10:16:00.000Z' });
  const third = normalized({ ...publishedPayload, status: 'DELIVERED' });

  assert.notEqual(first.eventId, second.eventId);
  assert.notEqual(first.eventId, third.eventId);
});

test('preserves an explicit eventId verbatim', () => {
  const event = normalized({ ...publishedPayload, eventId: 'evt-1001' });
  assert.equal(event.eventId, 'evt-1001');
});

test('accepts eventType as an alias of event', () => {
  const event = normalized({
    eventType: 'PARCEL_BOOKED',
    parcelId: PARCEL_ID,
    customerId: CUSTOMER_ID,
    timestamp: TIMESTAMP,
  });
  assert.equal(event.eventType, 'PARCEL_BOOKED');
  assert.equal(event.customerId, CUSTOMER_ID);
});

test('maps PARCEL_STATUS_UPDATED through the status field', () => {
  const cases = {
    CONFIRMED: 'PARCEL_BOOKED',
    ASSIGNED: 'COURIER_ASSIGNED',
    PICKED_UP: 'PARCEL_PICKED_UP',
    IN_TRANSIT: 'PARCEL_IN_TRANSIT',
    OUT_FOR_DELIVERY: 'PARCEL_OUT_FOR_DELIVERY',
    DELIVERED: 'PARCEL_DELIVERED',
    FAILED: 'PARCEL_DELIVERY_FAILED',
  } as const;

  for (const [status, expected] of Object.entries(cases)) {
    const event = normalized({ ...publishedPayload, status });
    assert.equal(event.eventType, expected, `status ${status}`);
  }
});

test('maps both failure event names to PARCEL_DELIVERY_FAILED', () => {
  assert.equal(
    normalized({ ...publishedPayload, event: 'PARCEL_FAILED', status: undefined }).eventType,
    'PARCEL_DELIVERY_FAILED',
  );
  assert.equal(
    normalized({ ...publishedPayload, event: 'PARCEL_DELIVERY_FAILED', status: undefined }).eventType,
    'PARCEL_DELIVERY_FAILED',
  );
});

test('rejects schema-invalid payloads', () => {
  assert.equal(parseParcelEvent({ event: 'PARCEL_DELIVERED' }).success, false, 'missing parcelId');
  assert.equal(
    parseParcelEvent({ event: 'PARCEL_DELIVERED', parcelId: 'not-a-uuid' }).success,
    false,
    'invalid parcelId',
  );
  assert.equal(
    parseParcelEvent({ parcelId: PARCEL_ID }).success,
    false,
    'missing event and eventType',
  );
  assert.equal(
    parseParcelEvent({ event: 'PARCEL_DELIVERED', parcelId: PARCEL_ID, timestamp: 'yesterday' }).success,
    false,
    'invalid timestamp',
  );
});

test('returns null for a schema-valid but unsupported event', () => {
  const parsed = parseParcelEvent({ event: 'SOMETHING_ELSE', parcelId: PARCEL_ID });
  assert.equal(parsed.success, true);
  if (!parsed.success) throw new Error('unreachable');
  assert.equal(normalizeParcelEvent(parsed.data), null);

  const unknownStatus = parseParcelEvent({
    event: 'PARCEL_STATUS_UPDATED',
    parcelId: PARCEL_ID,
    status: 'PENDING_PAYMENT',
  });
  assert.equal(unknownStatus.success, true);
  if (!unknownStatus.success) throw new Error('unreachable');
  assert.equal(normalizeParcelEvent(unknownStatus.data), null);
});

test('fallbackEventId is canonical and independent of JSON key order', () => {
  const base = {
    eventType: 'PARCEL_DELIVERED' as const,
    parcelId: PARCEL_ID,
    status: 'DELIVERED',
    courierId: COURIER_ID,
    timestamp: TIMESTAMP,
    note: '',
  };
  assert.equal(fallbackEventId(base), fallbackEventId({ ...base }));
  assert.notEqual(fallbackEventId(base), fallbackEventId({ ...base, note: 'Left with guard' }));
});

test('recipient policy notifies the courier for assignments and failures only', () => {
  assert.deepEqual(recipientsFor('COURIER_ASSIGNED'), ['CUSTOMER', 'COURIER']);
  assert.deepEqual(recipientsFor('PARCEL_DELIVERY_FAILED'), ['CUSTOMER', 'COURIER']);
  assert.deepEqual(recipientsFor('PARCEL_BOOKED'), ['CUSTOMER']);
  assert.deepEqual(recipientsFor('PARCEL_OUT_FOR_DELIVERY'), ['CUSTOMER']);
});

test('renders role-appropriate content with the tracking number', () => {
  const customer = renderNotification('PARCEL_OUT_FOR_DELIVERY', 'CUSTOMER', {
    parcelId: PARCEL_ID,
    trackingNumber: 'SWIFT-991122',
  });
  assert.equal(customer.title, 'Out for delivery');
  assert.match(customer.message, /SWIFT-991122/);

  const courier = renderNotification('COURIER_ASSIGNED', 'COURIER', {
    parcelId: PARCEL_ID,
    trackingNumber: 'SWIFT-991122',
  });
  assert.equal(courier.title, 'New delivery assignment');
  assert.match(courier.message, /SWIFT-991122/);
});

test('falls back to a parcel reference when no tracking number is supplied', () => {
  const content = renderNotification('PARCEL_DELIVERED', 'CUSTOMER', { parcelId: PARCEL_ID });
  assert.match(content.message, new RegExp(PARCEL_ID.slice(0, 8).toUpperCase()));
});
