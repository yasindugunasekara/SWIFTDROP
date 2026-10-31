'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function NotificationInboxPage() {
  const [notifications] = useState([
    {
      id: '1',
      title: 'Parcel Out for Delivery',
      message: 'Your parcel SWIFT-991122 is out for delivery with courier Sunil Silva. Estimated arrival in 8 mins.',
      time: '10 mins ago',
      read: false,
    },
    {
      id: '2',
      title: 'Booking Confirmed & Waybill Issued',
      message: 'Booking for parcel SWIFT-782910 has been processed successfully. Priority sorting assigned.',
      time: '2 hours ago',
      read: true,
    },
    {
      id: '3',
      title: 'Special 20% Discount Voucher Added',
      message: 'Coupon code SWIFT20 has been credited to your active wallet for intra-city courier runs.',
      time: '1 day ago',
      read: true,
    },
  ]);

  const [preferences, setPreferences] = useState({
    sms: true,
    email: true,
    push: false,
  });

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Notification Center
          </span>
        </div>
        <Link
          href="/booking"
          className="text-xs font-bold text-[#ff6600] hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Delivery Alerts &amp; Channel Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time milestone notifications broadcast via our RabbitMQ event broker.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Alerts List */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight mb-1">
              Recent Delivery Alerts
            </h3>

            {notifications.map((n) => (
              <div
                key={n.id}
                className={`p-5 rounded-2xl border transition-all ${
                  n.read
                    ? 'bg-white border-slate-100'
                    : 'bg-orange-50/30 border-orange-200/80 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {!n.read && <span className="w-2 h-2 rounded-full bg-[#ff6600]" />}
                    <h4 className="text-sm font-black text-slate-900">{n.title}</h4>
                  </div>
                  <span className="text-[11px] text-slate-400">{n.time}</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>

          {/* Right: Preferences Card */}
          <div className="lg:col-span-4 bg-slate-50/70 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight mb-4">
                Notification Channels
              </h3>

              <div className="space-y-3.5 text-xs font-bold text-slate-700">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                  <span>SMS Status Text Updates</span>
                  <input
                    type="checkbox"
                    checked={preferences.sms}
                    onChange={(e) => setPreferences({ ...preferences, sms: e.target.checked })}
                    className="accent-[#ff6600] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                  <span>Email Invoices &amp; Waybills</span>
                  <input
                    type="checkbox"
                    checked={preferences.email}
                    onChange={(e) => setPreferences({ ...preferences, email: e.target.checked })}
                    className="accent-[#ff6600] w-4 h-4 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200/80 cursor-pointer">
                  <span>Browser Push Notifications</span>
                  <input
                    type="checkbox"
                    checked={preferences.push}
                    onChange={(e) => setPreferences({ ...preferences, push: e.target.checked })}
                    className="accent-[#ff6600] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => alert('Channel preferences saved!')}
                className="w-full py-3 bg-[#ff9900] hover:bg-[#ff8800] text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
