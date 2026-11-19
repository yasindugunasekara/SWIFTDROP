import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { z } from 'zod';
import { setMerchantApproval } from '../merchant/merchant.service.js';
import { asyncHandler } from '../merchant/merchant.utils.js';

const router = Router();

// Member 5 — Dispatch, Assignment & Service Configuration
router.use(authenticateToken);
router.use(requireRoles(['DISPATCHER', 'ADMIN']));

// Get unassigned parcels
router.get('/unassigned', async (req: Request, res: Response) => {
  res.json({ unassignedParcels: [] });
});

// Courier workload queries
router.get('/courier-workloads', async (req: Request, res: Response) => {
  res.json({ workloads: [] });
});

// Assign parcel to courier
router.post('/assign', async (req: Request, res: Response) => {
  // TODO [Member 5]: Prevent assigning unavailable couriers, record assignment
  res.json({ message: 'Parcel assigned successfully' });
});

// Zone & Pricing settings
router.put('/config/pricing-zones', async (req: Request, res: Response) => {
  res.json({ message: 'Pricing and zone configuration updated' });
});

// Merchant approvals
router.patch('/merchants/:merchantId/approval', asyncHandler(async (req, res) => {
  const merchantId = z.string().uuid().parse(req.params.merchantId);
  const { status } = z.object({ status: z.enum(['PENDING', 'APPROVED', 'REJECTED']) }).strict().parse(req.body);
  res.json({ merchant: await setMerchantApproval(merchantId, status) });
}));

export default router;
