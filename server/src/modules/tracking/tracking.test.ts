/**
 * Member 3 — Tracking, History & Receipt: automated test suite
 *
 * Evidence covered (per the member responsibility plan):
 *   1. Status timeline: events returned in lifecycle order, ties broken deterministically
 *   2. Unknown / malformed tracking numbers: 404 / 400, injection-shaped input rejected
 *   3. Privacy (public): only allow-listed keys, no PII keys OR values anywhere
 *   4. Privacy (private): 401 without token, 403 for non-customers, another
 *      customer's parcel is 404 for history detail AND receipt
 *   5. Receipt generation: totals, delivery date rules, printable HTML escapes input
 *   6. Public rate limiting
 *   7. Public location filter and the SQL bridge parameter-substitution fix
 *
 * Runs the real tracking router in-process (express + listen(0)) against the real
 * database. Authentication uses a stub gateway via createAuthenticationMiddleware,
 * so no Supabase login is needed; ownership is still enforced by real SQL.
 * Every row this suite creates uses per-run IDs and `@example.invalid` emails. Rows
 * are removed in `finally`, and leftovers from an interrupted earlier run are swept
 * at start-up, so the shared database is left clean.
 *
 * Run: npm run test:tracking
 */
import express from 'express';
import { once } from 'node:events';
import { randomUUID, randomBytes } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { db } from '../../config/database.js';
import { createAuthenticationMiddleware } from '../../middleware/auth.js';
import { AuthServiceError, type AuthProfile } from '../auth/auth.service.js';
import { createTrackingRouter, createPublicTrackingLimiter } from './tracking.routes.js';
import { publicLocation } from './tracking.service.js';

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, testName: string, details?: unknown) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details ?? '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

// ---------------------------------------------------------------------------
// Per-run fixtures
// ---------------------------------------------------------------------------
const run = randomBytes(3).toString('hex').toUpperCase(); // 6 hex chars
const tn = (prefix: string) => `SWIFT-T${prefix}${run}`; // e.g. SWIFT-TAA1B2C3D
const TEST_EMAIL_PATTERN = 'tracking-%@example.invalid';

const customerA: AuthProfile = {
  id: randomUUID(), authUserId: randomUUID(), email: `tracking-a-${run.toLowerCase()}@example.invalid`,
  fullName: 'Tracking Test A', phone: null, role: 'CUSTOMER',
};
const customerB: AuthProfile = {
  id: randomUUID(), authUserId: randomUUID(), email: `tracking-b-${run.toLowerCase()}@example.invalid`,
  fullName: 'Tracking Test B', phone: null, role: 'CUSTOMER',
};
const courier: AuthProfile = {
  id: randomUUID(), authUserId: randomUUID(), email: `tracking-c-${run.toLowerCase()}@example.invalid`,
  fullName: 'Tracking Test Courier', phone: null, role: 'COURIER',
};
const TOKENS: Record<string, AuthProfile> = { 'token-a': customerA, 'token-b': customerB, 'token-courier': courier };

const parcelA = {
  id: randomUUID(), trackingNumber: tn('AA'),
  senderName: 'Sender Secretname', senderPhone: '+94770001111', pickup: '9 Hidden Lane, Dehiwala',
  recipientName: 'Recipient <b>Bold</b> & Co', recipientPhone: '+94770002222', delivery: '42 Private Road, Nugegoda',
  fee: 523.75, weight: 1.25,
};
// A second parcel for customer A that is still awaiting payment: no receipt yet.
const parcelPending = {
  id: randomUUID(), trackingNumber: tn('PP'),
  senderName: 'Sender Secretname', senderPhone: '+94770001111', pickup: '9 Hidden Lane, Dehiwala',
  recipientName: 'Pending Recipient', recipientPhone: '+94770005555', delivery: '3 Pending Way, Dehiwala',
  fee: 410, weight: 0.9,
};
const parcelB = {
  id: randomUUID(), trackingNumber: tn('BB'),
  senderName: 'Other Sender', senderPhone: '+94770003333', pickup: '1 Other St, Galle',
  recipientName: 'Other Recipient', recipientPhone: '+94770004444', delivery: '2 Other Ave, Galle',
  fee: 300, weight: 0.5,
};

