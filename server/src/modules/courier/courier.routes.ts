import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { courierService, ParcelStatus, inMemoryCourierStore } from './courier.service.js';

const router = Router();

// Create local storage only for an actual upload, not when importing the API
// into Next/Vercel's read-only function filesystem.
const uploadDir = path.join(process.cwd(), 'uploads');

// Configure Multer for Proof of Delivery Photo Uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error instanceof Error ? error : new Error('Upload storage unavailable'), uploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `proof-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, and WebP image formats are supported for proof photos'));
  }
});

// Member 4 — Courier Task Execution Middleware
router.use(authenticateToken);
router.use(requireRoles(['COURIER', 'ADMIN']));

// -----------------------------------------------------------------------------
// 1. GET /jobs - List Assigned Delivery Jobs
// -----------------------------------------------------------------------------
router.get('/jobs', async (req: AuthRequest, res: Response) => {
  try {
    const courierId = req.user?.id || '10111111-1111-1111-1111-111111111111';
    const filter = req.query.status as string | undefined;

    const assignedJobs = await courierService.getAssignedJobs(courierId, filter);
    return res.json({
      courierId,
      courierName: req.user?.role === 'ADMIN' ? 'Administrator' : assignedJobs[0]?.courierName || 'Courier',
      count: assignedJobs.length,
      assignedJobs
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch assigned delivery jobs' });
  }
});

// -----------------------------------------------------------------------------
// 2. GET /jobs/:parcelId - Detailed View of a Delivery Stop
// -----------------------------------------------------------------------------
router.get('/jobs/:parcelId', async (req: AuthRequest, res: Response) => {
  try {
    const courierId = req.user?.id || '10111111-1111-1111-1111-111111111111';
    const role = req.user?.role || 'COURIER';
    const parcelId = req.params.parcelId;

    const job = await courierService.getJobDetails(courierId, parcelId, role);
    if (!job) {
      return res.status(404).json({ error: 'Assigned parcel not found' });
    }

    return res.json({ job });
  } catch (err: any) {
    if (err.message?.includes('FORBIDDEN') || err.message?.includes('Forbidden')) {
      return res.status(403).json({ error: err.message.replace('FORBIDDEN: ', '') });
    }
    return res.status(500).json({ error: err.message || 'Failed to fetch job details' });
  }
});

// -----------------------------------------------------------------------------
// 3. PATCH /jobs/:parcelId/status - Update Status Pipeline
// -----------------------------------------------------------------------------
router.patch('/jobs/:parcelId/status', async (req: AuthRequest, res: Response) => {
  try {
    const courierId = req.user?.id || '10111111-1111-1111-1111-111111111111';
    const role = req.user?.role || 'COURIER';
    const parcelId = req.params.parcelId;
    const { status, note, locationName, latitude, longitude } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Missing required parameter 'status'" });
    }

    const updatedParcel = await courierService.updateParcelStatus(
      courierId,
      parcelId,
      status as ParcelStatus,
      note,
      locationName ? { name: locationName, lat: latitude, lng: longitude } : undefined,
      role
    );

    return res.json({
      message: `Parcel status updated to ${status} successfully`,
      parcel: updatedParcel
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('Forbidden') || msg.includes('not authorized')) {
      return res.status(403).json({ error: msg });
    }
    if (msg.includes('Invalid transition') || msg.includes('Proof photo required') || msg.includes('terminal')) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: msg || 'Internal server error updating parcel status' });
  }
});

// -----------------------------------------------------------------------------
// 4. POST /jobs/:parcelId/proof - Upload Proof Photo & Handover Record
// -----------------------------------------------------------------------------
router.post('/jobs/:parcelId/proof', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    const courierId = req.user?.id || '10111111-1111-1111-1111-111111111111';
    const role = req.user?.role || 'COURIER';
    const parcelId = req.params.parcelId;

    let photoUrl = req.body.photoUrl;
    if (req.file) {
      photoUrl = `/uploads/${req.file.filename}`;
    }

    if (!photoUrl) {
      return res.status(400).json({ error: 'Doorstep camera photo is required (multipart file or photoUrl)' });
    }

    const proof = await courierService.uploadDeliveryProof(
      courierId,
      parcelId,
      {
        photoUrl,
        recipientSignatureUrl: req.body.recipientSignatureUrl,
        failureReason: req.body.failureReason,
        recipientNote: req.body.recipientNote
      },
      role
    );

    return res.status(201).json({
      message: 'Proof of delivery photo recorded successfully',
      proof
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('Forbidden') || msg.includes('not authorized')) {
      return res.status(403).json({ error: msg });
    }
    return res.status(400).json({ error: msg || 'Failed to upload proof of delivery' });
  }
});

// -----------------------------------------------------------------------------
// 5. POST /jobs/:parcelId/fail - Log Failed Delivery Reason
// -----------------------------------------------------------------------------
router.post('/jobs/:parcelId/fail', async (req: AuthRequest, res: Response) => {
  try {
    const courierId = req.user?.id || '10111111-1111-1111-1111-111111111111';
    const role = req.user?.role || 'COURIER';
    const parcelId = req.params.parcelId;
    const { failureReason, recipientNote } = req.body;

    if (!failureReason) {
      return res.status(400).json({ error: 'Parameter failureReason is required when marking a delivery as failed' });
    }

    const updatedParcel = await courierService.recordDeliveryFailure(
      courierId,
      parcelId,
      failureReason,
      recipientNote,
      role
    );

    return res.json({
      message: 'Delivery marked as FAILED with documented reason',
      parcel: updatedParcel
    });
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('Forbidden') || msg.includes('not authorized')) {
      return res.status(403).json({ error: msg });
    }
    if (msg.includes('Invalid transition')) {
      return res.status(400).json({ error: msg });
    }
    return res.status(500).json({ error: msg || 'Failed to log delivery failure' });
  }
});

export default router;
