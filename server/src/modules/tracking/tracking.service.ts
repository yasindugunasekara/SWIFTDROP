import { db } from '../../config/database.js';

/**
 * Member 3 — Tracking, History & Receipt
 *
 * Two audiences, two shapes:
 *  - Public tracking (anyone with a tracking number) gets a SAFE projection only:
 *    status, timestamps and a short location label. Never names, phones,
 *    addresses, fees, internal IDs, courier IDs, GPS coordinates or notes.
 *  - Customer history / receipts verify ownership in SQL (customer_id = caller).
 *    A parcel the caller does not own is reported as 404, so tracking numbers
 *    cannot be probed for ownership.
 *
 * Row values are normalised with toIso()/toNum() because the two DB drivers
 * differ: pg returns Date objects and DECIMAL strings, the Supabase SQL bridge
 * returns ISO strings and JSON numbers.
 */

export class TrackingError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'TrackingError';
  }
}

export const PARCEL_STATUSES = [
  'PENDING_PAYMENT', 'CONFIRMED', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED', 'CANCELLED',
] as const;
export type ParcelStatus = typeof PARCEL_STATUSES[number];

export const STATUS_LABELS: Record<ParcelStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Booking confirmed',
  ASSIGNED: 'Courier assigned',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery attempt failed',
  RETURNED: 'Returned to sender',
  CANCELLED: 'Cancelled',
};

const FINAL_STATUSES: ReadonlySet<string> = new Set(['DELIVERED', 'RETURNED', 'CANCELLED']);

/** SWIFT- followed by 6–12 letters/digits, e.g. SWIFT-M3DLV001 or SWIFT-AB12CD34. */
const TRACKING_NUMBER_RE = /^SWIFT-[A-Z0-9]{6,12}$/;
const MAX_PUBLIC_LOCATION_LENGTH = 60;
const MAX_PAGE_SIZE = 50;
const CURRENCY = 'LKR';

// ----------------------------------------------------------------------------
// Normalisers / validators
// ----------------------------------------------------------------------------

/** Trims and upper-cases a tracking number, or throws 400. Runs before any SQL. */
export function normaliseTrackingNumber(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
  if (!TRACKING_NUMBER_RE.test(value)) {
    throw new TrackingError(400, 'Invalid tracking number format. Expected e.g. SWIFT-AB12CD34.');
  }
  return value;
}

function toIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function labelFor(status: string): string {
  return STATUS_LABELS[status as ParcelStatus] ?? status;
}

/**
 * Location labels are free text entered by staff/couriers. For the public view,
 * drop anything that looks like it carries contact details (an email, or 7+
 * digits in total, however they are separated: "077.123.4567", "077 123 4567")
 * and cap the length. Known limitation: a short street address such as
 * "21 Temple Rd" still passes; a controlled hub/zone label would be needed to
 * rule that out, and no such table exists yet.
 */
export function publicLocation(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;
  if (value.includes('@') || value.replace(/\D/g, '').length >= 7) return null;
  return value.length > MAX_PUBLIC_LOCATION_LENGTH
    ? `${value.slice(0, MAX_PUBLIC_LOCATION_LENGTH - 1)}…`
    : value;
}

// Timeline order: by time, then by lifecycle position (parcel_status is an enum,
// so it sorts in declaration order) to break ties between same-instant rows.
// Qualified as h.status: a bare "status" would bind to the status::text output
// alias and sort alphabetically instead.
const HISTORY_ORDER = 'ORDER BY h.created_at ASC, h.status ASC';

// ----------------------------------------------------------------------------
// Public tracking
// ----------------------------------------------------------------------------

export interface PublicTrackingEvent {
  status: string;
  label: string;
  location: string | null;
  timestamp: string | null;
}

export interface PublicTracking {
  trackingNumber: string;
  status: string;
  statusLabel: string;
  isFinal: boolean;
  bookedAt: string | null;
  lastUpdatedAt: string | null;
  events: PublicTrackingEvent[];
}

