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

  const getDashboardLink = (role: string) => {
    switch (role) {
      case 'COURIER':
        return '/tasks';
      case 'MERCHANT':
        return '/portal';
      case 'DISPATCHER':
      case 'ADMIN':
        return '/dispatch';
      case 'CUSTOMER':
      default:
        return '/booking';
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 sticky top-4 z-50">
      <header className="flex items-center justify-between bg-white/95 backdrop-blur-md px-6 py-3 rounded-full shadow-[0_4px_20px_-2px_rgba(0,0,0,0.06)] border border-slate-200/80 transition-all">
        {/* Brand Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center no-underline">
            <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
              swiftdrop<span className="text-brand-orange">.</span>
            </span>
          </Link>
        </div>

        {/* Center Navigation Links - Common Public Services */}
        <nav className="hidden md:flex items-center gap-7">
          <Link href="/#services" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Services
          </Link>
          <Link href="/tracking/SWIFT-DEMO" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Track
          </Link>
          <Link href="/#business" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            For Business
          </Link>
          <Link href="/#coverage" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Coverage
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

              {/* Dedicated Dashboard Button */}
              <Link
                href={getDashboardLink(user.role)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-dark hover:bg-brand-dark-hover rounded-full shadow-sm transition-all"
              >
                Dashboard <span className="text-brand-orange">&rarr;</span>
              </Link>

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
                className="px-5 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-all"
              >
                Log in
              </Link>
              <Link
                href="/booking"
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-brand-dark hover:bg-brand-dark-hover rounded-full shadow-sm hover:-translate-y-0.5 transition-all"
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
