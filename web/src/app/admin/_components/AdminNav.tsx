'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useSyncExternalStore } from 'react';
import { clearAuthSession, getStoredUser, subscribeAuth } from '../../../lib/auth';
import './admin-shell.css';

const navigation = [
 { url: '/admin', label: 'Users', icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z' },
 { url: '/admin/applications', label: 'Applications', icon: 'M9 5H5v16h14V5h-4M9 3h6v4H9ZM8 13l2 2 5-5' },
 { url: '/admin/analytics', label: 'Analytics', icon: 'M4 3v18h17M9 17v-5M14 17V8M19 17V4' },
];
export default function AdminNav({children}:{children:React.ReactNode}) {
 const path=usePathname(); const [busy,setBusy]=useState(false); const [error,setError]=useState(false);
 const user=useSyncExternalStore(subscribeAuth,getStoredUser,()=>null);
 return <div className="admin-shell"><header className="admin-nav"><Link className="admin-brand" href="/admin">swiftdrop<span>.</span></Link><nav aria-label="Admin navigation">{navigation.map(({url,label,icon})=><Link key={url} href={url} aria-current={path===url?'page':undefined}><svg className="admin-nav-icon" aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={icon}/></svg><span>{label}</span></Link>)}</nav><div className="admin-account-actions"><Link className="admin-profile-link" href="/admin/profile" aria-label="Your administrator profile" title={user?.fullName||'Your profile'} aria-current={path==='/admin/profile'?'page':undefined}><svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg><span>My profile</span></Link><button disabled={busy} onClick={async()=>{setBusy(true);try{await clearAuthSession();location.assign('/login');}catch{setBusy(false);setError(true);}}}>{busy?'Signing out…':'Sign out'}</button></div></header>{error&&<p role="status">Unable to sign out. Please retry.</p>}{children}</div>;
}
