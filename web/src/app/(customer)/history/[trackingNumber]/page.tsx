'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LoadingState from '../../../../components/ui/LoadingState';
import CustomerHeader from '../../../../components/tracking/CustomerHeader';
import StatusBadge from '../../../../components/tracking/StatusBadge';
import StatusTimeline from '../../../../components/tracking/StatusTimeline';
import {
  downloadReceiptFile,
  fetchParcel,
  formatDateTime,
  formatMoney,
  decodeRouteParam,
  normaliseTrackingNumber,
  type ParcelDetail,
} from '../../../../lib/tracking';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-bold text-slate-800">{children}</div>
    </div>
  );
}

function ParcelDetailContent() {
  const params = useParams<{ trackingNumber: string }>();
  const trackingNumber = normaliseTrackingNumber(decodeRouteParam(params?.trackingNumber));
  const [result, setResult] = useState<{ trackingNumber: string; parcel?: ParcelDetail; error?: string } | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let active = true;
    fetchParcel(trackingNumber)
      .then((data) => { if (active) setResult({ trackingNumber, parcel: data }); })
      .catch((failure) => {
        if (active) setResult({ trackingNumber, error: failure instanceof Error ? failure.message : 'Unable to load this parcel.' });
      });
    return () => { active = false; };
  }, [trackingNumber]);

  const current = result?.trackingNumber === trackingNumber ? result : null;
  const parcel = current?.parcel ?? null;
  const error = current?.error ?? '';

  const download = async () => {
    setDownloading(true);
    setDownloadError('');
    try { await downloadReceiptFile(trackingNumber); }
    catch (failure) { setDownloadError(failure instanceof Error ? failure.message : 'Receipt download failed.'); }
    finally { setDownloading(false); }
  };

  if (error) {
    return (
      <div role="alert" className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <p className="text-base font-black text-slate-900">Parcel unavailable</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Link href="/history" className="mt-4 inline-block text-sm font-bold text-[#ff6600] hover:underline">Back to your history</Link>
      </div>
    );
  }
  if (!parcel) return <LoadingState label={`Loading ${trackingNumber}...`} />;

  const dims = parcel.dimensionsCm;
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tracking number</p>
            <h1 className="text-xl font-black tracking-tight text-slate-900">{parcel.trackingNumber}</h1>
          </div>
          <StatusBadge status={parcel.status} label={parcel.statusLabel} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-5 border-t border-slate-100 pt-5">
          <Field label="From">
            {parcel.sender.name}
            <p className="text-xs font-medium text-slate-500">{parcel.sender.address}</p>
            <p className="text-xs font-medium text-slate-400">{parcel.sender.phone}</p>
          </Field>
          <Field label="To">
            {parcel.recipient.name}
            <p className="text-xs font-medium text-slate-500">{parcel.recipient.address}</p>
            <p className="text-xs font-medium text-slate-400">{parcel.recipient.phone}</p>
          </Field>
          <Field label="Weight">{parcel.weightKg ?? '—'} kg</Field>
          <Field label="Dimensions">{dims.length && dims.width && dims.height ? `${dims.length} × ${dims.width} × ${dims.height} cm` : '—'}</Field>
          <Field label="Booked">{formatDateTime(parcel.bookedAt)}</Field>
          <Field label="Fee">{formatMoney(parcel.totalFee, parcel.currency)}</Field>
        </div>
        {parcel.specialNotes && (
          <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-600"><span className="font-bold">Instructions:</span> {parcel.specialNotes}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
          {parcel.status === 'PENDING_PAYMENT' ? (
            <p className="text-xs text-slate-500">Your receipt will be available once payment is confirmed.</p>
          ) : (
            <>
              <Link href={`/history/${parcel.trackingNumber}/receipt`} className="rounded-xl bg-[#ff9900] px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#ff8800]">
                View receipt
              </Link>
              <button onClick={download} disabled={downloading} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-orange-200 hover:text-[#ff6600] disabled:opacity-50">
                {downloading ? 'Downloading…' : 'Download receipt'}
              </button>
            </>
          )}
          <Link href={`/tracking/${parcel.trackingNumber}`} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-orange-200 hover:text-[#ff6600]">
            Public tracking page
          </Link>
        </div>
        {downloadError && <p role="alert" className="mt-3 text-xs font-bold text-red-700">{downloadError}</p>}
      </section>

      <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
        <h2 className="mb-5 text-xs font-black uppercase tracking-wider text-slate-400">Status timeline</h2>
        <StatusTimeline events={parcel.events} currentStatus={parcel.status} isFinal={parcel.isFinal} showNotes />
      </section>
    </div>
  );
}

export default function ParcelDetailPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans text-slate-800 antialiased">
      <CustomerHeader badge="Parcel Details" backHref="/history" backLabel="Back to History" />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 sm:px-10">
        <Suspense fallback={<LoadingState label="Loading parcel..." />}>
          <ParcelDetailContent />
        </Suspense>
      </div>
    </div>
  );
}
