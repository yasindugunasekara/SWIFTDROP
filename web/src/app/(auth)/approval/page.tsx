'use client';
import { useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuthSession, getStoredUser, subscribeAuth } from '../../../lib/auth';
import styles from '../auth.module.css';
export default function ApprovalPage() {
  const router = useRouter();
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const [error, setError] = useState('');
  return <div className={styles.page}><section className={styles.card}>
    <h1 className={styles.title}>Business account approval</h1>
    <p className={styles.subtitle}>{user?.approvalStatus === 'REJECTED' ? 'Your business application was declined. Contact SwiftDrop for assistance.' : 'Your business account is awaiting approval.'}</p>
    {error && <p role="alert" className={styles.alert}>{error}</p>}
    <button className={styles.primary} onClick={() => location.reload()}>Check status</button>
    <button className={styles.back} onClick={async () => { try { await clearAuthSession(); router.replace('/login'); } catch { setError('Unable to sign out. Please retry.'); } }}>Sign out</button>
  </section></div>;
}
