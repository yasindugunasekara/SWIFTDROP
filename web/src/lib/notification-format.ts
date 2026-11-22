/**
 * Member 07 — pure helpers for the notification inbox.
 *
 * This module has no React, browser or API imports so it can be unit tested
 * with the project's existing TypeScript-transpile test harness.
 */

export type NotificationFilter = 'all' | 'unread' | 'read';

export interface NotificationQueryParams {
  limit?: number;
  cursor?: string | null;
  isRead?: boolean;
}

export interface NotificationEmptyCopy {
  title: string;
  description: string;
}

export type NotificationTone = 'orange' | 'blue' | 'emerald' | 'red' | 'slate';

export type NotificationIcon =
  | 'booking'
  | 'courier'
  | 'pickup'
  | 'transit'
  | 'out-for-delivery'
  | 'delivered'
  | 'failed'
  | 'bell';

export interface NotificationTypeMeta {
  label: string;
  tone: NotificationTone;
  icon: NotificationIcon;
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const ABSOLUTE_TIME = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const TYPE_META: Record<string, NotificationTypeMeta> = {
  PARCEL_BOOKED: { label: 'Booking confirmed', tone: 'orange', icon: 'booking' },
  COURIER_ASSIGNED: { label: 'Courier assigned', tone: 'blue', icon: 'courier' },
  PARCEL_PICKED_UP: { label: 'Picked up', tone: 'blue', icon: 'pickup' },
  PARCEL_IN_TRANSIT: { label: 'In transit', tone: 'orange', icon: 'transit' },
  PARCEL_OUT_FOR_DELIVERY: {
    label: 'Out for delivery',
    tone: 'orange',
    icon: 'out-for-delivery',
  },
  PARCEL_DELIVERED: { label: 'Delivered', tone: 'emerald', icon: 'delivered' },
  PARCEL_DELIVERY_FAILED: { label: 'Delivery failed', tone: 'red', icon: 'failed' },
};

const FALLBACK_TYPE_META: NotificationTypeMeta = {
  label: 'Update',
  tone: 'slate',
  icon: 'bell',
};

/** Maps the UI filter to the API's optional isRead query value. */
export function filterToIsRead(filter: NotificationFilter): boolean | undefined {
  if (filter === 'all') return undefined;
  return filter === 'read';
}

/** Builds the query string for GET /notifications, omitting unset values. */
export function buildNotificationQuery({
  limit,
  cursor,
  isRead,
}: NotificationQueryParams): string {
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (isRead !== undefined) params.set('isRead', String(isRead));
  if (cursor) params.set('cursor', cursor);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Human-readable age of a notification, e.g. "5 minutes ago". */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(diffSeconds);

  if (magnitude < 45) return 'Just now';
  if (magnitude < 3600) return RELATIVE_TIME.format(Math.round(diffSeconds / 60), 'minute');
  if (magnitude < 86400) return RELATIVE_TIME.format(Math.round(diffSeconds / 3600), 'hour');
  if (magnitude < 604800) return RELATIVE_TIME.format(Math.round(diffSeconds / 86400), 'day');
  if (magnitude < 2592000) return RELATIVE_TIME.format(Math.round(diffSeconds / 604800), 'week');
  if (magnitude < 31536000) return RELATIVE_TIME.format(Math.round(diffSeconds / 2592000), 'month');
  return RELATIVE_TIME.format(Math.round(diffSeconds / 31536000), 'year');
}

/** Full date/time used in the tooltip of a relative timestamp. */
export function formatAbsoluteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return ABSOLUTE_TIME.format(date);
}

/** Display label and visual tone for a backend notification type. */
export function notificationTypeMeta(type: string): NotificationTypeMeta {
  return TYPE_META[type] ?? FALLBACK_TYPE_META;
}

/** Appends a page while preserving order and removing duplicate ids. */
export function mergeNotificationPages<T extends { id: string }>(
  existing: T[],
  incoming: T[],
): T[] {
  const seen = new Set(existing.map(item => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

/** Role- and filter-aware empty state wording. */
export function notificationEmptyCopy(
  role: string | null | undefined,
  filter: NotificationFilter,
): NotificationEmptyCopy {
  const courier = role === 'COURIER';

  if (filter === 'unread') {
    return {
      title: "You're all caught up",
      description: courier
        ? 'No unread assignment or parcel updates right now.'
        : 'No unread parcel updates right now.',
    };
  }

  if (filter === 'read') {
    return {
      title: 'No read notifications',
      description: 'Notifications you have opened will appear here.',
    };
  }

  return {
    title: 'No notifications yet',
    description: courier
      ? 'New delivery assignments and parcel updates will appear here.'
      : 'Parcel updates will appear here as your deliveries progress.',
  };
}
