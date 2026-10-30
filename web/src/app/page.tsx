'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
    <div className="w-full">
      {/* HERO SECTION */}
      <section className="relative w-full min-h-[660px] sm:min-h-[720px] lg:min-h-[800px] flex items-center pt-28 sm:pt-36 pb-16 overflow-hidden bg-[#e8e7e2]">
        {/* Full-bleed 3D Isometric Logistics Scene */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <Image
            src="/hero-bg.jpg"
            alt="SwiftDrop 3D Smart Logistics Hub"
            fill
            priority
            quality={95}
            className="object-cover object-right lg:object-center"
          />
          {/* Studio lighting gradient to ensure text readability on all viewports */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#e8e7e2] via-[#e8e7e2]/90 sm:via-[#e8e7e2]/70 md:via-[#e8e7e2]/30 to-transparent z-10" />
        </div>

        <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          {/* Left Column: Typography, Glassmorphism Search Bar & Stats */}
          <div className="max-w-xl flex flex-col gap-4 sm:gap-5 text-left">
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.25em] text-slate-400 uppercase">
              DELIVERING A BRIGHTER TOMORROW
            </span>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-[#111827] tracking-tight leading-[1.04]">
              Send<br />
              Anything.<br />
              <span className="text-[#ff6600]">Anywhere.</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base md:text-lg max-w-md leading-relaxed font-normal">
              Fast, reliable, and affordable delivery for individuals and businesses. From your doorstep to anywhere in the country.
            </p>

            {/* Glassmorphism Floating Booking / Search Bar */}
            <form
              onSubmit={handleQuickShip}
              className="flex items-center bg-white/85 backdrop-blur-xl p-1.5 sm:p-2 pl-4 sm:pl-5 rounded-full shadow-[0_12px_36px_0_rgba(0,0,0,0.08)] border border-white/90 max-w-lg focus-within:ring-2 focus-within:ring-[#ff6600]/30 focus-within:border-[#ff6600] transition-all mt-1"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0 text-[#ff6600]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Enter pickup location"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium"
                />
              </div>
              
              <div className="w-px h-6 bg-slate-200 mx-2 flex-shrink-0"></div>

              <div className="flex items-center flex-1 min-w-0">
                <input
                  type="text"
                  placeholder="Enter delivery location"
                  value={delivery}
                  onChange={(e) => setDelivery(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-10 h-10 sm:w-11 sm:h-11 bg-[#ff6600] hover:bg-[#ea580c] rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold shadow-md shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all flex-shrink-0 cursor-pointer ml-1"
                title="Calculate Fee & Ship"
              >
                <span>&rarr;</span>
              </button>
            </form>

            {/* Key Metrics Stats Row */}
            <div className="flex items-center gap-6 sm:gap-10 pt-3">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">1M+</span>
                <span className="text-xs text-slate-500 font-medium mt-0.5">Packages Delivered</span>
              </div>
              <div className="w-px h-8 bg-slate-300/70"></div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">99%</span>
                <span className="text-xs text-slate-500 font-medium mt-0.5">On-Time Delivery</span>
              </div>
              <div className="w-px h-8 bg-slate-300/70"></div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">24/7</span>
                <span className="text-xs text-slate-500 font-medium mt-0.5">Customer Support</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE SERVICES SECTION */}
      <section id="services" className="bg-white py-20 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold tracking-widest text-brand-orange bg-orange-50 px-3 py-1 rounded-full uppercase">
              OUR SERVICES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-3">
              Built for Speed, Engineered for Reliability
            </h2>
            <p className="text-slate-600 text-sm sm:text-base">
              Whether you are an individual sending a gift or an enterprise shipping thousands of parcels daily, SwiftDrop connects your goods across the island.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Service 1 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-brand-orange flex items-center justify-center text-2xl mb-5">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Same-Day Express</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                Urgent city-wide and inter-district parcel delivery with real-time pickup dispatch within minutes of booking.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li>✓ Doorstep pickup & drop-off</li>
                <li>✓ Instant SMS & WhatsApp tracking links</li>
                <li>✓ Server-calculated accurate distance rates</li>
              </ul>
            </div>

            {/* Service 2 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-5">
                📍
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Live GPS Tracking</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                WebSocket-powered milestone updates for both senders and recipients with clear status history timelines.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li>✓ Live courier location coordinates</li>
                <li>✓ Accurate estimated arrival times (ETA)</li>
                <li>✓ Public mobile tracking with privacy protection</li>
              </ul>
            </div>

            {/* Service 3 */}
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:shadow-lg transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-2xl mb-5">
                🏢
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Merchant Partner B2B</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4 flex-1">
                Automated order injection APIs and event-driven webhooks for e-commerce platforms, Shopify, and WooCommerce.
              </p>
              <ul className="text-xs text-slate-500 space-y-1.5">
                <li>✓ Secured REST Partner APIs (API Keys)</li>
                <li>✓ HMAC SHA-256 signed status webhooks</li>
                <li>✓ Automatic retries with Dead-Letter Queues (DLQ)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section id="process" className="py-20 bg-[#e8e7e2] border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold tracking-widest text-[#ff6600] bg-white border border-orange-200/80 px-3.5 py-1 rounded-full uppercase shadow-sm">
              SIMPLE 4-STEP PROCESS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-2">
              How SwiftDrop Works
            </h2>
            <p className="text-slate-600 text-sm">
              From online booking to verified delivery, our system keeps every party informed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-7 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="text-4xl font-black text-[#ff6600]/20 mb-2">01</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Book or Inject</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter parcel weight & dimensions for an instant server-verified fee quote, or inject via B2B API.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="text-4xl font-black text-[#ff6600]/20 mb-2">02</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Smart Dispatch</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dispatchers match parcels to nearby couriers balancing active fleet workloads across delivery zones.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="text-4xl font-black text-[#ff6600]/20 mb-2">03</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Real-Time Transit</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                RabbitMQ broker broadcasts status events triggering notifications and live tracking timeline updates.
              </p>
            </div>

            <div className="bg-white p-7 rounded-3xl border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
              <div className="text-4xl font-black text-[#ff6600]/20 mb-2">04</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Proof of Delivery</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Courier verifies delivery with doorstep camera photo or recipient signature, generating instant VAT receipts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ISLAND-WIDE COVERAGE & BUSINESS SECTION */}
      <section id="coverage" className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold tracking-widest text-brand-orange bg-orange-50 px-3 py-1 rounded-full uppercase">
                ISLAND-WIDE COVERAGE
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-4">
                Connecting Every District with Dedicated Sorting Hubs
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed mb-6">
                SwiftDrop operates high-capacity sorting hubs and automated courier stations spanning Western, Central, Southern, and Northern provinces.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="text-sm font-semibold text-slate-800">Colombo Urban & Greater Western Express (2-4 Hours)</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="text-sm font-semibold text-slate-800">Kandy Metro & Central Highlands Overnight Dispatch</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                  <span className="text-sm font-semibold text-slate-800">Southern Coastal Highway & Northern Province Logistics</span>
                </div>
              </div>

              <div className="mt-8 flex gap-4">
                <Link
                  href="/booking"
                  className="px-6 py-3 bg-brand-dark hover:bg-brand-dark-hover text-white text-sm font-bold rounded-full transition-all shadow-md"
                >
                  Book a Delivery
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-full transition-all"
                >
                  Partner With Us
                </Link>
              </div>
            </div>

            <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl shadow-xl">
              <div className="text-xs uppercase tracking-widest text-brand-orange font-bold mb-2">FOR BUSINESSES & MERCHANTS</div>
              <h3 className="text-2xl font-extrabold mb-3">Scale Your E-Commerce Delivery</h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-6">
                Connect your store directly with SwiftDrop&apos;s Partner API. Automated tracking numbers, bulk labels, and webhooks straight to your ERP or store.
              </p>

              <div className="bg-slate-950/70 p-4 rounded-xl font-mono text-xs text-slate-300 border border-slate-700/50 mb-6 overflow-x-auto">
                <span className="text-emerald-400">POST</span> /api/v1/merchant/partner/orders<br />
                <span className="text-slate-500">Host:</span> api.swiftdrop.local<br />
                <span className="text-slate-500">X-API-KEY:</span> sw_live_9a7d2e...
              </div>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-orange hover:bg-brand-orange-dark text-white text-xs font-bold rounded-full transition-all"
              >
                Sign In to Merchant Portal &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRANSPARENT PRICING SECTION */}
      <section id="pricing" className="py-20 bg-[#e8e7e2] border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold tracking-widest text-[#ff6600] bg-white border border-orange-200/80 px-3.5 py-1 rounded-full uppercase shadow-sm">
              TRANSPARENT RATES
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-3 mb-2">
              Simple, Predictable Island-Wide Pricing
            </h2>
            <p className="text-slate-600 text-sm">
              No hidden fuel surcharges. Server-calculated transparent pricing based on real-time distance and weight.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Tier 1 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Standard Delivery</span>
                <div className="flex items-baseline gap-1 mt-3 mb-2">
                  <span className="text-4xl font-black text-slate-900">$4.50</span>
                  <span className="text-xs text-slate-500 font-medium">/ parcel</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Reliable next-day delivery across municipal and inter-district zones.
                </p>
                <ul className="space-y-3 text-xs text-slate-700 pb-8 border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Up to 2 kg parcel weight included
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Real-time GPS & milestone tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Free doorstep pickup
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> SMS & WhatsApp recipient alerts
                  </li>
                </ul>
              </div>
              <Link
                href="/booking"
                className="w-full py-3 text-center bg-white hover:bg-orange-50 text-[#ff6600] border border-orange-200/80 rounded-full font-bold text-xs transition-all"
              >
                Book Standard Parcel
              </Link>
            </div>

            {/* Tier 2 - Most Popular */}
            <div className="bg-white p-8 rounded-3xl border-2 border-[#ff6600] shadow-xl relative flex flex-col justify-between">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff6600] text-white px-3.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md shadow-orange-500/20">
                MOST POPULAR
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#ff6600]">Same-Day Express</span>
                <div className="flex items-baseline gap-1 mt-3 mb-2">
                  <span className="text-4xl font-black text-slate-900">$8.50</span>
                  <span className="text-xs text-slate-500 font-medium">/ parcel</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Urgent doorstep delivery within 2-4 hours anywhere in urban hubs.
                </p>
                <ul className="space-y-3 text-xs text-slate-700 pb-8 border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Priority courier dispatch in 10 mins
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Direct point-to-point transit
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Digital recipient signature & camera proof
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> $100 complimentary cargo guarantee
                  </li>
                </ul>
              </div>
              <Link
                href="/booking"
                className="w-full py-3 text-center bg-[#ff6600] hover:bg-[#ea580c] text-white rounded-full font-bold text-xs shadow-lg shadow-orange-500/25 transition-all"
              >
                Ship Express Now
              </Link>
            </div>

            {/* Tier 3 */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/90 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Merchant B2B Volume</span>
                <div className="flex items-baseline gap-1 mt-3 mb-2">
                  <span className="text-3xl font-black text-slate-900">Custom SLA</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed mb-6">
                  Dedicated volume pricing for high-throughput e-commerce stores.
                </p>
                <ul className="space-y-3 text-xs text-slate-700 pb-8 border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Secured REST Partner APIs & Webhooks
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Bulk CSV automated waybill printing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Dedicated fleet dispatch manager
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-[#ff6600] font-bold">✓</span> Automated reconciliation & monthly billing
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full py-3 text-center bg-white hover:bg-orange-50 text-[#ff6600] border border-orange-200/80 rounded-full font-bold text-xs transition-all"
              >
                Merchant Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            <div>
              <span className="text-2xl font-black tracking-tight">
                swiftdrop<span className="text-brand-orange">.</span>
              </span>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Modern enterprise parcel delivery and logistics management system operating island-wide.
              </p>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Navigation</h5>
              <ul className="text-xs text-slate-300 space-y-2">
                <li><Link href="/booking" className="hover:text-white transition-colors">Book Parcel</Link></li>
                <li><Link href="/tracking/SWIFT-DEMO" className="hover:text-white transition-colors">Public Tracking</Link></li>
                <li><Link href="/login" className="hover:text-white transition-colors">Sign In Portal</Link></li>
                <li><Link href="/exceptions" className="hover:text-white transition-colors">Customer Support</Link></li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Platform Tech</h5>
              <ul className="text-xs text-slate-300 space-y-2">
                <li>RabbitMQ Event Messaging</li>
                <li>WebSocket Real-time Updates</li>
                <li>Kubernetes Containerized</li>
                <li>Gemini AI Smart Assistant</li>
              </ul>
            </div>

            <div>
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Operations</h5>
              <p className="text-xs text-slate-400">Headquarters: Colombo, Sri Lanka</p>
              <p className="text-xs text-slate-400 mt-1">Dispatch Support: support@swiftdrop.com</p>
              <p className="text-xs text-slate-400 mt-1">Hotline: +94 11 234 5678</p>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
            <p>&copy; 2026 SwiftDrop Logistics System. All rights reserved.</p>
            <p>10-Member Enterprise Application Team Project</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
