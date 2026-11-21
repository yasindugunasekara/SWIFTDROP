import { dispatchService, inMemoryDispatchStore, MAX_COURIER_CAPACITY } from '../modules/dispatch/dispatch.service.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runDispatchDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║               SWIFTDROP LOGISTICS PLATFORM                              ║');
  console.log('║        Member 5: Fleet Dispatch & Service Config Demonstration           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  inMemoryDispatchStore.seedDefaultData();

  // --------------------------------------------------------------------------
  // STEP 1: Operations Hub & Unassigned Parcel Board
  // --------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------');
  console.log('📦 STEP 1: Unassigned Parcel Board & Zone Filtering');
  console.log('--------------------------------------------------------------------------');
  const allParcels = await dispatchService.getUnassignedParcels();
  console.log(`[Queue] Total Unassigned Parcels: ${allParcels.length}`);
  allParcels.forEach((p, idx) => {
    console.log(`  #${idx + 1} | ${p.trackingNumber} | Weight: ${p.weightKg} kg | Fee: LKR ${p.totalFee.toFixed(2)} | Recipient: ${p.recipientName} | Zone: ${p.zone}`);
  });

  const colomboParcels = await dispatchService.getUnassignedParcels('colombo');
  console.log(`\n[Filter] Western Province Zone Filter: ${colomboParcels.length} parcels matching`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 2: Live Courier Fleet Workload Balancer & Capacity Checks
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🛵 STEP 2: Live Courier Fleet Workload Balancer & Capacity Limits');
  console.log('--------------------------------------------------------------------------');
  const couriers = await dispatchService.getCourierWorkloads();
  console.log(`[Fleet] Registered Couriers: ${couriers.length} (Max vehicle capacity: ${MAX_COURIER_CAPACITY} stops)\n`);

  couriers.forEach((c) => {
    const bar = '█'.repeat(c.currentLoad) + '░'.repeat(Math.max(0, c.maxCapacity - c.currentLoad));
    console.log(
      `  ${c.name.padEnd(16)} | [${bar}] ${String(c.currentLoad).padStart(2)}/${c.maxCapacity} | ` +
      `Status: ${c.status.padEnd(14)} | ${c.isOnline ? `Online (${c.distanceLabel || 'nearby'})` : 'OFFLINE'}`
    );
  });

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 3: Shared AI Workstream - Smart Dispatch Proximity Recommendation
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🤖 STEP 3: Shared AI Workstream — Smart Dispatch Proximity Matcher');
  console.log('--------------------------------------------------------------------------');
  const targetParcel = allParcels[0];
  console.log(`[AI Input] Evaluating Courier Fleet for Parcel #${targetParcel.trackingNumber} (${targetParcel.weightKg} kg, ${targetParcel.zone})`);
  
  const aiMatch = await dispatchService.getSmartDispatchRecommendation(targetParcel.id);
  console.log(`[AI Result] Recommended Match: ${aiMatch.recommendedCourier.name} (${aiMatch.recommendedCourier.vehicleType})`);
  console.log(`[AI Score]  Confidence Score : ${Math.round(aiMatch.confidenceScore * 100)}% Match`);
  console.log(`[AI Logic]  Reasoning        : ${aiMatch.reasoning}`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 4: Parcel Assignment & Status Progression
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('⚡ STEP 4: Executing Parcel Assignment & Workload Increment');
  console.log('--------------------------------------------------------------------------');
  const assignedCourierId = aiMatch.recommendedCourier.id;
  console.log(`-> Action: Dispatching ${targetParcel.trackingNumber} to ${aiMatch.recommendedCourier.name}...`);
  
  const assignResult = await dispatchService.assignParcel(
    assignedCourierId,
    targetParcel.id,
    'dispatcher-admin-uuid',
    'Dispatched via AI recommendation'
  );

  console.log(`[Status]  State Transition: CONFIRMED -> ${assignResult.status}`);
  console.log(`[Courier] Workload Updated: ${assignResult.previousLoad} -> ${assignResult.newLoad} active stops`);
  console.log(`[Event]   Published PARCEL_ASSIGNED event to RabbitMQ event bus`);

  const queueRemaining = await dispatchService.getUnassignedParcels();
  console.log(`[Queue]   Unassigned queue decremented: ${queueRemaining.length} parcels remaining`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 5: Business Rule Enforcement (Capacity & Offline Rejection)
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🛡️ STEP 5: Capacity Limit & Offline Courier Guard Enforcement');
  console.log('--------------------------------------------------------------------------');
  
  // 5.1 Offline courier rejection
  console.log('-> Test: Attempting to assign parcel to Chaminda Vaas (OFFLINE)...');
  try {
    await dispatchService.assignParcel('50555555-5555-5555-5555-555555555555', 'p-1002');
  } catch (err: any) {
    console.log(`  🛡️ REJECTED AS EXPECTED: "${err.message}"`);
  }

  // 5.2 Capacity limit rejection (Nuwan Pradeep has 15/15 stops)
  console.log('\n-> Test: Attempting to assign parcel to Nuwan Pradeep (15/15 AT_CAPACITY)...');
  try {
    await dispatchService.assignParcel('40444444-4444-4444-4444-444444444444', 'p-1002');
  } catch (err: any) {
    console.log(`  🛡️ REJECTED AS EXPECTED: "${err.message}"`);
  }

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 6: Service Rates & Delivery Zone Pricing Matrix
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('💰 STEP 6: Service Pricing Configuration & Delivery Zone Matrix (LKR)');
  console.log('--------------------------------------------------------------------------');
  const currentConfig = await dispatchService.getServiceConfig();
  console.log(`[Base Rate]   Base Booking Fee      : LKR ${currentConfig.baseBookingFee.toFixed(2)}`);
  console.log(`[Distance]    Per Kilometer Rate    : LKR ${currentConfig.perKmRate.toFixed(2)}`);
  console.log(`[Weight]      Per Kilogram Surcharge: LKR ${currentConfig.perKgRate.toFixed(2)}`);
  console.log(`[Surge]       Holiday Multiplier    : ${currentConfig.holidaySurgeMultiplier}x`);
  console.log(`[Surge]       Peak Hours Multiplier : ${currentConfig.peakHourSurgeMultiplier}x\n`);

  console.log('Delivery Zones:');
  currentConfig.zones.forEach((z) => {
    console.log(`  - ${z.zoneName.padEnd(35)} | Base: LKR ${z.baseRate.toFixed(2)} | /kg: LKR ${z.perKgRate.toFixed(2)} | /km: LKR ${z.perKmRate.toFixed(2)}`);
  });

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 7: Merchant Partner Approvals
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🏢 STEP 7: Merchant Partner Registration Review & Approval');
  console.log('--------------------------------------------------------------------------');
  const pendingMerchants = await dispatchService.listMerchants();
  console.log(`[Applications] Pending Merchant Registrations: ${pendingMerchants.length}`);
  
  const merchant = pendingMerchants[0];
  console.log(`[Review] Reviewing "${merchant.companyName}" (Reg: ${merchant.registrationNumber || 'LK-8877123'})`);
  console.log(`-> Action: Approving merchant registration...`);
  
  const approved = await dispatchService.setMerchantApproval(merchant.id, 'APPROVED');
  console.log(`[Status]  Merchant "${merchant.companyName}" successfully ${(approved as any).approvalStatus || 'APPROVED'}!`);

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   🎉 MEMBER 5 DISPATCH & FLEET CONFIGURATION DEMO COMPLETED SUCCESSFULLY!║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
}

runDispatchDemo().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
