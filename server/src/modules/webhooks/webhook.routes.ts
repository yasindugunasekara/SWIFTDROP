import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';

const router = Router();

// Member 8 — Merchant Webhook Center
router.use(authenticateToken);
router.use(requireRoles(['MERCHANT', 'ADMIN']));

// Register Webhook Endpoint
router.post('/endpoints', async (req: Request, res: Response) => {
  // TODO [Member 8]: Validate URL, generate signing secret, store endpoint
  res.status(201).json({
    message: 'Webhook endpoint registered',
    endpointId: 'wh_ep_123',
    secret: 'whsec_sample_secret_key'
  });
});

// Get Webhook Delivery Attempt History & DLQ
router.get('/deliveries', async (req: Request, res: Response) => {
  res.json({ attempts: [], deadLetters: [] });
});

// Retry Failed Webhook Delivery Manually
router.post('/deliveries/:id/retry', async (req: Request, res: Response) => {
  res.json({ message: 'Delivery retry queued' });
});

export default router;
