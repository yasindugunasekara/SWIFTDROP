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
      const account = demoAccounts[activeRole as keyof typeof demoAccounts];

      if (email && password) {
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
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 shadow-xl border border-slate-200/80">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            swift<span className="text-brand-orange">.</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900">Welcome Back</h2>
          <p className="text-xs text-slate-500 mt-0.5">Select your account type to sign in to SwiftDrop.</p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl mb-4">
          {(['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER'] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`py-2 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                activeRole === r
                  ? 'bg-white text-brand-orange shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => handleRoleTabChange(r)}
            >
              {r.toLowerCase()}
            </button>
          ))}
        </div>

        {/* Demo Credentials Quick Info Box */}
        <div className="bg-orange-50/80 border border-orange-200/80 rounded-xl p-3 mb-5 text-xs text-orange-950">
          <div className="font-bold text-[0.7rem] text-brand-orange uppercase tracking-wider mb-1">
            Sample Credential Loaded
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-slate-700">
            <span><strong>Email:</strong> {email}</span>
            <span><strong>Password:</strong> {password}</span>
          </div>
        </div>

        {/* Social Login Button for Customers */}
        {activeRole === 'CUSTOMER' && (
          <div className="mb-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-xl py-2 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
              </svg>
              Continue with Google (OAuth 2.0)
            </button>
            <div className="flex items-center my-4 text-xs text-slate-400 before:flex-1 before:border-t before:border-slate-200 after:flex-1 after:border-t after:border-slate-200">
              <span className="px-2">or sign in with email</span>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 border border-red-200 text-xs rounded-lg p-2.5 mb-4">
            {errorMsg}
          </div>
        )}

        {/* Main Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-700">Password</label>
              <a href="#" className="text-xs text-brand-orange hover:underline">Forgot password?</a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-brand-dark hover:bg-brand-dark-hover text-white rounded-full font-semibold text-sm transition-all shadow-md hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : `Sign In as ${activeRole.charAt(0) + activeRole.slice(1).toLowerCase()}`}
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-6 text-center text-xs text-slate-500">
          {activeRole === 'MERCHANT' ? (
            <p>New business partner? <Link href="/register" className="text-brand-orange font-semibold hover:underline">Apply for Merchant Account</Link></p>
          ) : (
            <p>Don&apos;t have an account? <Link href="/register" className="text-brand-orange font-semibold hover:underline">Sign up now</Link></p>
          )}
        </div>
      </div>
    </div>
  );
}
