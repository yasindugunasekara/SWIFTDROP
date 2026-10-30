'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

export default function CourierDashboardPage() {
  const [activeDuty, setActiveDuty] = useState('route');
  const [activeFilter, setActiveFilter] = useState('all');
  const [deliveryStatus, setDeliveryStatus] = useState('OUT_FOR_DELIVERY');
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

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
          <span className="px-2.5 py-0.5 text-xs font-bold bg-amber-100 text-amber-800 rounded-full">
            Courier Hub
          </span>
        </div>

        {/* Role Duty Navigation Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'route', label: "Today's Route", icon: '🗺️' },
            { id: 'tasks', label: 'Active Tasks (6)', icon: '🚚' },
            { id: 'proof', label: 'Camera Proof Logs', icon: '📸' },
            { id: 'failed', label: 'Exceptions & Returns', icon: '⚠️' },
            { id: 'earnings', label: 'Daily Earnings', icon: '💰' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveDuty(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeDuty === tab.id
                  ? 'bg-amber-50 text-amber-700 border border-amber-300/70 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Shift Status & Logout */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline">GPS Active</span>
            <div className="bg-amber-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
              Rider #101
            </div>
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
            
            {/* Filter Pills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Route Delivery Status
                </span>
                <span className="text-xs text-amber-600 font-semibold">6 assigned stops</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
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

            {/* FEATURED CURRENT ACTIVE DELIVERY CARD */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center">
              {/* Left Item Visual / Route Preview */}
              <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="w-40 h-40 relative flex flex-col items-center justify-center bg-slate-900 rounded-2xl text-white p-4 text-center">
                  <span className="text-3xl mb-1">📍</span>
                  <span className="text-xs font-bold text-amber-400">Stop #3 • 1.4 km</span>
                  <span className="text-[0.65rem] text-slate-300 mt-1">Est. arrival in 8 mins</span>
                </div>
                <div className="text-center mt-3">
                  <span className="text-xs font-bold text-slate-800">SWIFT-991122</span>
                  <p className="text-[0.7rem] text-slate-400">Priority Standard Parcel (1.2 kg)</p>
                </div>
              </div>

              {/* Right Details & Execution */}
              <div className="w-full md:w-7/12 flex flex-col gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">CURRENT STOP</span>
                    <span className="px-2.5 py-0.5 text-[0.7rem] font-bold bg-amber-100 text-amber-800 rounded-full">
                      {deliveryStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                    Robert Smith
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    🏠 742 Evergreen Terrace, Sector 4, Colombo
                  </p>
                  <p className="text-xs text-slate-400">
                    📞 +94 77 987 6543 • Notes: Ring doorbell twice
                  </p>
                </div>

                {/* State Machine Action Stepper */}
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    UPDATE STATUS PIPELINE
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'PICKED_UP', label: '1. Picked Up' },
                      { id: 'IN_TRANSIT', label: '2. In Transit' },
                      { id: 'OUT_FOR_DELIVERY', label: '3. Out for Delivery' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setDeliveryStatus(st.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          deliveryStatus === st.id
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Proof Photo Upload */}
                <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">📸</span>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Doorstep Delivery Proof</div>
                      <div className="text-[0.7rem] text-slate-400">
                        {photoUploaded ? '✓ Photo captured & attached' : 'Camera photo required for completion'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhotoUploaded(!photoUploaded)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      photoUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {photoUploaded ? 'Retake Photo' : 'Capture Photo'}
                  </button>
                </div>

                {/* Completion Action Bar */}
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
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    ✓ Mark Delivered & Get Signature
                  </button>
                  <button
                    type="button"
                    onClick={() => alert('Delivery exception logged: Customer unreachable after 3 attempts.')}
                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-full font-bold text-xs transition-all cursor-pointer"
                  >
                    Mark Failed
                  </button>
                </div>
              </div>
            </div>

            {/* UPCOMING STOPS IN TODAY'S RUN */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Next Upcoming Stops
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { recipient: 'Emily Davis', parcel: 'SWIFT-882233', addr: '10 Downing St', dist: '2.8 km away' },
                  { recipient: 'Michael Scott', parcel: 'SWIFT-774411', addr: '172 Industrial Zone', dist: '4.1 km away' },
                  { recipient: 'Sarah Connor', parcel: 'SWIFT-665522', addr: '94 Cyber Rd, Hub A', dist: '5.6 km away' },
                ].map((stop, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
                    <div>
                      <span className="text-[0.65rem] font-bold text-amber-600 uppercase">STOP #{idx + 4}</span>
                      <h4 className="text-xs font-bold text-slate-900">{stop.recipient}</h4>
                      <p className="text-[0.7rem] text-slate-500">{stop.addr}</p>
                      <span className="text-[0.7rem] font-bold text-slate-700">{stop.dist}</span>
                    </div>
                    <button
                      onClick={() => alert(`Navigating to ${stop.addr}`)}
                      className="w-8 h-8 rounded-full bg-slate-900 hover:bg-amber-600 text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                    >
                      🧭
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE PANEL: COURIER SHIFT SUMMARY */}
          <div className="lg:col-span-4 bg-slate-50/80 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Shift Overview</h3>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">Active</span>
              </div>

              {/* Shift Key Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-400 font-semibold">Remaining</div>
                  <div className="text-2xl font-black text-slate-900">6</div>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center">
                  <div className="text-xs text-slate-400 font-semibold">Delivered</div>
                  <div className="text-2xl font-black text-emerald-600">8</div>
                </div>
              </div>

              {/* Queue List Preview */}
              <div className="flex flex-col gap-2.5">
                {[
                  { name: 'Robert Smith (Current)', tracking: 'SWIFT-991122', type: 'Carton Box', tag: 'Out Now' },
                  { name: 'Emily Davis', tracking: 'SWIFT-882233', type: 'Document', tag: 'Next' },
                  { name: 'Michael Scott', tracking: 'SWIFT-774411', type: 'Heavy Package', tag: 'Queued' },
                ].map((q, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{q.name}</h4>
                      <span className="text-[0.7rem] text-slate-400">{q.tracking} • {q.type}</span>
                    </div>
                    <span className="text-[0.7rem] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {q.tag}
                    </span>
                  </div>
                ))}
              </div>

              {/* Cash & Performance Breakdown */}
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Cash on Delivery (COD)</span>
                  <span className="font-semibold text-slate-800">$42.50 to remit</span>
                </div>
                <div className="flex justify-between">
                  <span>On-Time Rating</span>
                  <span className="text-emerald-600 font-bold">98.2%</span>
                </div>
                <div className="flex justify-between">
                  <span>Completed Stops Distance</span>
                  <span className="font-semibold text-slate-800">18.4 km</span>
                </div>
              </div>
            </div>

            {/* Action CTA */}
            <div className="mt-6">
              {completed ? (
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl text-center text-xs font-bold">
                  ✓ Stop #3 Completed! Next stop loaded.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => alert('Starting GPS turn-by-turn navigation for Stop #3')}
                  className="w-full py-4 bg-brand-dark hover:bg-brand-dark-hover text-white rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer"
                >
                  Start Turn-by-Turn GPS Navigation &rarr;
                </button>
              )}
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
