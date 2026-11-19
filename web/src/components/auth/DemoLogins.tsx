'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardFor, signInDemo, type UserRole } from '../../lib/auth';

export default function DemoLogins({ disabled, onBusy, onError }: {
  disabled: boolean; onBusy: (busy: boolean) => void; onError: (error: string) => void;
}) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const pending = useRef(false);
  const router = useRouter();
  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/v1/auth/demo', { signal: controller.signal, cache: 'no-store' }).then(response => response.ok ? response.json() : { roles: [] })
      .then(data => { if (!controller.signal.aborted) setRoles(data.roles || []); }).catch(() => undefined);
    return () => controller.abort();
  }, []);
  if (!roles.length) return null;
  async function login(role: UserRole) {
    if (pending.current) return;
    pending.current = true; onBusy(true); onError('');
    try { router.replace(dashboardFor(await signInDemo(role))); }
    catch (failure) { onError(failure instanceof Error ? failure.message : 'Demo sign-in failed.'); }
    finally { pending.current = false; onBusy(false); }
  }
  return <fieldset disabled={disabled} className="mt-5 border-t border-slate-100 pt-3">
    <legend className="text-xs text-slate-500 px-2">Demo workspaces</legend>
    <div className="flex flex-wrap gap-2 mt-2">{roles.map(role => <button key={role} type="button"
      className="rounded-lg border border-orange-200 px-3 py-2 text-xs font-semibold text-orange-700 disabled:opacity-50"
      onClick={() => void login(role)}>{role.charAt(0) + role.slice(1).toLowerCase()}</button>)}</div>
  </fieldset>;
}
