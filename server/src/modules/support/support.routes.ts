import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { supportService, ResolutionStatus } from './support.service.js';

const router = Router();

// All support endpoints require authentication
router.use(authenticateToken);

// -----------------------------------------------------------------------------
// 1. GET /api/v1/support/exceptions - List parcel exceptions & failed deliveries
// -----------------------------------------------------------------------------
router.get(
  '/exceptions',
  requireRoles(['DISPATCHER', 'ADMIN', 'COURIER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, search } = req.query;
      const exceptions = await supportService.listExceptions({
        status: status as string,
        search: search as string,
      });

      return res.json({
        count: exceptions.length,
        exceptions,
      });
    } catch (err: any) {
      console.error('Error fetching exceptions:', err);
      return res.status(500).json({ error: err.message || 'Failed to list exceptions' });
    }
  }
);

// -----------------------------------------------------------------------------
// 2. GET /api/v1/support/exceptions/:id - Get detailed exception with audit logs
// -----------------------------------------------------------------------------
router.get(
  '/exceptions/:id',
  requireRoles(['DISPATCHER', 'ADMIN', 'COURIER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const exception = await supportService.getExceptionById(req.params.id);
      if (!exception) {
        return res.status(404).json({ error: `Exception not found for ID: ${req.params.id}` });
      }

      return res.json({ exception });
    } catch (err: any) {
      console.error('Error fetching exception detail:', err);
      return res.status(500).json({ error: err.message || 'Failed to retrieve exception details' });
    }
  }
);

// -----------------------------------------------------------------------------
// 3. POST /api/v1/support/exceptions - Log/Report a new delivery exception
// -----------------------------------------------------------------------------
router.post(
  '/exceptions',
  requireRoles(['DISPATCHER', 'ADMIN', 'COURIER']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { parcelId, reason, initialNotes } = req.body;

      if (!parcelId || !reason) {
        return res.status(400).json({ error: 'parcelId and reason are required' });
      }

      const raisedById = req.user?.id || '44444444-4444-4444-4444-444444444444';
      const createdException = await supportService.createException({
        parcelId,
        raisedById,
        reason,
        initialNotes,
      });

      return res.status(201).json({
        message: 'Delivery exception logged successfully',
        exception: createdException,
      });
    } catch (err: any) {
      console.error('Error creating exception:', err);
      return res.status(500).json({ error: err.message || 'Failed to log exception' });
    }
  }
);

// -----------------------------------------------------------------------------
// 4. POST /api/v1/support/exceptions/:parcelId/notes - Add support triage note
// -----------------------------------------------------------------------------
router.post(
  '/exceptions/:parcelId/notes',
  requireRoles(['DISPATCHER', 'ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { note } = req.body;
      const { parcelId } = req.params;

      if (!note || note.trim().length === 0) {
        return res.status(400).json({ error: 'Support note content cannot be empty' });
      }

      const staffUser = {
        id: req.user?.id || '44444444-4444-4444-4444-444444444444',
        name: req.user?.email || 'Dispatcher Admin',
        role: req.user?.role || 'DISPATCHER',
      };

      const updated = await supportService.addSupportNote(parcelId, note, staffUser);

      return res.json({
        message: 'Support resolution note recorded successfully',
        exception: updated,
      });
    } catch (err: any) {
      console.error('Error adding support note:', err);
      return res.status(500).json({ error: err.message || 'Failed to record support note' });
    }
  }
);

// -----------------------------------------------------------------------------
// 5. PATCH /api/v1/support/exceptions/:parcelId/status - Update resolution status
// -----------------------------------------------------------------------------
router.patch(
  '/exceptions/:parcelId/status',
  requireRoles(['DISPATCHER', 'ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const { status, notes } = req.body;
      const { parcelId } = req.params;

      if (!status) {
        return res.status(400).json({ error: 'Resolution status parameter is required' });
      }

      const staffUser = {
        id: req.user?.id || '44444444-4444-4444-4444-444444444444',
        name: req.user?.email || 'Dispatcher Admin',
        role: req.user?.role || 'DISPATCHER',
      };

      const updated = await supportService.updateResolutionStatus(
        parcelId,
        status as ResolutionStatus,
        notes,
        staffUser
      );

      return res.json({
        message: `Exception resolution status updated to ${status}`,
        exception: updated,
      });
    } catch (err: any) {
      console.error('Error updating exception status:', err);
      return res.status(500).json({ error: err.message || 'Failed to update exception status' });
    }
  }
);

// -----------------------------------------------------------------------------
// 6. GET /api/v1/support/exceptions/:id/audit - Query tamper-proof audit trail
// -----------------------------------------------------------------------------
router.get(
  '/exceptions/:id/audit',
  requireRoles(['DISPATCHER', 'ADMIN']),
  async (req: AuthRequest, res: Response) => {
    try {
      const auditLogs = await supportService.getAuditLogs(req.params.id);
      return res.json({
        exceptionId: req.params.id,
        count: auditLogs.length,
        auditLogs,
      });
    } catch (err: any) {
      console.error('Error fetching audit logs:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch audit logs' });
    }
  }
);

export default router;
