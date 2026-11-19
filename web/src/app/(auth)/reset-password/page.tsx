'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { preparePasswordReset, updatePassword } from '../../../lib/auth';
import styles from '../auth.module.css';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    void preparePasswordReset().then(() => { if (active) setReady(true); })
      .catch(failure => { if (active) setError(failure instanceof Error ? failure.message : 'Reset link could not be verified.'); });
    return () => { active = false; };
  }, []);
  return <div className={styles.page}><section className={styles.card}>
    <h1 className={styles.title}>{success ? 'Password updated' : 'Choose a new password'}</h1>
    {success ? <p role="status">Your sessions have been signed out. Sign in with your new password.</p> : ready ? <form className={styles.form} onSubmit={async event => {
      event.preventDefault(); if (pending.current) return;
      pending.current = true; setBusy(true); setError('');
      try { await updatePassword(password, confirmPassword); setPassword(''); setConfirmPassword(''); setSuccess(true); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to update password.'); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <label htmlFor="new-password" className={styles.label}>New password</label>
      <input id="new-password" style={{ paddingLeft: 12 }} className={styles.input} type="password" autoComplete="new-password" required minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} disabled={busy} />
      <label htmlFor="confirm-password" className={styles.label}>Confirm password</label>
      <input id="confirm-password" style={{ paddingLeft: 12 }} className={styles.input} type="password" autoComplete="new-password" required maxLength={72} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} disabled={busy} />
      <button className={styles.primary} disabled={busy}>{busy ? 'Saving...' : 'Update password'}</button>
    </form> : !error ? <p role="status">Verifying reset link...</p> : null}
    {error && <p role="alert" className={styles.alert}>{error}</p>}
    <p className={styles.footer}><Link href={success ? '/login' : '/forgot-password'}>{success ? 'Sign in' : 'Request a new reset link'}</Link></p>
  </section></div>;
}
