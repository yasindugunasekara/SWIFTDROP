import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { API_URL, acceptMobileGoogleSession, createMobileAuthStorage, type MobileUser } from './auth';

const pendingKey = 'swiftdrop_google_pending';
const storageKey = 'swiftdrop_mobile_google';
let oauthClient: Promise<SupabaseClient> | null = null;
export class RegistrationRequired extends Error {
  constructor() { super('This Google account is not registered. Create a Customer account to continue.'); }
}

async function getOAuthClient() {
  oauthClient ||= (async () => {
    const response = await fetch(`${API_URL}/auth/config`, { signal: typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(10000) : undefined });
    if (!response.ok) throw new Error('Google sign-in is unavailable. Please retry.');
    const { url, anonKey } = await response.json();
    return createClient(url, anonKey, { auth: { flowType: 'pkce', storageKey,
      storage: createMobileAuthStorage(), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false } });
  })().catch(error => { oauthClient = null; throw error; });
  return oauthClient;
}

export function isMobileGoogleCallback() {
  return Platform.OS === 'web' && typeof window !== 'undefined' &&
    window.location.pathname === '/auth/callback' && sessionStorage.getItem(pendingKey) === '1';
}

export async function completeMobileGoogleLogin(callbackUrl: string): Promise<MobileUser> {
  if (Platform.OS === 'web') sessionStorage.removeItem(pendingKey);
  const url = new URL(callbackUrl);
  const params = url.searchParams;
  const hash = new URLSearchParams(url.hash.slice(1));
  const description = params.get('error_description') || hash.get('error_description') || '';
  if (description.includes('SWIFTDROP_REGISTRATION_REQUIRED')) throw new RegistrationRequired();
  if (params.has('error') || hash.has('error')) throw new Error('Google sign-in was cancelled or could not finish. Please retry.');
  const code = params.get('code');
  if (!code) throw new Error('Google did not return a sign-in code. Please retry.');
  const client = await getOAuthClient();
  const { data, error } = await client.auth.exchangeCodeForSession(code);
  if (error || !data.session) throw new Error('Google sign-in expired. Please retry.');
  try {
    const user = await acceptMobileGoogleSession(data.session.access_token, data.session.refresh_token);
    // Clear isolated storage without revoking the verified session just promoted.
    await createMobileAuthStorage().removeItem(storageKey);
    return user;
  } catch (failure) {
    await client.auth.signOut({ scope: 'local' });
    throw failure;
  }
}

export async function signInMobileWithGoogle(): Promise<MobileUser | null> {
  // Enable only after the server-side hook is active. OAuth normally creates new
  // users; a UI-only check would not enforce the existing-account requirement.
  if (process.env.EXPO_PUBLIC_GOOGLE_EXISTING_ONLY_READY !== 'true') {
    throw new Error('Google sign-in setup is not complete yet. Please use email and password.');
  }
  const redirectTo = Platform.OS === 'web'
    ? `${window.location.origin}/auth/callback`
    : makeRedirectUri({ scheme: 'swiftdrop', path: 'auth/callback' });
  const client = await getOAuthClient();
  const { data, error } = await client.auth.signInWithOAuth({ provider: 'google', options: {
    redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' },
  } });
  if (error || !data.url) throw new Error('Unable to start Google sign-in. Please retry.');
  if (Platform.OS === 'web') {
    sessionStorage.setItem(pendingKey, '1');
    window.location.assign(data.url);
    return null;
  }
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return null;
  return completeMobileGoogleLogin(result.url);
}
