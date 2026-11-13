import { getSupabaseClient } from './supabase';

export type UserRole = 'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | 'MERCHANT';
export interface User {
  id: string; authUserId?: string; email: string; fullName: string; phone?: string | null;
  role: UserRole; merchantId?: string; approvalStatus?: string;
}
let currentUser: User | null = null;
let started = false;
let generation = 0;
let sessionRevision = 0;
let signOutTask: Promise<void> | null = null;
let refreshTask: Promise<string | null> | null = null;
const listeners = new Set<() => void>();
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
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
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
  sessionRevision++;
  const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
  const client = await getSupabaseClient();
  const result = await client.auth.setSession({ access_token: data.accessToken, refresh_token: data.refreshToken });
  if (result.error) throw new Error('Unable to establish your session. Please retry.');
  saveAuthSession(data.user); return data.user;
}
export async function signInWithGoogle() {
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/auth/callback` } });
  if (error || !data.url) throw new Error('Google sign-in could not start. Contact your administrator if it is not enabled.');
}
export function clearAuthSession(): Promise<void> {
  if (signOutTask) return signOutTask;
  generation++;
  sessionRevision++;
  signOutTask = (async () => {
    const client = await getSupabaseClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new Error('Unable to sign out securely. Check your connection and retry.');
    generation++;
    discardAuthSession();
  })().finally(() => { signOutTask = null; });
  return signOutTask;
}
export function dashboardFor(user: User) {
  if (user.role === 'MERCHANT' && user.approvalStatus !== 'APPROVED') return '/approval';
  return { CUSTOMER: '/booking', COURIER: '/tasks', MERCHANT: '/portal', DISPATCHER: '/dispatch', ADMIN: '/dispatch' }[user.role];
}
