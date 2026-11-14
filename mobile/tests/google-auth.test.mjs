import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../src/services/google-auth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness({ ready = true, callbackError = false, roleRejected = false, cancel = false } = {}) {
  let oauthCalls = 0, exchanges = 0, promotions = 0, revocations = 0;
  const storage = new Map();
  const client = { auth: {
    signInWithOAuth: async () => { oauthCalls++; return { data: { url: 'https://auth.example.test/authorize' }, error: null }; },
    exchangeCodeForSession: async () => { exchanges++; return callbackError ? { data: {}, error: {} } : { data: { session: { access_token: 'verified', refresh_token: 'refresh' } }, error: null }; },
    signOut: async () => { revocations++; return { error: null }; },
  } };
  const exports = {};
  vm.runInNewContext(source, { exports, URL, URLSearchParams, AbortSignal,
    process: { env: { EXPO_PUBLIC_GOOGLE_EXISTING_ONLY_READY: ready ? 'true' : 'false' } },
    fetch: async () => ({ ok: true, json: async () => ({ url: 'https://auth.example.test', anonKey: 'sb_publishable_test' }) }),
    require: name => {
      if (name === 'react-native') return { Platform: { OS: 'android' } };
      if (name === '@supabase/supabase-js') return { createClient: () => client };
      if (name === 'expo-auth-session') return { makeRedirectUri: () => 'swiftdrop://auth/callback' };
      if (name === 'expo-web-browser') return { openAuthSessionAsync: async () => cancel ? { type: 'cancel' } : { type: 'success', url: 'swiftdrop://auth/callback?code=valid-code' } };
      if (name === './auth') return { API_URL: 'https://api.example.test/api/v1',
        createMobileAuthStorage: () => ({ getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }),
        acceptMobileGoogleSession: async () => { promotions++; if (roleRejected) throw new Error('Customer accounts only'); return { role: 'CUSTOMER' }; },
      };
      throw new Error(name);
    },
  });
  return { api: exports, stats: () => ({ oauthCalls, exchanges, promotions, revocations }) };
}

test('Google login stays blocked until existing-account hook setup is confirmed', async () => {
  const h = harness({ ready: false });
  await assert.rejects(h.api.signInMobileWithGoogle(), /setup is not complete/);
  assert.equal(h.stats().oauthCalls, 0);
});
test('unregistered callback notifies registration without exchanging or saving a session', async () => {
  const h = harness();
  await assert.rejects(h.api.completeMobileGoogleLogin('swiftdrop://auth/callback?error=access_denied&error_description=SWIFTDROP_REGISTRATION_REQUIRED'), error => error instanceof h.api.RegistrationRequired);
  assert.equal(h.stats().exchanges, 0);
  assert.equal(h.stats().promotions, 0);
});
test('cancelled Google authentication preserves the signed-out state', async () => {
  const h = harness({ cancel: true });
  assert.equal(await h.api.signInMobileWithGoogle(), null);
  assert.equal(h.stats().promotions, 0);
});
test('successful native OAuth exchanges PKCE then promotes a verified customer', async () => {
  const h = harness();
  assert.equal((await h.api.signInMobileWithGoogle()).role, 'CUSTOMER');
  assert.equal(h.stats().exchanges, 1);
  assert.equal(h.stats().promotions, 1);
  assert.equal(h.stats().revocations, 0);
});
test('a non-customer Google session is revoked without granting customer access', async () => {
  const h = harness({ roleRejected: true });
  await assert.rejects(h.api.signInMobileWithGoogle(), /Customer accounts only/);
  assert.equal(h.stats().revocations, 1);
});
test('invalid or expired OAuth codes never reach application session persistence', async () => {
  const h = harness({ callbackError: true });
  await assert.rejects(h.api.signInMobileWithGoogle(), /expired/);
  assert.equal(h.stats().promotions, 0);
});
