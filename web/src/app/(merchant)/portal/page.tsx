'use client';

import { useState } from 'react';

export default function MerchantDashboardPage() {
  const [activeDuty, setActiveDuty] = useState('orders');
  const [activeFilter, setActiveFilter] = useState('all');
  const [shippingTier, setShippingTier] = useState('sameday');
  const [copiedKey, setCopiedKey] = useState(false);
  const [apiKey] = useState('sw_live_9a7d2e81c04f4a3b8e7c1d');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-10">
      {/* Outer Dashboard Card matching reference UI */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90">
        
        {/* TOP NAVBAR FOR MERCHANT ROLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              swiftdrop<span className="text-brand-orange">.</span>
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-800 rounded-full">
              Merchant B2B Portal
            </span>
          </div>

          {/* Role Duty Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: 'orders', label: 'Store Orders (142)', icon: '📦' },
              { id: 'api', label: 'API & Credentials', icon: '🔑' },
              { id: 'webhooks', label: 'Webhook Center (DLQ)', icon: '📡' },
              { id: 'bulk', label: 'Bulk CSV Import', icon: '📑' },
              { id: 'invoices', label: 'Monthly Billing', icon: '💳' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDuty(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeDuty === tab.id
                    ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Integration Status Badge */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
              ✓ Store Sync Active
            </span>
          </div>
        </div>

        {/* TWO-COLUMN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT MAJOR WORKSPACE */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Filter Pills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Fulfillment Status
                </span>
                <span className="text-xs text-purple-600 font-semibold">142 total orders this week</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeFilter === f.id
                        ? 'bg-brand-dark text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FEATURED ORDER CREATION & API TESTER CARD */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center">
              {/* Left Order Preview */}
              <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="w-40 h-40 bg-purple-50 rounded-2xl flex flex-col items-center justify-center text-purple-700 p-4 border border-purple-100 text-center">
                  <span className="text-4xl mb-1">🏷️</span>
                  <span className="text-xs font-black">#ORD-98765</span>
                  <span className="text-[0.65rem] text-slate-500 mt-1">Apex Electronics Cart</span>
                </div>
                <div className="text-center mt-3">
                  <span className="text-xs font-bold text-slate-800">Commercial Partner B2B</span>
                  <p className="text-[0.7rem] text-slate-400">Auto-inject via API key</p>
                </div>
              </div>

              {/* Right Details & Configuration */}
              <div className="w-full md:w-7/12 flex flex-col gap-4">
                <div>
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">SECURED PARTNER API</span>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                    Direct Order Injection
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                    Connect your online storefront. Orders created via API receive instant waybill numbers and trigger signed webhooks.
                  </p>
                </div>

                {/* API Key Box */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex-1 mr-2 overflow-hidden">
                    <div className="text-[0.65rem] font-bold text-slate-400 uppercase">Live Production API Key</div>
                    <code className="text-xs font-mono text-slate-800 truncate block">
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
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    {copiedKey ? '✓ Copied' : 'Copy'}
                  </button>
                </div>

                {/* Shipping Tier Selector */}
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    SELECT SERVICE LEVEL (SLA)
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'sameday', label: 'Same-Day Metro (3h)' },
                      { id: 'nextday', label: 'Overnight Express' },
                      { id: 'standard', label: 'Standard 48h' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setShippingTier(s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          shippingTier === s.id
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => alert('B2B Test Order #ORD-98765 injected! Status webhook dispatched.')}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    + Inject New B2B Delivery Order
                  </button>
                </div>
              </div>
            </div>

            {/* INTEGRATIONS BAR */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Store Integrations & Webhook Endpoints
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { name: 'Shopify Store', status: 'Connected', sub: 'Sync: Every 5 mins', icon: '🛍️' },
                  { name: 'WooCommerce Plugin', status: 'Active', sub: 'Version 2.4.1', icon: '🔌' },
                  { name: 'HMAC Webhooks', status: 'Healthy', sub: '0 Dead Letters', icon: '📡' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                        <p className="text-[0.7rem] text-slate-400">{item.sub}</p>
                        <span className="text-[0.7rem] font-bold text-emerald-600">✓ {item.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE PANEL: FULFILLMENT DRAWER */}
          <div className="lg:col-span-4 bg-slate-50/80 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Weekly Performance</h3>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">Approved Partner</span>
              </div>

              {/* Order Breakdown */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                  <div className="text-[0.65rem] text-slate-400 font-bold uppercase">Pending</div>
                  <div className="text-xl font-black text-slate-900">12</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                  <div className="text-[0.65rem] text-slate-400 font-bold uppercase">In Transit</div>
                  <div className="text-xl font-black text-brand-orange">34</div>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                  <div className="text-[0.65rem] text-slate-400 font-bold uppercase">Delivered</div>
                  <div className="text-xl font-black text-emerald-600">94</div>
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="flex flex-col gap-2.5">
                {[
                  { id: 'ORD-99120', item: 'Wireless Headphones', price: '$8.50', status: 'In Transit' },
                  { id: 'ORD-99119', item: 'Smart Watch Series 7', price: '$12.00', status: 'Delivered' },
                  { id: 'ORD-99118', item: 'Gaming Keyboard', price: '$10.50', status: 'Delivered' },
                ].map((o, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{o.id}</h4>
                      <span className="text-[0.7rem] text-slate-400">{o.item}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{o.price}</div>
                      <span className="text-[0.65rem] font-bold text-emerald-600">{o.status}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Billing Summary */}
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Merchant Volume Tier</span>
                  <span className="font-bold text-purple-700">Tier 2 (15% off)</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Billing Cycle Total</span>
                  <span className="font-extrabold text-slate-900 text-sm">$842.50</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => alert('Exporting all shipping waybills as PDF...')}
                className="w-full py-4 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                Download Bulk PDF Waybills &rarr;
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
