'use client';
import LoadingState from '../ui/LoadingState';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { dashboardFor, getStoredUser, initializeAuth, subscribeAuth, type UserRole } from '../../lib/auth';

const access: Record<string, UserRole[]> = {
  '/booking': ['CUSTOMER'], '/history': ['CUSTOMER'], '/inbox': ['CUSTOMER'],
  '/tasks': ['COURIER', 'ADMIN'], '/portal': ['MERCHANT', 'ADMIN'], '/webhooks': ['MERCHANT', 'ADMIN'],
  '/dispatch': ['DISPATCHER', 'ADMIN'], '/config': ['DISPATCHER', 'ADMIN'],
  '/analytics': ['DISPATCHER', 'ADMIN'], '/exceptions': ['DISPATCHER', 'ADMIN'], '/approval': ['MERCHANT'],
};
export default function AuthBoundary({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [checkedPath, setCheckedPath] = useState('');
  const [error, setError] = useState('');
  const allowed = Object.entries(access).find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + '/'))?.[1];
  useEffect(() => {
    let active = true;
    initializeAuth().then(() => { if (active) { setError(''); setCheckedPath(pathname); } })
      .catch(failure => { if (active) { setError(failure instanceof Error ? failure.message : 'Unable to restore your session.'); setCheckedPath(pathname); } });
    return () => { active = false; };
  }, [pathname]);
  useEffect(() => {
    if (!allowed || checkedPath !== pathname || error) return;
    if (!user) router.replace('/login');
    else if (user.role === 'MERCHANT' && user.approvalStatus !== 'APPROVED' && pathname !== '/approval') router.replace('/approval');
  }, [allowed, checkedPath, pathname, error, router, user]);
  if (!allowed) return <>{children}</>;
  if (checkedPath !== pathname) return <LoadingState fullScreen label="Getting your workspace ready..." />;
  if (error) return <div className="p-12 text-center" role="alert"><p>{error}</p><button className="mt-4 underline" onClick={() => location.reload()}>Retry</button><Link className="block mt-4 underline" href="/login">Back to sign in</Link></div>;
  if (!user) return <LoadingState fullScreen label="Opening sign in..." />;
  if (!allowed.includes(user.role)) return <div className="p-12 text-center"><h1 className="text-xl font-bold">Access denied</h1><p>This workspace is unavailable for your account.</p><Link className="underline" href={dashboardFor(user)}>Go to your workspace</Link></div>;
  if (user.role === 'MERCHANT' && user.approvalStatus !== 'APPROVED' && pathname !== '/approval') return <LoadingState fullScreen />;
  return <>{children}</>;
}
