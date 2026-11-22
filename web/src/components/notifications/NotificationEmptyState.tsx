import {
  notificationEmptyCopy,
  type NotificationFilter,
} from '../../lib/notification-format';

interface NotificationEmptyStateProps {
  role: string | null | undefined;
  filter: NotificationFilter;
  onRefresh: () => void;
  refreshing?: boolean;
}

export default function NotificationEmptyState({
  role,
  filter,
  onRefresh,
  refreshing = false,
}: NotificationEmptyStateProps) {
  const copy = notificationEmptyCopy(role, filter);

  return (
    <div
      role="status"
      className="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center"
    >
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-[#ff6600]">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-6 w-6"
        >
          <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 0 0-4-5.7V5a2 2 0 1 0-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1.1-.6 1.4L4 17h5" />
          <path d="M9 17v1a3 3 0 0 0 6 0v-1" />
        </svg>
      </span>
      <h3 className="mt-4 text-base font-black text-slate-900">{copy.title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm">
        {copy.description}
      </p>
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="mt-5 min-h-[44px] rounded-xl bg-[#ff6600] px-5 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
