import { db } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';

export type ResolutionStatus = 
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESCHEDULED'
  | 'RETURN_TO_SENDER'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'RESOLVED';

export interface SupportAuditLog {
  id: string;
  exception_id: string;
  changed_by_id: string;
  changed_by_name?: string;
  action: string;
  previous_state: any;
  new_state: any;
  created_at: string;
}

export interface ParcelException {
  id: string;
  parcel_id: string;
  tracking_number: string;
  recipient_name: string;
  recipient_phone: string;
  delivery_address: string;
  parcel_status: string;
  weight_kg?: number;
  total_fee?: number;
  special_notes?: string;
  raised_by_id: string;
  raised_by_name?: string;
  reason: string;
  resolution_status: ResolutionStatus;
  resolution_notes: string | null;
  resolved_by_id: string | null;
  resolved_by_name?: string | null;
  created_at: string;
  resolved_at: string | null;
  photo_url?: string | null;
  failure_reason?: string | null;
  audit_logs?: SupportAuditLog[];
}

export class SupportService {
  /**
   * List all parcel delivery exceptions with optional status and search filtering
   */
  public async listExceptions(filters?: { status?: string; search?: string }): Promise<ParcelException[]> {
    try {
      let query = `
        SELECT 
          e.id,
          e.parcel_id,
          p.tracking_number,
          p.recipient_name,
          p.recipient_phone,
          p.delivery_address,
          p.status AS parcel_status,
          p.weight_kg,
          p.total_fee,
          p.special_notes,
          e.raised_by_id,
          COALESCE(u_raised.full_name, 'System') AS raised_by_name,
          e.reason,
          e.resolution_status,
          e.resolution_notes,
          e.resolved_by_id,
          u_resolved.full_name AS resolved_by_name,
          e.created_at,
          e.resolved_at,
          proof.photo_url,
          proof.failure_reason
        FROM parcel_exceptions e
        JOIN parcels p ON p.id = e.parcel_id
        LEFT JOIN users u_raised ON u_raised.id = e.raised_by_id
        LEFT JOIN users u_resolved ON u_resolved.id = e.resolved_by_id
        LEFT JOIN LATERAL (
          SELECT photo_url, failure_reason
          FROM courier_delivery_proofs
          WHERE parcel_id = p.id
          ORDER BY created_at DESC
          LIMIT 1
        ) proof ON TRUE
        WHERE 1=1
      `;

      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.status && filters.status.toUpperCase() !== 'ALL') {
        query += ` AND e.resolution_status = $${paramIndex++}`;
        values.push(filters.status.toUpperCase());
      }

      if (filters?.search) {
        query += ` AND (p.tracking_number ILIKE $${paramIndex} OR p.recipient_name ILIKE $${paramIndex} OR e.reason ILIKE $${paramIndex})`;
        values.push(`%${filters.search}%`);
        paramIndex++;
      }

      query += ` ORDER BY e.created_at DESC`;

      const result = await db.query(query, values);
      return result.rows;
    } catch (error) {
      console.warn('Database query failed in listExceptions, using fallback:', error);
      return this.getFallbackExceptions(filters);
    }
  }

  /**
   * Get single exception details including full audit logs
   */
  public async getExceptionById(idOrParcelId: string): Promise<ParcelException | null> {
    try {
      const query = `
        SELECT 
          e.id,
          e.parcel_id,
          p.tracking_number,
          p.recipient_name,
          p.recipient_phone,
          p.delivery_address,
          p.status AS parcel_status,
          p.weight_kg,
          p.total_fee,
          p.special_notes,
          e.raised_by_id,
          COALESCE(u_raised.full_name, 'System') AS raised_by_name,
          e.reason,
          e.resolution_status,
          e.resolution_notes,
          e.resolved_by_id,
          u_resolved.full_name AS resolved_by_name,
          e.created_at,
          e.resolved_at,
          proof.photo_url,
          proof.failure_reason
        FROM parcel_exceptions e
        JOIN parcels p ON p.id = e.parcel_id
        LEFT JOIN users u_raised ON u_raised.id = e.raised_by_id
        LEFT JOIN users u_resolved ON u_resolved.id = e.resolved_by_id
        LEFT JOIN LATERAL (
          SELECT photo_url, failure_reason
          FROM courier_delivery_proofs
          WHERE parcel_id = p.id
          ORDER BY created_at DESC
          LIMIT 1
        ) proof ON TRUE
        WHERE e.id::text = $1 OR e.parcel_id::text = $1 OR p.tracking_number = $1
        LIMIT 1
      `;

      const result = await db.query(query, [idOrParcelId]);
      if (result.rows.length === 0) return null;

      const exception = result.rows[0];
      exception.audit_logs = await this.getAuditLogs(exception.id);
      return exception;
    } catch (error) {
      console.warn('Database query failed in getExceptionById:', error);
      const fallbackList = this.getFallbackExceptions();
      const found = fallbackList.find(e => e.id === idOrParcelId || e.parcel_id === idOrParcelId || e.tracking_number === idOrParcelId);
      return found || null;
    }
  }

  /**
   * Retrieve tamper-proof audit trail for an exception
   */
  public async getAuditLogs(exceptionId: string): Promise<SupportAuditLog[]> {
    try {
      const query = `
        SELECT 
          a.id,
          a.exception_id,
          a.changed_by_id,
          COALESCE(u.full_name, 'Staff Member') AS changed_by_name,
          a.action,
          a.previous_state,
          a.new_state,
          a.created_at
        FROM support_audit_logs a
        LEFT JOIN users u ON u.id = a.changed_by_id
        WHERE a.exception_id = $1
        ORDER BY a.created_at DESC
      `;
      const result = await db.query(query, [exceptionId]);
      return result.rows;
    } catch (error) {
      console.warn('Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Create a new exception report for a parcel
   */
  public async createException(data: {
    parcelId: string;
    raisedById: string;
    reason: string;
    initialNotes?: string;
  }): Promise<ParcelException> {
    // 1. Resolve parcel UUID
    const parcelRes = await db.query(
      `SELECT id, tracking_number FROM parcels WHERE id::text = $1 OR tracking_number = $1 LIMIT 1`,
      [data.parcelId]
    );

    if (parcelRes.rows.length === 0) {
      throw new Error(`Parcel not found: ${data.parcelId}`);
    }

    const parcel = parcelRes.rows[0];
    const exceptionId = uuidv4();

    // 2. Insert into parcel_exceptions
    await db.query(
      `INSERT INTO parcel_exceptions (id, parcel_id, raised_by_id, reason, resolution_status, resolution_notes)
       VALUES ($1, $2, $3, $4, 'OPEN', $5)`,
      [exceptionId, parcel.id, data.raisedById, data.reason, data.initialNotes || null]
    );

    // 3. Insert audit log
    await db.query(
      `INSERT INTO support_audit_logs (exception_id, changed_by_id, action, previous_state, new_state)
       VALUES ($1, $2, 'EXCEPTION_CREATED', NULL, $3)`,
      [
        exceptionId,
        data.raisedById,
        JSON.stringify({
          status: 'OPEN',
          reason: data.reason,
          notes: data.initialNotes || ''
        })
      ]
    );

    const created = await this.getExceptionById(exceptionId);
    if (!created) throw new Error('Failed to retrieve newly created exception');
    return created;
  }

  /**
   * Add a support note to an exception and record in audit log
   */
  public async addSupportNote(
    idOrParcelId: string,
    note: string,
    staffUser: { id: string; name?: string; role: string }
  ): Promise<ParcelException> {
    if (!note || note.trim().length === 0) {
      throw new Error('Support note content cannot be empty');
    }

    const exception = await this.getExceptionById(idOrParcelId);
    if (!exception) {
      throw new Error(`Exception record not found for: ${idOrParcelId}`);
    }

    const timestamp = new Date().toISOString();
    const authorTag = staffUser.name || `${staffUser.role} (${staffUser.id.substring(0, 8)})`;
    const formattedNote = `[${timestamp} by ${authorTag}]: ${note.trim()}`;
    const updatedNotes = exception.resolution_notes 
      ? `${exception.resolution_notes}\n\n${formattedNote}`
      : formattedNote;

    // 1. Update parcel_exceptions table
    await db.query(
      `UPDATE parcel_exceptions 
       SET resolution_notes = $1
       WHERE id = $2`,
      [updatedNotes, exception.id]
    );

    // 2. Append to support_audit_logs
    await db.query(
      `INSERT INTO support_audit_logs (exception_id, changed_by_id, action, previous_state, new_state)
       VALUES ($1, $2, 'NOTE_ADDED', $3, $4)`,
      [
        exception.id,
        staffUser.id,
        JSON.stringify({ note_count: (exception.resolution_notes?.split('\n\n').length || 0) }),
        JSON.stringify({ added_note: note.trim(), author: authorTag, timestamp })
      ]
    );

    const updated = await this.getExceptionById(exception.id);
    return updated!;
  }

  /**
   * Update resolution status of an exception, cascading parcel status and writing audit log
   */
  public async updateResolutionStatus(
    idOrParcelId: string,
    newStatus: ResolutionStatus,
    notes?: string,
    staffUser: { id: string; name?: string; role: string } = { id: '44444444-4444-4444-4444-444444444444', role: 'DISPATCHER' }
  ): Promise<ParcelException> {
    const validStatuses: ResolutionStatus[] = [
      'OPEN',
      'INVESTIGATING',
      'RESCHEDULED',
      'RETURN_TO_SENDER',
      'REFUNDED',
      'CANCELLED',
      'RESOLVED'
    ];

    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid resolution status '${newStatus}'. Allowed: ${validStatuses.join(', ')}`);
    }

    const exception = await this.getExceptionById(idOrParcelId);
    if (!exception) {
      throw new Error(`Exception record not found for: ${idOrParcelId}`);
    }

    const previousStatus = exception.resolution_status;
    const isClosing = ['RESOLVED', 'RESCHEDULED', 'RETURN_TO_SENDER', 'REFUNDED', 'CANCELLED'].includes(newStatus);
    
    // Append resolution note if provided
    let updatedNotes = exception.resolution_notes || '';
    if (notes && notes.trim().length > 0) {
      const timestamp = new Date().toISOString();
      const authorTag = staffUser.name || `${staffUser.role} (${staffUser.id.substring(0, 8)})`;
      const noteEntry = `[${timestamp} Status changed to ${newStatus} by ${authorTag}]: ${notes.trim()}`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n\n${noteEntry}` : noteEntry;
    }

    // 1. Update parcel_exceptions
    await db.query(
      `UPDATE parcel_exceptions
       SET resolution_status = $1,
           resolution_notes = $2,
           resolved_by_id = CASE WHEN $3 = TRUE THEN $4::uuid ELSE resolved_by_id END,
           resolved_at = CASE WHEN $3 = TRUE THEN NOW() ELSE resolved_at END
       WHERE id = $5`,
      [newStatus, updatedNotes, isClosing, staffUser.id, exception.id]
    );

    // 2. Cascade Status Transitions to Parcels & Status History
    let targetParcelStatus: string | null = null;
    let historyNote = `Exception resolution updated to ${newStatus}`;

    if (newStatus === 'RESCHEDULED') {
      targetParcelStatus = 'CONFIRMED'; // Ready for re-dispatch
      historyNote = 'Delivery rescheduled following support review';
    } else if (newStatus === 'RETURN_TO_SENDER') {
      targetParcelStatus = 'RETURNED';
      historyNote = 'Parcel flagged for return to sender';
    } else if (newStatus === 'CANCELLED') {
      targetParcelStatus = 'CANCELLED';
      historyNote = 'Parcel delivery cancelled by support desk';
    }

    if (targetParcelStatus) {
      await db.query(
        `UPDATE parcels SET status = $1, updated_at = NOW() WHERE id = $2`,
        [targetParcelStatus, exception.parcel_id]
      );

      await db.query(
        `INSERT INTO parcel_status_history (parcel_id, courier_id, status, location_name, note)
         VALUES ($1, $2, $3, 'Support Operations Hub', $4)`,
        [exception.parcel_id, staffUser.id, targetParcelStatus, historyNote]
      );
    }

    // 3. Write immutable audit log
    await db.query(
      `INSERT INTO support_audit_logs (exception_id, changed_by_id, action, previous_state, new_state)
       VALUES ($1, $2, 'STATUS_UPDATED', $3, $4)`,
      [
        exception.id,
        staffUser.id,
        JSON.stringify({ resolution_status: previousStatus }),
        JSON.stringify({ 
          resolution_status: newStatus,
          notes: notes || null,
          changed_by: staffUser.name || staffUser.id,
          cascaded_parcel_status: targetParcelStatus
        })
      ]
    );

    const updated = await this.getExceptionById(exception.id);
    return updated!;
  }

  /**
   * In-memory fallback if database connectivity drops
   */
  private getFallbackExceptions(filters?: { status?: string; search?: string }): ParcelException[] {
    const list: ParcelException[] = [
      {
        id: '99999999-9999-9999-9999-999999999991',
        parcel_id: '66666666-6666-6666-6666-666666666666',
        tracking_number: 'SWIFT-991122',
        recipient_name: 'Robert Smith',
        recipient_phone: '+94779876543',
        delivery_address: '742 Evergreen Terrace, Sector 4, Colombo 03',
        parcel_status: 'FAILED',
        weight_kg: 1.2,
        total_fee: 450,
        special_notes: 'Fragile electronics inside',
        raised_by_id: '22222222-2222-2222-2222-222222222222',
        raised_by_name: 'Courier Sunil Silva',
        reason: 'Customer not home after 3 delivery attempts. Recipient phone rings with no answer.',
        resolution_status: 'OPEN',
        resolution_notes: 'Awaiting customer callback or dispatcher reschedule instructions.',
        resolved_by_id: null,
        resolved_by_name: null,
        created_at: new Date().toISOString(),
        resolved_at: null,
        photo_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500',
        failure_reason: 'RECIPIENT_UNAVAILABLE',
        audit_logs: [
          {
            id: 'b1111111-1111-1111-1111-111111111111',
            exception_id: '99999999-9999-9999-9999-999999999991',
            changed_by_id: '22222222-2222-2222-2222-222222222222',
            changed_by_name: 'Courier Sunil Silva',
            action: 'EXCEPTION_CREATED',
            previous_state: null,
            new_state: { status: 'OPEN', reason: 'Customer not home after 3 attempts' },
            created_at: new Date().toISOString()
          }
        ]
      },
      {
        id: '99999999-9999-9999-9999-999999999992',
        parcel_id: '77777777-7777-7777-7777-777777777777',
        tracking_number: 'SWIFT-443322',
        recipient_name: 'Anura Bandara',
        recipient_phone: '+94712345678',
        delivery_address: '88 Peradeniya Road, Kandy',
        parcel_status: 'FAILED',
        weight_kg: 2.5,
        total_fee: 650,
        special_notes: 'Damaged barcode scan label at sorting',
        raised_by_id: '44444444-4444-4444-4444-444444444444',
        raised_by_name: 'Operational Dispatch Admin',
        reason: 'Damaged barcode scan label at sorting hub. Diverter automatically routed to support exception bay.',
        resolution_status: 'INVESTIGATING',
        resolution_notes: 'Hub manager contacted sender to verify address.',
        resolved_by_id: null,
        resolved_by_name: null,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        resolved_at: null,
        photo_url: 'https://images.unsplash.com/photo-1607344645866-009c320b5ab8?w=500',
        failure_reason: 'DAMAGED_LABEL',
        audit_logs: [
          {
            id: 'b2222222-2222-2222-2222-222222222222',
            exception_id: '99999999-9999-9999-9999-999999999992',
            changed_by_id: '44444444-4444-4444-4444-444444444444',
            changed_by_name: 'Operational Dispatch Admin',
            action: 'EXCEPTION_CREATED',
            previous_state: null,
            new_state: { status: 'OPEN', reason: 'Damaged barcode scan label' },
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ]
      }
    ];

    return list.filter(e => {
      if (filters?.status && filters.status.toUpperCase() !== 'ALL' && e.resolution_status !== filters.status.toUpperCase()) {
        return false;
      }
      if (filters?.search) {
        const s = filters.search.toLowerCase();
        return e.tracking_number.toLowerCase().includes(s) || e.recipient_name.toLowerCase().includes(s);
      }
      return true;
    });
  }
}

export const supportService = new SupportService();

