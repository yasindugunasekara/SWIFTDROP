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
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-8 shadow-xl border border-slate-200/80">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            swift<span className="text-brand-orange">.</span>
          </Link>
          <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
          <p className="text-xs text-slate-500 mt-0.5">Join SwiftDrop to send, track, or manage deliveries.</p>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Account Type</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {(['CUSTOMER', 'COURIER', 'MERCHANT'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`py-2 text-xs font-semibold rounded-lg transition-all capitalize cursor-pointer ${
                    role === r
                      ? 'bg-white text-brand-orange shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setRole(r)}
                >
                  {r === 'MERCHANT' ? 'Business' : r.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Kasun Perera"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
            />
          </div>

          {role === 'MERCHANT' && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-700">Registered Business / Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apex Electronics Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
              />
            </div>
          )}

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
            <label className="text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 bg-brand-dark hover:bg-brand-dark-hover text-white rounded-full font-semibold text-sm transition-all shadow-md hover:-translate-y-0.5 cursor-pointer"
          >
            Create {role.charAt(0) + role.slice(1).toLowerCase()} Account
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          <p>Already have an account? <Link href="/login" className="text-brand-orange font-semibold hover:underline">Sign in</Link></p>
        </div>
      </div>
    </div>
  );
}
