/**
 * Member 07 — typed notification API client.
 *
 * All requests go through the existing authenticated fetchApi wrapper. The
 * backend scopes every query to the access token, so no user id is ever sent.
 */

import { fetchApi } from './api';
import { buildNotificationQuery } from './notification-format';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  parcelId: string | null;
  trackingNumber: string | null;
  deliveryChannels: string[];
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  count: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  updatedAt: string;
}

export interface NotificationPreferencePatch {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export interface NotificationListParams {
  limit?: number;
  cursor?: string | null;
  isRead?: boolean;
}

export function listNotifications(
  params: NotificationListParams = {},
): Promise<NotificationListResponse> {
  return fetchApi<NotificationListResponse>(
    `/notifications${buildNotificationQuery(params)}`,
  );
}

export function getUnreadCount(): Promise<{ unreadCount: number }> {
  return fetchApi<{ unreadCount: number }>('/notifications/unread-count');
}

export function markNotificationRead(
  id: string,
): Promise<{ message: string; notification: NotificationItem }> {
  return fetchApi<{ message: string; notification: NotificationItem }>(
    `/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  );
}

export function markAllNotificationsRead(): Promise<{
  message: string;
  updatedCount: number;
}> {
  return fetchApi<{ message: string; updatedCount: number }>(
    '/notifications/read-all',
    { method: 'PATCH' },
  );
}

export function getNotificationPreferences(): Promise<{
  preferences: NotificationPreferences;
}> {
  return fetchApi<{ preferences: NotificationPreferences }>(
    '/notifications/preferences',
  );
}

export function updateNotificationPreferences(
  patch: NotificationPreferencePatch,
): Promise<{ message: string; preferences: NotificationPreferences }> {
  return fetchApi<{ message: string; preferences: NotificationPreferences }>(
    '/notifications/preferences',
    { method: 'PUT', body: JSON.stringify(patch) },
  );
}
