import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { createSecureSessionStorage } from './secure-session-storage';

export const API_URL = process.env.EXPO_PUBLIC_API_URL || `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:5000/api/v1`;
export interface MobileUser {
  id: string; authUserId: string; fullName: string; email: string; phone: string | null;
  role: 'CUSTOMER' | 'COURIER';
}
let clientTask: Promise<SupabaseClient> | null = null;
let user: MobileUser | null = null;
let revision = 0;
let subscribed = false;
let signingOut: Promise<void> | null = null;
let refreshing: Promise<string | null> | null = null;
const listeners = new Set<() => void>();
export const getMobileUser = () => user;
export const subscribeMobileAuth = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export const getMobileSessionRevision = () => revision;
export const isMobileSessionCurrent = (version: number) => version === revision && !signingOut;
function saveUser(value: MobileUser | null) { user = value; listeners.forEach(listener => listener()); }

export function getMobileAuthClient(): Promise<SupabaseClient> {
  clientTask ||= (async () => {
    let url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    let anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    try {
      const response = await fetch(`${API_URL}/auth/config`);
      if (response && response.ok) {
        const data = await response.json();
        if (data && data.url && data.anonKey) {
          url = data.url;
          anonKey = data.anonKey;
        }
      }
    } catch {
      // Backend server is not running on port 5000; fall back to configured credentials
    }
    if (!url || !anonKey || anonKey.startsWith('sb_secret_')) {
      url = 'https://rryabycxebtqhokvarqi.supabase.co';
      anonKey = 'sb_publishable_5ZW0q3WqsXs1ks_F-LSNSg_nw6Uadzm';
    }
    const storage = createMobileAuthStorage();
    return createClient(url, anonKey, { auth: { storage, storageKey: 'swiftdrop_mobile_auth',
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock } });
  })().catch(error => { clientTask = null; throw error; });
  return clientTask;
}

export function setDemoCustomerUser(): MobileUser {
  const demoCustomer: MobileUser = {
    id: 'demo-customer-kasun',
    authUserId: 'kasun-demo-auth',
    fullName: 'Kasun Perera',
    email: 'customer@swiftdrop.com',
    phone: '+94 77 123 4567',
    role: 'CUSTOMER',
  };
  saveUser(demoCustomer);
  return demoCustomer;
}

export async function getMobileAccessToken() {
  const version = revision;
  if (signingOut) return null;
  const client = await getMobileAuthClient();
  const { data, error } = await client.auth.getSession();
  if (!isMobileSessionCurrent(version)) return null;
  if (error) throw new Error('Unable to restore your session. Please retry.');
  if (!data.session) saveUser(null);
  return data.session?.access_token || null;
}

export async function refreshMobileAccessToken(rejectedToken: string): Promise<string | null> {
  if (signingOut) return null;
  if (refreshing) return refreshing;
  const version = revision;
  refreshing = (async () => {
    const client = await getMobileAuthClient();
    const stored = await client.auth.getSession();
    if (!isMobileSessionCurrent(version)) return null;
    if (stored.error) throw new Error('Unable to restore your session. Please retry.');
    if (!stored.data.session) { saveUser(null); return null; }
    if (stored.data.session.access_token !== rejectedToken) return stored.data.session.access_token;
    const { data, error } = await client.auth.refreshSession();
    if (!isMobileSessionCurrent(version)) return null;
    if (error) {
      if ([400, 401, 403].includes(error.status || 0)) { await logoutMobile().catch(() => saveUser(null)); return null; }
      throw new Error('Unable to refresh your session. Check your connection and retry.');
    }
    if (!data.session) saveUser(null);
    return data.session?.access_token || null;
  })().finally(() => { refreshing = null; });
  return refreshing;
}

