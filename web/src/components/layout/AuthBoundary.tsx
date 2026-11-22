'use client';
import LoadingState from '../ui/LoadingState';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { dashboardFor, getStoredUser, initializeAuth, subscribeAuth, expireSessionIfNeeded, type UserRole } from '../../lib/auth';

const access: Record<string, UserRole[]> = {
  '/admin': ['ADMIN'],
  '/booking': ['CUSTOMER'], '/history': ['CUSTOMER'], '/inbox': ['CUSTOMER', 'COURIER'],
  '/tasks': ['COURIER', 'ADMIN'], '/portal': ['MERCHANT', 'ADMIN'], '/webhooks': ['MERCHANT', 'ADMIN'],
  '/dispatch': ['DISPATCHER', 'ADMIN'], '/config': ['DISPATCHER', 'ADMIN'],
  '/analytics': ['DISPATCHER', 'ADMIN'], '/exceptions': ['DISPATCHER', 'ADMIN'], '/approval': ['CUSTOMER', 'COURIER', 'MERCHANT'],
  '/account-applications': ['DISPATCHER', 'ADMIN'],
  '/assistant':['CUSTOMER','COURIER','MERCHANT','DISPATCHER','ADMIN'],
};
export default function AuthBoundary({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const allowed = Object.entries(access).find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))?.[1];
  useEffect(() => {
    const check = () => { void expireSessionIfNeeded(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, []);
  useEffect(() => {
    let active = true;
    initializeAuth().then(() => { if (active) { setError(''); setChecked(true); } })
      .catch(failure => { if (active) { setError(failure instanceof Error ? failure.message : 'Unable to restore your session.'); setChecked(true); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!allowed || !checked || error) return;
    if (!user) router.replace('/login');
    else if (dashboardFor(user) === '/approval' && pathname !== '/approval') router.replace('/approval');
  }, [allowed, checked, pathname, error, router, user]);
  if (!allowed) return <>{children}</>;
  if (!checked) return <LoadingState fullScreen label="Getting your workspace ready..." />;
  if (error) return <div className="p-12 text-center" role="alert"><p>{error}</p><button className="mt-4 underline" onClick={() => location.reload()}>Retry</button><Link className="block mt-4 underline" href="/login">Back to sign in</Link></div>;
  if (!user) return <LoadingState fullScreen label="Opening sign in..." />;
  if (dashboardFor(user) === '/approval' && pathname !== '/approval') return <LoadingState fullScreen />;
  if (!allowed.includes(user.role)) return <div className="p-12 text-center"><h1 className="text-xl font-bold">Access denied</h1><p>This workspace is unavailable for your account.</p><Link className="underline" href={dashboardFor(user)}>Go to your workspace</Link></div>;
  return <>{children}</>;
}
