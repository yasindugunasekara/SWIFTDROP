import type { NotificationItem } from '../../lib/notifications';
import {
  formatAbsoluteDate,
  formatRelativeTime,
  notificationTypeMeta,
  type NotificationIcon,
  type NotificationTone,
} from '../../lib/notification-format';

const TONE_CLASSES: Record<NotificationTone, string> = {
  orange: 'border-orange-200/80 bg-orange-50 text-[#ff6600]',
  blue: 'border-blue-200/80 bg-blue-50 text-blue-600',
  emerald: 'border-emerald-200/80 bg-emerald-50 text-emerald-600',
  red: 'border-red-200/80 bg-red-50 text-red-600',
  slate: 'border-slate-200/80 bg-slate-100 text-slate-600',
};

const ICON_PATHS: Record<NotificationIcon, string[]> = {
  booking: [
    'M20 7 12 3 4 7v10l8 4 8-4V7Z',
    'm4 7 8 4 8-4M12 11v10',
    'm9 14 2 2 4-4',
  ],
  courier: [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  pickup: ['M20 7 12 3 4 7v10l8 4 8-4V7Z', 'm4 7 8 4 8-4M12 11v10'],
  transit: [
    'M3 17h2l2-6h10l2 6h2',
    'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
    'M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
    'M7 11V7h10v4',
  ],
  'out-for-delivery': [
    'M3 17h2l2-6h10l2 6h2',
    'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
    'M15 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z',
    'M7 11V7h10v4',
    'm12 2 0 2M12 2 10 4M12 2l2 2',
  ],
  delivered: ['M20 6 9 17l-5-5'],
  failed: [
    'M12 9v4',
    'M12 17h.01',
    'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  ],
  bell: [
    'M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1.1-.6 1.4L4 17h5',
    'M9 17v1a3 3 0 0 0 6 0v-1',
  ],
};

function TypeGlyph({ icon }: { icon: NotificationIcon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-5 w-5"
    >
      {ICON_PATHS[icon].map(path => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}

interface NotificationCardProps {
  notification: NotificationItem;
  onMarkRead: (id: string) => void;
  pending?: boolean;
  disabled?: boolean;
}

export default function NotificationCard({
  notification,
  onMarkRead,
  pending = false,
  disabled = false,
}: NotificationCardProps) {
  const meta = notificationTypeMeta(notification.type);
  const absoluteTime = formatAbsoluteDate(notification.createdAt);
  const relativeTime = formatRelativeTime(notification.createdAt);
  const channels = notification.deliveryChannels.filter(Boolean);

  return (
    <li
      className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
        notification.isRead
          ? 'border-slate-100 bg-white'
          : 'border-orange-200/80 bg-orange-50/40 shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <span
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${TONE_CLASSES[meta.tone]}`}
          aria-hidden="true"
        >
          <TypeGlyph icon={meta.icon} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider ${
                notification.isRead ? 'text-slate-400' : 'text-[#ff6600]'
              }`}
            >
              {meta.label}
            </span>
            {!notification.isRead && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-orange-700">
                Unread
              </span>
            )}
            <time
              dateTime={notification.createdAt}
              title={absoluteTime || undefined}
              className="ml-auto text-[11px] font-medium text-slate-400"
            >
              {relativeTime}
            </time>
          </div>

          <h3
            className={`mt-1.5 text-sm sm:text-base ${
              notification.isRead ? 'font-bold text-slate-700' : 'font-black text-slate-900'
            }`}
          >
            <span className="sr-only">{notification.isRead ? 'Read: ' : 'Unread: '}</span>
            {notification.title}
          </h3>

          <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
            {notification.message}
          </p>

          {(notification.trackingNumber || channels.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
              {notification.trackingNumber && (
                <span>
                  Parcel{' '}
                  <span className="font-mono font-bold text-slate-500">
                    {notification.trackingNumber}
                  </span>
                </span>
              )}
              {channels.length > 0 && (
                <span>Recorded channels: {channels.join(', ')}</span>
              )}
            </div>
          )}

          {!notification.isRead && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onMarkRead(notification.id)}
                disabled={pending || disabled}
                aria-label={`Mark "${notification.title}" as read`}
                className="min-h-[44px] rounded-xl border border-orange-200 bg-white px-4 text-xs font-black text-[#ff6600] transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? 'Marking...' : 'Mark read'}
              </button>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
