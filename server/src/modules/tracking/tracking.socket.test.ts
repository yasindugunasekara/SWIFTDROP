/**
 * Member 3 — live tracking WebSocket: unit tests (no database, no network)
 *
 * Drives TrackingHub directly with fake subscribers and fake data loaders, so
 * every rule of the subscription protocol is checked deterministically:
 *   1. Subscribe: snapshot on success, 400 malformed, 404 unknown, 500 hidden
 *   2. Change detection: update pushed only when the parcel actually changes,
 *      to every watcher, and not lost if it lands while subscribing
 *   3. Unsubscribe / disconnect: no further pushes, watch list and timer cleaned
 *   4. Abuse limits: bad JSON, unknown types, oversized frames, 20-parcel cap,
 *      message rate limit, bursts of concurrent subscribes, connection cap
 *   5. Robustness: closed sockets are skipped, failing or hanging polls recover
 *   6. Upgrade path parsing never throws (a throw there would crash the server)
 * Plus end-to-end checks through a real ws server on an ephemeral port.
 *
 * Run: npm run test:tracking-socket
 */
import http from 'node:http';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';
import { TrackingError, type PublicTracking } from './tracking.service.js';
import {
  MAX_MESSAGE_BYTES,
  MAX_SUBSCRIPTIONS_PER_SOCKET,
  MESSAGE_BURST,
  TRACKING_SOCKET_PATH,
  TrackingHub,
  attachTrackingSocket,
  upgradePathname,
  type Subscriber,
} from './tracking.socket.js';

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
// Fakes
// ---------------------------------------------------------------------------
class FakeSocket implements Subscriber {
  readyState: number = WebSocket.OPEN;
  sent: any[] = [];
  send(data: string) { this.sent.push(JSON.parse(data)); }
  last() { return this.sent.at(-1); }
  ofType(type: string) { return this.sent.filter((m) => m.type === type); }
}

/** An in-memory "database" of parcels: status + events. */
class FakeParcels {
  parcels = new Map<string, { status: string; events: string[] }>();
  signatureCalls = 0;
  failSignatures = false;
  failSnapshot = false;

  add(trackingNumber: string, status: string, events: string[]) {
    this.parcels.set(trackingNumber, { status, events: [...events] });
  }
  advance(trackingNumber: string, status: string) {
    const p = this.parcels.get(trackingNumber)!;
    p.status = status;
    p.events.push(status);
  }
  snapshot = async (trackingNumber: string): Promise<PublicTracking> => {
    if (this.failSnapshot) throw new Error('db down');
    const p = this.parcels.get(trackingNumber);
    if (!p) throw new TrackingError(404, `No parcel found for tracking number ${trackingNumber}.`);
    return {
      trackingNumber, status: p.status, statusLabel: p.status, isFinal: p.status === 'DELIVERED',
      bookedAt: null, lastUpdatedAt: null,
      events: p.events.map((s) => ({ status: s, label: s, location: null, timestamp: null })),
    };
  };
  signatures = async (trackingNumbers: string[]) => {
    this.signatureCalls++;
    if (this.failSignatures) throw new Error('db down');
    const out = new Map<string, string>();
    for (const n of trackingNumbers) {
      const p = this.parcels.get(n);
      if (p) out.set(n, `${p.status}|${p.events.length}`);
    }
    return out;
  };
}

const quietLogger = { warn: () => {} };

async function waitFor(condition: () => boolean, ms = 2000) {
  const end = Date.now() + ms;
  while (!condition()) {
    if (Date.now() > end) return false;
    await new Promise((r) => setTimeout(r, 10));
  }
  return true;
}
const TN = 'SWIFT-LIVE0001';
const TN2 = 'SWIFT-LIVE0002';

