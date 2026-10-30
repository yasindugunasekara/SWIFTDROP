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
    <header className="navbar-container">
      <div className="nav-brand">
        <Link href="/">
          <span className="logo-badge">⚡ SwiftDrop</span>
        </Link>
      </div>

      <nav className="nav-links">
        <Link href="/tracking/SWIFT-DEMO">Public Tracking</Link>

        {user?.role === 'CUSTOMER' && (
          <>
            <Link href="/booking">Book Parcel</Link>
            <Link href="/history">My Parcels</Link>
            <Link href="/inbox">Delivery Inbox</Link>
          </>
        )}

        {user?.role === 'COURIER' && (
          <>
            <Link href="/tasks">My Assigned Tasks</Link>
            <Link href="/inbox">Alerts</Link>
          </>
        )}

        {(user?.role === 'DISPATCHER' || user?.role === 'ADMIN') && (
          <>
            <Link href="/dispatch">Dispatch Board</Link>
            <Link href="/analytics">Operational Analytics</Link>
            <Link href="/exceptions">Exception Support</Link>
            <Link href="/config">Service Config</Link>
          </>
        )}

        {user?.role === 'MERCHANT' && (
          <>
            <Link href="/portal">Orders & Credentials</Link>
            <Link href="/webhooks">Webhook Center</Link>
          </>
        )}
      </nav>

      <div className="nav-actions">
        {user ? (
          <div className="user-section">
            <span className="role-tag">{user.role}</span>
            <Link href="/profile" className="profile-link">{user.fullName || user.email}</Link>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        ) : (
          <div className="auth-links">
            <Link href="/login" className="login-btn">Login</Link>
            <Link href="/register" className="register-btn">Register</Link>
          </div>
        )}
      </div>

      <style jsx>{`
        .navbar-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 2rem;
          background: #0f172a;
          color: #f8fafc;
          border-bottom: 1px solid #1e293b;
        }
        .logo-badge {
          font-weight: 700;
          font-size: 1.25rem;
          color: #38bdf8;
          text-decoration: none;
        }
        .nav-links {
          display: flex;
          gap: 1.25rem;
        }
        .nav-links a {
          color: #cbd5e1;
          text-decoration: none;
          font-size: 0.95rem;
          transition: color 0.2s;
        }
        .nav-links a:hover {
          color: #38bdf8;
        }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .user-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .role-tag {
          background: #1e293b;
          border: 1px solid #38bdf8;
          color: #38bdf8;
          padding: 0.2rem 0.5rem;
          font-size: 0.75rem;
          border-radius: 4px;
        }
        .profile-link {
          color: #f8fafc;
          text-decoration: none;
        }
        .logout-btn, .login-btn, .register-btn {
          cursor: pointer;
          border-radius: 6px;
          padding: 0.4rem 0.8rem;
          font-size: 0.9rem;
          text-decoration: none;
          border: none;
        }
        .logout-btn {
          background: #ef4444;
          color: white;
        }
        .login-btn {
          color: #cbd5e1;
        }
        .register-btn {
          background: #2563eb;
          color: white;
        }
      `}</style>
    </header>
  );
}
