'use client';

import { MerchantProfile, formatDate } from './merchant-api';

const STATUS_COPY = {
  PENDING: {
    title: 'Your business is under review',
    body: 'Our operations team is verifying your details. Order creation and API keys unlock as soon as you are approved.',
    tone: 'bg-amber-50 border-amber-200 text-amber-900',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    title: 'Approved partner',
    body: 'Your account is active. You can create orders in the portal and connect your store with an API key.',
    tone: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    dot: 'bg-emerald-500',
  },
  REJECTED: {
    title: 'Application not approved',
    body: 'Your merchant application was not approved and existing API keys are disabled. Contact SwiftDrop support to appeal.',
    tone: 'bg-red-50 border-red-200 text-red-900',
    dot: 'bg-red-500',
  },
} as const;

/** Compact banner shown above every portal section while the merchant is not approved. */
export function OnboardingBanner({ merchant, onRefresh }: { merchant: MerchantProfile; onRefresh: () => void }) {
  if (merchant.status === 'APPROVED') return null;
  const c = STATUS_COPY[merchant.status];
  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-2xl border px-5 py-4 ${c.tone}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${c.dot}`} />
        <div>
          <p className="text-sm font-black">{c.title}</p>
          <p className="text-xs mt-0.5 opacity-80">{c.body}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/70 hover:bg-white text-xs font-bold border border-current/10 cursor-pointer transition-all"
      >
        Check status
      </button>
    </div>
  );
}

export default function OnboardingPanel({ merchant, onRefresh }: { merchant: MerchantProfile; onRefresh: () => void }) {
  const c = STATUS_COPY[merchant.status];
  const steps = [
    { label: 'Business registered', detail: formatDate(merchant.createdAt), state: 'done' as const },
    {
      label: 'Operations review',
      detail: merchant.status === 'PENDING' ? 'In progress' : merchant.status === 'APPROVED' ? 'Passed' : 'Not approved',
      state: merchant.status === 'PENDING' ? ('current' as const) : merchant.status === 'APPROVED' ? ('done' as const) : ('failed' as const),
    },
    {
      label: 'Ready to ship',
      detail: merchant.status === 'APPROVED' ? 'Orders & API keys enabled' : 'Locked until approval',
      state: merchant.status === 'APPROVED' ? ('done' as const) : ('todo' as const),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className={`rounded-3xl border p-6 sm:p-7 ${c.tone}`}>
        <span className="text-[10px] font-black uppercase tracking-wider opacity-70">Onboarding status</span>
        <h2 className="text-2xl font-black tracking-tight mt-1">{c.title}</h2>
        <p className="text-sm mt-1 opacity-80 max-w-xl">{c.body}</p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {steps.map((s, i) => (
          <li key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                  s.state === 'done'
                    ? 'bg-emerald-500 text-white'
                    : s.state === 'current'
                    ? 'bg-amber-400 text-white'
                    : s.state === 'failed'
                    ? 'bg-red-500 text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}
                aria-hidden="true"
              >
                {s.state === 'done' ? '✓' : s.state === 'failed' ? '✕' : i + 1}
              </span>
              <span className="text-sm font-bold text-slate-900">{s.label}</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 ml-9">{s.detail}</p>
          </li>
        ))}
      </ol>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900">Business details</h3>
          <button type="button" onClick={onRefresh} className="text-xs font-bold text-[#ff6600] hover:underline cursor-pointer">
            Refresh status
          </button>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
          {[
            ['Company', merchant.name],
            ['Registration no.', merchant.registrationNumber || '—'],
            ['Account contact', merchant.contact.fullName],
            ['Email', merchant.contact.email],
            ['Phone', merchant.contact.phone || '—'],
            ['Merchant ID', merchant.id],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
              <dd className={`text-slate-900 font-semibold mt-0.5 break-all ${k === 'Merchant ID' ? 'font-mono text-xs' : ''}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
