'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

export default function CourierDashboardPage() {
  const [activeNav, setActiveNav] = useState('route');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deliveryStatus, setDeliveryStatus] = useState('OUT_FOR_DELIVERY');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [completed, setCompleted] = useState(false);
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

          {/* Courier Role Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 mb-6 bg-orange-50 border border-orange-200/80 rounded-2xl">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block leading-tight">Sunil Silva</span>
              <span className="text-[10px] text-[#ff6600] font-bold block leading-none">Courier Pro &bull; #101</span>
            </div>
          </div>

          {/* Vertical Menu Items with Theme Vector SVGs */}
          <nav className="space-y-1.5">
            {[
              {
                id: 'route',
                label: "Today's Route",
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                ),
              },
              {
                id: 'tasks',
                label: 'Active Tasks (6)',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
              },
              {
                id: 'proof',
                label: 'Camera Proof Logs',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
              },
              {
                id: 'exceptions',
                label: 'Returns & Issues',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ),
              },
              {
                id: 'earnings',
                label: 'Daily Earnings',
                icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                id: 'settings',
                label: 'Vehicle & Shift',
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

        {/* Shift Live Card & Logout */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
          <div className="relative rounded-3xl bg-gradient-to-br from-[#ff7a00] to-[#ff9900] p-5 text-white overflow-hidden shadow-lg shadow-orange-500/15">
            <div className="relative z-10">
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full inline-block mb-2">
                Shift Live
              </span>
              <h4 className="text-xs font-black leading-tight mb-1">
                Zone 03 Western Express
              </h4>
              <p className="text-[11px] text-white/80 leading-snug mb-3">
                8 stops completed &bull; 6 stops remaining
              </p>
              <button
                onClick={() => alert('Shift pause / handover requested')}
                className="w-full py-2 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer"
              >
                Pause Shift
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
      {/* COLUMN 2: CENTER MAIN CONTENT (Active Stop, Controls, Pipeline) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 sm:p-8 lg:p-9 bg-white flex flex-col gap-7 overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Good day, Sunil 🛵
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              6 assigned stops on your active Western Corridor run today.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-[#f8f8f6] border border-slate-200/60 rounded-full px-5 py-2.5 w-full sm:w-96 shadow-inner focus-within:border-[#ff6600] focus-within:ring-2 focus-within:ring-orange-100 transition-all">
            <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search recipient, address or tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full"
            />
          </div>
        </div>

        {/* Priority Dropoff Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#ff8c00] via-[#ffa200] to-[#ffb800] p-7 sm:p-8 text-white overflow-hidden shadow-lg shadow-orange-500/15 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="relative z-10 max-w-md">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full inline-block mb-3">
              Next Priority Dropoff &bull; Stop #3
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
              Robert Smith &bull; 1.4 km
            </h2>
            <p className="text-xs text-white/90 leading-relaxed mb-5">
              742 Evergreen Terrace, Sector 4, Colombo 03. Est. arrival in 8 mins. Please ring doorbell twice.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => alert('Launching GPS turn-by-turn navigation!')}
                className="px-6 py-2.5 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs sm:text-sm rounded-full shadow-md transition-all cursor-pointer"
              >
                Turn-by-Turn GPS &rarr;
              </button>
              <button
                onClick={() => alert('Dialing recipient: +94 77 987 6543')}
                className="px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-black text-xs sm:text-sm rounded-full transition-all cursor-pointer"
              >
                Call Recipient
              </button>
            </div>
          </div>

          <div className="w-44 h-36 sm:w-56 sm:h-44 relative flex-shrink-0 flex items-center justify-center">
            <img
              src="/service-express.jpg"
              alt="Express Delivery"
              className="w-full h-full object-contain filter drop-shadow-xl rounded-2xl"
            />
          </div>
        </div>

        {/* Status Filter Chips with Theme Icons */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Route Delivery Status
            </h3>
            <span className="text-xs font-bold text-[#ff6600]">
              6 assigned stops
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Jobs (6)' },
              { id: 'pickup', label: 'Pending Pickup (2)' },
              { id: 'transit', label: 'In Transit (2)' },
              { id: 'out', label: 'Out for Delivery (2)' },
              { id: 'completed', label: 'Delivered (8)' },
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

        {/* Current Active Task Card (Execution Pipeline) */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col md:flex-row gap-8 items-center">
          <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-orange-50/50 rounded-2xl border border-orange-100">
            <div className="w-32 h-32 rounded-2xl overflow-hidden mb-3">
              <img src="/service-pod.jpg" alt="Proof of delivery" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-black text-slate-900">SWIFT-991122</span>
            <span className="text-[11px] text-slate-400">Standard Priority Box &bull; 1.2 kg</span>
          </div>

          <div className="w-full md:w-7/12 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-[#ff6600] uppercase tracking-wider bg-orange-50 px-2.5 py-1 rounded-full border border-orange-100">
                ACTIVE STOP #3
              </span>
              <span className="text-xs font-bold text-slate-500">
                Status: <strong className="text-[#ff6600]">{deliveryStatus.replace('_', ' ')}</strong>
              </span>
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">Robert Smith</h3>
              <p className="text-xs text-slate-600 mt-0.5">742 Evergreen Terrace, Sector 4, Colombo 03</p>
              <p className="text-xs text-slate-400 mt-0.5">Tel: +94 77 987 6543 &bull; Instructions: Ring bell twice</p>
            </div>

            {/* Stepper Pipeline */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                UPDATE STATUS PIPELINE
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'PICKED_UP', label: '1. Picked Up' },
                  { id: 'IN_TRANSIT', label: '2. In Transit' },
                  { id: 'OUT_FOR_DELIVERY', label: '3. Out for Delivery' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setDeliveryStatus(st.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                      deliveryStatus === st.id
                        ? 'bg-[#ff6600] text-white border-[#ff6600] shadow-sm shadow-orange-500/20'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Doorstep Proof Photo Upload */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#ff6600] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Doorstep Camera Photo Proof</div>
                  <div className="text-[11px] text-slate-400">
                    {photoUploaded ? '✓ Verified photo captured' : 'Camera photo required for completion'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPhotoUploaded(!photoUploaded)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  photoUploaded ? 'bg-orange-50 text-[#ff6600] border border-orange-200' : 'bg-white hover:bg-orange-50 hover:text-[#ff6600] text-slate-700 border border-slate-200'
                }`}
              >
                {photoUploaded ? 'Retake Photo' : 'Capture Photo'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!photoUploaded) {
                    alert('Please capture proof photo before marking delivered!');
                    return;
                  }
                  setCompleted(true);
                }}
                className="flex-1 py-3 bg-[#ff9900] hover:bg-[#ff8800] text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
              >
                ✓ Mark Delivered &amp; Get Signature
              </button>
              <button
                type="button"
                onClick={() => alert('Delivery exception logged: Recipient unreachable.')}
                className="px-4 py-3 bg-white hover:bg-orange-50 text-slate-700 hover:text-[#ff6600] border border-slate-200 hover:border-orange-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
              >
                Mark Failed
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Stops in Run */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Next Upcoming Stops
            </h3>
            <span className="text-xs font-bold text-slate-400">Western Corridor Run</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { recipient: 'Emily Davis', parcel: 'SWIFT-882233', addr: '10 Downing St', dist: '2.8 km away', stop: '#4' },
              { recipient: 'Michael Scott', parcel: 'SWIFT-774411', addr: '172 Industrial Zone', dist: '4.1 km away', stop: '#5' },
              { recipient: 'Sarah Connor', parcel: 'SWIFT-665522', addr: '94 Cyber Rd, Hub A', dist: '5.6 km away', stop: '#6' },
            ].map((stop, idx) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-[#ff6600] uppercase">STOP {stop.stop}</span>
                  <h4 className="text-xs font-bold text-slate-900">{stop.recipient}</h4>
                  <p className="text-[11px] text-slate-400">{stop.addr}</p>
                  <span className="text-[11px] font-bold text-slate-700">{stop.dist}</span>
                </div>
                <button
                  onClick={() => alert(`Navigating to ${stop.addr}`)}
                  className="w-9 h-9 rounded-xl bg-orange-50 hover:bg-[#ff6600] text-[#ff6600] hover:text-white border border-orange-200/80 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* COLUMN 3: RIGHT PANEL (Shift Overview, Earnings, Queue) */}
      {/* ========================================================================= */}
      <aside className="w-full lg:w-80 xl:w-88 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          {/* Top Bar: Action Icons + Avatar */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900">Shift Overview</span>
            </div>
            <span className="text-[10px] font-black text-[#ff6600] bg-orange-50 border border-orange-200/80 px-2.5 py-0.5 rounded-full">
              GPS Active
            </span>
          </div>

          {/* Balance / Daily Earnings Card */}
          <div className="mb-6">
            <span className="text-xs font-black text-slate-900 block mb-2.5">
              Today&apos;s Earnings
            </span>

            <div className="rounded-2xl bg-gradient-to-r from-[#ff8c00] to-[#ffa500] p-4 text-white shadow-md flex items-center justify-between gap-3">
              <div className="bg-white rounded-xl px-4 py-2 text-slate-900 shadow-sm">
                <span className="text-[10px] text-slate-400 block font-medium">Earned Today</span>
                <span className="text-xl font-black text-slate-900">$94.50</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => alert('Earnings history breakdown')}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex flex-col items-center justify-center cursor-pointer"
                  title="View History"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[8px] font-bold text-white mt-0.5">History</span>
                </button>
              </div>
            </div>
          </div>

          {/* Key Shift Numbers */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Remaining</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">6</div>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-center">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Delivered</div>
              <div className="text-2xl font-black text-[#ff6600] mt-0.5">8</div>
            </div>
          </div>

          {/* Queue List Preview */}
          <div className="mb-6">
            <span className="text-xs font-black text-slate-900 block mb-3">
              Route Stop Queue
            </span>

            <div className="space-y-2.5">
              {[
                { name: 'Robert Smith', tracking: 'SWIFT-991122', type: 'Carton Box', tag: 'Out Now' },
                { name: 'Emily Davis', tracking: 'SWIFT-882233', type: 'Document', tag: 'Next' },
                { name: 'Michael Scott', tracking: 'SWIFT-774411', type: 'Heavy Package', tag: 'Queued' },
              ].map((q, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{q.name}</h4>
                    <span className="text-[10px] text-slate-400 block">{q.tracking} &bull; {q.type}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-[#ff6600] border border-orange-200/60 rounded-md">
                    {q.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* COD & Performance Breakdown */}
          <div className="space-y-1.5 text-xs text-slate-500 pt-4 border-t border-slate-100">
            <div className="flex justify-between">
              <span>COD Cash Collected</span>
              <span className="font-bold text-slate-800">$42.50 to remit</span>
            </div>
            <div className="flex justify-between">
              <span>On-Time Arrival</span>
              <span className="text-emerald-600 font-bold">98.2%</span>
            </div>
            <div className="flex justify-between">
              <span>Shift Distance</span>
              <span className="font-bold text-slate-800">18.4 km</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          {completed ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-xs font-black text-emerald-800">
              ✓ Stop #3 Completed! Next stop loaded.
            </div>
          ) : (
            <button
              type="button"
              onClick={() => alert('Turn-by-turn navigation started for Stop #3')}
              className="w-full py-3.5 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Start Turn-by-Turn GPS &rarr;</span>
            </button>
          )}
        </div>
      </aside>

    </div>
  );
}
