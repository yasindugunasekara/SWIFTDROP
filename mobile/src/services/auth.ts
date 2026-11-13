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
    const response = await fetch(`${API_URL}/auth/config`);
    if (!response.ok) throw new Error('Sign-in service is unavailable. Please retry.');
    const { url, anonKey } = await response.json();
    if (!url || !anonKey || anonKey.startsWith('sb_secret_')) throw new Error('Public authentication configuration is invalid.');
    const storage = Platform.OS === 'web' ? {
      getItem: (key: string) => sessionStorage.getItem(key),
      setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
      removeItem: (key: string) => sessionStorage.removeItem(key),
    } : createSecureSessionStorage({
      getItemAsync: key => SecureStore.getItemAsync(key),
      setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
      deleteItemAsync: key => SecureStore.deleteItemAsync(key),
    });
    return createClient(url, anonKey, { auth: { storage, storageKey: 'swiftdrop_mobile_auth',
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock } });
  })().catch(error => { clientTask = null; throw error; });
  return clientTask;
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
  let response = await request(token);
  if (response.status === 401 && isMobileSessionCurrent(version)) {
    token = await refreshMobileAccessToken(token);
    if (token && isMobileSessionCurrent(version)) response = await request(token);
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
  return loadMobileProfile();
}

export async function loginMobile(email: string, password: string): Promise<MobileUser> {
  if (signingOut) await signingOut;
  revision++;
  const response = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Sign-in failed.');
  if (!['CUSTOMER', 'COURIER'].includes(data.user.role)) {
    // Close the newly issued session even though it will never be persisted.
    await fetch(`${API_URL}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${data.accessToken}` } });
    throw new Error('Use the web portal for merchant and dispatcher accounts.');
  }
  const client = await getMobileAuthClient();
  const result = await client.auth.setSession({ access_token: data.accessToken, refresh_token: data.refreshToken });
  if (result.error) throw new Error('Unable to save your session securely. Please retry.');
  saveUser(data.user);
  return data.user;
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
