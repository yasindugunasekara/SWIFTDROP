import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { apiRateLimiter } from '../../middleware/rate-limiter.js';

const router = Router();

// Member 6 — Merchant Account, Orders & Partner API
// Merchant Portal Management
router.get('/profile', authenticateToken, requireRoles(['MERCHANT', 'ADMIN']), async (req: Request, res: Response) => {
  res.json({ merchant: { name: 'Demo Merchant', status: 'APPROVED' } });
});

router.post('/api-keys/generate', authenticateToken, requireRoles(['MERCHANT']), async (req: Request, res: Response) => {
  res.json({ apiKey: 'sw_live_mock_key_99887766' });
});

// Partner B2B Secured API (Order Creation & Queries)
router.post('/partner/orders', apiRateLimiter, async (req: Request, res: Response) => {
  // TODO [Member 6]: Validate API Key, scope order creation to merchant, enforce rate limit
  res.status(201).json({
    message: 'Partner order created via B2B API',
    orderId: 'ORD-98765'
  });
});

router.get('/partner/orders', apiRateLimiter, async (req: Request, res: Response) => {
  // TODO [Member 6]: Return merchant-isolated orders only
  res.json({ orders: [] });
});

export default router;
