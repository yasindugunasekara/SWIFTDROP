'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveAuthSession, UserRole } from '../../../lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [companyName, setCompanyName] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate user creation & session
    saveAuthSession(
      {
        id: `usr-${Date.now()}`,
        email,
        fullName,
        role,
        ...(role === 'MERCHANT' ? { approvalStatus: 'PENDING' } : {})
      },
      'mock_jwt_registration_token'
    );

    if (role === 'CUSTOMER') router.push('/booking');
    else if (role === 'COURIER') router.push('/tasks');
    else if (role === 'MERCHANT') router.push('/portal?status=pending_approval');
    else router.push('/dispatch');
  };

  return (
    <div className="register-wrapper">
      <div className="register-card">
        <div className="card-header">
          <Link href="/" className="logo-text">
            swift<span className="orange-dot">.</span>
          </Link>
          <h2 className="register-heading">Create Account</h2>
          <p className="register-sub">Join SwiftDrop to send, track, or manage deliveries.</p>
        </div>

        <form onSubmit={handleRegister} className="register-form">
          <div className="form-group">
            <label className="input-label">Account Type</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-chip ${role === 'CUSTOMER' ? 'active' : ''}`}
                onClick={() => setRole('CUSTOMER')}
              >
                Customer
              </button>
              <button
                type="button"
                className={`role-chip ${role === 'COURIER' ? 'active' : ''}`}
                onClick={() => setRole('COURIER')}
              >
                Courier
              </button>
              <button
                type="button"
                className={`role-chip ${role === 'MERCHANT' ? 'active' : ''}`}
                onClick={() => setRole('MERCHANT')}
              >
                Business Merchant
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Kasun Perera"
              className="styled-input"
            />
          </div>

          {role === 'MERCHANT' && (
            <div className="form-group">
              <label className="input-label">Registered Business / Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Electronics Ltd"
                className="styled-input"
              />
            </div>
          )}

          <div className="form-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="styled-input"
            />
          </div>

          <div className="form-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="styled-input"
            />
          </div>

          <button type="submit" className="submit-btn">
            Create {role.charAt(0) + role.slice(1).toLowerCase()} Account
          </button>
        </form>

        <div className="card-footer">
          <p>Already have an account? <Link href="/login" className="footer-link">Sign in</Link></p>
        </div>
      </div>

      <style jsx>{`
        .register-wrapper {
          min-height: calc(100vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2.5rem 1rem;
        }

        .register-card {
          width: 100%;
          max-width: 480px;
          background: #ffffff;
          border-radius: 24px;
          padding: 2.25rem;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08);
          border: 1px solid #e2e8f0;
        }

        .card-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .logo-text {
          font-size: 2rem;
          font-weight: 800;
          color: #0f172a;
          text-decoration: none;
          letter-spacing: -0.04em;
        }

        .orange-dot {
          color: #ff6600;
        }

        .register-heading {
          font-size: 1.5rem;
          font-weight: 750;
          color: #0f172a;
          margin: 0.5rem 0 0.25rem;
        }

        .register-sub {
          font-size: 0.875rem;
          color: #64748b;
        }

        .role-selector {
          display: flex;
          gap: 0.5rem;
        }

        .role-chip {
          flex: 1;
          padding: 0.5rem 0.25rem;
          font-size: 0.8rem;
          font-weight: 600;
          background: #f1f5f9;
          color: #64748b;
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .role-chip.active {
          background: #fff7ed;
          color: #ff6600;
          border-color: #fdba74;
        }

        .register-form {
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .input-label {
          font-size: 0.825rem;
          font-weight: 600;
          color: #334155;
        }

        .styled-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.925rem;
          color: #0f172a;
          outline: none;
        }

        .styled-input:focus {
          border-color: #ff6600;
          box-shadow: 0 0 0 3px rgba(255, 102, 0, 0.15);
        }

        .submit-btn {
          margin-top: 0.5rem;
          width: 100%;
          padding: 0.85rem;
          background: #111827;
          color: #ffffff;
          border: none;
          border-radius: 9999px;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
        }

        .submit-btn:hover {
          background: #1f2937;
        }

        .card-footer {
          margin-top: 1.5rem;
          text-align: center;
          font-size: 0.85rem;
          color: #64748b;
        }

        .footer-link {
          color: #ff6600;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
