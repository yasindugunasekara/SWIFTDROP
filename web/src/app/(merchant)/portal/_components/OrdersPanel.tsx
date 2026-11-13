'use client';

import { useEffect, useState } from 'react';
import {
  ApiError,
  MerchantOrder,
  MerchantProfile,
  MerchantStats,
  STATUS_LABEL,
  STATUS_TONE,
  formatDate,
  formatLkr,
  merchantApi,
} from './merchant-api';

const PAGE_SIZE = 20;
const inputCls =
  'w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100 transition-all';
const labelCls = 'block text-[11px] font-bold text-slate-500 mb-1';

const EMPTY_FORM = {
  senderName: '',
  senderPhone: '',
  pickupAddress: '',
  recipientName: '',
  recipientPhone: '',
  deliveryAddress: '',
  weightKg: '1',
  distanceKm: '',
  specialNotes: '',
};

export default function OrdersPanel({
  merchant,
  onAuthError,
  onStats,
}: {
  merchant: MerchantProfile;
  onAuthError: (e: unknown) => boolean;
  onStats: (s: MerchantStats) => void;
}) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(0);
  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<MerchantStats | null>(merchant.stats ?? null);
  const [reloadTick, setReloadTick] = useState(0);
  /** Key of the last finished request; loading = the wanted request has not finished yet. */
  const [loaded, setLoaded] = useState<{ key: string; error: string } | null>(null);
  const [selected, setSelected] = useState<MerchantOrder | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [creating, setCreating] = useState(false);
  const [flash, setFlash] = useState('');

  const approved = merchant.status === 'APPROVED';

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const requestKey = `${filter}|${debounced}|${page}|${reloadTick}`;
  const loading = loaded?.key !== requestKey;
  const error = loaded?.key === requestKey ? loaded.error : '';
  const load = () => setReloadTick((t) => t + 1);
  const changeFilter = (f: string) => {
    setFilter(f);
    setPage(0);
  };

  useEffect(() => {
    let cancelled = false;
    merchantApi
      .orders({ filter, search: debounced, limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setOrders(res.orders);
        setTotal(res.total);
        setStats(res.stats);
        onStats(res.stats);
        setLoaded({ key: requestKey, error: '' });
      })
      .catch((e) => {
        if (cancelled || onAuthError(e)) return;
        setLoaded({ key: requestKey, error: e instanceof Error ? e.message : 'Failed to load orders' });
      });
    return () => {
      cancelled = true;
    };
  }, [filter, debounced, page, requestKey, onAuthError, onStats]);

  const openOrder = async (o: MerchantOrder) => {
    setSelected(o);
    try {
      const res = await merchantApi.order(o.id);
      setSelected(res.order);
    } catch (e) {
      onAuthError(e);
    }
  };

  const submitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setCreating(true);
    try {
      const res = await merchantApi.createOrder({
        ...form,
        weightKg: Number(form.weightKg),
        distanceKm: form.distanceKm ? Number(form.distanceKm) : undefined,
        specialNotes: form.specialNotes || undefined,
      });
      setForm(EMPTY_FORM);
      setShowCreate(false);
      setFlash(`Order ${res.order.trackingNumber} created · ${formatLkr(res.fee.totalFee)}`);
      setTimeout(() => setFlash(''), 5000);
      changeFilter('all');
      setSearch('');
      load();
    } catch (err) {
      if (!onAuthError(err)) setFormError(err instanceof ApiError || err instanceof Error ? err.message : 'Could not create order');
    } finally {
      setCreating(false);
    }
  };

  const set = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const chips = [
    { id: 'all', label: 'All orders', count: stats?.total },
    { id: 'pending', label: 'Pending dispatch', count: stats?.pending },
    { id: 'transit', label: 'In transit', count: stats?.transit },
    { id: 'delivered', label: 'Delivered', count: stats?.delivered },
    { id: 'exceptions', label: 'Exceptions', count: stats?.exceptions },
  ];
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total orders', value: stats?.total ?? '—', tone: 'text-slate-900' },
          { label: 'In transit', value: stats?.transit ?? '—', tone: 'text-[#ff6600]' },
          { label: 'Delivered', value: stats?.delivered ?? '—', tone: 'text-emerald-600' },
          { label: 'Shipping spend', value: stats ? formatLkr(stats.totalSpend) : '—', tone: 'text-slate-900' },
        ].map((t) => (
          <div key={t.label} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{t.label}</div>
            <div className={`text-2xl font-black mt-1 tabular-nums ${t.tone}`}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => changeFilter(c.id)}
              aria-pressed={filter === c.id}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filter === c.id
                  ? 'bg-[#ff6600] text-white shadow-md shadow-orange-500/20'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-orange-200 hover:text-[#ff6600]'
              }`}
            >
              {c.label}
              {c.count !== undefined && <span className="ml-1.5 opacity-75 tabular-nums">{c.count}</span>}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking # or recipient"
            aria-label="Search orders"
            className="flex-1 lg:w-64 px-4 py-2.5 rounded-full border border-slate-200 bg-[#f8f8f6] text-xs outline-none focus:border-[#ff6600] focus:ring-2 focus:ring-orange-100"
          />
          <button
            type="button"
            disabled={!approved}
            title={approved ? undefined : 'Available once your account is approved'}
            onClick={() => setShowCreate((v) => !v)}
            className="px-4 py-2.5 rounded-full bg-[#ff6600] hover:bg-[#ea580c] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white text-xs font-black shadow-md shadow-orange-500/20 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed transition-all"
          >
            + New order
          </button>
        </div>
      </div>

      {flash && (
        <p role="status" className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          {flash}
        </p>
      )}

      {/* Create order */}
      {showCreate && (
        <form onSubmit={submitOrder} className="bg-white rounded-3xl border border-orange-100 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black text-slate-900">New delivery order</h3>
            <span className="text-[11px] text-slate-400">Fee is calculated by SwiftDrop from zone rates</span>
          </div>
          {formError && (
            <p role="alert" className="mb-4 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <fieldset className="space-y-3">
              <legend className="text-[11px] font-black uppercase tracking-wider text-[#ff6600] mb-1">Pickup</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="o-sn">Sender name</label>
                  <input id="o-sn" required value={form.senderName} onChange={set('senderName')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="o-sp">Sender phone</label>
                  <input id="o-sp" required type="tel" value={form.senderPhone} onChange={set('senderPhone')} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="o-pa">Pickup address</label>
                <input id="o-pa" required minLength={5} value={form.pickupAddress} onChange={set('pickupAddress')} className={inputCls} />
              </div>
            </fieldset>
            <fieldset className="space-y-3">
              <legend className="text-[11px] font-black uppercase tracking-wider text-[#ff6600] mb-1">Delivery</legend>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="o-rn">Recipient name</label>
                  <input id="o-rn" required value={form.recipientName} onChange={set('recipientName')} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="o-rp">Recipient phone</label>
                  <input id="o-rp" required type="tel" value={form.recipientPhone} onChange={set('recipientPhone')} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls} htmlFor="o-da">Delivery address</label>
                <input id="o-da" required minLength={5} value={form.deliveryAddress} onChange={set('deliveryAddress')} className={inputCls} />
              </div>
            </fieldset>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div>
              <label className={labelCls} htmlFor="o-w">Weight (kg)</label>
              <input id="o-w" required type="number" min="0.1" step="0.1" value={form.weightKg} onChange={set('weightKg')} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="o-d">Distance (km)</label>
              <input id="o-d" type="number" min="0" step="0.1" placeholder="10" value={form.distanceKm} onChange={set('distanceKm')} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className={labelCls} htmlFor="o-n">Notes for courier</label>
              <input id="o-n" value={form.specialNotes} onChange={set('specialNotes')} className={inputCls} placeholder="Fragile, call before arrival…" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-[#ff6600] hover:bg-[#ea580c] disabled:opacity-60 text-white text-xs font-black shadow-md shadow-orange-500/20 cursor-pointer"
            >
              {creating ? 'Creating…' : 'Create order'}
            </button>
          </div>
        </form>
      )}

      {/* Orders table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center">
            <p className="text-sm font-bold text-red-700">{error}</p>
            <button type="button" onClick={load} className="mt-3 text-xs font-bold text-[#ff6600] hover:underline cursor-pointer">
              Try again
            </button>
          </div>
        ) : loading && orders.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-slate-900">{debounced || filter !== 'all' ? 'No matching orders' : 'No orders yet'}</p>
            <p className="text-xs text-slate-500 mt-1">
              {approved
                ? 'Create one with “New order”, or send orders from your store with an API key.'
                : 'Orders will appear here once your account is approved and you start shipping.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="px-5 py-3">Tracking #</th>
                  <th className="px-5 py-3">Recipient</th>
                  <th className="px-5 py-3">Destination</th>
                  <th className="px-5 py-3 text-right">Weight</th>
                  <th className="px-5 py-3 text-right">Fee</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Created</th>
                </tr>
              </thead>
              <tbody className={loading ? 'opacity-60' : ''}>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => openOrder(o)}
                    className="border-b border-slate-50 last:border-0 hover:bg-orange-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-900">{o.trackingNumber}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{o.recipientName}</td>
                    <td className="px-5 py-3.5 text-slate-500 max-w-[220px] truncate">{o.deliveryAddress}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-slate-600">{o.weightKg} kg</td>
                    <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-slate-900">{formatLkr(o.totalFee)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_TONE[o.status]}`}>
                        {STATUS_LABEL[o.status]}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 tabular-nums">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold disabled:opacity-40 cursor-pointer">
                Previous
              </button>
              <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 font-bold disabled:opacity-40 cursor-pointer">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Order ${selected.trackingNumber}`}>
          <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/30 cursor-default" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Order</span>
                <h3 className="text-lg font-black font-mono text-slate-900">{selected.trackingNumber}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer">
                Close
              </button>
            </div>
            <span className={`inline-block mt-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_TONE[selected.status]}`}>
              {STATUS_LABEL[selected.status]}
            </span>

            <dl className="mt-6 space-y-4 text-sm">
              {[
                ['From', `${selected.senderName} · ${selected.senderPhone}`, selected.pickupAddress],
                ['To', `${selected.recipientName} · ${selected.recipientPhone}`, selected.deliveryAddress],
              ].map(([k, a, b]) => (
                <div key={k}>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{a}</dd>
                  <dd className="text-slate-500">{b}</dd>
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Weight</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{selected.weightKg} kg</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fee</dt>
                  <dd className="font-semibold text-slate-900 mt-0.5">{formatLkr(selected.totalFee)}</dd>
                </div>
              </div>
              {selected.specialNotes && (
                <div>
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notes</dt>
                  <dd className="text-slate-700 mt-0.5">{selected.specialNotes}</dd>
                </div>
              )}
            </dl>

            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-7 mb-3">Tracking history</h4>
            {!selected.history ? (
              <p className="text-xs text-slate-400">Loading…</p>
            ) : (
              <ol className="relative border-l-2 border-orange-100 ml-1.5 space-y-4">
                {selected.history.map((h, i) => (
                  <li key={i} className="ml-4">
                    <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-[#ff6600] border-2 border-white" />
                    <p className="text-sm font-bold text-slate-900">{STATUS_LABEL[h.status]}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(h.timestamp)}
                      {h.location ? ` · ${h.location}` : ''}
                    </p>
                    {h.note && <p className="text-xs text-slate-600 mt-0.5">{h.note}</p>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
