import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { authenticateToken, type AuthRequest } from '../../middleware/auth.js';
import { requireRoles } from '../../middleware/rbac.js';
import { bookingPersistence } from './booking.persistence.js';

export const quoteRequestSchema = z.object({
  pickupAddress:z.string().trim().min(3).max(1000),dropoffAddress:z.string().trim().min(3).max(1000),
  weightKg:z.number().positive().max(100),category:z.string().trim().max(50).optional(),
  lengthCm:z.number().positive().max(500).optional(),widthCm:z.number().positive().max(500).optional(),
  heightCm:z.number().positive().max(500).optional(),promoCode:z.string().trim().max(30).optional(),
  zoneId:z.string().uuid().optional(),distanceKm:z.number().nonnegative().max(2000).optional()
});
export const createBookingSchema = quoteRequestSchema.extend({
  senderName:z.string().trim().min(2).max(150),senderPhone:z.string().trim().min(5).max(30),
  recipientName:z.string().trim().min(2).max(150),recipientPhone:z.string().trim().min(5).max(30),
  category:z.string().trim().max(50).default('Parcels'),lengthCm:z.number().positive().max(500).default(20),
  widthCm:z.number().positive().max(500).default(15),heightCm:z.number().positive().max(500).default(10),
  specialInstructions:z.string().trim().max(2000).default(''),paymentMethod:z.enum(['wallet','card','cod']).default('cod'),
  clientFeeEstimate:z.number().optional()
});

export function createBookingRouter(authenticate: RequestHandler = authenticateToken, persistence = bookingPersistence) {
  const router=Router();
  router.post('/quote',async(req,res)=>{
    try { res.json({success:true,quote:await persistence.quote(quoteRequestSchema.parse(req.body))}); }
    catch(error) {
      if(error instanceof z.ZodError) {res.status(400).json({error:'Invalid quote parameters.',details:error.flatten().fieldErrors});return;}
      res.status(503).json({error:'Pricing is temporarily unavailable.'});
    }
  });
  router.post('/create',authenticate,requireRoles(['CUSTOMER']),async(req:AuthRequest,res)=>{
    try {
      const input=createBookingSchema.parse(req.body);
      const parcel=await persistence.create(req.user!.id,input);
      res.status(201).json({success:true,message:'Parcel booking confirmed.',parcel,parcelId:parcel.id,
        trackingNumber:parcel.trackingNumber,serverFeeEnforced:true,clientPriceIgnored:input.clientFeeEstimate!==undefined});
    } catch(error) {
      if(error instanceof z.ZodError) {res.status(400).json({error:'Invalid booking parameters.',details:error.flatten().fieldErrors});return;}
      res.status(503).json({error:'Unable to save your booking. Please retry.'});
    }
  });
  router.get('/list',authenticate,requireRoles(['CUSTOMER']),async(req:AuthRequest,res)=>{
    try {res.json({success:true,parcels:await persistence.list(req.user!.id)});}
    catch {res.status(503).json({error:'Bookings are temporarily unavailable.'});}
  });
  return router;
}
export default createBookingRouter();
