'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import LoadingState from '../../../../../components/ui/LoadingState';
import CustomerHeader from '../../../../../components/tracking/CustomerHeader';
import {
  downloadReceiptFile,
  fetchReceipt,
  formatDateTime,
  formatMoney,
  decodeRouteParam,
  normaliseTrackingNumber,
  type Receipt,
} from '../../../../../lib/tracking';

function Box({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 px-4 py-3 print:break-inside-avoid">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 text-sm font-bold text-slate-800">{children}</div>
    </div>
  );
}

function ReceiptContent() {
  const params = useParams<{ trackingNumber: string }>();
  const trackingNumber = normaliseTrackingNumber(decodeRouteParam(params?.trackingNumber));
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let active = true;
    fetchReceipt(trackingNumber)
      .then((data) => { if (active) setReceipt(data); })
      .catch((failure) => { if (active) setError(failure instanceof Error ? failure.message : 'Unable to load this receipt.'); });
    return () => { active = false; };
  }, [trackingNumber]);

  const download = async () => {
    setDownloading(true);
    setDownloadError('');
    try { await downloadReceiptFile(trackingNumber); }
    catch (failure) { setDownloadError(failure instanceof Error ? failure.message : 'Receipt download failed.'); }
    finally { setDownloading(false); }
  };

  if (error) {
    return (
      <div role="alert" className="rounded-3xl border border-slate-100 bg-white p-10 text-center">
        <p className="text-base font-black text-slate-900">Receipt unavailable</p>
        <p className="mt-1 text-sm text-slate-500">{error}</p>
        <Link href="/history" className="mt-4 inline-block text-sm font-bold text-[#ff6600] hover:underline">Back to your history</Link>
      </div>
    );
  }
  if (!receipt) return <LoadingState label="Preparing your receipt..." />;

  const dims = receipt.parcel.dimensionsCm;
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-end gap-2 print:hidden">
        <button onClick={() => window.print()} className="cursor-pointer rounded-xl bg-[#ff9900] px-4 py-2 text-xs font-black text-white shadow-md shadow-orange-500/20 transition-all hover:bg-[#ff8800]">
          Print / Save as PDF
        </button>
        <button onClick={download} disabled={downloading} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-orange-200 hover:text-[#ff6600] disabled:opacity-50">
          {downloading ? 'Downloading…' : 'Download file'}
        </button>
      </div>
      {downloadError && <p role="alert" className="mb-4 text-right text-xs font-bold text-red-700 print:hidden">{downloadError}</p>}

      <article className="rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] print:border-0 print:p-0 print:shadow-none sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-black tracking-tight text-slate-900">swiftdrop<span className="text-[#ff6600]">.</span></p>
            <p className="text-xs text-slate-500">Delivery receipt</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Receipt no.</p>
            <p className="text-base font-black text-slate-900">{receipt.receiptNumber}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Box label="Tracking no.">{receipt.trackingNumber}</Box>
          <Box label="Status">{receipt.statusLabel}</Box>
          <Box label="Booked">{formatDateTime(receipt.bookedAt)}</Box>
          <Box label="Delivered">{formatDateTime(receipt.deliveredAt)}</Box>
          <Box label="From">
            {receipt.sender.name}
            <p className="text-xs font-medium text-slate-500">{receipt.sender.address}</p>
          </Box>
          <Box label="To">
            {receipt.recipient.name}
            <p className="text-xs font-medium text-slate-500">{receipt.recipient.address}</p>
          </Box>
          <Box label="Weight">{receipt.parcel.weightKg ?? '—'} kg</Box>
          <Box label="Dimensions">{dims.length && dims.width && dims.height ? `${dims.length} × ${dims.width} × ${dims.height} cm` : '—'}</Box>
        </div>

        <table className="mt-8 w-full text-sm">
          <tbody>
            {receipt.lineItems.map((item) => (
              <tr key={item.description} className="border-b border-slate-200">
                <td className="py-3 text-slate-700">{item.description}</td>
                <td className="py-3 text-right font-bold text-slate-800">{formatMoney(item.amount, receipt.currency)}</td>
              </tr>
            ))}
            <tr>
              <td className="pt-4 text-base font-black text-slate-900">Total</td>
              <td className="pt-4 text-right text-base font-black text-slate-900">{formatMoney(receipt.total, receipt.currency)}</td>
            </tr>
          </tbody>
        </table>

        <p className="mt-8 text-[11px] text-slate-400">Issued {formatDateTime(receipt.issuedAt)}</p>
      </article>
    </>
  );
}

export default function ReceiptPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-white font-sans text-slate-800 antialiased">
      <CustomerHeader badge="Receipt" backHref="/history" backLabel="Back to History" />
      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 print:max-w-none print:p-0 sm:px-10">
        <Suspense fallback={<LoadingState label="Loading receipt..." />}>
          <ReceiptContent />
        </Suspense>
      </div>
    </div>
  );
}
