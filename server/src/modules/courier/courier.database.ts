import { db } from '../../config/database.js';
import type { OperationalDatabase } from '../operations/database.js';
import { validateStatusTransition, type AssignedJob, type ParcelStatus, type UploadProofInput, type DeliveryProofRecord } from './courier.service.js';

const columns=`p.id,p.tracking_number AS "trackingNumber",p.sender_name AS "senderName",p.sender_phone AS "senderPhone",
 p.pickup_address AS "pickupAddress",p.recipient_name AS "recipientName",p.recipient_phone AS "recipientPhone",
 p.delivery_address AS "deliveryAddress",p.weight_kg::float AS "weightKg",p.total_fee::float AS "totalFee",
 p.status,p.special_notes AS "specialNotes",ca.assigned_at AS "assignedAt",ca.courier_id AS "courierId",u.full_name AS "courierName"`;

/** Production service: no seeded records and no success on a failed database write. */
export class DatabaseCourierService {
  constructor(private database: OperationalDatabase = db) {}
  async getAssignedJobs(courierId: string, filter?: string): Promise<AssignedJob[]> {
    const result=await this.database.query(`SELECT ${columns} FROM public.courier_assignments ca
      JOIN public.parcels p ON p.id=ca.parcel_id JOIN public.users u ON u.id=ca.courier_id
      WHERE ca.courier_id=$1 AND ca.is_active
      AND DATE(ca.assigned_at AT TIME ZONE 'Asia/Colombo')=DATE(now() AT TIME ZONE 'Asia/Colombo')
      AND ($2::text IS NULL OR p.status::text=$2) ORDER BY ca.assigned_at,p.id`,
      [courierId,filter && filter.toLowerCase()!=='all' ? filter.toUpperCase():null]);
    return result.rows;
  }
  async getJobDetails(courierId: string, reference: string, role='COURIER'): Promise<AssignedJob|null> {
    const result=await this.database.query(`SELECT ${columns} FROM public.parcels p
      JOIN public.courier_assignments ca ON ca.parcel_id=p.id AND ca.is_active
      JOIN public.users u ON u.id=ca.courier_id
      WHERE (p.id::text=$1 OR p.tracking_number=$1) AND (ca.courier_id=$2 OR $3='ADMIN')`,[reference,courierId,role]);
    const job=result.rows[0]; if(!job) return null;
    const proofs=await this.database.query(`SELECT id,parcel_id AS "parcelId",courier_id AS "courierId",photo_url AS "photoUrl",
      recipient_signature_url AS "recipientSignatureUrl",failure_reason AS "failureReason",created_at AS "createdAt"
      FROM public.courier_delivery_proofs WHERE parcel_id=$1 ORDER BY created_at DESC LIMIT 1`,[job.id]);
    job.latestProof=proofs.rows[0];
    return job;
  }
  async updateParcelStatus(courierId:string, reference:string, status:ParcelStatus,note?:string,
    location?:{name?:string;lat?:number;lng?:number},role='COURIER'):Promise<AssignedJob> {
    const job=await this.getJobDetails(courierId,reference,role);
    if(!job) throw new Error('Forbidden: Assigned parcel not found');
    const transition=validateStatusTransition(job.status,status);
    if(!transition.valid) throw new Error(transition.error);
    if(status==='DELIVERED' && !job.latestProof) throw new Error('Proof photo required before delivery');
    if(status==='FAILED' && !note?.trim()) throw new Error('Failure reason is required');
    const changed=await this.database.query(`WITH updated AS (
      UPDATE public.parcels p SET status=$1::public.parcel_status,updated_at=now()
      WHERE p.id=$2 AND p.status::text=$3 AND EXISTS(SELECT 1 FROM public.courier_assignments ca
        WHERE ca.parcel_id=p.id AND ca.is_active AND (ca.courier_id=$4 OR $5='ADMIN')) RETURNING id,status
    ) INSERT INTO public.parcel_status_history(parcel_id,courier_id,status,note,location_name,latitude,longitude)
      SELECT id,$4,status,$6,$7,$8,$9 FROM updated RETURNING parcel_id`,
      [status,job.id,job.status,courierId,role,note?.slice(0,2000)??null,location?.name?.slice(0,255)??null,location?.lat??null,location?.lng??null]);
    if(!changed.rows.length) throw new Error('Invalid transition: Parcel changed; refresh and retry');
    return {...job,status};
  }
  async uploadDeliveryProof(courierId:string,reference:string,input:UploadProofInput,role='COURIER'):Promise<DeliveryProofRecord> {
    const job=await this.getJobDetails(courierId,reference,role);
    if(!job) throw new Error('Forbidden: Assigned parcel not found');
    if(['DELIVERED','RETURNED','CANCELLED'].includes(job.status)) throw new Error('Parcel is in a terminal state');
    if(!/^\/uploads\/proof-[a-zA-Z0-9.-]+$/.test(input.photoUrl)) throw new Error('An uploaded proof photo is required');
    const result=await this.database.query(`INSERT INTO public.courier_delivery_proofs(parcel_id,courier_id,photo_url,recipient_signature_url,failure_reason)
      SELECT $1,$2,$3,$4,$5 WHERE EXISTS(SELECT 1 FROM public.courier_assignments WHERE parcel_id=$1 AND is_active AND (courier_id=$2 OR $6='ADMIN'))
      RETURNING id,parcel_id AS "parcelId",courier_id AS "courierId",photo_url AS "photoUrl",created_at AS "createdAt"`,
      [job.id,courierId,input.photoUrl,input.recipientSignatureUrl??null,input.failureReason?.slice(0,2000)??null,role]);
    if(!result.rows[0]) throw new Error('Forbidden: Assignment changed');
    return result.rows[0];
  }
  async recordDeliveryFailure(courierId:string,reference:string,reason:string,note?:string,role='COURIER') {
    if(!reason.trim()) throw new Error('Failure reason is required');
    return this.updateParcelStatus(courierId,reference,'FAILED',[reason,note].filter(Boolean).join(': '),undefined,role);
  }
}
export const databaseCourierService=new DatabaseCourierService();
