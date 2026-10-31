'use client';

import Link from 'next/link';

export default function ServiceConfigPage() {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Operations Config
          </span>
        </div>
        <Link
          href="/dispatch"
          className="text-xs font-bold text-[#ff6600] hover:underline"
        >
          &larr; Back to Dispatch Console
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 sm:px-10 py-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Service Rates &amp; Zone Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Administrator control panel for distance pricing, base delivery fees, and partner verification.
          </p>
        </div>

        <div className="space-y-6">
          {/* Rate Matrix */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4">
              Base Delivery Rate Matrix
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Base Booking Fee ($)
                </label>
                <input
                  type="number"
                  defaultValue="10.00"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Per Kilogram Surcharge ($)
                </label>
                <input
                  type="number"
                  defaultValue="2.50"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Per Kilometer Distance Rate ($)
                </label>
                <input
                  type="number"
                  defaultValue="1.20"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#ff6600]"
                />
              </div>
            </div>

            <button
              onClick={() => alert('Pricing parameters updated successfully!')}
              className="px-6 py-2.5 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              Save Rate Configuration
            </button>
          </div>

          {/* Pending Merchant Approvals */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)]">
            <h3 className="text-base font-black text-slate-900 tracking-tight mb-4">
              Pending Merchant Partner Approvals
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 gap-4">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Acme Electronics LLC</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Registration: #LK-8877123 &bull; Western Province</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => alert('Merchant Acme Electronics approved!')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Approve Partner
                </button>
                <button
                  onClick={() => alert('Merchant rejected')}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
