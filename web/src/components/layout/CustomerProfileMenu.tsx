'use client';

import { useRef, useState, useSyncExternalStore } from 'react';
import { getStoredUser, loadAuthenticatedUser, subscribeAuth } from '../../lib/auth';

interface Props {
  onLogout: () => Promise<void>;
  loggingOut: boolean;
  logoutError: string;
}

export default function CustomerProfileMenu({ onLogout, loggingOut, logoutError }: Props) {
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const dialog = useRef<HTMLDialogElement>(null);
  const request = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const initials = user?.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'C';

  async function refreshProfile() {
    const version = ++request.current;
    setLoading(true);
    setError('');
    try {
      await loadAuthenticatedUser();
    } catch {
      if (request.current === version) setError('Unable to refresh your details. Please try again.');
    } finally {
      if (request.current === version) setLoading(false);
    }
  }

  function closeProfile() {
    request.current++;
    dialog.current?.close();
  }

  return <>
    <button type="button" aria-label="View your profile" aria-haspopup="dialog"
      onClick={() => { dialog.current?.showModal(); void refreshProfile(); }}
      className="w-10 h-10 rounded-full bg-[#ff7a00] text-white flex items-center justify-center font-black text-sm shadow-sm ring-2 ring-orange-100 hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-500">
      {initials}
    </button>
    <dialog ref={dialog} aria-labelledby="customer-profile-title"
      onCancel={() => { request.current++; }}
      onClick={event => { if (event.target === event.currentTarget) closeProfile(); }}
      className="m-auto w-[calc(100%_-_2rem)] max-w-md max-h-[85dvh] overflow-y-auto rounded-3xl border border-slate-100 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-900/40">
      <div className="p-6 sm:p-8" onClick={event => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-4">
          <h2 id="customer-profile-title" className="text-xl font-bold">My profile</h2>
          <button type="button" autoFocus onClick={closeProfile} aria-label="Close profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-xl text-slate-500 hover:bg-orange-50 focus-visible:outline-orange-500">×</button>
        </div>
        <div className="mt-6 flex items-center gap-4">
          <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-lg font-bold text-orange-600">{initials}</span>
          <div className="min-w-0">
            <p className="break-words font-bold">{user?.fullName}</p>
            <p className="mt-1 text-xs font-semibold text-orange-600">Customer account</p>
          </div>
        </div>
        <dl aria-busy={loading} className="mt-6 space-y-4 border-t border-slate-100 pt-6 text-sm">
          <div><dt className="text-xs text-slate-500">Full name</dt><dd className="mt-1 break-words font-medium">{user?.fullName || 'Not provided'}</dd></div>
          <div><dt className="text-xs text-slate-500">Email address</dt><dd className="mt-1 break-all font-medium">{user?.email || 'Not provided'}</dd></div>
          <div><dt className="text-xs text-slate-500">Phone number</dt><dd className="mt-1 break-words font-medium">{user?.phone || 'Not provided'}</dd></div>
        </dl>
        {loading && <p role="status" className="mt-4 text-xs text-slate-500">Refreshing your details...</p>}
        {error && <div role="alert" className="mt-4 text-sm text-red-700"><p>{error}</p><button type="button" onClick={() => void refreshProfile()} className="mt-2 font-semibold underline">Try again</button></div>}
        <button type="button" disabled={loggingOut} onClick={() => void onLogout()}
          className="mt-7 w-full rounded-xl bg-[#ff6600] px-4 py-3 text-sm font-bold text-white hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60">
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
        {logoutError && <p role="alert" className="mt-3 text-sm text-red-700">{logoutError}</p>}
      </div>
    </dialog>
  </>;
}
