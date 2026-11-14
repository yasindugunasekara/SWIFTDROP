import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { z } from 'zod';
import { db } from '../../config/database.js';
import { config } from '../../config/env.js';
import type { AuthenticatedUser } from '../../middleware/auth.js';
import { HttpError, generateTrackingNumber, sha256 } from './merchant.utils.js';

// =============================================================================
// MEMBER 6 — Merchant Account, Orders & Partner API: business logic
// =============================================================================

export const API_KEY_PREFIX = 'sw_live_';
export const MAX_ACTIVE_KEYS = 5;
export const APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

const BCRYPT_ROUNDS = 10;
/** Divisor for volumetric weight (cm³ → kg), road-courier standard. */
const VOLUMETRIC_DIVISOR = 5000;
/** Distance assumed when a partner does not send one. */
const DEFAULT_DISTANCE_KM = 10;

// -----------------------------------------------------------------------------
// Validation schemas
// -----------------------------------------------------------------------------
export const merchantRegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  fullName: z.string().trim().min(2).max(150),
  phone: z.string().trim().max(30).optional(),
  companyName: z.string().trim().min(2).max(255),
  registrationNumber: z.string().trim().max(100).optional(),
});

export const merchantLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const orderInputSchema = z.object({
  senderName: z.string().trim().min(1).max(150),
  senderPhone: z.string().trim().min(5).max(30),
  pickupAddress: z.string().trim().min(5),
  recipientName: z.string().trim().min(1).max(150),
  recipientPhone: z.string().trim().min(5).max(30),
  deliveryAddress: z.string().trim().min(5),
  weightKg: z.coerce.number().positive().max(500),
  lengthCm: z.coerce.number().positive().max(500).optional(),
  widthCm: z.coerce.number().positive().max(500).optional(),
  heightCm: z.coerce.number().positive().max(500).optional(),
  distanceKm: z.coerce.number().nonnegative().max(2000).optional(),
  zoneId: z.string().uuid().optional(),
  specialNotes: z.string().trim().max(1000).optional(),
});
export type OrderInput = z.infer<typeof orderInputSchema>;

// -----------------------------------------------------------------------------
// Merchant accounts & sessions
// -----------------------------------------------------------------------------
export interface MerchantAccount {
  userId: string;
  email: string;
  fullName: string;
  phone: string | null;
  merchantId: string;
  companyName: string;
  registrationNumber: string | null;
  approvalStatus: ApprovalStatus;
  createdAt: string;
}

const ACCOUNT_SELECT = `
  SELECT u.id AS "userId", u.email, u.full_name AS "fullName", u.phone,
         m.id AS "merchantId", m.company_name AS "companyName", m.registration_number AS "registrationNumber",
         m.approval_status AS "approvalStatus", m.created_at AS "createdAt"
    FROM merchants m JOIN users u ON u.id = m.user_id`;

export async function getMerchantByUserId(userId: string): Promise<MerchantAccount | null> {
  const r = await db.query(`${ACCOUNT_SELECT} WHERE u.id = $1`, [userId]);
  return r.rows[0] ?? null;
}

export async function getMerchantById(merchantId: string): Promise<MerchantAccount | null> {
  const r = await db.query(`${ACCOUNT_SELECT} WHERE m.id = $1`, [merchantId]);
  return r.rows[0] ?? null;
}

/**
 * Signs a portal session token in the same format the shared authenticateToken
 * middleware verifies, so merchant sessions work with existing RBAC.
 */
export function issueMerchantToken(account: MerchantAccount) {
  const payload: AuthenticatedUser = {
    id: account.userId,
    email: account.email,
    role: 'MERCHANT',
    merchantId: account.merchantId,
  };
  const accessToken = jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as SignOptions['expiresIn'],
  });
  return { accessToken, expiresIn: config.jwt.accessExpiresIn };
}

