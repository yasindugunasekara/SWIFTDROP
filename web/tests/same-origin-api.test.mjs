import assert from 'node:assert/strict';
import test from 'node:test';

// Run against a production Next server (npm start -- -p 3101).
const origin = process.env.SWIFTDROP_TEST_ORIGIN || 'http://localhost:3101';
const request = (path, options) => fetch(new URL(path, origin), {
  ...options, signal: AbortSignal.timeout(20000),
});
const post = body => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('Next serves the login page and backend health on the same origin', async () => {
  const page = await request('/login');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  const health = await request('/api/v1/health');
  assert.equal(health.status, 200);
  assert.equal((await health.json()).service, 'SwiftDrop API');
});

test('public auth config is provided by the embedded backend', async () => {
  const response = await request('/api/v1/auth/config');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('cache-control'), /no-store/);
  const config = await response.json();
  assert.ok(config.url.startsWith('https://'));
  assert.ok(config.anonKey);
  assert.equal(config.anonKey.startsWith('sb_secret_'), false);
});

test('login and signup validation use existing backend handlers', async () => {
  for (const endpoint of ['login', 'register']) {
    const response = await request('/api/v1/auth/' + endpoint, post({}));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, 'VALIDATION_ERROR');
  }
});

test('Express parses POST JSON through Next and retains auth guards', async () => {
  const quote = await request('/api/v1/booking/quote', post({ weightKg: 4 }));
  assert.equal(quote.status, 200);
  assert.equal((await quote.json()).weightFee, 10);
  for (const [path, options] of [
    ['/api/v1/auth/me', {}], ['/api/v1/booking/create', post({})],
  ]) {
    const response = await request(path, options);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'Access token required');
  }
});

test('malformed and oversized auth JSON retain the backend limits', async () => {
  const malformed = await request('/api/v1/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(malformed.status, 400);
  const oversized = await request('/api/v1/auth/login', post({ password: 'x'.repeat(17000) }));
  assert.equal(oversized.status, 413);
});

test('unknown API routes return JSON rather than the frontend HTML page', async () => {
  const response = await request('/api/v1/missing-endpoint');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'API endpoint not found.');
});

test('merchant and courier modules remain mounted behind the same Next API', async () => {
  const merchant = await request('/api/v1/merchant/login', post({}));
  assert.equal(merchant.status, 400);
  for (const path of ['/api/v1/merchant/profile', '/api/v1/courier/jobs']) {
    const response = await request(path);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'Access token required');
  }
});
