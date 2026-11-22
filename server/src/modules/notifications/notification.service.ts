/**
 * Member 07 — notification persistence and event processing.
 *
 * The service is intentionally built on a tiny `Queryable` interface instead of
 * the concrete `pg.Pool`. Production passes the shared pool; tests pass an
 * in-memory PGlite adapter. Every write is a single SQL statement, so the
 * idempotent insert is atomic without an explicit transaction.
 */

import { db } from '../../config/database.js';
import { recipientsFor, renderNotification } from './notification.events.js';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type DeliveryChannel,
  type NormalizedParcelEvent,
  type NotificationPreferences,
  type NotificationType,
  type RecipientRole,
} from './notification.types.js';

/** Minimal database contract shared by `pg.Pool` and the PGlite test adapter. */
export interface Queryable {
  query<R extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>;
}

export type ProcessEventResult =
  | { status: 'processed'; inserted: number; skipped: number; recipients: number }
  | { status: 'parcel_not_found' }
  | { status: 'no_recipients' };

export interface NotificationService {
  processEvent(event: NormalizedParcelEvent): Promise<ProcessEventResult>;
}

interface ParcelContextRow extends Record<string, unknown> {
  parcel_id: string;
  tracking_number: string | null;
  customer_id: string | null;
  assigned_courier_id: string | null;
}

interface PreferenceRow extends Record<string, unknown> {
  push_enabled: boolean | null;
  email_enabled: boolean | null;
  sms_enabled: boolean | null;
}

interface InsertedNotificationRow extends Record<string, unknown> {
  id: string;
}

interface ActiveUserRow extends Record<string, unknown> {
  id: string;
}

interface Recipient {
  userId: string;
  role: RecipientRole;
}

interface NotificationInsertRow {
  userId: string;
  parcelId: string;
  eventId: string;
  eventType: NotificationType;
  title: string;
  message: string;
  channels: DeliveryChannel[];
}

interface ParcelContext {
  customerId: string | null;
  courierId: string | null;
  trackingNumber: string | null;
}

