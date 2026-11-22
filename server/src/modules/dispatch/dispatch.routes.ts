import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { databaseDispatchService as dispatchService } from './dispatch.database.js';

const router = Router();

// =============================================================================
// MEMBER 5: DISPATCH, ASSIGNMENT & SERVICE CONFIGURATION ROUTER
// =============================================================================

// Strict RBAC Enforcement: Only DISPATCHER and ADMIN roles are authorized
router.use(authenticateToken);
router.use(requireRoles(['DISPATCHER', 'ADMIN']));

// -----------------------------------------------------------------------------
// 1. Unassigned Parcel Board
// -----------------------------------------------------------------------------
router.get('/unassigned', async (req: Request, res: Response) => {
  try {
    const zone = typeof req.query.zone === 'string' ? req.query.zone : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const parcels = await dispatchService.getUnassignedParcels(zone, search);
    res.json({
      success: true,
      count: parcels.length,
      parcels
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch unassigned parcels' });
  }
});

// -----------------------------------------------------------------------------
// 2. Active Couriers & Workload Balancer
// -----------------------------------------------------------------------------
router.get('/couriers', async (req: Request, res: Response) => {
  try {
    const couriers = await dispatchService.getCourierWorkloads();
    res.json({
      success: true,
      count: couriers.length,
      couriers
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch courier workloads' });
  }
});

// Alias for courier workloads
router.get('/courier-workloads', async (req: Request, res: Response) => {
  try {
    const couriers = await dispatchService.getCourierWorkloads();
    res.json({
      success: true,
      count: couriers.length,
      workloads: couriers
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch courier workloads' });
  }
});

// -----------------------------------------------------------------------------
// 3. Single & Bulk Parcel Assignment
// -----------------------------------------------------------------------------
const assignSchema = z.object({
  courierId: z.string().min(1, 'Courier ID is required'),
  parcelId: z.string().min(1).optional(),
  parcelIds: z.array(z.string().min(1)).min(1).optional(),
  notes: z.string().max(500).optional()
}).refine(data => data.parcelId || (data.parcelIds && data.parcelIds.length > 0), {
  message: 'Either parcelId or parcelIds must be specified'
});

router.post('/assign', async (req: Request, res: Response) => {
  try {
    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: parsed.error.flatten()
      });
    }

    const { courierId, parcelId, parcelIds, notes } = parsed.data;
    const dispatcherId = (req as any).user?.id;

    if (parcelIds && parcelIds.length > 0) {
      const batchResult = await dispatchService.bulkAssignParcels(courierId, parcelIds, dispatcherId);
      return res.json({
        success: batchResult.failed.length === 0,
        message: `Assigned ${batchResult.assigned.length} parcel(s) successfully${batchResult.failed.length > 0 ? `, ${batchResult.failed.length} failed` : ''}`,
        ...batchResult
      });
    }

    if (parcelId) {
      const result = await dispatchService.assignParcel(courierId, parcelId, dispatcherId, notes);
      return res.json({
        success: true,
        message: 'Parcel assigned successfully to courier',
        assignment: result
      });
    }

    return res.status(400).json({ success: false, error: 'No parcel ID provided' });
  } catch (err: any) {
    const status = err.message?.includes('capacity exceeded') ||
                   err.message?.includes('offline') ||
                   err.message?.includes('cannot be assigned') ||
                   err.message?.includes('exceeds available')
      ? 400
      : (err.message?.includes('not found') ? 404 : 500);

    return res.status(status).json({ success: false, error: 'Assignment failed' });
  }
});

// -----------------------------------------------------------------------------
// 4. Service Rates, Pricing & Delivery Zone Configuration
// -----------------------------------------------------------------------------
const configUpdateSchema = z.object({
  maxCourierCapacity:z.number().int().min(1).max(100).optional(),
  baseBookingFee: z.number().nonnegative('Base booking fee cannot be negative').optional(),
  perKgRate: z.number().nonnegative('Per-kg rate cannot be negative').optional(),
  perKmRate: z.number().nonnegative('Per-km rate cannot be negative').optional(),
  holidaySurgeMultiplier: z.number().min(1.0, 'Holiday surge multiplier must be >= 1.0').max(5.0, 'Holiday surge multiplier cannot exceed 5.0').optional(),
  peakHourSurgeMultiplier: z.number().min(1.0, 'Peak hour surge multiplier must be >= 1.0').max(5.0, 'Peak hour surge multiplier cannot exceed 5.0').optional(),
  zones: z.array(z.object({
    id: z.string(),
    zoneName: z.string().min(1),
    baseRate: z.number().nonnegative(),
    perKgRate: z.number().nonnegative(),
    perKmRate: z.number().nonnegative(),
    isActive: z.boolean().default(true)
  })).optional()
});

router.get('/config', async (req: Request, res: Response) => {
  try {
    const config = await dispatchService.getServiceConfig();
    res.json({ success: true, config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch config' });
  }
});

router.put('/config', async (req: Request, res: Response) => {
  try {
    const parsed = configUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration parameters',
        details: parsed.error.flatten()
      });
    }

    const updated = await dispatchService.updateServiceConfig(parsed.data);
    res.json({
      success: true,
      message: 'Service rates and zone configuration updated successfully',
      config: updated
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Failed to update config' });
  }
});

// Alias for PUT /config/pricing-zones
router.put('/config/pricing-zones', async (req: Request, res: Response) => {
  try {
    const parsed = configUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid configuration parameters',
        details: parsed.error.flatten()
      });
    }

    const updated = await dispatchService.updateServiceConfig(parsed.data);
    res.json({
      success: true,
      message: 'Pricing and zone configuration updated',
      config: updated
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Failed to update config' });
  }
});

// -----------------------------------------------------------------------------
// 5. Merchant Approvals
// -----------------------------------------------------------------------------
const merchantApprovalSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED'])
});

router.get('/merchants', async (req: Request, res: Response) => {
  try {
    const status = req.query.status as any;
    const merchants = await dispatchService.listMerchants(status);
    res.json({ success: true, count: merchants.length, merchants });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to list merchants' });
  }
});

router.post('/merchants/:merchantId/approve', async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const merchant = await dispatchService.setMerchantApproval(merchantId, 'APPROVED');
    res.json({
      success: true,
      message: 'Merchant approved successfully',
      merchant
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to approve merchant' });
  }
});

router.patch('/merchants/:merchantId/approval', async (req: Request, res: Response) => {
  try {
    const merchantId = req.params.merchantId;
    const parsed = merchantApprovalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Status must be PENDING, APPROVED, or REJECTED' });
    }

    const merchant = await dispatchService.setMerchantApproval(merchantId, parsed.data.status);
    res.json({
      success: true,
      message: `Merchant status updated to ${parsed.data.status}`,
      merchant
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update merchant status' });
  }
});

// -----------------------------------------------------------------------------
// 6. AI Smart Dispatch Matcher
// -----------------------------------------------------------------------------
router.post('/smart-match', async (req: Request, res: Response) => {
  try {
    const parcelId = req.body.parcelId;
    if (!parcelId) {
      return res.status(400).json({ success: false, error: 'parcelId is required' });
    }

    const recommendation = await dispatchService.getSmartDispatchRecommendation(parcelId);
    res.json({
      success: true,
      recommendation
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: 'Failed to generate dispatch recommendation' });
  }
});

export default router;
