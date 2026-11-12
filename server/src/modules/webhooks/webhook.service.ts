import crypto from 'crypto';
import { db } from '../../config/database.js';

export interface WebhookEndpoint {
  id: string;
  merchant_id: string;
  target_url: string;
  signing_secret: string;
  is_active: boolean;
  events: string[];
  created_at: string;
}

export interface WebhookDeliveryAttempt {
  id: string;
  endpoint_id: string;
  merchant_id: string;
  parcel_id: string | null;
  tracking_number?: string;
  event_type: string;
  payload: any;
  response_code: number | null;
  response_body: string | null;
  attempt_count: number;
  max_retries: number;
  is_dead_letter: boolean;
  next_retry_at: string | null;
  created_at: string;
  updated_at: string;
}

// In-Memory store for fast fallback when PostgreSQL container is not connected
class WebhookDataStore {
  private endpoints: Map<string, WebhookEndpoint> = new Map();
  private deliveries: Map<string, WebhookDeliveryAttempt> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const defaultMerchantId = '55555555-5555-5555-5555-555555555555'; // Apex Electronics
    const defaultEndpointId = 'wh_ep_apex_prod';
    const secret = 'whsec_791823901a89b7842efc89d12a938c41bf6e210a';

    const endpoint: WebhookEndpoint = {
      id: defaultEndpointId,
      merchant_id: defaultMerchantId,
      target_url: 'https://merchant-api.example.com/webhooks/swiftdrop',
      signing_secret: secret,
      is_active: true,
      events: ['PARCEL_STATUS_UPDATED', 'PARCEL_DELIVERED', 'PARCEL_FAILED'],
      created_at: new Date(Date.now() - 86400000 * 3).toISOString()
    };
    this.endpoints.set(endpoint.id, endpoint);

    // Seed sample deliveries
    const sampleDeliveries: WebhookDeliveryAttempt[] = [
      {
        id: 'wh_del_101',
        endpoint_id: defaultEndpointId,
        merchant_id: defaultMerchantId,
        parcel_id: '11111111-2222-3333-4444-555555555551',
        tracking_number: 'SWIFT-782910',
        event_type: 'PARCEL_DELIVERED',
        payload: {
          event: 'PARCEL_DELIVERED',
          timestamp: new Date(Date.now() - 720000).toISOString(),
          parcel: {
            id: '11111111-2222-3333-4444-555555555551',
            trackingNumber: 'SWIFT-782910',
            status: 'DELIVERED',
            recipientName: 'Nimal Bandara',
            deliveryAddress: 'No. 45, Galle Road, Colombo 03'
          }
        },
        response_code: 200,
        response_body: JSON.stringify({ received: true, ack: 'ok' }),
        attempt_count: 1,
        max_retries: 3,
        is_dead_letter: false,
        next_retry_at: null,
        created_at: new Date(Date.now() - 720000).toISOString(),
        updated_at: new Date(Date.now() - 720000).toISOString()
      },
      {
        id: 'wh_del_102',
        endpoint_id: defaultEndpointId,
        merchant_id: defaultMerchantId,
        parcel_id: '11111111-2222-3333-4444-555555555552',
        tracking_number: 'SWIFT-991122',
        event_type: 'PARCEL_FAILED',
        payload: {
          event: 'PARCEL_FAILED',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          parcel: {
            id: '11111111-2222-3333-4444-555555555552',
            trackingNumber: 'SWIFT-991122',
            status: 'FAILED',
            failureReason: 'Customer premises closed after 3 contact attempts'
          }
        },
        response_code: 500,
        response_body: 'Internal Server Error: Database connection refused on partner receiver',
        attempt_count: 3,
        max_retries: 3,
        is_dead_letter: true,
        next_retry_at: null,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 'wh_del_103',
        endpoint_id: defaultEndpointId,
        merchant_id: defaultMerchantId,
        parcel_id: '11111111-2222-3333-4444-555555555553',
        tracking_number: 'SWIFT-445566',
        event_type: 'PARCEL_STATUS_UPDATED',
        payload: {
          event: 'PARCEL_STATUS_UPDATED',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          parcel: {
            id: '11111111-2222-3333-4444-555555555553',
            trackingNumber: 'SWIFT-445566',
            status: 'IN_TRANSIT',
            currentHub: 'Central Sorting Facility - Colombo 10'
          }
        },
        response_code: 200,
        response_body: JSON.stringify({ status: 'PROCESSED' }),
        attempt_count: 1,
        max_retries: 3,
        is_dead_letter: false,
        next_retry_at: null,
        created_at: new Date(Date.now() - 1800000).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];

    for (const d of sampleDeliveries) {
      this.deliveries.set(d.id, d);
    }
  }