export async function getPublicTracking(rawTrackingNumber: unknown): Promise<PublicTracking> {
  const trackingNumber = normaliseTrackingNumber(rawTrackingNumber);

  const parcel = await db.query(
    `SELECT id, tracking_number, status::text AS status, created_at, updated_at
       FROM parcels WHERE tracking_number = $1`,
    [trackingNumber]
  );
  const row = parcel.rows[0];
  if (!row) throw new TrackingError(404, `No parcel found for tracking number ${trackingNumber}.`);

  const history = await db.query(
    `SELECT status::text AS status, location_name, created_at
       FROM parcel_status_history h WHERE h.parcel_id = $1 ${HISTORY_ORDER}`,
    [row.id]
  );

  const events = history.rows.map((h: Record<string, unknown>) => ({
    status: String(h.status),
    label: labelFor(String(h.status)),
    location: publicLocation(h.location_name),
    timestamp: toIso(h.created_at),
  }));

  // Explicit allow-list: only these keys ever leave the public endpoint.
  return {
    trackingNumber: String(row.tracking_number),
    status: String(row.status),
    statusLabel: labelFor(String(row.status)),
    isFinal: FINAL_STATUSES.has(String(row.status)),
    bookedAt: toIso(row.created_at),
    lastUpdatedAt: events.at(-1)?.timestamp ?? toIso(row.updated_at),
    events,
  };
}

// ----------------------------------------------------------------------------
// Customer history (ownership-checked)
// ----------------------------------------------------------------------------

export interface HistoryQuery {
  status?: unknown;
  limit?: unknown;
  offset?: unknown;
}

function parseBoundedInt(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new TrackingError(400, `Expected an integer between ${min} and ${max}.`);
  }
  return n;
}

function parseStatusFilter(value: unknown): ParcelStatus | null {
  if (value === undefined || value === null || value === '') return null;
  const status = String(value).trim().toUpperCase();
  if (!(PARCEL_STATUSES as readonly string[]).includes(status)) {
    throw new TrackingError(400, `Unknown status filter. Use one of: ${PARCEL_STATUSES.join(', ')}.`);
  }
  return status as ParcelStatus;
}

function summariseParcel(row: Record<string, unknown>) {
  return {
    trackingNumber: String(row.tracking_number),
    status: String(row.status),
    statusLabel: labelFor(String(row.status)),
    isFinal: FINAL_STATUSES.has(String(row.status)),
    recipientName: row.recipient_name as string,
    deliveryAddress: row.delivery_address as string,
    weightKg: toNum(row.weight_kg),
    totalFee: toNum(row.total_fee),
    currency: CURRENCY,
    bookedAt: toIso(row.created_at),
    lastUpdatedAt: toIso(row.last_event_at) ?? toIso(row.updated_at),
  };
}

const OWNER_PARCEL_COLUMNS = `
  p.id, p.tracking_number, p.status::text AS status,
  p.sender_name, p.sender_phone, p.pickup_address,
  p.recipient_name, p.recipient_phone, p.delivery_address,
  p.weight_kg, p.dimension_length_cm, p.dimension_width_cm, p.dimension_height_cm,
  p.total_fee, p.special_notes, p.created_at, p.updated_at,
  (SELECT max(h.created_at) FROM parcel_status_history h WHERE h.parcel_id = p.id) AS last_event_at`;

