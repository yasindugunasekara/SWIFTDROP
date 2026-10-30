'use client';

import { useState } from 'react';
import Link from 'next/link';
import { saveAuthSession } from '../../../lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'MERCHANT'>('CUSTOMER');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate login & session storage (Member 1)
    saveAuthSession(
      { id: 'usr-1', email, fullName: email.split('@')[0], role },
      'mock_access_token_jwt'
    );
    window.location.href = '/';
  };

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', padding: '2rem', background: '#111827', borderRadius: 12, border: '1px solid #1f2937' }}>
      <h2 style={{ color: '#38bdf8', marginBottom: '1.5rem', textAlign: 'center' }}>Sign In to SwiftDrop</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>Email Address</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: 4, fontSize: '0.875rem' }}>Role Switcher (Demo)</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, background: '#1f2937', color: '#fff', border: '1px solid #374151' }}
          >
            <option value="CUSTOMER">Customer</option>
            <option value="COURIER">Courier</option>
            <option value="DISPATCHER">Dispatcher / Admin</option>
            <option value="MERCHANT">Merchant</option>
          </select>
        </div>
        <button
          type="submit"
          style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem', borderRadius: 6, fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}
        >
          Sign In
        </button>
      </form>
      <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: '#9ca3af' }}>
        Don&apos;t have an account? <Link href="/register" style={{ color: '#38bdf8' }}>Register here</Link>
      </p>
    </div>
  );
}
