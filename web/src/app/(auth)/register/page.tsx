'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { saveAuthSession, type UserRole } from '../../../lib/auth';
import styles from '../auth.module.css';
import AuthBackButton from '../AuthBackButton';
import AuthInputIcon from '../AuthInputIcon';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [companyName, setCompanyName] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    saveAuthSession(
      {
        id: `usr-${Date.now()}`,
        email,
        fullName,
        role,
        ...(role === 'MERCHANT' ? { approvalStatus: 'PENDING' } : {})
      },
      'mock_jwt_registration_token'
    );

    if (role === 'CUSTOMER') router.push('/booking');
    else if (role === 'COURIER') router.push('/tasks');
    else if (role === 'MERCHANT') router.push('/portal?status=pending_approval');
    else router.push('/dispatch');
  };

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
            <button key={accountRole} type="button" className={styles.role} aria-pressed={role === accountRole}
              onClick={() => setRole(accountRole)}>
              {accountRole === 'MERCHANT' ? 'Business' : accountRole.charAt(0) + accountRole.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className={`${styles.form} ${styles.signupForm}`} aria-label="Create account">
          <div className={styles.field}>
            <label htmlFor="register-name" className={styles.label}>Full name</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="name" /></span>
            <input id="register-name" name="fullName" type="text" autoComplete="name" required
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name" className={styles.input} />
            </div>
          </div>
          <div className={styles.field}>
            <label htmlFor="register-email" className={styles.label}>Email address</label>
            <div className={styles.inputControl}>
              <span className={styles.inputIcon}><AuthInputIcon kind="email" /></span>
            <input id="register-email" name="email" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" className={styles.input} />
            </div>
          </div>
          <div className={`${styles.field} ${role !== 'MERCHANT' ? styles.wideField : ''}`}>
            <label htmlFor="register-password" className={styles.label}>Password</label>
            <div className={`${styles.password} ${styles.inputControl}`}>
              <span className={styles.inputIcon}><AuthInputIcon kind="password" /></span>
              <input id="register-password" name="password" type={showPassword ? 'text' : 'password'}
                autoComplete="new-password" required minLength={8} value={password}
                onChange={(e) => setPassword(e.target.value)} placeholder="Create a password"
                aria-describedby="password-hint" className={styles.input} />
              <button type="button" className={styles.toggle} aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
            <p id="password-hint" className={styles.hint}>Use at least 8 characters.</p>
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
          <button type="submit" className={`${styles.primary} ${styles.signupActions}`}>Create account<span className={styles.buttonArrow} aria-hidden="true">&#8594;</span></button>
        </form>
        <p className={`${styles.footer} ${styles.registerFooter}`}>Already have an account? <Link href="/login">Sign in</Link></p>
      </section>
    </div>
  );
}
