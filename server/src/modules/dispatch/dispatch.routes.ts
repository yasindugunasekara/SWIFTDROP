import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';

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
router.patch('/merchants/:merchantId/approval', async (req: Request, res: Response) => {
  res.json({ message: 'Merchant onboarding approval updated' });
});

export default router;
