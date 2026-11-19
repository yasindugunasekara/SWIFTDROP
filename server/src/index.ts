import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { config } from './config/env.js';
import { TRACKING_SOCKET_PATH, MAX_MESSAGE_BYTES, attachTrackingSocket, upgradePathname } from './modules/tracking/tracking.socket.js';

const server = http.createServer(app);
const port = config.port;

// WebSocket servers share the HTTP server and are chosen by path on upgrade:
//   /ws/tracking  -> Member 3 live parcel tracking (subscribe by tracking number)
//   anything else -> general real-time channel (e.g. notifications)
export const wss = new WebSocketServer({ noServer: true });
export const trackingWss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
attachTrackingSocket(trackingWss);

server.on('upgrade', (req, socket, head) => {
  // Anything thrown here would be uncaught and stop the process, so a request
  // target that cannot be parsed (e.g. "//a:b@") is dropped, never thrown.
  socket.on('error', () => socket.destroy());
  const pathname = upgradePathname(req.url);
  if (pathname === null) {
    socket.destroy();
    return;
  }
  const target = pathname === TRACKING_SOCKET_PATH ? trackingWss : wss;
  try {
    target.handleUpgrade(req, socket, head, (ws) => target.emit('connection', ws, req));
  } catch {
    socket.destroy();
  }
});

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
  console.log(`📦 Live tracking WebSocket on ws://localhost:${port}${TRACKING_SOCKET_PATH}`);
});