/** Merchant onboarding: creates the MERCHANT user and a PENDING merchant profile atomically. */
export async function registerMerchant(input: z.infer<typeof merchantRegisterSchema>): Promise<MerchantAccount> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role)
       VALUES ($1, $2, $3, $4, 'MERCHANT')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [input.email, passwordHash, input.fullName, input.phone ?? null]
    );
    if (user.rowCount === 0) throw new HttpError(409, 'An account with this email already exists');

    await client.query(
      `INSERT INTO merchants (user_id, company_name, registration_number, approval_status)
       VALUES ($1, $2, $3, 'PENDING')`,
      [user.rows[0].id, input.companyName, input.registrationNumber ?? null]
    );
    await client.query('COMMIT');
    return (await getMerchantByUserId(user.rows[0].id))!;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Verifies merchant credentials. Same error for unknown email / wrong password / non-merchant. */
export async function authenticateMerchant(email: string, password: string): Promise<MerchantAccount> {
  const r = await db.query(
    `SELECT u.id, u.password_hash, u.is_active FROM users u
      WHERE u.email = $1 AND u.role = 'MERCHANT'`,
    [email]
  );
  const row = r.rows[0];
  const valid = row ? await bcrypt.compare(password, row.password_hash) : false;
  if (!row || !valid) throw new HttpError(401, 'Invalid email or password');
  if (!row.is_active) throw new HttpError(403, 'This account has been deactivated');

  const account = await getMerchantByUserId(row.id);
  if (!account) throw new HttpError(403, 'No merchant profile is linked to this account');
  return account;
}

// -----------------------------------------------------------------------------
// Approval integration (callable by Member 5's dispatch module as well)
// -----------------------------------------------------------------------------
export async function setMerchantApproval(merchantId: string, status: ApprovalStatus): Promise<MerchantAccount> {
  const r = await db.query(`UPDATE merchants SET approval_status = $2 WHERE id = $1 RETURNING id`, [merchantId, status]);
  if (r.rowCount === 0) throw new HttpError(404, 'Merchant not found');
  return (await getMerchantById(merchantId))!;
}

export async function listMerchants(status?: ApprovalStatus) {
  const r = await db.query(
    `${ACCOUNT_SELECT} WHERE ($1::text IS NULL OR m.approval_status = $1) ORDER BY m.created_at DESC`,
    [status ?? null]
  );
  return r.rows as MerchantAccount[];
}

// -----------------------------------------------------------------------------
// API credentials
// -----------------------------------------------------------------------------
export async function listApiKeys(merchantId: string) {
  const r = await db.query(
    `SELECT id, name, key_prefix AS "keyPrefix", is_active AS "isActive",
            last_used_at AS "lastUsedAt", created_at AS "createdAt"
       FROM merchant_api_keys WHERE merchant_id = $1 ORDER BY is_active DESC, created_at DESC`,
    [merchantId]
  );
  return r.rows;
}

/** Creates a key. The plaintext is returned once; only its SHA-256 hash is stored. */
export async function generateApiKey(merchant: MerchantAccount, name: string) {
  if (merchant.approvalStatus !== 'APPROVED') {
    throw new HttpError(403, 'API keys can only be generated once your merchant account is approved');
  }
  const active = await db.query(
    `SELECT COUNT(*)::int AS n FROM merchant_api_keys WHERE merchant_id = $1 AND is_active`,
    [merchant.merchantId]
  );
  if (active.rows[0].n >= MAX_ACTIVE_KEYS) {
    throw new HttpError(409, `You already have ${MAX_ACTIVE_KEYS} active keys. Revoke one first.`);
  }

  const apiKey = API_KEY_PREFIX + crypto.randomBytes(24).toString('hex');
  const r = await db.query(
    `INSERT INTO merchant_api_keys (merchant_id, api_key_hash, key_prefix, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, key_prefix AS "keyPrefix", is_active AS "isActive", created_at AS "createdAt"`,
    [merchant.merchantId, sha256(apiKey), apiKey.slice(0, 16), name]
  );
  return { apiKey, key: r.rows[0] };
}

export async function revokeApiKey(merchantId: string, keyId: string) {
  const r = await db.query(
    `UPDATE merchant_api_keys SET is_active = FALSE WHERE id = $1 AND merchant_id = $2 RETURNING id`,
    [keyId, merchantId]
  );
  if (r.rowCount === 0) throw new HttpError(404, 'API key not found');
}

