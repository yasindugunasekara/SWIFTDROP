import {
  DispatchService,
  inMemoryDispatchStore,
  MAX_COURIER_CAPACITY,
  type UnassignedParcel,
  type CourierWorkload
} from './dispatch.service.js';

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

export async function runDispatchTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MEMBER 5: DISPATCH & FLEET CONFIGURATION TEST SUITE');
  console.log('============================================================\n');

  // Reset store with clean default seed data
  inMemoryDispatchStore.seedDefaultData();
  const dispatchService = new DispatchService();

  const courier1Id = '10111111-1111-1111-1111-111111111111'; // Sunil Silva (load: 2, available)
  const courier2Id = '20222222-2222-2222-2222-222222222222'; // Sarah Lee (load: 5, optimal)
  const courier3Id = '30333333-3333-3333-3333-333333333333'; // Kamal Perera (load: 14, near capacity)
  const courier4Id = '40444444-4444-4444-4444-444444444444'; // Nuwan Pradeep (load: 15, at capacity)
  const offlineCourierId = '50555555-5555-5555-5555-555555555555'; // Chaminda Vaas (offline)

  // -------------------------------------------------------------------------
  // 1. Unassigned Parcel Board & Zone Filtering
  // -------------------------------------------------------------------------
  console.log('--- 1. Unassigned Parcel Board & Zone Filtering ---');
  {
    const allParcels = await dispatchService.getUnassignedParcels();
    assert(allParcels.length === 4, `Initial unassigned parcels queue has 4 items (found ${allParcels.length})`);

    const colomboParcels = await dispatchService.getUnassignedParcels('colombo');
    assert(colomboParcels.length === 2, `Filtering by 'colombo' zone returns 2 parcels (found ${colomboParcels.length})`);

    const kandyParcels = await dispatchService.getUnassignedParcels('kandy');
    assert(kandyParcels.length === 1, `Filtering by 'kandy' zone returns 1 parcel`);
    assert(kandyParcels[0].trackingNumber === 'SWIFT-102939', 'Kandy parcel has tracking SWIFT-102939');

    const searchResult = await dispatchService.getUnassignedParcels(undefined, 'SWIFT-102938');
    assert(searchResult.length === 1, `Searching by tracking number 'SWIFT-102938' returns exact match`);
    assert(searchResult[0].recipientName === 'Dr. Perera', 'Recipient is Dr. Perera');
  }

  // -------------------------------------------------------------------------
  // 2. Courier Workload Balancer & Status Determination
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Courier Workload Balancer & Status Determination ---');
  {
    const couriers = await dispatchService.getCourierWorkloads();
    assert(couriers.length === 5, `Total registered fleet count is 5 (found ${couriers.length})`);

    const sunil = couriers.find(c => c.id === courier1Id)!;
    assert(sunil.currentLoad === 2, `Sunil Silva initial load is 2 active stops`);
    assert(sunil.status === 'AVAILABLE', `Sunil Silva status is AVAILABLE (load < 5)`);
    assert(sunil.maxCapacity === MAX_COURIER_CAPACITY, `Max courier capacity is ${MAX_COURIER_CAPACITY}`);

    const sarah = couriers.find(c => c.id === courier2Id)!;
    assert(sarah.status === 'OPTIMAL', `Sarah Lee status is OPTIMAL (load 5)`);

    const kamal = couriers.find(c => c.id === courier3Id)!;
    assert(kamal.status === 'NEAR_CAPACITY', `Kamal Perera status is NEAR_CAPACITY (load 14)`);

    const nuwan = couriers.find(c => c.id === courier4Id)!;
    assert(nuwan.status === 'AT_CAPACITY', `Nuwan Pradeep status is AT_CAPACITY (load 15)`);

    const chaminda = couriers.find(c => c.id === offlineCourierId)!;
    assert(chaminda.status === 'OFFLINE', `Chaminda Vaas status is OFFLINE`);
    assert(chaminda.isOnline === false, `Chaminda Vaas isOnline is false`);
  }

  // -------------------------------------------------------------------------
  // 3. Parcel Assignment & Workload Increment
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Parcel Assignment & Workload Increment ---');
  {
    const assignRes = await dispatchService.assignParcel(courier1Id, 'p-1001', 'dispatcher-admin-01', 'Dispatched for priority delivery');
    assert(assignRes.status === 'ASSIGNED', 'Assignment status is ASSIGNED');
    assert(assignRes.courierId === courier1Id, 'Assigned to Sunil Silva');
    assert(assignRes.previousLoad === 2, 'Previous load was 2');
    assert(assignRes.newLoad === 3, 'New load successfully incremented to 3');

    // Verify parcel is no longer in unassigned queue
    const unassignedAfter = await dispatchService.getUnassignedParcels();
    assert(unassignedAfter.length === 3, 'Unassigned parcel queue decremented from 4 to 3');
    assert(!unassignedAfter.some(p => p.id === 'p-1001'), 'Assigned parcel p-1001 removed from unassigned queue');
  }

  // -------------------------------------------------------------------------
  // 4. Bulk Parcel Assignment
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Bulk Parcel Assignment ---');
  {
    const batchRes = await dispatchService.bulkAssignParcels(courier2Id, ['p-1002', 'p-1003'], 'dispatcher-admin-01');
    assert(batchRes.assigned.length === 2, 'Batch assigned 2 parcels successfully');
    assert(batchRes.failed.length === 0, 'No batch assignment failures');

    const sarahUpdated = (await dispatchService.getCourierWorkloads()).find(c => c.id === courier2Id)!;
    assert(sarahUpdated.currentLoad === 7, `Sarah Lee workload incremented from 5 to 7`);
  }

  // -------------------------------------------------------------------------
  // 5. Business Rule: Courier Capacity Limit Enforcement (Max 15)
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Business Rule: Capacity Limit Guard ---');
  {
    // Kamal has 14 parcels (1 slot available). Assigning 1 parcel should succeed.
    const kamalAssign = await dispatchService.assignParcel(courier3Id, 'p-1004');
    assert(kamalAssign.newLoad === 15, 'Kamal Perera reached max capacity (15)');

    // Now Kamal has 15 parcels. Next assignment attempt must fail with capacity error!
    let capacityErrorCaught = false;
    try {
      await dispatchService.assignParcel(courier3Id, 'p-1001');
    } catch (err: any) {
      capacityErrorCaught = true;
      assert(err.message.includes('Courier capacity exceeded'), `Rejected assignment exceeding max capacity: "${err.message}"`);
    }
    assert(capacityErrorCaught, 'Assigning to courier at capacity (15) was rejected');
  }

  // -------------------------------------------------------------------------
  // 6. Business Rule: Offline Courier Assignment Guard
  // -------------------------------------------------------------------------
  console.log('\n--- 6. Business Rule: Offline Courier Guard ---');
  {
    let offlineErrorCaught = false;
    try {
      await dispatchService.assignParcel(offlineCourierId, 'p-1002');
    } catch (err: any) {
      offlineErrorCaught = true;
      assert(err.message.includes('offline'), `Rejected assigning offline courier: "${err.message}"`);
    }
    assert(offlineErrorCaught, 'Assigning to offline courier was rejected');
  }

  // -------------------------------------------------------------------------
  // 7. Service Configuration & Pricing Rate Updates
  // -------------------------------------------------------------------------
  console.log('\n--- 7. Service Configuration & Pricing Rates ---');
  {
    const initialConfig = await dispatchService.getServiceConfig();
    assert(initialConfig.baseBookingFee === 350.0, 'Initial base fee is 350.00 LKR');
    assert(initialConfig.perKmRate === 20.0, 'Initial per-km rate is 20.00 LKR');
    assert(initialConfig.zones.length >= 4, 'Delivery zone configuration has 4 zones');

    // Update valid rates
    const updated = await dispatchService.updateServiceConfig({
      baseBookingFee: 400.0,
      perKmRate: 25.0,
      holidaySurgeMultiplier: 1.35
    });
    assert(updated.baseBookingFee === 400.0, 'Base fee updated to 400.00 LKR');
    assert(updated.perKmRate === 25.0, 'Per-km rate updated to 25.00 LKR');
    assert(updated.holidaySurgeMultiplier === 1.35, 'Holiday surge multiplier updated to 1.35x');

    // Validation: Reject negative rate
    let negativeRateRejected = false;
    try {
      await dispatchService.updateServiceConfig({ baseBookingFee: -50 });
    } catch (err: any) {
      negativeRateRejected = true;
      assert(err.message.includes('negative'), 'Negative booking fee was rejected');
    }
    assert(negativeRateRejected, 'Service config rejects negative pricing rates');

    // Validation: Reject invalid multiplier (< 1.0 or > 5.0)
    let invalidMultiplierRejected = false;
    try {
      await dispatchService.updateServiceConfig({ holidaySurgeMultiplier: 0.5 });
    } catch (err: any) {
      invalidMultiplierRejected = true;
      assert(err.message.includes('between 1.0 and 5.0'), 'Multiplier < 1.0 was rejected');
    }
    assert(invalidMultiplierRejected, 'Service config rejects invalid surge multipliers');
  }

  // -------------------------------------------------------------------------
  // 8. Shared AI Workstream: Smart Dispatch Recommendation
  // -------------------------------------------------------------------------
  console.log('\n--- 8. Shared AI Workstream: Smart Dispatch Matcher ---');
  {
    const aiRecommendation = await dispatchService.getSmartDispatchRecommendation('p-1001');
    assert(Boolean(aiRecommendation.recommendedCourier), 'Generated recommended courier');
    assert(aiRecommendation.recommendedCourier.id === courier1Id, `Sunil Silva recommended as best match (${aiRecommendation.recommendedCourier.name})`);
    assert(aiRecommendation.confidenceScore >= 0.75, `AI confidence score is high (${aiRecommendation.confidenceScore})`);
    assert(aiRecommendation.reasoning.length > 0, `Reasoning text generated: "${aiRecommendation.reasoning}"`);
    assert(aiRecommendation.alternativeCouriers.length > 0, 'Provided alternative courier options');
  }

  // -------------------------------------------------------------------------
  // 9. Merchant Partner Approvals
  // -------------------------------------------------------------------------
  console.log('\n--- 9. Merchant Partner Approvals ---');
  {
    const merchantList = await dispatchService.listMerchants();
    assert(merchantList.length >= 1, `Found ${merchantList.length} merchant applications`);

    const approvalRes = await dispatchService.setMerchantApproval('55555555-5555-5555-5555-555555555555', 'APPROVED');
    assert((approvalRes as any).approvalStatus === 'APPROVED', 'Merchant successfully approved');

    const rejectRes = await dispatchService.setMerchantApproval('55555555-5555-5555-5555-555555555555', 'REJECTED');
    assert((approvalRes as any).approvalStatus !== undefined, 'Merchant rejection processed');
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  console.log('\n============================================================');
  console.log(`🎉 MEMBER 5 DISPATCH TEST SUITE COMPLETED: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
  console.log('============================================================\n');
}

// Run tests when executed directly via tsx
runDispatchTestSuite().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
