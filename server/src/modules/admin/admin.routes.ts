import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { createSupabaseClient } from '../../config/supabase.js';
import { db } from '../../config/database.js';
import type { AuthRequest } from '../../middleware/auth.js';

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
router.patch('/users/:id',async(req:AuthRequest,res)=>{
  try {
    const id=z.string().uuid().parse(req.params.id);
    const changes=z.object({fullName:z.string().trim().min(2).max(150).optional(),phone:z.string().trim().max(30).optional(),isActive:z.boolean().optional()})
      .strict().refine(value=>Object.keys(value).length>0).parse(req.body);
    const result=await db.query('SELECT public.manage_delivery_user($1,$2,$3::jsonb) AS account',[id,req.user!.id,JSON.stringify(changes)]);
    res.json({account:result.rows[0].account});
  } catch(error) {
    if(error instanceof z.ZodError) {res.status(400).json({error:'Invalid account changes.'});return;}
    const message=error instanceof Error?error.message:'';
    if(['You cannot deactivate your own account','The last administrator must remain active','Account not found'].includes(message)) {
      res.status(message==='Account not found'?404:409).json({error:message});return;
    }
    res.status(503).json({error:'Unable to update this account.'});
  }
});
export default router;
