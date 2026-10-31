'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState('7d');

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Operational Analytics
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Operational Performance &amp; Fleet Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Aggregated delivery performance metrics, success ratios, and courier leaderboards.
            </p>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#ff6600] self-start sm:self-auto cursor-pointer"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Dispatched</span>
            <div className="text-3xl font-black text-slate-900 mt-1">1,482</div>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">&uarr; 14% vs last week</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Delivered On-Time</span>
            <div className="text-3xl font-black text-[#ff6600] mt-1">1,438</div>
            <span className="text-[10px] text-emerald-600 font-bold mt-1 block">Verified PODs</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Success Ratio</span>
            <div className="text-3xl font-black text-emerald-600 mt-1">97.03%</div>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">SLA Target: 95%</span>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Exception Incidents</span>
            <div className="text-3xl font-black text-slate-400 mt-1">44</div>
            <span className="text-[10px] text-slate-400 font-medium mt-1 block">2.97% failure rate</span>
          </div>
        </div>

        {/* Courier Leaderboard */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Top Courier Leaderboard
            </h3>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Courier Name</th>
                <th className="py-3.5 px-6">Completed Runs</th>
                <th className="py-3.5 px-6">Avg Delivery Time</th>
                <th className="py-3.5 px-6 text-right">On-Time Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { name: 'Sunil Silva (#101)', runs: 184, avg: '38 mins', rating: '99.1%' },
                { name: 'Sarah Lee (#102)', runs: 162, avg: '41 mins', rating: '98.5%' },
                { name: 'Kamal Perera (#103)', runs: 149, avg: '44 mins', rating: '97.8%' },
              ].map((c, i) => (
                <tr key={i} className="hover:bg-orange-50/20 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">{c.name}</td>
                  <td className="py-4 px-6 text-slate-600">{c.runs} parcels</td>
                  <td className="py-4 px-6 text-slate-500">{c.avg}</td>
                  <td className="py-4 px-6 text-right font-black text-[#ff6600]">{c.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