  // Endpoints
  saveEndpoint(ep: WebhookEndpoint) {
    this.endpoints.set(ep.id, ep);
    return ep;
  }

  getEndpointByMerchant(merchantId: string): WebhookEndpoint | null {
    for (const ep of this.endpoints.values()) {
      if (ep.merchant_id === merchantId && ep.is_active) {
        return ep;
      }
    }
    return null;
  }

  getEndpointById(id: string): WebhookEndpoint | null {
    return this.endpoints.get(id) || null;
  }

  deleteEndpoint(id: string, merchantId: string): boolean {
    const ep = this.endpoints.get(id);
    if (ep && ep.merchant_id === merchantId) {
      this.endpoints.delete(id);
      return true;
    }
    return false;
  }

  // Deliveries
  saveDelivery(del: WebhookDeliveryAttempt) {
    this.deliveries.set(del.id, del);
    return del;
  }

  getDeliveryById(id: string): WebhookDeliveryAttempt | null {
    return this.deliveries.get(id) || null;
  }

  getDeliveriesByMerchant(merchantId: string): WebhookDeliveryAttempt[] {
    const result: WebhookDeliveryAttempt[] = [];
    for (const del of this.deliveries.values()) {
      if (del.merchant_id === merchantId) {
        result.push(del);
      }
    }
    return result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getPendingRetries(): WebhookDeliveryAttempt[] {
    const now = Date.now();
    const result: WebhookDeliveryAttempt[] = [];
    for (const del of this.deliveries.values()) {
      if (!del.is_dead_letter && del.response_code !== 200 && del.next_retry_at) {
        if (new Date(del.next_retry_at).getTime() <= now) {
          result.push(del);
        }
      }
    }
    return result;
  }
}

export const inMemoryStore = new WebhookDataStore();

// =============================================================================
// BUSINESS RULES & SECURITY FUNCTIONS
// =============================================================================

/**
 * Validates endpoint URLs according to Member 8 security specifications:
 * - Must be a valid parseable URL
 * - Must use http or https protocol (no ftp, file, javascript, etc.)
 * - Must have a valid hostname
 */
export function validateEndpointUrl(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || typeof urlString !== 'string' || urlString.trim().length === 0) {
    return { valid: false, error: 'Endpoint URL cannot be empty' };
  }

  try {
    const parsed = new URL(urlString.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        error: `Invalid protocol '${parsed.protocol}'. Only 'http:' and 'https:' are permitted.`
      };
    }

    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, error: 'Endpoint URL must include a valid hostname' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'Malformed URL format. Expected e.g. https://api.store.com/webhooks' };
  }
}

/**
 * Generates a cryptographically strong signing secret with the standard 'whsec_' prefix
 */
export function generateSigningSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Signs a webhook payload using HMAC SHA-256 for cryptographic authentication
 * Returns the hex signature and timestamp header values.
 */
export function signWebhookPayload(payload: any, secret: string, timestamp = Math.floor(Date.now() / 1000)): {
  signature: string;
  timestamp: number;
  header: string;
} {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const signaturePayload = `${timestamp}.${payloadString}`;
  const signature = crypto.createHmac('sha256', secret).update(signaturePayload).digest('hex');
  return {
    signature,
    timestamp,
    header: `t=${timestamp},v1=${signature}`
  };
}

/**
 * Verifies that a received HMAC SHA-256 signature matches the payload and secret
 */
