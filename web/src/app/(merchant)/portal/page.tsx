'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

export default function MerchantDashboardPage() {
  const [activeNav, setActiveNav] = useState('orders');
  const [activeFilter, setActiveFilter] = useState('all');
  const [shippingTier, setShippingTier] = useState('sameday');
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey] = useState('sw_live_9a7d2e81c04f4a3b8e7c1d');
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      
      {/* ========================================================================= */}
      {/* COLUMN 1: LEFT NAVIGATION SIDEBAR (Full-height Edge-to-Edge) */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Brand Logo */}
          <Link href="/" className="inline-flex items-center gap-1.5 mb-8 group">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              swiftdrop<span className="text-[#ff6600]">.</span>
            </span>
          </Link>

          {/* Merchant Role Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 mb-6 bg-orange-50 border border-orange-200/80 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block leading-tight">Apex Electronics</span>
              <span className="text-[10px] text-[#ff6600] font-bold block leading-none">Verified Partner B2B</span>
            </div>
          </div>

          {/* Vertical Menu Items with Theme Vector SVGs */}
          <nav className="space-y-1.5">
            {[
              {
                id: 'orders',
                label: 'Store Orders (142)',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
              {
                id: 'api',
                label: 'API & Credentials',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                ),
              },
              {
                id: 'webhooks',
                label: 'Webhook Center (DLQ)',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                id: 'bulk',
                label: 'Bulk CSV Import',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                ),
              },
              {
                id: 'billing',
                label: 'Monthly Billing',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                ),
              },
              {
                id: 'settings',
                label: 'Store Settings',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeNav === item.id
                    ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className={activeNav === item.id ? 'text-white' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Merchant Partner Tier Card & Logout */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#ff7a00] to-[#ff9900] p-5 text-white overflow-hidden shadow-lg shadow-orange-500/15">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-2">
                Merchant Tier 2
              </span>
              <h4 className="text-xs font-black leading-tight mb-1">
                15% Volume Discount
              </h4>
              <p className="text-[11px] text-white/80 leading-snug mb-3">
                142 orders shipped &bull; 8 orders to Tier 3 unlock
              </p>
              <button
                onClick={() => alert('Tier benefits: automatic priority rider allocation')}
                className="w-full py-2 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer"
              >
                View Tier Perks
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-white hover:bg-[#ff6600] hover:border-[#ff6600] transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* COLUMN 2: CENTER MAIN CONTENT (Order Injection, Integrations, Orders) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 sm:p-8 lg:p-9 bg-white flex flex-col gap-7 overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Merchant Partner Portal 🛍️
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              142 store orders synced this week with automated waybills and webhooks.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#f8f8f6] border border-slate-200/60 rounded-full px-5 py-2.5 w-full sm:w-96 shadow-inner focus-within:border-[#ff6600] focus-within:ring-2 focus-within:ring-orange-100 transition-all">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search order #, customer or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full"
            />
          </div>
        </div>

        {/* Priority Merchant Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#ff8c00] via-[#ffa200] to-[#ffb800] p-7 sm:p-8 text-white overflow-hidden shadow-lg shadow-orange-500/15 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-md">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full inline-block mb-3">
              Automated Logistics API
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
              Scale Your E-Commerce Delivery
            </h2>
            <p className="text-xs text-white/90 leading-relaxed mb-5">
              Connect Shopify or WooCommerce in 2 minutes. Instant waybills, automatic courier dispatch, and HMAC signed status webhooks.
            </p>
            <button
              onClick={() => alert('Download SwiftDrop Merchant SDK (TypeScript/Python/PHP)')}
              className="px-6 py-2.5 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs sm:text-sm rounded-full shadow-md transition-all cursor-pointer"
            >
              Download API Documentation &rarr;
            </button>
          </div>

          <div className="w-44 h-36 sm:w-56 sm:h-44 relative flex-shrink-0 flex items-center justify-center">
            <img
              src="/service-api.jpg"
              alt="API Integration"
              className="w-full h-full object-contain filter drop-shadow-xl rounded-2xl"
            />
          </div>
        </div>

        {/* Order Fulfillment Status Filter Chips */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Fulfillment Status
            </h3>
            <span className="text-xs font-bold text-[#ff6600]">
              142 total orders this week
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Orders (142)' },
              { id: 'processing', label: 'Pending Dispatch (12)' },
              { id: 'transit', label: 'In Transit (34)' },
              { id: 'delivered', label: 'Delivered (94)' },
              { id: 'exceptions', label: 'Exceptions (2)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200 hover:text-[#ff6600]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Direct Order Injection Station */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div className="w-32 h-32 rounded-2xl overflow-hidden mb-3">
              <img src="/service-pod.jpg" alt="Parcel Box" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black text-slate-900">#ORD-98765</span>
            <span className="text-[11px] text-slate-400">Apex Electronics Cart &bull; Auto-Injected</span>
          </div>

          <div className="w-full md:w-7/12 flex flex-col gap-4">
            <div>
              <span className="text-[10px] font-black text-[#ff6600] uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                SECURED PARTNER API
              </span>
              <h3 className="text-xl font-black text-slate-900 mt-2">Direct Order Injection</h3>
              <p className="text-xs text-slate-600 mt-0.5">Orders injected via API receive instant barcodes and trigger real-time rider pickups.</p>
            </div>

            {/* API Key Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex-1 mr-2 overflow-hidden">
                <div className="text-[10px] font-black text-slate-400 uppercase">Production API Key</div>
                <code className="text-xs font-mono text-slate-800 truncate block mt-0.5 font-bold">
                  {apiKey}
                </code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(apiKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-3.5 py-1.5 bg-[#ff6600] text-white hover:bg-[#ea580c] rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm"
              >
                {copiedKey ? '✓ Copied' : 'Copy Key'}
              </button>
            </div>

            {/* Shipping Tier Selector */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                SELECT SERVICE LEVEL (SLA)
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'sameday', label: 'Same-Day Metro (3h)' },
                  { id: 'nextday', label: 'Overnight Express' },
                  { id: 'standard', label: 'Standard 48h' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setShippingTier(s.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      shippingTier === s.id
                        ? 'bg-[#ff6600] text-white border-[#ff6600] shadow-sm shadow-orange-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => alert('B2B Test Order #ORD-98765 injected! Waybill and status webhook dispatched.')}
                className="w-full py-3.5 bg-[#ff9900] hover:bg-[#ff8800] text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                + Inject New B2B Delivery Order
              </button>
            </div>
          </div>
        </div>

        {/* Store Integrations & Webhook Endpoints */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Store Integrations &amp; Webhooks
            </h3>
            <span className="text-xs font-bold text-slate-400">All Systems Operational</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: 'Shopify Store',
                status: 'Connected',
                sub: 'Sync: Every 5 mins',
                icon: (
                  <svg className="w-5 h-5 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                ),
              },
              {
                name: 'WooCommerce Plugin',
                status: 'Active',
                sub: 'Version 2.4.1',
                icon: (
                  <svg className="w-5 h-5 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                  </svg>
                ),
              },
              {
                name: 'HMAC Webhooks',
                status: 'Healthy',
                sub: '0 Dead Letters',
                icon: (
                  <svg className="w-5 h-5 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                    <p className="text-[11px] text-slate-400">{item.sub}</p>
                    <span className="text-[11px] font-bold text-[#ff6600]">✓ {item.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT PANEL (Billing, Weekly Stats, Orders) */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-80 xl:w-88 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Top Bar: Action Icons + Avatar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <span className="text-xs font-black text-slate-900">Weekly Performance</span>
            <span className="text-[10px] font-black text-[#ff6600] bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full">
              Approved Partner
            </span>
          </div>

          {/* Billing Total Card */}
          <div className="mb-6">
            <span className="text-xs font-black text-slate-900 block mb-2.5">
              Current Billing Cycle
            </span>

            <div className="rounded-2xl bg-gradient-to-r from-[#ff8c00] to-[#ffa500] p-4 text-white shadow-md flex items-center justify-between gap-3">
              <div className="bg-white rounded-xl px-4 py-2 text-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-400 block font-medium">Billed Total</span>
                <span className="text-xl font-black text-slate-900">$842.50</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => alert('Downloading VAT invoice statement for current month')}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex flex-col items-center justify-center cursor-pointer"
                  title="Download Invoice"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-[8px] font-bold text-white mt-0.5">Invoice</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Fulfillment Numbers */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Pending</div>
              <div className="text-xl font-black text-slate-900 mt-0.5">12</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Transit</div>
              <div className="text-xl font-black text-[#ff6600] mt-0.5">34</div>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Delivered</div>
              <div className="text-xl font-black text-emerald-600 mt-0.5">94</div>
            </div>
          </div>

          {/* Recent Store Orders Feed */}
          <div className="mb-6">
            <span className="text-xs font-black text-slate-900 block mb-3">
              Recent Store Orders
            </span>

            <div className="space-y-2.5">
              {[
                { id: 'ORD-99120', item: 'Wireless Headphones', price: '$8.50', status: 'In Transit' },
                { id: 'ORD-99119', item: 'Smart Watch Series 7', price: '$12.00', status: 'Delivered' },
                { id: 'ORD-99118', item: 'Gaming Keyboard', price: '$10.50', status: 'Delivered' },
              ].map((o, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{o.id}</h4>
                    <span className="text-[10px] text-slate-400 block">{o.item}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{o.price}</div>
                    <span className="text-[10px] font-bold text-[#ff6600] bg-orange-50 px-2 py-0.5 rounded-full">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Volume Tier Status */}
          <div className="space-y-1.5 text-xs text-slate-500 pt-4 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Merchant Tier</span>
              <span className="font-bold text-[#ff6600]">Tier 2 (15% off)</span>
            </div>
            <div className="flex justify-between">
              <span>Shopify Sync</span>
              <span className="text-emerald-600 font-bold">Live (5m intervals)</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => alert('Generating printable PDF waybills for all 142 orders...')}
            className="w-full py-3.5 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Download Bulk PDF Waybills &rarr;</span>
          </button>
        </div>
      </aside>

    </div>
  );
}
