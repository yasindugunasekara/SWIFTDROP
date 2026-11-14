import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { config } from './config/env.js';

const server = http.createServer(app);
const port = config.port;

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
