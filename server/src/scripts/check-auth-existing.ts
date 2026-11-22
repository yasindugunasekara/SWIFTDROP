import assert from 'node:assert/strict';

// Uses only existing examiner identities. No signup/reset email is requested.
const origins = (process.env.SWIFTDROP_AUTH_ORIGINS || 'http://localhost:3000,http://localhost:5000').split(',');
async function main() {
  for (const origin of origins) {
    const request = (path: string, body?: unknown, token?: string, method?: string) => fetch(`${origin}/api/v1/auth${path}`, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(30000),
    });
    const valid = { fullName: 'Validation Only', email: 'validation-only@example.invalid', password: 'ValidationOnly123!', confirmPassword: 'ValidationOnly123!' };
    for (const invalid of [{ ...valid, email: 'bad-email' }, { ...valid, confirmPassword: 'different' }, { ...valid, role: 'ADMIN' }, { ...valid, password: 'short', confirmPassword: 'short' }]) {
      assert.equal((await request('/register', invalid)).status, 400, 'Invalid signup must fail before account creation');
    }
    assert.equal((await request('/register-application', { ...valid, application: { role: 'COURIER' } })).status, 400);
    const config = await request('/config'); assert.equal(config.status, 200);
    const publicConfig = await config.json() as { url: string; anonKey: string };
    assert.ok(publicConfig.url.startsWith('https://'));
    assert.ok(publicConfig.anonKey && !publicConfig.anonKey.startsWith('sb_secret_'));
    for (const role of ['CUSTOMER', 'COURIER']) {
      const login = await request('/demo', { role }); assert.equal(login.status, 200, `${role}: existing login`);
      const session = await login.json() as { accessToken: string; user: { id: string; fullName: string; phone: string | null; role: string } };
      try {
        assert.equal(session.user.role, role);
        const me = await request('/me', undefined, session.accessToken); assert.equal(me.status, 200);
        assert.equal(((await me.json()) as { user: { id: string } }).user.id, session.user.id);
        // Save the existing values: exercise the real update without changing profile content.
        const saved = await request('/me', { fullName: session.user.fullName, phone: session.user.phone }, session.accessToken, 'PATCH');
        assert.equal(saved.status, 200);
        const profile = await saved.json() as { user: { id: string; role: string; fullName: string; phone: string | null } };
        assert.equal(profile.user.id, session.user.id); assert.equal(profile.user.role, role);
        assert.equal(profile.user.fullName, session.user.fullName); assert.equal(profile.user.phone, session.user.phone);
        assert.equal((await request('/me', { fullName: session.user.fullName, role: 'ADMIN' }, session.accessToken, 'PATCH')).status, 400);
        assert.equal((await request('/applications', undefined, session.accessToken)).status, 403);
      } finally { assert.equal((await request('/logout', {}, session.accessToken)).status, 200); }
      assert.equal((await request('/me', undefined, session.accessToken)).status, 401);
      console.log(`${origin}: ${role} existing login, profile save, role boundary, logout and revoked-token checks passed.`);
    }
    console.log(`${origin}: invalid customer/courier registration rejected before provider signup; no accounts or emails created.`);
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Existing-account verification failed.'); process.exitCode = 1; });
