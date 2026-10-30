import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';

const router = Router();

// Member 10 — Parcel Support & Exception Management
router.use(authenticateToken);
router.use(requireRoles(['DISPATCHER', 'ADMIN']));

// List parcel exceptions and failed deliveries
router.get('/exceptions', async (req: Request, res: Response) => {
  res.json({ exceptions: [] });
});

// Add support note and update resolution status
router.post('/exceptions/:parcelId/notes', async (req: Request, res: Response) => {
  // TODO [Member 10]: Record support note, log audit details (who changed what)
  res.status(201).json({ message: 'Support resolution note recorded' });
});

// Update exception resolution status (e.g. RESCHEDULED, RETURN_TO_SENDER, REFUNDED)
router.patch('/exceptions/:parcelId/status', async (req: Request, res: Response) => {
  res.json({ message: 'Exception resolution status updated' });
});

export default router;