/** Resolves a raw API key to its merchant. Throws 401 for unknown/revoked keys, 403 if not approved. */
export async function resolveApiKey(rawKey: string) {
  if (!rawKey.startsWith(API_KEY_PREFIX)) throw new HttpError(401, 'Invalid or revoked API key');
  const r = await db.query(
    `UPDATE merchant_api_keys k SET last_used_at = NOW()
       FROM merchants m
      WHERE k.api_key_hash = $1 AND k.is_active AND m.id = k.merchant_id
      RETURNING k.id AS "keyId", m.id AS "merchantId", m.company_name AS "companyName",
                m.approval_status AS "approvalStatus"`,
    [sha256(rawKey)]
  );
  const row = r.rows[0];
  if (!row) throw new HttpError(401, 'Invalid or revoked API key');
  if (row.approvalStatus !== 'APPROVED') throw new HttpError(403, 'Merchant account is not approved');
  return row as { keyId: string; merchantId: string; companyName: string; approvalStatus: ApprovalStatus };
}

// -----------------------------------------------------------------------------
// Orders (always scoped to one merchant)
// -----------------------------------------------------------------------------
export const ORDER_COLUMNS = `
  p.id,
  p.tracking_number AS "trackingNumber",
  p.merchant_id AS "merchantId",
  p.sender_name AS "senderName",
  p.sender_phone AS "senderPhone",
  p.pickup_address AS "pickupAddress",
  p.recipient_name AS "recipientName",
  p.recipient_phone AS "recipientPhone",
  p.delivery_address AS "deliveryAddress",
  p.weight_kg::float AS "weightKg",
  p.dimension_length_cm::float AS "lengthCm",
  p.dimension_width_cm::float AS "widthCm",
  p.dimension_height_cm::float AS "heightCm",
  p.total_fee::float AS "totalFee",
  p.status,
  p.special_notes AS "specialNotes",
  p.created_at AS "createdAt",
  p.updated_at AS "updatedAt"`;

