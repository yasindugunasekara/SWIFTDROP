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
  type ListNotificationsOptions,
  type NormalizedParcelEvent,
  type NotificationCursor,
  type NotificationDto,
  type NotificationListResult,
  type NotificationPreferencePatch,
  type NotificationPreferences,
  type NotificationPreferencesRecord,
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
  | { status: 'courier_not_assigned' }
  | { status: 'no_recipients' };

export interface NotificationService {
  processEvent(event: NormalizedParcelEvent): Promise<ProcessEventResult>;
  listNotifications(userId: string, options: ListNotificationsOptions): Promise<NotificationListResult>;
  getUnreadCount(userId: string): Promise<number>;
  markRead(userId: string, notificationId: string): Promise<NotificationDto | null>;
  markAllRead(userId: string): Promise<number>;
  getPreferences(userId: string): Promise<NotificationPreferencesRecord>;
  updatePreferences(userId: string, patch: NotificationPreferencePatch): Promise<NotificationPreferencesRecord>;
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

interface NotificationRow extends Record<string, unknown> {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date | string;
  read_at: Date | string | null;
  parcel_id: string | null;
  tracking_number: string | null;
  delivery_channels: string[] | null;
}

interface PreferenceRecordRow extends Record<string, unknown> {
  push_enabled: boolean | null;
  email_enabled: boolean | null;
  sms_enabled: boolean | null;
  updated_at: Date | string;
}

interface UnreadCountRow extends Record<string, unknown> {
  unread_count: number;
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
          AND customer.role = 'CUSTOMER'
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

