'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function WebhookCenterPage() {
  const [url, setUrl] = useState('https://merchant-api.example.com/webhooks/swiftdrop');
  const [attempts] = useState([
    { id: 'wh_1', event: 'PARCEL_DELIVERED', parcel: 'SWIFT-782910', status: 200, retries: 0, date: '12 mins ago' },
    { id: 'wh_2', event: 'PARCEL_FAILED', parcel: 'SWIFT-991122', status: 500, retries: 3, date: '1 hour ago', deadLetter: true },
  ]);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Webhook Center
          </span>
        </div>
        <Link
          href="/portal"
          className="text-xs font-bold text-[#ff6600] hover:underline"
        >
          &larr; Back to Merchant Portal
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Webhook Delivery Audit &amp; Dead-Letter Queue (DLQ)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure automated HTTP callbacks with HMAC SHA-256 payload signing and automatic retry policies.
          </p>
        </div>

        {/* Configuration Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] mb-8">
          <h3 className="text-base font-black text-slate-900 tracking-tight mb-3">
            Active Webhook Endpoint
          </h3>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
            />
            <button
              onClick={() => alert('Webhook callback URL updated successfully!')}
              className="px-6 py-3 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              Update URL
            </button>
          </div>

          <div className="mt-4 p-3.5 bg-orange-50/60 border border-orange-100 rounded-xl text-xs text-slate-600 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800">Signing Secret: </span>
              <code className="text-[#ff6600] font-mono font-bold">whsec_791823901a89b7842efc</code>
              <span className="block text-[11px] text-slate-400 mt-0.5">Used in X-SwiftDrop-Signature header for SHA-256 verification.</span>
            </div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Webhook Delivery Attempts &amp; Retry Logs
            </h3>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Event</th>
                <th className="py-3.5 px-6">Parcel ID</th>
                <th className="py-3.5 px-6">HTTP Status</th>
                <th className="py-3.5 px-6">Retries</th>
                <th className="py-3.5 px-6 text-right">Queue State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempts.map((a) => (
                <tr key={a.id} className="hover:bg-orange-50/20 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{a.event}</td>
                  <td className="py-4 px-6 font-mono text-slate-600">{a.parcel}</td>
                  <td className="py-4 px-6">
                    <span className={`font-bold ${a.status === 200 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {a.status} {a.status === 200 ? 'OK' : 'Error'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500">{a.retries} attempts</td>
                  <td className="py-4 px-6 text-right">
                    {a.deadLetter ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200">
                        Dead Letter (DLQ)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">
                        ✓ Delivered
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
