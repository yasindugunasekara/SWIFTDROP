/**
 * MEMBER 6 — Merchant Account, Orders & Partner API: integration tests
 *
 * Runs the real merchant router against the real PostgreSQL database in-process
 * (no running server needed) and cleans up every row it creates.
 *
 *   npm run test:merchant
 *
 * Evidence covered:
 *   1. Merchant onboarding: register → PENDING → admin approval → APPROVED
 *   2. Valid API order (API key auth, server-calculated fee, merchant-owned)
 *   3. Invalid credentials (missing / malformed / unknown / revoked key, unapproved merchant, bad password)
 *   4. Cross-merchant data isolation (API and portal)
 *   5. Per-merchant rate limiting
 */
import express from 'express';
import type { AddressInfo } from 'net';
import jwt from 'jsonwebtoken';

const RATE_LIMIT = 8;
process.env.MERCHANT_API_RATE_LIMIT = String(RATE_LIMIT);

const { db } = await import('../../config/database.js');
const { config } = await import('../../config/env.js');
const { default: merchantRoutes } = await import('./merchant.routes.js');

// -----------------------------------------------------------------------------
// Harness
// -----------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use('/api/v1/merchant', merchantRoutes);
const server = app.listen(0);
const BASE = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/merchant`;

let passed = 0;
let failed = 0;
const check = (cond: unknown, label: string, detail?: unknown) => {
  if (cond) {
    passed++;
    console.log(`  ✅ PASS: ${label}`);
  } else {
    failed++;
    console.log(`  ❌ FAIL: ${label}`, detail === undefined ? '' : JSON.stringify(detail).slice(0, 400));
  }
};
const section = (title: string) => console.log(`\n--- ${title} ---`);

async function call(method: string, path: string, opts: { token?: string; apiKey?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.apiKey !== undefined) headers['X-API-Key'] = opts.apiKey;
  const res = await fetch(BASE + path, { method, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  const data: any = await res.json().catch(() => null);
  return { status: res.status, data, headers: res.headers };
}

const runId = Date.now().toString(36);
const createdEmails: string[] = [];
const orderBody = (recipientName: string) => ({
  senderName: 'Warehouse Team',
  senderPhone: '+94112345678',
  pickupAddress: '120 Union Place, Colombo 02',
  recipientName,
  recipientPhone: '+94770000000',
  deliveryAddress: '45 Kandy Road, Kadawatha',
  weightKg: 2,
  distanceKm: 5,
});

async function registerMerchant(label: string) {
  const email = `merchant-test-${label}-${runId}@example.com`;
  createdEmails.push(email);
  return call('POST', '/register', {
    body: { email, password: 'Merch4ntPass', fullName: `Test ${label}`, companyName: `Test Store ${label} ${runId}` },
  });
}

// Admin approval needs an ADMIN/DISPATCHER session. Login for those roles is Member 1's
// module, so the test signs a short-lived token with the server's own secret.
const adminToken = jwt.sign(
  { id: '44444444-4444-4444-4444-444444444444', email: 'dispatcher@swiftdrop.com', role: 'DISPATCHER' },
  config.jwt.accessSecret,
  { expiresIn: '10m' }
);

try {
  // ===========================================================================
  section('1. Merchant onboarding & approval');
  // ===========================================================================
  const regA = await registerMerchant('a');
  check(regA.status === 201, 'Merchant A registers', regA.data);
  check(regA.data?.merchant?.status === 'PENDING', 'New merchant starts as PENDING');
  check(regA.data?.accessToken && regA.data?.user?.merchantId, 'Registration returns a portal session with merchantId');
  const tokenA = regA.data.accessToken;
  const merchantA = regA.data.merchant.id;

  const dupe = await call('POST', '/register', {
    body: { email: createdEmails[0], password: 'Merch4ntPass', fullName: 'Dupe', companyName: 'Dupe Store' },
  });
  check(dupe.status === 409, 'Duplicate email is rejected (409)', dupe.data);

  const weak = await call('POST', '/register', {
    body: { email: `weak-${runId}@example.com`, password: 'short', fullName: 'Weak', companyName: 'Weak Store' },
  });
  check(weak.status === 400, 'Weak password is rejected (400)', weak.data);

  const pendingKey = await call('POST', '/api-keys/generate', { token: tokenA, body: { name: 'early' } });
  check(pendingKey.status === 403, 'PENDING merchant cannot generate API keys (403)', pendingKey.data);

  const pendingOrder = await call('POST', '/orders', { token: tokenA, body: orderBody('Early') });
  check(pendingOrder.status === 403, 'PENDING merchant cannot create orders (403)', pendingOrder.data);

  const merchantDenied = await call('PATCH', `/admin/${merchantA}/approval`, { token: tokenA, body: { status: 'APPROVED' } });
  check(merchantDenied.status === 403, 'Merchant cannot approve itself (403)', merchantDenied.data);

  const queue = await call('GET', '/admin/merchants?status=PENDING', { token: adminToken });
  check(queue.data?.merchants?.some((m: any) => m.id === merchantA), 'Merchant A appears in the PENDING approval queue');

  const approve = await call('PATCH', `/admin/${merchantA}/approval`, { token: adminToken, body: { status: 'APPROVED' } });
  check(approve.status === 200 && approve.data?.merchant?.status === 'APPROVED', 'Dispatcher approves merchant A', approve.data);

  const profileA = await call('GET', '/profile', { token: tokenA });
  check(profileA.data?.merchant?.status === 'APPROVED', 'Portal profile now shows APPROVED', profileA.data);

  const loginA = await call('POST', '/login', { body: { email: createdEmails[0], password: 'Merch4ntPass' } });
  check(loginA.status === 200 && loginA.data?.user?.approvalStatus === 'APPROVED', 'Merchant signs in with email + password', loginA.data);

  const demoLogin = await call('POST', '/login', { body: { email: 'merchant@swiftdrop.com', password: 'Merchant@123' } });
  check(demoLogin.status === 200, 'Seeded demo merchant can sign in', demoLogin.data);

  // ===========================================================================
  section('2. Valid API order');
  // ===========================================================================
  const keyA = await call('POST', '/api-keys/generate', { token: tokenA, body: { name: 'Shopify' } });
  check(keyA.status === 201 && keyA.data?.apiKey?.startsWith('sw_live_'), 'Approved merchant generates an API key', keyA.data);
  const apiKeyA = keyA.data.apiKey;

  const keyList = await call('GET', '/api-keys', { token: tokenA });
  check(
    keyList.data?.apiKeys?.length === 1 && !JSON.stringify(keyList.data).includes(apiKeyA),
    'Key list shows the key prefix only, never the full secret'
  );

  const created = await call('POST', '/partner/orders', {
    apiKey: apiKeyA,
    body: { ...orderBody('Nimal'), totalFee: 1, merchantId: '55555555-5555-5555-5555-555555555555' },
  });
  check(created.status === 201 && created.data?.trackingNumber?.startsWith('SWIFT-'), 'Valid API key creates an order (201)', created.data);
  // Cheapest seeded zone: 350 base + 2kg × 50 + 5km × 20 = 550
  check(created.data?.totalFee === 550, 'Fee is calculated on the server (client totalFee ignored)', created.data);
  const orderA = created.data.orderId;

  const fetched = await call('GET', `/partner/orders/${created.data.trackingNumber}`, { apiKey: apiKeyA });
  check(fetched.data?.order?.merchantId === merchantA, 'Order belongs to the key owner, not the merchantId sent in the body', fetched.data);
  check(fetched.data?.order?.history?.[0]?.status === 'CONFIRMED', 'Order has its first tracking event');

  const bearer = await fetch(`${BASE}/partner/orders`, { headers: { Authorization: `Bearer ${apiKeyA}` } });
  check(bearer.status === 200, 'API key is also accepted as "Authorization: Bearer"');

  const invalidBody = await call('POST', '/partner/orders', { apiKey: apiKeyA, body: { recipientName: 'X' } });
  check(invalidBody.status === 400, 'Invalid order payload is rejected (400)', invalidBody.data);

  const portalOrders = await call('GET', '/orders', { token: tokenA });
  check(portalOrders.data?.orders?.some((o: any) => o.id === orderA) && portalOrders.data?.stats?.pending >= 1, 'Order dashboard lists the order with stats');

  // ===========================================================================
  section('3. Invalid credentials');
  // ===========================================================================
  const noKey = await call('GET', '/partner/orders');
  check(noKey.status === 401, 'Missing API key → 401', noKey.data);

  const malformed = await call('GET', '/partner/orders', { apiKey: 'not-a-key' });
  check(malformed.status === 401, 'Malformed API key → 401', malformed.data);

  const unknown = await call('GET', '/partner/orders', { apiKey: 'sw_live_' + '0'.repeat(48) });
  check(unknown.status === 401, 'Unknown API key → 401', unknown.data);

  const jwtAsKey = await call('POST', '/partner/orders', { token: tokenA, body: orderBody('X') });
  check(jwtAsKey.status === 401, 'Portal JWT cannot be used on the partner API → 401', jwtAsKey.data);

  const badPassword = await call('POST', '/login', { body: { email: createdEmails[0], password: 'WrongPass1' } });
  check(badPassword.status === 401, 'Wrong password → 401', badPassword.data);

  const nonMerchant = await call('POST', '/login', { body: { email: 'customer@swiftdrop.com', password: 'Customer@123' } });
  check(nonMerchant.status === 401, 'Non-merchant account cannot use merchant sign-in → 401', nonMerchant.data);

  const forged = jwt.sign({ id: regA.data.user.id, role: 'MERCHANT' }, 'not-the-server-secret');
  const forgedRes = await call('GET', '/orders', { token: forged });
  check(forgedRes.status === 403, 'Forged portal token → 403', forgedRes.data);

  const revokeTarget = await call('POST', '/api-keys/generate', { token: tokenA, body: { name: 'to-revoke' } });
  await call('DELETE', `/api-keys/${revokeTarget.data.key.id}`, { token: tokenA });
  const revoked = await call('GET', '/partner/orders', { apiKey: revokeTarget.data.apiKey });
  check(revoked.status === 401, 'Revoked API key → 401', revoked.data);

  // Suspending a merchant blocks its existing keys.
  await call('PATCH', `/admin/${merchantA}/approval`, { token: adminToken, body: { status: 'REJECTED' } });
  const suspended = await call('GET', '/partner/orders', { apiKey: apiKeyA });
  check(suspended.status === 403, 'Key of a REJECTED merchant → 403', suspended.data);
  await call('PATCH', `/admin/${merchantA}/approval`, { token: adminToken, body: { status: 'APPROVED' } });

  // ===========================================================================
  section('4. Cross-merchant data isolation');
  // ===========================================================================
  const regB = await registerMerchant('b');
  const tokenB = regB.data.accessToken;
  await call('PATCH', `/admin/${regB.data.merchant.id}/approval`, { token: adminToken, body: { status: 'APPROVED' } });
  const keyB = (await call('POST', '/api-keys/generate', { token: tokenB, body: { name: 'B' } })).data.apiKey;
  const orderB = (await call('POST', '/partner/orders', { apiKey: keyB, body: orderBody('Sunil') })).data;

  const listB = await call('GET', '/partner/orders', { apiKey: keyB });
  check(
    listB.data?.orders?.length === 1 && listB.data.orders[0].id === orderB.orderId,
    'Merchant B lists only its own order via API',
    listB.data
  );

  const bReadsA = await call('GET', `/partner/orders/${orderA}`, { apiKey: keyB });
  check(bReadsA.status === 404, "Merchant B cannot read merchant A's order by id via API (404)", bReadsA.data);

  const bReadsATracking = await call('GET', `/partner/orders/${created.data.trackingNumber}`, { apiKey: keyB });
  check(bReadsATracking.status === 404, "Merchant B cannot read merchant A's order by tracking number (404)");

  const bPortalA = await call('GET', `/orders/${orderA}`, { token: tokenB });
  check(bPortalA.status === 404, "Merchant B cannot open merchant A's order in the portal (404)");

  const bSearchA = await call('GET', `/orders?search=Nimal`, { token: tokenB });
  check(bSearchA.data?.total === 0, "Searching for merchant A's recipient returns nothing for merchant B");

  const bRevokesA = await call('DELETE', `/api-keys/${keyA.data.key.id}`, { token: tokenB });
  check(bRevokesA.status === 404, "Merchant B cannot revoke merchant A's API key (404)");
  const aStillWorks = await call('GET', '/partner/orders', { apiKey: apiKeyA });
  check(aStillWorks.status === 200, "Merchant A's key still works afterwards");

  const listA = await call('GET', '/partner/orders', { apiKey: apiKeyA });
  check(listA.data?.orders?.every((o: any) => o.merchantId === merchantA), 'Every order merchant A sees is its own');

  // ===========================================================================
  section('5. Per-merchant rate limit');
  // ===========================================================================
  // Merchant B used 3 partner requests above; exhaust the rest of its window.
  let lastStatus = 0;
  let remainingHeader: string | null = null;
  for (let i = 0; i < RATE_LIMIT; i++) {
    const r = await call('GET', '/partner/orders', { apiKey: keyB });
    lastStatus = r.status;
    remainingHeader ??= r.headers.get('ratelimit-remaining') ?? r.headers.get('ratelimit');
  }
  check(remainingHeader !== null, 'Rate-limit headers are returned');
  check(lastStatus === 429, `Merchant B is throttled after ${RATE_LIMIT} requests/minute (429)`, lastStatus);

  const aUnaffected = await call('GET', '/partner/orders', { apiKey: apiKeyA });
  check(aUnaffected.status === 200, "Merchant A is not affected by merchant B's limit (keyed per merchant)", aUnaffected.status);
} finally {
  // ---------------------------------------------------------------------------
  // Cleanup: remove everything this run created
  // ---------------------------------------------------------------------------
  await db.query(
    `DELETE FROM parcels WHERE merchant_id IN (
       SELECT m.id FROM merchants m JOIN users u ON u.id = m.user_id WHERE u.email = ANY($1::text[]))`,
    [createdEmails]
  );
  await db.query(`DELETE FROM users WHERE email = ANY($1::text[])`, [createdEmails]);
  server.close();
  await db.end();

  console.log('\n============================================================');
  console.log(failed === 0 ? `🎉 ALL ${passed} / ${passed} ASSERTIONS PASSED` : `❌ ${failed} FAILED, ${passed} passed`);
  console.log('============================================================');
  process.exitCode = failed === 0 ? 0 : 1;
}
