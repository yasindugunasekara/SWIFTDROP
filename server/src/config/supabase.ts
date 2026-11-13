import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';

export function publicAuthConfig() {
  if (!config.supabase.url || !config.supabase.anonKey) {
    throw new Error('Configure SUPABASE_URL and SUPABASE_ANON_KEY in server/.env');
  }
  const key = config.supabase.anonKey;
  let anonymous = key.startsWith('sb_publishable_');
  if (key.split('.').length === 3) {
    try { anonymous = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon'; } catch { anonymous = false; }
  }
  if (!anonymous) throw new Error('SUPABASE_ANON_KEY must be a publishable or anon key, never a secret/service-role key');
  return { url: config.supabase.url, anonKey: key };
}

export function createSupabaseClient(accessToken?: string) {
  const publicConfig = publicAuthConfig();
  return createClient(publicConfig.url, publicConfig.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      ...(accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : {}),
      fetch: (input, options) => fetch(input, { ...options, signal: AbortSignal.timeout(15000) }),
    },
  });
}
