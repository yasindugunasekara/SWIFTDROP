import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

// Member 2 — Customer Booking & Fee Quote
router.post('/quote', async (req: Request, res: Response) => {
  // TODO [Member 2]: Server-side dynamic fee calculation based on distance, weight, dimensions
  const { weightKg, pickupAddress, dropoffAddress } = req.body;
  res.json({
    baseFee: 15.00,
    weightFee: (weightKg || 1) * 2.5,
    totalEstimatedFee: 17.50,
    currency: 'USD'
  });
});

router.post('/create', authenticateToken, async (req: Request, res: Response) => {
  // TODO [Member 2]: Validate booking request, enforce server-calculated fee, save parcel
  res.status(201).json({
    message: 'Parcel booking created successfully',
    parcelId: 'mock_parcel_id',
    trackingNumber: 'SWIFT-12345678'
  });
});

export default router;