export async function listCustomerParcels(customerId: string, query: HistoryQuery = {}) {
  const status = parseStatusFilter(query.status);
  const limit = parseBoundedInt(query.limit, 20, 1, MAX_PAGE_SIZE);
  const offset = parseBoundedInt(query.offset, 0, 0, 100_000);

  const where = status ? 'p.customer_id = $1 AND p.status::text = $2' : 'p.customer_id = $1';
  const params: unknown[] = status ? [customerId, status] : [customerId];
  const n = params.length;

  const [rows, total] = await Promise.all([
    db.query(
      `SELECT ${OWNER_PARCEL_COLUMNS} FROM parcels p WHERE ${where}
        ORDER BY p.created_at DESC, p.tracking_number ASC
        LIMIT $${n + 1}::int OFFSET $${n + 2}::int`,
      [...params, limit, offset]
    ),
    db.query(`SELECT COUNT(*)::int AS n FROM parcels p WHERE ${where}`, params),
  ]);

  return {
    parcels: rows.rows.map(summariseParcel),
    total: toNum(total.rows[0]?.n) ?? 0,
    limit,
    offset,
  };
}

/** Loads a parcel only if the caller owns it; otherwise 404 (never 403). */
async function loadOwnedParcel(customerId: string, rawTrackingNumber: unknown) {
  const trackingNumber = normaliseTrackingNumber(rawTrackingNumber);
  const result = await db.query(
    `SELECT ${OWNER_PARCEL_COLUMNS} FROM parcels p
      WHERE p.tracking_number = $1 AND p.customer_id = $2`,
    [trackingNumber, customerId]
  );
  const row = result.rows[0];
  if (!row) throw new TrackingError(404, `No parcel found for tracking number ${trackingNumber} in your history.`);

  const history = await db.query(
    `SELECT status::text AS status, location_name, note, created_at
       FROM parcel_status_history h WHERE h.parcel_id = $1 ${HISTORY_ORDER}`,
    [row.id]
  );
  return { row: row as Record<string, unknown>, history: history.rows as Record<string, unknown>[] };
}

export async function getCustomerParcel(customerId: string, rawTrackingNumber: unknown) {
  const { row, history } = await loadOwnedParcel(customerId, rawTrackingNumber);
  return {
    ...summariseParcel(row),
    sender: { name: row.sender_name, phone: row.sender_phone, address: row.pickup_address },
    recipient: { name: row.recipient_name, phone: row.recipient_phone, address: row.delivery_address },
    dimensionsCm: {
      length: toNum(row.dimension_length_cm),
      width: toNum(row.dimension_width_cm),
      height: toNum(row.dimension_height_cm),
    },
    specialNotes: (row.special_notes as string | null) ?? null,
    // Owners see notes, but never courier/staff IDs or GPS coordinates.
    events: history.map((h) => ({
      status: String(h.status),
      label: labelFor(String(h.status)),
      location: (h.location_name as string | null) ?? null,
      note: (h.note as string | null) ?? null,
      timestamp: toIso(h.created_at),
    })),
  };
}

// ----------------------------------------------------------------------------
// Receipts
// ----------------------------------------------------------------------------

export interface Receipt {
  receiptNumber: string;
  trackingNumber: string;
  issuedAt: string;
  bookedAt: string | null;
  deliveredAt: string | null;
  status: string;
  statusLabel: string;
  sender: { name: string; phone: string; address: string };
  recipient: { name: string; phone: string; address: string };
  parcel: { weightKg: number | null; dimensionsCm: { length: number | null; width: number | null; height: number | null } };
  lineItems: { description: string; amount: number }[];
  total: number;
  currency: string;
}

