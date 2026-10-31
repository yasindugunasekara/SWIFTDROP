'use client';

import Link from 'next/link';

export default function HistoryPage() {
  const history = [
    {
      id: 'SWIFT-782910',
      recipient: 'Alice Johnson',
      address: '45 Duplication Rd, Colombo 03',
      date: 'Oct 30, 2026',
      fee: '$17.50',
      status: 'DELIVERED',
      method: 'Credit Card',
    },
    {
      id: 'SWIFT-882233',
      recipient: 'Emily Davis',
      address: '10 Downing St, Colombo 07',
      date: 'Oct 29, 2026',
      fee: '$12.00',
      status: 'DELIVERED',
      method: 'SwiftDrop Wallet',
    },
    {
      id: 'SWIFT-991122',
      recipient: 'Robert Smith',
      address: '742 Evergreen Terrace, Sector 4',
      date: 'Oct 28, 2026',
      fee: '$8.50',
      status: 'DELIVERED',
      method: 'Promo Voucher',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-white flex flex-col font-sans antialiased text-slate-800">
      {/* Top Header */}
      <header className="w-full bg-white border-b border-slate-100 px-6 sm:px-10 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-2xl font-black text-slate-900 tracking-tight">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </Link>
          <span className="text-xs font-bold bg-orange-50 text-[#ff6600] border border-orange-200/80 px-2.5 py-0.5 rounded-full">
            Customer Receipts
          </span>
        </div>
        <Link
          href="/booking"
          className="text-xs font-bold text-[#ff6600] hover:underline"
        >
          &larr; Back to Dashboard
        </Link>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 sm:px-10 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Order History &amp; Official Receipts
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              View your past deliveries, tracking codes, and download certified VAT tax invoices.
            </p>
          </div>
          <button
            onClick={() => alert('Exporting all tax receipts as PDF statement...')}
            className="px-5 py-2.5 bg-[#ff9900] hover:bg-[#ff8800] text-white font-black text-xs rounded-xl shadow-md shadow-orange-500/20 transition-all cursor-pointer self-start sm:self-auto"
          >
            Download Annual Tax Statement &rarr;
          </button>
        </div>

        {/* History Table */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3.5 px-6">Tracking #</th>
                <th className="py-3.5 px-6">Recipient &amp; Destination</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Fee Paid</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Waybill &amp; Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((order) => (
                <tr key={order.id} className="hover:bg-orange-50/20 transition-colors">
                  <td className="py-4 px-6 font-black text-slate-900">
                    <Link href={`/tracking/${order.id}`} className="hover:text-[#ff6600] transition-colors">
                      {order.id}
                    </Link>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-900 block">{order.recipient}</span>
                    <span className="text-slate-400 text-[11px] block">{order.address}</span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">{order.date}</td>
                  <td className="py-4 px-6">
                    <span className="font-black text-slate-900 block">{order.fee}</span>
                    <span className="text-slate-400 text-[10px] block">{order.method}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-200">
                      ✓ {order.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => alert(`Downloading VAT invoice for ${order.id}...`)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-orange-200 hover:text-[#ff6600] text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      PDF Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
