import { Router, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authenticateToken, AuthRequest } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { apiRateLimiter } from '../../middleware/rate-limiter.js';
import { asyncHandler, HttpError } from './merchant.utils.js';
import {
  APPROVAL_STATUSES,
  ApprovalStatus,
  MerchantAccount,
  authenticateMerchant,
  createMerchantOrder,
  generateApiKey,
  getMerchantById,
  getMerchantByUserId,
  getMerchantOrder,
  getMerchantStats,
  issueMerchantToken,
  listApiKeys,
  listMerchantOrders,
  listMerchants,
  merchantLoginSchema,
  merchantRegisterSchema,
  orderInputSchema,
  registerMerchant,
  resolveApiKey,
  revokeApiKey,
  setMerchantApproval,
} from './merchant.service.js';

const router = Router();

// =============================================================================
// Member 6 — Merchant Account, Orders & Partner API
// =============================================================================

interface MerchantRequest extends AuthRequest {
  /** Set by authenticateApiKey (partner API) */
  partner?: { keyId: string; merchantId: string; companyName: string };
  /** Set by loadPortalMerchant (portal JWT session) */
  merchant?: MerchantAccount;
}

const envInt = (name: string, fallback: number) => {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// -----------------------------------------------------------------------------
// Rate limits
// -----------------------------------------------------------------------------
/** Partner API: requests per merchant per minute (keyed by merchant, not IP). */
export const PARTNER_RATE_LIMIT = envInt('MERCHANT_API_RATE_LIMIT', 60);
const partnerRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: PARTNER_RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `merchant:${(req as MerchantRequest).partner?.merchantId}`,
  message: { status: 429, error: `Rate limit exceeded: ${PARTNER_RATE_LIMIT} requests per minute per merchant` },
});

/** Sign-in: failed attempts per IP + email per 15 minutes (brute-force protection). */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: envInt('MERCHANT_LOGIN_RATE_LIMIT', 10),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
  message: { status: 429, error: 'Too many failed sign-in attempts. Try again in 15 minutes.' },
});

// -----------------------------------------------------------------------------
// Auth middleware
// -----------------------------------------------------------------------------
/** Partner API authentication: `X-API-Key: sw_live_...` or `Authorization: Bearer sw_live_...`. */
const authenticateApiKey = asyncHandler<MerchantRequest>(async (req, _res, next: NextFunction) => {
  const header = req.headers['x-api-key'];
  const auth = req.headers.authorization;
  const rawKey = (Array.isArray(header) ? header[0] : header) || (auth?.startsWith('Bearer ') ? auth.slice(7) : '');
  if (!rawKey) throw new HttpError(401, 'Merchant API key required (X-API-Key header)');
  req.partner = await resolveApiKey(rawKey.trim());
  next();
});

/** Loads the signed-in merchant's profile for portal routes. */
const loadPortalMerchant = asyncHandler<MerchantRequest>(async (req, _res, next: NextFunction) => {
  const account = await getMerchantByUserId(req.user!.id);
  if (!account) throw new HttpError(404, 'Merchant profile not found');
  req.merchant = account;
  next();
});

const portal = [authenticateToken, requireRoles(['MERCHANT']), loadPortalMerchant];

const toPublicAccount = (a: MerchantAccount) => ({
  id: a.merchantId,
  name: a.companyName,
  registrationNumber: a.registrationNumber,
  status: a.approvalStatus,
  createdAt: a.createdAt,
  contact: { userId: a.userId, fullName: a.fullName, email: a.email, phone: a.phone },
});

/** Shape stored by the web client's saveAuthSession(). */
const toSessionUser = (a: MerchantAccount) => ({
  id: a.userId,
  email: a.email,
  fullName: a.fullName,
  role: 'MERCHANT' as const,
  merchantId: a.merchantId,
  approvalStatus: a.approvalStatus,
});

// -----------------------------------------------------------------------------
// 1. Merchant onboarding & sign-in
// -----------------------------------------------------------------------------
router.post(
  '/register',
  apiRateLimiter,
  asyncHandler(async (req, res) => {
    const account = await registerMerchant(merchantRegisterSchema.parse(req.body));
    res.status(201).json({
      message: 'Merchant registered. Your account is pending approval.',
      user: toSessionUser(account),
      merchant: toPublicAccount(account),
      ...issueMerchantToken(account),
    });
  })
);

router.post(
  '/login',
  loginRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = merchantLoginSchema.parse(req.body);
    const account = await authenticateMerchant(email, password);
    res.json({
      message: 'Login successful',
      user: toSessionUser(account),
      merchant: toPublicAccount(account),
      ...issueMerchantToken(account),
    });
  })
);

