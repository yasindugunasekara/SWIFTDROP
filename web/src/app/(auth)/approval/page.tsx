'use client';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession, dashboardFor, getStoredUser, loadAuthenticatedUser, subscribeAuth } from '../../../lib/auth';
import styles from '../auth.module.css';
export default function ApprovalPage() {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const rejected = (user?.application?.status || user?.approvalStatus) === 'REJECTED';
  return <div className={styles.page}><section className={styles.card}>
    <h1 className={styles.title}>{user?.application?.requestedRole === 'COURIER' ? 'Courier' : 'Business'} account approval</h1>
    <p className={styles.subtitle}>{rejected ? 'Your application was declined. Contact SwiftDrop for assistance.' : 'Your application is awaiting staff approval.'}</p>
    {user?.application?.reviewNote && <p className="mb-4 text-sm">Review note: {user.application.reviewNote}</p>}
    {error && <p role="alert" className={styles.alert}>{error}</p>}
    <button className={styles.primary} disabled={busy} onClick={async () => {
      setBusy(true); setError('');
      try { const profile = await loadAuthenticatedUser(); if (!profile) router.replace('/login'); else if (dashboardFor(profile) !== '/approval') router.replace(dashboardFor(profile)); }
      catch { setError('Unable to check status. Please retry.'); } finally { setBusy(false); }
    }}>{busy ? 'Checking...' : 'Check status'}</button>
    <button className={styles.back} disabled={busy} onClick={async () => { setBusy(true); try { await clearAuthSession(); router.replace('/login'); } catch { setError('Unable to sign out. Please retry.'); } finally { setBusy(false); } }}>Sign out</button>
  </section></div>;
}
