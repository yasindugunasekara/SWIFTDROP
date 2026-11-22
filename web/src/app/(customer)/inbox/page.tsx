'use client';

import Link from 'next/link';
import {
  type KeyboardEvent,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { dashboardFor, getStoredUser, subscribeAuth } from '../../../lib/auth';
import NotificationInbox from '../../../components/notifications/NotificationInbox';
import NotificationPreferences from '../../../components/notifications/NotificationPreferences';

type TabId = 'inbox' | 'preferences';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'preferences', label: 'Preferences' },
];

export default function NotificationInboxPage() {
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const [activeTab, setActiveTab] = useState<TabId>('inbox');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;

    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TABS.length) % TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = TABS.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  };

  const courier = user?.role === 'COURIER';
  const backHref = user ? dashboardFor(user) : '/login';

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50 font-sans text-slate-800 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="text-2xl font-black tracking-tight text-slate-900"
            >
              swiftdrop<span className="text-[#ff6600]">.</span>
            </Link>
            <span className="hidden rounded-full border border-orange-200/80 bg-orange-50 px-2.5 py-0.5 text-[10px] font-bold text-[#ff6600] sm:inline">
              Notification Centre
            </span>
          </div>

          <Link
            href={backHref}
            className="shrink-0 text-xs font-bold text-[#ff6600] hover:underline"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {courier ? 'Delivery alerts' : 'Parcel notifications'}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
              {courier
                ? 'Assignment and parcel updates, plus your notification channel preferences.'
                : 'Parcel updates and your notification channel preferences.'}
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Notification sections"
            className="inline-flex self-start rounded-full border border-slate-200 bg-white p-1 shadow-sm sm:self-auto"
          >
            {TABS.map((tab, index) => {
              const selected = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  ref={element => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`${tab.id}-tab`}
                  aria-selected={selected}
                  aria-controls={`${tab.id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActiveTab(tab.id)}
                  onKeyDown={event => handleTabKeyDown(event, index)}
                  className={`min-h-[44px] rounded-full px-5 text-xs font-black transition-colors ${
                    selected
                      ? 'bg-[#ff6600] text-white shadow-sm shadow-orange-500/20'
                      : 'text-slate-600 hover:text-[#ff6600]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <section
          role="tabpanel"
          id="inbox-panel"
          aria-labelledby="inbox-tab"
          hidden={activeTab !== 'inbox'}
        >
          <NotificationInbox role={user?.role} />
        </section>

        <section
          role="tabpanel"
          id="preferences-panel"
          aria-labelledby="preferences-tab"
          hidden={activeTab !== 'preferences'}
        >
          <NotificationPreferences />
        </section>
      </main>
    </div>
  );
}
