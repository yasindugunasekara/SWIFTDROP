import { Router, Response } from 'express';
import { authenticateToken, AuthRequest } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { z } from 'zod';
import {
  webhookService,
  validateEndpointUrl,
  verifyWebhookSignature,
  signWebhookPayload
} from './webhook.service.js';

const router = Router();

// Member 8 — Merchant Webhook Center
// Authenticate token and enforce RBAC: Only MERCHANT and ADMIN roles
router.use(authenticateToken);
router.use(requireRoles(['MERCHANT', 'ADMIN']));
router.use((req: AuthRequest, res: Response, next) => {
  if (req.user?.role === 'ADMIN' && !z.string().uuid().safeParse(req.query.merchantId).success) {
    return res.status(400).json({ error: 'Admin requests require an explicit valid merchantId' });
  }
  next();
});

// Helper to resolve the authenticated merchant ID
const getMerchantId = (req: AuthRequest): string => {
  if (req.user?.merchantId) return req.user.merchantId;
  if (req.query.merchantId && req.user?.role === 'ADMIN') {
    return req.query.merchantId as string;
  }
  throw new Error('Merchant identity is required');
};

// -----------------------------------------------------------------------------
// 1. Get Webhook Endpoint & Signing Secret
// -----------------------------------------------------------------------------
router.get('/endpoints', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const endpoint = await webhookService.getEndpoint(merchantId);

    if (!endpoint) {
      return res.json({
        endpoint: null,
        message: 'No webhook endpoint registered yet for this merchant account.'
      });
    }

    res.json({
      endpoint: {
        id: endpoint.id,
        merchantId: endpoint.merchant_id,
        targetUrl: endpoint.target_url,
        signingSecret: endpoint.signing_secret,
        isActive: endpoint.is_active,
        events: endpoint.events,
        createdAt: endpoint.created_at
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch webhook endpoint' });
  }
});

// -----------------------------------------------------------------------------
// 2. Register or Update Webhook Endpoint
// -----------------------------------------------------------------------------
router.post('/endpoints', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { targetUrl, events } = req.body;

    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl is required' });
    }

    const validation = validateEndpointUrl(targetUrl);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const { endpoint, created } = await webhookService.registerEndpoint(
      merchantId,
      targetUrl,
      Array.isArray(events) && events.length > 0
        ? events
        : ['PARCEL_STATUS_UPDATED', 'PARCEL_DELIVERED', 'PARCEL_FAILED']
    );

    res.status(created ? 201 : 200).json({
      message: created ? 'Webhook endpoint registered successfully' : 'Webhook endpoint updated successfully',
      endpoint: {
        id: endpoint.id,
        merchantId: endpoint.merchant_id,
        targetUrl: endpoint.target_url,
        signingSecret: endpoint.signing_secret,
        isActive: endpoint.is_active,
        events: endpoint.events,
        createdAt: endpoint.created_at
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to register webhook endpoint' });
  }
});

// -----------------------------------------------------------------------------
// 3. Deactivate Webhook Endpoint
// -----------------------------------------------------------------------------
router.delete('/endpoints/:id', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { id } = req.params;

    const deactivated = await webhookService.deactivateEndpoint(id, merchantId);
    if (!deactivated) {
      return res.status(404).json({ error: 'Webhook endpoint not found or unauthorized' });
    }

    res.json({ message: 'Webhook endpoint deactivated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to deactivate endpoint' });
  }
});

// -----------------------------------------------------------------------------
// 4. Send Test Ping to Webhook Endpoint
// -----------------------------------------------------------------------------
router.post('/endpoints/test', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const endpoint = await webhookService.getEndpoint(merchantId);

    if (!endpoint) {
      return res.status(400).json({ error: 'Please configure an active webhook endpoint first' });
    }

    const testParcel = {
      id: 'test-parcel-001',
      trackingNumber: 'SWIFT-TEST-9988',
      status: 'DELIVERED',
      recipientName: 'Test Recipient',
      deliveryAddress: 'SwiftDrop Test Lab, Hub 1',
      updatedAt: new Date().toISOString()
    };

    const delivery = await webhookService.dispatchEvent(
      endpoint,
      'PARCEL_DELIVERED',
      testParcel,
      testParcel.id
    );

    res.json({
      message: delivery.response_code === 200
        ? 'Test webhook delivered successfully'
        : `Test webhook dispatched (HTTP ${delivery.response_code})`,
      delivery
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch test webhook' });
  }
});

// -----------------------------------------------------------------------------
// 5. Get Webhook Delivery Attempt History & DLQ
// -----------------------------------------------------------------------------
router.get('/deliveries', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const filter = (req.query.filter as any) || 'all';

    const { attempts, deadLetters } = await webhookService.getDeliveries(merchantId, filter);

    const total = attempts.length;
    const deliveredCount = attempts.filter((a) => a.response_code === 200).length;
    const deadLetterCount = deadLetters.length;
    const successRate = total > 0 ? Math.round((deliveredCount / total) * 100) : 100;

    res.json({
      attempts,
      deadLetters,
      stats: {
        total,
        deliveredCount,
        deadLetterCount,
        successRate
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch webhook deliveries' });
  }
});

// -----------------------------------------------------------------------------
// 6. Retry Failed Webhook Delivery Manually (DLQ Re-dispatch)
// -----------------------------------------------------------------------------
router.post('/deliveries/:id/retry', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { id } = req.params;

    const updatedDelivery = await webhookService.retryDelivery(id, merchantId);

    res.json({
      message: updatedDelivery.response_code === 200
        ? 'Delivery retried successfully'
        : `Delivery retry completed with response code ${updatedDelivery.response_code}`,
      delivery: updatedDelivery
    });
  } catch (err: any) {
    const isForbidden = err.message?.includes('Forbidden');
    res.status(isForbidden ? 403 : 400).json({ error: err.message || 'Failed to retry delivery' });
  }
});

// -----------------------------------------------------------------------------
// 7. Internal / Status Change Dispatch
// -----------------------------------------------------------------------------
router.post('/dispatch', async (req: AuthRequest, res: Response) => {
  try {
    const merchantId = getMerchantId(req);
    const { event, parcel, parcelId } = req.body;

    if (!event || !parcel) {
      return res.status(400).json({ error: 'event and parcel payload are required' });
    }

    const endpoint = await webhookService.getEndpoint(merchantId);
    if (!endpoint) {
      return res.status(404).json({ error: 'No active endpoint for merchant' });
    }

    const delivery = await webhookService.dispatchEvent(endpoint, event, parcel, parcelId);

    res.status(201).json({
      message: 'Webhook callback dispatched',
      delivery
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to dispatch webhook' });
  }
});

// -----------------------------------------------------------------------------
// 8. Utility Endpoint to Verify HMAC Signatures
// -----------------------------------------------------------------------------
router.post('/verify', async (req: AuthRequest, res: Response) => {
  try {
    const { payload, signature, secret } = req.body;
    if (!payload || !signature || !secret) {
      return res.status(400).json({ error: 'payload, signature, and secret are required' });
    }

    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const result = verifyWebhookSignature(payloadString, signature, secret);

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Verification failure' });
  }
});

export default router;
