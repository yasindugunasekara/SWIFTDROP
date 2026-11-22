'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchApi } from '../../../lib/api';
import s from './admin-pages.module.css';

interface Application {
  id: string; full_name: string; email: string; requested_role: string; details: Record<string, string>;
  status: string; review_note: string | null; created_at: string; reviewed_at: string | null;
}
export default function AdminApplications() {
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
    }).catch(() => { if (!signal?.aborted && version === request.current) setError('We could not load applications. Please try again.'); })
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
    } catch { setError('The review could not be saved. Refresh the list and try again.'); }
    finally { pending.current = false; setBusy(''); }
  }
  return <div className={s.page}>
    <div className={s.heading}><div><div className={s.eyebrow}>PARTNER ONBOARDING</div><h1>Account applications</h1><p>Welcome the right partners. Review courier and business applications in one place.</p></div><span className={s.icon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M9 5H5v16h14V5h-4M9 3h6v4H9zM8 13l2 2 5-5"/></svg></span></div>
    <div className={s.toolbar}><div className={s.tabs} aria-label="Application status">{['PENDING','APPROVED','REJECTED'].map(value=><button key={value} disabled={!!busy} aria-pressed={status===value} onClick={()=>{if(status!==value){setLoading(true);setError('');setMessage('');setStatus(value);}}}>{value.charAt(0)+value.slice(1).toLowerCase()}</button>)}</div><button className={s.secondary} disabled={loading||!!busy} onClick={()=>{setLoading(true);void load();}}>Refresh</button></div>
    {error&&<div className={s.notice} role="alert">{error}</div>}{message&&<div className={s.success} role="status">{message}</div>}
    {loading?<div className={s.empty} role="status"><span className={s.spinner}/>Getting applications ready...</div>:!applications.length?<div className={s.empty}><span className={s.icon} aria-hidden="true">✓</span><h2>{error?'Applications are unavailable':`No ${status.toLowerCase()} applications`}</h2><p>{error?'Use Refresh to try again.':'New partner requests will appear here when they are submitted.'}</p></div>:<div className={s.grid}>{applications.map(a=><article className={s.card} key={a.id}>
      <div className={s.cardTop}><span className={s.avatar} aria-hidden="true">{a.full_name.charAt(0)}</span><div className={s.person}><h2>{a.full_name}</h2><p>{a.email}</p></div><span className={s.badge}>{a.requested_role==='MERCHANT'?'Business':'Courier'}</span></div>
      <div className={s.cardBody}><div className={s.meta}><span>Submitted {new Date(a.created_at).toLocaleDateString()}</span><span>•</span><span>{a.status.charAt(0)+a.status.slice(1).toLowerCase()}</span></div><dl className={s.details}>{Object.entries(a.details).filter(([key])=>key!=='requestedRole').map(([key,value])=><div key={key}><dt>{({phone:'Phone',address:'Address / delivery area',vehicleType:'Vehicle',vehicleNumber:'Vehicle registration',companyName:'Company',registrationNumber:'Business registration'} as Record<string,string>)[key]||key}</dt><dd>{value||'Not provided'}</dd></div>)}</dl>
      {status==='PENDING'?<><label className={s.field} htmlFor={`note-${a.id}`}>Review note<textarea id={`note-${a.id}`} placeholder="Add a short note about your decision..." maxLength={500} minLength={3} disabled={!!busy} value={notes[a.id]||''} onChange={e=>setNotes(previous=>({...previous,[a.id]:e.target.value}))}/></label><div className={s.actions}><button disabled={!!busy} className={s.primary} onClick={()=>void review(a.id,'APPROVED')}>{busy===a.id?'Saving...':'Approve application'}</button><button disabled={!!busy} className={s.danger} onClick={()=>void review(a.id,'REJECTED')}>Reject</button></div></>:<div className={s.review}><strong>Review note</strong><p>{a.review_note}</p>{a.reviewed_at&&<p>Reviewed {new Date(a.reviewed_at).toLocaleDateString()}</p>}</div>}
      </div></article>)}</div>}
  </div>;
}
