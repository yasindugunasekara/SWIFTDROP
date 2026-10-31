'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

export default function DispatcherDashboardPage() {
  const [activeNav, setActiveNav] = useState('dispatch');
  const [activeZone, setActiveZone] = useState('all');
  const [selectedCourier, setSelectedCourier] = useState('c-101');
  const [assigned, setAssigned] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  const couriers = [
    { id: 'c-101', name: 'Sunil Silva', load: 2, max: 8, status: 'AVAILABLE', dist: '1.2 km away' },
    { id: 'c-102', name: 'Sarah Lee', load: 5, max: 8, status: 'OPTIMAL', dist: '3.4 km away' },
    { id: 'c-103', name: 'Kamal Perera', load: 7, max: 8, status: 'NEAR CAPACITY', dist: '4.8 km away' },
  ];

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

          {/* Operations Role Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 mb-6 bg-orange-50 border border-orange-200/80 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600] animate-pulse" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block leading-tight">Operations Hub</span>
              <span className="text-[10px] text-[#ff6600] font-bold block leading-none">Dispatcher Console</span>
            </div>
          </div>

          {/* Vertical Menu Items with Theme Vector SVGs */}
          <nav className="space-y-1.5">
            {[
              {
                id: 'dispatch',
                label: 'Fleet Dispatch',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                ),
              },
              {
                id: 'workload',
                label: 'Courier Workloads (18)',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ),
              },
              {
                id: 'config',
                label: 'Pricing & Zones',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                ),
              },
              {
                id: 'approvals',
                label: 'Merchant Approvals (2)',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                ),
              },
              {
                id: 'analytics',
                label: 'Operational KPIs',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
              },
              {
                id: 'logs',
                label: 'RabbitMQ Broker',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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

        {/* Broker Status Card & Logout */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#ff7a00] to-[#ff9900] p-5 text-white overflow-hidden shadow-lg shadow-orange-500/15">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-2">
                Broker Active
              </span>
              <h4 className="text-xs font-black leading-tight mb-1">
                RabbitMQ Event Engine
              </h4>
              <p className="text-[11px] text-white/80 leading-snug mb-3">
                42 status events/sec &bull; 0 Dead Letters (DLQ)
              </p>
              <button
                onClick={() => alert('RabbitMQ metrics: all exchanges healthy')}
                className="w-full py-2 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer"
              >
                Stream Status
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
      {/* COLUMN 2: CENTER MAIN CONTENT (Unassigned Queue, Zones, Couriers) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 sm:p-8 lg:p-9 bg-white flex flex-col gap-7 overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Operations Control 🚀
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              24 unassigned parcels awaiting matching across 4 regional delivery zones.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#f8f8f6] border border-slate-200/60 rounded-full px-5 py-2.5 w-full sm:w-96 shadow-inner focus-within:border-[#ff6600] focus-within:ring-2 focus-within:ring-orange-100 transition-all">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search parcel ID, courier or zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full"
            />
          </div>
        </div>

        {/* Priority Dispatch Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#ff8c00] via-[#ffa200] to-[#ffb800] p-7 sm:p-8 text-white overflow-hidden shadow-lg shadow-orange-500/15 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-md">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full inline-block mb-3">
              Peak Hours Dispatch Window
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
              Automated Fleet Matching
            </h2>
            <p className="text-xs text-white/90 leading-relaxed mb-5">
              Average courier match time: 3.4 mins &bull; 98.4% on-time delivery across island-wide sorting hubs.
            </p>
            <button
              onClick={() => alert('Batch auto-dispatch triggered for 24 unassigned parcels')}
              className="px-6 py-2.5 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs sm:text-sm rounded-full shadow-md transition-all cursor-pointer"
            >
              Run Batch Auto-Match &rarr;
            </button>
          </div>

          <div className="w-44 h-36 sm:w-56 sm:h-44 relative flex-shrink-0 flex items-center justify-center">
            <img
              src="/service-tracking.jpg"
              alt="Dispatch Map"
              className="w-full h-full object-contain filter drop-shadow-xl rounded-2xl"
            />
          </div>
        </div>

        {/* Regional Zone Selector Chips with Theme Icons */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Regional Delivery Zones
            </h3>
            <span className="text-xs font-bold text-[#ff6600]">
              24 unassigned parcels
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Zones (24)' },
              { id: 'colombo', label: 'Western Province (12)' },
              { id: 'kandy', label: 'Central Kandy (6)' },
              { id: 'galle', label: 'Southern Coastal (4)' },
              { id: 'jaffna', label: 'Northern District (2)' },
            ].map((z) => (
              <button
                key={z.id}
                onClick={() => setActiveZone(z.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeZone === z.id
                    ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200 hover:text-[#ff6600]'
                }`}
              >
                {z.label}
              </button>
            ))}
          </div>
        </div>

        {/* Featured Unassigned Parcel Station */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div className="w-32 h-32 rounded-2xl overflow-hidden mb-3">
              <img src="/service-express.jpg" alt="Express Parcel" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black text-slate-900">#SWIFT-102938</span>
            <span className="text-[11px] text-slate-400">Pettah &rarr; Mt. Lavinia Clinic &bull; 3.5 kg</span>
          </div>

          <div className="w-full md:w-7/12 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#ff6600] uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                UNASSIGNED IN QUEUE
              </span>
              <span className="text-xs font-bold text-slate-500">
                Waiting: <strong className="text-[#ff6600]">14 mins</strong>
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Assign Delivery Courier</h3>
              <p className="text-xs text-slate-600 mt-0.5">Sender: Acme Wholesale Co &bull; Recipient: Dr. Perera, Mt. Lavinia Clinic</p>
            </div>

            {/* AI Recommendation Highlight */}
            <div className="p-3.5 bg-orange-50/70 border border-orange-200 rounded-2xl text-xs text-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#ff6600] text-white flex items-center justify-center font-black flex-shrink-0">
                AI
              </div>
              <div>
                <span className="font-bold text-[#ff6600]">Optimal Proximity Match: </span>
                <span>Sunil Silva (#101) is 1.2 km away with 2/8 parcels active workload.</span>
              </div>
            </div>

            {/* Courier Selection Dropdown */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                SELECT COURIER TO DISPATCH
              </label>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#ff6600]"
              >
                {couriers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — Workload: {c.load}/{c.max} ({c.dist}) [{c.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Confirm Assignment */}
            <div className="pt-2">
              {assigned ? (
                <div className="p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-center text-xs font-bold">
                  ✓ Parcel Assigned! RabbitMQ notification dispatched to Sunil Silva.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAssigned(true)}
                  className="w-full py-3.5 bg-[#ff9900] hover:bg-[#ff8800] text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                >
                  Assign Parcel &amp; Publish Status Event
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Courier Capacity Monitoring */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Live Active Courier Capacity
            </h3>
            <span className="text-xs font-bold text-slate-400">18 Couriers Active</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {couriers.map((c) => (
              <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-[#ff6600] border border-orange-200/80">
                    {c.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mb-2">{c.dist}</div>

                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#ff6600]"
                    style={{ width: `${(c.load / c.max) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] font-bold text-slate-700 text-right mt-1.5">
                  {c.load} / {c.max} parcels
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT PANEL (Fleet Control, Realtime Queue) */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-80 xl:w-88 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Top Bar: Action Icons + Avatar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <span className="text-xs font-black text-slate-900">Fleet Control</span>
            <span className="text-[10px] font-black text-[#ff6600] bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full">
              Island-Wide
            </span>
          </div>

          {/* KPI Balance Card */}
          <div className="mb-6">
            <span className="text-xs font-black text-slate-900 block mb-2.5">
              Queue Status
            </span>

            <div className="rounded-2xl bg-gradient-to-r from-[#ff8c00] to-[#ffa500] p-4 text-white shadow-md flex items-center justify-between gap-3">
              <div className="bg-white rounded-xl px-4 py-2 text-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-400 block font-medium">Unassigned</span>
                <span className="text-xl font-black text-slate-900">24 Parcels</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => alert('Refreshing live dispatch queue')}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex flex-col items-center justify-center cursor-pointer"
                  title="Refresh Queue"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-[8px] font-bold text-white mt-0.5">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[11px] text-slate-400 font-bold uppercase">On-Road Riders</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">18</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Success Rate</div>
              <div className="text-2xl font-black text-[#ff6600] mt-0.5">98.4%</div>
            </div>
          </div>

          {/* Dispatch Feed */}
          <div className="mb-6">
            <span className="text-xs font-black text-slate-900 block mb-3">
              Realtime Dispatch Feed
            </span>

            <div className="space-y-2.5">
              {[
                { parcel: 'SWIFT-102938', route: 'Pettah → Mt. Lavinia', fee: '$17.50', status: 'Pending' },
                { parcel: 'SWIFT-102937', route: 'Kandy → Peradeniya', fee: '$8.50', status: 'Assigned' },
                { parcel: 'SWIFT-102936', route: 'Galle → Matara Express', fee: '$12.00', status: 'Assigned' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{item.parcel}</h4>
                    <span className="text-[10px] text-slate-400 block">{item.route}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-900">{item.fee}</div>
                    <span className="text-[10px] font-bold text-[#ff6600] bg-orange-50 px-2 py-0.5 rounded-full">
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Metrics */}
          <div className="space-y-1.5 text-xs text-slate-500 pt-4 border-t border-slate-100">
            <div className="flex justify-between">
              <span>Avg Match Time</span>
              <span className="font-bold text-slate-800">3.4 mins</span>
            </div>
            <div className="flex justify-between">
              <span>Pending B2B Approvals</span>
              <span className="font-bold text-[#ff6600]">2 businesses</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => alert('Smart Auto-Dispatch complete: 18 parcels allocated to closest available riders!')}
            className="w-full py-3.5 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
          >
            <span>Auto-Dispatch All 24 Parcels &rarr;</span>
          </button>
        </div>
      </aside>

    </div>
  );
}
