import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

// Member 3: exercise the real tracking client module (src/lib/tracking.ts) with
// its HTTP and auth boundaries replaced, following auth-session.test.mjs.
const source = ts.transpileModule(readFileSync(new URL('../src/lib/tracking.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function load({ fetch = async () => ({ ok: true, json: async () => ({}) }), fetchApi = async () => ({}) } = {}) {
  const exports = {};
  const requests = [];
  const recordingFetch = async (url, options) => { requests.push({ url, options }); return fetch(url, options); };
  vm.runInNewContext(source, {
    exports,
    require: (name) => (name === './api' ? { fetchApi } : { getAccessToken: async () => null, refreshAccessToken: async () => null }),
    fetch: recordingFetch, URLSearchParams, encodeURIComponent, decodeURIComponent,
  });
  return { lib: exports, requests };
}

const json = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

test('tracking numbers are normalised and validated like the server does', () => {
  const { lib } = load();
  assert.equal(lib.normaliseTrackingNumber('  swift-ab12cd34 '), 'SWIFT-AB12CD34');
  assert.equal(lib.isValidTrackingNumber('swift-ab12cd34'), true);
  for (const bad of ['', 'abc', 'SWIFT-12', 'SWIFT-' + 'A'.repeat(13), "SWIFT-1' OR '1'='1"]) {
    assert.equal(lib.isValidTrackingNumber(bad), false, bad);
  }
});

test('malformed URL escapes in route params do not throw', () => {
  const { lib } = load();
  assert.equal(lib.decodeRouteParam('SWIFT-AB12CD34'), 'SWIFT-AB12CD34');
  assert.equal(lib.decodeRouteParam('swift%2Dab12cd34'), 'swift-ab12cd34');
  assert.equal(lib.decodeRouteParam('SWIFT-%E0%A4'), 'SWIFT-%E0%A4');
  assert.equal(lib.decodeRouteParam(undefined), '');
});

test('public lookup sends no credentials and normalises the tracking number', async () => {
  const body = { trackingNumber: 'SWIFT-AB12CD34', status: 'IN_TRANSIT', events: [] };
  const { lib, requests } = load({ fetch: async () => json(200, body) });
  const result = await lib.fetchPublicTracking(' swift-ab12cd34 ');
  assert.equal(result.status, 'IN_TRANSIT');
  assert.equal(requests[0].url, '/api/v1/tracking/public/SWIFT-AB12CD34');
  assert.equal(requests[0].options.headers, undefined, 'no Authorization header on the public endpoint');
  assert.equal(requests[0].options.cache, 'no-store');
});

test('public lookup errors keep the HTTP status for the page to explain', async () => {
  const { lib } = load({ fetch: async () => json(404, { error: 'No parcel found for tracking number SWIFT-NOPE0000.' }) });
  await assert.rejects(lib.fetchPublicTracking('SWIFT-NOPE0000'), (error) => {
    assert.ok(error instanceof lib.TrackingRequestError);
    assert.equal(error.status, 404);
    assert.match(error.message, /No parcel found/);
    return true;
  });
  const { lib: limited } = load({ fetch: async () => json(429, {}) });
  await assert.rejects(limited.fetchPublicTracking('SWIFT-AB12CD34'), (error) => error.status === 429);
});

test('live-tracking config is cached after success but retried after a failure', async () => {
  let calls = 0;
  let healthy = false;
  const { lib } = load({ fetch: async () => { calls++; return healthy ? json(200, { websocketUrl: 'ws://api/ws/tracking', pollIntervalMs: 20000 }) : json(503, {}); } });

  assert.deepEqual({ ...(await lib.fetchTrackingConfig()) }, { websocketUrl: null, pollIntervalMs: 20000 }, 'falls back to polling');
  healthy = true;
  assert.equal((await lib.fetchTrackingConfig()).websocketUrl, 'ws://api/ws/tracking', 'a failed lookup is not cached');
  assert.equal((await lib.fetchTrackingConfig()).websocketUrl, 'ws://api/ws/tracking');
  assert.equal(calls, 2, 'a successful lookup is cached');

  const { lib: offline } = load({ fetch: async () => { throw new TypeError('Failed to fetch'); } });
  assert.equal((await offline.fetchTrackingConfig()).websocketUrl, null, 'network errors fall back to polling');
});

test('history requests pass only the filters that are set', async () => {
  const calls = [];
  const { lib } = load({ fetchApi: async (endpoint) => { calls.push(endpoint); return { parcels: [], total: 0, limit: 10, offset: 0 }; } });
  await lib.fetchHistory();
  await lib.fetchHistory({ status: 'DELIVERED', limit: 10, offset: 20 });
  assert.deepEqual(calls, ['/tracking/history', '/tracking/history?status=DELIVERED&limit=10&offset=20']);
});

test('money and dates render a dash for missing values', () => {
  const { lib } = load();
  assert.equal(lib.formatMoney(523.75, 'LKR'), 'LKR 523.75');
  assert.equal(lib.formatMoney(1500, 'LKR'), 'LKR 1,500.00');
  assert.equal(lib.formatMoney(null), '—');
  assert.equal(lib.formatDateTime(null), '—');
  assert.equal(lib.formatDateTime('not a date'), '—');
  assert.match(lib.formatDateTime('2026-11-16T12:04:16.304Z'), /16 Nov 2026/);
});
