import crypto from 'crypto';
import { db } from '../../config/database.js';
import { getRabbitMQChannel } from '../../config/rabbitmq.js';
import { setMerchantApproval, listMerchants, type ApprovalStatus } from '../merchant/merchant.service.js';

// =============================================================================
// MEMBER 5: DISPATCH, ASSIGNMENT & SERVICE CONFIGURATION
// =============================================================================

export const MAX_COURIER_CAPACITY = 15;

export interface UnassignedParcel {
  id: string;
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress: string;
  weightKg: number;
  zone: string;
  totalFee: number;
  status: 'CONFIRMED' | 'ASSIGNED' | 'PENDING_PAYMENT';
  specialNotes?: string;
  createdAt: string;
}

export interface CourierWorkload {
  id: string;
  name: string;
  email: string;
  phone: string;
  vehicleType: string;
  currentLoad: number;
  maxCapacity: number;
  status: 'AVAILABLE' | 'OPTIMAL' | 'NEAR_CAPACITY' | 'AT_CAPACITY' | 'OFFLINE';
  isOnline: boolean;
  distanceKm?: number;
  distanceLabel?: string;
  currentLocation?: { lat: number; lng: number; name?: string };
}

export interface DeliveryZoneConfig {
  id: string;
  zoneName: string;
  baseRate: number;
  perKgRate: number;
  perKmRate: number;
  isActive: boolean;
}

export interface ServiceConfig {
  baseBookingFee: number;
  perKgRate: number;
  perKmRate: number;
  holidaySurgeMultiplier: number;
  peakHourSurgeMultiplier: number;
  maxCourierCapacity: number;
  zones: DeliveryZoneConfig[];
}

export interface SmartDispatchRecommendation {
  recommendedCourier: CourierWorkload;
  confidenceScore: number;
  reasoning: string;
  alternativeCouriers: Array<{ id: string; name: string; score: number }>;
}

export interface AssignmentResult {
  parcelId: string;
  trackingNumber: string;
  courierId: string;
  courierName: string;
  status: 'ASSIGNED';
  assignedAt: string;
  previousLoad: number;
  newLoad: number;
}

// -----------------------------------------------------------------------------
// IN-MEMORY STORE (For testing, CI, and database fallback)
// -----------------------------------------------------------------------------

export class DispatchDataStore {
  private unassignedParcels: Map<string, UnassignedParcel> = new Map();
  private couriers: Map<string, CourierWorkload> = new Map();
  private assignments: Map<string, { id: string; parcelId: string; courierId: string; dispatcherId?: string; assignedAt: string; isActive: boolean }> = new Map();
  private serviceConfig: ServiceConfig = {
    baseBookingFee: 350.0,
    perKgRate: 50.0,
    perKmRate: 20.0,
    holidaySurgeMultiplier: 1.25,
    peakHourSurgeMultiplier: 1.15,
    maxCourierCapacity: MAX_COURIER_CAPACITY,
    zones: [
      { id: 'z-colombo', zoneName: 'Western Province (Colombo Urban)', baseRate: 350.0, perKgRate: 50.0, perKmRate: 20.0, isActive: true },
      { id: 'z-kandy', zoneName: 'Central Province (Kandy Metro)', baseRate: 450.0, perKgRate: 70.0, perKmRate: 30.0, isActive: true },
      { id: 'z-galle', zoneName: 'Southern Coastal (Galle / Matara)', baseRate: 400.0, perKgRate: 60.0, perKmRate: 25.0, isActive: true },
      { id: 'z-island', zoneName: 'Island-wide Express Delivery', baseRate: 600.0, perKgRate: 90.0, perKmRate: 45.0, isActive: true },
    ]
  };

  constructor() {
    this.seedDefaultData();
  }

