'use client';
import { useState, useSyncExternalStore, type FormEvent } from 'react';
import s from './admin-pages.module.css';
import { getStoredUser, subscribeAuth, updateMyProfile, updatePassword, loadAuthenticatedUser } from '../../../lib/auth';
import { getSupabaseClient } from '../../../lib/supabase';

export default function AdminProfilePage() {
  const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>, section: string) {
    event.preventDefault();
    if (busy || !user) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError(''); setMessage('');
    try {
      if (section === 'profile') {
        await updateMyProfile(String(data.get('name')), String(data.get('phone')));
        setMessage('Profile saved.');
      } else if (section === 'password') {
        await updatePassword(String(data.get('password')), String(data.get('confirm')));
        location.assign('/login');
      } else {
        const client = await getSupabaseClient();
        const { error: failure } = await client.auth.updateUser({ email: String(data.get('email')).trim().toLowerCase() }, { emailRedirectTo: `${location.origin}/auth/callback` });
        if (failure) throw new Error('Unable to change email. Check the address and try again.');
        await loadAuthenticatedUser();
        setMessage('Email change requested. Follow the confirmation links sent by Supabase. Your login email changes after confirmation.');
      }
      if (section !== 'profile') form.reset();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to save changes.'); }
    finally { setBusy(false); }
  }
  return <div className={s.page}>
    <div className={s.heading}><div><div className={s.eyebrow}>ACCOUNT SETTINGS</div><h1>Your profile</h1><p>A few details that keep your account personal, up to date and secure.</p></div><span className={s.icon} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></svg></span></div>
    {error&&<p role="alert" className={s.notice}>{error}</p>}{message&&<p role="status" className={s.success}>{message}</p>}
    <div className={s.profileGrid}><aside className={s.profileSummary}><div className={s.avatar} aria-hidden="true">{user?.fullName.charAt(0)||'A'}</div><h2>{user?.fullName||'Administrator'}</h2><p>{user?.email}</p><span className={s.badge}>Administrator</span><div className={s.summaryFoot}>Your SwiftDrop workspace account.<br/>Manage your details and sign-in preferences here.</div></aside>
    <fieldset disabled={busy} className={s.forms}>
      <form className={s.card} onSubmit={e=>void save(e,'profile')}><div className={s.formHeader}><div><h2>Personal information</h2><p>The details associated with your administrator profile.</p></div></div><div className={s.formBody}><div className={s.fields}><label className={s.field}>Full name<input name="name" defaultValue={user?.fullName} autoComplete="name" required minLength={2} maxLength={150}/></label><label className={s.field}>Phone number<input name="phone" type="tel" defaultValue={user?.phone||''} autoComplete="tel" placeholder="Add your phone number" maxLength={30}/></label></div></div><div className={s.formFooter}><span>Visible on your account.</span><button className={s.primary}>Save changes</button></div></form>
      <form className={s.card} onSubmit={e=>void save(e,'email')}><div className={s.formHeader}><div><h2>Email address</h2><p>Choose the email you use to sign in to SwiftDrop.</p></div></div><div className={s.formBody}><label className={s.field}>New email address<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required maxLength={255}/></label><p className={s.help}>Current email: {user?.email}<br/>Check your current and new inboxes for confirmation instructions.</p></div><div className={s.formFooter}><span>Email verification required.</span><button className={s.primary}>Update email</button></div></form>
      <form className={s.card} onSubmit={e=>void save(e,'password')}><div className={s.formHeader}><div><h2>Password & security</h2><p>Keep your account secure with a unique password.</p></div></div><div className={s.formBody}><div className={s.fields}><label className={s.field}>New password<input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} placeholder="At least 8 characters"/></label><label className={s.field}>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} placeholder="Enter your password again"/></label></div><p className={s.help}>Updating your password signs out all sessions. Use your new password to sign in again.</p></div><div className={s.formFooter}><span>Choose a strong password.</span><button className={s.primary}>Change password</button></div></form>
    </fieldset></div>{busy&&<p role="status" className={s.help}>Saving your changes...</p>}
  </div>;
}
