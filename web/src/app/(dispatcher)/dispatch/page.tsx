'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

export default function DispatcherDashboardPage() {
  const [activeDuty, setActiveDuty] = useState('dispatch');
  const [activeZone, setActiveZone] = useState('all');
  const [selectedCourier, setSelectedCourier] = useState('c-101');
  const [assigned, setAssigned] = useState(false);

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
    <div className="w-full min-h-screen bg-slate-50 flex flex-col">
      {/* FULL-WIDTH STICKY DASHBOARD HEADER */}
      <header className="w-full bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-40 shadow-sm gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center no-underline">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              swiftdrop<span className="text-[#ff6600]">.</span>
            </span>
          </Link>
          <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-800 rounded-full">
            Operations Control
          </span>
        </div>

        {/* Role Duty Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'dispatch', label: 'Fleet Dispatch', icon: '🎛️' },
            { id: 'workload', label: 'Courier Workloads (18)', icon: '📊' },
            { id: 'config', label: 'Pricing & Zones', icon: '⚙️' },
            { id: 'approvals', label: 'Merchant Approvals (2)', icon: '🏢' },
            { id: 'analytics', label: 'Operational KPIs', icon: '📈' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDuty(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeDuty === tab.id
                  ? 'bg-rose-50 text-rose-700 border border-rose-200 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Status & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">RabbitMQ Broker Live</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 border border-slate-200 rounded-full transition-all cursor-pointer"
          >
            Log out
          </button>
        </div>
      </header>

      {/* FULL-PAGE MAIN WORKSPACE */}
      <main className="flex-1 w-full max-w-[1700px] mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT MAJOR WORKSPACE */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Zone Filter Pills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Regional Delivery Zones
                </span>
                <span className="text-xs text-rose-600 font-semibold">24 unassigned parcels</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeZone === z.id
                        ? 'bg-brand-dark text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {z.label}
                  </button>
                ))}
              </div>
            </div>

            {/* FEATURED UNASSIGNED PARCEL ASSIGNMENT STATION */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center">
              {/* Left Route Blueprint */}
              <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="w-40 h-40 bg-rose-50 rounded-2xl flex flex-col items-center justify-center text-rose-700 p-4 border border-rose-100 text-center">
                  <span className="text-4xl mb-1">📦</span>
                  <span className="text-xs font-black">#SWIFT-102938</span>
                  <span className="text-[0.65rem] text-slate-500 mt-1">Weight: 3.5 kg • Priority</span>
                </div>
                <div className="text-center mt-3">
                  <span className="text-xs font-bold text-slate-800">Pettah &rarr; Mt. Lavinia</span>
                  <p className="text-[0.7rem] text-slate-400">Calculated Fee: $17.50</p>
                </div>
              </div>

              {/* Right Assignment Controls */}
              <div className="w-full md:w-7/12 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">UNASSIGNED IN QUEUE</span>
                    <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                      Waiting 14m
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                    Assign Delivery Courier
                  </h2>
                  <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
                    Sender: Acme Wholesale Co • Recipient: Dr. Perera, Mt. Lavinia Clinic
                  </p>
                </div>

                {/* AI Recommendation Highlight */}
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2.5">
                  <span className="text-lg">🤖</span>
                  <div>
                    <span className="font-bold">AI Recommended Match: </span>
                    <span>Sunil Silva (#101) is 1.2 km away with low active workload (2/8).</span>
                  </div>
                </div>

                {/* Courier Selection Dropdown */}
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    SELECT COURIER TO DISPATCH
                  </label>
                  <select
                    value={selectedCourier}
                    onChange={(e) => setSelectedCourier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-brand-orange"
                  >
                    {couriers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — Workload: {c.load}/{c.max} parcels ({c.dist}) [{c.status}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Confirm Assignment Action */}
                <div className="pt-2">
                  {assigned ? (
                    <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl text-center text-xs font-bold">
                      ✓ Parcel Assigned! RabbitMQ notification published to Sunil Silva.
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAssigned(true)}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      Assign Parcel & Publish Status Event
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* LIVE COURIER CAPACITY MONITORING */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Live Active Courier Capacity
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {couriers.map((c) => (
                  <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                      <span className={`text-[0.65rem] font-bold px-2 py-0.5 rounded-full ${
                        c.load < 4 ? 'bg-emerald-100 text-emerald-800' :
                        c.load < 7 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-[0.7rem] text-slate-500 mb-1.5">{c.dist}</div>
                    
                    {/* Progress Bar for Load */}
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.load < 4 ? 'bg-emerald-500' : c.load < 7 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${(c.load / c.max) * 100}%` }}
                      ></div>
                    </div>
                    <div className="text-[0.65rem] font-bold text-slate-600 text-right mt-1">
                      {c.load} / {c.max} parcels
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE PANEL: FLEET COMMAND DRAWER */}
          <div className="lg:col-span-4 bg-slate-50/80 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Operations Control</h3>
                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">Island-Wide</span>
              </div>

              {/* System KPIs */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                  <div className="text-[0.65rem] text-slate-400 font-bold uppercase">Unassigned</div>
                  <div className="text-2xl font-black text-rose-600">24</div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                  <div className="text-[0.65rem] text-slate-400 font-bold uppercase">On-Road Couriers</div>
                  <div className="text-2xl font-black text-slate-900">18</div>
                </div>
              </div>

              {/* Dispatch Feed */}
              <div className="flex flex-col gap-2.5">
                {[
                  { parcel: 'SWIFT-102938', route: 'Pettah → Mt. Lavinia', fee: '$17.50', status: 'Pending' },
                  { parcel: 'SWIFT-102937', route: 'Kandy → Peradeniya', fee: '$8.50', status: 'Assigned' },
                  { parcel: 'SWIFT-102936', route: 'Galle → Matara Express', fee: '$12.00', status: 'Assigned' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{item.parcel}</h4>
                      <span className="text-[0.7rem] text-slate-400">{item.route}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">{item.fee}</div>
                      <span className={`text-[0.65rem] font-bold ${item.status === 'Assigned' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Operational Metrics Breakdown */}
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Island-Wide Success Rate</span>
                  <span className="font-bold text-emerald-600">98.4%</span>
                </div>
                <div className="flex justify-between">
                  <span>Pending Merchant Approvals</span>
                  <span className="font-bold text-purple-700">2 businesses</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Fleet Dispatch Time</span>
                  <span className="font-bold text-slate-800">4.2 minutes</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6">
              <button
                type="button"
                onClick={() => alert('Smart Auto-Dispatch complete: 18 unassigned parcels assigned to optimal couriers!')}
                className="w-full py-4 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
              >
                Auto-Dispatch All 24 Parcels &rarr;
              </button>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
