'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { type UserRole } from '../../../lib/auth';
import styles from '../auth.module.css';
import AuthBackButton from '../AuthBackButton';
import AuthInputIcon from '../AuthInputIcon';

export default function RegisterPage() {
  const submitting = useRef(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [companyName, setCompanyName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;
    setError('');
    if (role !== 'CUSTOMER') { setError('This form currently supports customer signup. Contact SwiftDrop for courier or business access.'); return; }
    if (fullName.trim().length < 2 || /[\u0000-\u001f\u007f]/.test(fullName)) { setError('Enter a valid full name with at least 2 characters.'); return; }
    if (new TextEncoder().encode(password).length > 72) { setError('Password must be at most 72 UTF-8 bytes.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    submitting.current = true; setBusy(true);
    try {
      const base = '/api/v1';
      const response = await fetch(`${base}/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
        body: JSON.stringify({ fullName, email, password, confirmPassword, role: 'CUSTOMER' }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const messages = ['fullName', 'email', 'password', 'confirmPassword'].flatMap(name =>
          Array.isArray(result.fields?.[name]) ? result.fields[name].slice(0, 1) : []);
        setError(messages.length ? messages.join(' ') : result.error || 'Unable to create your account. Please try again.');
        return;
      }
      setPassword(''); setConfirmPassword('');
      setRequiresConfirmation(result.requiresEmailConfirmation !== false);
      setSuccessMessage(result.message || 'Check your email to confirm your account.');
      setSuccess(true);
    } catch {
      setError('We could not reach the signup service. Check your connection and try again.');
    } finally { submitting.current = false; setBusy(false); }
  };

  if (success) return (
    <div className={`${styles.page} ${styles.signupPage}`}>
      <section className={`${styles.card} ${styles.signupCard}`} aria-labelledby="register-title">
        <div className={styles.topbar}><AuthBackButton /><Link href="/" className={styles.brand}>swiftdrop<span>.</span></Link></div>
        <div className={styles.signupSuccess} role="status">
          <h1 id="register-title" className={styles.title}>{requiresConfirmation ? 'Check your email' : 'Account created'}</h1>
          <p className={styles.subtitle}>{successMessage}</p>
          <Link href="/login" className={`${styles.primary} ${styles.signupActions}`}>Continue to sign in<span className={styles.buttonArrow} aria-hidden="true">&#8594;</span></Link>
        </div>
      </section>
    </div>
  );

  return (
    <div className={`${styles.page} ${styles.signupPage}`}>
      <section className={`${styles.card} ${styles.signupCard}`} aria-labelledby="register-title">
        <div className={styles.topbar}>
          <AuthBackButton />
          <Link href="/" className={styles.brand} aria-label="SwiftDrop home">swiftdrop<span>.</span></Link>
        </div>
        <header className={`${styles.header} ${styles.signupHeader}`}>
          <h1 id="register-title" className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>A simpler way to send and track deliveries.</p>
        </header>

        <div className={`${styles.roles} ${styles.registerRoles}`} role="group" aria-label="Choose account type">
          {(['CUSTOMER', 'COURIER', 'MERCHANT'] as UserRole[]).map((accountRole) => (
            <button key={accountRole} type="button" className={styles.role} aria-pressed={role === accountRole} disabled={busy}
              onClick={() => { setRole(accountRole); setError(''); }}>
              {accountRole === 'MERCHANT' ? 'Business' : accountRole.charAt(0) + accountRole.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className={`${styles.form} ${styles.signupForm}`} aria-label="Create account" aria-busy={busy}>
          {role !== 'CUSTOMER' && <p className={`${styles.hint} ${styles.signupNotice}`}>Customer signup is available here. Contact SwiftDrop for courier or business account access.</p>}
          {error && <p className={`${styles.alert} ${styles.signupNotice}`} role="alert">{error}</p>}
          <div className={styles.field}>
            <label htmlFor="register-name" className={styles.label}>Full name</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="name" /></span>
            <input id="register-name" name="fullName" type="text" autoComplete="name" required minLength={2} maxLength={150} disabled={busy}
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name" className={styles.input} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>Email address</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="email" /></span>
            <input id="register-email" name="email" type="email" autoComplete="email" required maxLength={255} disabled={busy}
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" className={styles.input} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="register-password" className={styles.label}>Password</label>
            <div className={`${styles.password} ${styles.inputControl}`}>
              <span className={styles.inputIcon}><AuthInputIcon kind="password" /></span>
              <input id="register-password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required minLength={8} maxLength={72} disabled={busy} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Create a password"
                aria-describedby="password-hint" className={styles.input} />
              <button type="button" className={styles.toggle} disabled={busy} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            <p id="password-hint" className={styles.hint}>At least 8 characters; maximum 72 UTF-8 bytes.</p>
          </div>
          <div className={styles.field}>
            <label htmlFor="register-confirm-password" className={styles.label}>Confirm password</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="password" /></span>
              <input id="register-confirm-password" name="confirmPassword" type={showPassword ? 'text' : 'password'} autoComplete="new-password"
                required maxLength={72} disabled={busy} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)}
                placeholder="Repeat your password" className={styles.input} />
            </div>
          </div>
          {role === 'MERCHANT' && <div className={styles.field}>
            <label htmlFor="register-company" className={styles.label}>Company name</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="company" /></span>
            <input id="register-company" name="companyName" type="text" autoComplete="organization" required
              value={companyName} onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your registered business name" className={styles.input} />
            </div>
          </div>}
          <button type="submit" disabled={busy || role !== 'CUSTOMER'} className={`${styles.primary} ${styles.signupActions}`}>{busy ? 'Creating account...' : 'Create account'}{!busy && <span className={styles.buttonArrow} aria-hidden="true">&#8594;</span>}</button>
        </form>
        <p className={`${styles.footer} ${styles.registerFooter}`}>Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </div>
  );
}
