'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ExceptionItem {
  id: string;
  parcelId: string;
  issue: string;
  loggedBy: string;
  date: string;
}

export default function ExceptionsPage() {
  const [selectedException, setSelectedException] = useState<ExceptionItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [status, setStatus] = useState('INVESTIGATING');

  const exceptions: ExceptionItem[] = [
    { id: 'exc-1', parcelId: 'SWIFT-991122', issue: 'Customer not home after 3 attempts', loggedBy: 'Courier Sunil Silva', date: 'Today, 2:15 PM' },
    { id: 'exc-2', parcelId: 'SWIFT-443322', issue: 'Damaged barcode scan label at sorting', loggedBy: 'Western Hub A', date: 'Today, 11:30 AM' },
  ];

  const handleResolve = () => {
    alert(`Exception for ${selectedException?.parcelId} updated to ${status} with note: "${resolutionNote}"`);
    setSelectedException(null);
    setResolutionNote('');
  };

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Exceptions Desk
          </span>
        </div>
        <Link
          href="/dispatch"
          className="text-xs font-bold text-[#ff6600] hover:underline"
        >
          &larr; Back to Operations
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Delivery Exceptions &amp; Resolution Desk
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Triage delivery failures, append resolution audit trails, and re-dispatch parcels.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Exception Queue */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <h3 className="text-sm font-black text-slate-900 tracking-tight mb-1">
              Active Delivery Incidents
            </h3>

            {exceptions.map((exc) => (
              <div
                key={exc.id}
                onClick={() => setSelectedException(exc)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                  selectedException?.id === exc.id
                    ? 'bg-orange-50/40 border-[#ff6600] shadow-md shadow-orange-500/10'
                    : 'bg-white border-slate-100 hover:border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-slate-900">{exc.parcelId}</span>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                    Exception
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-semibold mb-2">{exc.issue}</p>
                <span className="text-[11px] text-slate-400 block">{exc.loggedBy} &bull; {exc.date}</span>
              </div>
            ))}
          </div>

          {/* Right: Resolution Workspace */}
          <div className="lg:col-span-5 bg-slate-50/70 rounded-3xl p-6 border border-slate-100 flex flex-col justify-between">
            {selectedException ? (
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight mb-2">
                  Resolving: {selectedException.parcelId}
                </h3>
                <p className="text-xs text-slate-500 mb-4">{selectedException.issue}</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Target Resolution State
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-[#ff6600]"
                    >
                      <option value="INVESTIGATING">Investigating / Contacting Sender</option>
                      <option value="RE_SCHEDULED">Re-Schedule for Tomorrow</option>
                      <option value="RETURN_TO_SENDER">Return to Sender (RTS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      Resolution Audit Note
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      placeholder="Add investigation details or customer instructions..."
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 bg-white focus:outline-none focus:border-[#ff6600]"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/80 flex gap-2">
                  <button
                    type="button"
                    onClick={handleResolve}
                    className="flex-1 py-3 bg-[#ff9900] hover:bg-[#ff8800] text-white rounded-xl font-black text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                  >
                    Save &amp; Update Parcel
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedException(null)}
                    className="px-4 py-3 bg-white hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs my-auto">
                Select an open exception from the left queue to open the triage workspace.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
