'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dashboardFor, initializeAuth } from '../../../../lib/auth';
import styles from '../../auth.module.css';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      if (hash.has('error') || new URLSearchParams(window.location.search).has('error')) {
        throw new Error('The confirmation link expired or sign-in was cancelled. Please try signing in again.');
      }
      const user = await initializeAuth();
      if (!active) return;
      router.replace(user ? dashboardFor(user) : '/login');
    })().catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Unable to complete sign-in.'); });
    return () => { active = false; };
  }, [router]);
  return <div className={styles.page}><section className={styles.card}>
    <h1 className={styles.title}>{error ? 'Sign-in could not finish' : 'Completing sign-in'}</h1>
    <p className={styles.subtitle} role={error ? 'alert' : 'status'}>{error || 'Please wait while we verify your account...'}</p>
    {error && <Link href="/login" className={styles.footer}>Return to sign in</Link>}
  </section></div>;
}
