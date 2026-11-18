import type { IncomingMessage } from 'node:http';
import { WebSocket, type WebSocketServer, type RawData } from 'ws';
import { db } from '../../config/database.js';
import {
  TrackingError,
  getPublicTracking,
  normaliseTrackingNumber,
  type PublicTracking,
} from './tracking.service.js';

/**
 * Member 3 — live tracking over WebSocket (ws://<api-host>/ws/tracking).
 *
 * Protocol (JSON text frames):
 *   client → { "type": "subscribe",   "trackingNumber": "SWIFT-AB12CD34" }
 *   client → { "type": "unsubscribe", "trackingNumber": "SWIFT-AB12CD34" }
 *   server → { "type": "snapshot", "trackingNumber", "data": PublicTracking }   right after subscribing
 *   server → { "type": "update",   "trackingNumber", "data": PublicTracking }   whenever the status changes
 *   server → { "type": "error", "trackingNumber"?, "status": 400|404|429|500, "error": "..." }
 *
 * Change detection polls the database for the subscribed tracking numbers only
 * (one query per tick for all of them). This deliberately does not hook into
 * other members' status writers: it catches every writer (courier, support,
 * merchant, manual SQL), works across several API replicas, and needs no
 * message broker. Pushed data is the same safe public projection as
 * GET /tracking/public/:trackingNumber, so subscribers never see PII.
 */

export const TRACKING_SOCKET_PATH = '/ws/tracking';
export const MAX_SUBSCRIPTIONS_PER_SOCKET = 20;
export const MAX_MESSAGE_BYTES = 1024;
/** Per-socket message budget: a burst of 10, then 1 message per second. */
export const MESSAGE_BURST = 10;
export const MESSAGE_REFILL_PER_SEC = 1;
/** Connections beyond this are refused with close code 1013 (try again later). */
export const MAX_CONNECTIONS = 500;
const DEFAULT_POLL_MS = 3000;
const MIN_POLL_MS = 500;

export type OutgoingMessage =
  | { type: 'snapshot' | 'update'; trackingNumber: string; data: PublicTracking }
  | { type: 'error'; trackingNumber?: string; status: number; error: string };

/** Anything with a send(); real sockets in production, fakes in unit tests. */
export interface Subscriber {
  readyState: number;
  send(data: string): void;
}

export interface TrackingHubOptions {
  /** How often subscribed parcels are checked for changes (0 = no timer; tests call poll()). */
  pollMs?: number;
  /** A poll that takes longer than this is abandoned so the next one can run. */
  pollTimeoutMs?: number;
  /** Loads the public snapshot for one parcel (throws TrackingError 404 if unknown). */
  loadSnapshot?: (trackingNumber: string) => Promise<PublicTracking>;
  /** Returns a change signature per tracking number; a different value means "changed". */
  loadSignatures?: (trackingNumbers: string[]) => Promise<Map<string, string>>;
  logger?: Pick<Console, 'warn'>;
  /** Clock for the rate limiter (tests inject a fake one). */
  now?: () => number;
}

/**
 * Path of a WebSocket upgrade request, or null if the request target cannot be
 * parsed. new URL() throws on targets such as "//a:b@"; inside an 'upgrade'
 * listener that would be an uncaught exception and crash the process.
 */
export function upgradePathname(rawUrl: string | undefined): string | null {
  try {
    return new URL(rawUrl ?? '/', 'http://localhost').pathname;
  } catch {
    return null;
  }
}

function resolvePollMs(explicit: number | undefined): number {
  if (explicit !== undefined) return explicit;
  const fromEnv = Number(process.env.TRACKING_POLL_MS);
  // Unset, non-numeric or too small (a NaN interval would fire every 1 ms).
  return Number.isFinite(fromEnv) && fromEnv >= MIN_POLL_MS ? fromEnv : DEFAULT_POLL_MS;
}

function withTimeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    // Not unref'd: while a poll is waiting, this timer is what guarantees it ends.
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** One query for every subscribed parcel: status, last update and event count. */
export async function loadSignaturesFromDb(trackingNumbers: string[]): Promise<Map<string, string>> {
  const signatures = new Map<string, string>();
  if (trackingNumbers.length === 0) return signatures;
  const result = await db.query(
    `SELECT p.tracking_number, p.status::text AS status, p.updated_at,
            (SELECT count(*) FROM parcel_status_history h WHERE h.parcel_id = p.id)::int AS events,
            (SELECT max(h.created_at) FROM parcel_status_history h WHERE h.parcel_id = p.id) AS last_event_at
       FROM parcels p
      WHERE p.tracking_number = ANY($1::text[])`,
    [trackingNumbers]
  );
  for (const row of result.rows as Record<string, unknown>[]) {
    const stamp = (v: unknown) => (v ? new Date(String(v instanceof Date ? v.toISOString() : v)).getTime() : 0);
    signatures.set(String(row.tracking_number),
      `${row.status}|${Number(row.events)}|${stamp(row.last_event_at)}|${stamp(row.updated_at)}`);
  }
  return signatures;
}

/**
 * Transport-independent subscription hub: keeps who is watching which parcel,
 * polls for changes and pushes updates. Exported for unit tests.
 *
 * Messages from one connection are processed one at a time (a queue per
 * subscriber), and every subscription is registered before the first await, so
 * a burst of frames cannot slip past the per-connection cap or leave watchers
 * behind after the connection closes.
 */
export class TrackingHub {
  private readonly watchers = new Map<string, Set<Subscriber>>();
  private readonly subscriptions = new Map<Subscriber, Set<string>>();
  /** Subscribes still loading, per connection (count toward the cap; unsubscribe cancels). */
  private readonly pending = new Map<Subscriber, Set<string>>();
  private readonly signatures = new Map<string, string>();
  private readonly queues = new Map<Subscriber, Promise<void>>();
  private readonly buckets = new Map<Subscriber, { tokens: number; at: number }>();
  private timer: NodeJS.Timeout | null = null;
  private polling = false;
  private readonly pollMs: number;
  private readonly pollTimeoutMs: number;
  private readonly loadSnapshot: (trackingNumber: string) => Promise<PublicTracking>;
  private readonly loadSignatures: (trackingNumbers: string[]) => Promise<Map<string, string>>;
  private readonly logger: Pick<Console, 'warn'>;
  private readonly now: () => number;

  constructor(options: TrackingHubOptions = {}) {
    this.pollMs = resolvePollMs(options.pollMs);
    this.pollTimeoutMs = options.pollTimeoutMs ?? Math.max(10_000, this.pollMs * 3);
    this.loadSnapshot = options.loadSnapshot ?? getPublicTracking;
    this.loadSignatures = options.loadSignatures ?? loadSignaturesFromDb;
    this.logger = options.logger ?? console;
    this.now = options.now ?? Date.now;
  }

  get watchedTrackingNumbers(): string[] {
    return [...this.watchers.keys()];
  }

  subscriptionCount(subscriber: Subscriber): number {
    return this.subscriptions.get(subscriber)?.size ?? 0;
  }

  /**
   * Rate-limits, then queues one raw client message behind that connection's
   * earlier messages. Never throws; resolves when this message is handled.
   */
  handleMessage(subscriber: Subscriber, raw: string): Promise<void> {
    if (!this.takeToken(subscriber)) {
      this.send(subscriber, { type: 'error', status: 429, error: 'Too many messages. Slow down and try again.' });
      return Promise.resolve();
    }
    const previous = this.queues.get(subscriber) ?? Promise.resolve();
    const next = previous.then(() => this.process(subscriber, raw)).catch((error) => {
      this.logger.warn('[tracking-socket] message failed:', error instanceof Error ? error.message : error);
    });
    this.queues.set(subscriber, next);
    return next;
  }

