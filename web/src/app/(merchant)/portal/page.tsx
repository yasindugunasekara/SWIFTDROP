'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { clearAuthSession, saveAuthSession } from '../../../lib/auth';
import { ApiError, MerchantProfile, MerchantStats, SessionResponse, getToken, merchantApi } from './_components/merchant-api';
import MerchantAuth from './_components/MerchantAuth';
import OrdersPanel from './_components/OrdersPanel';
import CredentialsPanel from './_components/CredentialsPanel';
import OnboardingPanel, { OnboardingBanner } from './_components/OnboardingPanel';

// Member 6 — Merchant portal: onboarding status, order dashboard and credential management.

type Section = 'orders' | 'api' | 'onboarding';

const NAV: { id: Section; label: string; icon: string }[] = [
  { id: 'orders', label: 'Orders', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  {
    id: 'api',
    label: 'API & Credentials',
    icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  },
  { id: 'onboarding', label: 'Onboarding Status', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
];

const TITLES: Record<Section, { title: string; sub: string }> = {
  orders: { title: 'Order dashboard', sub: 'Every order created in the portal or through your API key.' },
  api: { title: 'API & credentials', sub: 'Connect your store to SwiftDrop with secure API keys.' },
  onboarding: { title: 'Onboarding status', sub: 'Your merchant verification and account details.' },
};

/** True for errors meaning "this session is not a valid merchant session". */
const isSessionError = (e: unknown) =>
  e instanceof ApiError &&
  (e.status === 401 ||
    (e.status === 403 && /invalid or expired token|forbidden: role/i.test(e.message)) ||
    (e.status === 404 && /merchant profile not found/i.test(e.message)));

export default function MerchantPortalPage() {
  const [phase, setPhase] = useState<'loading' | 'auth' | 'ready'>('loading');
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [section, setSection] = useState<Section>('orders');
  const [notice, setNotice] = useState('');
  const [loadError, setLoadError] = useState('');

  const signOut = useCallback((message = '') => {
    clearAuthSession();
    setMerchant(null);
    setNotice(message);
    setPhase('auth');
  }, []);

  // Bumping profileTick (re)loads the merchant profile.
  const [profileTick, setProfileTick] = useState(0);
  const loadProfile = useCallback(() => setProfileTick((t) => t + 1), []);

  // With no stored token the API answers 401, which lands on the sign-in screen.
  useEffect(() => {
    let cancelled = false;
    merchantApi
      .profile()
      .then((res) => {
        if (cancelled) return;
        setMerchant(res.merchant);
        setLoadError('');
        setPhase('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        // A stored token that is rejected (e.g. another role's session) gets an explanation.
        if (isSessionError(e)) signOut(getToken() ? 'Please sign in with your merchant account.' : '');
        else {
          setLoadError(e instanceof Error ? e.message : 'Failed to load your merchant profile');
          setPhase((p) => (p === 'loading' ? 'auth' : p));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [profileTick, signOut]);

  /** Passed to panels: signs out on session errors and reports whether it handled the error. */
  const handleAuthError = useCallback(
    (e: unknown) => {
      if (isSessionError(e)) {
        signOut('Your session expired. Please sign in again.');
        return true;
      }
      return false;
    },
    [signOut]
  );

  const handleStats = useCallback((stats: MerchantStats) => {
    setMerchant((m) => (m ? { ...m, stats } : m));
  }, []);

  const onSession = (s: SessionResponse) => {
    saveAuthSession(s.user, s.accessToken);
    setMerchant(s.merchant);
    setNotice('');
    setSection(s.merchant.status === 'APPROVED' ? 'orders' : 'onboarding');
    setPhase('ready');
    loadProfile();
  };

  if (phase === 'loading') {
    return <div className="min-h-screen flex items-center justify-center text-sm text-slate-400">Loading merchant portal…</div>;
  }
  if (phase === 'auth' || !merchant) {
    return <MerchantAuth onSession={onSession} notice={notice || loadError} />;
  }

  const statusPill = {
    APPROVED: { label: 'Approved partner', dot: 'bg-emerald-500' },
    PENDING: { label: 'Pending approval', dot: 'bg-amber-500' },
    REJECTED: { label: 'Not approved', dot: 'bg-red-500' },
  }[merchant.status];

  return (
    <div className="w-full min-h-screen bg-white flex flex-col lg:flex-row font-sans antialiased text-slate-800">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-white border-b lg:border-b-0 lg:border-r border-slate-100 p-5 lg:p-6 flex flex-col justify-between flex-shrink-0">
        <div>
          <Link href="/" className="inline-flex items-center gap-1.5 mb-6 lg:mb-8">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              swiftdrop<span className="text-[#ff6600]">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-2 mb-5 bg-orange-50 border border-orange-200/80 rounded-2xl">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusPill.dot}`} />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-black text-slate-900 block leading-tight truncate">{merchant.name}</span>
              <span className="text-[10px] text-[#ff6600] font-bold block leading-tight">{statusPill.label}</span>
            </div>
          </div>

          <nav className="flex lg:flex-col gap-1.5 overflow-x-auto -mx-1 px-1 pb-1 lg:pb-0" aria-label="Merchant portal">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                aria-current={section === item.id ? 'page' : undefined}
                className={`flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  section === item.id
                    ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            ))}
            <Link
              href="/webhooks"
              className="flex items-center gap-3 px-4 py-2.5 lg:py-3 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Webhook Center</span>
            </Link>
          </nav>
        </div>

        <div className="hidden lg:flex mt-8 pt-6 border-t border-slate-100 flex-col gap-3">
          <div className="text-xs text-slate-500">
            <span className="block font-bold text-slate-900 truncate">{merchant.contact.fullName}</span>
            <span className="block truncate">{merchant.contact.email}</span>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-white hover:bg-[#ff6600] hover:border-[#ff6600] transition-all cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-9 bg-white flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{TITLES[section].title}</h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">{TITLES[section].sub}</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="lg:hidden px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 cursor-pointer"
          >
            Sign out
          </button>
        </div>

        {section !== 'onboarding' && <OnboardingBanner merchant={merchant} onRefresh={loadProfile} />}

        {section === 'orders' && <OrdersPanel merchant={merchant} onAuthError={handleAuthError} onStats={handleStats} />}
        {section === 'api' && <CredentialsPanel merchant={merchant} onAuthError={handleAuthError} />}
        {section === 'onboarding' && <OnboardingPanel merchant={merchant} onRefresh={loadProfile} />}
      </main>
    </div>
  );
}
