'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CustomerDashboardPage() {
  const [activeDuty, setActiveDuty] = useState('book');
  const [activeCategory, setActiveCategory] = useState('box');
  const [packageSize, setPackageSize] = useState('medium');
  const [quantity, setQuantity] = useState(1);
  const [addons, setAddons] = useState({
    fragile: true,
    signature: true,
    express: false,
  });
  const [bookedSuccess, setBookedSuccess] = useState(false);

  const priceMap: Record<string, number> = {
    small: 4.50,
    medium: 12.50,
    large: 24.00,
  };

  const currentPrice = (priceMap[packageSize] || 12.50) + (addons.fragile ? 2.0 : 0) + (addons.signature ? 1.5 : 0) + (addons.express ? 5.0 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-10">
      {/* Outer Dashboard Card matching reference UI */}
      <div className="bg-white rounded-[32px] p-6 lg:p-8 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.06)] border border-slate-200/90">
        
        {/* TOP NAVBAR FOR CUSTOMER ROLE */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              swiftdrop<span className="text-brand-orange">.</span>
            </span>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-sky-100 text-sky-700 rounded-full">
              Customer Portal
            </span>
          </div>

          {/* Role Duty Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {[
              { id: 'book', label: 'Book Delivery', icon: '📦' },
              { id: 'track', label: 'Track Parcel', icon: '📍' },
              { id: 'history', label: 'History & Receipts', icon: '📜' },
              { id: 'addresses', label: 'Saved Addresses', icon: '🏠' },
              { id: 'support', label: 'Help / Support', icon: '💬' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDuty(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeDuty === tab.id
                    ? 'bg-orange-50 text-brand-orange border border-orange-200/60 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Quick Search & Summary Pill */}
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors cursor-pointer">
              🔍
            </button>
            <div className="flex items-center gap-2 bg-brand-orange text-white px-4 py-2 rounded-full text-xs font-bold shadow-sm">
              <span>🛍️</span>
              <span>3 Shipments</span>
            </div>
          </div>
        </div>

        {/* TWO-COLUMN DASHBOARD GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT / CENTER MAJOR WORKSPACE (approx 68% width) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Category Filter Pills */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Parcel Category
                </span>
                <button className="text-xs text-brand-orange font-semibold">Filter options</button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {[
                  { id: 'box', label: 'Standard Box' },
                  { id: 'document', label: 'Document / Letter' },
                  { id: 'electronics', label: 'Fragile Electronics' },
                  { id: 'apparel', label: 'Clothing & Apparel' },
                  { id: 'heavy', label: 'Heavy Cargo' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      activeCategory === cat.id
                        ? 'bg-brand-dark text-white shadow-sm'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* HERO FEATURED ITEM CARD */}
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row gap-8 items-center">
              {/* Left Item Visual */}
              <div className="w-full md:w-5/12 flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="w-40 h-40 relative flex items-center justify-center text-7xl animate-pulse">
                  📦
                </div>
                <div className="text-center mt-3">
                  <span className="text-xs font-bold text-slate-800">Swift Priority Carton</span>
                  <p className="text-[0.7rem] text-slate-400">32 x 24 x 18 cm • Recyclable</p>
                </div>
              </div>

              {/* Right Detail & Customization */}
              <div className="w-full md:w-7/12 flex flex-col gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    Standard Express Box
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Ideal for electronics, apparel, and documents. Includes island-wide barcode tracking and verified recipient signature.
                  </p>
                </div>

                {/* Package Size Chips */}
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    SELECT WEIGHT & SIZE
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: 'small', label: '< 1 kg (Small)' },
                      { id: 'medium', label: '1 - 5 kg (Medium)' },
                      { id: 'large', label: '5 - 15 kg (Large)' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setPackageSize(s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          packageSize === s.id
                            ? 'bg-brand-dark text-white border-brand-dark'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Build / Add-on Options */}
                <div>
                  <label className="text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    CUSTOM PROTECTION & SPEED
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setAddons({ ...addons, fragile: !addons.fragile })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        addons.fragile ? 'bg-orange-50 border-orange-300 text-brand-orange' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>🛡️</span>
                      <span>Fragile Bubble (+ $2)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddons({ ...addons, signature: !addons.signature })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        addons.signature ? 'bg-orange-50 border-orange-300 text-brand-orange' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>✍️</span>
                      <span>Signature (+ $1.5)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddons({ ...addons, express: !addons.express })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                        addons.express ? 'bg-orange-50 border-orange-300 text-brand-orange' : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      <span>⚡</span>
                      <span>Same-Day (+ $5)</span>
                    </button>
                  </div>
                </div>

                {/* Counter & Add to Order Bar */}
                <div className="flex items-center gap-4 pt-2">
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-3 py-1.5 shadow-sm">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-sm font-bold text-slate-800">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-sm cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center bg-brand-dark text-white rounded-full overflow-hidden shadow-md flex-1">
                    <div className="px-5 py-2.5 font-bold text-sm bg-slate-800">
                      ${(currentPrice * quantity).toFixed(2)}
                    </div>
                    <button
                      onClick={() => alert(`Added ${quantity} parcel(s) to shipment list!`)}
                      className="px-5 py-2.5 text-xs font-bold hover:bg-slate-800 transition-colors flex-1 text-center cursor-pointer"
                    >
                      Add to Shipment
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RECOMMENDED RECENT DESTINATIONS / PRESETS */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-3">
                Quick Destination Presets
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { title: 'Colombo 03 Home', dest: '34 Duplication Rd', tag: 'Frequent', price: '$4.50' },
                  { title: 'Kandy Sorting Hub', dest: 'Central Highlands', tag: 'Warehouse', price: '$8.20' },
                  { title: 'Galle Coastal Hub', dest: '45 Galle Rd, South', tag: 'Branch', price: '$6.50' },
                ].map((dest, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm hover:border-slate-300 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center text-lg">
                        📍
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{dest.title}</h4>
                        <p className="text-[0.7rem] text-slate-500">{dest.dest}</p>
                        <span className="text-xs font-bold text-brand-orange">{dest.price}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => alert(`Selected destination: ${dest.title}`)}
                      className="w-8 h-8 rounded-full bg-slate-900 hover:bg-brand-orange text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE PANEL: ORDER / SUMMARY DRAWER (approx 32% width) */}
          <div className="lg:col-span-4 bg-slate-50/80 rounded-3xl p-6 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Current Booking</h3>
                <span className="text-xs text-slate-500 font-semibold">3 parcels</span>
              </div>

              {/* Items in Cart / Booking List */}
              <div className="flex flex-col gap-3">
                {[
                  { name: 'Document Envelope', weight: '150g', fee: 4.50, icon: '📄' },
                  { name: 'Electronics Package', weight: '1.2 kg', fee: 12.50, icon: '📦' },
                  { name: 'Express Care Gift', weight: '800g', fee: 6.20, icon: '🎁' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                        <span className="text-[0.7rem] text-slate-400">{item.weight}</span>
                        <div className="text-xs font-bold text-brand-orange">${item.fee.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-full text-xs font-bold text-slate-700">
                      <span>1</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code Input */}
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200">
                <div className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-medium">PROMOCODE</span>
                  <span className="font-bold text-slate-800">SWIFTDROP20 ✓</span>
                </div>
              </div>

              {/* Price Calculation Breakdown */}
              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Fee</span>
                  <span className="font-semibold text-slate-800">$23.20</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Promocode Discount (10%)</span>
                  <span>-$2.32</span>
                </div>
                <div className="flex justify-between">
                  <span>Standard Doorstep Pickup</span>
                  <span className="text-emerald-600 font-bold uppercase">FREE</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                  <span>TOTAL ESTIMATE</span>
                  <span className="text-brand-orange text-base">$20.88</span>
                </div>
              </div>
            </div>

            {/* Confirm Order CTA Button */}
            <div className="mt-6">
              {bookedSuccess ? (
                <div className="p-3 bg-emerald-100 text-emerald-800 rounded-2xl text-center text-xs font-bold">
                  ✓ Booking Confirmed! Tracking: SWIFT-{Math.floor(100000 + Math.random() * 900000)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setBookedSuccess(true)}
                  className="w-full py-4 bg-brand-orange hover:bg-brand-orange-dark text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/25 transition-all cursor-pointer"
                >
                  Confirm Order & Generate Waybill
                </button>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
