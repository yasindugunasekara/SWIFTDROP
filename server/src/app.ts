
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';

const app: Express = express();
// Vercel supplies the trusted forwarding hop used by the existing IP limiters.
if (process.env.VERCEL) app.set('trust proxy', 1);

// Security & Parsing Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use('/api/v1/auth', express.json({ limit: '16kb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