  async subscribe(subscriber: Subscriber, rawTrackingNumber: unknown): Promise<void> {
    let trackingNumber: string;
    try {
      trackingNumber = normaliseTrackingNumber(rawTrackingNumber);
    } catch (error) {
      return this.sendError(subscriber, error, undefined);
    }

    // Register synchronously, before any await.
    let mine = this.subscriptions.get(subscriber);
    if (!mine) { mine = new Set<string>(); this.subscriptions.set(subscriber, mine); }
    let loading = this.pending.get(subscriber);
    if (!loading) { loading = new Set<string>(); this.pending.set(subscriber, loading); }
    if (loading.has(trackingNumber)) return; // already being set up

    const alreadyFollowing = mine.has(trackingNumber);
    if (!alreadyFollowing && mine.size + loading.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) {
      return this.send(subscriber, {
        type: 'error', trackingNumber, status: 429,
        error: `A connection can follow at most ${MAX_SUBSCRIPTIONS_PER_SOCKET} parcels.`,
      });
    }
    loading.add(trackingNumber);

    let snapshot: PublicTracking;
    let baseline: string | undefined;
    try {
      // Baseline BEFORE the snapshot: a change landing in between shows up as a
      // difference on the next poll (worst case one redundant update) instead
      // of being swallowed.
      baseline = (await this.loadSignatures([trackingNumber])).get(trackingNumber);
      snapshot = await this.loadSnapshot(trackingNumber);
    } catch (error) {
      loading.delete(trackingNumber);
      return this.sendError(subscriber, error, trackingNumber);
    }

    // Still wanted? An unsubscribe removes it from `loading`; a disconnect drops
    // the whole connection; the socket may have closed while we were loading.
    const stillWanted = loading.delete(trackingNumber);
    if (!stillWanted || this.subscriptions.get(subscriber) !== mine || subscriber.readyState !== WebSocket.OPEN) return;

    mine.add(trackingNumber);
    const watchers = this.watchers.get(trackingNumber) ?? new Set<Subscriber>();
    watchers.add(subscriber);
    this.watchers.set(trackingNumber, watchers);
    // Never overwrite an existing baseline: other watchers may still be owed a
    // change that happened after it.
    if (!this.signatures.has(trackingNumber) && baseline !== undefined) this.signatures.set(trackingNumber, baseline);

    this.send(subscriber, { type: 'snapshot', trackingNumber, data: snapshot });
    this.ensureTimer();
  }

  unsubscribe(subscriber: Subscriber, rawTrackingNumber: unknown): void {
    let trackingNumber: string;
    try {
      trackingNumber = normaliseTrackingNumber(rawTrackingNumber);
    } catch (error) {
      return this.sendError(subscriber, error, undefined);
    }
    this.pending.get(subscriber)?.delete(trackingNumber); // cancels an in-flight subscribe
    this.subscriptions.get(subscriber)?.delete(trackingNumber);
    this.removeWatcher(trackingNumber, subscriber);
  }

  /** Forget a closed connection entirely. */
  disconnect(subscriber: Subscriber): void {
    for (const trackingNumber of this.subscriptions.get(subscriber) ?? []) this.removeWatcher(trackingNumber, subscriber);
    this.subscriptions.delete(subscriber);
    this.pending.delete(subscriber);
    this.queues.delete(subscriber);
    this.buckets.delete(subscriber);
  }

  /** One polling round; public so tests can drive it without timers. */
  async poll(): Promise<void> {
    if (this.polling || this.watchers.size === 0) return;
    this.polling = true;
    try {
      const trackingNumbers = this.watchedTrackingNumbers;
      const current = await withTimeout(this.loadSignatures(trackingNumbers), this.pollTimeoutMs, 'tracking poll');
      for (const trackingNumber of trackingNumbers) {
        if (!this.watchers.has(trackingNumber)) continue; // everyone left meanwhile
        const signature = current.get(trackingNumber);
        if (signature === undefined) continue; // parcel removed: keep last state
        const previous = this.signatures.get(trackingNumber);
        this.signatures.set(trackingNumber, signature);
        if (previous === undefined || previous === signature) continue;
        await this.pushUpdate(trackingNumber);
      }
    } catch (error) {
      this.logger.warn('[tracking-socket] poll failed:', error instanceof Error ? error.message : error);
    } finally {
      this.polling = false;
    }
  }

  close(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.watchers.clear();
    this.subscriptions.clear();
    this.pending.clear();
    this.signatures.clear();
    this.queues.clear();
    this.buckets.clear();
  }

  private async process(subscriber: Subscriber, raw: string): Promise<void> {
    let message: { type?: unknown; trackingNumber?: unknown };
    try {
      if (Buffer.byteLength(raw) > MAX_MESSAGE_BYTES) throw new Error('too large');
      message = JSON.parse(raw);
      if (!message || typeof message !== 'object' || Array.isArray(message)) throw new Error('not an object');
    } catch {
      return this.send(subscriber, { type: 'error', status: 400, error: 'Messages must be small JSON objects.' });
    }
    if (message.type === 'subscribe') return this.subscribe(subscriber, message.trackingNumber);
    if (message.type === 'unsubscribe') return this.unsubscribe(subscriber, message.trackingNumber);
    this.send(subscriber, { type: 'error', status: 400, error: 'Unknown message type. Use subscribe or unsubscribe.' });
  }

