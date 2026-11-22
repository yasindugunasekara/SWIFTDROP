/**
 * Member 07 — RabbitMQ parcel-event contract.
 *
 * The existing publisher (Member 04's courier service) sends:
 *
 *   {
 *     event: "PARCEL_STATUS_UPDATED",
 *     parcelId, trackingNumber, courierId, courierName,
 *     recipientName, recipientPhone, status, note, timestamp
 *   }
 *
 * That shape is accepted unchanged. The parser also accepts the agreed target
 * fields `eventId` and `eventType`, and the explicit event names listed below,
 * so Members 02/04/05 can converge on the richer contract without a breaking
 * migration.
 *
 * Idempotency rule:
 *   - Use `eventId` when the publisher supplies it (contract: globally unique).
 *   - Otherwise derive a deterministic SHA-256 fallback from a canonical
 *     representation of the normalised event. Never use a random UUID.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import type {
  NormalizedParcelEvent,
  NotificationContent,
  NotificationType,
  RecipientRole,
} from './notification.types.js';

/**
 * Payload schema.
 *
 * `.passthrough()` tolerates extra fields other modules may add. `customerId`
 * is accepted but not authoritative; the service resolves the real customer
 * from the parcel row.
 */
export const parcelEventSchema = z
  .object({
    eventId: z.string().trim().min(1).max(100).optional(),
    event: z.string().trim().min(1).max(64).optional(),
    eventType: z.string().trim().min(1).max(64).optional(),
    parcelId: z.string().uuid(),
    customerId: z.string().uuid().optional(),
    courierId: z.string().uuid().optional(),
    trackingNumber: z.string().trim().max(30).optional(),
    courierName: z.string().trim().max(150).optional(),
    status: z.string().trim().max(30).optional(),
    note: z.string().max(1000).optional(),
    timestamp: z.string().datetime({ offset: true }).optional(),
  })
  .passthrough()
  .refine(value => Boolean(value.event || value.eventType), {
    message: 'event or eventType is required',
    path: ['event'],
  });

export type ParcelEventPayload = z.infer<typeof parcelEventSchema>;

/** Explicit event names published by the team. */
const EVENT_NAME_MAP: Readonly<Record<string, NotificationType>> = {
  PARCEL_BOOKED: 'PARCEL_BOOKED',
  COURIER_ASSIGNED: 'COURIER_ASSIGNED',
  PARCEL_PICKED_UP: 'PARCEL_PICKED_UP',
  PARCEL_IN_TRANSIT: 'PARCEL_IN_TRANSIT',
  PARCEL_OUT_FOR_DELIVERY: 'PARCEL_OUT_FOR_DELIVERY',
  PARCEL_DELIVERED: 'PARCEL_DELIVERED',
  PARCEL_DELIVERY_FAILED: 'PARCEL_DELIVERY_FAILED',
  // Member 04's current failure event name.
  PARCEL_FAILED: 'PARCEL_DELIVERY_FAILED',
};

/** Member 04's generic wrapper event, mapped through its `status` field. */
const STATUS_MAP: Readonly<Record<string, NotificationType>> = {
  CONFIRMED: 'PARCEL_BOOKED',
  ASSIGNED: 'COURIER_ASSIGNED',
  PICKED_UP: 'PARCEL_PICKED_UP',
  IN_TRANSIT: 'PARCEL_IN_TRANSIT',
  OUT_FOR_DELIVERY: 'PARCEL_OUT_FOR_DELIVERY',
  DELIVERED: 'PARCEL_DELIVERED',
  FAILED: 'PARCEL_DELIVERY_FAILED',
};

export function parseParcelEvent(input: unknown) {
  return parcelEventSchema.safeParse(input);
}

/**
 * Validate first, then normalise. Returns `null` when the payload is valid JSON
 * and schema-valid but describes an event this consumer does not handle.
 */