function newHub(db: FakeParcels) {
  // pollMs 0: no timer; the tests call hub.poll() themselves.
  return new TrackingHub({ pollMs: 0, loadSnapshot: db.snapshot, loadSignatures: db.signatures, logger: quietLogger });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
export async function runTrackingSocketTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MEMBER 3: LIVE TRACKING WEBSOCKET UNIT TESTS');
  console.log('============================================================\n');

  console.log('--- 1. Subscribing ---');
  {
    const db = new FakeParcels();
    db.add(TN, 'IN_TRANSIT', ['CONFIRMED', 'PICKED_UP', 'IN_TRANSIT']);
    const hub = newHub(db);
    const a = new FakeSocket();

    await hub.handleMessage(a, JSON.stringify({ type: 'subscribe', trackingNumber: 'swift-live0001' }));
    assert(a.last()?.type === 'snapshot' && a.last().trackingNumber === TN, 'Subscribing sends a snapshot (input normalised to upper case)', a.sent);
    assert(a.last().data.events.length === 3, 'The snapshot carries the full public timeline');
    assert(hub.watchedTrackingNumbers.join() === TN && hub.subscriptionCount(a) === 1, 'The parcel is now being watched');

    await hub.handleMessage(a, JSON.stringify({ type: 'subscribe', trackingNumber: TN }));
    assert(hub.subscriptionCount(a) === 1, 'Subscribing twice to the same parcel does not double-count');

    const b = new FakeSocket();
    await hub.handleMessage(b, JSON.stringify({ type: 'subscribe', trackingNumber: "SWIFT-1' OR '1'='1" }));
    assert(b.last()?.type === 'error' && b.last().status === 400, 'A malformed tracking number is rejected with 400', b.sent);

    await hub.handleMessage(b, JSON.stringify({ type: 'subscribe', trackingNumber: 'SWIFT-NOPE0000' }));
    assert(b.last()?.status === 404 && b.last().trackingNumber === 'SWIFT-NOPE0000', 'An unknown tracking number is rejected with 404');
    assert(hub.subscriptionCount(b) === 0 && hub.watchedTrackingNumbers.length === 1, 'Failed subscriptions are not recorded');

    db.failSnapshot = true;
    await hub.handleMessage(b, JSON.stringify({ type: 'subscribe', trackingNumber: TN }));
    assert(b.last()?.status === 500 && !String(b.last().error).includes('db down'),
      'An internal failure returns a generic 500 without leaking the cause', b.last());
    assert(hub.subscriptionCount(b) === 0, 'A subscription that failed with 500 is not registered');
    hub.close();
  }

  console.log('\n--- 2. Change detection and pushes ---');
  {
    const db = new FakeParcels();
    db.add(TN, 'IN_TRANSIT', ['CONFIRMED', 'IN_TRANSIT']);
    db.add(TN2, 'CONFIRMED', ['CONFIRMED']);
    const hub = newHub(db);
    const a = new FakeSocket();
    const b = new FakeSocket();
    const c = new FakeSocket();
    await hub.subscribe(a, TN);
    await hub.subscribe(b, TN);
    await hub.subscribe(c, TN2);

    await hub.poll();
    assert(a.ofType('update').length === 0 && c.ofType('update').length === 0, 'No update is pushed while nothing has changed');

    db.advance(TN, 'OUT_FOR_DELIVERY');
    await hub.poll();
    assert(a.last()?.type === 'update' && a.last().data.status === 'OUT_FOR_DELIVERY', 'A status change is pushed as an update', a.last());
    assert(b.last()?.type === 'update' && b.last().data.status === 'OUT_FOR_DELIVERY', 'Every watcher of that parcel receives it');
    assert(c.ofType('update').length === 0, "Watchers of other parcels don't receive it");

    await hub.poll();
    assert(a.ofType('update').length === 1, 'The same change is pushed only once');

    const before = db.signatureCalls;
    await hub.poll();
    assert(db.signatureCalls === before + 1, 'One poll checks all watched parcels with a single query');

    // A change that lands while a subscriber is being set up must not be lost:
    // the baseline is taken before the snapshot, so the next poll still sees it.
    const db2 = new FakeParcels();
    db2.add(TN, 'PICKED_UP', ['CONFIRMED', 'PICKED_UP']);
    const hub2 = new TrackingHub({
      pollMs: 0, logger: quietLogger, loadSignatures: db2.signatures,
      loadSnapshot: async (n) => { const snap = await db2.snapshot(n); db2.advance(n, 'IN_TRANSIT'); return snap; },
    });
    const d = new FakeSocket();
    await hub2.subscribe(d, TN);
    await hub2.poll();
    assert(d.ofType('update').length === 1, 'A change that happens during subscription is delivered on the next poll', d.sent);
    hub2.close();

    // A later subscriber must not reset the baseline that earlier watchers rely on.
    const db3 = new FakeParcels();
    db3.add(TN, 'PICKED_UP', ['CONFIRMED', 'PICKED_UP']);
    const hub3 = new TrackingHub({ pollMs: 0, logger: quietLogger, loadSnapshot: db3.snapshot, loadSignatures: db3.signatures });
    const first = new FakeSocket();
    const second = new FakeSocket();
    await hub3.subscribe(first, TN);
    db3.advance(TN, 'IN_TRANSIT'); // change before the next poll...
    await hub3.subscribe(second, TN); // ...and someone else joins in between
    await hub3.poll();
    assert(first.ofType('update').length === 1, 'An earlier watcher still gets a change that happened before someone else subscribed', first.sent);
    assert(second.ofType('snapshot')[0]?.data.status === 'IN_TRANSIT', 'The later subscriber starts from the current state');
    hub3.close();
    hub.close();
  }

  console.log('\n--- 3. Unsubscribe and disconnect ---');
  {
    const db = new FakeParcels();
    db.add(TN, 'IN_TRANSIT', ['IN_TRANSIT']);
    db.add(TN2, 'IN_TRANSIT', ['IN_TRANSIT']);
    const hub = newHub(db);
    const a = new FakeSocket();
    const b = new FakeSocket();
    await hub.subscribe(a, TN);
    await hub.subscribe(b, TN);
    await hub.subscribe(b, TN2);

    await hub.handleMessage(a, JSON.stringify({ type: 'unsubscribe', trackingNumber: TN }));
    db.advance(TN, 'OUT_FOR_DELIVERY');
    await hub.poll();
    assert(a.ofType('update').length === 0, 'An unsubscribed client receives no more updates');
    assert(b.ofType('update').length === 1, 'Other watchers of the parcel still do');

    hub.disconnect(b);
    assert(hub.watchedTrackingNumbers.length === 0, 'Disconnecting the last watcher removes every watched parcel');
    db.advance(TN2, 'DELIVERED');
    const calls = db.signatureCalls;
    await hub.poll();
    assert(db.signatureCalls === calls, 'With nobody watching, polling does not touch the database');
    hub.close();
  }

  console.log('\n--- 4. Abuse limits ---');
  {
    const db = new FakeParcels();
    for (let i = 0; i <= MAX_SUBSCRIPTIONS_PER_SOCKET; i++) db.add(`SWIFT-CAP${String(i).padStart(4, '0')}`, 'CONFIRMED', ['CONFIRMED']);
    const hub = newHub(db);
    const a = new FakeSocket();

    await hub.handleMessage(a, 'not json');
    assert(a.last()?.status === 400, 'Invalid JSON is rejected with 400');
    for (const notObject of ['null', '[]', '"just a string"']) {
      await hub.handleMessage(a, notObject);
      assert(a.last()?.status === 400 && /small JSON objects/.test(a.last().error), `A JSON value that is not an object is rejected: ${notObject}`, a.last());
    }
    await hub.handleMessage(a, JSON.stringify({ type: 'delete-everything' }));
    assert(a.last()?.status === 400 && /Unknown message type/.test(a.last().error), 'Unknown message types are rejected');
    const valid = `SWIFT-CAP0000`;
    await hub.handleMessage(a, JSON.stringify({ type: 'subscribe', trackingNumber: valid, pad: 'x'.repeat(MAX_MESSAGE_BYTES) }));
    assert(a.last()?.status === 400 && /small JSON objects/.test(a.last().error) && hub.subscriptionCount(a) === 0,
      `A valid subscribe padded past ${MAX_MESSAGE_BYTES} bytes is still rejected`, a.last());

    for (let i = 0; i < MAX_SUBSCRIPTIONS_PER_SOCKET; i++) await hub.subscribe(a, `SWIFT-CAP${String(i).padStart(4, '0')}`);
    assert(hub.subscriptionCount(a) === MAX_SUBSCRIPTIONS_PER_SOCKET, `One connection can follow ${MAX_SUBSCRIPTIONS_PER_SOCKET} parcels`);
    await hub.subscribe(a, `SWIFT-CAP${String(MAX_SUBSCRIPTIONS_PER_SOCKET).padStart(4, '0')}`);
    assert(a.last()?.status === 429 && hub.subscriptionCount(a) === MAX_SUBSCRIPTIONS_PER_SOCKET,
      `The ${MAX_SUBSCRIPTIONS_PER_SOCKET + 1}st parcel is refused with 429`);
    await hub.subscribe(a, 'SWIFT-CAP0003');
    assert(a.last()?.type === 'snapshot' && hub.subscriptionCount(a) === MAX_SUBSCRIPTIONS_PER_SOCKET,
      'Re-subscribing to a parcel already followed still works at the cap');

    // A burst of concurrent subscribes must not slip past the cap or leak watchers.
    const burst = newHub(db);
    const flood = new FakeSocket();
    await Promise.all(Array.from({ length: 60 }, (_, i) =>
      burst.subscribe(flood, `SWIFT-CAP${String(i % (MAX_SUBSCRIPTIONS_PER_SOCKET + 1)).padStart(4, '0')}`)));
    assert(burst.subscriptionCount(flood) <= MAX_SUBSCRIPTIONS_PER_SOCKET && burst.watchedTrackingNumbers.length <= MAX_SUBSCRIPTIONS_PER_SOCKET,
      'Concurrent subscribes cannot exceed the per-connection cap', [burst.subscriptionCount(flood), burst.watchedTrackingNumbers.length]);
    burst.disconnect(flood);
    assert(burst.watchedTrackingNumbers.length === 0, 'After disconnect, nothing from the burst is still watched');

    // Unsubscribing while the subscribe is still loading cancels it.
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const slow = new TrackingHub({
      pollMs: 0, logger: quietLogger, loadSignatures: db.signatures,
      loadSnapshot: async (n) => { await gate; return db.snapshot(n); },
    });
    const quick = new FakeSocket();
    const inFlight = slow.subscribe(quick, 'SWIFT-CAP0001');
    slow.unsubscribe(quick, 'SWIFT-CAP0001');
    release();
    await inFlight;
    assert(slow.watchedTrackingNumbers.length === 0 && quick.ofType('snapshot').length === 0,
      'An unsubscribe sent while the subscribe is loading cancels it');
    slow.close();

    // Rate limit: a burst of MESSAGE_BURST, then 1 message per second.
    let clock = 1_000_000;
    const limited = new TrackingHub({ pollMs: 0, logger: quietLogger, loadSnapshot: db.snapshot, loadSignatures: db.signatures, now: () => clock });
    const chatty = new FakeSocket();
    for (let i = 0; i < MESSAGE_BURST + 2; i++) await limited.handleMessage(chatty, JSON.stringify({ type: 'subscribe', trackingNumber: 'SWIFT-CAP0002' }));
    const throttled = chatty.sent.filter((m) => m.status === 429 && /Too many messages/.test(m.error)).length;
    assert(throttled === 2, `Messages beyond a burst of ${MESSAGE_BURST} are refused with 429`, throttled);
    clock += 3000;
    await limited.handleMessage(chatty, JSON.stringify({ type: 'subscribe', trackingNumber: 'SWIFT-CAP0005' }));
    assert(chatty.last()?.type === 'snapshot' && chatty.last().trackingNumber === 'SWIFT-CAP0005',
      'The budget refills over time', chatty.last());
    limited.close();
    hub.close();
  }

  console.log('\n--- 5. Robustness ---');
  {
    const db = new FakeParcels();
    db.add(TN, 'IN_TRANSIT', ['IN_TRANSIT']);
    const hub = newHub(db);
    const a = new FakeSocket();
    const closed = new FakeSocket();
    await hub.subscribe(a, TN);
    await hub.subscribe(closed, TN);
    closed.readyState = WebSocket.CLOSED;
    const sentBefore = closed.sent.length;

    db.advance(TN, 'OUT_FOR_DELIVERY');
    await hub.poll();
    assert(closed.sent.length === sentBefore && a.ofType('update').length === 1, 'Closed sockets are skipped; open ones still get the update');

    db.failSignatures = true;
    const warnings: unknown[] = [];
    const spyHub = new TrackingHub({ pollMs: 0, loadSnapshot: db.snapshot, loadSignatures: db.signatures, logger: { warn: (...a: unknown[]) => warnings.push(a) } });
    await spyHub.subscribe(new FakeSocket(), TN).catch(() => {});
    let threw = false;
    try { await hub.poll(); await spyHub.poll(); } catch { threw = true; }
    assert(!threw && warnings.length > 0, 'A failing database poll is logged, not thrown');
    spyHub.close();
    db.failSignatures = false;
    db.advance(TN, 'DELIVERED');
    await hub.poll();
    assert(a.last()?.data?.status === 'DELIVERED', 'Polling recovers after a failure');

    const late = new FakeSocket();
    const slowHub = new TrackingHub({
      pollMs: 0, logger: quietLogger, loadSignatures: db.signatures,
      loadSnapshot: async (n) => { late.readyState = WebSocket.CLOSED; return db.snapshot(n); },
    });
    await slowHub.subscribe(late, TN);
    assert(slowHub.watchedTrackingNumbers.length === 0 && late.sent.length === 0, 'A socket that closes while subscribing is not registered');
    slowHub.close();

    // A poll that never finishes must not block every later poll.
    let hang = true;
    const stuck = new TrackingHub({
      pollMs: 0, pollTimeoutMs: 50, logger: quietLogger, loadSnapshot: db.snapshot,
      loadSignatures: (n) => (hang ? new Promise(() => {}) : db.signatures(n)),
    });
    const watcher = new FakeSocket();
    hang = false;
    await stuck.subscribe(watcher, TN);
    hang = true;
    await stuck.poll(); // times out after 50 ms
    hang = false;
    db.advance(TN, 'RETURNED');
    await stuck.poll();
    assert(watcher.last()?.data?.status === 'RETURNED', 'A hung poll times out and the next poll still delivers updates', watcher.last());
    stuck.close();

    process.env.TRACKING_POLL_MS = 'not-a-number';
    const fallback = new TrackingHub({ logger: quietLogger, loadSnapshot: db.snapshot, loadSignatures: db.signatures });
    assert((fallback as unknown as { pollMs: number }).pollMs === 3000, 'An invalid TRACKING_POLL_MS falls back to 3000 ms instead of hammering the DB');
    process.env.TRACKING_POLL_MS = '10';
    const tooFast = new TrackingHub({ logger: quietLogger, loadSnapshot: db.snapshot, loadSignatures: db.signatures });
    assert((tooFast as unknown as { pollMs: number }).pollMs === 3000, 'A TRACKING_POLL_MS below 500 ms is ignored');
    delete process.env.TRACKING_POLL_MS;
    fallback.close(); tooFast.close();
    hub.close();
  }

  console.log('\n--- 6. Upgrade path parsing ---');
  {
    assert(upgradePathname('/ws/tracking?x=1') === TRACKING_SOCKET_PATH, 'The tracking path is recognised with a query string');
    assert(upgradePathname('/somewhere-else') === '/somewhere-else', 'Other paths are passed through');
    let threw = false;
    let results: (string | null)[] = [];
    try { results = ['//a:b@', '//[', '//localhost:99999'].map(upgradePathname); } catch { threw = true; }
    assert(!threw && results.every((r) => r === null), 'Unparseable request targets return null instead of throwing (no process crash)', results);
  }

  console.log('\n--- 7. End to end through a real WebSocket server ---');
  {
    const db = new FakeParcels();
    db.add(TN, 'IN_TRANSIT', ['CONFIRMED', 'IN_TRANSIT']);
    const server = http.createServer();
    const wss = new WebSocketServer({ server, maxPayload: MAX_MESSAGE_BYTES });
    const live = attachTrackingSocket(wss, { pollMs: 50, loadSnapshot: db.snapshot, loadSignatures: db.signatures, logger: quietLogger });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const client = new WebSocket(`ws://127.0.0.1:${(server.address() as AddressInfo).port}`);
    const messages: any[] = [];
    const next = (type: string) => new Promise<any>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`timed out waiting for ${type}`)), 3000);
      const check = () => {
        const found = messages.find((m) => m.type === type && !m.seen);
        if (found) { found.seen = true; clearTimeout(timeout); resolve(found); } else setTimeout(check, 10);
      };
      check();
    });
    client.on('message', (data) => messages.push(JSON.parse(data.toString())));
    try {
      await once(client, 'open');
      client.send(JSON.stringify({ type: 'subscribe', trackingNumber: TN }));
      const snapshot = await next('snapshot');
      assert(snapshot.data.status === 'IN_TRANSIT', 'A real client receives the snapshot over the socket');
      db.advance(TN, 'OUT_FOR_DELIVERY');
      const update = await next('update');
      assert(update.data.status === 'OUT_FOR_DELIVERY', 'A status change reaches the real client without reconnecting');
      client.send(Buffer.from([1, 2, 3]), { binary: true });
      const error = await next('error');
      assert(error.status === 400 && /JSON text frames/.test(error.error), 'Binary frames are rejected with a JSON error', error);
      client.close();
      await once(client, 'close');
      assert(await waitFor(() => live.hub.watchedTrackingNumbers.length === 0), 'Closing the socket removes its subscriptions on the server');
    } finally {
      live.close();
      client.terminate();
      wss.close();
      server.close();
    }

    // Connection cap: with room for one client, a second is refused (1013).
    const capServer = http.createServer();
    const capWss = new WebSocketServer({ server: capServer });
    const capped = attachTrackingSocket(capWss, { pollMs: 0, maxConnections: 1, loadSnapshot: db.snapshot, loadSignatures: db.signatures, logger: quietLogger });
    capServer.listen(0, '127.0.0.1');
    await once(capServer, 'listening');
    const url = `ws://127.0.0.1:${(capServer.address() as AddressInfo).port}`;
    const one = new WebSocket(url);
    const two = new WebSocket(url);
    try {
      await once(one, 'open');
      const [code] = await once(two, 'close');
      assert(code === 1013, 'Connections beyond the cap are refused with close code 1013', code);
    } finally {
      capped.close(); one.terminate(); two.terminate(); capWss.close(); capServer.close();
    }
  }

  console.log('\n============================================================');
  console.log(`🎉 TEST SUMMARY: ${passedAssertions}/${totalAssertions} assertions passed`);
  console.log('============================================================\n');
}

if (process.argv[1] && process.argv[1].endsWith('tracking.socket.test.ts')) {
  // If the event loop drains before the suite finishes (e.g. an await that can
  // never settle), Node would exit 0 silently. Treat that as a failure.
  process.exitCode = 1;
  process.on('exit', (code) => {
    if (code !== 0) console.error(`\n❌ Suite did not finish (${passedAssertions}/${totalAssertions} assertions ran)`);
  });
  runTrackingSocketTestSuite()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Live tracking test suite failed:', error instanceof Error ? error.message : error);
      console.log(`   ${passedAssertions}/${totalAssertions} assertions passed before the failure`);
      process.exit(1);
    });
}
