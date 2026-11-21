import { getSupabaseClient } from './supabase';

export type UserRole = 'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | 'MERCHANT';
export interface User {
  id: string; authUserId?: string; email: string; fullName: string; phone?: string | null;
  role: UserRole; merchantId?: string; approvalStatus?: string;
  application?: { id: string; requestedRole: 'COURIER' | 'MERCHANT'; status: string; reviewNote: string | null };
}
let currentUser: User | null = null;
let started = false;
let generation = 0;
let sessionRevision = 0;
let signOutTask: Promise<void> | null = null;
let refreshTask: Promise<string | null> | null = null;
let sessionWrite: Promise<unknown> = Promise.resolve();
let writingSession = false;
function serializeSession<T>(action: () => Promise<T>): Promise<T> {
  const run = async () => { writingSession = true; try { return await action(); } finally { writingSession = false; } };
  const task = sessionWrite.then(run, run);
  sessionWrite = task.catch(() => undefined);
  return task;
}
const listeners = new Set<() => void>();
const base = '/api/v1';
export const getStoredUser = () => currentUser;
export const subscribeAuth = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function saveAuthSession(user: User) { currentUser = user; listeners.forEach(listener => listener()); }
export function discardAuthSession() { currentUser = null; listeners.forEach(listener => listener()); }
export const getSessionRevision = () => sessionRevision;
export const isSessionCurrent = (version: number) => version === sessionRevision && !signOutTask;

export async function getAccessToken() {
  if (signOutTask) return null;
  const version = sessionRevision;
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (!isSessionCurrent(version)) return null;
  if (error) throw new Error('Session could not be restored. Please sign in again.');
  if (!data.session) discardAuthSession();
  return data.session?.access_token || null;
}

// One refresh owner per browser tab. The SDK coordinates other tabs and rotates
// refresh tokens. A response from an older session must never restore an account.
export async function refreshAccessToken(rejectedToken: string): Promise<string | null> {
  if (signOutTask) return null;
  if (refreshTask) return refreshTask;
  const version = sessionRevision;
  refreshTask = (async () => {
    const client = await getSupabaseClient();
    const { data: stored, error: storageError } = await client.auth.getSession();
    if (!isSessionCurrent(version)) return null;
    if (storageError) throw new Error('Unable to restore your session. Please retry.');
    if (!stored.session) { discardAuthSession(); return null; }
    if (stored.session.access_token !== rejectedToken) return stored.session.access_token;
    const { data, error } = await client.auth.refreshSession();
    if (!isSessionCurrent(version)) return null;
    if (error) {
      if ([400, 401, 403].includes(error.status || 0)) {
        await clearAuthSession().catch(() => discardAuthSession());
        return null;
      }
      throw new Error('Unable to refresh your session. Check your connection and retry.');
    }
    if (!data.session) discardAuthSession();
    return data.session?.access_token || null;
  })().finally(() => { refreshTask = null; });
  return refreshTask;
}

