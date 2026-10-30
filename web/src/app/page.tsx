'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    <div className="page-container">
      {/* HERO SECTION */}
      <section className="hero-section">
        {/* Left Column: Typography, Search Bar & Stats */}
        <div className="hero-left">
          <span className="tagline">DELIVERING A BRIGHTER TOMORROW</span>
          
          <h1 className="hero-title">
            Send<br />
            Anything.<br />
            <span className="orange-highlight">Anywhere.</span>
          </h1>

          <p className="hero-description">
            Fast, reliable, and affordable delivery for individuals and businesses.
            From your doorstep to anywhere in the country.
          </p>

          {/* Floating Pill Booking Bar */}
          <form className="shipping-bar" onSubmit={handleQuickShip}>
            <div className="input-group">
              <span className="box-icon">📦</span>
              <input
                type="text"
                placeholder="Enter pickup location"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
                className="pill-input"
              />
            </div>
            
            <div className="bar-divider"></div>

            <div className="input-group">
              <input
                type="text"
                placeholder="Enter delivery location"
                value={delivery}
                onChange={(e) => setDelivery(e.target.value)}
                className="pill-input"
              />
            </div>

            <button type="submit" className="submit-circle-btn" title="Calculate Fee & Ship">
              <span className="submit-arrow">&rarr;</span>
            </button>
          </form>

          {/* Stats Metrics */}
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-number">1M+</div>
              <div className="stat-label">Packages Delivered</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">99%</div>
              <div className="stat-label">On-Time Delivery</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">24/7</div>
              <div className="stat-label">Customer Support</div>
            </div>
          </div>
        </div>

        {/* Right Column: 3D Isometric Logistics Hub Composition */}
        <div className="hero-right">
          <div className="isometric-stage">
            {/* Main Swift Hub Facility */}
            <div className="hub-building">
              <div className="hub-top">
                <span className="facility-logo">swift<span className="orange-dot">.</span></span>
              </div>
              <div className="hub-tunnel">
                <div className="tunnel-entrance"></div>
              </div>
              <div className="hub-slogan-box">
                <span>Moves What Matters</span>
              </div>
              <div className="hub-accent-panel">
                <div className="panel-text">
                  <span>Packages</span>
                  <span>People</span>
                  <span>Possibilities</span>
                </div>
              </div>
            </div>

            {/* Conveyor Belt & Moving Parcels */}
            <div className="conveyor-track">
              <div className="parcel parcel-1">📦</div>
              <div className="parcel parcel-2">📦</div>
              <div className="parcel parcel-3">📦</div>
            </div>

            {/* Swift Delivery Van */}
            <div className="delivery-van-card">
              <div className="van-badge">
                <span className="van-icon">🚐</span>
                <span className="van-brand">swift<span className="orange-dot">.</span></span>
              </div>
              <div className="van-tag">Express Courier</div>
            </div>

            {/* Road Sign Pills */}
            <div className="sign-pill sign-1">Faster</div>
            <div className="sign-pill sign-2">Safer</div>
            <div className="sign-pill sign-3">Closer</div>
            <div className="floating-badge">
              <span>More Than Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* MULTI-ROLE QUICK ACCESS PORTALS */}
      <section className="role-portal-section">
        <div className="section-header">
          <span className="sub-badge">ROLE-BASED WORKSPACES</span>
          <h2>Select Your SwiftDrop Portal</h2>
          <p>Access your dedicated workspace or test role-specific workflows.</p>
        </div>

        <div className="roles-grid">
          {/* Customer */}
          <Link href="/booking" className="role-card">
            <div className="role-icon-box orange">📦</div>
            <h3>Customer Portal</h3>
            <p>Book single parcel delivery, preview fees, track in real-time, and download receipts.</p>
            <span className="role-action-link">Open Booking &rarr;</span>
          </Link>

          {/* Courier */}
          <Link href="/tasks" className="role-card">
            <div className="role-icon-box amber">🚚</div>
            <h3>Courier Task Queue</h3>
            <p>View daily assigned routes, update status on-the-go, and upload camera delivery proof.</p>
            <span className="role-action-link">View Assigned Jobs &rarr;</span>
          </Link>

          {/* Merchant */}
          <Link href="/portal" className="role-card">
            <div className="role-icon-box purple">🏢</div>
            <h3>Merchant B2B</h3>
            <p>Connect e-commerce stores, inject API orders, generate API keys, and monitor webhooks.</p>
            <span className="role-action-link">Access B2B Orders &rarr;</span>
          </Link>

          {/* Dispatcher & Admin */}
          <Link href="/dispatch" className="role-card">
            <div className="role-icon-box blue">🎛️</div>
            <h3>Dispatch & Operations</h3>
            <p>Balance courier fleet workload, assign unassigned packages, configure zone pricing, and view analytics.</p>
            <span className="role-action-link">Launch Dispatch Board &rarr;</span>
          </Link>
        </div>
      </section>

      <style jsx>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 6rem;
        }

        /* Hero Layout */
        .hero-section {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 3.5rem;
          align-items: center;
          min-height: 580px;
          margin-bottom: 5rem;
        }

        .hero-left {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .tagline {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          color: #94a3b8;
        }

        .hero-title {
          font-size: 4.5rem;
          line-height: 1.05;
          font-weight: 850;
          color: #0f172a;
          letter-spacing: -0.04em;
          margin: 0;
        }

        .orange-highlight {
          color: #ff6600;
        }

        .hero-description {
          font-size: 1.1rem;
          line-height: 1.6;
          color: #64748b;
          max-width: 480px;
          margin-bottom: 0.5rem;
        }

        /* Floating Pill Shipping Bar */
        .shipping-bar {
          display: flex;
          align-items: center;
          background: #ffffff;
          padding: 0.45rem 0.6rem 0.45rem 1.25rem;
          border-radius: 9999px;
          box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04);
          border: 1px solid #e2e8f0;
          max-width: 530px;
          transition: box-shadow 0.2s ease;
        }

        .shipping-bar:focus-within {
          box-shadow: 0 14px 35px -2px rgba(255, 102, 0, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.06);
          border-color: #fdba74;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
        }

        .box-icon {
          font-size: 1.1rem;
        }

        .pill-input {
          border: none;
          outline: none;
          background: transparent;
          font-size: 0.95rem;
          color: #1e293b;
          width: 100%;
        }

        .pill-input::placeholder {
          color: #94a3b8;
          font-size: 0.88rem;
        }

        .bar-divider {
          width: 1px;
          height: 28px;
          background: #e2e8f0;
          margin: 0 0.85rem;
        }

        .submit-circle-btn {
          width: 44px;
          height: 44px;
          background: #ff6600;
          border: none;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
          flex-shrink: 0;
        }

        .submit-circle-btn:hover {
          background: #ea580c;
          transform: scale(1.06);
        }

        .submit-arrow {
          color: #ffffff;
          font-size: 1.25rem;
          font-weight: bold;
        }

        /* Stats Row */
        .stats-row {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-top: 1.5rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
        }

        .stat-number {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .stat-label {
          font-size: 0.8rem;
          color: #64748b;
          font-weight: 500;
        }

        .stat-divider {
          width: 1px;
          height: 32px;
          background: #cbd5e1;
        }

        /* Isometric Visual Side */
        .hero-right {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .isometric-stage {
          position: relative;
          width: 100%;
          max-width: 500px;
          height: 460px;
          background: linear-gradient(145deg, #ffffff 0%, #f1f5f9 100%);
          border-radius: 28px;
          box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.08);
          border: 1px solid #ffffff;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hub-building {
          position: absolute;
          top: 35px;
          right: 35px;
          width: 260px;
          height: 200px;
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.07);
          border: 1px solid #f1f5f9;
          padding: 1.25rem;
        }

        .facility-logo {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
        }

        .orange-dot {
          color: #ff6600;
        }

        .hub-tunnel {
          position: absolute;
          bottom: 0;
          left: 20px;
          width: 110px;
          height: 80px;
          background: #ff6600;
          border-radius: 12px 12px 0 0;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }

        .tunnel-entrance {
          width: 70px;
          height: 50px;
          background: #111827;
          border-radius: 8px 8px 0 0;
        }

        .hub-slogan-box {
          position: absolute;
          bottom: 25px;
          right: 25px;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          max-width: 80px;
          line-height: 1.3;
        }

        .hub-accent-panel {
          position: absolute;
          top: 0;
          right: 0;
          width: 90px;
          height: 100%;
          background: #ff6600;
          border-radius: 0 20px 20px 0;
          padding: 1rem 0.75rem;
          color: #ffffff;
          font-size: 0.7rem;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 0.25rem;
        }

        /* Conveyor Track */
        .conveyor-track {
          position: absolute;
          bottom: 120px;
          left: 40px;
          width: 320px;
          height: 38px;
          background: #1e293b;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: space-around;
          padding: 0 1rem;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        }

        .parcel {
          font-size: 1.25rem;
          animation: floatParcel 3s ease-in-out infinite alternate;
        }
        .parcel-2 { animation-delay: 0.5s; }
        .parcel-3 { animation-delay: 1s; }

        @keyframes floatParcel {
          0% { transform: translateY(0); }
          100% { transform: translateY(-4px); }
        }

        /* Delivery Van Card */
        .delivery-van-card {
          position: absolute;
          bottom: 40px;
          right: 40px;
          background: #ffffff;
          padding: 0.85rem 1.25rem;
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .van-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .van-icon { font-size: 1.5rem; }
        .van-brand { font-weight: 800; font-size: 1.1rem; }
        .van-tag {
          font-size: 0.75rem;
          background: #ffedd5;
          color: #c2410c;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          font-weight: 600;
        }

        /* Road Signs */
        .sign-pill {
          position: absolute;
          right: 20px;
          background: #ffffff;
          color: #475569;
          padding: 0.35rem 0.85rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          border: 1px solid #f1f5f9;
        }

        .sign-1 { top: 60px; right: 15px; }
        .sign-2 { top: 95px; right: 15px; }
        .sign-3 { top: 130px; right: 15px; }

        .floating-badge {
          position: absolute;
          bottom: 45px;
          left: 40px;
          background: #ffffff;
          padding: 0.4rem 0.85rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #ff6600;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
          border-left: 3px solid #ff6600;
        }

        /* Role Portal Section */
        .role-portal-section {
          padding-top: 2rem;
          border-top: 1px solid #e2e8f0;
        }

        .section-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .sub-badge {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #ff6600;
          background: #fff7ed;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
        }

        .section-header h2 {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          margin: 0.5rem 0 0.25rem;
        }

        .section-header p {
          color: #64748b;
          font-size: 0.95rem;
        }

        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .role-card {
          background: #ffffff;
          padding: 1.75rem;
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          transition: all 0.2s ease;
          text-decoration: none;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
        }

        .role-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
          border-color: #cbd5e1;
        }

        .role-icon-box {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          margin-bottom: 1.25rem;
        }

        .orange { background: #fff7ed; color: #ea580c; }
        .amber { background: #fef3c7; color: #d97706; }
        .purple { background: #faf5ff; color: #9333ea; }
        .blue { background: #eff6ff; color: #2563eb; }

        .role-card h3 {
          font-size: 1.2rem;
          font-weight: 750;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .role-card p {
          font-size: 0.875rem;
          line-height: 1.5;
          color: #64748b;
          margin-bottom: 1.25rem;
          flex: 1;
        }

        .role-action-link {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ff6600;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        @media (max-width: 900px) {
          .hero-section {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-left {
            align-items: center;
          }
          .hero-title {
            font-size: 3.25rem;
          }
          .stats-row {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