  async function loadPreferences(userId: string): Promise<NotificationPreferences> {
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

  async function listNotifications(
    userId: string,
    options: ListNotificationsOptions,
  ): Promise<NotificationListResult> {
    const values: unknown[] = [userId];
    const conditions: string[] = ['n.user_id = $1'];

    if (options.isRead !== undefined) {
      conditions.push(options.isRead ? 'n.is_read = TRUE' : 'n.is_read = FALSE');
    }
    if (options.type) {
      values.push(options.type);
      conditions.push(`n.type = $${values.length}`);
    }
    if (options.cursor) {
      values.push(options.cursor.createdAt, options.cursor.id);
      conditions.push(
        `(n.created_at, n.id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`,
      );
    }

    // Fetch one extra row to determine hasMore without a second count query.
    values.push(options.limit + 1);
    const limitPlaceholder = `$${values.length}`;

    const { rows } = await database.query<NotificationRow>(
      `SELECT n.id,
              n.type,
              n.title,
              n.message,
              n.is_read,
              n.created_at,
              n.read_at,
              n.parcel_id,
              parcel.tracking_number,
              n.delivery_channels
         FROM public.notifications n
         LEFT JOIN public.parcels parcel ON parcel.id = n.parcel_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT ${limitPlaceholder}`,
      values,
    );

    const hasMore = rows.length > options.limit;
    const page = hasMore ? rows.slice(0, options.limit) : rows;
    const last = page[page.length - 1];

    return {
      notifications: page.map(toNotificationDto),
      hasMore,
      nextCursor: hasMore && last
        ? encodeNotificationCursor({ createdAt: toIsoString(last.created_at), id: last.id })
        : null,
    };
  }

  async function getUnreadCount(userId: string): Promise<number> {
    const { rows } = await database.query<UnreadCountRow>(
      `SELECT count(*)::int AS unread_count
         FROM public.notifications
        WHERE user_id = $1
          AND is_read = FALSE`,
      [userId],
    );
    return rows[0]?.unread_count ?? 0;
  }

  async function markRead(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDto | null> {
    // Scoping by user_id makes another user's notification indistinguishable
    // from a missing one; the route returns 404 for both.
    const { rows } = await database.query<NotificationRow>(
      `WITH updated AS (
         UPDATE public.notifications
            SET is_read = TRUE,
                read_at = COALESCE(read_at, now())
          WHERE id = $1
            AND user_id = $2
          RETURNING id, type, title, message, is_read, created_at, read_at,
                    parcel_id, delivery_channels
       )
       SELECT updated.*, parcel.tracking_number
         FROM updated
         LEFT JOIN public.parcels parcel ON parcel.id = updated.parcel_id`,
      [notificationId, userId],
    );

    return rows[0] ? toNotificationDto(rows[0]) : null;
  }

  async function markAllRead(userId: string): Promise<number> {
    const result = await database.query(
      `UPDATE public.notifications
          SET is_read = TRUE,
              read_at = now()
        WHERE user_id = $1
          AND is_read = FALSE`,
      [userId],
    );
    return result.rowCount ?? 0;
  }

  /**
   * Create-and-return the caller's preference row in one statement.
   *
   * ON CONFLICT DO UPDATE (not DO NOTHING) is deliberate. Under READ COMMITTED,
   * a concurrent first-time request can block on the unique index and then find
   * the winning row invisible to its own statement snapshot. DO NOTHING plus a
   * SELECT can therefore return zero rows. DO UPDATE always takes the conflict
   * path, and RETURNING always yields the inserted or updated row, so both
   * concurrent requests receive a record.
   */
  async function readPreferencesRecord(userId: string): Promise<NotificationPreferencesRecord> {
    const { rows } = await database.query<PreferenceRecordRow>(
      `INSERT INTO public.user_notification_preferences
         (user_id, push_enabled, email_enabled, sms_enabled, updated_at)
       VALUES
         ($1, TRUE, TRUE, TRUE, now())
       ON CONFLICT (user_id) DO UPDATE SET
         updated_at = COALESCE(public.user_notification_preferences.updated_at, now())
       RETURNING push_enabled, email_enabled, sms_enabled,
                 COALESCE(updated_at, now()) AS updated_at`,
      [userId],
    );

    const row = rows[0];
    if (!row) throw new Error('Unable to load notification preferences');
    return toPreferencesRecord(row);
  }

  async function savePreferences(
    userId: string,
    patch: NotificationPreferencePatch,
  ): Promise<NotificationPreferencesRecord> {
    const { rows } = await database.query<PreferenceRecordRow>(
      `INSERT INTO public.user_notification_preferences
         (user_id, push_enabled, email_enabled, sms_enabled, updated_at)
       VALUES
         ($1, COALESCE($2, TRUE), COALESCE($3, TRUE), COALESCE($4, TRUE), now())
       ON CONFLICT (user_id) DO UPDATE SET
         push_enabled  = COALESCE($2, user_notification_preferences.push_enabled),
         email_enabled = COALESCE($3, user_notification_preferences.email_enabled),
         sms_enabled   = COALESCE($4, user_notification_preferences.sms_enabled),
         updated_at    = now()
       RETURNING push_enabled, email_enabled, sms_enabled, updated_at`,
      [
        userId,
        patch.pushEnabled ?? null,
        patch.emailEnabled ?? null,
        patch.smsEnabled ?? null,
      ],
    );

    const row = rows[0];
    if (!row) throw new Error('Unable to update notification preferences');
    return toPreferencesRecord(row);
  }

  return {
    async processEvent(event) {
      const context = await resolveContext(event);
      if (!context) return { status: 'parcel_not_found' };

      // Recipients come exclusively from trusted database rows. A payload
      // courierId is never used to route a notification.
      const courierId = context.courierId;
      const allowedRoles = new Set(recipientsFor(event.eventType));

      if (
        event.eventType === 'COURIER_ASSIGNED' &&
        allowedRoles.has('COURIER') &&
        !courierId
      ) {
        // Member 05 may publish before its assignment row is committed.
        // The consumer retries briefly instead of trusting the payload.
        return { status: 'courier_not_assigned' };
      }

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
        const preferences = await loadPreferences(recipient.userId);
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
    listNotifications,
    getUnreadCount,
    markRead,
    markAllRead,
    getPreferences: readPreferencesRecord,
    updatePreferences: savePreferences,
  };
}

function toNotificationDto(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read === true,
    createdAt: toIsoString(row.created_at),
    readAt: toIsoStringOrNull(row.read_at),
    parcelId: row.parcel_id,
    trackingNumber: row.tracking_number,
    deliveryChannels: normalizeDeliveryChannels(row.delivery_channels),
  };
}

function toPreferencesRecord(row: PreferenceRecordRow): NotificationPreferencesRecord {
  return {
    pushEnabled: row.push_enabled !== false,
    emailEnabled: row.email_enabled !== false,
    smsEnabled: row.sms_enabled !== false,
    updatedAt: toIsoString(row.updated_at),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toIsoStringOrNull(value: Date | string | null): string | null {
  return value === null ? null : toIsoString(value);
}

function normalizeDeliveryChannels(value: string[] | null): DeliveryChannel[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (channel): channel is DeliveryChannel =>
      channel === 'PUSH' || channel === 'EMAIL' || channel === 'SMS',
  );
}

/** Encode the (created_at, id) keyset cursor as an opaque URL-safe string. */
export function encodeNotificationCursor(cursor: NotificationCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, 'utf8').toString('base64url');
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Return null for any malformed or tampered cursor; the route maps this to 400. */
export function decodeNotificationCursor(value: string): NotificationCursor | null {
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const separator = decoded.indexOf('|');
    if (separator <= 0 || separator === decoded.length - 1) return null;

    const createdAt = decoded.slice(0, separator);
    const id = decoded.slice(separator + 1);
    if (!UUID_PATTERN.test(id)) return null;

    const parsed = new Date(createdAt);
    if (Number.isNaN(parsed.getTime())) return null;

    return { createdAt: parsed.toISOString(), id };
  } catch {
    return null;
  }
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
