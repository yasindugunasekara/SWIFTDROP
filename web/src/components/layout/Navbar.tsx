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
    <div className="navbar-wrapper">
      <header className="navbar-container">
        {/* Brand Logo */}
        <div className="nav-brand">
          <Link href="/" className="logo-link">
            <span className="logo-text">swift<span className="logo-dot">.</span></span>
          </Link>
        </div>

        {/* Center Navigation Links */}
        <nav className="nav-links">
          <Link href="/booking" className="nav-link">Send</Link>
          <Link href="/tracking/SWIFT-DEMO" className="nav-link">Track</Link>
          <Link href="/portal" className="nav-link">Business</Link>
          <Link href="/booking#pricing" className="nav-link">Pricing</Link>
          <Link href="/exceptions" className="nav-link">Support</Link>
        </nav>

        {/* Right Action / Auth Buttons */}
        <div className="nav-actions">
          {user ? (
            <div className="user-logged-in">
              <span className={`role-badge role-${user.role.toLowerCase()}`}>
                {user.role}
              </span>
              <span className="user-name">{user.fullName || user.email.split('@')[0]}</span>
              
              {/* Contextual Dashboard Link based on Role */}
              {user.role === 'CUSTOMER' && <Link href="/history" className="dash-link">My Parcels</Link>}
              {user.role === 'COURIER' && <Link href="/tasks" className="dash-link">Daily Tasks</Link>}
              {user.role === 'MERCHANT' && <Link href="/portal" className="dash-link">Store Orders</Link>}
              {(user.role === 'DISPATCHER' || user.role === 'ADMIN') && <Link href="/dispatch" className="dash-link">Dispatch</Link>}

              <button onClick={handleLogout} className="logout-pill">
                Log out
              </button>
            </div>
          ) : (
            <div className="guest-actions">
              <Link href="/login" className="login-pill">
                Log in
              </Link>
              <Link href="/booking" className="ship-now-pill">
                Ship Now <span className="arrow-icon">&rarr;</span>
              </Link>
            </div>
          )}
        </div>
      </header>

      <style jsx>{`
        .navbar-wrapper {
          width: 100%;
          max-width: 1200px;
          margin: 1.25rem auto 0 auto;
          padding: 0 1.5rem;
          position: sticky;
          top: 1.25rem;
          z-index: 100;
        }

        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          padding: 0.65rem 1.25rem;
          border-radius: 9999px;
          box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(226, 232, 240, 0.8);
        }

        .logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
        }

        .logo-text {
          font-size: 1.6rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.04em;
        }

        .logo-dot {
          color: #ff6600;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .nav-link {
          font-size: 0.925rem;
          font-weight: 500;
          color: #475569;
          transition: color 0.15s ease;
        }

        .nav-link:hover {
          color: #0f172a;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .guest-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .login-pill {
          padding: 0.55rem 1.25rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #334155;
          border-radius: 9999px;
          background: #f1f5f9;
          transition: all 0.2s ease;
        }

        .login-pill:hover {
          background: #e2e8f0;
          color: #0f172a;
        }

        .ship-now-pill {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.55rem 1.35rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
          background: #111827;
          border-radius: 9999px;
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(17, 24, 39, 0.15);
        }

        .ship-now-pill:hover {
          background: #1f2937;
          transform: translateY(-1px);
        }

        .arrow-icon {
          color: #ff6600;
          font-weight: bold;
          transition: transform 0.15s ease;
        }

        .ship-now-pill:hover .arrow-icon {
          transform: translateX(2px);
        }

        .user-logged-in {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .role-badge {
          padding: 0.2rem 0.65rem;
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 9999px;
          text-transform: uppercase;
        }

        .role-customer { background: #e0f2fe; color: #0284c7; }
        .role-courier { background: #fef3c7; color: #d97706; }
        .role-merchant { background: #f3e8ff; color: #9333ea; }
        .role-dispatcher, .role-admin { background: #fee2e2; color: #dc2626; }

        .user-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1e293b;
        }

        .dash-link {
          font-size: 0.85rem;
          font-weight: 600;
          color: #ff6600;
          padding: 0.35rem 0.75rem;
          background: #fff7ed;
          border-radius: 9999px;
        }

        .dash-link:hover {
          background: #ffedd5;
        }

        .logout-pill {
          padding: 0.35rem 0.85rem;
          font-size: 0.85rem;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          color: #64748b;
          border-radius: 9999px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .logout-pill:hover {
          background: #fee2e2;
          color: #ef4444;
          border-color: #fca5a5;
        }

        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
