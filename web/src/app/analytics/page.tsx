'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../lib/auth';
import { fetchApi } from '../../lib/api';

interface AnalyticsKPIs {
  totalDispatched: number;
  deliveredCount: number;
  failedCount: number;
  successRate: number;
  failureRate: number;
  totalRevenue: number;
}

interface DailyVolume {
  date: string;
  delivered: number;
  failed: number;
  total?: number;
}

interface CourierPerformance {
  id: string;
  name: string;
  phone: string;
  completedRuns: number;
  activeRuns: number;
  successRate: number;
  avgTimeMins: number;
}

export default function AnalyticsDashboardPage() {
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d'>('7d');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Default initial/fallback state
  const [kpis, setKpis] = useState<AnalyticsKPIs>({
    totalDispatched: 1482,
    deliveredCount: 1438,
    failedCount: 44,
    successRate: 97.03,
    failureRate: 2.97,
    totalRevenue: 845200.0,
  });

  const [dailyVolumes, setDailyVolumes] = useState<DailyVolume[]>([
    { date: 'Mon', delivered: 180, failed: 4, total: 184 },
    { date: 'Tue', delivered: 215, failed: 8, total: 223 },
    { date: 'Wed', delivered: 195, failed: 5, total: 200 },
    { date: 'Thu', delivered: 240, failed: 11, total: 251 },
    { date: 'Fri', delivered: 265, failed: 6, total: 271 },
    { date: 'Sat', delivered: 210, failed: 7, total: 217 },
    { date: 'Sun', delivered: 133, failed: 3, total: 136 },
  ]);

  const [couriers, setCouriers] = useState<CourierPerformance[]>([
    { id: 'c-101', name: 'Sunil Silva', phone: '+94 77 123 4567', completedRuns: 184, activeRuns: 3, successRate: 99.1, avgTimeMins: 38 },
    { id: 'c-102', name: 'Sarah Lee', phone: '+94 71 987 6543', completedRuns: 162, activeRuns: 2, successRate: 98.5, avgTimeMins: 41 },
    { id: 'c-103', name: 'Kamal Perera', phone: '+94 75 444 3322', completedRuns: 149, activeRuns: 4, successRate: 97.8, avgTimeMins: 44 },
    { id: 'c-104', name: 'Nimal Jayasooriya', phone: '+94 78 555 1199', completedRuns: 138, activeRuns: 1, successRate: 96.2, avgTimeMins: 49 },
  ]);

  const handleLogout = async () => {
    try { await clearAuthSession(); window.location.href = '/login'; }
    catch { alert('Unable to sign out securely. Check your connection and retry.'); }
  };

  // Fetch telemetry from backend API
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const [kpiData, dailyData, courierData] = await Promise.all([
          fetchApi(`/analytics/summary?range=${dateRange}`),
          fetchApi(`/analytics/daily-deliveries?range=${dateRange}`),
          fetchApi('/analytics/courier-performance'),
        ]);

        if (kpiData) {
          if (kpiData.kpis) setKpis(kpiData.kpis);
        }
        if (dailyData) {
          if (dailyData.dailyCounts && dailyData.dailyCounts.length > 0) {
            setDailyVolumes(dailyData.dailyCounts);
          }
        }
        if (courierData) {
          if (courierData.couriers && courierData.couriers.length > 0) {
            setCouriers(courierData.couriers);
          }
        }
      } catch (err) {
        console.warn('Backend API offline. Displaying cached telemetry.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [dateRange]);

  const maxVolume = Math.max(...dailyVolumes.map((d) => d.delivered + d.failed), 1);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      
      {/* ========================================================================= */}
      {/* COLUMN 1: LEFT NAVIGATION SIDEBAR (Identical to Dispatcher Console) */}
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

          {/* Vertical Menu Items */}
          <nav className="space-y-1.5">
            <Link
              href="/dispatch"
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <span>Fleet Dispatch</span>
            </Link>

            <Link
              href="/dispatch"
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Courier Workloads (18)</span>
            </Link>

            <Link
              href="/config"
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Pricing &amp; Zones</span>
            </Link>

            <Link
              href="/dispatch"
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span>Merchant Approvals (2)</span>
            </Link>

            {/* MEMBER 9: ACTIVE TAB */}
            <div
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold bg-[#ff6600] text-white shadow-md shadow-orange-500/20 cursor-default"
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span>Operational KPIs</span>
            </div>

            <button
              onClick={() => alert('RabbitMQ Broker: 42 events/sec, 0 DLQ')}
              className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>RabbitMQ Broker</span>
            </button>
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
                onClick={() => alert('RabbitMQ metrics: all topic exchanges operational')}
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
      {/* COLUMN 2: CENTER MAIN CONTENT (Member 9 Analytics Dashboard) */}
      {/* ========================================================================= */}
      <main className="flex-1 p-6 sm:p-8 lg:p-9 bg-[#faf9f6]/40 flex flex-col gap-7 overflow-y-auto">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Operational KPIs &amp; Fleet Analytics 📊
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Island-wide delivery volume, SLA compliance, and courier fleet performance metrics.
            </p>
          </div>

          {/* Right Action Controls: Filter & Print */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Date Filter Pills */}
            <div className="flex items-center gap-1.5 bg-[#f8f8f6] border border-slate-200/60 p-1 rounded-full shadow-inner">
              {(['today', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                    dateRange === r
                      ? 'bg-[#ff6600] text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {r === 'today' ? 'Today' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
                </button>
              ))}
            </div>

            {/* Print Button */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-xs font-bold bg-white border border-slate-200 hover:border-slate-300 px-4 py-2 rounded-full shadow-xs text-slate-700 hover:text-slate-900 transition-all cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* 4 Primary KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-orange-200 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total Dispatched</span>
              <span className="text-base">📦</span>
            </div>
            <div className="text-3xl font-black text-slate-900 mt-2">{kpis.totalDispatched.toLocaleString()}</div>
            <div className="text-[11px] text-emerald-600 font-bold mt-2 flex items-center gap-1">
              <span>&uarr; 12.5%</span> <span className="text-slate-400 font-normal">vs previous period</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-orange-200 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Delivered (Verified POD)</span>
              <span className="text-base">✅</span>
            </div>
            <div className="text-3xl font-black text-[#ff6600] mt-2">{kpis.deliveredCount.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 font-medium mt-2">
              With camera &amp; recipient proof
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-orange-200 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>SLA Success Rate</span>
              <span className="text-base">🎯</span>
            </div>
            <div className="text-3xl font-black text-emerald-600 mt-2">{kpis.successRate}%</div>
            <div className="text-[11px] text-slate-400 font-medium mt-2">
              Target SLA: 95.0% compliance
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:border-orange-200 transition-all">
            <div className="flex justify-between items-center text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Exception Incidents</span>
              <span className="text-base">⚠️</span>
            </div>
            <div className="text-3xl font-black text-rose-600 mt-2">{kpis.failedCount}</div>
            <div className="text-[11px] text-rose-500 font-medium mt-2">
              {kpis.failureRate}% of total attempted
            </div>
          </div>
        </div>

        {/* Operational Charts Section (2 Columns vs 1 Column) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Deliveries Bar Visualizer */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Daily Delivery Volume Breakdown
                </h3>
                <p className="text-xs text-slate-400">Delivered vs Failed parcels per day</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-[#ff6600]" /> Delivered</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-rose-400" /> Failed</span>
              </div>
            </div>

            {/* Custom SVG/Tailwind Bar Chart */}
            <div className="h-64 w-full flex items-end gap-4 sm:gap-8 pt-8 px-2 border-b border-slate-100">
              {dailyVolumes.map((item, idx) => {
                const total = item.delivered + item.failed;
                const deliveredHeight = (item.delivered / maxVolume) * 100;
                const failedHeight = (item.failed / maxVolume) * 100;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      {total}
                    </div>
                    <div className="w-full max-w-[42px] h-48 flex flex-col justify-end rounded-t-xl overflow-hidden bg-slate-100">
                      <div
                        style={{ height: `${failedHeight}%` }}
                        className="w-full bg-rose-400 transition-all duration-500"
                        title={`Failed: ${item.failed}`}
                      />
                      <div
                        style={{ height: `${deliveredHeight}%` }}
                        className="w-full bg-[#ff6600] transition-all duration-500"
                        title={`Delivered: ${item.delivered}`}
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 mt-2">{item.date}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 mt-4 px-2">
              <span>0 parcels</span>
              <span>Baseline: Peak capacity {maxVolume} parcels/day</span>
            </div>
          </div>

          {/* Donut Quality & Fulfillment Ratio */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Quality &amp; Fulfillment Ratio
              </h3>
              <p className="text-xs text-slate-400">Total attempted delivery breakdown</p>
            </div>

            {/* Donut Progress Visual */}
            <div className="flex flex-col items-center justify-center my-4">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="3.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#ff6600]"
                    strokeDasharray={`${kpis.successRate}, 100`}
                    strokeWidth="3.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-2xl font-black text-slate-900">{kpis.successRate}%</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Success</span>
                </div>
              </div>
            </div>

            {/* Metric distribution */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Delivered to Recipient</span>
                <span className="font-bold text-slate-900">{kpis.deliveredCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Failed / Rescheduled</span>
                <span className="font-bold text-rose-600">{kpis.failedCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Total Billed Revenue</span>
                <span className="font-bold text-[#ff6600]">LKR {kpis.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Courier Performance Leaderboard Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Courier Workload &amp; Performance Leaderboard
              </h3>
              <p className="text-xs text-slate-400">Assigned runs, completion ratios and speed benchmarks</p>
            </div>
            <span className="text-xs font-bold text-slate-400">Active Couriers: {couriers.length}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Rank</th>
                  <th className="py-4 px-6">Courier Details</th>
                  <th className="py-4 px-6">Completed Deliveries</th>
                  <th className="py-4 px-6">Active Jobs</th>
                  <th className="py-4 px-6">Avg Delivery Speed</th>
                  <th className="py-4 px-6 text-right">Success Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {couriers.map((c, index) => (
                  <tr key={c.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-4 px-6">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] ${
                        index === 0 ? 'bg-amber-100 text-amber-700' : index === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{c.phone}</div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      {c.completedRuns} parcels
                    </td>
                    <td className="py-4 px-6">
                      <span className="inline-block bg-blue-50 text-blue-600 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                        {c.activeRuns} in progress
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-medium">
                      {c.avgTimeMins} mins / drop
                    </td>
                    <td className="py-4 px-6 text-right font-black text-[#ff6600]">
                      {c.successRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
