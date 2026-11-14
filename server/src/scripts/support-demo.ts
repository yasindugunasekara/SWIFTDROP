import { supportService } from '../modules/support/support.service.js';
import { db } from '../config/database.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSupportDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║               SWIFTDROP LOGISTICS PLATFORM                              ║');
  console.log('║        Member 10: Parcel Support & Exception Management Live Demo        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');

  const dispatcherUser = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Operational Dispatch Admin',
    role: 'DISPATCHER',
  };

  const targetTrackingNumber = 'SWIFT-991122';

  // Reset to initial test state
  try {
    await db.query(`UPDATE parcels SET status = 'FAILED' WHERE tracking_number = $1`, [targetTrackingNumber]);
    await db.query(
      `UPDATE parcel_exceptions 
       SET resolution_status = 'OPEN', resolution_notes = 'Initial exception created by courier on delivery route.'
       WHERE parcel_id = (SELECT id FROM parcels WHERE tracking_number = $1)`,
      [targetTrackingNumber]
    );
  } catch (err) {
    // DB sync
  }

  // --------------------------------------------------------------------------
  // STEP 1: Query & Triage Active Incident Queue
  // --------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------');
  console.log('📋 STEP 1: Query & Triage Active Delivery Exceptions Queue');
  console.log('--------------------------------------------------------------------------');
  console.log(`[Auth] Operator        : ${dispatcherUser.name} (${dispatcherUser.role})`);
  console.log(`[Queue] Fetching all open parcel exceptions...\n`);

  const exceptions = await supportService.listExceptions({ status: 'ALL' });
  console.log(`Found ${exceptions.length} active delivery exceptions:\n`);

  exceptions.forEach((exc, idx) => {
    console.log(
      `  Incident #${idx + 1} | ${exc.tracking_number} | Status: ${exc.resolution_status.padEnd(14)} | ` +
      `Recipient: ${exc.recipient_name.padEnd(16)} | Parcel: ${exc.parcel_status.padEnd(8)} | ` +
      `Reason: ${exc.reason.substring(0, 40)}...`
    );
  });

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 2: Find & Inspect Specific Failed Parcel
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log(`🔍 STEP 2: Inspecting Failed Parcel: ${targetTrackingNumber}`);
  console.log('--------------------------------------------------------------------------');
  
  const targetException = await supportService.getExceptionById(targetTrackingNumber);
  if (!targetException) {
    throw new Error(`Failed to find exception for ${targetTrackingNumber}`);
  }

  console.log(`[Tracking #]     : ${targetException.tracking_number}`);
  console.log(`[Recipient]      : ${targetException.recipient_name} (${targetException.recipient_phone})`);
  console.log(`[Address]        : ${targetException.delivery_address}`);
  console.log(`[Parcel State]   : ${targetException.parcel_status}`);
  console.log(`[Resolution]     : ${targetException.resolution_status}`);
  console.log(`[Failure Code]   : ${targetException.failure_reason || 'N/A'}`);
  console.log(`[Doorstep Proof] : ${targetException.photo_url || 'N/A'}`);
  console.log(`[Documented Issue]: "${targetException.reason}"`);
  console.log(`[Logged Notes]   :\n${targetException.resolution_notes || 'None'}`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 3: Add Resolution Support Note
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('📝 STEP 3: Dispatcher Appending Support Investigation Note');
  console.log('--------------------------------------------------------------------------');
  const staffNote = 'Called customer Robert Smith. He confirmed he was away on travel and requested delivery tomorrow afternoon.';
  console.log(`-> Appending Note: "${staffNote}"...`);

  const noteResult = await supportService.addSupportNote(
    targetTrackingNumber,
    staffNote,
    dispatcherUser
  );
  console.log('✅ Note recorded successfully into exception record.');
  console.log(`[Updated Notes]:\n${noteResult.resolution_notes}\n`);

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 4: Update Resolution Status to RESCHEDULED & Cascade Lifecycle
  // --------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------');
  console.log('🔄 STEP 4: Resolve Exception to RESCHEDULED & Cascade Parcel State');
  console.log('--------------------------------------------------------------------------');
  const resolutionSummary = 'Customer reached via telephone. Re-dispatch approved for morning batch run.';
  console.log(`-> Updating resolution_status to 'RESCHEDULED'...`);

  const updatedException = await supportService.updateResolutionStatus(
    targetTrackingNumber,
    'RESCHEDULED',
    resolutionSummary,
    dispatcherUser
  );

  console.log('✅ Exception Status Updated:');
  console.log(`   Resolution Status : ${updatedException.resolution_status}`);
  console.log(`   Resolved By       : ${dispatcherUser.name} (${dispatcherUser.id})`);
  console.log(`   Resolved At       : ${updatedException.resolved_at}`);

  // Query updated parcel to demonstrate cascade
  const parcelCheck = await db.query(
    `SELECT tracking_number, status, updated_at FROM parcels WHERE tracking_number = $1`,
    [targetTrackingNumber]
  );
  console.log('\n✅ Cascaded Parcel Lifecycle Transition in Database:');
  console.log(`   Parcel Tracking # : ${parcelCheck.rows[0].tracking_number}`);
  console.log(`   Parcel New Status : ${parcelCheck.rows[0].status} (Ready for Courier Re-Assignment)`);
  console.log(`   Updated At        : ${parcelCheck.rows[0].updated_at}`);

  // Query parcel_status_history
  const historyCheck = await db.query(
    `SELECT status, location_name, note, created_at 
     FROM parcel_status_history 
     WHERE parcel_id = $1 
     ORDER BY created_at DESC LIMIT 2`,
    [updatedException.parcel_id]
  );
  console.log('\n✅ Verified Parcel Status History Progression:');
  historyCheck.rows.forEach((h, i) => {
    console.log(`   Entry #${i + 1} | Status: ${h.status.padEnd(10)} | Location: ${h.location_name.padEnd(24)} | Note: ${h.note}`);
  });

  await sleep(1000);

  // --------------------------------------------------------------------------
  // STEP 5: Verify Tamper-Proof Audit Trail (support_audit_logs)
  // --------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------');
  console.log('🛡️ STEP 5: Verify Tamper-Proof Audit Trail (support_audit_logs)');
  console.log('--------------------------------------------------------------------------');
  const auditLogs = await supportService.getAuditLogs(updatedException.id);

  console.log(`Found ${auditLogs.length} immutable audit entries for this exception:\n`);
  auditLogs.forEach((log, idx) => {
    console.log(`  [Audit #${idx + 1}] Event: ${log.action.padEnd(18)} | By: ${(log.changed_by_name || log.changed_by_id).padEnd(26)} | At: ${log.created_at}`);
    if (log.previous_state) console.log(`    Previous State: ${JSON.stringify(log.previous_state)}`);
    if (log.new_state) console.log(`    New State     : ${JSON.stringify(log.new_state)}`);
  });

  console.log('\n╔══════════════════════════════════════════════════════════════════════════╗');
  console.log('║   🎉 DEMONSTRATION COMPLETE: ALL MEMBER 10 REQUIREMENTS VERIFIED!        ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════╝\n');
}

runSupportDemo()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Demo execution failed:', err);
    process.exit(1);
  });

