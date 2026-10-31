'use client';

import { useState } from 'react';
import Link from 'next/link';
import { clearAuthSession } from '../../../lib/auth';

interface CartItem {
  id: string;
  name: string;
  category: string;
  weight: string;
  price: number;
  qty: number;
  image: string;
}

export default function CustomerDashboardPage() {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [promoCode, setPromoCode] = useState('SWIFTDROP20');
  const [promoApplied, setPromoApplied] = useState(true);
  const [bookedSuccess, setBookedSuccess] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({ 'srv-1': true });

  // Cart / Booking items
  const [cart, setCart] = useState<CartItem[]>([
    {
      id: 'item-1',
      name: 'Document Envelope',
      category: 'Documents',
      weight: '150g',
      price: 4.5,
      qty: 1,
      image: '/service-tracking.jpg',
    },
    {
      id: 'item-2',
      name: 'Electronics Package',
      category: 'Electronics',
      weight: '1.2 kg',
      price: 12.5,
      qty: 1,
      image: '/service-api.jpg',
    },
    {
      id: 'item-3',
      name: 'Express Care Gift',
      category: 'Care Gift',
      weight: '800g',
      price: 6.2,
      qty: 1,
      image: '/service-express.jpg',
    },
  ]);

  const handleLogout = () => {
    clearAuthSession();
    window.location.href = '/login';
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Add item to cart
  const addToCart = (product: { name: string; category: string; weight: string; price: number; image: string }) => {
    const existingIndex = cart.findIndex((item) => item.name === product.name);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: `item-${Date.now()}`,
          name: product.name,
          category: product.category,
          weight: product.weight,
          price: product.price,
          qty: 1,
          image: product.image,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  // Pricing calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const serviceFee = cart.length > 0 ? 1.0 : 0;
  const total = Math.max(0, subtotal - discount + serviceFee);

  const handleCheckout = () => {
    const generatedId = `SWIFT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTrackingId(generatedId);
    setBookedSuccess(true);
  };

  // Delivery options catalogue
  const popularServices = [
    {
      id: 'srv-1',
      title: 'Same-Day Express',
      tag: '15% Off',
      rating: '5.0',
      reviews: '2.4k',
      price: 8.5,
      weight: 'Intra-city under 2 hours',
      category: 'box',
      image: '/service-express.jpg',
    },
    {
      id: 'srv-2',
      title: 'Priority Document Pack',
      tag: '15% Off',
      rating: '4.9',
      reviews: '4.8k',
      price: 4.5,
      weight: 'Legal & verified envelope',
      category: 'document',
      image: '/service-tracking.jpg',
    },
    {
      id: 'srv-3',
      title: 'Fragile Electronics Pack',
      tag: '15% Off',
      rating: '5.0',
      reviews: '1.9k',
      price: 12.5,
      weight: 'Insured bubble-wrapped cargo',
      category: 'electronics',
      image: '/service-pod.jpg',
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#fcf9f2] p-2 sm:p-4 lg:p-6 flex items-center justify-center font-sans antialiased text-slate-800">
      {/* MAIN 3-COLUMN APPLICATION SHELL MATCHING REFERENCE DESIGN */}
      <div className="w-full max-w-[1680px] bg-white rounded-[32px] sm:rounded-[36px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[940px]">
        
        {/* ========================================================================= */}
        {/* COLUMN 1: LEFT NAVIGATION SIDEBAR (Matching GoMeal Layout) */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-6 sm:p-7 flex flex-col justify-between flex-shrink-0">
          <div>
            {/* Brand Logo */}
            <Link href="/" className="inline-flex items-center gap-1.5 mb-8 group">
              <span className="text-2xl font-black tracking-tight text-slate-900">
                swiftdrop<span className="text-[#ff6600]">.</span>
              </span>
            </Link>

            {/* Vertical Menu Items */}
            <nav className="space-y-1.5">
              {[
                {
                  id: 'dashboard',
                  label: 'Dashboard',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  ),
                },
                {
                  id: 'send',
                  label: 'Book Shipment',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  ),
                },
                {
                  id: 'favorite',
                  label: 'Saved Addresses',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  ),
                },
                {
                  id: 'messages',
                  label: 'Messages',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ),
                },
                {
                  id: 'history',
                  label: 'Order History',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                },
                {
                  id: 'bills',
                  label: 'Bills & Invoices',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ),
                },
                {
                  id: 'settings',
                  label: 'Setting',
                  icon: (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ),
                },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    activeNav === item.id
                      ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className={activeNav === item.id ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Bottom Upgrade Voucher Promo Box & Logout */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
            <div className="relative rounded-3xl bg-gradient-to-br from-[#ff7a00] to-[#ff9900] p-5 text-white overflow-hidden shadow-lg shadow-orange-500/15">
              <div className="relative z-10">
                <h4 className="text-xs font-black leading-tight mb-1">
                  Upgrade your Account to Get Free Voucher
                </h4>
                <p className="text-[11px] text-white/80 leading-snug mb-3">
                  SwiftDrop Gold membership with 20% cashback on all deliveries.
                </p>
                <button
                  onClick={() => alert('Code SWIFTDROP20 applied to your active booking!')}
                  className="px-5 py-2 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs rounded-xl shadow-sm transition-all text-center cursor-pointer"
                >
                  Upgrade
                </button>
              </div>
            </div>

            {/* Logout Button */}
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
        {/* COLUMN 2: CENTER MAIN CONTENT (Header, Banner, Category, Popular, Recent) */}
        {/* ========================================================================= */}
        <main className="flex-1 p-6 sm:p-8 lg:p-9 bg-white flex flex-col gap-7 overflow-y-auto">
          {/* Header Bar: Greeting + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Hello, Patricia
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Ready to dispatch or track your island deliveries today?
              </p>
            </div>

            {/* Search Input matching reference */}
            <div className="flex items-center gap-3 bg-[#f8f8f6] border border-slate-200/60 rounded-full px-5 py-2.5 w-full sm:w-96 shadow-inner focus-within:border-[#ff6600] focus-within:ring-2 focus-within:ring-orange-100 transition-all">
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="What parcel do you want to send today..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs sm:text-sm text-slate-800 placeholder-slate-400 w-full"
              />
            </div>
          </div>

          {/* Featured Discount Voucher Promo Banner (Vibrant Orange & Yellow Gradient) */}
          <div className="relative rounded-3xl bg-gradient-to-r from-[#ff8c00] via-[#ffa200] to-[#ffb800] p-7 sm:p-8 text-white overflow-hidden shadow-lg shadow-orange-500/15 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="relative z-10 max-w-md">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
                Get Discount Voucher<br />Up To 20%
              </h2>
              <p className="text-xs text-white/90 leading-relaxed mb-5">
                Doorstep pickup within 15 minutes. Island-wide live GPS tracking with verified recipient signature on delivery.
              </p>
              <button
                onClick={() =>
                  addToCart({
                    name: 'Same-Day Express Package',
                    category: 'Express',
                    weight: '1.5 kg',
                    price: 8.5,
                    image: '/service-express.jpg',
                  })
                }
                className="px-6 py-2.5 bg-white hover:bg-orange-50 text-[#ff6600] font-black text-xs sm:text-sm rounded-full shadow-md transition-all cursor-pointer"
              >
                Claim Voucher &rarr;
              </button>
            </div>

            {/* 3D Visual in Banner */}
            <div className="w-44 h-36 sm:w-56 sm:h-44 relative flex-shrink-0 flex items-center justify-center">
              <img
                src="/hero-3d.png"
                alt="SwiftDrop Express Delivery"
                className="w-full h-full object-contain filter drop-shadow-xl"
              />
            </div>
          </div>

          {/* Category Section matching reference */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Category
              </h3>
              <button
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-bold text-slate-400 hover:text-[#ff6600] transition-colors"
              >
                View all &gt;
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { id: 'box', label: 'Parcels', icon: '📦' },
                { id: 'document', label: 'Documents', icon: '📄' },
                { id: 'electronics', label: 'Electronics', icon: '💻' },
                { id: 'care', label: 'Gift Box', icon: '🎁' },
                { id: 'apparel', label: 'Apparel', icon: '👕' },
                { id: 'cargo', label: 'Heavy Cargo', icon: '🚚' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-orange-50/70 text-[#ff6600] border-[#ff6600] shadow-sm'
                      : 'bg-white text-slate-700 border-slate-100 hover:border-orange-200 hover:shadow-sm'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-50/60 flex items-center justify-center text-2xl">
                    {cat.icon}
                  </div>
                  <span className="text-xs font-bold whitespace-nowrap">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Delivery Options (Cards Grid with 15% Off Tag, Heart, 3D Image, Rating & (+) Button) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Popular Services
              </h3>
              <span className="text-xs font-bold text-slate-400 hover:text-[#ff6600] cursor-pointer">
                View all &gt;
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularServices.map((srv) => (
                <div
                  key={srv.id}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-xl hover:border-orange-200 transition-all duration-300 flex flex-col justify-between group"
                >
                  {/* Top Tag & Favorite Heart */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-red-50 text-red-500">
                      {srv.tag}
                    </span>
                    <button
                      onClick={() => toggleFavorite(srv.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <svg
                        className={`w-4 h-4 transition-colors ${
                          favorites[srv.id] ? 'fill-red-500 text-red-500' : 'text-slate-300 fill-none'
                        }`}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>

                  {/* 3D Product Image */}
                  <div className="h-36 w-full flex items-center justify-center p-2 mb-3 bg-gradient-to-b from-orange-50/20 to-transparent rounded-2xl">
                    <img
                      src={srv.image}
                      alt={srv.title}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300 rounded-xl"
                    />
                  </div>

                  {/* Rating Stars */}
                  <div className="flex items-center gap-1 text-xs text-[#ff9900] mb-1">
                    <span>★★★★★</span>
                  </div>

                  {/* Title & Weight */}
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-[#ff6600] transition-colors mb-0.5">
                      {srv.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mb-3">{srv.weight}</p>
                  </div>

                  {/* Price & Add (+) Button */}
                  <div className="flex items-center justify-between pt-2 mt-auto">
                    <div>
                      <span className="text-base font-black text-slate-900">${srv.price.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() =>
                        addToCart({
                          name: srv.title,
                          category: srv.category,
                          weight: srv.weight,
                          price: srv.price,
                          image: srv.image,
                        })
                      }
                      title="Add to Booking"
                      className="w-8 h-8 rounded-xl bg-[#ff9900] hover:bg-[#ff8800] text-white flex items-center justify-center font-black text-base shadow-sm transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders Section (matching reference) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-slate-900 tracking-tight">
                Recent Order
              </h3>
              <Link href="/tracking/SWIFT-892102" className="text-xs font-bold text-slate-400 hover:text-[#ff6600] transition-colors">
                View all &gt;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  id: 'SWIFT-892102',
                  title: 'Colombo Express Box',
                  status: 'In Transit',
                  eta: 'Today, 2:30 PM',
                  image: '/service-express.jpg',
                },
                {
                  id: 'SWIFT-892101',
                  title: 'Kandy Electronics Hub',
                  status: 'Delivered',
                  eta: 'Verified POD',
                  image: '/service-pod.jpg',
                },
                {
                  id: 'SWIFT-892100',
                  title: 'Galle Coastal Document',
                  status: 'Dispatched',
                  eta: 'Courier: Sunil S.',
                  image: '/service-tracking.jpg',
                },
              ].map((order, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-3.5 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-orange-50 border border-slate-100 flex-shrink-0 flex items-center justify-center">
                    <img src={order.image} alt={order.title} className="w-full h-full object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-slate-900 block truncate">{order.title}</span>
                    <span className="text-[10px] text-slate-400 block">{order.id} &bull; {order.eta}</span>
                  </div>

                  <span className="text-[10px] font-black text-[#ff6600] bg-orange-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* ========================================================================= */}
        {/* COLUMN 3: RIGHT PANEL (Balance, Address, Order Menu & Checkout) */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-80 xl:w-88 bg-white border-t lg:border-t-0 lg:border-l border-slate-100 p-6 sm:p-7 flex flex-col justify-between flex-shrink-0">
          <div>
            {/* Top Bar: Action Icons + User Avatar */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <button
                  title="Coupons"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-orange-50 hover:text-[#ff6600] text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </button>

                <button
                  title="Notifications"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-orange-50 hover:text-[#ff6600] text-slate-500 flex items-center justify-center transition-colors relative cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="w-2 h-2 rounded-full bg-[#ff6600] absolute top-2 right-2 ring-2 ring-white" />
                </button>

                <button
                  title="Settings"
                  className="w-9 h-9 rounded-full bg-slate-50 hover:bg-orange-50 hover:text-[#ff6600] text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* User Avatar */}
              <div className="w-10 h-10 rounded-full bg-[#ff7a00] text-white flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-orange-100">
                P
              </div>
            </div>

            {/* Your Balance Card matching GoMeal Layout */}
            <div className="mb-6">
              <span className="text-xs font-black text-slate-900 block mb-2.5">
                Your Balance
              </span>

              <div className="rounded-2xl bg-gradient-to-r from-[#ff8c00] to-[#ffa500] p-4 text-white shadow-md flex items-center justify-between gap-3">
                {/* White Inset Pill with Balance */}
                <div className="bg-white rounded-xl px-4 py-2 text-slate-900 shadow-sm">
                  <span className="text-[10px] text-slate-400 block font-medium">Balance</span>
                  <span className="text-xl font-black text-slate-900">$120.00</span>
                </div>

                {/* Top Up & Transfer Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => alert('Top up wallet modal opened')}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex flex-col items-center justify-center cursor-pointer"
                    title="Top Up"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-[8px] font-bold text-white mt-0.5">Top Up</span>
                  </button>

                  <button
                    onClick={() => alert('Transfer funds')}
                    className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm transition-all flex flex-col items-center justify-center cursor-pointer"
                    title="Transfer"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span className="text-[8px] font-bold text-white mt-0.5">Transfer</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Your Address matching GoMeal Layout */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-slate-900">Your Address</span>
                </div>
                <button
                  onClick={() => alert('Change address dialog')}
                  className="text-[11px] font-bold text-[#ff8c00] border border-orange-200 hover:bg-orange-50 px-2.5 py-0.5 rounded-full transition-all cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="flex items-start gap-2 mb-2.5">
                <span className="text-[#ff9900] text-sm mt-0.5">📍</span>
                <div>
                  <span className="text-xs font-bold text-slate-900 block leading-tight">Elm Street, 23 (Colombo 03)</span>
                  <span className="text-[10px] text-slate-400 block leading-relaxed mt-0.5">
                    Apartment 4B, Duplication Rd, Western Province
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert('Add delivery details')}
                  className="px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-orange-300 hover:text-[#ff6600] transition-colors cursor-pointer"
                >
                  Add Details
                </button>
                <button
                  onClick={() => alert('Add courier instructions note')}
                  className="px-3 py-1 rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-orange-300 hover:text-[#ff6600] transition-colors cursor-pointer"
                >
                  Add Note
                </button>
              </div>
            </div>

            {/* Order Menu / Current Booking Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-slate-900">
                  Order Menu
                </span>
                <span className="text-xs text-slate-400">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} items
                </span>
              </div>

              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Your order menu is empty. Click <strong>+</strong> on any service to add items.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 py-1"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-orange-50 border border-slate-100 p-0.5 flex-shrink-0 flex items-center justify-center">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-slate-900 truncate">{item.name}</h5>
                          <span className="text-[10px] text-slate-400 block">x{item.qty}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-extrabold text-[#ff6600]">
                          +${(item.price * item.qty).toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-5 h-5 rounded-full bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-[#ff6600] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                          >
                            -
                          </button>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded-full bg-slate-100 hover:bg-orange-100 text-slate-600 hover:text-[#ff6600] flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Bottom Checkout & Totals matching GoMeal Layout */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            {/* Totals Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-500 mb-4">
              <div className="flex justify-between">
                <span>Service</span>
                <span className="font-bold text-slate-800">+${serviceFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-slate-900 text-sm">Total</span>
                <span className="text-xl font-black text-[#ff8c00]">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon Code Pill */}
            <div
              onClick={() => alert(`Coupon ${promoCode} is active!`)}
              className="flex items-center justify-between text-xs bg-[#fff8e7] p-2.5 rounded-xl border border-[#ffe4a0] mb-4 cursor-pointer hover:bg-[#fff2d2] transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎟️</span>
                <span className="font-bold text-slate-700">Have a coupon code?</span>
              </div>
              <span className="text-xs font-bold text-slate-400">&gt;</span>
            </div>

            {/* Order Confirmation CTA Button */}
            {bookedSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                <span className="text-xs font-black text-emerald-800 block mb-1">
                  ✓ Booking Confirmed Successfully!
                </span>
                <span className="text-[11px] font-bold text-emerald-600 block">
                  Tracking Code: {trackingId}
                </span>
                <Link
                  href={`/tracking/${trackingId}`}
                  className="mt-2 inline-block text-xs font-bold text-[#ff6600] hover:underline"
                >
                  View Live Tracking Map &rarr;
                </Link>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full py-3.5 bg-[#ff9900] hover:bg-[#ff8800] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-xl shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Checkout</span>
              </button>
            )}
          </div>
        </aside>

      </div>
    </div>
  );
}

