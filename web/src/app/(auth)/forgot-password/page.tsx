'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../../../lib/auth';
import styles from '../auth.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const pending = useRef(false);
  return <div className={styles.page}><section className={styles.card}>
    <h1 className={styles.title}>Reset your password</h1>
    <p className={styles.subtitle}>Enter your account email. We will send a link to choose a new password.</p>
    {message ? <p role="status">{message}</p> : <form className={styles.form} onSubmit={async event => {
      event.preventDefault(); if (pending.current) return;
      pending.current = true; setBusy(true); setError('');
      try { setMessage(await requestPasswordReset(email.trim())); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to send reset email.'); }
      finally { pending.current = false; setBusy(false); }
    }}>
      <label className={styles.label} htmlFor="reset-email">Email address</label>
      <input id="reset-email" className={styles.input} style={{ paddingLeft: 12 }} type="email" autoComplete="email" required maxLength={255} value={email} onChange={event => setEmail(event.target.value)} disabled={busy} />
      {error && <p role="alert" className={styles.alert}>{error}</p>}
      <button className={styles.primary} disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
    </form>}
    <p className={styles.footer}><Link href="/login">Back to sign in</Link></p>
  </section></div>;
}
