'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getStoredUser, clearAuthSession, User } from '../../lib/auth';

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  // Remove the public marketing navbar completely when inside any dashboard route
  const isDashboardRoute = ['/booking', '/tasks', '/portal', '/dispatch', '/analytics', '/inbox', '/config'].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
  );

  if (isDashboardRoute) {
    return null;
  }

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
    <div className="w-full fixed top-3 sm:top-5 left-0 right-0 z-50 px-4 sm:px-6 pointer-events-none">
      <header className="max-w-5xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-xl px-5 sm:px-7 py-2.5 sm:py-3 rounded-full shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] border border-white/80 transition-all pointer-events-auto">
        {/* Brand Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center no-underline group">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight transition-transform group-hover:scale-[1.01]">
              swiftdrop<span className="text-[#ff6600]">.</span>
            </span>
          </Link>
        </div>

        {/* Center Navigation Links - Common Public Services */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-8">
          <Link href="/#services" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            Send
          </Link>
          <Link href="/tracking/SWIFT-DEMO" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            Track
          </Link>
          <Link href="/#business" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            Business
          </Link>
          <Link href="/#pricing" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            Pricing
          </Link>
          <Link href="/exceptions" className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors">
            Support
          </Link>
        </nav>

        {/* Right Action / Auth Buttons */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span className={`px-2.5 py-0.5 text-[10px] sm:text-xs font-bold rounded-full uppercase tracking-wider ${
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
                className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-bold text-white bg-[#111827] hover:bg-black rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Dashboard <span className="text-[#ff6600]">&rarr;</span>
              </Link>

              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Log out"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/login"
                className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 transition-colors px-2 py-1"
              >
                Log in
              </Link>
              <Link
                href="/booking"
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#111827] hover:bg-black rounded-full shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Ship Now <span className="text-[#ff6600] text-sm">&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
