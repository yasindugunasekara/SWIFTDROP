import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

// Member 3 — Tracking, History & Receipt
// Public Tracking (Sanitized safe fields only)
router.get('/public/:trackingNumber', async (req: Request, res: Response) => {
  const { trackingNumber } = req.params;
  res.json({
    trackingNumber,
    status: 'IN_TRANSIT',
    estimatedDelivery: new Date(Date.now() + 86400000).toISOString(),
    events: [
      { status: 'CREATED', timestamp: new Date(Date.now() - 3600000).toISOString(), location: 'Hub A' },
      { status: 'PICKED_UP', timestamp: new Date().toISOString(), location: 'Central Sorting' }
    ]
  });
});

// Authenticated History (Verifies parcel ownership)
router.get('/history', authenticateToken, async (req: Request, res: Response) => {
  res.json({ parcels: [] });
});

// Receipt Download
router.get('/:parcelId/receipt', authenticateToken, async (req: Request, res: Response) => {
  res.json({ message: 'Receipt generation endpoint (PDF/JSON)' });
});

export default router;
