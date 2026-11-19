import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function compile(path) {
  return ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
}
const storageModule = {};
vm.runInNewContext(compile('../src/services/secure-session-storage.ts'), { exports: storageModule });
const createStorage = storageModule.createSecureSessionStorage;
const customer = { id: 'customer-1', authUserId: 'auth-1', fullName: 'Test Customer', email: 'customer@example.test', phone: null, role: 'CUSTOMER' };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function storageHarness() {
  const values = new Map();
  let failure = false;
  const storage = createStorage({
    getItemAsync: async key => values.get(key) ?? null,
    setItemAsync: async (key, value) => {
      if (failure && key.endsWith('.1')) throw new Error('Write failed');
      assert.ok(Buffer.byteLength(value, 'utf8') <= 2048);
      values.set(key, value);
    },
    deleteItemAsync: async key => { values.delete(key); },
  });
  return { values, storage, fail: () => { failure = true; } };
}

test('large Unicode sessions round-trip through small secure chunks and logout removes every current chunk', async () => {
  const { storage, values } = storageHarness();
  const session = JSON.stringify({ access_token: 'jwt'.repeat(1500), refresh_token: 'refresh-token', name: 'සිංහල 😀'.repeat(500) });
  await storage.setItem('session', session);
  assert.equal(await storage.getItem('session'), session);
  assert.ok(values.size > 2);
  await storage.removeItem('session');
  assert.equal(await storage.getItem('session'), null);
  assert.equal(values.size, 0);
});

test('failed token rotation preserves the old committed session and removes incomplete chunks', async () => {
  const { storage, values, fail } = storageHarness();
  await storage.setItem('session', 'old-session');
  const count = values.size;
  fail();
  await assert.rejects(storage.setItem('session', 'new-session'.repeat(500)), /Write failed/);
  assert.equal(await storage.getItem('session'), 'old-session');
  assert.equal(values.size, count);
});

test('successful token rotation deletes old chunks; incomplete saved sessions are never returned', async () => {
  const { storage, values } = storageHarness();
  await storage.setItem('session', 'old'.repeat(2000));
  const oldKeys = [...values.keys()].filter(key => key !== 'session');
  await storage.setItem('session', 'new-session');
  assert.equal(await storage.getItem('session'), 'new-session');
  assert.equal(oldKeys.some(key => values.has(key)), false);
  const chunk = [...values.keys()].find(key => key !== 'session');
  values.delete(chunk);
  assert.equal(await storage.getItem('session'), null);
});

function authHarness({ profile = customer, refresh = async () => ({ data: { session: { access_token: 'fresh-token' } }, error: null }), fetch: customFetch,
  platform = 'android', hostname = 'localhost', apiUrl = '' } = {}) {
  let callback;
  let savedSession = null;
  let signedOut = 0;
  let auto = '';
  const requests = [];
  const auth = {
    getSession: async () => ({ data: { session: savedSession }, error: null }),
    setSession: async value => { savedSession = value; return { error: null }; },
    signOut: async () => { signedOut++; savedSession = null; callback?.('SIGNED_OUT', null); return { error: null }; },
    refreshSession: refresh,
    onAuthStateChange: value => { callback = value; },
    startAutoRefresh: async () => { auto = 'active'; },
    stopAutoRefresh: async () => { auto = 'stopped'; },
  };
  const fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/auth/config')) return { ok: true, json: async () => ({ url: 'https://example.supabase.co', anonKey: 'sb_publishable_test' }) };
    if (customFetch) return customFetch(url, options);
    if (url.endsWith('/auth/login')) return { ok: true, json: async () => ({ user: profile, accessToken: 'test-token', refreshToken: 'test-refresh' }) };
    return { ok: true, status: 200, json: async () => ({ user: profile }) };
  };
  const exports = {};
  vm.runInNewContext(compile('../src/services/auth.ts'), {
    exports, process: { env: { EXPO_PUBLIC_API_URL: apiUrl } }, window: { location: { hostname } }, fetch, AbortSignal, setTimeout: () => undefined,
    require: name => {
      if (name === 'react-native') return { Platform: { OS: platform } };
      if (name === '@supabase/supabase-js') return { createClient: () => ({ auth }), processLock: () => undefined };
      if (name === './secure-session-storage') return storageModule;
      return {};
    },
  });
  return { api: exports, requests, get saved() { return savedSession; }, get signouts() { return signedOut; }, get auto() { return auto; }, seed: value => { savedSession = value; } };
}

test('mobile login uses backend identity, persists SDK tokens, restores profile and securely signs out', async () => {
  const h = authHarness();
  assert.equal(await h.api.loginMobile(' CUSTOMER@example.test ', 'test-password'), customer);
  const login = h.requests.find(value => value.url.endsWith('/auth/login'));
  assert.equal(JSON.parse(login.options.body).email, 'customer@example.test');
  assert.equal(h.saved.access_token, 'test-token');
  assert.equal(await h.api.initializeMobileAuth(), customer);
  const me = h.requests.find(value => value.url.endsWith('/auth/me'));
  assert.equal(me.options.headers.Authorization, 'Bearer test-token');
  await h.api.logoutMobile();
  assert.equal(h.saved, null);
  assert.equal(h.api.getMobileUser(), null);
  assert.equal(h.signouts, 1);
});

