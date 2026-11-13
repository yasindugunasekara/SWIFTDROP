import {
  validateStatusTransition,
  inMemoryCourierStore,
  CourierService,
  ParcelStatus
} from './courier.service.js';

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    console.error(`  ❌ FAIL: ${testName}`, details ? details : '');
    throw new Error(`Assertion failed: ${testName}`);
  }
}

export async function runCourierTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MEMBER 4: COURIER TASK EXECUTION TEST SUITE');
  console.log('============================================================\n');

  // Reset store with clean default seed data
  inMemoryCourierStore.seedDefaultData();
  const courierService = new CourierService();

  const courier1Id = '10111111-1111-1111-1111-111111111111'; // Sunil Silva
  const courier2Id = '20222222-2222-2222-2222-222222222222'; // Kamal Perera

  // -------------------------------------------------------------------------
  // 1. Assigned Job Lists & Filtering
  // -------------------------------------------------------------------------
  console.log('--- 1. Assigned Job Lists & Filtering ---');
  {
    const allJobs = await courierService.getAssignedJobs(courier1Id);
    assert(allJobs.length === 4, `Courier 1 has 4 assigned jobs (found ${allJobs.length})`);

    const outForDeliveryJobs = await courierService.getAssignedJobs(courier1Id, 'OUT_FOR_DELIVERY');
    assert(outForDeliveryJobs.length === 1, `Filter by 'OUT_FOR_DELIVERY' returns 1 job (found ${outForDeliveryJobs.length})`);
    assert(outForDeliveryJobs[0].trackingNumber === 'SWIFT-991122', 'Job tracking number is SWIFT-991122');

    const inTransitJobs = await courierService.getAssignedJobs(courier1Id, 'IN_TRANSIT');
    assert(inTransitJobs.length === 1, `Filter by 'IN_TRANSIT' returns 1 job`);

    const courier2Jobs = await courierService.getAssignedJobs(courier2Id);
    assert(courier2Jobs.length === 1, `Courier 2 has 1 assigned job (SWIFT-556677)`);
  }

  // -------------------------------------------------------------------------
  // 2. Business Rules: Valid Status Transition State Machine
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Business Rules: Status Transition State Machine ---');
  {
    // Valid transitions
    assert(validateStatusTransition('ASSIGNED', 'PICKED_UP').valid === true, 'Allows ASSIGNED -> PICKED_UP');
    assert(validateStatusTransition('PICKED_UP', 'IN_TRANSIT').valid === true, 'Allows PICKED_UP -> IN_TRANSIT');
    assert(validateStatusTransition('IN_TRANSIT', 'OUT_FOR_DELIVERY').valid === true, 'Allows IN_TRANSIT -> OUT_FOR_DELIVERY');
    assert(validateStatusTransition('OUT_FOR_DELIVERY', 'DELIVERED').valid === true, 'Allows OUT_FOR_DELIVERY -> DELIVERED');
    assert(validateStatusTransition('OUT_FOR_DELIVERY', 'FAILED').valid === true, 'Allows OUT_FOR_DELIVERY -> FAILED');
    assert(validateStatusTransition('FAILED', 'OUT_FOR_DELIVERY').valid === true, 'Allows FAILED -> OUT_FOR_DELIVERY (retry)');

    // Invalid transitions (disallowed skips)
    const skip1 = validateStatusTransition('ASSIGNED', 'DELIVERED');
    assert(skip1.valid === false && Boolean(skip1.error?.includes('Invalid transition')), 'Rejects jumping ASSIGNED -> DELIVERED');

    const skip2 = validateStatusTransition('PICKED_UP', 'DELIVERED');
    assert(skip2.valid === false, 'Rejects jumping PICKED_UP -> DELIVERED without transit');

    // Terminal states
    const terminal1 = validateStatusTransition('DELIVERED', 'OUT_FOR_DELIVERY');
    assert(terminal1.valid === false && Boolean(terminal1.error?.includes('terminal')), 'Rejects transitions out of terminal DELIVERED');

    const terminal2 = validateStatusTransition('CANCELLED', 'ASSIGNED');
    assert(terminal2.valid === false, 'Rejects transitions out of terminal CANCELLED');

    // Same status
    const same = validateStatusTransition('OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY');
    assert(same.valid === false && Boolean(same.error?.includes('already in status')), 'Rejects setting identical status');
  }

  // -------------------------------------------------------------------------
  // 3. Security & Ownership: Courier A vs Courier B Access Control
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Security & Ownership Rules: Multi-Courier Access Control ---');
  {
    // Courier 1 tries to update Courier 2's parcel (SWIFT-556677)
    let courier1TamperError: string | null = null;
    try {
      await courierService.updateParcelStatus(
        courier1Id,
        'SWIFT-556677',
        'DELIVERED'
      );
    } catch (err: any) {
      courier1TamperError = err.message;
    }
    assert(
      courier1TamperError !== null && courier1TamperError.includes('Forbidden'),
      'Courier 1 rejected with 403 Forbidden when attempting to update Courier 2 parcel'
    );

    // Courier 2 tries to update Courier 1's parcel (SWIFT-991122)
    let courier2TamperError: string | null = null;
    try {
      await courierService.updateParcelStatus(
        courier2Id,
        'SWIFT-991122',
        'DELIVERED'
      );
    } catch (err: any) {
      courier2TamperError = err.message;
    }
    assert(
      courier2TamperError !== null && courier2TamperError.includes('Forbidden'),
      'Courier 2 rejected with 403 Forbidden when attempting to update Courier 1 parcel'
    );

    // Courier 2 tries to upload proof for Courier 1's parcel
    let proofTamperError: string | null = null;
    try {
      await courierService.uploadDeliveryProof(
        courier2Id,
        'SWIFT-991122',
        { photoUrl: 'http://evil.com/fake.jpg' }
      );
    } catch (err: any) {
      proofTamperError = err.message;
    }
    assert(
      proofTamperError !== null && proofTamperError.includes('Forbidden'),
      'Courier 2 rejected when uploading proof photo to unauthorized parcel'
    );
  }

  // -------------------------------------------------------------------------
  // 4. End-to-End Delivery Lifecycle with Proof Photo & Signature
  // -------------------------------------------------------------------------
  console.log('\n--- 4. End-to-End Delivery Execution Lifecycle ---');
  {
    const targetTracking = 'SWIFT-665522'; // Currently ASSIGNED

    // Step 1: Courier 1 picks up parcel
    const pickupRes = await courierService.updateParcelStatus(
      courier1Id,
      targetTracking,
      'PICKED_UP',
      'Parcel verified and loaded onto bike'
    );
    assert(pickupRes.status === 'PICKED_UP', 'Status transitioned to PICKED_UP');

    // Step 2: In transit to delivery hub/corridor
    const transitRes = await courierService.updateParcelStatus(
      courier1Id,
      targetTracking,
      'IN_TRANSIT',
      'Approaching Sector 4 delivery area'
    );
    assert(transitRes.status === 'IN_TRANSIT', 'Status transitioned to IN_TRANSIT');

    // Step 3: Out for delivery
    const outRes = await courierService.updateParcelStatus(
      courier1Id,
      targetTracking,
      'OUT_FOR_DELIVERY',
      'Arrived at recipient residence'
    );
    assert(outRes.status === 'OUT_FOR_DELIVERY', 'Status transitioned to OUT_FOR_DELIVERY');

    // Step 4: Attempting DELIVERED without proof photo must fail
    let noProofError: string | null = null;
    try {
      await courierService.updateParcelStatus(
        courier1Id,
        targetTracking,
        'DELIVERED',
        'Marking without photo'
      );
    } catch (err: any) {
      noProofError = err.message;
    }
    assert(
      noProofError !== null && noProofError.includes('Proof photo required'),
      'DELIVERED transition blocked when proof photo is missing'
    );

    // Step 5: Upload proof photo and signature
    const proofRes = await courierService.uploadDeliveryProof(
      courier1Id,
      targetTracking,
      {
        photoUrl: '/uploads/proof-doorstep-sarah-connor.jpg',
        recipientSignatureUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0...',
        recipientNote: 'Handed directly to recipient at front gate'
      }
    );
    assert(proofRes.photoUrl === '/uploads/proof-doorstep-sarah-connor.jpg', 'Proof photo recorded successfully');
    assert(Boolean(proofRes.recipientSignatureUrl), 'Recipient signature URL attached');

    // Step 6: Mark DELIVERED with proof photo present
    const deliveredRes = await courierService.updateParcelStatus(
      courier1Id,
      targetTracking,
      'DELIVERED',
      'Successfully delivered and signed'
    );
    assert(deliveredRes.status === 'DELIVERED', 'Status successfully updated to DELIVERED');
    assert(deliveredRes.latestProof !== undefined, 'Latest proof record included in parcel data');

    // Verify timeline history contains all steps
    const jobDetails = await courierService.getJobDetails(courier1Id, targetTracking);
    assert((jobDetails?.statusHistory?.length || 0) >= 5, `Status history timeline has ${jobDetails?.statusHistory?.length} records`);
  }

  // -------------------------------------------------------------------------
  // 5. Failure Reason Entry & Exception Handling
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Delivery Failure Exception & Reason Entry ---');
  {
    const failTracking = 'SWIFT-882233'; // Currently IN_TRANSIT

    // Transition to OUT_FOR_DELIVERY first
    await courierService.updateParcelStatus(courier1Id, failTracking, 'OUT_FOR_DELIVERY');

    // Mark as failed with documented reason
    const failedParcel = await courierService.recordDeliveryFailure(
      courier1Id,
      failTracking,
      'RECIPIENT_UNAVAILABLE',
      'Attempted 3 phone calls; gate locked, no answer'
    );

    assert(failedParcel.status === 'FAILED', 'Parcel status updated to FAILED');
    assert(failedParcel.latestProof?.failureReason === 'RECIPIENT_UNAVAILABLE', 'Failure reason properly recorded in proof record');
    assert(
      failedParcel.latestProof?.recipientNote?.includes('Attempted 3 phone calls'),
      'Detailed recipient failure note preserved'
    );

    // Can transition back to OUT_FOR_DELIVERY for retry
    const retryRes = await courierService.updateParcelStatus(
      courier1Id,
      failTracking,
      'OUT_FOR_DELIVERY',
      'Re-attempting delivery during evening run'
    );
    assert(retryRes.status === 'OUT_FOR_DELIVERY', 'Successfully re-opened for delivery retry');
  }

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passedAssertions} / ${totalAssertions} ASSERTIONS PASSED SUCCESSFULLY!`);
  console.log('============================================================\n');
}

// Auto-run if executed directly via CLI
if (process.argv[1] && process.argv[1].endsWith('courier.test.ts')) {
  runCourierTestSuite().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}

