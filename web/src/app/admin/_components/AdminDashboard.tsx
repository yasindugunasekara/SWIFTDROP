'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchApi } from '../../../lib/api';
import { clearAuthSession } from '../../../lib/auth';
import s from './dashboard.module.css';
type Account = { id: string; full_name: string; email: string; phone: string | null; role: string; is_active: boolean };
type Directory = { users: Account[]; total: number; summary: { accounts: number; couriers: number; businesses: number; pending: number } };
const labels: Record<string,string> = { CUSTOMER: 'Customer', COURIER: 'Courier', MERCHANT: 'Business', DISPATCHER: 'Dispatcher', ADMIN: 'Administrator' };
export default function AdminDashboard() {
  const [data,setData] = useState<Directory|null>(null);
  const [search,setSearch] = useState('');
  const [draft,setDraft] = useState('');
  const [role,setRole] = useState('');
  const [page,setPage] = useState(1);
  const [attempt,setAttempt] = useState(0);
  const [loading,setLoading] = useState(true);
  const [failed,setFailed] = useState(false);
  const [notice,setNotice] = useState('');
  const [signingOut,setSigningOut] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetchApi<Directory>(`/admin/users?page=${page}${role ? `&role=${role}` : ''}&search=${encodeURIComponent(search)}`, { signal: controller.signal, cache: 'no-store' })
      .then(value => { if (!controller.signal.aborted) { setData(value); setFailed(false); } })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[role,page,attempt,search]);
  function refresh() { setLoading(true); setFailed(false); setAttempt(v=>v+1); }
  async function signOut() {
    setSigningOut(true);
    try { await clearAuthSession(); location.assign('/login'); }
    catch { setNotice('We couldn’t sign you out. Please try again.'); setSigningOut(false); }
  }
  return <div className={s.workspace}>
    <div className={s.content}>
    <div className={s.main}><div className={s.heading}><div><p className={s.eyebrow}>ADMINISTRATION</p><h1>People & access</h1><p>Your community, connected. Review partners and manage account access.</p></div><Link className={s.primary} href="/admin/applications">Review applications ↗</Link></div>
    <section className={s.stats} aria-label="Workspace summary">{[['Total accounts',data?.summary.accounts,'Across your community'],['Couriers',data?.summary.couriers,'Delivery partners'],['Businesses',data?.summary.businesses,'Merchant accounts'],['Awaiting review',data?.summary.pending,'Partner applications']].map(([label,value,detail])=><article key={String(label)}><p>{label}</p><strong>{loading || failed ? '—' : value ?? '—'}</strong><small>{detail}</small></article>)}</section>
    <section className={s.directory} aria-busy={loading}><div className={s.tableHeading}><div><h2>Account directory</h2><p>{data && !failed ? `${data.total} accounts${role ? ` · ${labels[role]}` : ' in your workspace'}` : 'Your SwiftDrop community'}</p></div><div className={s.controls}><form onSubmit={e=>{e.preventDefault();setLoading(true);setPage(1);setSearch(draft);setAttempt(v=>v+1);}}><input aria-label="Search accounts" placeholder="Name, email or phone" value={draft} maxLength={100} onChange={e=>setDraft(e.target.value)}/><button>Search</button></form><label>Role<select value={role} onChange={e=>{setLoading(true);setRole(e.target.value);setPage(1);}}><option value="">All roles</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><button disabled={loading} onClick={refresh}>Refresh ↻</button></div></div>
    {loading ? <div className={s.empty} role="status"><span className={s.spinner}/>Loading accounts…</div> : failed ? <div className={s.empty} role="status"><strong>We couldn’t load accounts right now.</strong><p>Please try again in a moment.</p><button onClick={refresh}>Try again</button></div> : <><div className={s.mobileAccounts} aria-label="User accounts">{data?.users.map(account => <article key={account.id} className={s.userCard}><header className={s.userCardHeader}><span className={s.avatar} aria-hidden="true">{account.full_name.charAt(0)}</span><div><h3>{account.full_name}</h3><span className={s.role}>{labels[account.role] || account.role}</span></div><span className={account.is_active ? s.active : s.inactive}>{account.is_active ? "Active" : "Inactive"}</span></header><dl className={s.userCardDetails}><div><dt>Email address</dt><dd>{account.email}</dd></div><div><dt>Phone number</dt><dd>{account.phone || "Not provided"}</dd></div></dl></article>)}{!data?.users.length && <div className={s.empty}>No accounts match your search or selected role.</div>}</div><div className={s.tableScroll}><table><thead><tr>{['Account','Contact','Workspace role','Status'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{data?.users.map(a=><tr key={a.id}><td><div className={s.account}><span className={s.avatar}>{a.full_name.charAt(0)}</span><strong>{a.full_name}</strong></div></td><td>{a.email}<small>{a.phone || 'Phone not provided'}</small></td><td><span className={s.role}>{labels[a.role]}</span></td><td><span className={a.is_active ? s.active : s.inactive}>{a.is_active ? 'Active' : 'Inactive'}</span></td></tr>)}</tbody></table>{!data?.users.length && <div className={s.empty}>No accounts match your search or selected role.</div>}</div></>}
    <footer className={s.tableFooter}><span>Page {page}</span><div><button disabled={page===1||loading} onClick={()=>{setLoading(true);setPage(v=>v-1);}}>← Previous</button><button disabled={loading||failed||page*50>=(data?.total||0)} onClick={()=>{setLoading(true);setPage(v=>v+1);}}>Next →</button></div></footer></section>
    <footer className={s.footer}><span>SwiftDrop · Administration</span><button disabled={signingOut} onClick={()=>void signOut()}>{signingOut?'Signing out…':'Sign out'}</button></footer>{notice && <p role="status">{notice}</p>}
    </div></div></div>;
}
