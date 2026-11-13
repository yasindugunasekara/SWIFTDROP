import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Exercise the real auth module with an isolated SDK and HTTP boundary.
const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const customer = { id: 'customer-1', fullName: 'Test Customer', email: 'customer@example.test', role: 'CUSTOMER' };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness({ fetch = async () => ({ ok: true, json: async () => ({ user: customer }) }), signOut = async () => ({ error: null }) } = {}) {
  let callback;
  const scheduled = [];
  const auth = {
    getSession: async () => ({ data: { session: { access_token: 'test-token' } }, error: null }),
    onAuthStateChange: listener => { callback = listener; },
    signOut,
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: () => ({ getSupabaseClient: async () => ({ auth }) }),
    process: { env: {} }, fetch, AbortSignal, localStorage: { removeItem() {} },
    setTimeout: task => scheduled.push(task),
  });
  return { api: exports, emit: (...args) => callback(...args), scheduled };
}

test('profile request uses the authenticated token and stores the returned customer', async () => {
  let request;
  const { api } = harness({ fetch: async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ user: customer }) };
  } });
  await api.loadAuthenticatedUser();
  assert.equal(request.url.endsWith('/auth/me'), true);
  assert.equal(request.options.headers.Authorization, 'Bearer test-token');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(api.getStoredUser(), customer);
});

test('successful logout calls Supabase local signout and clears customer details', async () => {
  let scope;
  const { api } = harness({ signOut: async options => { scope = options.scope; return { error: null }; } });
  api.saveAuthSession(customer);
  await api.clearAuthSession();
  assert.equal(scope, 'local');
  assert.equal(api.getStoredUser(), null);
});

test('a late profile response cannot restore the customer after logout', async () => {
  const response = deferred();
  const started = deferred();
  const { api } = harness({ fetch: async () => { started.resolve(); return response.promise; } });
  api.saveAuthSession(customer);
  const loading = api.loadAuthenticatedUser();
  await started.promise;
  await api.clearAuthSession();
  response.resolve({ ok: true, json: async () => ({ user: customer }) });
  assert.equal(await loading, null);
  assert.equal(api.getStoredUser(), null);
});

test('concurrent logout clicks share one request; failure preserves the account and allows retry', async () => {
  const pending = deferred();
  let calls = 0;
  const { api } = harness({ signOut: async () => {
    calls++;
    return calls === 1 ? pending.promise : { error: null };
  } });
  api.saveAuthSession(customer);
  const first = api.clearAuthSession();
  assert.equal(api.clearAuthSession(), first);
  assert.equal(await api.getAccessToken(), null);
  pending.resolve({ error: new Error('Network unavailable') });
  await assert.rejects(first, /Unable to sign out securely/);
  assert.equal(api.getStoredUser(), customer);
  await api.clearAuthSession();
  assert.equal(calls, 2);
  assert.equal(api.getStoredUser(), null);
});

test('queued sign-in callbacks cannot load an old profile after SIGNED_OUT', async () => {
  let reads = 0;
  const { api, emit, scheduled } = harness({ fetch: async () => {
    reads++;
    return { ok: true, json: async () => ({ user: customer }) };
  } });
  await api.initializeAuth();
  emit('SIGNED_IN', { access_token: 'old-token' });
  emit('SIGNED_OUT', null);
  scheduled.forEach(task => task());
  await Promise.resolve();
  assert.equal(reads, 1);
  assert.equal(api.getStoredUser(), null);
});
