import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { moduleOptions } from '../../scripts/auth-test-module.mjs';

// Exercise the real auth module with an isolated SDK and HTTP boundary.
const source = ts.transpileModule(readFileSync(new URL('../src/lib/auth.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const customer = { id: 'customer-1', fullName: 'Test Customer', email: 'customer@example.test', role: 'CUSTOMER' };
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };

function harness({ fetch = async () => ({ ok: true, json: async () => ({ user: customer }) }), signOut = async () => ({ error: null }),
  refreshSession = async () => ({ data: { session: { access_token: 'fresh-token' } }, error: null }),
  signInWithOAuth = async () => ({ data: { url: 'https://auth.example.test/authorize' }, error: null }),
  getSession = async () => ({ data: { session: { access_token: 'test-token' } }, error: null }),
  getUser = async () => ({ data: { user: customer }, error: null }),
  updateUser = async () => ({ data: { user: customer }, error: null }),
  setSession = async () => ({ error: null }),
  now = () => Date.now(),
  location = { origin: 'https://swiftdrop.example.test', search: '', hash: '' } } = {}) {
  let callback;
  const scheduled = [];
  const auth = {
    getSession,
    onAuthStateChange: listener => { callback = listener; },
    signOut,
    refreshSession,
    signInWithOAuth,
    getUser, updateUser,
    setSession,
  };
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: () => ({ getSupabaseClient: async () => ({ auth }) }),
    process: { env: {} }, fetch, AbortSignal, URLSearchParams, TextEncoder, window: { location, history: { replaceState() {} } }, localStorage: { removeItem() {} },
    setTimeout: task => scheduled.push(task), clearTimeout() {},
    Date: class extends Date { static now() { return now(); } },
  }, moduleOptions(source, 'web-auth.js'));
  const apiSource = ts.transpileModule(readFileSync(new URL('../src/lib/api.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const http = {};
  vm.runInNewContext(apiSource, { exports: http, require: () => exports, process: { env: {} }, window: {}, fetch }, moduleOptions(apiSource, 'web-api.js'));
  return { api: exports, http, emit: (...args) => callback(...args), scheduled };
}

test('absolute session expiry automatically clears the account even offline, and blocks token refresh', async () => {
  let clock = 1000; let logouts = 0; let refreshes = 0;
  const {api,scheduled} = harness({now:()=>clock, signOut:async()=>{logouts++;return {error:new Error('offline')};},refreshSession:async()=>{refreshes++;return {};}});
  api.saveAuthSession({...customer,sessionExpiresAt:2000});
  assert.equal(await api.expireSessionIfNeeded(),false);
  clock=2000;
  await scheduled[0]();
  assert.equal(api.getStoredUser(),null);
  assert.equal(logouts,1);
  assert.equal(refreshes,0);
});

test('expired sessions cannot issue access tokens and an old timer cannot log out a newer session', async () => {
  let clock=1000; let reads=0;
  const {api,scheduled}=harness({now:()=>clock,getSession:async()=>{reads++;return {data:{session:{access_token:'token'}}};}});
  api.saveAuthSession({...customer,sessionExpiresAt:2000});
  const oldTimer=scheduled[0];
  api.saveAuthSession({...customer,sessionExpiresAt:4000});
  clock=2000; await oldTimer(); assert.ok(api.getStoredUser());
  clock=4000; assert.equal(await api.getAccessToken(),null); assert.equal(reads,0);
});

test('late email and demo login responses cannot restore a session after logout', async () => {
  for (const method of ['signIn', 'signInDemo']) {
    const response = deferred(); let writes = 0;
    const { api } = harness({ fetch: () => response.promise, setSession: async () => { writes++; return { error: null }; } });
    const login = method === 'signIn' ? api.signIn('test@example.test', 'password') : api.signInDemo('CUSTOMER');
    const rejected = assert.rejects(login, /session changed/);
    await api.clearAuthSession();
    response.resolve({ ok: true, json: async () => ({ user: customer, accessToken: 'old', refreshToken: 'old-refresh' }) });
    await rejected;
    assert.equal(writes, 0); assert.equal(api.getStoredUser(), null);
  }
});

test('logout waits for an in-progress session write and clears the persisted session', async () => {
  const write = deferred(); const started = deferred(); let stored = false;
  const { api } = harness({ fetch: async () => ({ ok: true, json: async () => ({ user: customer, accessToken: 'a', refreshToken: 'r' }) }),
    setSession: async () => { started.resolve(); await write.promise; stored = true; return { error: null }; },
    signOut: async () => { stored = false; return { error: null }; } });
  const login = api.signIn('test@example.test', 'password');
  const rejected = assert.rejects(login, /session changed/);
  await started.promise;
  const logout = api.clearAuthSession(); write.resolve();
  await Promise.all([rejected, logout]);
  assert.equal(stored, false); assert.equal(api.getStoredUser(), null);
});

test('a slow previous account login cannot overwrite the newer account', async () => {
  const first = deferred(); const second = { ...customer, id: 'courier-2', role: 'COURIER' }; let requests = 0;
  const { api } = harness({ fetch: async () => ++requests === 1 ? first.promise : ({ ok: true, json: async () => ({ user: second, accessToken: 'b', refreshToken: 'br' }) }) });
  const oldLogin = api.signIn('first@example.test', 'password');
  const rejected = assert.rejects(oldLogin, /session changed/);
  await api.signIn('second@example.test', 'password');
  first.resolve({ ok: true, json: async () => ({ user: customer, accessToken: 'a', refreshToken: 'ar' }) });
  await rejected; assert.equal(api.getStoredUser(), second);
});

test('profile edits send only safe fields with the active token and update the displayed identity', async () => {
  const updated = { ...customer, fullName: 'Updated Customer', phone: '0771234567' };
  const { api } = harness({ fetch: async (url, options) => {
    assert.equal(url, '/api/v1/auth/me'); assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(options.body), { fullName: 'Updated Customer', phone: '0771234567' });
    return { ok: true, json: async () => ({ user: updated }) };
  } });
  await api.updateMyProfile(' Updated Customer ', '0771234567');
  assert.equal(api.getStoredUser(), updated);
});

test('a profile save response arriving after logout cannot restore the old identity', async () => {
  const response = deferred(); const started = deferred();
  const { api } = harness({ fetch: () => { started.resolve(); return response.promise; } });
  const save = api.updateMyProfile('Changed Name', '');
  const rejected = assert.rejects(save, /session changed/);
  await started.promise; await api.clearAuthSession();
  response.resolve({ ok: true, json: async () => ({ user: customer }) });
  await rejected; assert.equal(api.getStoredUser(), null);
});

test('profile request uses the authenticated token and stores the returned customer', async () => {
  let request;
  const { api } = harness({ fetch: async (url, options) => {
    request = { url, options };
    return { ok: true, json: async () => ({ user: customer }) };
  } });
  await api.loadAuthenticatedUser();
  assert.equal(request.url, '/api/v1/auth/me');
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

test('concurrent expired-token requests share one refresh and retry once with the new token', async () => {
  let refreshes = 0;
  let requests = 0;
  const { http } = harness({
    refreshSession: async () => { refreshes++; return { data: { session: { access_token: 'fresh-token' } }, error: null }; },
    fetch: async (_url, options) => {
      requests++;
      const ok = options.headers.Authorization === 'Bearer fresh-token';
      return { ok, status: ok ? 200 : 401, json: async () => ok ? { ok: true } : { error: 'Expired token' } };
    },
  });
  const responses = await Promise.all(Array.from({ length: 5 }, () => http.fetchApi('/protected')));
  assert.equal(refreshes, 1);
  assert.equal(requests, 10);
  assert.equal(responses.every(value => value.ok), true);
});

test('profile restoration retries an expired token through the same refresh flow', async () => {
  let reads = 0;
  const { api } = harness({ fetch: async (_url, options) => {
    reads++;
    const ok = options.headers.Authorization === 'Bearer fresh-token';
    return { ok, status: ok ? 200 : 401, json: async () => ({ user: customer }) };
  } });
  assert.equal(await api.loadAuthenticatedUser(), customer);
  assert.equal(reads, 2);
});

test('network errors during refresh retain the session so the user can retry', async () => {
  const { api } = harness({ refreshSession: async () => ({ data: {}, error: { status: 0 } }) });
  api.saveAuthSession(customer);
  await assert.rejects(api.refreshAccessToken('test-token'), /Check your connection/);
  assert.equal(api.getStoredUser(), customer);
});

test('a rejected refresh token ends the local session', async () => {
  const { api } = harness({ refreshSession: async () => ({ data: {}, error: { status: 400 } }) });
  api.saveAuthSession(customer);
  assert.equal(await api.refreshAccessToken('test-token'), null);
  assert.equal(api.getStoredUser(), null);
});

test('logout during refresh prevents an authenticated retry or profile restoration', async () => {
  const pending = deferred();
  const started = deferred();
  let requests = 0;
  const { api, http } = harness({
    refreshSession: async () => { started.resolve(); return pending.promise; },
    fetch: async () => { requests++; return { ok: false, status: 401, json: async () => ({ error: 'Expired' }) }; },
  });
  api.saveAuthSession(customer);
  const request = http.fetchApi('/protected');
  const rejection = assert.rejects(request, /session has changed/);
  await started.promise;
  await api.clearAuthSession();
  pending.resolve({ data: { session: { access_token: 'fresh-token' } }, error: null });
  await rejection;
  assert.equal(requests, 1);
  assert.equal(api.getStoredUser(), null);
});


test('Google OAuth uses Supabase and the current origin callback without granting a role', async () => {
  let request;
  const { api } = harness({ signInWithOAuth: async input => {
    request = input;
    return { data: { url: 'https://auth.example.test/authorize' }, error: null };
  } });
  await api.signInWithGoogle();
  assert.equal(request.provider, 'google');
  assert.equal(request.options.redirectTo, 'https://swiftdrop.example.test/auth/callback');
  assert.equal(request.options.queryParams.prompt, 'select_account');
  assert.equal(api.getStoredUser(), null);
});

test('failed Google OAuth does not establish an application session', async () => {
  const { api } = harness({ signInWithOAuth: async () => ({ data: { url: null }, error: { message: 'private provider details' } }) });
  await assert.rejects(api.signInWithGoogle(), /Google sign-in could not start/);
  assert.equal(api.getStoredUser(), null);
});

test('OAuth callback loads the verified customer rather than trusting URL role or redirect parameters', async () => {
  const { api } = harness({ location: { origin: 'https://swiftdrop.example.test', hash: '',
    search: '?code=oauth-code&role=ADMIN&next=https://untrusted.example.test' } });
  const user = await api.completeAuthRedirect();
  assert.equal(user, customer);
  assert.equal(api.dashboardFor(user), '/booking');
});

test('cancelled Google callback never reads or restores an existing session', async () => {
  let calls = 0;
  const { api } = harness({ location: { origin: 'https://swiftdrop.example.test', search: '?error=access_denied&error_description=private', hash: '' },
    getSession: async () => { calls++; return { data: { session: null }, error: null }; } });
  await assert.rejects(api.completeAuthRedirect(), /cancelled or the link expired/);
  assert.equal(calls, 0);
});

test('callback with no restored session reports a retry instead of pretending sign-in succeeded', async () => {
  const { api } = harness({ getSession: async () => ({ data: { session: null }, error: null }) });
  await assert.rejects(api.completeAuthRedirect(), /session could not be restored/);
  assert.equal(api.getStoredUser(), null);
});

test('dashboard routing covers all roles and keeps pending/rejected applicants on approval', () => {
  const { api } = harness();
  for (const [role, route] of Object.entries({ CUSTOMER: '/booking', COURIER: '/tasks', MERCHANT: '/portal', DISPATCHER: '/dispatch', ADMIN: '/admin' })) {
    assert.equal(api.dashboardFor({ ...customer, role, approvalStatus: 'APPROVED' }), route);
  }
  for (const status of ['PENDING', 'REJECTED']) assert.equal(api.dashboardFor({ ...customer, application: { requestedRole: 'COURIER', status } }), '/approval');
  assert.equal(api.dashboardFor({ ...customer, role: 'COURIER', application: { status: 'APPROVED' } }), '/tasks');
});

test('password reset requests use the backend and display its generic response', async () => {
  let request;
  const { api } = harness({ fetch: async (url, options) => {
    request = { url, options }; return { ok: true, json: async () => ({ message: 'If an account exists, check your email.' }) };
  } });
  assert.match(await api.requestPasswordReset('customer@example.test'), /If an account exists/);
  assert.equal(request.url, '/api/v1/auth/forgot-password');
  assert.equal(JSON.parse(request.options.body).email, 'customer@example.test');
});

test('reset page rejects missing/expired sessions and provider errors before accepting a password', async () => {
  await assert.rejects(harness({ getSession: async () => ({ data: { session: null } }) }).api.preparePasswordReset(), /invalid or expired/);
  await assert.rejects(harness({ getUser: async () => ({ data: {}, error: {} }) }).api.preparePasswordReset(), /invalid or expired/);
  await assert.rejects(harness({ location: { search: '?error=access_denied', hash: '' } }).api.preparePasswordReset(), /invalid or expired/);
  await harness().api.preparePasswordReset();
});

test('password update enforces matching/UTF-8 limits and globally signs out only after a successful update', async () => {
  const calls = [];
  const { api } = harness({ updateUser: async input => { calls.push(input); return { error: null }; },
    signOut: async input => { calls.push(input); return { error: null }; } });
  await assert.rejects(api.updatePassword('short', 'short'), /at least 8/);
  await assert.rejects(api.updatePassword('Password@123', 'different'), /do not match/);
  await assert.rejects(api.updatePassword('😀'.repeat(20), '😀'.repeat(20)), /72 UTF-8/);
  api.saveAuthSession(customer);
  await api.updatePassword('Password@123', 'Password@123');
  assert.equal(calls.length, 2); assert.equal(calls[0].password, 'Password@123'); assert.equal(calls[1].scope, 'global');
  assert.equal(api.getStoredUser(), null);
  let signedOut = false;
  const rejected = harness({ updateUser: async () => ({ error: {} }), signOut: async () => { signedOut = true; return { error: null }; } });
  await assert.rejects(rejected.api.updatePassword('Password@123', 'Password@123'), /Unable to update/);
  assert.equal(signedOut, false);
});

test('demo login persists only server-issued tokens and verified identity', async () => {
  let request;
  const { api } = harness({ fetch: async (url, options) => {
    request = { url, options }; return { ok: true, json: async () => ({ user: customer, accessToken: 'demo-access', refreshToken: 'demo-refresh' }) };
  } });
  assert.equal(await api.signInDemo('CUSTOMER'), customer);
  assert.equal(request.url, '/api/v1/auth/demo');
  assert.deepEqual(JSON.parse(request.options.body), { role: 'CUSTOMER' });
  assert.equal(api.getStoredUser(), customer);
});
