import http from 'http';
import {
  validateEndpointUrl,
  generateSigningSecret,
  signWebhookPayload,
  verifyWebhookSignature,
  calculateExponentialBackoff,
  WebhookService,
  inMemoryStore
} from './webhook.service.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details ? details : '');
    throw new Error(`Test failed: ${testName}`);
  }
}

export async function runWebhookTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MERCHANT WEBHOOK CENTER TEST SUITE');
  console.log('============================================================\n');

  const testService = new WebhookService();

  // -------------------------------------------------------------------------
  // 1. URL Validation Tests
  // -------------------------------------------------------------------------
  console.log('--- 1. Business Rules: Endpoint URL Validation ---');
  {
    const validHttps = validateEndpointUrl('https://api.mymerchant.com/v1/swiftdrop');
    assert(validHttps.valid === true, 'Accepts valid HTTPS URL');

    const validHttp = validateEndpointUrl('http://localhost:8080/webhook-receiver');
    assert(validHttp.valid === true, 'Accepts valid HTTP URL (local testing)');

    const empty = validateEndpointUrl('');
    assert(empty.valid === false && Boolean(empty.error?.includes('empty')), 'Rejects empty URL');

    const malformed = validateEndpointUrl('not-a-valid-url');
    assert(malformed.valid === false, 'Rejects malformed URL string');

    const invalidProto = validateEndpointUrl('ftp://invalidscheme.com/hook');
    assert(invalidProto.valid === false && Boolean(invalidProto.error?.includes('protocol')), 'Rejects disallowed FTP protocol');

    const javascriptProto = validateEndpointUrl('javascript:alert(1)');
    assert(javascriptProto.valid === false, 'Rejects dangerous javascript: pseudo-protocol');
  }

  // -------------------------------------------------------------------------
  // 2. Cryptographic Signing & HMAC-SHA256 Verification Tests
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Business Rules & Security: HMAC-SHA256 Payload Signing ---');
  {
    const secret = generateSigningSecret();
    assert(secret.startsWith('whsec_'), 'Secret begins with whsec_ prefix');
    assert(secret.length >= 32, 'Secret has strong cryptographic entropy');

    const payload = {
      event: 'PARCEL_DELIVERED',
      parcelId: 'SWIFT-1234',
      status: 'DELIVERED',
      timestamp: new Date().toISOString()
    };
    const payloadStr = JSON.stringify(payload);
    const ts = Math.floor(Date.now() / 1000);

    const signed = signWebhookPayload(payloadStr, secret, ts);
    assert(typeof signed.signature === 'string' && signed.signature.length === 64, 'Generated 64-char hex SHA-256 HMAC signature');
    assert(signed.header.includes(`t=${ts},v1=${signed.signature}`), 'Generated standard signature header format');

    // Valid verification
    const verified = verifyWebhookSignature(payloadStr, signed.header, secret);
    assert(verified.verified === true, 'Successfully verified authentic signature');

    // Tampered payload
    const tamperedPayload = JSON.stringify({ ...payload, status: 'FAILED' });
    const tamperedCheck = verifyWebhookSignature(tamperedPayload, signed.header, secret);
    assert(tamperedCheck.verified === false, 'Rejects tampered payload content');

    // Wrong secret
    const wrongSecretCheck = verifyWebhookSignature(payloadStr, signed.header, generateSigningSecret());
    assert(wrongSecretCheck.verified === false, 'Rejects signature verified with incorrect secret');

    // Replay attack protection (old timestamp)
    const oldTimestamp = ts - 600; // 10 minutes ago
    const oldSigned = signWebhookPayload(payloadStr, secret, oldTimestamp);
    const replayCheck = verifyWebhookSignature(payloadStr, oldSigned.header, secret, 300);
    assert(replayCheck.verified === false && Boolean(replayCheck.error?.includes('tolerance')), 'Rejects expired timestamp (Replay attack defense)');
  }

  // -------------------------------------------------------------------------
  // 3. Endpoint Registration & Storage
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Backend / Data: Webhook Endpoint Registration ---');
  const merchantA = 'merchant-test-aaa-111';
  let epA: any;
  {
    const regResult = await testService.registerEndpoint(
      merchantA,
      'http://127.0.0.1:9199/webhook',
      ['PARCEL_DELIVERED', 'PARCEL_FAILED']
    );
    epA = regResult.endpoint;
    assert(epA.merchant_id === merchantA, 'Endpoint registered with merchant ID');
    assert(epA.signing_secret.startsWith('whsec_'), 'Signing secret automatically provisioned');
    assert(epA.events.length === 2, 'Subscribed events properly saved');

    const retrieved = await testService.getEndpoint(merchantA);
    assert(retrieved?.id === epA.id, 'Retrieved active endpoint for merchant');
  }

  // -------------------------------------------------------------------------
  // 4. Live Dispatch Callback with Mock HTTP Receiver
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Tests / Demo Evidence: Status Change Triggering Callback ---');
  let receivedHeaders: any = null;
  let receivedBody: any = null;

  const mockServer = http.createServer((req, res) => {
    receivedHeaders = req.headers;
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      receivedBody = JSON.parse(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ acknowledged: true }));
    });
  });

  await new Promise<void>((resolve) => mockServer.listen(9199, '127.0.0.1', () => resolve()));

  try {
    const parcelData = {
      id: 'pcl_001',
      trackingNumber: 'SWIFT-998877',
      status: 'DELIVERED',
      recipientName: 'Alice Silva'
    };

    const delivery = await testService.dispatchEvent(epA, 'PARCEL_DELIVERED', parcelData, parcelData.id);

    assert(delivery.response_code === 200, 'Webhook receiver responded with HTTP 200 OK');
    assert(delivery.is_dead_letter === false, 'Successful delivery is not marked dead letter');
    assert(receivedHeaders['x-swiftdrop-signature'] !== undefined, 'Webhook dispatched with X-SwiftDrop-Signature');
    assert(receivedHeaders['x-swiftdrop-event'] === 'PARCEL_DELIVERED', 'Webhook dispatched with correct event header');
    assert(receivedBody.parcel.trackingNumber === 'SWIFT-998877', 'Webhook payload contains accurate parcel details');

    // Verify signature on receiver side
    const receiverVerification = verifyWebhookSignature(
      JSON.stringify(receivedBody),
      receivedHeaders['x-swiftdrop-signature-header'],
      epA.signing_secret
    );
    assert(receiverVerification.verified === true, 'Receiver successfully authenticated SwiftDrop HMAC signature');
  } finally {
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  }

  // -------------------------------------------------------------------------
  // 5. Failed Endpoint, Exponential Backoff & Dead-Letter Queue (DLQ)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Tests / Demo Evidence: Failed Endpoint Retried & Moved to DLQ ---');
  {
    // Configure endpoint pointing to port with no server running
    const deadEndpointResult = await testService.registerEndpoint(
      merchantA,
      'http://127.0.0.1:9999/down-endpoint'
    );
    const deadEp = deadEndpointResult.endpoint;

    const failedParcel = {
      id: 'pcl_failed_99',
      trackingNumber: 'SWIFT-FAIL-01',
      status: 'FAILED',
      failureReason: 'Address incorrect'
    };

    const attempt1 = await testService.dispatchEvent(deadEp, 'PARCEL_FAILED', failedParcel, failedParcel.id);
    assert(attempt1.response_code === 500, 'Recorded HTTP 500/Connection failure for unreachable endpoint');
    assert(attempt1.attempt_count === 1, 'Initial attempt recorded count 1');
    assert(attempt1.is_dead_letter === false, 'First failure is not yet dead letter (queued for retry)');
    assert(attempt1.next_retry_at !== null, 'Next retry timestamp scheduled');

    // Test backoff calculation
    const delay1 = calculateExponentialBackoff(1, 1000);
    const delay2 = calculateExponentialBackoff(2, 1000);
    const delay3 = calculateExponentialBackoff(3, 1000);
    assert(delay1 === 1000 && delay2 === 2000 && delay3 === 4000, 'Exponential backoff doubles delay between attempts');

    // Simulate retry 2
    attempt1.attempt_count = 1;
    await testService.retryDelivery(attempt1.id, merchantA);
    assert(attempt1.attempt_count === 2, 'Retry incremented attempt count to 2');
    assert(attempt1.is_dead_letter === false, 'Second failure still has 1 retry remaining');

    // Simulate retry 3 (exceeding MAX_RETRIES)
    await testService.retryDelivery(attempt1.id, merchantA);
    assert(attempt1.attempt_count === 3, 'Retry incremented attempt count to 3 (Max)');
    assert(attempt1.is_dead_letter === true, 'Exhausted retry moved delivery to Dead-Letter Queue (DLQ)');

    // Verify DLQ queries
    const merchantLogs = await testService.getDeliveries(merchantA);
    assert(merchantLogs.deadLetters.some((dl) => dl.id === attempt1.id), 'Delivery present in merchant Dead-Letter Queue');
  }

  // -------------------------------------------------------------------------
  // 6. Manual DLQ Retry
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Business Rules: Manual Retry from DLQ ---');
  {
    // Spin up mock server on port 9199 again
    const recoveryServer = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'recovered' }));
    });
    await new Promise<void>((resolve) => recoveryServer.listen(9199, '127.0.0.1', () => resolve()));

    try {
      // Re-point endpoint to online receiver
      await testService.registerEndpoint(merchantA, 'http://127.0.0.1:9199/webhook');

      // Fetch a dead letter delivery
      const { deadLetters } = await testService.getDeliveries(merchantA);
      const dlItem = deadLetters[0];

      const retried = await testService.retryDelivery(dlItem.id, merchantA);
      assert(retried.response_code === 200, 'Manual retry succeeded with HTTP 200');
      assert(retried.is_dead_letter === false, 'Successful manual retry cleared dead-letter state');
    } finally {
      await new Promise<void>((resolve) => recoveryServer.close(() => resolve()));
    }
  }

  // -------------------------------------------------------------------------
  // 7. Multi-Tenant Merchant Data Isolation
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Security: Cross-Merchant Multi-Tenant Data Isolation ---');
  {
    const merchantB = 'merchant-intruder-bbb-222';

    // Register endpoint for merchant B
    await testService.registerEndpoint(merchantB, 'https://merchant-b.com/callback');

    // Merchant B attempts to fetch Merchant A's deliveries
    const deliveriesB = await testService.getDeliveries(merchantB);
    const includesMerchantAData = deliveriesB.attempts.some((d) => d.merchant_id === merchantA);
    assert(!includesMerchantAData, 'Merchant B cannot see Merchant A delivery history');

    // Merchant B attempts to manually retry Merchant A's delivery
    const { attempts } = await testService.getDeliveries(merchantA);
    const itemA = attempts[0];

    let unauthorizedAccessBlocked = false;
    try {
      await testService.retryDelivery(itemA.id, merchantB);
    } catch (err: any) {
      if (err.message?.includes('Forbidden') || err.message?.includes('another merchant')) {
        unauthorizedAccessBlocked = true;
      }
    }
    assert(unauthorizedAccessBlocked, 'Merchant B blocked with Forbidden error when retrying Merchant A delivery');
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL TESTS PASSED: ${passedTests} / ${totalTests} ASSERTIONS VERIFIED!`);
  console.log('============================================================\n');
}

// Run directly when executed
if (process.argv[1]?.includes('webhook.test')) {
  runWebhookTestSuite().catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
}