export function createNotificationService(database: Queryable): NotificationService {
  async function resolveContext(event: NormalizedParcelEvent): Promise<ParcelContext | null> {
    // The database is authoritative for recipients: never trust customerId or
    // courierId supplied by a message publisher or an HTTP client.
    const { rows } = await database.query<ParcelContextRow>(
      `SELECT p.id            AS parcel_id,
              p.tracking_number,
              customer.id     AS customer_id,
              assignment.courier_id AS assigned_courier_id
         FROM public.parcels p
         LEFT JOIN public.users customer
           ON customer.id = p.customer_id
          AND customer.is_active = TRUE
         LEFT JOIN LATERAL (
           SELECT a.courier_id
             FROM public.courier_assignments a
             JOIN public.users courier
               ON courier.id = a.courier_id
              AND courier.is_active = TRUE
              AND courier.role = 'COURIER'
            WHERE a.parcel_id = p.id
              AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
            LIMIT 1
         ) AS assignment ON TRUE
        WHERE p.id = $1
        LIMIT 1`,
      [event.parcelId],
    );

    const row = rows[0];
    if (!row) return null;

    return {
      customerId: row.customer_id,
      courierId: row.assigned_courier_id,
      trackingNumber: row.tracking_number,
    };
  }

  /**
   * COURIER_ASSIGNED may arrive before the assignment row is committed. In that
   * single case the payload courierId is accepted, but only after proving that
   * the user exists, is active, and really is a courier.
   */
  async function verifiedPayloadCourierId(courierId: string): Promise<string | null> {
    const { rows } = await database.query<ActiveUserRow>(
      `SELECT id
         FROM public.users
        WHERE id = $1
          AND role = 'COURIER'
          AND is_active = TRUE
        LIMIT 1`,
      [courierId],
    );
    return rows[0]?.id ?? null;
  }

  async function getPreferences(userId: string): Promise<NotificationPreferences> {
    const { rows } = await database.query<PreferenceRow>(
      `SELECT push_enabled, email_enabled, sms_enabled
         FROM public.user_notification_preferences
        WHERE user_id = $1
        LIMIT 1`,
      [userId],
    );

    const row = rows[0];
    if (!row) return DEFAULT_NOTIFICATION_PREFERENCES;

    return {
      pushEnabled: row.push_enabled !== false,
      emailEnabled: row.email_enabled !== false,
      smsEnabled: row.sms_enabled !== false,
    };
  }

  /**
   * One multi-row INSERT gives atomic fan-out and uses the
   * UNIQUE (user_id, event_id) index as the idempotency guard.
   */
  async function insertNotifications(rows: NotificationInsertRow[]): Promise<number> {
    const values: unknown[] = [];
    const tuples = rows.map((row, index) => {
      const offset = index * 7;
      values.push(
        row.userId,
        row.parcelId,
        row.eventId,
        row.eventType,
        row.title,
        row.message,
        row.channels,
      );
      return `($${offset + 1}::uuid, $${offset + 2}::uuid, $${offset + 3}::varchar, ` +
        `$${offset + 4}::varchar, $${offset + 5}::varchar, $${offset + 6}::text, ` +
        `$${offset + 7}::text[])`;
    });

    const { rows: inserted } = await database.query<InsertedNotificationRow>(
      `INSERT INTO public.notifications
         (user_id, parcel_id, event_id, type, title, message, delivery_channels)
       VALUES ${tuples.join(', ')}
       ON CONFLICT (user_id, event_id) DO NOTHING
       RETURNING id`,
      values,
    );

    return inserted.length;
  }

  return {
    async processEvent(event) {
      const context = await resolveContext(event);
      if (!context) return { status: 'parcel_not_found' };

      let courierId = context.courierId;
      if (!courierId && event.eventType === 'COURIER_ASSIGNED' && event.courierId) {
        courierId = await verifiedPayloadCourierId(event.courierId);
      }

      const allowedRoles = new Set(recipientsFor(event.eventType));
      const recipients = new Map<string, Recipient>();

      if (context.customerId && allowedRoles.has('CUSTOMER')) {
        recipients.set(context.customerId, { userId: context.customerId, role: 'CUSTOMER' });
      }
      if (courierId && allowedRoles.has('COURIER')) {
        recipients.set(courierId, { userId: courierId, role: 'COURIER' });
      }

      if (recipients.size === 0) return { status: 'no_recipients' };

      const rows: NotificationInsertRow[] = [];
      for (const recipient of recipients.values()) {
        const preferences = await getPreferences(recipient.userId);
        const trackingNumber = context.trackingNumber ?? event.trackingNumber;
        const content = renderNotification(event.eventType, recipient.role, {
          parcelId: event.parcelId,
          ...(trackingNumber ? { trackingNumber } : {}),
        });

        rows.push({
          userId: recipient.userId,
          parcelId: event.parcelId,
          eventId: event.eventId,
          eventType: event.eventType,
          title: content.title,
          message: content.message,
          channels: enabledChannels(preferences),
        });
      }

      const inserted = await insertNotifications(rows);
      return {
        status: 'processed',
        inserted,
        skipped: rows.length - inserted,
        recipients: rows.length,
      };
    },
  };
}

/** Preferences describe external channel intent, never proof of delivery. */
export function enabledChannels(preferences: NotificationPreferences): DeliveryChannel[] {
  const channels: DeliveryChannel[] = [];
  if (preferences.pushEnabled) channels.push('PUSH');
  if (preferences.emailEnabled) channels.push('EMAIL');
  if (preferences.smsEnabled) channels.push('SMS');
  return channels;
}

const pgQueryable: Queryable = {
  async query<R extends Record<string, unknown>>(text: string, values?: unknown[]) {
    const result = await db.query(text, values);
    return { rows: result.rows as R[], rowCount: result.rowCount };
  },
};

/** Production instance backed by the shared PostgreSQL pool. */
export const notificationService = createNotificationService(pgQueryable);
