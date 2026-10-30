import express, { Express, Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';

dotenv.config();

const app: Express = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;

// Security & Parsing Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
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

// WebSocket Server for Real-Time Tracking & Notifications
export const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log(`WebSocket client connected: ${req.socket.remoteAddress}`);
  ws.on('message', (message) => {
    console.log('Received socket message:', message.toString());
  });
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

server.listen(port, () => {
  console.log(`🚀 SwiftDrop Server running on http://localhost:${port}`);
  console.log(`📡 WebSocket server initialized on ws://localhost:${port}`);
});
