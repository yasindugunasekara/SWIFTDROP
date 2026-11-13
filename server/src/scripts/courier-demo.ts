import {
  CourierService,
  inMemoryCourierStore,
  validateStatusTransition
} from '../modules/courier/courier.service.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCourierDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║               SWIFTDROP LOGISTICS PLATFORM                              ║');
  console.log('║           Member 4: Courier Task Execution Live Demonstration            ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  inMemoryCourierStore.seedDefaultData();
  const courierService = new CourierService();

  const courier1Id = '10111111-1111-1111-1111-111111111111'; // Sunil Silva
  const courier2Id = '20222222-2222-2222-2222-222222222222'; // Kamal Perera

  // --------------------------------------------------------------------------
  // STEP 1: Courier Authentication & Shift Assignment Overview
  // --------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------');
  console.log('🛵 STEP 1: Courier Authentication & Shift Assignment Overview');
  console.log('--------------------------------------------------------------------------');
  console.log('[Auth] Authenticated as: Sunil Silva (Courier Pro #101)');
  console.log(`[ID]   Courier UUID     : ${courier1Id}`);

  const sunilJobs = await courierService.getAssignedJobs(courier1Id);
  console.log(`[Shift] Active Shift     : Western Corridor Run (Zone 03)`);
  console.log(`[Queue] Total Stops      : ${sunilJobs.length} assigned delivery packages\n`);

  sunilJobs.forEach((job, idx) => {
    console.log(
      `  Stop #${idx + 1} | ${job.trackingNumber} | ${job.recipientName.padEnd(16)} | ` +
      `Status: ${job.status.padEnd(16)} | Address: ${job.deliveryAddress}`
    );
  });

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 2: Step-by-Step Delivery Progression Pipeline
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('📦 STEP 2: Step-by-Step Delivery Progression Pipeline');
  console.log('--------------------------------------------------------------------------');
  const targetJob = sunilJobs.find((j) => j.status === 'ASSIGNED') || sunilJobs[0];
  console.log(`[Execution] Selecting Stop: ${targetJob.trackingNumber} (${targetJob.recipientName})`);
  console.log(`[Initial Status] ${targetJob.status}\n`);

  // 2.1: Pick up
  console.log('-> Action: Picking up parcel from hub/merchant...');
  const pickedUp = await courierService.updateParcelStatus(
    courier1Id,
    targetJob.trackingNumber,
    'PICKED_UP',
    'Parcel verified against barcode manifest and loaded'
  );
  console.log(`  ✅ Status Updated: ${pickedUp.status}`);

  await sleep(600);

  // 2.2: In transit
  console.log('-> Action: Moving in transit towards destination zone...');
  const inTransit = await courierService.updateParcelStatus(
    courier1Id,
    targetJob.trackingNumber,
    'IN_TRANSIT',
    'Traversing Western Express corridor, 3.2km away'
  );
  console.log(`  ✅ Status Updated: ${inTransit.status}`);

  await sleep(600);

  // 2.3: Out for delivery
  console.log('-> Action: Arrived at recipient street / building...');
  const outForDelivery = await courierService.updateParcelStatus(
    courier1Id,
    targetJob.trackingNumber,
    'OUT_FOR_DELIVERY',
    'Courier arrived at recipient premises'
  );
  console.log(`  ✅ Status Updated: ${outForDelivery.status}`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 3: Business Rule Enforcement - Missing Proof Photo Blocked
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🛡️ STEP 3: Business Rule Guard - Delivery Completion Requires Proof Photo');
  console.log('--------------------------------------------------------------------------');
  console.log('-> Attempting to mark as DELIVERED without capturing proof photo...');

  try {
    await courierService.updateParcelStatus(
      courier1Id,
      targetJob.trackingNumber,
      'DELIVERED',
      'Attempting delivery without photo'
    );
    console.error('  ❌ FAILED: Should have rejected transition without proof photo!');
  } catch (err: any) {
    console.log(`  🛡️ BLOCKED (Business Rule Enforced): "${err.message}"`);
  }

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 4: Doorstep Camera Photo Proof Upload & Delivery Completion
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('📸 STEP 4: Doorstep Camera Photo Proof Upload & Delivery Completion');
  console.log('--------------------------------------------------------------------------');
  console.log('-> Capturing doorstep camera photo and recipient digital signature...');

  const proof = await courierService.uploadDeliveryProof(
    courier1Id,
    targetJob.trackingNumber,
    {
      photoUrl: '/uploads/proof-doorstep-sarah-connor.jpg',
      recipientSignatureUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0...',
      recipientNote: 'Handed directly to recipient at front entrance'
    }
  );
  console.log(`  ✅ Proof Photo Uploaded : ${proof.photoUrl}`);
  console.log(`  ✅ Digital Signature    : Attached`);
  console.log(`  ✅ Recipient Note       : "${proof.recipientNote}"`);

  console.log('\n-> Re-attempting delivery confirmation with proof attached...');
  const delivered = await courierService.updateParcelStatus(
    courier1Id,
    targetJob.trackingNumber,
    'DELIVERED',
    'Customer confirmed handover'
  );
  console.log(`  🎉 SUCCESS: Parcel is now [${delivered.status}]!`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 5: Multi-Courier Security & Authorization Enforcement (Member 4 Rule)
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🔒 STEP 5: Security & Authorization - Courier Cross-Assignment Protection');
  console.log('--------------------------------------------------------------------------');
  console.log('[Scenario] Courier 2 (Kamal Perera) tries to update Courier 1 (Sunil Silva)\'s parcel:');
  console.log(`  Target Parcel : ${targetJob.trackingNumber} (Assigned to Sunil Silva)`);
  console.log(`  Attacker User : Kamal Perera (ID: ${courier2Id})`);

  try {
    await courierService.updateParcelStatus(
      courier2Id,
      targetJob.trackingNumber,
      'IN_TRANSIT',
      'Malicious attempt by unauthorized courier'
    );
    console.error('  ❌ SECURITY BREACH: Unauthorized courier was able to update parcel!');
  } catch (err: any) {
    console.log(`  🛡️ ACCESS DENIED (403 Forbidden): "${err.message}"`);
    console.log('  ✅ Security Rule Enforced: Couriers are strictly prohibited from modifying parcels assigned to other couriers.');
  }

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 6: Delivery Failure Reason Entry & Exception Logging
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('⚠️ STEP 6: Delivery Exception & Failure Reason Entry');
  console.log('--------------------------------------------------------------------------');
  const failJob = sunilJobs.find((j) => j.status === 'IN_TRANSIT') || sunilJobs[1];
  console.log(`[Exception Target] ${failJob.trackingNumber} (${failJob.recipientName})`);
  console.log('-> Moving to OUT_FOR_DELIVERY...');
  await courierService.updateParcelStatus(courier1Id, failJob.trackingNumber, 'OUT_FOR_DELIVERY');

  console.log('-> Logging failure: Recipient unreachable after multiple doorstep attempts...');
  const failedRecord = await courierService.recordDeliveryFailure(
    courier1Id,
    failJob.trackingNumber,
    'RECIPIENT_UNAVAILABLE',
    'Premises gate locked; called +94 71 876 5432 three times with no response.'
  );

  console.log(`  ⚠️ Status Set to    : ${failedRecord.status}`);
  console.log(`  ⚠️ Failure Reason   : ${failedRecord.latestProof?.failureReason}`);
  console.log(`  ⚠️ Detailed Note    : "${failedRecord.latestProof?.recipientNote}"`);
  console.log('  ✅ Exception safely logged in audit history and forwarded to support.');

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║           MEMBER 4 COURIER DEMONSTRATION COMPLETE                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
}

runCourierDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});

