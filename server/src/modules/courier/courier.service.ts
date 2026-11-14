import crypto from 'crypto';
import { db } from '../../config/database.js';
import { getRabbitMQChannel } from '../../config/rabbitmq.js';

// =============================================================================
// MEMBER 4: COURIER TASK EXECUTION TYPES & STATE MACHINE
// =============================================================================

export type ParcelStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'ASSIGNED'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'RETURNED'
  | 'CANCELLED';

export const VALID_STATUS_TRANSITIONS: Record<ParcelStatus, ParcelStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ASSIGNED', 'CANCELLED'],
  ASSIGNED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  FAILED: ['OUT_FOR_DELIVERY', 'RETURNED'],
  DELIVERED: [], // Terminal state: Cannot transition from DELIVERED
  RETURNED: [],  // Terminal state: Cannot transition from RETURNED
  CANCELLED: []  // Terminal state: Cannot transition from CANCELLED
};

export interface DeliveryProofRecord {
  id: string;
  parcelId: string;
  courierId: string;
  photoUrl: string;
  recipientSignatureUrl?: string;
  failureReason?: string;
  recipientNote?: string;
  createdAt: string;
}

export interface StatusHistoryRecord {
  id: string;
  parcelId: string;
  courierId?: string;
  status: ParcelStatus;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  note?: string;
  createdAt: string;
}

export interface AssignedJob {
  id: string; // parcel UUID
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  weightKg: number;
  dimensionLengthCm?: number;
  dimensionWidthCm?: number;
  dimensionHeightCm?: number;
  totalFee: number;
  status: ParcelStatus;
  specialNotes?: string;
  assignedAt: string;
  courierId: string;
  courierName?: string;
  stopNumber?: number;
  latestProof?: DeliveryProofRecord;
  statusHistory?: StatusHistoryRecord[];
}

export interface UpdateStatusInput {
  status: ParcelStatus;
  note?: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
}

export interface UploadProofInput {
  photoUrl: string;
  recipientSignatureUrl?: string;
  failureReason?: string;
  recipientNote?: string;
}

// -----------------------------------------------------------------------------
// BUSINESS RULE VALIDATORS
// -----------------------------------------------------------------------------

/**
 * Validates whether transitioning from currentStatus to nextStatus is allowed by business rules.
 */
