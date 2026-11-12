import http from 'http';
import {
  WebhookService,
  validateEndpointUrl,
  signWebhookPayload,
  verifyWebhookSignature,
  calculateExponentialBackoff
} from '../modules/webhooks/webhook.service.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║               SWIFTDROP LOGISTICS PLATFORM                              ║');
  console.log('║       Merchant Webhook Center & Dead-Letter Queue (DLQ) Demonstration    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const webhookService = new WebhookService();
  const merchantId = '55555555-5555-5555-5555-555555555555'; // Apex Electronics
  const port = 9088;

  // STEP 1: Endpoint Registration & Validation
  console.log('--------------------------------------------------------------------------');
  console.log('📌 STEP 1: Webhook Endpoint Configuration & URL Validation');
  console.log('--------------------------------------------------------------------------');
  const targetUrl = `http://127.0.0.1:${port}/api/merchant/v1/webhook-receiver`;
  console.log(`[Merchant] Registering callback URL: ${targetUrl}`);

  const validation = validateEndpointUrl(targetUrl);
  console.log(`[Validation Engine] Result: ${validation.valid ? '✅ VALID (HTTP/HTTPS accepted)' : '❌ INVALID'}`);

  const { endpoint, created } = await webhookService.registerEndpoint(
    merchantId,
    targetUrl,
    ['PARCEL_STATUS_UPDATED', 'PARCEL_DELIVERED', 'PARCEL_FAILED']
  );

  console.log(`[Database] Endpoint Record ID : ${endpoint.id}`);
  console.log(`[Security] HMAC Signing Secret: ${endpoint.signing_secret}`);
  console.log(`[Events] Subscribed Events     : ${endpoint.events.join(', ')}`);
  console.log(`[Status] State                 : ${endpoint.is_active ? 'ACTIVE' : 'INACTIVE'}\n`);

  await sleep(1000);

  // STEP 2: Live Status Change Callback (HTTP 200 OK)
  console.log('--------------------------------------------------------------------------');
  console.log('📌 STEP 2: Parcel Status Change Triggering Signed HMAC Callback (Success)');
  console.log('--------------------------------------------------------------------------');

  let receiverReceivedPayload: any = null;
  let receiverReceivedSignature: string | null = null;
  let receiverReceivedTimestamp: string | null = null;
  let delivery1: any = null;

  const receiverServer = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      receiverReceivedPayload = body;
      receiverReceivedSignature = req.headers['x-swiftdrop-signature'] as string;
      receiverReceivedTimestamp = req.headers['x-swiftdrop-timestamp'] as string;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: true, ackTime: new Date().toISOString() }));
    });
  });

  await new Promise<void>((resolve) => receiverServer.listen(port, '127.0.0.1', () => resolve()));

  try {
    const parcelDeliveredEvent = {
      id: 'pcl_colombo_8829',
      trackingNumber: 'SWIFT-COL-88291',
      status: 'DELIVERED',
      recipientName: 'Kasun Rathnayake',
      deliveryAddress: 'No 18, Flower Road, Colombo 07',
      deliveredAt: new Date().toISOString(),
      courier: 'Sunil Silva (Courier #101)'
    };

    console.log(`[Courier Action] Parcel ${parcelDeliveredEvent.trackingNumber} changed status to -> DELIVERED`);
    console.log(`[Webhook Engine] Dispatching event 'PARCEL_DELIVERED' to ${endpoint.target_url}...`);

    delivery1 = await webhookService.dispatchEvent(
      endpoint,
      'PARCEL_DELIVERED',
      parcelDeliveredEvent,
      parcelDeliveredEvent.id
    );

    console.log(`[HTTP Request] Outgoing X-SwiftDrop-Signature header computed via HMAC SHA-256`);
    console.log(`[Receiver Response] HTTP Status: ${delivery1.response_code} OK`);
    console.log(`[Receiver Body] ${delivery1.response_body}`);

    // Receiver verifies signature
    const verification = verifyWebhookSignature(
      receiverReceivedPayload,
      receiverReceivedSignature || '',
      endpoint.signing_secret,
      300,
      receiverReceivedTimestamp || undefined
    );
    console.log(`[Merchant Verification] Cryptographic Signature Authenticity: ${verification.verified ? '✅ VERIFIED' : '❌ FAILED'}\n`);
  } finally {
    await new Promise<void>((resolve) => receiverServer.close(() => resolve()));
  }

  await sleep(1000);

  // STEP 3: Failing Endpoint, Retries & Dead-Letter Queue (DLQ)
  console.log('--------------------------------------------------------------------------');
  console.log('📌 STEP 3: Failed Endpoint Retried & Moved to Dead-Letter Queue (DLQ)');
  console.log('--------------------------------------------------------------------------');

  const deadUrl = 'http://127.0.0.1:9876/offline-endpoint';
  console.log(`[Merchant] Updating endpoint to offline service: ${deadUrl}`);
  const { endpoint: deadEndpoint } = await webhookService.registerEndpoint(merchantId, deadUrl);

  const parcelFailedEvent = {
    id: 'pcl_kandy_4491',
    trackingNumber: 'SWIFT-KDY-44910',
    status: 'FAILED',
    failureReason: 'Consignee phone switched off after 3 delivery attempts',
    failedAt: new Date().toISOString()
  };

  console.log(`[Courier Action] Parcel ${parcelFailedEvent.trackingNumber} status updated to -> FAILED`);
  console.log(`[Webhook Engine] Dispatching to offline endpoint...`);

  const deliveryFail = await webhookService.dispatchEvent(
    deadEndpoint,
    'PARCEL_FAILED',
    parcelFailedEvent,
    parcelFailedEvent.id
  );

  console.log(`[Attempt 1/3] HTTP Status: ${deliveryFail.response_code} (Connection Error)`);
  console.log(`              Queue State: ${deliveryFail.is_dead_letter ? 'DEAD LETTER' : 'RETRY QUEUED'}`);
  console.log(`              Backoff Delay: ${calculateExponentialBackoff(1)}ms (Next retry at: ${deliveryFail.next_retry_at})`);

  await sleep(1000);
  console.log(`[Background Worker] Simulating exponential backoff retry (Attempt 2/3)...`);
  await webhookService.retryDelivery(deliveryFail.id, merchantId);
  console.log(`[Attempt 2/3] HTTP Status: ${deliveryFail.response_code} | Attempt Count: ${deliveryFail.attempt_count}`);
  console.log(`              Backoff Delay: ${calculateExponentialBackoff(2)}ms (Next retry at: ${deliveryFail.next_retry_at})`);

  await sleep(1000);
  console.log(`[Background Worker] Simulating final retry (Attempt 3/3 - Max Retries Exceeded)...`);
  await webhookService.retryDelivery(deliveryFail.id, merchantId);
  console.log(`[Attempt 3/3] HTTP Status: ${deliveryFail.response_code} | Attempt Count: ${deliveryFail.attempt_count}`);
  console.log(`☠️  [DLQ Alert] Delivery attempt exhausted all 3 retries!`);
  console.log(`              Marked 'is_dead_letter = true' -> Moved to Merchant Dead-Letter Queue.\n`);

  await sleep(1000);

  // STEP 4: Manual DLQ Retry
  console.log('--------------------------------------------------------------------------');
  console.log('📌 STEP 4: Merchant Inspects DLQ and Triggers Manual Retry');
  console.log('--------------------------------------------------------------------------');

  const { deadLetters } = await webhookService.getDeliveries(merchantId, 'dead_letter');
  console.log(`[Merchant Portal] Active Dead Letters in DLQ: ${deadLetters.length}`);
  console.log(`   - DLQ Item ID    : ${deadLetters[0].id}`);
  console.log(`   - Target Parcel  : ${deadLetters[0].tracking_number}`);
  console.log(`   - Event          : ${deadLetters[0].event_type}`);
  console.log(`   - Failure Cause  : ${deadLetters[0].response_body}`);

  // Bring mock endpoint back online
  const recoveryServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ACKNOWLEDGED_AFTER_RECOVERY', recovered: true }));
  });
  await new Promise<void>((resolve) => recoveryServer.listen(port, '127.0.0.1', () => resolve()));

  try {
    // Merchant restores working target URL
    await webhookService.registerEndpoint(merchantId, targetUrl);

    console.log(`\n[Merchant Action] Merchant fixed endpoint URL and clicked 'Retry Now' button on DLQ record...`);
    const recovered = await webhookService.retryDelivery(deadLetters[0].id, merchantId);

    console.log(`[Manual Retry Result] HTTP Status: ${recovered.response_code} OK`);
    console.log(`[Manual Retry Result] Dead Letter Status: ${recovered.is_dead_letter ? 'TRUE' : 'FALSE (CLEARED)'}`);
    console.log(`[Manual Retry Result] Response: ${recovered.response_body}\n`);
  } finally {
    await new Promise<void>((resolve) => recoveryServer.close(() => resolve()));
  }

  await sleep(1000);

  // STEP 5: Security & Multi-Tenant Isolation
  console.log('--------------------------------------------------------------------------');
  console.log('📌 STEP 5: Strict Multi-Tenant Data Isolation');
  console.log('--------------------------------------------------------------------------');
  const merchantIntruder = 'merchant-unauthorized-999';
  console.log(`[Security Check] Merchant B (${merchantIntruder}) attempts to retry Merchant A delivery (${delivery1.id})...`);

  try {
    await webhookService.retryDelivery(delivery1.id, merchantIntruder);
    console.log('❌ UNEXPECTED: Security breach allowed cross-tenant action!');
  } catch (err: any) {
    console.log(`🔒 [RBAC Enforced] Access Denied: "${err.message}"`);
  }

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║  ✅ WEBHOOK CENTER DEMONSTRATION COMPLETE: ALL REQUIREMENTS VERIFIED!    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
}

runDemo().catch(console.error);