export async function loadAuthenticatedUser(accessToken?: string): Promise<User | null> {
  const version = sessionRevision;
  if (signOutTask) return null;
  let token = accessToken || await getAccessToken();
  if (!isSessionCurrent(version)) return null;
  if (!token) { discardAuthSession(); return null; }
  const request = (bearer: string) => fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${bearer}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  let response = await request(token);
  if (response.status === 401 && isSessionCurrent(version)) {
    token = await refreshAccessToken(token);
    if (token && isSessionCurrent(version)) response = await request(token);
  }
  const data = await response.json().catch(() => ({}));
  if (!isSessionCurrent(version)) return null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      await clearAuthSession().catch(() => discardAuthSession());
      return null;
    }
    throw new Error(data.error || 'Unable to load your account. Please retry.');
  }
  saveAuthSession(data.user);
  return data.user as User;
}
export async function initializeAuth() {
  const client = await getSupabaseClient();
  if (!started) {
    started = true;
    ['swiftdrop_user', 'swiftdrop_access_token', 'swiftdrop_refresh_token'].forEach(key => localStorage.removeItem(key));
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { generation++; sessionRevision++; discardAuthSession(); }
      else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !writingSession) {
        if (currentUser?.authUserId && session?.user.id !== currentUser.authUserId) { sessionRevision++; discardAuthSession(); }
        generation++;
        // Avoid calling auth methods while Supabase holds its auth-state callback lock.
        const version = generation;
        if (session && !signOutTask) setTimeout(() => {
          if (version === generation && !signOutTask) void loadAuthenticatedUser(session.access_token).catch(() => undefined);
        }, 0);
      }
    });
  }
  return loadAuthenticatedUser();
}
export async function signIn(email: string, password: string): Promise<User> {
  if (signOutTask) await signOutTask;
  const version = ++sessionRevision;
  generation++; discardAuthSession();
  const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
  return establishSession(data, version);
}
async function establishSession(data: { user: User; accessToken: string; refreshToken: string }, version: number): Promise<User> {
  return serializeSession(async () => {
    if (!isSessionCurrent(version)) throw new Error('Your session changed. Please sign in again.');
    const client = await getSupabaseClient();
    if (!isSessionCurrent(version)) throw new Error('Your session changed. Please sign in again.');
    const result = await client.auth.setSession({ access_token: data.accessToken, refresh_token: data.refreshToken });
    if (result.error) throw new Error('Unable to establish your session. Please retry.');
    if (!isSessionCurrent(version)) throw new Error('Your session changed. Please sign in again.');
    saveAuthSession(data.user); return data.user;
  });
}
export async function signInDemo(role: UserRole): Promise<User> {
  if (signOutTask) await signOutTask;
  const version = ++sessionRevision;
  generation++; discardAuthSession();
  const response = await fetch(`${base}/auth/demo`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role }), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Demo login is unavailable.');
  return establishSession(data, version);
}
export async function requestPasswordReset(email: string) {
  const response = await fetch(`${base}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to request a password reset.');
  return data.message as string;
}
export async function updateMyProfile(fullName: string, phone: string): Promise<User> {
  const version = sessionRevision;
  const token = await getAccessToken();
  if (!token || !isSessionCurrent(version)) throw new Error('Please sign in again.');
  const response = await fetch(`${base}/auth/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim() || null }), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to save your profile.');
  if (!isSessionCurrent(version)) throw new Error('Your session changed. Please sign in again.');
  saveAuthSession(data.user); return data.user;
}
export async function preparePasswordReset() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if ([query, hash].some(params => params.has('error') || params.has('error_code'))) throw new Error('This reset link is invalid or expired. Request a new link.');
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (error || !data.session) throw new Error('This reset link is invalid or expired. Request a new link.');
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data.user) throw new Error('This reset link is invalid or expired. Request a new link.');
  window.history.replaceState(null, '', '/reset-password');
}
export async function updatePassword(password: string, confirmPassword: string) {
  if (password.length < 8 || new TextEncoder().encode(password).length > 72) throw new Error('Use at least 8 characters and at most 72 UTF-8 bytes.');
  if (password !== confirmPassword) throw new Error('Passwords do not match.');
  const client = await getSupabaseClient();
  const { error } = await client.auth.updateUser({ password });
  if (error) throw new Error('Unable to update your password. Use a different password or request a new reset link.');
  const signedOut = await client.auth.signOut({ scope: 'global' });
  if (signedOut.error) throw new Error('Password changed, but signing out all sessions failed. Sign out and sign in with your new password.');
  sessionRevision++; generation++; discardAuthSession();
}
export async function signInWithGoogle() {
  if (signOutTask) await signOutTask;
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
    redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: 'select_account' },
  } });
  if (error || !data.url) throw new Error('Google sign-in could not start. Contact your administrator if it is not enabled.');
}

export async function completeAuthRedirect(): Promise<User> {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  if ([query, hash].some(params => params.has('error') || params.has('error_code'))) {
    // Provider error descriptions are untrusted and may include internal details.
    throw new Error('Sign-in was cancelled or the link expired. Please try signing in again.');
  }
  // The browser SDK automatically exchanges a PKCE code with its stored verifier.
  // Read the account from our verified API, never from OAuth metadata or URL roles.
  const user = await initializeAuth();
  if (!user) throw new Error('Your sign-in session could not be restored. Please try signing in again.');
  return user;
}
export function clearAuthSession(): Promise<void> {
  if (signOutTask) return signOutTask;
  generation++;
  sessionRevision++;
  signOutTask = serializeSession(async () => {
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new Error('Unable to sign out securely. Check your connection and retry.');
    generation++;
    discardAuthSession();
  }).finally(() => { signOutTask = null; });
  return signOutTask;
}
export function dashboardFor(user: User) {
  if (user.application && user.application.status !== 'APPROVED') return '/approval';
  if (user.role === 'MERCHANT' && user.approvalStatus !== 'APPROVED') return '/approval';
  return { CUSTOMER: '/booking', COURIER: '/tasks', MERCHANT: '/portal', DISPATCHER: '/dispatch', ADMIN: '/dispatch' }[user.role];
}