  /** Token bucket per connection: MESSAGE_BURST at once, refilling MESSAGE_REFILL_PER_SEC. */
  private takeToken(subscriber: Subscriber): boolean {
    const now = this.now();
    const bucket = this.buckets.get(subscriber) ?? { tokens: MESSAGE_BURST, at: now };
    bucket.tokens = Math.min(MESSAGE_BURST, bucket.tokens + ((now - bucket.at) / 1000) * MESSAGE_REFILL_PER_SEC);
    bucket.at = now;
    this.buckets.set(subscriber, bucket);
    if (bucket.tokens < 1) return false;
    bucket.tokens -= 1;
    return true;
  }

  private async pushUpdate(trackingNumber: string): Promise<void> {
    if (!this.watchers.get(trackingNumber)?.size) return;
    let data: PublicTracking;
    try {
      data = await withTimeout(this.loadSnapshot(trackingNumber), this.pollTimeoutMs, 'tracking snapshot');
    } catch (error) {
      this.logger.warn(`[tracking-socket] update for ${trackingNumber} failed:`, error instanceof Error ? error.message : error);
      return;
    }
    for (const subscriber of this.watchers.get(trackingNumber) ?? []) this.send(subscriber, { type: 'update', trackingNumber, data });
  }

  private removeWatcher(trackingNumber: string, subscriber: Subscriber): void {
    const watchers = this.watchers.get(trackingNumber);
    if (!watchers) return;
    watchers.delete(subscriber);
    if (watchers.size === 0) {
      this.watchers.delete(trackingNumber);
      this.signatures.delete(trackingNumber);
    }
    if (this.watchers.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private ensureTimer(): void {
    if (this.timer || this.pollMs <= 0) return;
    this.timer = setInterval(() => { void this.poll(); }, this.pollMs);
    this.timer.unref?.();
  }

  private sendError(subscriber: Subscriber, error: unknown, trackingNumber: string | undefined): void {
    if (error instanceof TrackingError) {
      this.send(subscriber, { type: 'error', trackingNumber, status: error.status, error: error.message });
    } else {
      this.logger.warn('[tracking-socket] subscribe failed:', error instanceof Error ? error.message : error);
      this.send(subscriber, { type: 'error', trackingNumber, status: 500, error: 'Unable to load tracking information.' });
    }
  }

  private send(subscriber: Subscriber, message: OutgoingMessage): void {
    if (subscriber.readyState !== WebSocket.OPEN) return;
    try {
      subscriber.send(JSON.stringify(message));
    } catch (error) {
      this.logger.warn('[tracking-socket] send failed:', error instanceof Error ? error.message : error);
    }
  }
}

/**
 * Wires a hub to a ws server: message routing, cleanup on close, and a ping
 * heartbeat that drops connections that stopped answering (e.g. a phone that
 * lost signal), so their subscriptions do not linger.
 */
export function attachTrackingSocket(
  wss: WebSocketServer,
  options: TrackingHubOptions & { heartbeatMs?: number; maxConnections?: number } = {},
) {
  const hub = new TrackingHub(options);
  const alive = new WeakMap<WebSocket, boolean>();
  const maxConnections = options.maxConnections ?? MAX_CONNECTIONS;

  wss.on('connection', (socket: WebSocket, _req: IncomingMessage) => {
    // wss.clients already includes this socket.
    if (wss.clients.size > maxConnections) {
      socket.close(1013, 'Server busy, try again later');
      return;
    }
    alive.set(socket, true);
    socket.on('pong', () => alive.set(socket, true));
    socket.on('message', (data: RawData, isBinary: boolean) => {
      if (isBinary) {
        socket.send(JSON.stringify({ type: 'error', status: 400, error: 'Send JSON text frames.' }));
        return;
      }
      void hub.handleMessage(socket, data.toString());
    });
    socket.on('close', () => hub.disconnect(socket));
    socket.on('error', () => hub.disconnect(socket));
  });

  const heartbeatMs = options.heartbeatMs ?? 30_000;
  const heartbeat = setInterval(() => {
    for (const socket of wss.clients) {
      if (alive.get(socket) === false) { socket.terminate(); continue; }
      alive.set(socket, false);
      socket.ping();
    }
  }, heartbeatMs);
  heartbeat.unref?.();

  return {
    hub,
    close() {
      clearInterval(heartbeat);
      hub.close();
    },
  };
}
