// Member 6 — typed client for the merchant API (/api/v1/merchant/*).

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
const TOKEN_KEY = 'swiftdrop_access_token';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type ParcelStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED'
  | 'CANCELLED';

export interface MerchantStats {
  total: number;
  pending: number;
  transit: number;
  delivered: number;
  exceptions: number;
  totalSpend: number;
}

export interface MerchantProfile {
  id: string;
  name: string;
  registrationNumber: string | null;
  status: ApprovalStatus;
  createdAt: string;
  contact: { userId: string; fullName: string; email: string; phone: string | null };
  stats?: MerchantStats;
}

export interface MerchantOrder {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  weightKg: number;
  totalFee: number;
  status: ParcelStatus;
  specialNotes: string | null;
  createdAt: string;
  history?: { status: ParcelStatus; location: string | null; note: string | null; timestamp: string }[];
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface SessionResponse {
  user: { id: string; email: string; fullName: string; role: 'MERCHANT'; merchantId: string; approvalStatus: ApprovalStatus };
  merchant: MerchantProfile;
  accessToken: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/merchant${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'Cannot reach the SwiftDrop API. Is the server running?');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `Request failed (${res.status})`);
  return data as T;
}

export const merchantApi = {
  login: (email: string, password: string) => request<SessionResponse>('POST', '/login', { email, password }),
  register: (input: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    companyName: string;
    registrationNumber?: string;
  }) => request<SessionResponse>('POST', '/register', input),

  profile: () => request<{ merchant: MerchantProfile }>('GET', '/profile'),

  orders: (params: { filter?: string; search?: string; limit?: number; offset?: number }) => {
    const q = new URLSearchParams();
    if (params.filter && params.filter !== 'all') q.set('filter', params.filter);
    if (params.search) q.set('search', params.search);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    const qs = q.toString();
    return request<{ orders: MerchantOrder[]; total: number; stats: MerchantStats }>('GET', `/orders${qs ? `?${qs}` : ''}`);
  },
  order: (id: string) => request<{ order: MerchantOrder }>('GET', `/orders/${encodeURIComponent(id)}`),
  createOrder: (input: Record<string, unknown>) =>
    request<{ order: MerchantOrder; fee: { totalFee: number; zoneName: string } }>('POST', '/orders', input),

  apiKeys: () => request<{ apiKeys: ApiKeyRecord[] }>('GET', '/api-keys'),
  generateKey: (name: string) => request<{ apiKey: string; key: ApiKeyRecord }>('POST', '/api-keys/generate', { name }),
  revokeKey: (id: string) => request<{ message: string }>('DELETE', `/api-keys/${encodeURIComponent(id)}`),
};

export const API_DOCS_BASE = API_BASE_URL;

export const formatLkr = (n: number) =>
  new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 2 }).format(n);

export const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

export const STATUS_LABEL: Record<ParcelStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Pending dispatch',
  ASSIGNED: 'Courier assigned',
  PICKED_UP: 'Picked up',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery failed',
  RETURNED: 'Returned',
  CANCELLED: 'Cancelled',
};

export const STATUS_TONE: Record<ParcelStatus, string> = {
  PENDING_PAYMENT: 'bg-slate-100 text-slate-600',
  CONFIRMED: 'bg-slate-100 text-slate-700',
  ASSIGNED: 'bg-sky-50 text-sky-700',
  PICKED_UP: 'bg-orange-50 text-[#c2410c]',
  IN_TRANSIT: 'bg-orange-50 text-[#c2410c]',
  OUT_FOR_DELIVERY: 'bg-orange-50 text-[#c2410c]',
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  FAILED: 'bg-red-50 text-red-700',
  RETURNED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-500',
};
