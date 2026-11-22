import assert from 'node:assert/strict';

const origin = process.env.SWIFTDROP_AUTH_ORIGIN || 'http://localhost:3000';
async function request(path: string, token?: string, body?: unknown) {
  return fetch(new URL(`/api/v1${path}`, origin), { method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000) });
}
async function main() {
  for (const path of ['/login', '/register', '/forgot-password', '/reset-password', '/account-applications']) {
    const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200, `${path}: page should be served`);
  }
  assert.equal((await request('/auth/applications')).status, 401);
  assert.equal((await request('/auth/forgot-password', undefined, { email: 'invalid-email' })).status, 400);
  const available = await request('/auth/demo');
  assert.equal(available.status, 200);
  const { roles } = await available.json() as { roles: string[] };
  assert.deepEqual(roles, ['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER']);
  for (const role of roles) {
    const login = await request('/auth/demo', undefined, { role });
    assert.equal(login.status, 200, `${role}: demo login failed`);
    const session = await login.json() as { accessToken: string; user: { id: string; role: string } };
    try {
      assert.equal(session.user.role, role);
      const me = await request('/auth/me', session.accessToken);
      assert.equal(me.status, 200);
      assert.equal(((await me.json()) as { user: { id: string } }).user.id, session.user.id);
      const applications = await request('/auth/applications', session.accessToken);
      assert.equal(applications.status, role === 'DISPATCHER' ? 200 : 403, `${role}: review access guard`);
    } finally { assert.equal((await request('/auth/logout', session.accessToken, {})).status, 200); }
    assert.equal((await request('/auth/me', session.accessToken)).status, 401, `${role}: logged-out JWT accepted`);
    console.log(`${role}: HTTP demo login, profile, staff guard and logout revocation passed.`);
  }
  console.log('Auth pages, unsigned request guard and reset validation passed. No signup or reset emails sent.');
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'HTTP auth verification failed.'); process.exitCode = 1; });
