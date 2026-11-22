import { db } from '../../config/database.js';
import { DispatchService, type ServiceConfig, type AssignmentResult, type CourierWorkload, type UnassignedParcel } from './dispatch.service.js';
import type { OperationalDatabase } from '../operations/database.js';
import { loadServiceConfig, saveServiceConfig } from '../operations/pricing.js';
import { listMerchants, setMerchantApproval, type ApprovalStatus } from '../merchant/merchant.service.js';

export class DatabaseDispatchService extends DispatchService {
  constructor(private database: OperationalDatabase = db) {super();}
  async getUnassignedParcels(zone?:string,search?:string):Promise<UnassignedParcel[]> {
    const result=await this.database.query(`SELECT p.id,p.tracking_number AS "trackingNumber",p.sender_name AS "senderName",
      p.sender_phone AS "senderPhone",p.pickup_address AS "pickupAddress",p.recipient_name AS "recipientName",
      p.recipient_phone AS "recipientPhone",p.delivery_address AS "deliveryAddress",p.weight_kg::float AS "weightKg",
      p.total_fee::float AS "totalFee",p.status,p.special_notes AS "specialNotes",p.created_at AS "createdAt",coalesce(z.zone_name,'Unspecified') AS zone
      FROM public.parcels p LEFT JOIN public.delivery_zones z ON z.id=p.zone_id WHERE p.status='CONFIRMED'
      AND ($1::text IS NULL OR z.zone_name ILIKE '%' || $1 || '%')
      AND ($2::text IS NULL OR p.tracking_number ILIKE '%' || $2 || '%' OR p.recipient_name ILIKE '%' || $2 || '%') ORDER BY p.created_at`,
      [zone && zone!=='all'?zone:null,search?.trim()||null]);
    return result.rows;
  }
  async getCourierWorkloads():Promise<CourierWorkload[]> {
    const config=await this.getServiceConfig();
    const result=await this.database.query(`SELECT u.id,u.full_name AS name,u.email,coalesce(u.phone,'') AS phone,u.is_active AS "isOnline",
      count(p.id) FILTER (WHERE p.status IN ('ASSIGNED','PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'))::int AS "currentLoad"
      FROM public.users u LEFT JOIN public.courier_assignments ca ON ca.courier_id=u.id AND ca.is_active
      LEFT JOIN public.parcels p ON p.id=ca.parcel_id WHERE u.role='COURIER' GROUP BY u.id ORDER BY u.full_name`);
    return result.rows.map(r=>({...r,maxCapacity:config.maxCourierCapacity,vehicleType:'Courier',
      status:!r.isOnline?'OFFLINE':r.currentLoad>=config.maxCourierCapacity?'AT_CAPACITY':r.currentLoad>=10?'NEAR_CAPACITY':'AVAILABLE'}));
  }
  async assignParcel(courierId:string,parcelId:string,dispatcherId?:string,notes?:string):Promise<AssignmentResult> {
    const result=await this.database.query('SELECT public.assign_delivery_parcel($1,$2,$3,$4) AS assignment',[parcelId,courierId,dispatcherId??null,notes??null]);
    return result.rows[0].assignment;
  }
  async bulkAssignParcels(courierId:string,parcelIds:string[],dispatcherId?:string) {
    const assigned:AssignmentResult[]=[],failed:Array<{parcelId:string;error:string}>=[];
    for(const parcelId of [...new Set(parcelIds)]) {
      try {assigned.push(await this.assignParcel(courierId,parcelId,dispatcherId,'Bulk assignment'));}
      catch {failed.push({parcelId,error:'Parcel unavailable or courier capacity exceeded'});}
    }
    return {assigned,failed};
  }
  async getServiceConfig():Promise<ServiceConfig> {return loadServiceConfig(this.database);}
  async updateServiceConfig(updates:Partial<ServiceConfig>):Promise<ServiceConfig> {return saveServiceConfig(updates,this.database);}
  setMerchantApproval(id:string,status:ApprovalStatus) {return setMerchantApproval(id,status);}
  listMerchants(status?:ApprovalStatus) {return listMerchants(status);}
}
export const databaseDispatchService = new DatabaseDispatchService();