export function verifyWebhookSignature(
  payloadString: string,
  signatureHeader: string,
  secret: string,
  toleranceSeconds = 300,
  rawTimestamp?: number | string
): { verified: boolean; error?: string } {
  try {
    let timestamp = rawTimestamp ? Number(rawTimestamp) : 0;
    let signature = '';

    if (signatureHeader.includes('t=') && signatureHeader.includes('v1=')) {
      const parts = signatureHeader.split(',');
      for (const part of parts) {
        if (part.startsWith('t=')) timestamp = parseInt(part.substring(2), 10);
        if (part.startsWith('v1=')) signature = part.substring(3);
      }
    } else {
      signature = signatureHeader.trim();
    }

    if (!signature) {
      return { verified: false, error: 'Missing signature in header' };
    }

    // Check clock drift / replay attacks if timestamp is present
    if (timestamp > 0) {
      const current = Math.floor(Date.now() / 1000);
      if (Math.abs(current - timestamp) > toleranceSeconds) {
        return { verified: false, error: 'Webhook timestamp outside tolerance window (replay protection)' };
      }
    }

    const expectedSignature = timestamp > 0
      ? crypto.createHmac('sha256', secret).update(`${timestamp}.${payloadString}`).digest('hex')
      : crypto.createHmac('sha256', secret).update(payloadString).digest('hex');

    const verified = crypto.timingSafeEqual(
      Buffer.from(signature, 'utf-8'),
      Buffer.from(expectedSignature, 'utf-8')
    );

    return { verified };
  } catch (err: any) {
    return { verified: false, error: err.message || 'Signature verification error' };
  }
}

/**
 * Calculates exponential backoff delay in milliseconds
 * Delay = baseDelay * (2 ^ (attempt - 1))
 */
export function calculateExponentialBackoff(attempt: number, baseDelayMs = 2000, maxDelayMs = 30000): number {
  const delay = baseDelayMs * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(delay, maxDelayMs);
}

// =============================================================================
// WEBHOOK SERVICE CLASS
// =============================================================================

export class WebhookService {
  /**
   * Registers or updates a webhook endpoint for a merchant with strict URL validation
   */
  async registerEndpoint(
    merchantId: string,
    targetUrl: string,
    events: string[] = ['PARCEL_STATUS_UPDATED', 'PARCEL_DELIVERED', 'PARCEL_FAILED']
  ): Promise<{ endpoint: WebhookEndpoint; created: boolean }> {
    // 1. Business Rule: Validate URL
    const urlValidation = validateEndpointUrl(targetUrl);
    if (!urlValidation.valid) {
      throw new Error(`Validation Error: ${urlValidation.error}`);
    }

    // Try PostgreSQL first, fall back to inMemoryStore
    try {
      const existing = await db.query(
        'SELECT * FROM merchant_webhook_endpoints WHERE merchant_id = $1 LIMIT 1',
        [merchantId]
      );

      if (existing.rows.length > 0) {
        const id = existing.rows[0].id;
        const res = await db.query(
          `UPDATE merchant_webhook_endpoints 
           SET target_url = $1, events = $2, is_active = TRUE
           WHERE id = $3 RETURNING *`,
          [targetUrl.trim(), events, id]
        );
        const ep = res.rows[0];
        inMemoryStore.saveEndpoint(ep);
        return { endpoint: ep, created: false };
      } else {
        const secret = generateSigningSecret();
        const res = await db.query(
          `INSERT INTO merchant_webhook_endpoints (merchant_id, target_url, signing_secret, is_active, events)
           VALUES ($1, $2, $3, TRUE, $4) RETURNING *`,
          [merchantId, targetUrl.trim(), secret, events]
        );
        const ep = res.rows[0];
        inMemoryStore.saveEndpoint(ep);
        return { endpoint: ep, created: true };
      }
    } catch {
      // In-memory fallback
      const existing = inMemoryStore.getEndpointByMerchant(merchantId);
      if (existing) {
        existing.target_url = targetUrl.trim();
        existing.events = events;
        existing.is_active = true;
        inMemoryStore.saveEndpoint(existing);
        return { endpoint: existing, created: false };
      } else {
        const newEp: WebhookEndpoint = {
          id: `wh_ep_${crypto.randomBytes(6).toString('hex')}`,
          merchant_id: merchantId,
          target_url: targetUrl.trim(),
          signing_secret: generateSigningSecret(),
          is_active: true,
          events,
          created_at: new Date().toISOString()
        };
        inMemoryStore.saveEndpoint(newEp);
        return { endpoint: newEp, created: true };
      }
    }
  }

