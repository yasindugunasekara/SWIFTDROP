'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [pickup, setPickup] = useState('');
  const [delivery, setDelivery] = useState('');

  const handleQuickShip = (e: React.FormEvent) => {
    e.preventDefault();
    if (pickup || delivery) {
      router.push(`/booking?pickup=${encodeURIComponent(pickup)}&delivery=${encodeURIComponent(delivery)}`);
    } else {
      router.push('/booking');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-20">
      {/* HERO SECTION */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center min-h-[540px] mb-16 pt-4">
        {/* Left Column: Typography, Search Bar & Stats */}
        <div className="lg:col-span-7 flex flex-col gap-4 text-left">
          <span className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
            DELIVERING A BRIGHTER TOMORROW
          </span>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-slate-900 tracking-tight leading-[1.05]">
            Send<br />
            Anything.<br />
            <span className="text-brand-orange">Anywhere.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-lg leading-relaxed pt-1 pb-1">
            Fast, reliable, and affordable delivery for individuals and businesses.
            From your doorstep to anywhere in the country.
          </p>

          {/* Floating Pill Booking Bar */}
          <form
            onSubmit={handleQuickShip}
            className="flex items-center bg-white p-1.5 pl-5 rounded-full shadow-lg border border-slate-200/90 max-w-lg focus-within:ring-2 focus-within:ring-brand-orange/30 focus-within:border-brand-orange transition-all"
          >
            <div className="flex items-center gap-2 flex-1">
              <span className="text-base">📦</span>
              <input
                type="text"
                placeholder="Enter pickup location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400"
              />
            </div>
            
            <div className="w-px h-7 bg-slate-200 mx-2"></div>

            <div className="flex items-center flex-1">
              <input
                type="text"
                placeholder="Enter delivery location"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-11 h-11 bg-brand-orange hover:bg-brand-orange-dark rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md hover:scale-105 transition-all flex-shrink-0 cursor-pointer"
              title="Calculate Fee & Ship"
            >
              <span>&rarr;</span>
            </button>
          </form>

          {/* Stats Metrics */}
          <div className="flex items-center gap-6 sm:gap-8 pt-4">
            <div className="flex flex-col">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">1M+</div>
              <div className="text-xs text-slate-500 font-medium">Packages Delivered</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">99%</div>
              <div className="text-xs text-slate-500 font-medium">On-Time Delivery</div>
            </div>
            <div className="w-px h-8 bg-slate-200"></div>
            <div className="flex flex-col">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">24/7</div>
              <div className="text-xs text-slate-500 font-medium">Customer Support</div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Isometric Logistics Hub Composition */}
        <div className="lg:col-span-5 relative flex items-center justify-center">
          <div className="relative w-full max-w-md h-[460px] bg-gradient-to-br from-white via-slate-50 to-slate-100 rounded-3xl shadow-xl border border-white overflow-hidden">
            {/* Main Swift Hub Facility */}
            <div className="absolute top-7 right-7 w-64 h-48 bg-white rounded-2xl shadow-md border border-slate-100 p-4">
              <div className="mb-2">
                <span className="text-xl font-black text-slate-900">swift<span className="text-brand-orange">.</span></span>
              </div>
              <div className="absolute bottom-0 left-4 w-28 h-20 bg-brand-orange rounded-t-xl flex items-end justify-center">
                <div className="w-16 h-12 bg-slate-900 rounded-t-lg"></div>
              </div>
              <div className="absolute bottom-5 right-5 text-xs font-semibold text-slate-500 max-w-[80px] leading-tight">
                <span>Moves What Matters</span>
              </div>
              <div className="absolute top-0 right-0 w-24 h-full bg-brand-orange rounded-r-2xl p-3 text-white text-[0.65rem] font-bold flex flex-col justify-center gap-1 shadow-inner">
                <span>Packages</span>
                <span>People</span>
                <span>Possibilities</span>
              </div>
            </div>

            {/* Conveyor Belt & Moving Parcels */}
            <div className="absolute bottom-28 left-6 w-72 h-10 bg-slate-900 rounded-full flex items-center justify-around px-4 shadow-lg text-lg">
              <span className="animate-bounce">📦</span>
              <span className="animate-pulse">📦</span>
              <span>📦</span>
            </div>

            {/* Swift Delivery Van */}
            <div className="absolute bottom-7 right-7 bg-white px-4 py-2.5 rounded-2xl shadow-lg border border-slate-200 flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🚐</span>
                <span className="font-extrabold text-slate-900 text-sm">swift<span className="text-brand-orange">.</span></span>
              </div>
              <span className="text-xs font-semibold bg-orange-100 text-brand-orange px-2 py-0.5 rounded-md">
                Express Courier
              </span>
            </div>

            {/* Road Sign Pills */}
            <div className="absolute top-14 right-3 bg-white text-slate-700 px-3 py-1 rounded-full text-[0.7rem] font-bold shadow-sm border border-slate-100">
              Faster
            </div>
            <div className="absolute top-22 right-3 bg-white text-slate-700 px-3 py-1 rounded-full text-[0.7rem] font-bold shadow-sm border border-slate-100">
              Safer
            </div>
            <div className="absolute top-30 right-3 bg-white text-slate-700 px-3 py-1 rounded-full text-[0.7rem] font-bold shadow-sm border border-slate-100">
              Closer
            </div>

            <div className="absolute bottom-9 left-7 bg-white px-3 py-1.5 rounded-lg text-xs font-bold text-brand-orange shadow-md border-l-4 border-brand-orange">
              More Than Delivery
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-ROLE QUICK ACCESS PORTALS */}
      <section className="pt-8 border-t border-slate-200">
        <div className="text-center mb-10">
          <span className="text-xs font-bold tracking-wider text-brand-orange bg-orange-50 px-3 py-1 rounded-full uppercase">
            ROLE-BASED WORKSPACES
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 mb-1">
            Select Your SwiftDrop Portal
          </h2>
          <p className="text-sm text-slate-500">
            Access your dedicated role workspace or test specific workflows.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Customer */}
          <Link
            href="/booking"
            className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col no-underline group"
          >
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-brand-orange flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              📦
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Customer Portal</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">
              Book parcel delivery, preview server-calculated fees, track live, and download VAT receipts.
            </p>
            <span className="text-xs font-bold text-brand-orange flex items-center gap-1 group-hover:gap-2 transition-all">
              Open Booking &rarr;
            </span>
          </Link>

          {/* Courier */}
          <Link
            href="/tasks"
            className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col no-underline group"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🚚
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Courier Task Queue</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">
              View daily assigned routes, update status on-the-go, and capture camera delivery proof.
            </p>
            <span className="text-xs font-bold text-brand-orange flex items-center gap-1 group-hover:gap-2 transition-all">
              View Assigned Jobs &rarr;
            </span>
          </Link>

          {/* Merchant */}
          <Link
            href="/portal"
            className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col no-underline group"
          >
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🏢
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Merchant B2B</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">
              Connect e-commerce stores, inject B2B API orders, manage API keys, and monitor webhook logs.
            </p>
            <span className="text-xs font-bold text-brand-orange flex items-center gap-1 group-hover:gap-2 transition-all">
              Access B2B Orders &rarr;
            </span>
          </Link>

          {/* Dispatcher & Admin */}
          <Link
            href="/dispatch"
            className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col no-underline group"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
              🎛️
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">Dispatch & Operations</h3>
            <p className="text-xs text-slate-600 leading-relaxed mb-4 flex-1">
              Balance courier fleet workloads, assign unassigned packages, configure zone pricing, and view analytics.
            </p>
            <span className="text-xs font-bold text-brand-orange flex items-center gap-1 group-hover:gap-2 transition-all">
              Launch Dispatch Board &rarr;
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
