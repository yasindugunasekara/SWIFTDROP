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
      <section id="services" className="bg-white py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="inline-block text-xs font-extrabold tracking-widest text-[#ff6600] bg-orange-50/90 border border-orange-200/80 px-4 py-1.5 rounded-full uppercase shadow-sm">
              OUR SERVICES
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 mt-4 mb-3 tracking-tight">
              Solutions to Grow Your Business
            </h2>
            <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
              We offer high-velocity logistics infrastructure to help individuals and businesses scale across the island.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
            {[
              {
                title: "Same-Day Express",
                desc: "Urgent intra-city & province parcel delivery with priority rider dispatch in under 10 minutes.",
                image: "/service-express.jpg",
                link: "/booking",
              },
              {
                title: "Live GPS Tracking",
                desc: "Real-time WebSocket milestone updates, live map coordinates, and dynamic arrival estimates.",
                image: "/service-tracking.jpg",
                link: "/#process",
              },
              {
                title: "Merchant Partner B2B",
                desc: "Automated order injection APIs, bulk waybill generation, and event-driven HMAC webhooks.",
                image: "/service-api.jpg",
                link: "/portal",
              },
              {
                title: "Verified Delivery POD",
                desc: "Doorstep camera verification, recipient digital signature, and instant VAT invoice generation.",
                image: "/service-pod.jpg",
                link: "/#coverage",
              },
            ].map((service, idx) => (
              <a
                key={idx}
                href={service.link}
                className="group relative bg-gradient-to-b from-[#fffaf4] via-white to-white rounded-[28px] p-6 sm:p-7 border border-slate-100/90 hover:border-orange-200/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_45px_-10px_rgba(255,102,0,0.14)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Subtle top warm spotlight */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-orange-100/30 to-transparent pointer-events-none" />

                {/* 3D Thematic Graphic Container */}
                <div className="h-44 sm:h-48 w-full flex items-center justify-center p-2 mb-4 relative z-10">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="max-h-full max-w-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform duration-500 rounded-2xl"
                  />
                </div>

                {/* Text Content */}
                <div className="relative z-10 flex-1 flex flex-col">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-[#ff6600] transition-colors mb-2 leading-snug">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal mb-6 flex-1">
                    {service.desc}
                  </p>

                  {/* Bottom Action Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100/90 mt-auto">
                    <span className="text-sm font-extrabold text-slate-900 group-hover:text-[#ff6600] transition-colors">
                      Learn more
                    </span>
                    <div className="w-9 h-9 rounded-full bg-[#ff6600] group-hover:bg-[#e65c00] text-white flex items-center justify-center shadow-md shadow-orange-500/25 group-hover:scale-105 transition-all">
                      <svg
                        className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / INFOGRAPHIC SECTION */}
      <section id="process" className="py-24 bg-[#e8e7e2] border-t border-slate-200/60 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Infographic Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-4 max-w-xs mx-auto mb-3">
              <div className="h-px bg-slate-300 flex-1" />
              <span className="text-xs font-black tracking-[0.25em] text-[#ff6600] uppercase">
                LOGISTICS INFOGRAPHIC
              </span>
              <div className="h-px bg-slate-300 flex-1" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 mt-2 mb-3 tracking-tight">
              How SwiftDrop Works
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              From online booking to verified delivery, our system keeps every party informed.
            </p>
          </div>

          {/* 4 Steps Infographic Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 pt-4">
            {[
              {
                step: "01",
                title: "Book or Inject",
                desc: "Enter parcel weight & dimensions for an instant server-verified fee quote, or inject directly via B2B REST API.",
                icon: (
                  <svg className="w-7 h-7 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                ),
              },
              {
                step: "02",
                title: "Smart Dispatch",
                desc: "Dispatchers match parcels to nearby couriers balancing active fleet workloads across regional delivery zones.",
                icon: (
                  <svg className="w-7 h-7 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                step: "03",
                title: "Real-Time Transit",
                desc: "RabbitMQ broker broadcasts status events triggering notifications and live WebSocket tracking timeline updates.",
                icon: (
                  <svg className="w-7 h-7 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                step: "04",
                title: "Proof of Delivery",
                desc: "Courier verifies delivery with doorstep camera photo or recipient signature, generating instant VAT receipts.",
                icon: (
                  <svg className="w-7 h-7 text-[#ff6600]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
              },
            ].map((item, idx) => (
              <div key={idx} className="group flex flex-col items-center">
                {/* Top Arched Cap */}
                <div className="w-24 h-11 bg-[#ff6600] text-white font-black text-base flex items-center justify-center rounded-t-2xl shadow-sm tracking-wider relative z-0 transition-transform duration-300 group-hover:-translate-y-1">
                  {item.step}
                </div>

                {/* Main Glassmorphic Card */}
                <div className="w-full relative z-10 bg-white/95 backdrop-blur-md rounded-[28px] p-6 sm:p-7 border border-white/90 shadow-[0_12px_35px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_45px_rgba(255,102,0,0.13)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col items-center text-center flex-1">
                  {/* Subtle top warm ambient glow behind the icon */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-b from-orange-100/70 via-orange-50/40 to-transparent flex items-center justify-center mb-5 p-1 transition-transform duration-300 group-hover:scale-105">
                    {/* Elevated circular icon badge */}
                    <div className="w-16 h-16 rounded-full bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-orange-100/80 flex items-center justify-center">
                      {item.icon}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide mb-2 group-hover:text-[#ff6600] transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-xs sm:text-[13px] text-slate-500 leading-relaxed font-normal mb-6 flex-1">
                    {item.desc}
                  </p>

                  {/* Bottom-right double chevron arrow */}
                  <div className="w-full flex justify-end mt-auto pt-2">
                    <div className="text-[#ff6600] opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT US / ISLAND-WIDE COVERAGE SECTION */}
      <section id="coverage" className="py-24 bg-white border-t border-slate-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Column: Heading & Connected Timeline Features */}
            <div className="lg:col-span-5 flex flex-col">
              <span className="text-xs font-black tracking-widest text-[#ff6600] uppercase mb-2">
                ABOUT US
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-[44px] font-black text-slate-900 tracking-tight leading-[1.12] mb-4">
                World&apos;s Leading Logistics &amp; Sorting Provider.
              </h2>

              {/* Decorative Divider */}
              <div className="flex items-center gap-2 mb-8">
                <div className="w-10 h-0.5 bg-[#ff6600]" />
                <span className="text-xs font-black text-[#ff6600] tracking-widest">››</span>
                <div className="w-6 h-0.5 bg-orange-200" />
              </div>

              {/* Connected Timeline Features */}
              <div className="relative pl-2 space-y-7 mb-9">
                {/* Vertical connecting line */}
                <div className="absolute left-[26px] top-6 bottom-6 w-0.5 bg-orange-100" />

                {[
                  {
                    title: "Global Standards & Hubs",
                    desc: "High-capacity automated sorting facilities spanning Western, Central, Southern, and Northern provinces.",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    ),
                  },
                  {
                    title: "Automated Fleet Dispatch",
                    desc: "Intelligent algorithmic parcel matching balancing active on-road couriers and delivery workloads.",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    title: "Verified Real-Time POD",
                    desc: "Doorstep photo capture and digital recipient signature with instant tamper-proof VAT invoices.",
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                ].map((item, idx) => (
                  <div key={idx} className="relative flex items-start gap-4">
                    {/* Icon Circle */}
                    <div className="relative z-10 w-11 h-11 rounded-full bg-[#ff6600] text-white flex items-center justify-center shadow-md shadow-orange-500/25 flex-shrink-0">
                      {item.icon}
                    </div>
                    {/* Content */}
                    <div className="pt-0.5">
                      <h4 className="text-base font-extrabold text-slate-900 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Button */}
              <div>
                <Link
                  href="/booking"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 hover:bg-[#ff6600] text-white text-xs sm:text-sm font-extrabold uppercase tracking-wider rounded-lg transition-all shadow-md group"
                >
                  <span>Learn More</span>
                  <svg
                    className="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right Column: Top Explanatory Paragraph, Photo & Overlapping Stats Banner */}
            <div className="lg:col-span-7 flex flex-col">
              {/* Top Explanatory Paragraph */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal mb-8 max-w-xl">
                SwiftDrop operates high-capacity sorting facilities and express courier distribution centers spanning Western, Central, Southern, and Northern provinces. Our automated infrastructure synchronizes island-wide sorting with local last-mile courier routes.
              </p>

              {/* Image Container with Floating Overlapping Banner */}
              <div className="relative pt-6 sm:pt-8">
                {/* Overlapping Floating Stats Banner */}
                <div className="absolute top-0 left-4 sm:left-8 z-20 bg-gradient-to-r from-[#ff6600] to-[#ea580c] text-white px-6 sm:px-8 py-4 sm:py-5 rounded-2xl shadow-xl shadow-orange-500/30 flex items-center gap-6 sm:gap-8 border border-white/20">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight">25+</span>
                    <div className="text-[11px] sm:text-xs font-bold text-white/90 uppercase leading-snug">
                      Districts<br />Covered
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/30" />
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl font-black tracking-tight">99.4%</span>
                    <div className="text-[11px] sm:text-xs font-bold text-white/90 uppercase leading-snug">
                      On-Time<br />Delivery
                    </div>
                  </div>
                </div>

                {/* Main Photo Frame */}
                <div className="relative rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 h-[380px] sm:h-[440px] group">
                  <img
                    src="/coverage-warehouse.jpg"
                    alt="SwiftDrop Modern Smart Logistics Operations"
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Subtle Gradient Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent pointer-events-none" />

                  {/* Bottom Glassmorphic Badge */}
                  <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between pointer-events-none">
                    <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs font-bold flex items-center gap-2 border border-white/10 shadow-lg">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Island-Wide Line-Haul &amp; Hubs Active</span>
                    </div>
                    <Link
                      href="/portal"
                      className="pointer-events-auto text-xs font-bold text-white/90 hover:text-[#ff6600] underline underline-offset-4 transition-colors"
                    >
                      B2B Partner Portal &rarr;
                    </Link>
                  </div>
                </div>
              </div>
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
