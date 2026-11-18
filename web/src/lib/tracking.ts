// Member 3 — Tracking, History & Receipt: API client and shared helpers.
import { fetchApi } from './api';
import { getAccessToken, refreshAccessToken } from './auth';

export type ParcelStatus =
  | 'PENDING_PAYMENT' | 'CONFIRMED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED' | 'RETURNED' | 'CANCELLED';

export interface TrackingEvent {
  status: ParcelStatus;
  label: string;
  location: string | null;
  timestamp: string | null;
  note?: string | null;
}

export interface PublicTracking {
  trackingNumber: string;
  status: ParcelStatus;
  statusLabel: string;
  isFinal: boolean;
  bookedAt: string | null;
  lastUpdatedAt: string | null;
  events: TrackingEvent[];
}

export interface ParcelSummary {
  trackingNumber: string;
  status: ParcelStatus;
  statusLabel: string;
  isFinal: boolean;
  recipientName: string;
  deliveryAddress: string;
  weightKg: number | null;
  totalFee: number | null;
  currency: string;
  bookedAt: string | null;
  lastUpdatedAt: string | null;
}

export interface Party { name: string; phone: string; address: string }

export interface ParcelDetail extends ParcelSummary {
  sender: Party;
  recipient: Party;
  dimensionsCm: { length: number | null; width: number | null; height: number | null };
  specialNotes: string | null;
  events: TrackingEvent[];
}

export interface HistoryPage {
  parcels: ParcelSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface Receipt {
  receiptNumber: string;
  trackingNumber: string;
  issuedAt: string;
  bookedAt: string | null;
  deliveredAt: string | null;
  status: ParcelStatus;
  statusLabel: string;
  sender: Party;
  recipient: Party;
  parcel: { weightKg: number | null; dimensionsCm: { length: number | null; width: number | null; height: number | null } };
  lineItems: { description: string; amount: number }[];
  total: number;
  currency: string;
}

/** Error that keeps the HTTP status so pages can show "not found" vs "try again". */
export class TrackingRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const TRACKING_NUMBER_RE = /^SWIFT-[A-Z0-9]{6,12}$/;
export const normaliseTrackingNumber = (value: string) => value.trim().toUpperCase();

/** Route params arrive URL-encoded; a malformed escape must not crash the page. */
export function decodeRouteParam(value: unknown): string {
  const raw = String(value ?? '');
  try { return decodeURIComponent(raw); } catch { return raw; }
}
export const isValidTrackingNumber = (value: string) => TRACKING_NUMBER_RE.test(normaliseTrackingNumber(value));

/** Public lookup: deliberately sent without credentials. */
export async function fetchPublicTracking(trackingNumber: string, signal?: AbortSignal): Promise<PublicTracking> {
  const response = await fetch(`/api/v1/tracking/public/${encodeURIComponent(normaliseTrackingNumber(trackingNumber))}`, {
    cache: 'no-store', signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new TrackingRequestError(response.status, body.error || `Tracking lookup failed (${response.status}).`);
  return body as PublicTracking;
}

export interface TrackingClientConfig {
  websocketUrl: string | null;
  pollIntervalMs: number;
}

let configRequest: Promise<TrackingClientConfig> | null = null;
const FALLBACK_CONFIG: TrackingClientConfig = { websocketUrl: null, pollIntervalMs: 20_000 };

/**
 * Where to open the live-tracking WebSocket (null = poll). A successful answer
 * is cached for the page's lifetime; a failed one is not, so the next tracking
 * page retries instead of being stuck on polling for the whole session.
 */
export function fetchTrackingConfig(): Promise<TrackingClientConfig> {
  configRequest ??= fetch('/api/v1/tracking/config', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`config ${response.status}`);
      return (await response.json()) as TrackingClientConfig;
    })
    .catch(() => {
      configRequest = null;
      return FALLBACK_CONFIG;
    });
  return configRequest;
}

export function fetchHistory(params: { status?: ParcelStatus | ''; limit?: number; offset?: number } = {}): Promise<HistoryPage> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.limit) query.set('limit', String(params.limit));
  if (params.offset) query.set('offset', String(params.offset));
  const suffix = query.toString() ? `?${query}` : '';
  return fetchApi<HistoryPage>(`/tracking/history${suffix}`);
}

export async function fetchParcel(trackingNumber: string): Promise<ParcelDetail> {
  const { parcel } = await fetchApi<{ parcel: ParcelDetail }>(`/tracking/history/${encodeURIComponent(normaliseTrackingNumber(trackingNumber))}`);
  return parcel;
}

export async function fetchReceipt(trackingNumber: string): Promise<Receipt> {
  const { receipt } = await fetchApi<{ receipt: Receipt }>(`/tracking/history/${encodeURIComponent(normaliseTrackingNumber(trackingNumber))}/receipt`);
  return receipt;
}

/**
 * Downloads the server-rendered HTML receipt as a file. fetchApi always parses
 * JSON, so this uses a raw authenticated fetch with the same one-time refresh.
 */
export async function downloadReceiptFile(trackingNumber: string): Promise<void> {
  const url = `/api/v1/tracking/history/${encodeURIComponent(normaliseTrackingNumber(trackingNumber))}/receipt?format=html`;
  const token = await getAccessToken();
  if (!token) throw new Error('Please sign in again to download your receipt.');
  let response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (response.status === 401) {
    const fresh = await refreshAccessToken(token);
    if (fresh) response = await fetch(url, { headers: { Authorization: `Bearer ${fresh}` }, cache: 'no-store' });
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Receipt download failed (${response.status}).`);
  }
  const blob = await response.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `swiftdrop-receipt-${normaliseTrackingNumber(trackingNumber)}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** The normal delivery path, used to draw upcoming steps on the timeline. */
export const LIFECYCLE: { status: ParcelStatus; label: string }[] = [
  { status: 'CONFIRMED', label: 'Booking confirmed' },
  { status: 'PICKED_UP', label: 'Picked up' },
  { status: 'IN_TRANSIT', label: 'In transit' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { status: 'DELIVERED', label: 'Delivered' },
];

export const STATUS_FILTERS: { value: ParcelStatus | ''; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'FAILED', label: 'Failed' },
];

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatMoney(amount: number | null | undefined, currency = 'LKR'): string {
  if (amount === null || amount === undefined) return '—';
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
