'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LoadingState from '../../../components/ui/LoadingState';
import StatusBadge from '../../../components/tracking/StatusBadge';
import StatusTimeline from '../../../components/tracking/StatusTimeline';
import TrackingSearch from '../../../components/tracking/TrackingSearch';
import { decodeRouteParam, formatDateTime, normaliseTrackingNumber } from '../../../lib/tracking';
import { POLL_MS, useLiveTracking } from '../../../lib/useLiveTracking';

function TrackingContent() {
  const params = useParams<{ id: string }>();
  const trackingNumber = normaliseTrackingNumber(decodeRouteParam(params?.id));
  const { state, transport, refresh } = useLiveTracking(trackingNumber);
  const [refreshing, setRefreshing] = useState(false);

  const refreshNow = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-12 pt-28 sm:pt-32">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] sm:p-8">
        <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">Track a parcel</h1>
        <p className="mb-6 text-sm text-slate-500">Status updates appear automatically while your parcel is on its way.</p>
        <TrackingSearch key={trackingNumber} initialValue={trackingNumber} />

        <div className="mt-8">
          {state.kind === 'loading' && <LoadingState label={`Looking up ${trackingNumber}...`} />}

          {state.kind === 'error' && (
            <div role="alert" className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
              {state.status === 404 ? (
                <>
                  <p className="text-base font-black text-slate-900">We couldn&apos;t find that parcel</p>
                  <p className="mt-1 text-sm text-slate-500">
                    No parcel matches <span className="font-bold text-slate-700">{trackingNumber}</span>. Check the number on your booking confirmation and try again.
                  </p>
                </>
              ) : state.status === 400 ? (
                <>
                  <p className="text-base font-black text-slate-900">That doesn&apos;t look like a tracking number</p>
                  <p className="mt-1 text-sm text-slate-500">Tracking numbers look like SWIFT-AB12CD34.</p>
                </>
              ) : state.status === 429 ? (
                <p className="text-sm font-bold text-red-700">Too many lookups. Please wait a minute and try again.</p>
              ) : (
                <>
                  <p className="text-sm font-bold text-red-700">{state.message}</p>
                  <button onClick={refreshNow} className="mt-3 cursor-pointer text-sm font-bold text-[#ff6600] hover:underline">Try again</button>
                </>
              )}
            </div>
          )}

          {state.kind === 'ready' && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tracking number</p>
                  <p className="text-lg font-black tracking-tight text-slate-900">{state.data.trackingNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Current status</p>
                  {/* Only the status is announced when it changes, not every refresh. */}
                  <div className="mt-1" aria-live="polite"><StatusBadge status={state.data.status} label={state.data.statusLabel} /></div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-xs">
                <div>
                  <p className="font-bold text-slate-400">Booked</p>
                  <p className="font-bold text-slate-700">{formatDateTime(state.data.bookedAt)}</p>
                </div>
                <div>
                  <p className="font-bold text-slate-400">Last update</p>
                  <p className="font-bold text-slate-700">{formatDateTime(state.data.lastUpdatedAt)}</p>
                </div>
              </div>

              <h2 className="mb-4 mt-6 text-xs font-black uppercase tracking-wider text-slate-400">Status timeline</h2>
              <StatusTimeline events={state.data.events} currentStatus={state.data.status} isFinal={state.data.isFinal} />

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  {state.data.isFinal ? (
                    'This parcel has reached its final status.'
                  ) : transport === 'websocket' ? (
                    <>
                      <span className="relative flex h-2 w-2" aria-hidden="true">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Live · updates appear instantly
                    </>
                  ) : (
                    `Checked ${state.checkedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · refreshes every ${POLL_MS / 1000}s`
                  )}
                </span>
                {!state.data.isFinal && (
                  <button onClick={refreshNow} disabled={refreshing} className="cursor-pointer font-bold text-[#ff6600] hover:underline disabled:opacity-50">
                    {refreshing ? 'Refreshing…' : 'Refresh now'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Sent this parcel? <Link href="/history" className="font-bold text-[#ff6600] hover:underline">See full details and receipts in your history</Link>
        </p>
      </div>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading tracking..." />}>
      <TrackingContent />
    </Suspense>
  );
}
