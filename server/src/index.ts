import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { config } from './config/env.js';
import { closeRabbitMQ } from './config/rabbitmq.js';
import { closeNotificationPublisher } from './modules/notifications/notification.publisher.js';
import { createApiShutdown } from './lifecycle/api-shutdown.js';
import { closeWebSocketServers } from './lifecycle/websocket-shutdown.js';
import { TRACKING_SOCKET_PATH, MAX_MESSAGE_BYTES, attachTrackingSocket, upgradePathname } from './modules/tracking/tracking.socket.js';

const server = http.createServer(app);
const port = config.port;

// WebSocket servers share the HTTP server and are chosen by path on upgrade:
//   /ws/tracking  -> Member 3 live parcel tracking (subscribe by tracking number)
//   anything else -> general real-time channel (e.g. notifications)
export const wss = new WebSocketServer({ noServer: true });
export const trackingWss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });
const trackingSocket = attachTrackingSocket(trackingWss);

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

const stopHttp = () =>
  new Promise<void>((resolve, reject) => {
    server.close(error => {
      if (error) reject(error);
      else resolve();
    });
    // Idle keep-alive sockets must not hold the process open during drain.
    server.closeIdleConnections();
  });

const closeWebSockets = async () => {
  trackingSocket.close();
  await closeWebSocketServers([trackingWss, wss]);
};

const shutdown = createApiShutdown({
  stopHttp,
  closeWebSockets,
  closePublisher: closeNotificationPublisher,
  closeBroker: closeRabbitMQ,
  exit: code => process.exit(code),
});

const handleShutdownSignal = (signal: string) => {
  void shutdown(signal);
};

process.on('SIGINT', () => handleShutdownSignal('SIGINT'));
process.on('SIGTERM', () => handleShutdownSignal('SIGTERM'));

server.listen(port, () => {
  console.log(`🚀 SwiftDrop Server running on http://localhost:${port}`);
  console.log(`📡 WebSocket server initialized on ws://localhost:${port}`);
  console.log(`📦 Live tracking WebSocket on ws://localhost:${port}${TRACKING_SOCKET_PATH}`);
});
