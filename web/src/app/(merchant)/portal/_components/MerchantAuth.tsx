'use client';

import { useState } from 'react';
import Link from 'next/link';
import { merchantApi, SessionResponse } from './merchant-api';

const inputCls =
  'w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100 transition-all';
const labelCls = 'block text-xs font-bold text-slate-600 mb-1.5';

export default function MerchantAuth({ onSession, notice }: { onSession: (s: SessionResponse) => void; notice?: string }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    companyName: '',
    registrationNumber: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const session =
        mode === 'login'
          ? await merchantApi.login(form.email.trim(), form.password)
          : await merchantApi.register({
              email: form.email.trim(),
              password: form.password,
              fullName: form.fullName.trim(),
              phone: form.phone.trim() || undefined,
              companyName: form.companyName.trim(),
              registrationNumber: form.registrationNumber.trim() || undefined,
            });
      onSession(session);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f8f6] flex items-center justify-center px-4 py-10 font-sans antialiased">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center mb-6">
          <span className="text-2xl font-black tracking-tight text-slate-900">
            swiftdrop<span className="text-[#ff6600]">.</span>
          </span>
          <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-[#ff6600] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
            Merchant
          </span>
        </Link>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'login' ? 'Merchant portal sign in' : 'Register your business'}
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-6">
            {mode === 'login'
              ? 'Manage orders and API credentials for your store.'
              : 'Your account is reviewed by our operations team before you can ship.'}
          </p>

          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6" role="tablist">
            {(['login', 'register'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'New business'}
              </button>
            ))}
          </div>

          {notice && !error && (
            <p className="mb-4 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">{notice}</p>
          )}
          {error && (
            <p role="alert" className="mb-4 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <form onSubmit={submit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="m-company" className={labelCls}>Company name</label>
                  <input id="m-company" required autoComplete="organization" value={form.companyName} onChange={set('companyName')} className={inputCls} placeholder="Apex Electronics Pvt Ltd" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="m-reg" className={labelCls}>Business reg. no. <span className="font-normal text-slate-400">(optional)</span></label>
                    <input id="m-reg" value={form.registrationNumber} onChange={set('registrationNumber')} className={inputCls} placeholder="PV-12345" />
                  </div>
                  <div>
                    <label htmlFor="m-phone" className={labelCls}>Phone <span className="font-normal text-slate-400">(optional)</span></label>
                    <input id="m-phone" type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} className={inputCls} placeholder="+94 11 234 5678" />
                  </div>
                </div>
                <div>
                  <label htmlFor="m-name" className={labelCls}>Your full name</label>
                  <input id="m-name" required autoComplete="name" value={form.fullName} onChange={set('fullName')} className={inputCls} />
                </div>
              </>
            )}
            <div>
              <label htmlFor="m-email" className={labelCls}>Email address</label>
              <input id="m-email" type="email" required autoComplete="username" value={form.email} onChange={set('email')} className={inputCls} placeholder="you@store.com" />
            </div>
            <div>
              <label htmlFor="m-password" className={labelCls}>Password</label>
              <input
                id="m-password"
                type="password"
                required
                minLength={mode === 'register' ? 8 : undefined}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={form.password}
                onChange={set('password')}
                className={inputCls}
              />
              {mode === 'register' && <p className="text-[11px] text-slate-400 mt-1.5">At least 8 characters, with a letter and a number.</p>}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3.5 bg-[#ff6600] hover:bg-[#ea580c] disabled:opacity-60 text-white rounded-xl font-black text-sm shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Submit for approval'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-400 mt-5">
          Not a merchant? <Link href="/login" className="font-bold text-[#ff6600]">Go to the main sign in</Link>
        </p>
      </div>
    </div>
  );
}
