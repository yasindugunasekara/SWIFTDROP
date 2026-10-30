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
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[520px]">
          {/* Left Column: Typography, Search Bar & Stats */}
          <div className="lg:col-span-7 flex flex-col gap-4 text-left">
            <span className="text-[0.7rem] sm:text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
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
              className="flex items-center bg-white p-1.5 pl-5 rounded-full shadow-[0_10px_30px_-4px_rgba(0,0,0,0.08)] border border-slate-200/90 max-w-lg focus-within:ring-2 focus-within:ring-brand-orange/30 focus-within:border-brand-orange transition-all"
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

          {/* Right Column: 3D Isometric Logistics Hub Rendering */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="relative w-full max-w-lg aspect-[446/487] rounded-3xl overflow-hidden shadow-2xl border border-white/80 bg-white">
              <Image
                src="/hero-3d.png"
                alt="SwiftDrop 3D Smart Logistics Hub"
                fill
                priority
                className="object-cover object-center"
              />
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
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-bold tracking-widest text-brand-orange bg-orange-50 px-3 py-1 rounded-full uppercase">
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
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="text-4xl font-black text-slate-200 mb-2">01</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Book or Inject</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter parcel weight & dimensions for an instant server-verified fee quote, or inject via B2B API.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="text-4xl font-black text-slate-200 mb-2">02</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Smart Dispatch</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dispatchers match parcels to nearby couriers balancing active fleet workloads across delivery zones.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="text-4xl font-black text-slate-200 mb-2">03</div>
              <h4 className="text-base font-bold text-slate-900 mb-1.5">Real-Time Transit</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                RabbitMQ broker broadcasts status events triggering notifications and live tracking timeline updates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative">
              <div className="text-4xl font-black text-slate-200 mb-2">04</div>
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
