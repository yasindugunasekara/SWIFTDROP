'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LoadingState from '../../../components/ui/LoadingState';
import CustomerHeader from '../../../components/tracking/CustomerHeader';
import StatusBadge from '../../../components/tracking/StatusBadge';
import {
  STATUS_FILTERS,
  downloadReceiptFile,
  fetchHistory,
  formatDateTime,
  formatMoney,
  type HistoryPage,
  type ParcelStatus,
} from '../../../lib/tracking';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const [status, setStatus] = useState<ParcelStatus | ''>('');
  const [offset, setOffset] = useState(0);
  const [reloads, setReloads] = useState(0);
  // The latest response, tagged with the query it answers. While a new query is
  // in flight the previous page stays visible (dimmed) instead of flashing.
  const [result, setResult] = useState<{ key: string; page?: HistoryPage; error?: string } | null>(null);
  const [lastPage, setLastPage] = useState<HistoryPage | null>(null);
  const [downloading, setDownloading] = useState('');
  const [downloadError, setDownloadError] = useState('');

  const key = `${status}|${offset}|${reloads}`;
  useEffect(() => {
    let active = true;
    fetchHistory({ status, limit: PAGE_SIZE, offset })
      .then((data) => { if (active) { setResult({ key, page: data }); setLastPage(data); } })
      .catch((failure) => {
        if (active) setResult({ key, error: failure instanceof Error ? failure.message : 'Unable to load your delivery history.' });
      });
    return () => { active = false; };
  }, [key, status, offset]);

  const loading = result?.key !== key;
  const error = !loading ? result?.error ?? '' : '';
  const page = !loading && result?.page ? result.page : lastPage;
  const retry = () => setReloads((n) => n + 1);

  const chooseStatus = (value: ParcelStatus | '') => { setStatus(value); setOffset(0); };

  const download = async (trackingNumber: string) => {
    setDownloading(trackingNumber);
    setDownloadError('');
    try {
      await downloadReceiptFile(trackingNumber);
    } catch (failure) {
      setDownloadError(failure instanceof Error ? failure.message : 'Receipt download failed.');
    } finally {
      setDownloading('');
    }
  };

  const total = page?.total ?? 0;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + PAGE_SIZE, total);

  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans text-slate-800 antialiased">
      <CustomerHeader badge="Order History" />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Order History &amp; Receipts</h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">Your parcels, their delivery timelines, and downloadable receipts.</p>
        </div>

        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value || 'all'}
              onClick={() => chooseStatus(filter.value)}
              aria-pressed={status === filter.value}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                status === filter.value
                  ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                  : 'border border-slate-200 text-slate-500 hover:border-orange-200 hover:text-slate-900'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {downloadError && <p role="alert" className="mb-4 text-sm font-bold text-red-700">{downloadError}</p>}

        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
          {loading && !page ? (
            <LoadingState label="Loading your parcels..." />
          ) : error ? (
            <div role="alert" className="p-10 text-center">
              <p className="text-sm font-bold text-red-700">{error}</p>
              <button onClick={retry} className="mt-3 cursor-pointer text-sm font-bold text-[#ff6600] hover:underline">Try again</button>
            </div>
          ) : total === 0 ? (
            <div className="p-10 text-center">
              <p className="text-base font-black text-slate-900">{status ? 'No parcels with this status' : 'No parcels yet'}</p>
              <p className="mt-1 text-sm text-slate-500">
                {status ? 'Try a different filter.' : <>Book your first delivery from the <Link href="/booking" className="font-bold text-[#ff6600] hover:underline">dashboard</Link>.</>}
              </p>
            </div>
          ) : (
            <div className={`overflow-x-auto ${loading ? 'opacity-60' : ''}`}>
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3.5">Tracking #</th>
                    <th className="px-6 py-3.5">Recipient &amp; destination</th>
                    <th className="px-6 py-3.5">Booked</th>
                    <th className="px-6 py-3.5">Fee</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {page?.parcels.map((parcel) => (
                    <tr key={parcel.trackingNumber} className="transition-colors hover:bg-orange-50/20">
                      <td className="px-6 py-4 font-black text-slate-900">
                        <Link href={`/history/${parcel.trackingNumber}`} className="transition-colors hover:text-[#ff6600]">
                          {parcel.trackingNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block font-bold text-slate-900">{parcel.recipientName}</span>
                        <span className="block text-[11px] text-slate-400">{parcel.deliveryAddress}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-500">{formatDateTime(parcel.bookedAt)}</td>
                      <td className="px-6 py-4 font-black text-slate-900">{formatMoney(parcel.totalFee, parcel.currency)}</td>
                      <td className="px-6 py-4"><StatusBadge status={parcel.status} label={parcel.statusLabel} /></td>
                      <td className="px-6 py-4 text-right">
                        {parcel.status === 'PENDING_PAYMENT' ? (
                          <span className="text-[11px] text-slate-400">After payment</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/history/${parcel.trackingNumber}/receipt`}
                              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-orange-200 hover:text-[#ff6600]"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => download(parcel.trackingNumber)}
                              disabled={downloading === parcel.trackingNumber}
                              className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-orange-200 hover:text-[#ff6600] disabled:opacity-50"
                            >
                              {downloading === parcel.trackingNumber ? 'Downloading…' : 'Download'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {from}–{to} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 font-bold disabled:cursor-default disabled:opacity-40"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + PAGE_SIZE)}
                disabled={to >= total || loading}
                className="cursor-pointer rounded-xl border border-slate-200 px-3 py-1.5 font-bold disabled:cursor-default disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
