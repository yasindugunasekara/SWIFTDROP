import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth.js';

const router = Router();

// Member 7 — Notification Preferences & Delivery Inbox
router.use(authenticateToken);

// User notification delivery inbox
router.get('/inbox', async (req: Request, res: Response) => {
  res.json({ notifications: [] });
});

// Update notification preferences (SMS, Email, Push)
router.put('/preferences', async (req: Request, res: Response) => {
  res.json({ message: 'Notification preferences updated' });
});

// Mark notification as read
router.patch('/:id/read', async (req: Request, res: Response) => {
  res.json({ message: 'Notification marked as read' });
});

export default router;