export function normalizeParcelEvent(input: ParcelEventPayload): NormalizedParcelEvent | null {
  const status = input.status?.trim().toUpperCase();
  const candidates = [input.event, input.eventType]
    .filter((value): value is string => Boolean(value))
    .map(value => value.trim().toUpperCase());

  let eventType: NotificationType | undefined;
  for (const name of candidates) {
    eventType = EVENT_NAME_MAP[name];
    if (eventType) break;
    if (name === 'PARCEL_STATUS_UPDATED' && status) {
      eventType = STATUS_MAP[status];
      if (eventType) break;
    }
  }

  if (!eventType) return null;

  const eventId =
    input.eventId?.trim() ||
    fallbackEventId({
      eventType,
      parcelId: input.parcelId,
      status,
      courierId: input.courierId,
      timestamp: input.timestamp,
      note: input.note,
    });

  return {
    eventId,
    eventType,
    parcelId: input.parcelId,
    ...(input.customerId ? { customerId: input.customerId } : {}),
    ...(input.courierId ? { courierId: input.courierId } : {}),
    ...(status ? { status } : {}),
    ...(input.trackingNumber ? { trackingNumber: input.trackingNumber } : {}),
    ...(input.note ? { note: input.note } : {}),
    ...(input.timestamp ? { timestamp: input.timestamp } : {}),
  };
}

/**
 * Deterministic idempotency key for publishers that do not yet send `eventId`.
 *
 * A redelivery is byte-identical and therefore hashes identically. A genuinely
 * new event (different type, status, timestamp or note) hashes differently.
 * `trackingNumber` and `courierName` are display-derived and intentionally
 * excluded so cosmetic corrections do not create a second notification.
 */
export function fallbackEventId(input: {
  eventType: NotificationType;
  parcelId: string;
  status?: string;
  courierId?: string;
  timestamp?: string;
  note?: string;
}): string {
  const canonical = JSON.stringify([
    input.eventType,
    input.parcelId,
    input.status ?? null,
    input.courierId ?? null,
    input.timestamp ?? null,
    input.note ?? null,
  ]);
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

/**
 * Which recipients should receive this event.
 *
 * Couriers receive new assignments and recorded delivery failures; customers
 * receive every parcel milestone. In-app rows are always created; preferences
 * only affect external channel intent.
 */
export function recipientsFor(eventType: NotificationType): RecipientRole[] {
  if (eventType === 'COURIER_ASSIGNED' || eventType === 'PARCEL_DELIVERY_FAILED') {
    return ['CUSTOMER', 'COURIER'];
  }
  return ['CUSTOMER'];
}

const CUSTOMER_CONTENT: Readonly<Record<NotificationType, (reference: string) => NotificationContent>> = {
  PARCEL_BOOKED: reference => ({
    title: 'Parcel booked',
    message: `Your parcel ${reference} has been successfully booked.`,
  }),
  COURIER_ASSIGNED: reference => ({
    title: 'Courier assigned',
    message: `A courier has been assigned to your parcel ${reference}.`,
  }),
  PARCEL_PICKED_UP: reference => ({
    title: 'Parcel picked up',
    message: `Your parcel ${reference} has been picked up.`,
  }),
  PARCEL_IN_TRANSIT: reference => ({
    title: 'Parcel in transit',
    message: `Your parcel ${reference} is currently in transit.`,
  }),
  PARCEL_OUT_FOR_DELIVERY: reference => ({
    title: 'Out for delivery',
    message: `Your parcel ${reference} is out for delivery.`,
  }),
  PARCEL_DELIVERED: reference => ({
    title: 'Parcel delivered',
    message: `Your parcel ${reference} has been successfully delivered.`,
  }),
  PARCEL_DELIVERY_FAILED: reference => ({
    title: 'Delivery attempt failed',
    message: `Your delivery attempt for ${reference} has failed.`,
  }),
};

/**
 * Render the notification content for one recipient. Keeping this pure makes
 * both the wording and the recipient policy easy to unit test.
 */
export function renderNotification(
  eventType: NotificationType,
  role: RecipientRole,
  context: { parcelId: string; trackingNumber?: string },
): NotificationContent {
  const reference = context.trackingNumber?.trim() || context.parcelId.slice(0, 8).toUpperCase();

  if (role === 'COURIER') {
    if (eventType === 'COURIER_ASSIGNED') {
      return {
        title: 'New delivery assignment',
        message: `You have been assigned parcel ${reference} for pickup and delivery.`,
      };
    }
    if (eventType === 'PARCEL_DELIVERY_FAILED') {
      return {
        title: 'Delivery failure recorded',
        message: `The failed delivery for ${reference} has been recorded. Await dispatcher instructions.`,
      };
    }
    return {
      title: 'Delivery update',
      message: `Delivery update for parcel ${reference}.`,
    };
  }

  return CUSTOMER_CONTENT[eventType](reference);
}
