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
                image: "/service-express.jpg?v=3",
                link: "/booking",
              },
              {
                title: "Live GPS Tracking",
                desc: "Real-time WebSocket milestone updates, live map coordinates, and dynamic arrival estimates.",
                image: "/service-tracking.jpg?v=3",
                link: "/#process",
              },
              {
                title: "Merchant Partner B2B",
                desc: "Automated order injection APIs, bulk waybill generation, and event-driven HMAC webhooks.",
                image: "/service-api.jpg?v=3",
                link: "/portal",
              },
              {
                title: "Verified Delivery POD",
                desc: "Doorstep camera verification, recipient digital signature, and instant VAT invoice generation.",
                image: "/service-pod.jpg?v=3",
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
                <div className="h-48 sm:h-52 w-full flex items-center justify-center p-1 mb-4 relative z-10">
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
      <section id="pricing" className="py-24 bg-[#e8e7e2] border-t border-slate-200/60 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="flex items-center justify-center gap-4 max-w-xs mx-auto mb-3">
              <div className="h-px bg-slate-300 flex-1" />
              <span className="text-xs font-black tracking-[0.25em] text-[#ff6600] uppercase">
                TRANSPARENT RATES
              </span>
              <div className="h-px bg-slate-300 flex-1" />
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-black text-slate-900 mt-2 mb-3 tracking-tight">
              Simple, Predictable Island-Wide Pricing
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              No hidden fuel surcharges. Real-time server-verified fee calculation based on actual distance and volumetric weight.
            </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-7 lg:gap-8 items-stretch pt-2">
            {/* Tier 1: Standard Delivery */}
            <div className="bg-white/95 backdrop-blur-md p-8 sm:p-9 rounded-[32px] border border-white/90 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
              <div>
                <span className="inline-block text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-4">
                  Standard Delivery
                </span>
                <div className="flex items-baseline gap-1.5 mt-2 mb-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900">$4.50</span>
                  <span className="text-xs sm:text-sm text-slate-500 font-semibold">/ parcel</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  Reliable next-day delivery across municipal and inter-district zones island-wide.
                </p>
                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 pb-8 border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Up to 2 kg parcel weight included</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Real-time GPS &amp; milestone tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Free doorstep pickup &amp; SMS alerts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Digital proof of delivery capture</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/booking"
                className="w-full py-3.5 text-center bg-white hover:bg-orange-50 text-[#ff6600] border-2 border-orange-200/90 rounded-full font-extrabold text-xs sm:text-sm transition-all shadow-sm"
              >
                Book Standard Parcel &rarr;
              </Link>
            </div>

            {/* Tier 2: Same-Day Express (Most Popular / Highlighted) */}
            <div className="bg-white p-8 sm:p-9 rounded-[32px] border-2 border-[#ff6600] shadow-[0_20px_50px_rgba(255,102,0,0.18)] relative flex flex-col justify-between hover:-translate-y-2 transition-all duration-300">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#ff6600] text-white px-4 py-1 rounded-full text-[11px] font-black tracking-wider uppercase shadow-md shadow-orange-500/30">
                ⭐ MOST POPULAR
              </div>
              <div>
                <span className="inline-block text-[11px] font-black uppercase tracking-wider text-[#ff6600] bg-orange-50 px-3 py-1 rounded-full mb-4">
                  Same-Day Express
                </span>
                <div className="flex items-baseline gap-1.5 mt-2 mb-2">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900">$8.50</span>
                  <span className="text-xs sm:text-sm text-slate-500 font-semibold">/ parcel</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  Urgent doorstep delivery within 2–4 hours anywhere in urban hubs and metro corridors.
                </p>
                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 pb-8 border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#ff6600] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Priority courier dispatch under 10 mins</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#ff6600] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Direct point-to-point transit routing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#ff6600] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Digital signature &amp; camera verification</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#ff6600] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>$100 complimentary cargo guarantee</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/booking"
                className="w-full py-4 text-center bg-[#ff6600] hover:bg-[#ea580c] text-white rounded-full font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 transition-all flex items-center justify-center gap-2 group"
              >
                <span>Ship Express Now</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
            </div>

            {/* Tier 3: Merchant B2B Volume */}
            <div className="bg-white/95 backdrop-blur-md p-8 sm:p-9 rounded-[32px] border border-white/90 shadow-[0_10px_35px_rgba(0,0,0,0.04)] hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between">
              <div>
                <span className="inline-block text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-100 px-3 py-1 rounded-full mb-4">
                  Merchant B2B Volume
                </span>
                <div className="flex items-baseline gap-1.5 mt-2 mb-2">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">Custom SLA</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mb-6">
                  Dedicated volume pricing and automated API injection for high-throughput e-commerce stores.
                </p>
                <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700 pb-8 border-t border-slate-100 pt-6">
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Secured REST Partner APIs &amp; Webhooks</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Bulk automated waybill label printing</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Dedicated fleet account manager</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-orange-100 text-[#ff6600] flex items-center justify-center font-bold text-xs flex-shrink-0">✓</span>
                    <span>Consolidated monthly invoicing &amp; SLA</span>
                  </li>
                </ul>
              </div>
              <Link
                href="/login"
                className="w-full py-3.5 text-center bg-white hover:bg-orange-50 text-[#ff6600] border-2 border-orange-200/90 rounded-full font-extrabold text-xs sm:text-sm transition-all shadow-sm"
              >
                Merchant Sign In &rarr;
              </Link>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm font-semibold text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-[#ff6600] font-bold">✓</span>
              <span>100% Server-Verified Distance Rates</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff6600] font-bold">✓</span>
              <span>Instant Card &amp; COD Options</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#ff6600] font-bold">✓</span>
              <span>Complimentary Cargo Guarantee</span>
            </div>
          </div>
        </div>
      </section>

      {/* PRE-FOOTER CTA BANNER */}
      <section className="bg-white py-16 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-[32px] bg-gradient-to-br from-slate-950 via-[#111827] to-slate-950 p-8 sm:p-14 text-white overflow-hidden shadow-2xl border border-slate-800 flex flex-col lg:flex-row items-center justify-between gap-8">
            {/* Orange ambient radial glow */}
            <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[#ff6600]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 max-w-xl">
              <span className="text-xs font-black tracking-widest text-[#ff6600] uppercase mb-2 inline-block">
                GET STARTED IN MINUTES
              </span>
              <h3 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
                Ready to experience the future of logistics?
              </h3>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Send your first individual parcel in under 60 seconds or connect your enterprise store via our high-speed partner API.
              </p>
            </div>
            <div className="relative z-10 flex flex-wrap gap-4 flex-shrink-0">
              <Link
                href="/booking"
                className="px-8 py-4 bg-[#ff6600] hover:bg-[#ea580c] text-white font-black text-xs sm:text-sm uppercase tracking-wider rounded-full shadow-lg shadow-orange-500/30 transition-all flex items-center gap-2 group"
              >
                <span>Book Delivery Now</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </Link>
              <Link
                href="/login"
                className="px-7 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-xs sm:text-sm rounded-full border border-white/20 backdrop-blur-md transition-all"
              >
                Merchant Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0b0f17] text-white pt-16 pb-12 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-14">
            {/* Brand Column */}
            <div className="lg:col-span-2">
              <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
                <span className="text-2xl font-black tracking-tight text-white">
                  swiftdrop<span className="text-[#ff6600]">.</span>
                </span>
              </Link>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mb-6 font-normal">
                Next-generation automated parcel logistics network. Synchronizing island-wide sorting hubs with high-velocity courier dispatch and enterprise REST APIs.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>All Island Systems Operational</span>
              </div>
            </div>

            {/* Column 2: Solutions */}
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-[#ff6600] mb-4">
                Services
              </h5>
              <ul className="text-xs sm:text-sm text-slate-400 space-y-2.5">
                <li><a href="/#services" className="hover:text-white transition-colors">Same-Day Express</a></li>
                <li><a href="/#services" className="hover:text-white transition-colors">Live GPS Tracking</a></li>
                <li><a href="/#services" className="hover:text-white transition-colors">Merchant Partner API</a></li>
                <li><a href="/#services" className="hover:text-white transition-colors">Verified Delivery POD</a></li>
                <li><a href="/#coverage" className="hover:text-white transition-colors">Provincial Sorting Hubs</a></li>
              </ul>
            </div>

            {/* Column 3: Dashboards & Links */}
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-[#ff6600] mb-4">
                Portals
              </h5>
              <ul className="text-xs sm:text-sm text-slate-400 space-y-2.5">
                <li><Link href="/booking" className="hover:text-white transition-colors">Customer Booking</Link></li>
                <li><Link href="/tasks" className="hover:text-white transition-colors">Courier Task Board</Link></li>
                <li><Link href="/dispatch" className="hover:text-white transition-colors">Fleet Dispatcher</Link></li>
                <li><Link href="/portal" className="hover:text-white transition-colors">Merchant Portal</Link></li>
                <li><Link href="/tracking/SWIFT-DEMO" className="hover:text-white transition-colors">Public Tracking</Link></li>
              </ul>
            </div>

            {/* Column 4: Operations & Contact */}
            <div>
              <h5 className="text-xs font-black uppercase tracking-widest text-[#ff6600] mb-4">
                Operations
              </h5>
              <div className="space-y-3 text-xs sm:text-sm text-slate-400">
                <p className="flex items-start gap-2">
                  <span className="text-[#ff6600]">📍</span>
                  <span>Colombo Urban Logistics Hub, Sri Lanka</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-[#ff6600]">📞</span>
                  <span>+94 11 234 5678</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-[#ff6600]">✉️</span>
                  <span>support@swiftdrop.lk</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-[#ff6600]">⚡</span>
                  <span>24/7 Island Dispatch Active</span>
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800/80 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>&copy; 2026 SwiftDrop Logistics Network. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/#coverage" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
              <Link href="/#coverage" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
              <Link href="/#coverage" className="hover:text-slate-300 transition-colors">Security &amp; SLA</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