export function validateStatusTransition(currentStatus: ParcelStatus, nextStatus: ParcelStatus): {
  valid: boolean;
  error?: string;
} {
  if (currentStatus === nextStatus) {
    return {
      valid: false,
      error: `Parcel is already in status '${currentStatus}'`
    };
  }

  const allowedNextStatuses = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  if (allowedNextStatuses.length === 0) {
    return {
      valid: false,
      error: `Status '${currentStatus}' is a terminal state and cannot be modified`
    };
  }

  if (!allowedNextStatuses.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid transition: Cannot transition from '${currentStatus}' to '${nextStatus}'. Allowed transitions: [${allowedNextStatuses.join(', ')}]`
    };
  }

  return { valid: true };
}

// -----------------------------------------------------------------------------
// IN-MEMORY FALLBACK DATA STORE (For high-speed tests, CI, and local execution)
// -----------------------------------------------------------------------------

export class CourierDataStore {
  private parcels: Map<string, AssignedJob> = new Map();
  private assignments: Map<string, { parcelId: string; courierId: string; courierName: string; assignedAt: string; isActive: boolean }> = new Map();
  private proofs: Map<string, DeliveryProofRecord> = new Map();
  private history: StatusHistoryRecord[] = [];

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData() {
    this.parcels.clear();
    this.assignments.clear();
    this.proofs.clear();
    this.history = [];

    const courier1Id = '10111111-1111-1111-1111-111111111111'; // Sunil Silva (Courier #101)
    const courier2Id = '20222222-2222-2222-2222-222222222222'; // Kamal Perera (Courier #102)

    // Parcel 1: Sunil's active out-for-delivery stop
    const p1: AssignedJob = {
      id: 'p1111111-1111-1111-1111-111111111111',
      trackingNumber: 'SWIFT-991122',
      senderName: 'Apex Electronics',
      senderPhone: '+94 11 234 5678',
      pickupAddress: '45 Galle Road, Colombo 03',
      recipientName: 'Robert Smith',
      recipientPhone: '+94 77 987 6543',
      deliveryAddress: '742 Evergreen Terrace, Sector 4, Colombo 03',
      weightKg: 1.2,
      dimensionLengthCm: 25,
      dimensionWidthCm: 15,
      dimensionHeightCm: 10,
      totalFee: 450.00,
      status: 'OUT_FOR_DELIVERY',
      specialNotes: 'Ring bell twice; fragile electronics inside.',
      assignedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      courierId: courier1Id,
      courierName: 'Sunil Silva',
      stopNumber: 1
    };

    // Parcel 2: Sunil's in-transit stop
    const p2: AssignedJob = {
      id: 'p2222222-2222-2222-2222-222222222222',
      trackingNumber: 'SWIFT-882233',
      senderName: 'Vogue Boutique',
      senderPhone: '+94 11 345 6789',
      pickupAddress: '12 Havelock Town, Colombo 05',
      recipientName: 'Emily Davis',
      recipientPhone: '+94 71 876 5432',
      deliveryAddress: '10 Downing St, Cinnamon Gardens, Colombo 07',
      weightKg: 0.8,
      totalFee: 380.00,
      status: 'IN_TRANSIT',
      specialNotes: 'Leave with security guard if not available.',
      assignedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      courierId: courier1Id,
      courierName: 'Sunil Silva',
      stopNumber: 2
    };

    // Parcel 3: Sunil's picked up stop
    const p3: AssignedJob = {
      id: 'p3333333-3333-3333-3333-333333333333',
      trackingNumber: 'SWIFT-774411',
      senderName: 'Industrial Fasteners',
      senderPhone: '+94 11 456 7890',
      pickupAddress: '88 Central Warehouses, Peliyagoda',
      recipientName: 'Michael Scott',
      recipientPhone: '+94 76 543 2109',
      deliveryAddress: '172 Industrial Zone, Hub C, Colombo 02',
      weightKg: 4.5,
      totalFee: 750.00,
      status: 'PICKED_UP',
      specialNotes: 'Requires signature upon handover.',
      assignedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      courierId: courier1Id,
      courierName: 'Sunil Silva',
      stopNumber: 3
    };

    // Parcel 4: Sunil's newly assigned stop
    const p4: AssignedJob = {
      id: 'p4444444-4444-4444-4444-444444444444',
      trackingNumber: 'SWIFT-665522',
      senderName: 'TechZone LK',
      senderPhone: '+94 11 567 8901',
      pickupAddress: '22 Duplication Rd, Colombo 04',
      recipientName: 'Sarah Connor',
      recipientPhone: '+94 70 123 4567',
      deliveryAddress: '94 Cyber Rd, Hub A, Bambalapitiya, Colombo 04',
      weightKg: 2.1,
      totalFee: 520.00,
      status: 'ASSIGNED',
      specialNotes: 'Call 10 minutes prior to delivery.',
      assignedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
      courierId: courier1Id,
      courierName: 'Sunil Silva',
      stopNumber: 4
    };

    // Parcel 5: Kamal's parcel (Used for testing authorization & rejection)
    const p5: AssignedJob = {
      id: 'p5555555-5555-5555-5555-555555555555',
      trackingNumber: 'SWIFT-556677',
      senderName: 'Kandy Herbal Remedies',
      senderPhone: '+94 81 223 4455',
      pickupAddress: '10 Dalada Veediya, Kandy',
      recipientName: 'Nimal Jayasuriya',
      recipientPhone: '+94 77 111 2233',
      deliveryAddress: '88 Peradeniya Rd, Kandy',
      weightKg: 1.5,
      totalFee: 490.00,
      status: 'OUT_FOR_DELIVERY',
      specialNotes: 'Handle with care: glass bottles inside.',
      assignedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
      courierId: courier2Id,
      courierName: 'Kamal Perera',
      stopNumber: 1
    };

    [p1, p2, p3, p4, p5].forEach((p) => {
      this.parcels.set(p.id, p);
      this.assignments.set(p.id, {
        parcelId: p.id,
        courierId: p.courierId,
        courierName: p.courierName || 'Courier',
        assignedAt: p.assignedAt,
        isActive: true
      });
      this.history.push({
        id: crypto.randomUUID(),
        parcelId: p.id,
        courierId: p.courierId,
        status: p.status,
        note: `Initial status set to ${p.status}`,
        createdAt: p.assignedAt
      });
    });
  }

  public getAssignedJobs(courierId: string, filter?: string): AssignedJob[] {
    const jobs: AssignedJob[] = [];
    for (const parcel of this.parcels.values()) {
      if (parcel.courierId === courierId) {
        if (!filter || filter === 'all' || parcel.status.toLowerCase() === filter.toLowerCase()) {
          const parcelCopy = { ...parcel };
          parcelCopy.latestProof = this.getLatestProof(parcel.id);
          parcelCopy.statusHistory = this.getStatusHistory(parcel.id);
          jobs.push(parcelCopy);
        }
      }
    }
    return jobs.sort((a, b) => (a.stopNumber || 99) - (b.stopNumber || 99));
  }

  public getJobById(parcelIdOrTracking: string): AssignedJob | null {
    for (const p of this.parcels.values()) {
      if (p.id === parcelIdOrTracking || p.trackingNumber === parcelIdOrTracking) {
        const copy = { ...p };
        copy.latestProof = this.getLatestProof(p.id);
        copy.statusHistory = this.getStatusHistory(p.id);
        return copy;
      }
    }
    return null;
  }

  public getLatestProof(parcelId: string): DeliveryProofRecord | undefined {
    return this.proofs.get(parcelId);
  }

  public getStatusHistory(parcelId: string): StatusHistoryRecord[] {
    return this.history
      .filter((h) => h.parcelId === parcelId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public checkAssignment(parcelIdOrTracking: string, courierId: string, userRole: string = 'COURIER'): {
    authorized: boolean;
    parcel?: AssignedJob;
    error?: string;
  } {
    const parcel = this.getJobById(parcelIdOrTracking);
    if (!parcel) {
      return { authorized: false, error: 'Parcel not found' };
    }

    if (userRole === 'ADMIN') {
      return { authorized: true, parcel };
    }

    if (parcel.courierId !== courierId) {
      return {
        authorized: false,
        parcel,
        error: `Forbidden: You are not authorized to update this parcel. This parcel is assigned to courier '${parcel.courierName || parcel.courierId}'.`
      };
    }

    return { authorized: true, parcel };
  }

  public updateStatus(
    courierId: string,
    parcelIdOrTracking: string,
    newStatus: ParcelStatus,
    note?: string,
    location?: { name?: string; lat?: number; lng?: number },
    userRole: string = 'COURIER'
  ): { success: boolean; parcel?: AssignedJob; error?: string; statusHistory?: StatusHistoryRecord } {
    const authCheck = this.checkAssignment(parcelIdOrTracking, courierId, userRole);
    if (!authCheck.authorized || !authCheck.parcel) {
      return { success: false, error: authCheck.error };
    }

    const parcel = authCheck.parcel;
    const transitionCheck = validateStatusTransition(parcel.status, newStatus);
    if (!transitionCheck.valid) {
      return { success: false, error: transitionCheck.error };
    }

    // Business Rule: DELIVERED requires a proof photo record
    if (newStatus === 'DELIVERED') {
      const proof = this.getLatestProof(parcel.id);
      if (!proof || !proof.photoUrl) {
        return {
          success: false,
          error: 'Proof photo required: A doorstep proof photo must be uploaded before marking the parcel as DELIVERED.'
        };
      }
    }

    // Update parcel status
    parcel.status = newStatus;
    this.parcels.set(parcel.id, parcel);

    const historyEntry: StatusHistoryRecord = {
      id: crypto.randomUUID(),
      parcelId: parcel.id,
      courierId,
      status: newStatus,
      locationName: location?.name || 'In Transit Corridor',
      latitude: location?.lat,
      longitude: location?.lng,
      note: note || `Status updated to ${newStatus} by courier`,
      createdAt: new Date().toISOString()
    };
    this.history.push(historyEntry);

    const updatedJob = this.getJobById(parcel.id)!;
    return { success: true, parcel: updatedJob, statusHistory: historyEntry };
  }

  public uploadProof(
    courierId: string,
    parcelIdOrTracking: string,
    proofData: UploadProofInput,
    userRole: string = 'COURIER'
  ): { success: boolean; proof?: DeliveryProofRecord; error?: string } {
    const authCheck = this.checkAssignment(parcelIdOrTracking, courierId, userRole);
    if (!authCheck.authorized || !authCheck.parcel) {
      return { success: false, error: authCheck.error };
    }

    if (!proofData.photoUrl) {
      return { success: false, error: 'Photo URL is required for delivery proof record' };
    }

    const proofRecord: DeliveryProofRecord = {
      id: crypto.randomUUID(),
      parcelId: authCheck.parcel.id,
      courierId,
      photoUrl: proofData.photoUrl,
      recipientSignatureUrl: proofData.recipientSignatureUrl,
      failureReason: proofData.failureReason,
      recipientNote: proofData.recipientNote,
      createdAt: new Date().toISOString()
    };

    this.proofs.set(authCheck.parcel.id, proofRecord);
    return { success: true, proof: proofRecord };
  }

  public recordFailure(
    courierId: string,
    parcelIdOrTracking: string,
    failureReason: string,
    recipientNote?: string,
    userRole: string = 'COURIER'
  ): { success: boolean; parcel?: AssignedJob; proof?: DeliveryProofRecord; error?: string } {
    const authCheck = this.checkAssignment(parcelIdOrTracking, courierId, userRole);
    if (!authCheck.authorized || !authCheck.parcel) {
      return { success: false, error: authCheck.error };
    }

    if (!failureReason || failureReason.trim().length === 0) {
      return { success: false, error: 'Failure reason is required when marking delivery as failed.' };
    }

    const parcel = authCheck.parcel;
    const transitionCheck = validateStatusTransition(parcel.status, 'FAILED');
    if (!transitionCheck.valid) {
      return { success: false, error: transitionCheck.error };
    }

    const proofRecord: DeliveryProofRecord = {
      id: crypto.randomUUID(),
      parcelId: parcel.id,
      courierId,
      photoUrl: '/service-pod.jpg',
      failureReason,
      recipientNote,
      createdAt: new Date().toISOString()
    };
    this.proofs.set(parcel.id, proofRecord);

    parcel.status = 'FAILED';
    this.parcels.set(parcel.id, parcel);

    const historyEntry: StatusHistoryRecord = {
      id: crypto.randomUUID(),
      parcelId: parcel.id,
      courierId,
      status: 'FAILED',
      note: `Delivery failed: ${failureReason}${recipientNote ? ` (${recipientNote})` : ''}`,
      createdAt: new Date().toISOString()
    };
    this.history.push(historyEntry);

    const updatedJob = this.getJobById(parcel.id)!;
    return { success: true, parcel: updatedJob, proof: proofRecord };
  }
}

export const inMemoryCourierStore = new CourierDataStore();

// -----------------------------------------------------------------------------
// COURIER SERVICE: UNIFIED POSTGRESQL + MEMORY FALLBACK + RABBITMQ
// -----------------------------------------------------------------------------

export class CourierService {
  /**
   * Broadcast status change event to RabbitMQ
   */
  private async publishStatusEvent(parcel: AssignedJob, newStatus: ParcelStatus, note?: string) {
    try {
      const channel = getRabbitMQChannel();
      if (!channel) return;

      const payload = {
        event: newStatus === 'DELIVERED' ? 'PARCEL_DELIVERED' : (newStatus === 'FAILED' ? 'PARCEL_FAILED' : 'PARCEL_STATUS_UPDATED'),
        parcelId: parcel.id,
        trackingNumber: parcel.trackingNumber,
        courierId: parcel.courierId,
        courierName: parcel.courierName,
        recipientName: parcel.recipientName,
        recipientPhone: parcel.recipientPhone,
        status: newStatus,
        note: note || '',
        timestamp: new Date().toISOString()
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      channel.sendToQueue('swiftdrop_notifications_queue', buffer, { persistent: true });
      channel.sendToQueue('swiftdrop_webhooks_queue', buffer, { persistent: true });
    } catch (err) {
      console.warn('⚠️ RabbitMQ status publish bypassed:', err);
    }
  }

  /**
   * Fetch all jobs assigned to a specific courier
   */
  public async getAssignedJobs(courierId: string, filter?: string): Promise<AssignedJob[]> {
    try {
      const query = `
        SELECT
          p.id,
          p.tracking_number AS "trackingNumber",
          p.sender_name AS "senderName",
          p.sender_phone AS "senderPhone",
          p.pickup_address AS "pickupAddress",
          p.recipient_name AS "recipientName",
          p.recipient_phone AS "recipientPhone",
          p.delivery_address AS "deliveryAddress",
          p.weight_kg AS "weightKg",
          p.dimension_length_cm AS "dimensionLengthCm",
          p.dimension_width_cm AS "dimensionWidthCm",
          p.dimension_height_cm AS "dimensionHeightCm",
          p.total_fee AS "totalFee",
          p.status,
          p.special_notes AS "specialNotes",
          ca.assigned_at AS "assignedAt",
          ca.courier_id AS "courierId",
          u.full_name AS "courierName"
        FROM courier_assignments ca
        JOIN parcels p ON ca.parcel_id = p.id
        LEFT JOIN users u ON ca.courier_id = u.id
        WHERE ca.courier_id = $1 AND ca.is_active = TRUE
        ORDER BY ca.assigned_at ASC;
      `;
      const result = await db.query(query, [courierId]);

      if (result.rows.length > 0) {
        return result.rows.filter((job: any) => {
          if (!filter || filter === 'all') return true;
          return job.status.toLowerCase() === filter.toLowerCase();
        });
      }
    } catch {
      // Fallback to in-memory store
    }
    return inMemoryCourierStore.getAssignedJobs(courierId, filter);
  }

  /**
   * Fetch details of a specific job
   */
  public async getJobDetails(courierId: string, parcelIdOrTracking: string, userRole: string = 'COURIER'): Promise<AssignedJob | null> {
    const memoryJob = inMemoryCourierStore.getJobById(parcelIdOrTracking);
    try {
      const query = `
        SELECT
          p.id,
          p.tracking_number AS "trackingNumber",
          p.sender_name AS "senderName",
          p.sender_phone AS "senderPhone",
          p.pickup_address AS "pickupAddress",
          p.recipient_name AS "recipientName",
          p.recipient_phone AS "recipientPhone",
          p.delivery_address AS "deliveryAddress",
          p.weight_kg AS "weightKg",
          p.total_fee AS "totalFee",
          p.status,
          p.special_notes AS "specialNotes",
          ca.assigned_at AS "assignedAt",
          ca.courier_id AS "courierId",
          u.full_name AS "courierName"
        FROM parcels p
        JOIN courier_assignments ca ON ca.parcel_id = p.id AND ca.is_active = TRUE
        LEFT JOIN users u ON ca.courier_id = u.id
        WHERE (p.id::text = $1 OR p.tracking_number = $1);
      `;
      const result = await db.query(query, [parcelIdOrTracking]);
      if (result.rows.length > 0) {
        const job = result.rows[0];
        // Enforce ownership check
        if (userRole !== 'ADMIN' && job.courierId !== courierId) {
          throw new Error(`FORBIDDEN: You are not authorized to view this parcel.`);
        }
        return job;
      }
    } catch (err: any) {
      if (err.message?.includes('FORBIDDEN')) {
        throw err;
      }
    }

    // In-memory fallback
    const authCheck = inMemoryCourierStore.checkAssignment(parcelIdOrTracking, courierId, userRole);
    if (!authCheck.authorized) {
      throw new Error(`FORBIDDEN: ${authCheck.error}`);
    }
    return memoryJob;
  }

  /**
   * Update courier parcel status with transition verification and security check
   */
  public async updateParcelStatus(
    courierId: string,
    parcelIdOrTracking: string,
    newStatus: ParcelStatus,
    note?: string,
    location?: { name?: string; lat?: number; lng?: number },
    userRole: string = 'COURIER'
  ): Promise<AssignedJob> {
    // 1. Perform in-memory validation and state change
    const updateRes = inMemoryCourierStore.updateStatus(
      courierId,
      parcelIdOrTracking,
      newStatus,
      note,
      location,
      userRole
    );

    if (!updateRes.success || !updateRes.parcel) {
      throw new Error(updateRes.error || 'Failed to update parcel status');
    }

    // 2. Sync to PostgreSQL if connected
    try {
      await db.query(
        `UPDATE parcels SET status = $1, updated_at = NOW() WHERE id = $2`,
        [newStatus, updateRes.parcel.id]
      );
      await db.query(
        `INSERT INTO parcel_status_history (parcel_id, courier_id, status, location_name, latitude, longitude, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          updateRes.parcel.id,
          courierId,
          newStatus,
          location?.name || 'Courier In Transit',
          location?.lat || null,
          location?.lng || null,
          note || `Status updated to ${newStatus}`
        ]
      );
    } catch {
      // In-memory update is already committed
    }

    // 3. Publish to message broker
    await this.publishStatusEvent(updateRes.parcel, newStatus, note);

    return updateRes.parcel;
  }

  /**
   * Upload delivery proof photo and record
   */
  public async uploadDeliveryProof(
    courierId: string,
    parcelIdOrTracking: string,
    proofData: UploadProofInput,
    userRole: string = 'COURIER'
  ): Promise<DeliveryProofRecord> {
    const proofRes = inMemoryCourierStore.uploadProof(
      courierId,
      parcelIdOrTracking,
      proofData,
      userRole
    );

    if (!proofRes.success || !proofRes.proof) {
      throw new Error(proofRes.error || 'Failed to upload delivery proof');
    }

    try {
      await db.query(
        `INSERT INTO courier_delivery_proofs (parcel_id, courier_id, photo_url, recipient_signature_url, failure_reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          proofRes.proof.parcelId,
          courierId,
          proofData.photoUrl,
          proofData.recipientSignatureUrl || null,
          proofData.failureReason || null
        ]
      );
    } catch {
      // In-memory update committed
    }

    return proofRes.proof;
  }

  /**
   * Record delivery failure with reason
   */
  public async recordDeliveryFailure(
    courierId: string,
    parcelIdOrTracking: string,
    failureReason: string,
    recipientNote?: string,
    userRole: string = 'COURIER'
  ): Promise<AssignedJob> {
    const failRes = inMemoryCourierStore.recordFailure(
      courierId,
      parcelIdOrTracking,
      failureReason,
      recipientNote,
      userRole
    );

    if (!failRes.success || !failRes.parcel) {
      throw new Error(failRes.error || 'Failed to record delivery failure');
    }

    try {
      await db.query(
        `UPDATE parcels SET status = 'FAILED', updated_at = NOW() WHERE id = $1`,
        [failRes.parcel.id]
      );
      await db.query(
        `INSERT INTO courier_delivery_proofs (parcel_id, courier_id, photo_url, failure_reason)
         VALUES ($1, $2, $3, $4)`,
        [failRes.parcel.id, courierId, '/service-pod.jpg', failureReason]
      );
      await db.query(
        `INSERT INTO parcel_status_history (parcel_id, courier_id, status, note)
         VALUES ($1, $2, 'FAILED', $3)`,
        [failRes.parcel.id, courierId, `Delivery failed: ${failureReason}`]
      );
    } catch {
      // In-memory update committed
    }

    await this.publishStatusEvent(failRes.parcel, 'FAILED', failureReason);
    return failRes.parcel;
  }
}

export const courierService = new CourierService();