  public seedDefaultData() {
    this.unassignedParcels.clear();
    this.couriers.clear();
    this.assignments.clear();

    // Seed Couriers
    const defaultCouriers: CourierWorkload[] = [
      {
        id: '10111111-1111-1111-1111-111111111111',
        name: 'Sunil Silva',
        email: 'sunil.silva@swiftdrop.com',
        phone: '+94 77 987 6543',
        vehicleType: 'Motorcycle',
        currentLoad: 2,
        maxCapacity: MAX_COURIER_CAPACITY,
        status: 'AVAILABLE',
        isOnline: true,
        distanceKm: 1.2,
        distanceLabel: '1.2 km away',
        currentLocation: { lat: 6.9271, lng: 79.8612, name: 'Pettah Hub' }
      },
      {
        id: '20222222-2222-2222-2222-222222222222',
        name: 'Sarah Lee',
        email: 'sarah.lee@swiftdrop.com',
        phone: '+94 71 234 5678',
        vehicleType: 'Electric Scooter',
        currentLoad: 5,
        maxCapacity: MAX_COURIER_CAPACITY,
        status: 'OPTIMAL',
        isOnline: true,
        distanceKm: 3.4,
        distanceLabel: '3.4 km away',
        currentLocation: { lat: 6.9010, lng: 79.8540, name: 'Bambalapitiya' }
      },
      {
        id: '30333333-3333-3333-3333-333333333333',
        name: 'Kamal Perera',
        email: 'kamal.perera@swiftdrop.com',
        phone: '+94 76 345 6789',
        vehicleType: 'Delivery Van',
        currentLoad: 14,
        maxCapacity: MAX_COURIER_CAPACITY,
        status: 'NEAR_CAPACITY',
        isOnline: true,
        distanceKm: 4.8,
        distanceLabel: '4.8 km away',
        currentLocation: { lat: 6.8720, lng: 79.8800, name: 'Nugegoda' }
      },
      {
        id: '40444444-4444-4444-4444-444444444444',
        name: 'Nuwan Pradeep',
        email: 'nuwan.p@swiftdrop.com',
        phone: '+94 75 456 7890',
        vehicleType: 'Motorcycle',
        currentLoad: 15,
        maxCapacity: MAX_COURIER_CAPACITY,
        status: 'AT_CAPACITY',
        isOnline: true,
        distanceKm: 6.1,
        distanceLabel: '6.1 km away',
        currentLocation: { lat: 6.8400, lng: 79.9200, name: 'Maharagama' }
      },
      {
        id: '50555555-5555-5555-5555-555555555555',
        name: 'Chaminda Vaas',
        email: 'chaminda.v@swiftdrop.com',
        phone: '+94 72 567 8901',
        vehicleType: 'Delivery Van',
        currentLoad: 0,
        maxCapacity: MAX_COURIER_CAPACITY,
        status: 'OFFLINE',
        isOnline: false,
        distanceKm: 12.0,
        distanceLabel: 'Offline (Last seen Hub B)',
        currentLocation: { lat: 6.9500, lng: 79.8900, name: 'Peliyagoda Depot' }
      }
    ];

    defaultCouriers.forEach(c => this.couriers.set(c.id, c));

    // Seed Unassigned Parcels
    const defaultParcels: UnassignedParcel[] = [
      {
        id: 'p-1001',
        trackingNumber: 'SWIFT-102938',
        senderName: 'Acme Wholesale Co',
        senderPhone: '+94 11 234 5678',
        pickupAddress: '45 Main Street, Pettah, Colombo 11',
        recipientName: 'Dr. Perera',
        recipientPhone: '+94 77 112 2334',
        deliveryAddress: 'Mt. Lavinia Clinic, Hotel Road, Mount Lavinia',
        weightKg: 3.5,
        zone: 'Western Province (Colombo Urban)',
        totalFee: 525.0,
        status: 'CONFIRMED',
        specialNotes: 'Fragile medical diagnostic equipment. Handle with care.',
        createdAt: new Date(Date.now() - 14 * 60000).toISOString()
      },
      {
        id: 'p-1002',
        trackingNumber: 'SWIFT-102939',
        senderName: 'Lanka Textiles',
        senderPhone: '+94 11 345 6789',
        pickupAddress: '88 Keyzer St, Colombo 11',
        recipientName: 'Shanika Silva',
        recipientPhone: '+94 71 223 3445',
        deliveryAddress: '22 Peradeniya Road, Kandy',
        weightKg: 2.1,
        zone: 'Central Province (Kandy Metro)',
        totalFee: 690.0,
        status: 'CONFIRMED',
        specialNotes: 'Call recipient prior to arrival.',
        createdAt: new Date(Date.now() - 32 * 60000).toISOString()
      },
      {
        id: 'p-1003',
        trackingNumber: 'SWIFT-102940',
        senderName: 'Colombo Tech Mart',
        senderPhone: '+94 11 456 7890',
        pickupAddress: '150 Galle Road, Colombo 04',
        recipientName: 'Dilan Jayasinghe',
        recipientPhone: '+94 76 334 4556',
        deliveryAddress: '78 Fort Bazaar, Galle Fort',
        weightKg: 1.5,
        zone: 'Southern Coastal (Galle / Matara)',
        totalFee: 650.0,
        status: 'CONFIRMED',
        specialNotes: 'Customer requested evening delivery.',
        createdAt: new Date(Date.now() - 45 * 60000).toISOString()
      },
      {
        id: 'p-1004',
        trackingNumber: 'SWIFT-102941',
        senderName: 'Organic Tea Exporters',
        senderPhone: '+94 11 567 8901',
        pickupAddress: '12 Vauxhall Street, Colombo 02',
        recipientName: 'Hemas Logistics',
        recipientPhone: '+94 70 445 5667',
        deliveryAddress: 'Airport Free Trade Zone, Katunayake',
        weightKg: 7.8,
        zone: 'Western Province (Colombo Urban)',
        totalFee: 950.0,
        status: 'CONFIRMED',
        specialNotes: 'Gate pass required upon entry.',
        createdAt: new Date(Date.now() - 60 * 60000).toISOString()
      }
    ];

    defaultParcels.forEach(p => this.unassignedParcels.set(p.id, p));
  }