// -----------------------------------------------------------------------------
// 2. Merchant portal (JWT session, scoped to the signed-in merchant)
// -----------------------------------------------------------------------------
router.get(
  '/profile',
  authenticateToken,
  requireRoles(['MERCHANT', 'ADMIN']),
  asyncHandler<MerchantRequest>(async (req, res) => {
    let account: MerchantAccount | null;
    if (req.user!.role === 'ADMIN') {
      if (!req.query.merchantId) throw new HttpError(400, 'Pass ?merchantId= to view a merchant');
      account = await getMerchantById(String(req.query.merchantId));
    } else {
      account = await getMerchantByUserId(req.user!.id);
    }
    if (!account) throw new HttpError(404, 'Merchant profile not found');
    res.json({ merchant: { ...toPublicAccount(account), stats: await getMerchantStats(account.merchantId) } });
  })
);

router.get(
  '/orders',
  ...portal,
  asyncHandler<MerchantRequest>(async (req, res) => {
    const result = await listMerchantOrders(req.merchant!.merchantId, {
      filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
      search: typeof req.query.search === 'string' && req.query.search.trim() ? req.query.search.trim() : undefined,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json({ ...result, stats: await getMerchantStats(req.merchant!.merchantId) });
  })
);

router.get(
  '/orders/:orderId',
  ...portal,
  asyncHandler<MerchantRequest>(async (req, res) => {
    res.json({ order: await getMerchantOrder(req.merchant!.merchantId, String(req.params.orderId)) });
  })
);

router.post(
  '/orders',
  ...portal,
  asyncHandler<MerchantRequest>(async (req, res) => {
    if (req.merchant!.approvalStatus !== 'APPROVED') {
      throw new HttpError(403, 'Orders can only be created once your merchant account is approved');
    }
    const { order, fee } = await createMerchantOrder(req.merchant!.merchantId, orderInputSchema.parse(req.body));
    res.status(201).json({ message: 'Order created', order, fee });
  })
);

router.get(
  '/api-keys',
  ...portal,
  asyncHandler<MerchantRequest>(async (req, res) => {
    res.json({ apiKeys: await listApiKeys(req.merchant!.merchantId) });
  })
);

router.post(
  '/api-keys/generate',
  ...portal,
  asyncHandler<MerchantRequest>(async (req, res) => {
    const { name } = z
      .object({ name: z.string().trim().min(1).max(100).default('Production key') })
      .parse(req.body ?? {});
    const { apiKey, key } = await generateApiKey(req.merchant!, name);
    res.status(201).json({ apiKey, key, warning: 'Store this key now. It will not be shown again.' });
  })
);

router.delete(
  '/api-keys/:keyId',
  ...portal,
  asyncHandler<MerchantRequest>(async (req, res) => {
    await revokeApiKey(req.merchant!.merchantId, String(req.params.keyId));
    res.json({ message: 'API key revoked' });
  })
);

// -----------------------------------------------------------------------------
// 3. Approval integration (ADMIN / DISPATCHER). Member 5 can call
//    setMerchantApproval() from the dispatch module for the same effect.
// -----------------------------------------------------------------------------
router.get(
  '/admin/merchants',
  authenticateToken,
  requireRoles(['ADMIN', 'DISPATCHER']),
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : undefined;
    if (status && !APPROVAL_STATUSES.includes(status as ApprovalStatus)) throw new HttpError(400, 'Invalid status filter');
    const merchants = await listMerchants(status as ApprovalStatus | undefined);
    res.json({ merchants: merchants.map(toPublicAccount) });
  })
);

router.patch(
  '/admin/:merchantId/approval',
  authenticateToken,
  requireRoles(['ADMIN', 'DISPATCHER']),
  asyncHandler(async (req, res) => {
    const { status } = z.object({ status: z.enum(APPROVAL_STATUSES) }).parse(req.body);
    const account = await setMerchantApproval(String(req.params.merchantId), status);
    res.json({ message: `Merchant ${status.toLowerCase()}`, merchant: toPublicAccount(account) });
  })
);

// -----------------------------------------------------------------------------
// 4. Partner B2B API (API key, per-merchant rate limit, merchant-isolated)
// -----------------------------------------------------------------------------
const partner = [apiRateLimiter, authenticateApiKey, partnerRateLimiter];

router.post(
  '/partner/orders',
  ...partner,
  asyncHandler<MerchantRequest>(async (req, res) => {
    const { order, fee } = await createMerchantOrder(req.partner!.merchantId, orderInputSchema.parse(req.body));
    res.status(201).json({
      message: 'Partner order created via B2B API',
      orderId: order.id,
      trackingNumber: order.trackingNumber,
      status: order.status,
      totalFee: order.totalFee,
      currency: 'LKR',
      fee,
    });
  })
);

router.get(
  '/partner/orders',
  ...partner,
  asyncHandler<MerchantRequest>(async (req, res) => {
    const result = await listMerchantOrders(req.partner!.merchantId, {
      filter: typeof req.query.filter === 'string' ? req.query.filter : undefined,
      limit: Number(req.query.limit) || 50,
      offset: Number(req.query.offset) || 0,
    });
    res.json(result);
  })
);

router.get(
  '/partner/orders/:orderId',
  ...partner,
  asyncHandler<MerchantRequest>(async (req, res) => {
    res.json({ order: await getMerchantOrder(req.partner!.merchantId, String(req.params.orderId)) });
  })
);

export default router;
