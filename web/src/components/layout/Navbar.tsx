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

        {/* Center Navigation Links - Exact user requested links */}
        <nav className="hidden md:flex items-center gap-7 lg:gap-9">
          <Link href="/#services" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#ff6600] transition-colors tracking-wide">
            OUR SERVICES
          </Link>
          <Link href="/#process" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#ff6600] transition-colors tracking-wide">
            PROCESS
          </Link>
          <Link href="/#coverage" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#ff6600] transition-colors tracking-wide">
            COVERAGE
          </Link>
          <Link href="/#pricing" className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#ff6600] transition-colors tracking-wide">
            PRICING
          </Link>
        </nav>

        {/* Right Action: login only */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                href={getDashboardLink(user.role)}
                className="px-4 py-1.5 text-xs sm:text-sm font-bold text-white bg-[#ff6600] hover:bg-[#ea580c] rounded-full shadow-sm transition-all"
              >
                Dashboard &rarr;
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-bold text-slate-500 hover:text-[#ff6600] transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs sm:text-sm font-bold text-slate-700 hover:text-[#ff6600] transition-colors px-3 py-1.5"
            >
              login
            </Link>
          )}
        </div>
      </header>
    </div>
  );
}
