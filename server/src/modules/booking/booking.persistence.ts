import { randomUUID } from 'node:crypto';
import { db } from '../../config/database.js';
import type { OperationalDatabase } from '../operations/database.js';
import { quoteDelivery } from '../operations/pricing.js';

export function createBookingPersistence(database: OperationalDatabase = db) {
  return {
    quote: (input: any) => quoteDelivery(input, database),
    async create(customerId: string, input: any) {
      const fee = await quoteDelivery(input, database);
      const id = randomUUID();
      const tracking = `SWIFT-${randomUUID().replace(/-/g,'').slice(0,12).toUpperCase()}`;
      const result = await database.query(`WITH parcel AS (
        INSERT INTO public.parcels(id,tracking_number,customer_id,sender_name,sender_phone,pickup_address,
          recipient_name,recipient_phone,delivery_address,weight_kg,dimension_length_cm,dimension_width_cm,
          dimension_height_cm,total_fee,status,special_notes,zone_id,category,payment_method,fee_breakdown)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'CONFIRMED',$15,$16,$17,$18,$19::jsonb) RETURNING *
      ), history AS (
        INSERT INTO public.parcel_status_history(parcel_id,status,note) SELECT id,status,'Delivery booked' FROM parcel
      ) SELECT * FROM parcel`, [id,tracking,customerId,input.senderName,input.senderPhone,input.pickupAddress,
        input.recipientName,input.recipientPhone,input.dropoffAddress,input.weightKg,input.lengthCm,input.widthCm,
        input.heightCm,fee.totalFee,input.specialInstructions,fee.zoneId,fee.category,input.paymentMethod,JSON.stringify(fee)]);
      return toParcel(result.rows[0]);
    },
    async list(customerId: string) {
      const result = await database.query('SELECT * FROM public.parcels WHERE customer_id=$1 ORDER BY created_at DESC LIMIT 100',[customerId]);
      return result.rows.map(toParcel);
    }
  };
}
function toParcel(p: any) {
  return { id:p.id,customerId:p.customer_id,trackingNumber:p.tracking_number,status:p.status,
    senderName:p.sender_name,senderPhone:p.sender_phone,pickupAddress:p.pickup_address,
    recipientName:p.recipient_name,recipientPhone:p.recipient_phone,dropoffAddress:p.delivery_address,
    category:p.category,weightKg:Number(p.weight_kg),dimensions:{length:Number(p.dimension_length_cm),width:Number(p.dimension_width_cm),height:Number(p.dimension_height_cm)},
    totalFee:Number(p.total_fee),currency:'LKR',feeBreakdown:p.fee_breakdown,paymentMethod:p.payment_method,
    specialInstructions:p.special_notes,estimatedPickup:'Pickup pending assignment',createdAt:p.created_at };
}
export const bookingPersistence = createBookingPersistence();