/** Filter groups used by the portal dashboard chips. */
export const ORDER_FILTERS: Record<string, string[]> = {
  pending: ['PENDING_PAYMENT', 'CONFIRMED', 'ASSIGNED'],
  transit: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'],
  delivered: ['DELIVERED'],
  exceptions: ['FAILED', 'RETURNED', 'CANCELLED'],
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Server-side fee from the configured delivery zone rates; client-sent fees are never trusted. */
export async function calculateOrderFee(input: OrderInput) {
  const zoneRes = input.zoneId
    ? await db.query('SELECT * FROM delivery_zones WHERE id = $1', [input.zoneId])
    : await db.query('SELECT * FROM delivery_zones ORDER BY base_rate ASC, created_at ASC LIMIT 1');
  const zone = zoneRes.rows[0];
  if (!zone) throw new HttpError(input.zoneId ? 404 : 503, input.zoneId ? 'Delivery zone not found' : 'No delivery zones configured');

  const volumetric =
    input.lengthCm && input.widthCm && input.heightCm ? (input.lengthCm * input.widthCm * input.heightCm) / VOLUMETRIC_DIVISOR : 0;
  const chargeableKg = Math.max(input.weightKg, volumetric);
  const distanceKm = input.distanceKm ?? DEFAULT_DISTANCE_KM;
  const total = Number(zone.base_rate) + chargeableKg * Number(zone.per_kg_rate) + distanceKm * Number(zone.per_km_rate);
  return { zoneName: zone.zone_name as string, chargeableKg: round2(chargeableKg), distanceKm, totalFee: round2(total) };
}

/** Creates an order owned by `merchantId`. The merchant id never comes from the request body. */
export async function createMerchantOrder(merchantId: string, input: OrderInput) {
  const fee = await calculateOrderFee(input);
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    let order;
    for (let attempt = 0; attempt < 5 && !order; attempt++) {
      const r = await client.query(
        `INSERT INTO parcels (
           tracking_number, merchant_id, sender_name, sender_phone, pickup_address,
           recipient_name, recipient_phone, delivery_address, weight_kg,
           dimension_length_cm, dimension_width_cm, dimension_height_cm, total_fee, status, special_notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'CONFIRMED',$14)
         ON CONFLICT (tracking_number) DO NOTHING
         RETURNING id`,
        [
          generateTrackingNumber(),
          merchantId,
          input.senderName,
          input.senderPhone,
          input.pickupAddress,
          input.recipientName,
          input.recipientPhone,
          input.deliveryAddress,
          input.weightKg,
          input.lengthCm ?? null,
          input.widthCm ?? null,
          input.heightCm ?? null,
          fee.totalFee,
          input.specialNotes ?? null,
        ]
      );
      order = r.rows[0];
    }
    if (!order) throw new HttpError(500, 'Could not allocate a unique tracking number');

    await client.query(
      `INSERT INTO parcel_status_history (parcel_id, status, location_name, note)
       VALUES ($1, 'CONFIRMED', $2, 'Order received from merchant')`,
      [order.id, fee.zoneName]
    );
    await client.query('COMMIT');

    const full = await db.query(`SELECT ${ORDER_COLUMNS} FROM parcels p WHERE p.id = $1`, [order.id]);
    return { order: full.rows[0], fee };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function listMerchantOrders(
  merchantId: string,
  opts: { filter?: string; search?: string; limit?: number; offset?: number } = {}
) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const params: unknown[] = [merchantId];
  let where = 'p.merchant_id = $1';

  const statuses = opts.filter ? ORDER_FILTERS[opts.filter] : undefined;
  if (opts.filter && opts.filter !== 'all' && !statuses) throw new HttpError(400, `Unknown filter '${opts.filter}'`);
  if (statuses) {
    params.push(statuses);
    where += ` AND p.status::text = ANY($${params.length}::text[])`;
  }
  if (opts.search) {
    params.push(`%${opts.search}%`);
    where += ` AND (p.tracking_number ILIKE $${params.length} OR p.recipient_name ILIKE $${params.length})`;
  }

  const [rows, total] = await Promise.all([
    db.query(`SELECT ${ORDER_COLUMNS} FROM parcels p WHERE ${where} ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    db.query(`SELECT COUNT(*)::int AS n FROM parcels p WHERE ${where}`, params),
  ]);
  return { orders: rows.rows, total: total.rows[0].n, limit, offset };
}

export async function getMerchantOrder(merchantId: string, orderIdOrTracking: string) {
  const r = await db.query(
    `SELECT ${ORDER_COLUMNS} FROM parcels p
      WHERE (p.id::text = $1 OR p.tracking_number = $1) AND p.merchant_id = $2`,
    [orderIdOrTracking, merchantId]
  );
  // Another merchant's order is reported as "not found" so IDs cannot be probed.
  if (!r.rows[0]) throw new HttpError(404, 'Order not found');
  const history = await db.query(
    `SELECT status, location_name AS "location", note, created_at AS "timestamp"
       FROM parcel_status_history WHERE parcel_id = $1 ORDER BY created_at ASC`,
    [r.rows[0].id]
  );
  return { ...r.rows[0], history: history.rows };
}

export async function getMerchantStats(merchantId: string) {
  const r = await db.query(
    `SELECT COUNT(*)::int AS "total",
            COUNT(*) FILTER (WHERE status::text = ANY($2::text[]))::int AS "pending",
            COUNT(*) FILTER (WHERE status::text = ANY($3::text[]))::int AS "transit",
            COUNT(*) FILTER (WHERE status = 'DELIVERED')::int AS "delivered",
            COUNT(*) FILTER (WHERE status::text = ANY($4::text[]))::int AS "exceptions",
            COALESCE(SUM(total_fee), 0)::float AS "totalSpend"
       FROM parcels WHERE merchant_id = $1`,
    [merchantId, ORDER_FILTERS.pending, ORDER_FILTERS.transit, ORDER_FILTERS.exceptions]
  );
  return r.rows[0];
}