test('merchant/dispatcher identities cannot enter the customer/courier mobile shell', async () => {
  const h = authHarness({ profile: { ...customer, role: 'MERCHANT' } });
  await assert.rejects(h.api.loginMobile(customer.email, 'test-password'), /web portal/);
  assert.equal(h.saved, null);
  assert.equal(h.api.getMobileUser(), null);
  assert.equal(h.requests.some(value => value.url.endsWith('/auth/logout')), true);
});

test('foreground starts automatic refresh and revalidates the account; background stops it', async () => {
  const h = authHarness();
  h.seed({ access_token: 'test-token' });
  await h.api.setMobileAuthActive(true);
  assert.equal(h.auto, 'active');
  assert.equal(h.api.getMobileUser(), customer);
  await h.api.setMobileAuthActive(false);
  assert.equal(h.auto, 'stopped');
});

test('mobile concurrent refresh requests rotate once and a logout invalidates their result', async () => {
  const pending = deferred();
  const started = deferred();
  let calls = 0;
  const h = authHarness({ refresh: async () => { calls++; started.resolve(); return pending.promise; } });
  h.seed({ access_token: 'test-token' });
  const first = h.api.refreshMobileAccessToken('test-token');
  const second = h.api.refreshMobileAccessToken('test-token');
  await started.promise;
  await h.api.logoutMobile();
  pending.resolve({ data: { session: { access_token: 'fresh-token' } }, error: null });
  assert.equal(await first, null);
  assert.equal(await second, null);
  assert.equal(calls, 1);
  assert.equal(h.api.getMobileUser(), null);
});

test('mobile profile restoration retries a 401 once with a rotated token', async () => {
  let requests = 0;
  const h = authHarness({ fetch: async (_url, options) => {
    requests++;
    const ok = options.headers.Authorization === 'Bearer fresh-token';
    return { ok, status: ok ? 200 : 401, json: async () => ({ user: customer }) };
  } });
  h.seed({ access_token: 'test-token' });
  assert.equal(await h.api.loadMobileProfile(), customer);
  assert.equal(requests, 2);
});


test('Google customer session is persisted only after the backend verifies its role', async () => {
  const h = authHarness();
  assert.equal(await h.api.acceptMobileGoogleSession('google-access', 'google-refresh'), customer);
  const me = h.requests.find(value => value.url.endsWith('/auth/me'));
  assert.equal(me.options.headers.Authorization, 'Bearer google-access');
  assert.equal(h.saved.access_token, 'google-access');
});

test('Google sign-in cannot promote a courier or merchant into the customer dashboard', async () => {
  for (const role of ['COURIER', 'MERCHANT']) {
    const h = authHarness({ profile: { ...customer, role } });
    await assert.rejects(h.api.acceptMobileGoogleSession('google-access', 'google-refresh'), /Customer accounts only/);
    assert.equal(h.saved, null);
    assert.equal(h.api.getMobileUser(), null);
  }
});

test('mobile demo login persists a real backend session without submitting client credentials', async () => {
  const h = authHarness({ fetch: async (url, options) => {
    assert.match(url, /\/auth\/demo$/);
    assert.deepEqual(JSON.parse(options.body), { role: 'COURIER' });
    return { ok: true, json: async () => ({ user: { ...customer, role: 'COURIER' }, accessToken: 'demo-token', refreshToken: 'demo-refresh' }) };
  } });
  assert.equal((await h.api.loginMobileDemo('COURIER')).role, 'COURIER');
  assert.equal(h.saved.access_token, 'demo-token');
});

test('mobile password reset normalizes the email and reports backend failures', async () => {
  const h = authHarness({ fetch: async (url, options) => {
    assert.match(url, /\/auth\/forgot-password$/); assert.equal(JSON.parse(options.body).email, 'customer@example.test');
    return { ok: true, json: async () => ({ message: 'If an account exists, check your email.' }) };
  } });
  assert.match(await h.api.requestMobilePasswordReset(' Customer@Example.test '), /If an account exists/);
  const unavailable = authHarness({ fetch: async () => ({ ok: false, json: async () => ({ error: 'Try again later.' }) }) });
  await assert.rejects(unavailable.api.requestMobilePasswordReset('customer@example.test'), /Try again later/);
});

test('phone browser API follows the preview hostname while explicit deployments and emulator defaults are preserved', () => {
  assert.equal(authHarness({ platform: 'web', hostname: '172.20.10.6' }).api.API_URL, 'http://172.20.10.6:5000/api/v1');
  assert.equal(authHarness({ platform: 'web', hostname: '192.168.1.20' }).api.API_URL, 'http://192.168.1.20:5000/api/v1');
  assert.equal(authHarness({ platform: 'web', hostname: '172.20.10.6', apiUrl: 'https://api.example.test/api/v1' }).api.API_URL, 'https://api.example.test/api/v1');
  assert.equal(authHarness().api.API_URL, 'http://10.0.2.2:5000/api/v1');
});
