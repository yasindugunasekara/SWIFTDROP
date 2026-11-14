'use client';
import LoadingState from '../../../../components/ui/LoadingState';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { completeAuthRedirect, dashboardFor } from '../../../../lib/auth';
import styles from '../../auth.module.css';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    (async () => {
      const user = await completeAuthRedirect();
      if (!active) return;
      router.replace(dashboardFor(user));
    })().catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Unable to complete sign-in.'); });
    return () => { active = false; };
  }, [router]);
  if (!error) return <LoadingState fullScreen label="Completing sign-in..." />;
  return <div className={styles.page}><section className={styles.card}>
    <h1 className={styles.title}>{error ? 'Sign-in could not finish' : 'Completing sign-in'}</h1>
    <p className={styles.subtitle} role={error ? 'alert' : 'status'}>{error || 'Please wait while we verify your account...'}</p>
    {error && <Link href="/login" className={styles.footer}>Return to sign in</Link>}
  </section></div>;
}
