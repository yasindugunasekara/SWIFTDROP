
import express, { Express, Request, Response } from 'express';
import path from 'node:path';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';

const app: Express = express();
// Vercel supplies the trusted forwarding hop used by the existing IP limiters.
if (process.env.VERCEL) app.set('trust proxy', 1);

// Security & Parsing Middleware
app.use(helmet());
const allowedOrigins = config.corsOrigin.split(',').map(origin => origin.trim()).filter(Boolean);
if (config.nodeEnv === 'development' && !process.env.VERCEL) {
  allowedOrigins.push('http://localhost:8081', 'http://127.0.0.1:8081');
}
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use('/api/v1/auth', express.json({ limit: '16kb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((_req,res,next)=>{
  const json=res.json.bind(res);
  res.json=((body:any)=>json(res.statusCode>=500?{error:'Service temporarily unavailable. Please retry.'}:body)) as typeof res.json;
  next();
});
// Proof images are private. Fetch them with an application bearer token.
import { authenticateToken } from './middleware/auth.js';
import { requireRoles } from './middleware/rbac.js';
import { db } from './config/database.js';
app.get('/api/v1/proof-file',authenticateToken,async(req:any,res)=>{
  try {
    const requested=String(req.query.path??'');
    if(!/^\/uploads\/proof-[a-zA-Z0-9.-]+$/.test(requested)){res.status(400).json({error:'Invalid proof path'});return;}
    const proof=await db.query(`SELECT d.id FROM public.courier_delivery_proofs d JOIN public.parcels p ON p.id=d.parcel_id
      WHERE d.photo_url=$1 AND ($3 IN ('ADMIN','DISPATCHER') OR p.customer_id=$2 OR EXISTS(
        SELECT 1 FROM public.courier_assignments ca WHERE ca.parcel_id=p.id AND ca.courier_id=$2 AND ca.is_active)) LIMIT 1`,[requested,req.user.id,req.user.role]);
    if(!proof.rows.length){res.status(404).json({error:'Proof not found'});return;}
    res.set('Cache-Control','private,no-store');res.sendFile(path.basename(requested),{root:path.join(process.cwd(),'uploads')},error=>{if(error&&!res.headersSent)res.status(404).end();});
  } catch {res.status(503).json({error:'Proof image unavailable'});}
});

// Health Check Endpoint
app.get(['/health', '/api/v1/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SwiftDrop API',
    timestamp: new Date().toISOString()
  });
});

// Member Module Routes
import authRoutes from './modules/auth/auth.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import bookingRoutes from './modules/booking/booking.routes.js';
import trackingRoutes from './modules/tracking/tracking.routes.js';
import courierRoutes from './modules/courier/courier.routes.js';
import dispatchRoutes from './modules/dispatch/dispatch.routes.js';
import merchantRoutes from './modules/merchant/merchant.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import webhookRoutes from './modules/webhooks/webhook.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import supportRoutes from './modules/support/support.routes.js';
import aiRoutes from './modules/ai/ai.routes.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/booking', bookingRoutes);
app.use('/api/v1/tracking', trackingRoutes);
app.use('/api/v1/courier', courierRoutes);
app.use('/api/v1/dispatch', dispatchRoutes);
app.use('/api/v1/merchant', merchantRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use((_req, res) => { res.status(404).json({ error: 'API endpoint not found.' }); });
app.use(errorHandler);

export default app;