  public getUnassignedParcels(zone?: string, search?: string): UnassignedParcel[] {
    let list = Array.from(this.unassignedParcels.values()).filter(p => p.status === 'CONFIRMED');

    if (zone && zone !== 'all') {
      const lowerZone = zone.toLowerCase();
      list = list.filter(p => p.zone.toLowerCase().includes(lowerZone));
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(p =>
        p.trackingNumber.toLowerCase().includes(q) ||
        p.senderName.toLowerCase().includes(q) ||
        p.recipientName.toLowerCase().includes(q) ||
        p.deliveryAddress.toLowerCase().includes(q) ||
        p.zone.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public getCouriers(): CourierWorkload[] {
    return Array.from(this.couriers.values());
  }

  public getCourierById(id: string): CourierWorkload | undefined {
    return this.couriers.get(id);
  }

  public getParcelById(idOrTracking: string): UnassignedParcel | undefined {
    for (const p of this.unassignedParcels.values()) {
      if (p.id === idOrTracking || p.trackingNumber === idOrTracking) {
        return p;
      }
    }
    return undefined;
  }

  public assignParcel(
    courierId: string,
    parcelId: string,
    dispatcherId?: string,
    notes?: string
  ): { success: boolean; result?: AssignmentResult; error?: string } {
    const courier = this.couriers.get(courierId);
    if (!courier) {
      return { success: false, error: `Courier '${courierId}' not found` };
    }

    if (!courier.isOnline) {
      return { success: false, error: `Courier '${courier.name}' is currently offline and cannot accept assignments` };
    }

    if (courier.currentLoad >= courier.maxCapacity) {
      return {
        success: false,
        error: `Courier capacity exceeded: Courier '${courier.name}' already has ${courier.currentLoad} active parcels (maximum: ${courier.maxCapacity})`
      };
    }

    const parcel = this.getParcelById(parcelId);
    if (!parcel) {
      return { success: false, error: `Parcel '${parcelId}' not found in unassigned queue` };
    }

    if (parcel.status !== 'CONFIRMED') {
      return { success: false, error: `Parcel '${parcel.trackingNumber}' cannot be assigned because its status is '${parcel.status}'` };
    }

    // Update parcel status
    parcel.status = 'ASSIGNED';
    this.unassignedParcels.set(parcel.id, parcel);

    // Update courier workload
    const previousLoad = courier.currentLoad;
    courier.currentLoad += 1;
    if (courier.currentLoad >= courier.maxCapacity) {
      courier.status = 'AT_CAPACITY';
    } else if (courier.currentLoad >= 10) {
      courier.status = 'NEAR_CAPACITY';
    } else if (courier.currentLoad >= 5) {
      courier.status = 'OPTIMAL';
    } else {
      courier.status = 'AVAILABLE';
    }
    this.couriers.set(courier.id, courier);

    // Record assignment
    const assignmentId = crypto.randomUUID();
    const assignedAt = new Date().toISOString();
    this.assignments.set(assignmentId, {
      id: assignmentId,
      parcelId: parcel.id,
      courierId: courier.id,
      dispatcherId,
      assignedAt,
      isActive: true
    });

    return {
      success: true,
      result: {
        parcelId: parcel.id,
        trackingNumber: parcel.trackingNumber,
        courierId: courier.id,
        courierName: courier.name,
        status: 'ASSIGNED',
        assignedAt,
        previousLoad,
        newLoad: courier.currentLoad
      }
    };
  }

  public getServiceConfig(): ServiceConfig {
    return { ...this.serviceConfig };
  }

  public updateServiceConfig(newConfig: Partial<ServiceConfig>): ServiceConfig {
    if (newConfig.baseBookingFee !== undefined) {
      if (newConfig.baseBookingFee < 0) throw new Error('Base booking fee cannot be negative');
      this.serviceConfig.baseBookingFee = newConfig.baseBookingFee;
    }
    if (newConfig.perKgRate !== undefined) {
      if (newConfig.perKgRate < 0) throw new Error('Per-kg rate cannot be negative');
      this.serviceConfig.perKgRate = newConfig.perKgRate;
    }
    if (newConfig.perKmRate !== undefined) {
      if (newConfig.perKmRate < 0) throw new Error('Per-km rate cannot be negative');
      this.serviceConfig.perKmRate = newConfig.perKmRate;
    }
    if (newConfig.holidaySurgeMultiplier !== undefined) {
      if (newConfig.holidaySurgeMultiplier < 1.0 || newConfig.holidaySurgeMultiplier > 5.0) {
        throw new Error('Holiday surge multiplier must be between 1.0 and 5.0');
      }
      this.serviceConfig.holidaySurgeMultiplier = newConfig.holidaySurgeMultiplier;
    }
    if (newConfig.peakHourSurgeMultiplier !== undefined) {
      if (newConfig.peakHourSurgeMultiplier < 1.0 || newConfig.peakHourSurgeMultiplier > 5.0) {
        throw new Error('Peak hour surge multiplier must be between 1.0 and 5.0');
      }
      this.serviceConfig.peakHourSurgeMultiplier = newConfig.peakHourSurgeMultiplier;
    }
    if (newConfig.zones && Array.isArray(newConfig.zones)) {
      this.serviceConfig.zones = newConfig.zones;
    }

    return { ...this.serviceConfig };
  }
}

export const inMemoryDispatchStore = new DispatchDataStore();

// -----------------------------------------------------------------------------
// DISPATCH SERVICE CLASS
// -----------------------------------------------------------------------------

export class DispatchService {
  /**
   * Broadcast assignment event to RabbitMQ
   */
  private async publishAssignmentEvent(assignment: AssignmentResult, parcel: UnassignedParcel) {
    try {
      const channel = getRabbitMQChannel();
      if (!channel) return;

      const payload = {
        event: 'PARCEL_ASSIGNED',
        parcelId: assignment.parcelId,
        trackingNumber: assignment.trackingNumber,
        courierId: assignment.courierId,
        courierName: assignment.courierName,
        recipientName: parcel.recipientName,
        deliveryAddress: parcel.deliveryAddress,
        assignedAt: assignment.assignedAt,
        timestamp: new Date().toISOString()
      };

      const buffer = Buffer.from(JSON.stringify(payload));
      channel.sendToQueue('swiftdrop_notifications_queue', buffer, { persistent: true });
      channel.sendToQueue('swiftdrop_webhooks_queue', buffer, { persistent: true });
    } catch (err) {
      console.warn('dispatch operation unavailable');
    }
  }

  /**
   * Get unassigned parcels awaiting dispatch
   */
  public async getUnassignedParcels(zone?: string, search?: string): Promise<UnassignedParcel[]> {
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
          p.weight_kg::float AS "weightKg",
          COALESCE(dz.zone_name, 'Western Province (Colombo Urban)') AS "zone",
          p.total_fee::float AS "totalFee",
          p.status,
          p.special_notes AS "specialNotes",
          p.created_at AS "createdAt"
        FROM parcels p
        LEFT JOIN delivery_zones dz ON dz.id = p.zone_id
        WHERE p.status = 'CONFIRMED'
        ORDER BY p.created_at ASC
      `;
      const res = await db.query(query);
      if (res.rows && res.rows.length > 0) {
        let results = res.rows as UnassignedParcel[];
        if (zone && zone !== 'all') {
          results = results.filter(r => r.zone.toLowerCase().includes(zone.toLowerCase()));
        }
        if (search && search.trim()) {
          const q = search.trim().toLowerCase();
          results = results.filter(r =>
            r.trackingNumber.toLowerCase().includes(q) ||
            r.senderName.toLowerCase().includes(q) ||
            r.recipientName.toLowerCase().includes(q) ||
            r.deliveryAddress.toLowerCase().includes(q) ||
            r.zone.toLowerCase().includes(q)
          );
        }
        return results;
      }
    } catch {
      // Fallback to in-memory store
    }
    return inMemoryDispatchStore.getUnassignedParcels(zone, search);
  }

  /**
   * Get all active couriers and their current active workloads
   */
  public async getCourierWorkloads(): Promise<CourierWorkload[]> {
    try {
      const query = `
        SELECT
          u.id,
          u.full_name AS "name",
          u.email,
          COALESCE(u.phone, '+94 77 000 0000') AS "phone",
          'Motorcycle' AS "vehicleType",
          u.is_active AS "isOnline",
          COUNT(ca.id) FILTER (WHERE ca.is_active = TRUE AND p.status IN ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY')) AS "currentLoad"
        FROM users u
        LEFT JOIN courier_assignments ca ON ca.courier_id = u.id AND ca.is_active = TRUE
        LEFT JOIN parcels p ON p.id = ca.parcel_id
        WHERE u.role = 'COURIER'
        GROUP BY u.id, u.full_name, u.email, u.phone, u.is_active
      `;
      const res = await db.query(query);
      if (res.rows && res.rows.length > 0) {
        return res.rows.map(r => {
          const load = parseInt(r.currentLoad, 10) || 0;
          let status: CourierWorkload['status'] = 'AVAILABLE';
          if (!r.isOnline) status = 'OFFLINE';
          else if (load >= MAX_COURIER_CAPACITY) status = 'AT_CAPACITY';
          else if (load >= 10) status = 'NEAR_CAPACITY';
          else if (load >= 5) status = 'OPTIMAL';

          return {
            id: r.id,
            name: r.name,
            email: r.email,
            phone: r.phone,
            vehicleType: r.vehicleType,
            currentLoad: load,
            maxCapacity: MAX_COURIER_CAPACITY,
            status,
            isOnline: Boolean(r.isOnline),
            distanceKm: 2.0,
            distanceLabel: '2.0 km away'
          };
        });
      }
    } catch {
      // Fallback to in-memory store
    }
    return inMemoryDispatchStore.getCouriers();
  }

  /**
   * Assign parcel(s) to a courier
   */
  public async assignParcel(
    courierId: string,
    parcelId: string,
    dispatcherId?: string,
    notes?: string
  ): Promise<AssignmentResult> {
    // 1. Check courier workload & capacity
    const couriers = await this.getCourierWorkloads();
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) {
      throw new Error(`Courier '${courierId}' not found`);
    }

    if (!courier.isOnline) {
      throw new Error(`Courier '${courier.name}' is currently offline and cannot accept assignments`);
    }

    if (courier.currentLoad >= courier.maxCapacity) {
      throw new Error(
        `Courier capacity exceeded: Courier '${courier.name}' already has ${courier.currentLoad} active parcels (maximum: ${courier.maxCapacity})`
      );
    }

    // 2. Perform DB update if connected
    try {
      const parcelRes = await db.query(`SELECT * FROM parcels WHERE id = $1 FOR UPDATE`, [parcelId]);
      if (parcelRes.rows && parcelRes.rows.length > 0) {
        const parcelRow = parcelRes.rows[0];
        if (parcelRow.status !== 'CONFIRMED') {
          throw new Error(`Parcel '${parcelRow.tracking_number}' cannot be assigned because its status is '${parcelRow.status}'`);
        }

        // Update parcel status
        await db.query(`UPDATE parcels SET status = 'ASSIGNED', updated_at = NOW() WHERE id = $1`, [parcelId]);

        // Insert courier assignment record
        await db.query(
          `INSERT INTO courier_assignments (parcel_id, courier_id, dispatcher_id, assigned_at, is_active)
           VALUES ($1, $2, $3, NOW(), TRUE)`,
          [parcelId, courierId, dispatcherId || null]
        );

        // Record status history audit
        await db.query(
          `INSERT INTO parcel_status_history (parcel_id, courier_id, status, location_name, note)
           VALUES ($1, $2, 'ASSIGNED', 'Dispatch Operations Hub', $3)`,
          [parcelId, courierId, notes || 'Assigned to courier by dispatcher']
        );

        const result: AssignmentResult = {
          parcelId,
          trackingNumber: parcelRow.tracking_number,
          courierId: courier.id,
          courierName: courier.name,
          status: 'ASSIGNED',
          assignedAt: new Date().toISOString(),
          previousLoad: courier.currentLoad,
          newLoad: courier.currentLoad + 1
        };

        const parcelObj: UnassignedParcel = {
          id: parcelId,
          trackingNumber: parcelRow.tracking_number,
          senderName: parcelRow.sender_name,
          senderPhone: parcelRow.sender_phone,
          pickupAddress: parcelRow.pickup_address,
          recipientName: parcelRow.recipient_name,
          recipientPhone: parcelRow.recipient_phone,
          deliveryAddress: parcelRow.delivery_address,
          weightKg: parseFloat(parcelRow.weight_kg),
          zone: 'Western Province',
          totalFee: parseFloat(parcelRow.total_fee),
          status: 'ASSIGNED',
          createdAt: parcelRow.created_at
        };

        await this.publishAssignmentEvent(result, parcelObj);
        return result;
      }
    } catch (err: any) {
      if (err.message && err.message.includes('cannot be assigned')) throw err;
      // Fallback to in-memory store
    }

    // Fallback store
    const memoryAssign = inMemoryDispatchStore.assignParcel(courierId, parcelId, dispatcherId, notes);
    if (!memoryAssign.success || !memoryAssign.result) {
      throw new Error(memoryAssign.error || 'Assignment failed');
    }

    const parcel = inMemoryDispatchStore.getParcelById(parcelId);
    if (parcel) {
      await this.publishAssignmentEvent(memoryAssign.result, parcel);
    }

    return memoryAssign.result;
  }

  /**
   * Bulk assign parcels to a courier
   */
  public async bulkAssignParcels(
    courierId: string,
    parcelIds: string[],
    dispatcherId?: string
  ): Promise<{ assigned: AssignmentResult[]; failed: Array<{ parcelId: string; error: string }> }> {
    const assigned: AssignmentResult[] = [];
    const failed: Array<{ parcelId: string; error: string }> = [];

    const couriers = await this.getCourierWorkloads();
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) {
      throw new Error(`Courier '${courierId}' not found`);
    }

    const availableSlots = courier.maxCapacity - courier.currentLoad;
    if (parcelIds.length > availableSlots) {
      throw new Error(
        `Batch exceeds available capacity: Attempted to assign ${parcelIds.length} parcels, but '${courier.name}' only has ${availableSlots} slots remaining (maximum: ${courier.maxCapacity})`
      );
    }

    for (const id of parcelIds) {
      try {
        const res = await this.assignParcel(courierId, id, dispatcherId, 'Batch dispatched');
        assigned.push(res);
      } catch (err: any) {
        failed.push({ parcelId: id, error: err.message || 'Failed to assign' });
      }
    }

    return { assigned, failed };
  }

  /**
   * Smart AI Dispatch Recommendation: Finds best-fit courier using capacity and distance heuristics
   */
  public async getSmartDispatchRecommendation(parcelId: string): Promise<SmartDispatchRecommendation> {
    const couriers = await this.getCourierWorkloads();
    const availableCouriers = couriers.filter(c => c.isOnline && c.currentLoad < c.maxCapacity);

    if (availableCouriers.length === 0) {
      throw new Error('No available online couriers found to match this parcel');
    }

    // Score couriers: 60% workload balance, 40% proximity
    const scored = availableCouriers.map(c => {
      const capacityRatio = (c.maxCapacity - c.currentLoad) / c.maxCapacity; // 1.0 is empty, 0.0 is full
      const distance = c.distanceKm || 5.0;
      const proximityScore = Math.max(0, 1 - distance / 15.0); // 1.0 is 0 km, 0.0 is 15 km
      const finalScore = Number((0.6 * capacityRatio + 0.4 * proximityScore).toFixed(2));

      return {
        courier: c,
        score: finalScore,
        distance,
        load: c.currentLoad
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];

    const reasoning = `${best.courier.name} has optimal capacity (${best.courier.currentLoad}/${best.courier.maxCapacity} active stops) and is ${best.courier.distanceLabel || `${best.distance} km away`}.`;

    return {
      recommendedCourier: best.courier,
      confidenceScore: Math.min(0.98, Math.max(0.75, best.score)),
      reasoning,
      alternativeCouriers: scored.slice(1, 4).map(s => ({
        id: s.courier.id,
        name: s.courier.name,
        score: s.score
      }))
    };
  }

  /**
   * Service & Pricing Configuration
   */
  public async getServiceConfig(): Promise<ServiceConfig> {
    try {
      const res = await db.query(`SELECT id, zone_name AS "zoneName", base_rate::float AS "baseRate", per_kg_rate::float AS "perKgRate", per_km_rate::float AS "perKmRate" FROM delivery_zones`);
      if (res.rows && res.rows.length > 0) {
        const base = inMemoryDispatchStore.getServiceConfig();
        base.zones = res.rows.map(r => ({ ...r, isActive: true }));
        return base;
      }
    } catch {
      // Fallback
    }
    return inMemoryDispatchStore.getServiceConfig();
  }

  public async updateServiceConfig(updates: Partial<ServiceConfig>): Promise<ServiceConfig> {
    return inMemoryDispatchStore.updateServiceConfig(updates);
  }

  /**
   * Merchant Approvals
   */
  public async setMerchantApproval(merchantId: string, status: ApprovalStatus) {
    try {
      return await setMerchantApproval(merchantId, status);
    } catch {
      return { id: merchantId, approvalStatus: status, updatedAt: new Date().toISOString() };
    }
  }

  public async listMerchants(status?: ApprovalStatus) {
    try {
      return await listMerchants(status);
    } catch {
      return [
        {
          id: '55555555-5555-5555-5555-555555555555',
          merchantId: '55555555-5555-5555-5555-555555555555',
          userId: '33333333-3333-3333-3333-333333333333',
          email: 'merchant@swiftdrop.com',
          fullName: 'Acme Wholesale Director',
          phone: '+94 11 234 5678',
          companyName: 'Acme Electronics LLC',
          registrationNumber: 'LK-8877123',
          approvalStatus: 'PENDING' as ApprovalStatus,
          createdAt: new Date().toISOString()
        }
      ];
    }
  }
}

/** Demo-only store; HTTP routes use DatabaseDispatchService. */
export const dispatchService = new DispatchService();
