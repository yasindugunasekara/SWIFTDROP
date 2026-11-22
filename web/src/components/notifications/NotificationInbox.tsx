'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '../../lib/notifications';
import {
  filterToIsRead,
  mergeNotificationPages,
  type NotificationFilter,
} from '../../lib/notification-format';
import NotificationCard from './NotificationCard';
import NotificationEmptyState from './NotificationEmptyState';
import NotificationSkeleton from './NotificationSkeleton';

const PAGE_SIZE = 20;

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'read', label: 'Read' },
];

type LoadStatus = 'loading' | 'ready' | 'error';

interface NotificationInboxProps {
  role: string | null | undefined;
}

export default function NotificationInbox({ role }: NotificationInboxProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [error, setError] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingReadIds, setPendingReadIds] = useState<Set<string>>(new Set());
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const requestId = useRef(0);

  const fetchFirstPage = useCallback(
    (nextFilter: NotificationFilter) =>
      Promise.all([
        listNotifications({
          limit: PAGE_SIZE,
          isRead: filterToIsRead(nextFilter),
        }),
        getUnreadCount().catch(() => null),
      ]),
    [],
  );

  const loadFirstPage = useCallback(
    async (nextFilter: NotificationFilter, mode: 'load' | 'refresh') => {
      const request = ++requestId.current;

      try {
        const [page, count] = await fetchFirstPage(nextFilter);

        if (request !== requestId.current) return;

        setItems(page.notifications);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        if (count) setUnreadCount(count.unreadCount);
        setStatus('ready');
        setError('');
      } catch (failure) {
        if (request !== requestId.current) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to load notifications. Please try again.',
        );
        setStatus(mode === 'refresh' ? 'ready' : 'error');
      } finally {
        if (request === requestId.current) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [fetchFirstPage],
  );

  const resetForLoad = () => {
    setStatus('loading');
    setItems([]);
    setNextCursor(null);
    setHasMore(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
    setError('');
  };

  useEffect(() => {
    let active = true;
    const request = ++requestId.current;

    fetchFirstPage('all')
      .then(([page, count]) => {
        if (!active || request !== requestId.current) return;

        setItems(page.notifications);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
        if (count) setUnreadCount(count.unreadCount);
        setStatus('ready');
        setError('');
      })
      .catch((failure: unknown) => {
        if (!active || request !== requestId.current) return;
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to load notifications. Please try again.',
        );
        setStatus('error');
      })
      .finally(() => {
        if (active && request === requestId.current) {
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      });

    return () => {
      active = false;
    };
  }, [fetchFirstPage]);

  const handleFilterChange = (nextFilter: NotificationFilter) => {
    if (nextFilter === filter) return;
    setFilter(nextFilter);
    setAnnouncement('');
    resetForLoad();
    void loadFirstPage(nextFilter, 'load');
  };

  const handleRefresh = () => {
    if (isRefreshing || isMarkingAll || isLoadingMore) return;

    if (status === 'ready') {
      setIsRefreshing(true);
      setError('');
      void loadFirstPage(filter, 'refresh');
      return;
    }

    resetForLoad();
    void loadFirstPage(filter, 'load');
  };

  const handleRetry = () => {
    resetForLoad();
    void loadFirstPage(filter, 'load');
  };

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore || isMarkingAll || isRefreshing) return;

    const request = requestId.current;
    setIsLoadingMore(true);
    setError('');

    try {
      const page = await listNotifications({
        limit: PAGE_SIZE,
        cursor: nextCursor,
        isRead: filterToIsRead(filter),
      });

      if (request !== requestId.current) return;

      setItems(previous => mergeNotificationPages(previous, page.notifications));
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (failure) {
      if (request !== requestId.current) return;
      setError(
        failure instanceof Error
          ? failure.message
          : 'Unable to load more notifications. Please try again.',
      );
    } finally {
      if (request === requestId.current) setIsLoadingMore(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (isMarkingAll || isRefreshing || pendingReadIds.has(id)) return;

    const request = requestId.current;
    setPendingReadIds(previous => new Set(previous).add(id));
    setError('');

    try {
      const result = await markNotificationRead(id);
      if (request !== requestId.current) return;

      setItems(previous =>
        filter === 'unread'
          ? previous.filter(item => item.id !== id)
          : previous.map(item => (item.id === id ? result.notification : item)),
      );
      setUnreadCount(previous => Math.max(0, previous - 1));
      setAnnouncement(`"${result.notification.title}" marked as read.`);

      void getUnreadCount()
        .then(count => {
          if (request === requestId.current) setUnreadCount(count.unreadCount);
        })
        .catch(() => undefined);
    } catch (failure) {
      if (request === requestId.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to mark the notification as read. Please try again.',
        );
      }
    } finally {
      setPendingReadIds(previous => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      });
    }
  };

  const handleMarkAll = async () => {
    if (unreadCount === 0 || isMarkingAll || isLoadingMore || isRefreshing) return;

    const request = requestId.current;
    setIsMarkingAll(true);
    setError('');

    try {
      const result = await markAllNotificationsRead();
      setUnreadCount(0);
      setAnnouncement(
        result.updatedCount === 0
          ? 'No notifications needed marking as read.'
          : `${result.updatedCount} ${
              result.updatedCount === 1 ? 'notification' : 'notifications'
            } marked as read.`,
      );

      if (request !== requestId.current) return;

      setItems(previous =>
        previous.map(item => ({
          ...item,
          isRead: true,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );

      if (filter === 'unread') {
        await loadFirstPage('unread', 'refresh');
      }
    } catch (failure) {
      if (request === requestId.current) {
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to mark all notifications as read. Please try again.',
        );
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const showErrorBanner = Boolean(error) && status === 'ready';
  const unreadLabel = unreadCount > 0 ? `${unreadCount} unread` : 'All caught up';

  return (
    <div className="space-y-4">
      <p className="sr-only" role="status" aria-live="polite">
        {announcement}
      </p>

      <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black tracking-tight text-slate-900">Inbox</h2>
            <p className="text-xs text-slate-400" aria-live="polite">
              {unreadLabel}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing || status === 'loading' || isMarkingAll || isLoadingMore}
              className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-600 transition-colors hover:border-orange-200 hover:text-[#ff6600] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={() => void handleMarkAll()}
              disabled={
                unreadCount === 0 ||
                isMarkingAll ||
                isRefreshing ||
                status !== 'ready' ||
                isLoadingMore
              }
              className="min-h-[44px] rounded-xl bg-[#ff6600] px-4 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMarkingAll ? 'Marking...' : 'Mark all read'}
            </button>
          </div>
        </div>

        <div
          className="mt-4 flex flex-wrap gap-2"
          role="group"
          aria-label="Filter notifications"
        >
          {FILTERS.map(option => {
            const selected = filter === option.id;
            const label =
              option.id === 'unread' && unreadCount > 0
                ? `Unread (${unreadCount})`
                : option.label;

            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                disabled={isMarkingAll}
                onClick={() => handleFilterChange(option.id)}
                className={`min-h-[44px] rounded-full px-4 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? 'bg-[#ff6600] text-white shadow-sm shadow-orange-500/20'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-orange-300 hover:text-[#ff6600]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {showErrorBanner && (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={handleRetry}
            className="min-h-[44px] shrink-0 rounded-lg border border-red-300 bg-white px-3 font-black text-red-700 transition-colors hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {status === 'loading' && (
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading notifications...</span>
          <NotificationSkeleton />
        </div>
      )}

      {status === 'error' && (
        <div
          role="alert"
          className="rounded-3xl border border-red-200 bg-red-50 px-6 py-10 text-center"
        >
          <h3 className="text-base font-black text-red-900">
            We couldn&apos;t load your notifications
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-red-700 sm:text-sm">
            {error || 'Something went wrong. Please try again.'}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-5 min-h-[44px] rounded-xl bg-red-600 px-5 text-xs font-black text-white transition-colors hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && items.length === 0 && (
        <NotificationEmptyState
          role={role}
          filter={filter}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
        />
      )}

      {status === 'ready' && items.length > 0 && (
        <>
          <ul className="space-y-3" aria-busy={isLoadingMore}>
            {items.map(notification => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={id => void handleMarkRead(id)}
                pending={pendingReadIds.has(notification.id)}
                disabled={isMarkingAll || isRefreshing}
              />
            ))}
          </ul>

          {hasMore && nextCursor ? (
            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={isLoadingMore || isMarkingAll || isRefreshing}
                className="min-h-[44px] rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-600 transition-colors hover:border-orange-300 hover:text-[#ff6600] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading more...' : 'Load more'}
              </button>
            </div>
          ) : (
            <p className="pt-1 text-center text-[11px] text-slate-400">
              End of notifications.
            </p>
          )}
        </>
      )}
    </div>
  );
}
