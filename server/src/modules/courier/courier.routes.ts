import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';

const router = Router();

// Member 4 — Courier Task Execution
router.use(authenticateToken);
router.use(requireRoles(['COURIER', 'ADMIN']));

// Get Assigned Delivery Jobs
router.get('/jobs', async (req: Request, res: Response) => {
  res.json({ assignedJobs: [] });
});

// Update Status (Picked Up, In Transit, Delivered, Failed)
router.patch('/jobs/:parcelId/status', async (req: Request, res: Response) => {
  // TODO [Member 4]: Verify parcel is assigned to this courier & validate state transition
  res.json({ message: 'Courier status updated successfully' });
});

// Upload Proof of Delivery Photo
router.post('/jobs/:parcelId/proof', async (req: Request, res: Response) => {
  // TODO [Member 4]: Handle multipart photo upload & attach proof record
  res.json({ message: 'Proof photo uploaded successfully' });
});

export default router;
