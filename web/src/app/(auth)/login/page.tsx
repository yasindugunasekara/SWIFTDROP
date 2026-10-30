'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveAuthSession, UserRole } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();

  // Active Role Tab
  const [activeRole, setActiveRole] = useState<UserRole>('CUSTOMER');
  const [email, setEmail] = useState('customer@swiftdrop.com');
  const [password, setPassword] = useState('Customer@123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sample Credentials Data for quick fill
  const demoAccounts = {
    CUSTOMER: { email: 'customer@swiftdrop.com', pass: 'Customer@123', name: 'Kasun Perera', path: '/booking' },
    COURIER: { email: 'courier@swiftdrop.com', pass: 'Courier@123', name: 'Sunil Silva (Courier)', path: '/tasks' },
    MERCHANT: { email: 'merchant@swiftdrop.com', pass: 'Merchant@123', name: 'Apex Electronics Store', path: '/portal' },
    DISPATCHER: { email: 'dispatcher@swiftdrop.com', pass: 'Dispatcher@123', name: 'Fleet Operations Manager', path: '/dispatch' },
  };

  // Switch role tab and autofill demo credentials
  const handleRoleTabChange = (role: UserRole) => {
    setActiveRole(role);
    setEmail(demoAccounts[role as keyof typeof demoAccounts]?.email || '');
    setPassword(demoAccounts[role as keyof typeof demoAccounts]?.pass || '');
    setErrorMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Authenticate with sample demo credentials or backend
      const account = demoAccounts[activeRole as keyof typeof demoAccounts];

      if (email && password) {
        // Save session locally
        saveAuthSession(
          {
            id: `usr-${activeRole.toLowerCase()}-01`,
            email: email,
            fullName: account?.name || email.split('@')[0],
            role: activeRole,
          },
          'mock_jwt_access_token_swiftdrop',
          'mock_jwt_refresh_token_swiftdrop'
        );

        // Redirect to role workspace
        router.push(account?.path || '/');
      } else {
        setErrorMsg('Please enter both email and password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Google OAuth 2.0 flow
    saveAuthSession(
      {
        id: 'usr-google-customer',
        email: 'google.customer@gmail.com',
        fullName: 'Google User',
        role: 'CUSTOMER'
      },
      'mock_jwt_google_oauth_token'
    );
    router.push('/booking');
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Brand Header */}
        <div className="card-header">
          <Link href="/" className="logo-text">
            swift<span className="orange-dot">.</span>
          </Link>
          <h2 className="login-heading">Welcome Back</h2>
          <p className="login-sub">Select your account type to sign in to SwiftDrop.</p>
        </div>

        {/* Role Tabs */}
        <div className="role-tabs">
          <button
            type="button"
            className={`tab-btn ${activeRole === 'CUSTOMER' ? 'active' : ''}`}
            onClick={() => handleRoleTabChange('CUSTOMER')}
          >
            Customer
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRole === 'COURIER' ? 'active' : ''}`}
            onClick={() => handleRoleTabChange('COURIER')}
          >
            Courier
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRole === 'MERCHANT' ? 'active' : ''}`}
            onClick={() => handleRoleTabChange('MERCHANT')}
          >
            Merchant
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRole === 'DISPATCHER' ? 'active' : ''}`}
            onClick={() => handleRoleTabChange('DISPATCHER')}
          >
            Dispatcher
          </button>
        </div>

        {/* Demo Credentials Quick Info Box */}
        <div className="demo-info-badge">
          <div className="badge-tag">Sample Credential Loaded</div>
          <div className="badge-details">
            <span><strong>Email:</strong> {email}</span>
            <span><strong>Password:</strong> {password}</span>
          </div>
        </div>

        {/* Social Login Button for Customers */}
        {activeRole === 'CUSTOMER' && (
          <div className="social-login-block">
            <button type="button" onClick={handleGoogleLogin} className="google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" className="google-icon">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
              </svg>
              Continue with Google (OAuth 2.0)
            </button>
            <div className="divider-line">
              <span>or sign in with email</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="error-alert">
            {errorMsg}
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleLogin} className="login-form">
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
            <div className="label-row">
              <label className="input-label">Password</label>
              <a href="#" className="forgot-link">Forgot password?</a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="styled-input"
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Authenticating...' : `Sign In as ${activeRole.charAt(0) + activeRole.slice(1).toLowerCase()}`}
          </button>
        </form>

        {/* Card Footer */}
        <div className="card-footer">
          {activeRole === 'MERCHANT' ? (
            <p>New business partner? <Link href="/register" className="footer-link">Apply for Merchant Account</Link></p>
          ) : (
            <p>Don&apos;t have an account? <Link href="/register" className="footer-link">Sign up now</Link></p>
          )}
        </div>
      </div>

      <style jsx>{`
        .login-wrapper {
          min-height: calc(100vh - 120px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 24px;
          padding: 2.25rem;
          box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.08), 0 0 1px 1px rgba(0, 0, 0, 0.04);
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

        .login-heading {
          font-size: 1.5rem;
          font-weight: 750;
          color: #0f172a;
          margin: 0.5rem 0 0.25rem;
        }

        .login-sub {
          font-size: 0.875rem;
          color: #64748b;
        }

        /* Role Switcher Tabs */
        .role-tabs {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.35rem;
          background: #f1f5f9;
          padding: 0.35rem;
          border-radius: 12px;
          margin-bottom: 1.25rem;
        }

        .tab-btn {
          border: none;
          background: transparent;
          padding: 0.5rem 0;
          font-size: 0.8rem;
          font-weight: 600;
          color: #64748b;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .tab-btn.active {
          background: #ffffff;
          color: #ff6600;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
        }

        /* Demo Credentials Badge */
        .demo-info-badge {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          padding: 0.75rem 1rem;
          margin-bottom: 1.25rem;
          font-size: 0.8rem;
        }

        .badge-tag {
          font-weight: 700;
          color: #c2410c;
          text-transform: uppercase;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          margin-bottom: 0.25rem;
        }

        .badge-details {
          display: flex;
          justify-content: space-between;
          color: #7c2d12;
        }

        /* Social Login */
        .social-login-block {
          margin-bottom: 1.25rem;
        }

        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 0.65rem 1rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .google-btn:hover {
          background: #f8fafc;
        }

        .divider-line {
          display: flex;
          align-items: center;
          text-align: center;
          margin: 1.25rem 0;
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .divider-line::before,
        .divider-line::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }

        .divider-line span {
          padding: 0 0.75rem;
        }

        /* Form Controls */
        .login-form {
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

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .forgot-link {
          font-size: 0.8rem;
          color: #ff6600;
          font-weight: 500;
        }

        .styled-input {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border-radius: 10px;
          border: 1px solid #cbd5e1;
          font-size: 0.925rem;
          color: #0f172a;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
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
          transition: all 0.2s ease;
        }

        .submit-btn:hover {
          background: #1f2937;
          transform: translateY(-1px);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-alert {
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          font-size: 0.825rem;
          margin-bottom: 1rem;
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
