import { supportService, ResolutionStatus } from './support.service.js';
import { db } from '../../config/database.js';

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

export async function runSupportTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING MEMBER 10: PARCEL SUPPORT & EXCEPTION MANAGEMENT TEST SUITE');
  console.log('============================================================\n');

  const dispatcherUser = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'Operational Dispatch Admin',
    role: 'DISPATCHER'
  };

  const trackingNumber = 'SWIFT-991122';

  // Reset test parcel to initial test state
  try {
    await db.query(`UPDATE parcels SET status = 'FAILED' WHERE tracking_number = $1`, [trackingNumber]);
    await db.query(
      `UPDATE parcel_exceptions 
       SET resolution_status = 'OPEN', resolution_notes = 'Awaiting customer callback or dispatcher reschedule instructions.' 
       WHERE parcel_id = (SELECT id FROM parcels WHERE tracking_number = $1)`,
      [trackingNumber]
    );
  } catch (err) {
    // In case db not connected
  }

  // -------------------------------------------------------------------------
  // 1. Query Failed Parcels & Active Exceptions
  // -------------------------------------------------------------------------
  console.log('--- 1. Query Active Exceptions & Failed Parcels ---');
  {
    const exceptions = await supportService.listExceptions();
    assert(exceptions.length >= 2, `Retrieved at least 2 active exceptions (found ${exceptions.length})`);

    const failedParcelExc = exceptions.find(e => e.tracking_number === trackingNumber);
    assert(failedParcelExc !== undefined, `Found exception for failed parcel ${trackingNumber}`);
    assert(failedParcelExc?.parcel_status === 'FAILED', `Parcel status is correctly marked as 'FAILED'`);
    assert(failedParcelExc?.resolution_status === 'OPEN', `Initial exception status is 'OPEN'`);
    assert(
      failedParcelExc?.reason?.includes('Customer not home'),
      `Reason accurately documents failure ('${failedParcelExc?.reason?.substring(0, 30)}...')`
    );
    assert(failedParcelExc?.failure_reason === 'RECIPIENT_UNAVAILABLE', `Courier failure reason linked from proof record`);
  }

  // -------------------------------------------------------------------------
  // 2. Fetch Exception Detail by Tracking ID
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Fetch Detailed Exception Record with Relationships ---');
  {
    const exc = await supportService.getExceptionById(trackingNumber);
    assert(exc !== null, `Successfully retrieved exception detail for ${trackingNumber}`);
    assert(exc?.recipient_name === 'Robert Smith', `Includes recipient name: ${exc?.recipient_name}`);
    assert(exc?.delivery_address?.includes('Colombo 03') === true, `Includes delivery address`);
    assert(Array.isArray(exc?.audit_logs), `Contains linked audit log array`);
    assert((exc?.audit_logs?.length || 0) >= 1, `Audit log contains initial creation event`);
  }

  // -------------------------------------------------------------------------
  // 3. Add Support Triage Note & Verify Audit Information
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Add Support Note & Verify Audit Trail ---');
  {
    const noteText = 'Called customer Robert Smith; confirmed he will be home tomorrow after 2 PM.';
    const updated = await supportService.addSupportNote(trackingNumber, noteText, dispatcherUser);

    assert(
      updated.resolution_notes?.includes(noteText) === true,
      `Support note successfully appended to exception resolution notes`
    );

    // Verify Audit Trail recorded note entry
    const auditLogs = await supportService.getAuditLogs(updated.id);
    const noteAudit = auditLogs.find(a => a.action === 'NOTE_ADDED');
    assert(noteAudit !== undefined, `Immutable audit trail contains 'NOTE_ADDED' event`);
    assert(noteAudit?.changed_by_id === dispatcherUser.id, `Audit trail recorded exact user ID (${dispatcherUser.id})`);
    assert(
      noteAudit?.new_state?.added_note === noteText,
      `Audit trail preserved exact note contents`
    );
  }

  // -------------------------------------------------------------------------
  // 4. Update Resolution Status & Verify Parcel Lifecycle Transition
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Update Resolution Status to RESCHEDULED & Cascade Lifecycle ---');
  {
    const resolutionNote = 'Customer reached via telephone. Re-dispatch approved for next business day.';
    const resolved = await supportService.updateResolutionStatus(
      trackingNumber,
      'RESCHEDULED',
      resolutionNote,
      dispatcherUser
    );

    assert(resolved.resolution_status === 'RESCHEDULED', `Exception resolution status transitioned to 'RESCHEDULED'`);
    assert(resolved.resolved_by_id === dispatcherUser.id, `Resolved by ID recorded as Dispatcher (${dispatcherUser.id})`);

    // Verify parcel status in database transitioned back to CONFIRMED for redelivery
    const parcelRes = await db.query(`SELECT status FROM parcels WHERE tracking_number = $1`, [trackingNumber]);
    assert(parcelRes.rows[0].status === 'CONFIRMED', `Parcel status cascaded from FAILED -> CONFIRMED (ready for re-dispatch)`);

    // Verify parcel_status_history has audit entry
    const historyRes = await db.query(
      `SELECT status, note FROM parcel_status_history WHERE parcel_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [resolved.parcel_id]
    );
    assert(historyRes.rows[0].status === 'CONFIRMED', `Status history logged CONFIRMED transition`);
    assert(historyRes.rows[0].note.includes('rescheduled'), `Status history noted reschedule reason`);

    // Verify support audit log captured status change delta
    const auditLogs = await supportService.getAuditLogs(resolved.id);
    const statusAudit = auditLogs.find(a => a.action === 'STATUS_UPDATED');
    assert(statusAudit !== undefined, `Audit log recorded 'STATUS_UPDATED' event`);
    assert(statusAudit?.previous_state?.resolution_status === 'OPEN', `Audit log recorded previous state as OPEN`);
    assert(statusAudit?.new_state?.resolution_status === 'RESCHEDULED', `Audit log recorded new state as RESCHEDULED`);
  }

  // -------------------------------------------------------------------------
  // 5. Status Filtering & Search Capabilities
  // -------------------------------------------------------------------------
  console.log('\n--- 5. Query Filters (Status & Search) ---');
  {
    const rescheduledList = await supportService.listExceptions({ status: 'RESCHEDULED' });
    assert(
      rescheduledList.some(e => e.tracking_number === trackingNumber),
      `Status filter 'RESCHEDULED' includes updated parcel`
    );

    const searchResult = await supportService.listExceptions({ search: 'Damaged barcode' });
    assert(searchResult.length >= 1, `Search by text query 'Damaged barcode' returns matching exceptions`);
    assert(searchResult[0].tracking_number === 'SWIFT-443322', `Matching parcel is SWIFT-443322`);
  }

  console.log('\n============================================================');
  console.log(`🎉 TEST SUMMARY: ${passedAssertions}/${totalAssertions} assertions passed successfully!`);
  console.log('============================================================\n');
}

// Auto-run when invoked directly via tsx
runSupportTestSuite()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Support test execution failed:', err);
    process.exit(1);
  });

