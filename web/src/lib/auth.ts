import { getSupabaseClient } from './supabase';

export type UserRole = 'CUSTOMER' | 'COURIER' | 'DISPATCHER' | 'ADMIN' | 'MERCHANT';
export interface User {
  id: string; authUserId?: string; email: string; fullName: string; phone?: string | null;
  role: UserRole; merchantId?: string; approvalStatus?: string;
}
let currentUser: User | null = null;
let started = false;
let generation = 0;
let signOutTask: Promise<void> | null = null;
const listeners = new Set<() => void>();
const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
export const getStoredUser = () => currentUser;
export const subscribeAuth = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function saveAuthSession(user: User) { currentUser = user; listeners.forEach(listener => listener()); }
export function discardAuthSession() { currentUser = null; listeners.forEach(listener => listener()); }

export async function getAccessToken() {
  if (signOutTask) return null;
  const client = await getSupabaseClient();
  const { data, error } = await client.auth.getSession();
  if (signOutTask) return null;
  if (error) throw new Error('Session could not be restored. Please sign in again.');
  return data.session?.access_token || null;
}
export async function loadAuthenticatedUser(accessToken?: string): Promise<User | null> {
  const version = generation;
  if (signOutTask) return null;
  const token = accessToken || await getAccessToken();
  if (version !== generation || signOutTask) return null;
  if (!token) { discardAuthSession(); return null; }
  const response = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  const data = await response.json().catch(() => ({}));
  if (version !== generation || signOutTask) return null;
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) discardAuthSession();
    throw new Error(data.error || 'Unable to load your account. Please retry.');
  }
  if (version === generation) saveAuthSession(data.user);
  return data.user as User;
}
export async function initializeAuth() {
  const client = await getSupabaseClient();
  if (!started) {
    started = true;
    ['swiftdrop_user', 'swiftdrop_access_token', 'swiftdrop_refresh_token'].forEach(key => localStorage.removeItem(key));
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { generation++; discardAuthSession(); }
      else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
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
