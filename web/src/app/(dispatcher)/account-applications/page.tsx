'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { fetchApi } from '../../../lib/api';

interface Application {
  id: string; full_name: string; email: string; requested_role: string; details: Record<string, string>;
  status: string; review_note: string | null; created_at: string; reviewed_at: string | null;
}
export default function AccountApplicationsPage() {
  const admin = usePathname()?.startsWith('/admin');
  const [status, setStatus] = useState('PENDING');
  const [applications, setApplications] = useState<Application[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const request = useRef(0);
  const pending = useRef(false);
  const load = useCallback((signal?: AbortSignal) => {
    const version = ++request.current;
    return fetchApi<{ applications: Application[] }>(`/auth/applications?status=${status}`, { signal }).then(data => {
      if (!signal?.aborted && version === request.current) { setApplications(data.applications); setError(''); }
    }).catch(failure => { if (!signal?.aborted && version === request.current) setError(failure instanceof Error ? failure.message : 'Unable to load applications.'); })
      .finally(() => { if (!signal?.aborted && version === request.current) setLoading(false); });
  }, [status]);
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, [load]);
  async function review(id: string, decision: 'APPROVED' | 'REJECTED') {
    if (pending.current) return;
    const note = (notes[id] || '').trim();
    if (note.length < 3) { setError('Enter a review note of at least 3 characters.'); return; }
    pending.current = true; setBusy(id); setError(''); setMessage('');
    try { await fetchApi(`/auth/applications/${id}`, { method: 'PATCH', body: JSON.stringify({ decision, note }) });
      setMessage(`Application ${decision.toLowerCase()}. The account role and review were saved.`); setLoading(true); await load();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Review could not be saved.'); }
    finally { pending.current = false; setBusy(''); }
  }
  return <div className="min-h-screen bg-slate-50 p-5 sm:p-10"><div className="mx-auto max-w-4xl">
    <Link href={admin ? "/admin" : "/dispatch"} className="text-orange-700 underline">{admin ? "Back to administration" : "Back to dispatch"}</Link>
    <h1 className="text-3xl font-bold mt-5">Account approvals</h1>
    <p className="mt-2 text-slate-600">Review courier and merchant applications before granting workspace access.</p>
    <div className="flex flex-wrap gap-2 my-6">{['PENDING', 'APPROVED', 'REJECTED'].map(value => <button key={value} disabled={!!busy} aria-pressed={status === value}
      onClick={() => { if (value !== status) { setLoading(true); setError(''); setStatus(value); setMessage(''); } }} className={`rounded-lg px-4 py-2 ${status === value ? 'bg-orange-600 text-white' : 'bg-white border'}`}>{value.charAt(0) + value.slice(1).toLowerCase()}</button>)}
      <button className="underline px-3" disabled={loading || !!busy} onClick={() => { setLoading(true); setError(''); void load(); }}>Refresh</button></div>
    {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
    {message && <p role="status" className="my-4 text-green-800">{message}</p>}
    {loading ? <p role="status">Loading applications...</p> : !applications.length && !error ? <p>No {status.toLowerCase()} applications.</p> : applications.map(application => <article key={application.id} className="rounded-2xl bg-white border p-5 mb-4">
      <h2 className="text-lg font-bold">{application.full_name} <span className="text-sm text-orange-700">{application.requested_role}</span></h2>
      <p className="text-sm text-slate-600 break-all">{application.email}</p>
      <p className="text-xs text-slate-500 mt-1">Submitted {new Date(application.created_at).toLocaleString()}</p>
      <dl className="grid gap-2 sm:grid-cols-2 my-4">{Object.entries(application.details).filter(([key]) => key !== 'requestedRole').map(([key, value]) => <div key={key}><dt className="text-xs text-slate-500">{({ phone: 'Phone', address: 'Address / delivery area', vehicleType: 'Vehicle type', vehicleNumber: 'Vehicle number', companyName: 'Company', registrationNumber: 'Registration number' } as Record<string, string>)[key] || key}</dt><dd className="text-sm break-words">{value}</dd></div>)}</dl>
      {status === 'PENDING' ? <>
        <label htmlFor={`note-${application.id}`} className="block text-sm font-semibold">Review note</label>
        <textarea id={`note-${application.id}`} maxLength={500} minLength={3} disabled={!!busy} value={notes[application.id] || ''} onChange={event => setNotes(previous => ({ ...previous, [application.id]: event.target.value }))} className="w-full border rounded-lg p-3 mt-2" />
        <div className="flex gap-3 mt-3"><button disabled={!!busy} onClick={() => void review(application.id, 'APPROVED')} className="rounded-lg bg-orange-600 text-white px-4 py-2">{busy === application.id ? 'Saving...' : 'Approve'}</button>
          <button disabled={!!busy} onClick={() => void review(application.id, 'REJECTED')} className="rounded-lg border border-red-200 text-red-700 px-4 py-2">Reject</button></div>
      </> : <p className="text-sm">Review: {application.review_note} {application.reviewed_at && `(${new Date(application.reviewed_at).toLocaleString()})`}</p>}
    </article>)}
  </div></div>;
}
