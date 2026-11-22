import { Router, Request, Response, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, AuthRequest } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import {
  TrackingError,
  buildReceipt,
  getCustomerParcel,
  getPublicTracking,
  listCustomerParcels,
  renderReceiptHtml,
} from './tracking.service.js';

// Member 3 — Tracking, History & Receipt
//
//   GET /config                                 public: live-tracking WebSocket URL (or null)
//   GET /public/:trackingNumber                 public, safe fields only, rate limited
//   WS  /ws/tracking                            live updates, see tracking.socket.ts
//   GET /history                                CUSTOMER: own parcels (?status=&limit=&offset=)
//   GET /history/:trackingNumber                CUSTOMER: own parcel with full timeline
//   GET /history/:trackingNumber/receipt        CUSTOMER: receipt (?format=json|html)
//                                               409 while payment is pending
//
// Status codes: 400 bad input · 401 no/invalid token · 403 wrong role ·
// 404 unknown tracking number OR not the caller's parcel (no ownership probing).

function sendError(res: Response, error: unknown, fallback: string) {
  if (error instanceof TrackingError) return res.status(error.status).json({ error: error.message });
  console.error('tracking operation unavailable');
  return res.status(500).json({ error: fallback });
}

export function createPublicTrackingLimiter(max = 60): RequestHandler {
  return rateLimit({
    windowMs: 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 429, error: 'Too many tracking lookups, please try again in a minute.' },
  });
}

export interface TrackingRouterOptions {
  /** Authentication middleware; tests inject one backed by a stub gateway. */
  auth?: RequestHandler;
  publicLimiter?: RequestHandler;
}

export function createTrackingRouter(options: TrackingRouterOptions = {}): Router {
  const auth = options.auth ?? (authenticateToken as RequestHandler);
  const publicLimiter = options.publicLimiter ?? createPublicTrackingLimiter();
  // Private responses carry names, phones and addresses: never cache them.
  const noStore: RequestHandler = (_req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); };
  const customerOnly = [noStore, auth, requireRoles(['CUSTOMER']) as RequestHandler];
  const router = Router();

  // Runtime client config: where to open the live-tracking WebSocket. Null when
  // no standalone WebSocket server is reachable (e.g. Vercel serverless), in
  // which case clients fall back to polling the public endpoint.
  router.get('/config', (_req: Request, res: Response) => {
    res.set('Cache-Control', 'no-store');
    return res.json({ websocketUrl: process.env.TRACKING_WS_URL || null, pollIntervalMs: 20_000 });
  });

  router.get('/public/:trackingNumber', publicLimiter, async (req: Request, res: Response) => {
    try {
      res.set('Cache-Control', 'no-store');
      return res.json(await getPublicTracking(req.params.trackingNumber));
    } catch (error) {
      return sendError(res, error, 'Failed to load tracking information');
    }
  });

  router.get('/history', ...customerOnly, async (req: AuthRequest, res: Response) => {
    try {
      return res.json(await listCustomerParcels(req.user!.id, req.query));
    } catch (error) {
      return sendError(res, error, 'Failed to load delivery history');
    }
  });

  router.get('/history/:trackingNumber', ...customerOnly, async (req: AuthRequest, res: Response) => {
    try {
      return res.json({ parcel: await getCustomerParcel(req.user!.id, req.params.trackingNumber) });
    } catch (error) {
      return sendError(res, error, 'Failed to load parcel details');
    }
  });

  router.get('/history/:trackingNumber/receipt', ...customerOnly, async (req: AuthRequest, res: Response) => {
    try {
      const format = String(req.query.format ?? 'json').toLowerCase();
      if (format !== 'json' && format !== 'html') {
        throw new TrackingError(400, 'Unsupported receipt format. Use json or html.');
      }
      const receipt = await buildReceipt(req.user!.id, req.params.trackingNumber);
      if (format === 'html') {
        res.set('Content-Type', 'text/html; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="swiftdrop-receipt-${receipt.trackingNumber}.html"`);
        return res.send(renderReceiptHtml(receipt));
      }
      return res.json({ receipt });
    } catch (error) {
      return sendError(res, error, 'Failed to generate receipt');
    }
  });

  return router;
}

export default createTrackingRouter();