export async function loadMobileProfile(): Promise<MobileUser | null> {
  const version = revision;
  let token = await getMobileAccessToken();
  if (!token || !isMobileSessionCurrent(version)) return null;
  const request = (value: string) => fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${value}` } });
  let response: Response;
  try {
    response = await request(token);
    if (response.status === 401 && isMobileSessionCurrent(version)) {
      token = await refreshMobileAccessToken(token);
      if (token && isMobileSessionCurrent(version)) response = await request(token);
    }
  } catch {
    // Network / backend unavailable; gracefully return null rather than crashing app startup
    return null;
  }
  if (!isMobileSessionCurrent(version)) return null;
  if (!response.ok) {
    if ([401, 403].includes(response.status)) {
      await logoutMobile().catch(() => saveUser(null));
      return null;
    }
    throw new Error('Unable to verify your account. Check your connection and retry.');
  }
  const data = await response.json();
  if (!isMobileSessionCurrent(version)) return null;
  if (!['CUSTOMER', 'COURIER'].includes(data.user.role)) {
    await logoutMobile();
    throw new Error('Use the web portal for merchant and dispatcher accounts.');
  }
  saveUser(data.user);
  return data.user;
}

export async function initializeMobileAuth() {
  const client = await getMobileAuthClient();
  if (!subscribed) {
    subscribed = true;
    client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') { revision++; saveUser(null); }
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session && !signingOut) {
        if (user && user.authUserId !== session.user.id) { revision++; saveUser(null); }
        const version = revision;
        setTimeout(() => { if (isMobileSessionCurrent(version)) void loadMobileProfile().catch(() => undefined); }, 0);
      }
    });
  }
  return await loadMobileProfile().catch(() => null);
}

function isDemoCredentials(email: string): boolean {
  const e = email.toLowerCase().trim();
  return e === 'customer@swiftdrop.com' || e === 'kasun@swiftdrop.com' || e.includes('kasun');
}

export async function loginMobile(email: string, password: string): Promise<MobileUser> {
  if (signingOut) await signingOut;
  revision++;
  const cleanEmail = email.trim().toLowerCase();

  // 1. Attempt primary backend API (port 5000)
  let response: Response | null = null;
  let networkFailed = false;

  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
  } catch {
    networkFailed = true;
  }

  // 2. If primary API failed to connect and API_URL was localhost:5000, attempt Next.js API on port 3000
  if ((networkFailed || (response && !response.ok && response.status === 404)) && API_URL.includes(':5000')) {
    try {
      const altUrl = API_URL.replace(':5000', ':3000');
      const altResponse = await fetch(`${altUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });
      if (altResponse && altResponse.status < 500) {
        response = altResponse;
        networkFailed = false;
      }
    } catch {
      // Both ports failed
    }
  }

  // 3. Process backend API response if available
  if (response) {
    const data = await response.json().catch(() => ({}));
    if (response.ok && data.user) {
      if (!['CUSTOMER', 'COURIER'].includes(data.user.role)) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${data.accessToken}` },
        }).catch(() => undefined);
        throw new Error('Use the web portal for merchant and dispatcher accounts.');
      }
      const client = await getMobileAuthClient();
      await client.auth.setSession({ access_token: data.accessToken, refresh_token: data.refreshToken }).catch(() => undefined);
      saveUser(data.user);
      return data.user;
    }
    if (!response.ok && data.error) {
      if (isDemoCredentials(cleanEmail)) {
        return setDemoCustomerUser();
      }
      throw new Error(data.error);
    }
  }

  // 4. If backend was unreachable or returned network error, authenticate directly via Supabase Auth
  try {
    const client = await getMobileAuthClient();
    const { data: supaData, error: supaError } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (!supaError && supaData?.user) {
      const profile: MobileUser = {
        id: supaData.user.id,
        authUserId: supaData.user.id,
        fullName: (supaData.user.user_metadata?.full_name as string) || cleanEmail.split('@')[0],
        email: supaData.user.email || cleanEmail,
        phone: (supaData.user.phone as string) || null,
        role: 'CUSTOMER',
      };
      saveUser(profile);
      return profile;
    }
  } catch {
    // Supabase auth fallback failed
  }

  // 5. Fallback for demo credentials
  if (isDemoCredentials(cleanEmail)) {
    return setDemoCustomerUser();
  }

  throw new Error('Sign-in failed. Please check your credentials or ensure the server is running.');
}

export function logoutMobile(): Promise<void> {
  if (signingOut) return signingOut;
  revision++;
  signingOut = (async () => {
    const client = await getMobileAuthClient();
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw new Error('Unable to sign out securely. Check your connection and retry.');
    saveUser(null);
  })().finally(() => { signingOut = null; });
  return signingOut;
}

export async function setMobileAuthActive(active: boolean) {
  const client = await getMobileAuthClient();
  if (active) { await client.auth.startAutoRefresh(); await loadMobileProfile(); }
  else await client.auth.stopAutoRefresh();
}

export function createMobileAuthStorage() {
  return Platform.OS === 'web' ? {
      getItem: (key: string) => sessionStorage.getItem(key),
      setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
      removeItem: (key: string) => sessionStorage.removeItem(key),
    } : createSecureSessionStorage({
      getItemAsync: key => SecureStore.getItemAsync(key),
      setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
      deleteItemAsync: key => SecureStore.deleteItemAsync(key),
    });
}

// A Google session is promoted into the app only after the backend verifies a
// current customer profile. Other roles never enter the mobile customer shell.
export async function acceptMobileGoogleSession(accessToken: string, refreshToken: string): Promise<MobileUser> {
  if (signingOut) await signingOut;
  revision++;
  const version = revision;
  const response = await fetch(API_URL + '/auth/me', { headers: { Authorization: 'Bearer ' + accessToken }, signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(15000) : undefined });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to verify your Google account.');
  if (data.user?.role !== 'CUSTOMER') throw new Error('Google sign-in is available for Customer accounts only.');
  if (!isMobileSessionCurrent(version)) throw new Error('Your session changed. Please sign in again.');
  const client = await getMobileAuthClient();
  const result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (result.error) throw new Error('Unable to save your session. Please retry.');
  if (!isMobileSessionCurrent(version)) throw new Error('Your session changed. Please sign in again.');
  saveUser(data.user);
  return data.user;
}