const base = Date.now() - 48 * 3600_000;
const at = (hours: number) => new Date(base + hours * 3600_000).toISOString();
// PICKED_UP and IN_TRANSIT share a timestamp on purpose: the enum tie-break must
// still put PICKED_UP first. The IN_TRANSIT location carries a phone number and
// must be dropped from the public view.
const eventsA = [
  { status: 'CONFIRMED', location: 'Dehiwala', note: 'Booked by Sender Secretname', at: at(0) },
  { status: 'IN_TRANSIT', location: 'Call +94770009999 at hub', note: 'Sorted', at: at(5) },
  { status: 'PICKED_UP', location: 'Dehiwala', note: 'Collected', at: at(5) },
  { status: 'OUT_FOR_DELIVERY', location: 'Nugegoda', note: 'With courier', at: at(20) },
  { status: 'DELIVERED', location: 'Nugegoda', note: 'Handed to recipient', at: at(22) },
];

async function insertFixtures() {
  for (const u of [customerA, customerB]) {
    await db.query(
      `INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, 'CUSTOMER')`,
      [u.id, u.email, u.fullName]
    );
  }
  for (const [p, owner, status] of [
    [parcelA, customerA, 'DELIVERED'],
    [parcelPending, customerA, 'PENDING_PAYMENT'],
    [parcelB, customerB, 'IN_TRANSIT'],
  ] as const) {
    await db.query(
      `INSERT INTO parcels (id, tracking_number, customer_id, sender_name, sender_phone, pickup_address,
         recipient_name, recipient_phone, delivery_address, weight_kg, dimension_length_cm,
         dimension_width_cm, dimension_height_cm, total_fee, status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::parcel_status,$16)`,
      [p.id, p.trackingNumber, owner.id, p.senderName, p.senderPhone, p.pickup, p.recipientName,
        p.recipientPhone, p.delivery, p.weight, 20, 15, 10, p.fee, status, at(0)]
    );
  }
  for (const e of eventsA) {
    await db.query(
      `INSERT INTO parcel_status_history (parcel_id, status, location_name, note, latitude, longitude, created_at)
       VALUES ($1, $2::parcel_status, $3, $4, 6.8649, 79.8997, $5)`,
      [parcelA.id, e.status, e.location, e.note, e.at]
    );
  }
  await db.query(
    `INSERT INTO parcel_status_history (parcel_id, status, location_name, created_at)
     VALUES ($1, 'CONFIRMED', 'Galle', $2)`,
    [parcelB.id, at(1)]
  );
}

/** Removes every row this suite (or an interrupted earlier run) created. */
async function removeFixtures() {
  // parcel_status_history rows cascade with their parcel; parcels go before users (FK).
  await db.query(
    `DELETE FROM parcels WHERE customer_id IN (SELECT id FROM users WHERE email LIKE $1)`,
    [TEST_EMAIL_PATTERN]
  );
  await db.query(`DELETE FROM users WHERE email LIKE $1`, [TEST_EMAIL_PATTERN]);
}

async function countLeftovers(): Promise<number> {
  const r = await db.query(
    `SELECT (SELECT count(*) FROM users WHERE email LIKE $1)
          + (SELECT count(*) FROM parcels WHERE customer_id IN (SELECT id FROM users WHERE email LIKE $1)) AS n`,
    [TEST_EMAIL_PATTERN]
  );
  return Number(r.rows[0].n);
}

// ---------------------------------------------------------------------------
// In-process HTTP harness
// ---------------------------------------------------------------------------
const servers: Server[] = [];

