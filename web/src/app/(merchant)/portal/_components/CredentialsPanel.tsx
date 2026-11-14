'use client';
import LoadingState from '../../../../components/ui/LoadingState';


import { useEffect, useState } from 'react';
import { API_DOCS_BASE, ApiKeyRecord, MerchantProfile, formatDate, merchantApi } from './merchant-api';

const MAX_ACTIVE_KEYS = 5;

export default function CredentialsPanel({
  merchant,
  onAuthError,
}: {
  merchant: MerchantProfile;
  onAuthError: (e: unknown) => boolean;
}) {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [reloadTick, setReloadTick] = useState(0);
  const [loadedTick, setLoadedTick] = useState(-1);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ apiKey: string; name: string } | null>(null);
  const [copied, setCopied] = useState('');
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const approved = merchant.status === 'APPROVED';
  const activeCount = keys.filter((k) => k.isActive).length;

  const loading = loadedTick !== reloadTick;
  const load = () => setReloadTick((t) => t + 1);

  useEffect(() => {
    let cancelled = false;
    merchantApi
      .apiKeys()
      .then((res) => {
        if (cancelled) return;
        setKeys(res.apiKeys);
        setLoadedTick(reloadTick);
      })
      .catch((e) => {
        if (cancelled || onAuthError(e)) return;
        setError(e instanceof Error ? e.message : 'Failed to load API keys');
        setLoadedTick(reloadTick);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick, onAuthError]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await merchantApi.generateKey(name.trim() || 'Production key');
      setRevealed({ apiKey: res.apiKey, name: res.key.name });
      setName('');
      load();
    } catch (err) {
      if (!onAuthError(err)) setError(err instanceof Error ? err.message : 'Could not generate key');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setConfirmRevoke(null);
    try {
      await merchantApi.revokeKey(id);
      load();
    } catch (err) {
      if (!onAuthError(err)) setError(err instanceof Error ? err.message : 'Could not revoke key');
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      setCopied('');
    }
  };

  const curl = `curl -X POST ${API_DOCS_BASE}/merchant/partner/orders \\
  -H "X-API-Key: ${revealed?.apiKey ?? 'sw_live_YOUR_KEY'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "senderName": "Warehouse", "senderPhone": "+94112345678",
    "pickupAddress": "120 Union Place, Colombo 02",
    "recipientName": "Nimal Perera", "recipientPhone": "+94770000000",
    "deliveryAddress": "45 Kandy Road, Kadawatha",
    "weightKg": 1.5
  }'`;

  return (
    <div className="flex flex-col gap-6">
      {/* Generate */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900">Partner API keys</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Keys authenticate your store to the order API. Every request is scoped to {merchant.name} and limited to 60 requests per minute.
            </p>
          </div>
          <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap tabular-nums">
            {activeCount} / {MAX_ACTIVE_KEYS} active
          </span>
        </div>

        {!approved ? (
          <p className="text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            API keys can be generated once your merchant account is approved.
          </p>
        ) : (
          <form onSubmit={generate} className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="key-name" className="sr-only">Key name</label>
            <input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Key name, e.g. Shopify store"
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="submit"
              disabled={busy || activeCount >= MAX_ACTIVE_KEYS}
              className="px-5 py-2.5 rounded-xl bg-[#ff6600] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-black shadow-md shadow-orange-500/20 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
            >
              {busy ? 'Generating…' : 'Generate new key'}
            </button>
          </form>
        )}

        {error && (
          <p role="alert" className="mt-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {revealed && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
            <p className="text-xs font-black text-emerald-900">
              “{revealed.name}” created. Copy it now. For security it will not be shown again.
            </p>
            <div className="mt-2.5 flex items-center gap-2 bg-white rounded-xl border border-emerald-200 p-2.5">
              <code className="flex-1 text-xs font-mono font-bold text-slate-900 break-all">{revealed.apiKey}</code>
              <button
                type="button"
                onClick={() => copy(revealed.apiKey, 'key')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                {copied === 'key' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <button type="button" onClick={() => setRevealed(null)} className="mt-2 text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer">
              I have stored it safely
            </button>
          </div>
        )}
      </div>

      {/* Key list */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {loading && keys.length === 0 ? (
          <LoadingState label="Loading keys..." />
        ) : keys.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No API keys yet.</p>
        ) : (
          <ul>
            {keys.map((k) => (
              <li key={k.id} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between px-5 py-4 border-b border-slate-50 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 truncate">{k.name}</span>
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        k.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {k.isActive ? 'Active' : 'Revoked'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <code className="font-mono">{k.keyPrefix}…</code> · created {formatDate(k.createdAt)} · last used {formatDate(k.lastUsedAt)}
                  </p>
                </div>
                {k.isActive &&
                  (confirmRevoke === k.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-red-700">Revoke this key?</span>
                      <button type="button" onClick={() => revoke(k.id)} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer">
                        Revoke
                      </button>
                      <button type="button" onClick={() => setConfirmRevoke(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(k.id)}
                      className="self-start sm:self-auto px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:border-red-300 hover:text-red-700 cursor-pointer"
                    >
                      Revoke
                    </button>
                  ))}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quickstart */}
      <div className="bg-slate-900 rounded-3xl p-6 text-white">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black">Quickstart: create an order</h3>
          <button type="button" onClick={() => copy(curl, 'curl')} className="text-xs font-bold text-orange-300 hover:text-orange-200 cursor-pointer">
            {copied === 'curl' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre className="text-[11px] leading-relaxed font-mono text-slate-200 overflow-x-auto whitespace-pre">{curl}</pre>
        <p className="text-[11px] text-slate-400 mt-3">
          Also available: <code className="text-slate-200">GET /merchant/partner/orders</code> and{' '}
          <code className="text-slate-200">GET /merchant/partner/orders/:trackingNumber</code>. Errors: 401 invalid key, 403 account not approved, 429 rate limit.
        </p>
      </div>
    </div>
  );
}
