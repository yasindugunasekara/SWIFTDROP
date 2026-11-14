'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dashboardFor, signIn, signInWithGoogle, type UserRole } from '../../../lib/auth';
import styles from '../auth.module.css';
import AuthBackButton from '../AuthBackButton';
import AuthInputIcon from '../AuthInputIcon';

export default function LoginPage() {
  const router = useRouter();

  // Active Role Tab
  const [activeRole, setActiveRole] = useState<UserRole>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRoleTabChange = (role: UserRole) => {
    setActiveRole(role);
    setErrorMsg('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (!email || !password) {
        setErrorMsg('Please enter both your email address and password.');
        setLoading(false);
        return;
      }

      const user = await signIn(email.trim(), password);
      // The verified account role determines access, never the selected presentation tab.
      router.replace(dashboardFor(user));
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg(''); setLoading(true);
    try { await signInWithGoogle(); }
    catch (error) { setErrorMsg(error instanceof Error ? error.message : 'Google sign-in failed.'); }
    finally { setLoading(false); }
  };

  return (
    <div className={`${styles.page} ${styles.loginPage}`}>
      <section className={`${styles.card} ${styles.loginCard}`} aria-labelledby="login-title">
        <div className={styles.topbar}>
          <AuthBackButton />
          <Link href="/" className={styles.brand} aria-label="SwiftDrop home">swiftdrop<span>.</span></Link>
        </div>
        <header className={`${styles.header} ${styles.loginHeader}`}>
          <h1 id="login-title" className={styles.title}>Welcome back</h1>
        </header>

        <div className={`${styles.signupRoles} ${styles.loginRoles}`} role="group" aria-label="Choose your workspace">
          {(['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER'] as UserRole[]).map((role) => (
            <button key={role} type="button" className={styles.signupRole}
              disabled={loading} aria-pressed={activeRole === role} onClick={() => handleRoleTabChange(role)}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className={`${styles.form} ${styles.loginForm}`} aria-label="Sign in">
          <div className={styles.alertSlot} aria-live="polite">
            {errorMsg && <p className={styles.alert} role="alert">{errorMsg}</p>}
          </div>
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>Email address</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="email" /></span>
            <input id="login-email" name="email" type="email" autoComplete="username" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" className={styles.input} />
            </div>
          </div>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="login-password" className={styles.label}>Password</label>
              <a href="#">Forgot password?</a>
            </div>
            <div className={`${styles.password} ${styles.inputControl}`}>
              <span className={styles.inputIcon}><AuthInputIcon kind="password" /></span>
              <input id="login-password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="current-password" required value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                className={styles.input} />
              <button type="button" className={styles.toggle} aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </div>
          <button type="submit" disabled={loading} className={`${styles.primary} ${styles.loginActions}`}>
            {loading ? 'Signing in...' : 'Sign in'}
            {!loading && <span className={styles.buttonArrow} aria-hidden="true">&#8594;</span>}
          </button>
        </form>

        <div className={styles.social}>
          {activeRole === 'CUSTOMER' ? <>
            <div className={styles.divider}>or continue with</div>
            <button type="button" onClick={handleGoogleLogin} disabled={loading} className={styles.google}>
              <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.92 0 12s.45 3.85 1.24 5.42l4.04-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.93 6.72-4.93z"/>
              </svg>
              Continue with Google
            </button>
          </> : <>
            <div className={styles.divider}>your workspace</div>
            <p className={styles.roleNote}>Continue with your {activeRole.toLowerCase()} account.</p>
          </>}
        </div>
        <p className={styles.footer}>New to SwiftDrop? <Link href="/register">Create an account</Link></p>
      </section>
    </div>
  );
}
