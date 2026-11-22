import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { createSupabaseClient } from '../../config/supabase.js';

const router = Router();
router.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
router.use(authenticateToken, requireRoles(['ADMIN']));
router.get('/users', async (req, res) => {
  try {
    const page = z.coerce.number().int().min(1).max(10000).default(1).parse(req.query.page);
    const role = z.enum(['CUSTOMER', 'COURIER', 'MERCHANT', 'DISPATCHER', 'ADMIN']).optional().parse(req.query.role);
    const { data, error } = await createSupabaseClient(req.headers.authorization!.slice(7))
      .rpc('admin_user_directory_search', { page_number: page, role_filter: role ?? null, search_text: z.string().trim().max(100).optional().parse(req.query.search) || null });
    if (error) {
      console.error('Admin directory unavailable:', error.code);
      res.status(error.code === '42501' ? 403 : 503).json({ error: 'Accounts are temporarily unavailable. Please try again.' });
      return;
    }
    res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ error: 'Invalid user filter.' }); return; }
    console.error('Admin directory request failed');
    res.status(503).json({ error: 'Accounts are temporarily unavailable. Please try again.' });
  }
});
export default router;