  /**
   * Retrieves the active endpoint for a merchant (guaranteeing multi-tenant isolation)
   */
  async getEndpoint(merchantId: string): Promise<WebhookEndpoint | null> {
    try {
      const res = await db.query(
        'SELECT * FROM merchant_webhook_endpoints WHERE merchant_id = $1 AND is_active = TRUE LIMIT 1',
        [merchantId]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    } catch {
      // Fallback
    }
    return inMemoryStore.getEndpointByMerchant(merchantId);
  }

  /**
   * Deactivates or removes a webhook endpoint
   */
  async deactivateEndpoint(endpointId: string, merchantId: string): Promise<boolean> {
    try {
      const res = await db.query(
        'UPDATE merchant_webhook_endpoints SET is_active = FALSE WHERE id = $1 AND merchant_id = $2',
        [endpointId, merchantId]
      );
      if ((res.rowCount ?? 0) > 0) {
        inMemoryStore.deleteEndpoint(endpointId, merchantId);
        return true;
      }
    } catch {
      // Fallback
    }
    return inMemoryStore.deleteEndpoint(endpointId, merchantId);
  }

  /**
   * Retrieves all delivery attempts and dead-letter records for a merchant (isolated)
   */
  async getDeliveries(
    merchantId: string,
    filter: 'all' | 'dead_letter' | 'delivered' = 'all'
  ): Promise<{ attempts: WebhookDeliveryAttempt[]; deadLetters: WebhookDeliveryAttempt[] }> {
    let deliveries: WebhookDeliveryAttempt[] = [];

    try {
      const res = await db.query(
        `SELECT d.*, e.target_url, p.tracking_number 
         FROM webhook_delivery_attempts d
         JOIN merchant_webhook_endpoints e ON d.endpoint_id = e.id
         LEFT JOIN parcels p ON d.parcel_id = p.id
         WHERE e.merchant_id = $1
         ORDER BY d.created_at DESC`,
        [merchantId]
      );
      deliveries = res.rows;
    } catch {
      deliveries = inMemoryStore.getDeliveriesByMerchant(merchantId);
    }

    if (deliveries.length === 0) {
      deliveries = inMemoryStore.getDeliveriesByMerchant(merchantId);
    }

    const deadLetters = deliveries.filter((d) => d.is_dead_letter);
    let attempts = deliveries;
    if (filter === 'dead_letter') {
      attempts = deadLetters;
    } else if (filter === 'delivered') {
      attempts = deliveries.filter((d) => d.response_code === 200);
    }

    return { attempts, deadLetters };
  }

  /**
   * Dispatches a webhook HTTP request with HMAC SHA-256 signature and retry tracking
   */
  async dispatchEvent(
    endpoint: WebhookEndpoint,
    eventType: string,
    parcelData: any,
    parcelId?: string
  ): Promise<WebhookDeliveryAttempt> {
    const payload = {
      id: `evt_${crypto.randomBytes(8).toString('hex')}`,
      event: eventType,
      timestamp: new Date().toISOString(),
      merchantId: endpoint.merchant_id,
      parcel: parcelData
    };

    const payloadString = JSON.stringify(payload);
    const signed = signWebhookPayload(payloadString, endpoint.signing_secret);

    const deliveryId = `wh_del_${crypto.randomBytes(8).toString('hex')}`;
    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(endpoint.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SwiftDrop-Signature': signed.signature,
          'X-SwiftDrop-Signature-Header': signed.header,
          'X-SwiftDrop-Timestamp': signed.timestamp.toString(),
          'X-SwiftDrop-Event': eventType,
          'User-Agent': 'SwiftDrop-Webhook-Center/1.0'
        },
        body: payloadString,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      responseCode = resp.status;
      responseBody = await resp.text().catch(() => '');
      success = resp.status >= 200 && resp.status < 300;
    } catch (err: any) {
      responseCode = 500;
      responseBody = `HTTP Dispatch Failure: ${err.message || 'Connection refused or timeout'}`;
      success = false;
    }

    const attemptCount = 1;
    const maxRetries = 3;
    const isDeadLetter = !success && attemptCount >= maxRetries;
    const nextRetryAt = !success && !isDeadLetter
      ? new Date(Date.now() + calculateExponentialBackoff(attemptCount + 1)).toISOString()
      : null;

    const delivery: WebhookDeliveryAttempt = {
      id: deliveryId,
      endpoint_id: endpoint.id,
      merchant_id: endpoint.merchant_id,
      parcel_id: parcelId || parcelData?.id || null,
      tracking_number: parcelData?.trackingNumber || 'SWIFT-UNKNOWN',
      event_type: eventType,
      payload,
      response_code: responseCode,
      response_body: responseBody?.slice(0, 500) || '',
      attempt_count: attemptCount,
      max_retries: maxRetries,
      is_dead_letter: isDeadLetter,
      next_retry_at: nextRetryAt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Store in DB or Memory
    try {
      await db.query(
        `INSERT INTO webhook_delivery_attempts 
         (id, endpoint_id, parcel_id, payload, response_code, response_body, attempt_count, is_dead_letter)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          delivery.id,
          delivery.endpoint_id,
          delivery.parcel_id,
          JSON.stringify(delivery.payload),
          delivery.response_code,
          delivery.response_body,
          delivery.attempt_count,
          delivery.is_dead_letter
        ]
      );
    } catch {
      // In-memory fallback
    }

    inMemoryStore.saveDelivery(delivery);
    return delivery;
  }

  /**
   * Retries a delivery attempt with exponential backoff or manual retry
   */
  async retryDelivery(deliveryId: string, merchantId: string): Promise<WebhookDeliveryAttempt> {
    const delivery = inMemoryStore.getDeliveryById(deliveryId);
    if (!delivery) {
      throw new Error(`Delivery attempt '${deliveryId}' not found`);
    }

    // Strict multi-tenant security isolation check
    if (delivery.merchant_id !== merchantId) {
      throw new Error(`Forbidden: You cannot access or retry webhooks belonging to another merchant`);
    }

    const endpoint = inMemoryStore.getEndpointById(delivery.endpoint_id) ||
      inMemoryStore.getEndpointByMerchant(merchantId);

    if (!endpoint) {
      throw new Error('No active webhook endpoint configured for this delivery');
    }

    const payloadString = JSON.stringify(delivery.payload);
    const signed = signWebhookPayload(payloadString, endpoint.signing_secret);

    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let success = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const resp = await fetch(endpoint.target_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SwiftDrop-Signature': signed.signature,
          'X-SwiftDrop-Timestamp': signed.timestamp.toString(),
          'X-SwiftDrop-Event': delivery.event_type,
          'User-Agent': 'SwiftDrop-Webhook-Center/1.0 (Retry)'
        },
        body: payloadString,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      responseCode = resp.status;
      responseBody = await resp.text().catch(() => '');
      success = resp.status >= 200 && resp.status < 300;
    } catch (err: any) {
      responseCode = 500;
      responseBody = `Manual Retry Failed: ${err.message || 'Connection error'}`;
      success = false;
    }

    delivery.attempt_count += 1;
    delivery.response_code = responseCode;
    delivery.response_body = responseBody?.slice(0, 500) || '';
    delivery.updated_at = new Date().toISOString();

    if (success) {
      delivery.is_dead_letter = false;
      delivery.next_retry_at = null;
    } else {
      if (delivery.attempt_count >= delivery.max_retries) {
        delivery.is_dead_letter = true;
        delivery.next_retry_at = null;
      } else {
        const nextDelay = calculateExponentialBackoff(delivery.attempt_count + 1);
        delivery.next_retry_at = new Date(Date.now() + nextDelay).toISOString();
      }
    }

    inMemoryStore.saveDelivery(delivery);
    return delivery;
  }
}

export const webhookService = new WebhookService();
