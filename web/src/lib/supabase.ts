import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let clientPromise: Promise<SupabaseClient> | null = null;
export function getSupabaseClient(): Promise<SupabaseClient> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser authentication is unavailable on the server'));
  clientPromise ||= (async () => {
    let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      const base = '/api/v1';
      const response = await fetch(`${base}/auth/config`, { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error('Sign-in service is unavailable. Please retry.');
      const data = await response.json(); url = data.url; anonKey = data.anonKey;
    }
    if (!url || !anonKey || anonKey.startsWith('sb_secret_')) throw new Error('Public Supabase configuration is missing');
    // Server-issued email confirmation links still return an implicit token hash.
    // New browser OAuth uses PKCE; the SDK validates either callback itself.
    const implicitCallback = new URLSearchParams(window.location.hash.slice(1)).has('access_token');
    return createClient(url, anonKey, { auth: { storageKey: 'swiftdrop_supabase_session',
      flowType: implicitCallback ? 'implicit' : 'pkce',
      persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  })().catch(error => { clientPromise = null; throw error; });
  return clientPromise;
}
