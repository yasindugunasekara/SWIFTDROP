/**
 * Member 07 — Notification Preferences & Delivery Inbox: domain types.
 *
 * This module deliberately contains no Express, SQL or RabbitMQ imports so it
 * can be shared by the worker, the future REST API and the tests.
 */

export const NOTIFICATION_TYPES = [
  'PARCEL_BOOKED',
  'COURIER_ASSIGNED',
  'PARCEL_PICKED_UP',
  'PARCEL_IN_TRANSIT',
  'PARCEL_OUT_FOR_DELIVERY',
  'PARCEL_DELIVERED',
  'PARCEL_DELIVERY_FAILED',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** External delivery channels. In-app inbox rows are always created. */
export const DELIVERY_CHANNELS = ['PUSH', 'EMAIL', 'SMS'] as const;
export type DeliveryChannel = (typeof DELIVERY_CHANNELS)[number];

export type RecipientRole = 'CUSTOMER' | 'COURIER';

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

/** Mirrors the column defaults in user_notification_preferences. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: true,
};

/**
 * A parcel event after validation and normalisation.
 *
 * `customerId` is accepted from the payload for auditing but is NOT trusted for
 * recipient resolution: the service always resolves recipients from the
 * database (`parcels.customer_id` and the active `courier_assignments` row).
 */
export interface NormalizedParcelEvent {
  eventId: string;
  eventType: NotificationType;
  parcelId: string;
  customerId?: string;
  courierId?: string;
  status?: string;
  trackingNumber?: string;
  note?: string;
  timestamp?: string;
}

export interface NotificationContent {
  title: string;
  message: string;
}

// -----------------------------------------------------------------------------
// REST API shapes (Phase 03)
// -----------------------------------------------------------------------------

/** Safe notification representation returned by the inbox API. */
export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  parcelId: string | null;
  trackingNumber: string | null;
  deliveryChannels: DeliveryChannel[];
}

/** Opaque keyset-pagination cursor: (created_at, id) of the last row in a page. */
export interface NotificationCursor {
  createdAt: string;
  id: string;
}

export interface ListNotificationsOptions {
  limit: number;
  cursor?: NotificationCursor;
  isRead?: boolean;
  type?: NotificationType;
}

export interface NotificationListResult {
  notifications: NotificationDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationPreferencePatch {
  pushEnabled?: boolean;
  emailEnabled?: boolean;
  smsEnabled?: boolean;
}

export interface NotificationPreferencesRecord extends NotificationPreferences {
  updatedAt: string;
}
