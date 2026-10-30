'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getStoredUser, clearAuthSession, User } from '../../lib/auth';

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 sticky top-4 z-50">
      <header className="flex items-center justify-between bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-sm border border-slate-200/80 transition-all">
        {/* Brand Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center no-underline">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              swift<span className="text-brand-orange">.</span>
            </span>
          </Link>
        </div>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-7">
          <Link href="/booking" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Send
          </Link>
          <Link href="/tracking/SWIFT-DEMO" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Track
          </Link>
          <Link href="/portal" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Business
          </Link>
          <Link href="/booking#pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Pricing
          </Link>
          <Link href="/exceptions" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Support
          </Link>
        </nav>

        {/* Right Action / Auth Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full uppercase tracking-wider ${
                user.role === 'CUSTOMER' ? 'bg-sky-100 text-sky-700' :
                user.role === 'COURIER' ? 'bg-amber-100 text-amber-700' :
                user.role === 'MERCHANT' ? 'bg-purple-100 text-purple-700' :
                'bg-rose-100 text-rose-700'
              }`}>
                {user.role}
              </span>
              <span className="hidden sm:inline text-xs font-semibold text-slate-800">
                {user.fullName || user.email.split('@')[0]}
              </span>

              {/* Contextual Link */}
              {user.role === 'CUSTOMER' && (
                <Link href="/history" className="text-xs font-semibold text-brand-orange bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors">
                  My Parcels
                </Link>
              )}
              {user.role === 'COURIER' && (
                <Link href="/tasks" className="text-xs font-semibold text-brand-orange bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors">
                  Daily Tasks
                </Link>
              )}
              {user.role === 'MERCHANT' && (
                <Link href="/portal" className="text-xs font-semibold text-brand-orange bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors">
                  Store Orders
                </Link>
              )}
              {(user.role === 'DISPATCHER' || user.role === 'ADMIN') && (
                <Link href="/dispatch" className="text-xs font-semibold text-brand-orange bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-full transition-colors">
                  Dispatch
                </Link>
              )}

              <button
                onClick={handleLogout}
                className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-full transition-all cursor-pointer"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-4 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all"
              >
                Log in
              </Link>
              <Link
                href="/booking"
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-brand-dark hover:bg-brand-dark-hover rounded-full shadow-sm hover:-translate-y-0.5 transition-all"
              >
                Ship Now <span className="text-brand-orange font-bold">&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