export async function buildReceipt(customerId: string, rawTrackingNumber: unknown, now = new Date()): Promise<Receipt> {
  const { row, history } = await loadOwnedParcel(customerId, rawTrackingNumber);
  if (row.status === 'PENDING_PAYMENT') {
    throw new TrackingError(409, 'A receipt is available once payment is confirmed.');
  }
  const trackingNumber = String(row.tracking_number);
  const total = toNum(row.total_fee) ?? 0;
  // Only report a delivery date while the parcel is actually delivered; a parcel
  // delivered and later returned must not show "Delivered" on its receipt.
  const delivered = row.status === 'DELIVERED'
    ? [...history].reverse().find((h) => h.status === 'DELIVERED')
    : undefined;

  return {
    receiptNumber: `RCPT-${trackingNumber.slice('SWIFT-'.length)}`,
    trackingNumber,
    issuedAt: now.toISOString(),
    bookedAt: toIso(row.created_at),
    deliveredAt: delivered ? toIso(delivered.created_at) : null,
    status: String(row.status),
    statusLabel: labelFor(String(row.status)),
    sender: { name: String(row.sender_name), phone: String(row.sender_phone), address: String(row.pickup_address) },
    recipient: { name: String(row.recipient_name), phone: String(row.recipient_phone), address: String(row.delivery_address) },
    parcel: {
      weightKg: toNum(row.weight_kg),
      dimensionsCm: {
        length: toNum(row.dimension_length_cm),
        width: toNum(row.dimension_width_cm),
        height: toNum(row.dimension_height_cm),
      },
    },
    // No fee breakdown is stored yet (Member 2 owns pricing); the total is the
    // server-calculated fee recorded on the parcel.
    lineItems: [{ description: 'Parcel delivery charge', amount: total }],
    total,
    currency: CURRENCY,
  };
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatMoney(amount: number, currency: string): string {
  return `${currency} ${amount.toFixed(2)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Colombo' });
}

/** Self-contained, printable HTML receipt (no external assets). */
export function renderReceiptHtml(receipt: Receipt): string {
  const dims = receipt.parcel.dimensionsCm;
  const dimText = dims.length && dims.width && dims.height
    ? `${dims.length} × ${dims.width} × ${dims.height} cm` : '—';
  const items = receipt.lineItems
    .map((item) => `<tr><td>${escapeHtml(item.description)}</td><td class="num">${escapeHtml(formatMoney(item.amount, receipt.currency))}</td></tr>`)
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SwiftDrop receipt ${escapeHtml(receipt.receiptNumber)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff}
  .wrap{max-width:640px;margin:0 auto}
  h1{font-size:24px;margin:0}.brand span{color:#ff6600}
  .muted{color:#64748b;font-size:13px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:24px 0}
  .box{border:1px solid #e2e8f0;border-radius:12px;padding:12px 16px}
  .box h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin:0 0 6px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  td{padding:10px 0;border-bottom:1px solid #e2e8f0}.num{text-align:right}
  tr.total td{font-weight:800;border-bottom:none;font-size:16px}
  @media print{body{padding:0}}
</style></head>
<body><div class="wrap">
  <h1 class="brand">swiftdrop<span>.</span></h1>
  <p class="muted">Delivery receipt</p>
  <div class="grid">
    <div class="box"><h2>Receipt no.</h2>${escapeHtml(receipt.receiptNumber)}</div>
    <div class="box"><h2>Tracking no.</h2>${escapeHtml(receipt.trackingNumber)}</div>
    <div class="box"><h2>Booked</h2>${escapeHtml(formatDate(receipt.bookedAt))}</div>
    <div class="box"><h2>Delivered</h2>${escapeHtml(formatDate(receipt.deliveredAt))}</div>
    <div class="box"><h2>From</h2>${escapeHtml(receipt.sender.name)}<br><span class="muted">${escapeHtml(receipt.sender.address)}</span></div>
    <div class="box"><h2>To</h2>${escapeHtml(receipt.recipient.name)}<br><span class="muted">${escapeHtml(receipt.recipient.address)}</span></div>
    <div class="box"><h2>Weight</h2>${escapeHtml(receipt.parcel.weightKg ?? '—')} kg</div>
    <div class="box"><h2>Dimensions</h2>${escapeHtml(dimText)}</div>
  </div>
  <table>${items}<tr class="total"><td>Total</td><td class="num">${escapeHtml(formatMoney(receipt.total, receipt.currency))}</td></tr></table>
  <p class="muted">Status: ${escapeHtml(receipt.statusLabel)} · Issued ${escapeHtml(formatDate(receipt.issuedAt))}</p>
</div></body></html>`;
}