async function startApp(publicLimiterMax?: number) {
  const auth = createAuthenticationMiddleware({
    async authenticate(token: string) {
      const profile = TOKENS[token];
      if (!profile) throw new AuthServiceError(401, 'INVALID_TOKEN', 'Invalid or expired session.');
      return profile;
    },
  });
  const app = express();
  app.use('/api/v1/tracking', createTrackingRouter({
    auth,
    publicLimiter: publicLimiterMax
      ? createPublicTrackingLimiter(publicLimiterMax)
      : (_req, _res, next) => next(),
  }));
  const server = app.listen(0, '127.0.0.1');
  servers.push(server);
  await once(server, 'listening');
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1/tracking`;

  return async (path: string, token?: string) => {
    const response = await fetch(url + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const text = await response.text();
    let body: any = text;
    try { body = JSON.parse(text); } catch { /* HTML receipt */ }
    return { status: response.status, body, text, headers: response.headers };
  };
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, keys));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) { keys.add(k); collectKeys(v, keys); }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
export async function runTrackingTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MEMBER 3: TRACKING, HISTORY & RECEIPT TEST SUITE');
  console.log(`   Database: ${process.env.DATABASE_DRIVER === 'supabase'
    ? `Supabase SQL bridge (${new URL(process.env.SUPABASE_URL || 'http://unknown').host})`
    : `PostgreSQL (${(() => { try { return new URL(process.env.DATABASE_URL || '').host; } catch { return 'unknown'; } })()})`}`);
  console.log('============================================================\n');

  let cleanupOk = false;
  try {
    const swept = await countLeftovers();
    if (swept > 0) console.log(`🧹 Removing ${swept} leftover row(s) from an interrupted earlier run`);
    await removeFixtures();
    await insertFixtures();
    const request = await startApp();

    console.log('--- 1. Public status timeline ---');
    {
      const r = await request(`/public/${parcelA.trackingNumber}`);
      assert(r.status === 200, 'Public tracking returns 200 for a known tracking number', r.body);
      assert(r.body.status === 'DELIVERED' && r.body.isFinal === true, 'Current status is DELIVERED and marked final');
      const order = r.body.events.map((e: any) => e.status).join('>');
      assert(order === 'CONFIRMED>PICKED_UP>IN_TRANSIT>OUT_FOR_DELIVERY>DELIVERED',
        'Timeline is in lifecycle order (same-timestamp tie broken by status)', order);
      const times = r.body.events.map((e: any) => Date.parse(e.timestamp));
      assert(times.every((t: number, i: number) => i === 0 || t >= times[i - 1]), 'Event timestamps are non-decreasing');
      assert(r.body.events.every((e: any) => typeof e.label === 'string' && e.label.length > 0), 'Every event has a human-readable label');
      assert(r.body.lastUpdatedAt === eventsA[4].at, 'lastUpdatedAt equals the latest event time', r.body.lastUpdatedAt);
      assert(r.headers.get('cache-control') === 'no-store', 'Public tracking responses are not cached');
      const lower = await request(`/public/${parcelA.trackingNumber.toLowerCase()}`);
      assert(lower.status === 200 && lower.body.trackingNumber === parcelA.trackingNumber, 'Lower-case input is normalised');
    }

    console.log('\n--- 2. Unknown and malformed tracking numbers ---');
    {
      const unknown = await request(`/public/SWIFT-ZZ${run}Z9`);
      assert(unknown.status === 404, 'Unknown tracking number returns 404', unknown.body);
      assert(typeof unknown.body.error === 'string' && !('events' in unknown.body), '404 body is an error message, not tracking data');
      for (const bad of ['abc', 'SWIFT-12', 'SWIFT-' + 'A'.repeat(20), "SWIFT-1' OR '1'='1", 'SWIFT-$1$2AB']) {
        const r = await request(`/public/${encodeURIComponent(bad)}`);
        assert(r.status === 400, `Malformed tracking number rejected with 400: ${JSON.stringify(bad)}`, r.body);
      }
    }

    console.log('\n--- 3. Public privacy: safe fields only ---');
    {
      const r = await request(`/public/${parcelA.trackingNumber}`);
      const topKeys = Object.keys(r.body).sort().join(',');
      assert(topKeys === 'bookedAt,events,isFinal,lastUpdatedAt,status,statusLabel,trackingNumber',
        'Top-level keys match the public allow-list exactly', topKeys);
      const eventKeys = [...new Set(r.body.events.flatMap((e: any) => Object.keys(e)))].sort().join(',');
      assert(eventKeys === 'label,location,status,timestamp', 'Event keys match the public allow-list exactly', eventKeys);
      const forbiddenKeys = ['id', 'parcel_id', 'customer_id', 'merchant_id', 'courier_id', 'courierId', 'note', 'notes',
        'sender_phone', 'recipient_phone', 'senderPhone', 'recipientPhone', 'pickup_address', 'delivery_address',
        'total_fee', 'totalFee', 'latitude', 'longitude', 'recipientName', 'sender', 'recipient'];
      const keys = collectKeys(r.body);
      const leakedKeys = forbiddenKeys.filter((k) => keys.has(k));
      assert(leakedKeys.length === 0, 'No forbidden keys anywhere in the public response', leakedKeys);
      const forbiddenValues = [parcelA.id, customerA.id, parcelA.senderName, parcelA.senderPhone, parcelA.pickup,
        'Recipient', parcelA.recipientPhone, parcelA.delivery, '523.75', '+94770009999', 'Secretname', '6.8649', '79.8997'];
      const leakedValues = forbiddenValues.filter((v) => r.text.includes(v));
      assert(leakedValues.length === 0, 'No PII values (names, phones, addresses, fee, IDs, GPS, notes) in the public response', leakedValues);
      const transit = r.body.events.find((e: any) => e.status === 'IN_TRANSIT');
      assert(transit.location === null, 'A location label containing a phone number is dropped from the public view');
    }

    console.log('\n--- 4. Private history: authentication and ownership ---');
    {
      const noToken = await request('/history');
      assert(noToken.status === 401, 'History without a token returns 401');
      const badToken = await request('/history', 'forged-token');
      assert(badToken.status === 401, 'History with an invalid token returns 401');
      const asCourier = await request('/history', 'token-courier');
      assert(asCourier.status === 403, 'A non-customer role is forbidden (403)');

      const listA = await request('/history', 'token-a');
      const numbersA: string[] = listA.body.parcels?.map((p: any) => p.trackingNumber) ?? [];
      assert(listA.status === 200 && listA.body.total === 2
        && [parcelA.trackingNumber, parcelPending.trackingNumber].every((n) => numbersA.includes(n)),
        "Customer A's history lists exactly A's two parcels", listA.body);
      assert(!numbersA.includes(parcelB.trackingNumber), "Customer A's history never includes B's parcel");
      assert(listA.body.parcels.every((p: any) => typeof p.totalFee === 'number'), 'Fees are returned as numbers (normalised from the DB driver)');

      const listB = await request('/history', 'token-b');
      assert(listB.body.total === 1 && listB.body.parcels[0].trackingNumber === parcelB.trackingNumber,
        "Customer B's history lists only B's parcel");

      const delivered = await request('/history?status=delivered', 'token-a');
      assert(delivered.status === 200 && delivered.body.total === 1 && delivered.body.parcels[0].trackingNumber === parcelA.trackingNumber,
        'Status filter returns the matching parcel (A + DELIVERED = 1)', delivered.body);
      const filtered = await request('/history?status=in_transit', 'token-a');
      assert(filtered.status === 200 && filtered.body.total === 0, 'Status filter excludes non-matching parcels (A + IN_TRANSIT = 0)');
      const page = await request('/history?limit=1&offset=1', 'token-a');
      assert(page.status === 200 && page.body.parcels.length === 1 && page.body.total === 2, 'Paging returns one row per page with the full total');
      assert((await request('/history?status=LOST', 'token-a')).status === 400, 'Unknown status filter returns 400');
      assert((await request('/history?limit=0', 'token-a')).status === 400, 'Out-of-range limit returns 400');

      const detail = await request(`/history/${parcelA.trackingNumber}`, 'token-a');
      assert(detail.status === 200 && detail.body.parcel.events.length === 5, 'Owner can open full parcel detail with all 5 events');
      assert(detail.body.parcel.events[0].note === eventsA[0].note, 'Owner sees event notes');
      assert(!collectKeys(detail.body).has('courier_id') && !collectKeys(detail.body).has('latitude'),
        'Owner detail still hides courier IDs and GPS coordinates');

      const crossDetail = await request(`/history/${parcelB.trackingNumber}`, 'token-a');
      const missingDetail = await request(`/history/SWIFT-ZZ${run}Z9`, 'token-a');
      const shape = (r: { status: number; body: any }, n: string) =>
        `${r.status}|${Object.keys(r.body).sort().join(',')}|${String(r.body.error).replace(n, '<TN>')}`;
      assert(crossDetail.status === 404, "Customer A opening B's parcel gets 404 (not 403)", crossDetail.body);
      assert(shape(crossDetail, parcelB.trackingNumber) === shape(missingDetail, `SWIFT-ZZ${run}Z9`),
        "Someone else's parcel is indistinguishable from a nonexistent one, so ownership cannot be probed",
        [crossDetail.body, missingDetail.body]);
      assert((await request('/history/not-a-number', 'token-a')).status === 400, 'Malformed tracking number in private history returns 400');
      assert(crossDetail.headers.get('cache-control') === 'private, no-store', 'Private history responses are never cached');
      assert(!crossDetail.text.includes(parcelB.recipientName), "The 404 leaks nothing about B's parcel");
      const crossReceipt = await request(`/history/${parcelB.trackingNumber}/receipt`, 'token-a');
      assert(crossReceipt.status === 404, "Customer A cannot download B's receipt (404)");
      const crossHtml = await request(`/history/${parcelB.trackingNumber}/receipt?format=html`, 'token-a');
      assert(crossHtml.status === 404, "Customer A cannot download B's HTML receipt either (404)");
    }

    console.log('\n--- 5. Receipt generation ---');
    {
      const r = await request(`/history/${parcelA.trackingNumber}/receipt`, 'token-a');
      assert(r.status === 200, 'Owner receives a JSON receipt', r.body);
      const receipt = r.body.receipt;
      assert(receipt.total === parcelA.fee, 'Receipt total equals the fee stored for the parcel (523.75)', receipt.total);
      const itemsSum = receipt.lineItems.reduce((sum: number, i: any) => sum + i.amount, 0);
      assert(Math.abs(itemsSum - receipt.total) < 0.001, 'Line items add up to the total');
      assert(receipt.receiptNumber === `RCPT-TAA${run}`, 'Receipt number is derived from the tracking number', receipt.receiptNumber);
      assert(receipt.deliveredAt === eventsA[4].at, 'deliveredAt comes from the DELIVERED history event');
      assert(receipt.currency === 'LKR' && receipt.recipient.name === parcelA.recipientName, 'Receipt carries currency and owner-visible party details');
      assert(r.headers.get('cache-control') === 'private, no-store', 'Receipts are marked private and not cached');

      const html = await request(`/history/${parcelA.trackingNumber}/receipt?format=html`, 'token-a');
      assert(html.status === 200 && (html.headers.get('content-type') ?? '').startsWith('text/html'), 'HTML receipt is served as text/html');
      assert((html.headers.get('content-disposition') ?? '').includes(`swiftdrop-receipt-${parcelA.trackingNumber}.html`), 'HTML receipt downloads as an attachment');
      assert(html.text.includes(receipt.receiptNumber) && html.text.includes('LKR 523.75'), 'HTML receipt shows the receipt number and total');
      assert(!html.text.includes('<b>Bold</b>') && html.text.includes('&lt;b&gt;Bold&lt;/b&gt; &amp; Co'), 'User-entered text is HTML-escaped in the receipt');
      assert((await request(`/history/${parcelA.trackingNumber}/receipt?format=pdf`, 'token-a')).status === 400, 'Unsupported receipt format returns 400');
      const receiptB = await request(`/history/${parcelB.trackingNumber}/receipt`, 'token-b');
      assert(receiptB.status === 200 && receiptB.body.receipt.deliveredAt === null,
        'A parcel that is not delivered gets a receipt with no delivery date');
      const pending = await request(`/history/${parcelPending.trackingNumber}/receipt`, 'token-a');
      assert(pending.status === 409, 'No receipt while payment is still pending (409)', pending.body);
    }

    console.log('\n--- 6. Public rate limiting ---');
    {
      const limited = await startApp(3);
      const statuses: number[] = [];
      for (let i = 0; i < 4; i++) statuses.push((await limited(`/public/${parcelA.trackingNumber}`)).status);
      assert(statuses.join(',') === '200,200,200,429', 'The 4th lookup within the window is rejected with 429', statuses);
    }

    console.log('\n--- 7. Public location filter and SQL bridge regression ---');
    {
      assert(publicLocation('Colombo Central Sorting Hub') === 'Colombo Central Sorting Hub', 'A normal hub name is shown publicly');
      assert(publicLocation('Colombo 03') === 'Colombo 03', 'A place name with a short district number is kept');
      for (const leaky of ['Call 077.123.4567', 'ring 077 123 4567', 'Ask +94 77 123 4567', 'mail courier@example.com']) {
        assert(publicLocation(leaky) === null, `Location with contact details is hidden: ${JSON.stringify(leaky)}`);
      }
      const long = publicLocation('A'.repeat(80));
      assert(long !== null && long.length === 60 && long.endsWith('…'), 'Long location labels are cut to 60 characters');
      assert(publicLocation('   ') === null && publicLocation(null) === null, 'Blank or missing locations become null');

      // The bridge used to re-scan substituted values, so "$1" inside the value bound
      // to $2 was replaced again and a quote in $1 could break out of its literal.
      const echo = await db.query('SELECT $1::text AS a, $2::text AS b', ["x' OR '1'='1", '$1']);
      assert(echo.rows[0].a === "x' OR '1'='1" && echo.rows[0].b === '$1',
        'Bound values come back verbatim; a value containing "$1" is never re-substituted', echo.rows[0]);
      // The bridge used to decide "returns rows?" after substitution, so a value
      // containing "returning" broke plain writes (42P11).
      const write = await db.query(`UPDATE users SET full_name = $1 WHERE id = $2`, ['Returning Customer', customerB.id]);
      assert(write.rowCount === 1, 'A plain UPDATE whose value contains "returning" succeeds', write.rowCount);
    }
  } finally {
    await Promise.all(servers.map((s) => new Promise((resolve) => s.close(resolve))));
    try {
      await removeFixtures();
      const left = await countLeftovers();
      cleanupOk = left === 0;
      console.log(`\n🧹 Cleanup: ${cleanupOk ? 'all test rows removed' : `WARNING, ${left} test row(s) remain`}`);
    } catch (error) {
      console.warn('\n⚠️ Cleanup failed:', error instanceof Error ? error.message : error);
    }
  }
  if (!cleanupOk) throw new Error('Test rows were left in the database; see the cleanup message above');

  console.log('\n============================================================');
  console.log(`🎉 TEST SUMMARY: ${passedAssertions}/${totalAssertions} assertions passed`);
  console.log('============================================================\n');
}

// Auto-run only when executed directly (npm run test:tracking), not on import.
if (process.argv[1] && process.argv[1].endsWith('tracking.test.ts')) {
  runTrackingTestSuite()
    .then(async () => { await db.end().catch(() => {}); process.exit(0); })
    .catch(async (error) => {
      console.error('\n❌ Tracking test suite failed:', error instanceof Error ? error.message : error);
      console.log(`   ${passedAssertions}/${totalAssertions} assertions passed before the failure`);
      await db.end().catch(() => {});
      process.exit(1);
    });
}
