import http from 'http';
import { WebSocketServer } from 'ws';
import app from './app.js';
import { config } from './config/env.js';
import { closeRabbitMQ } from './config/rabbitmq.js';
import { closeNotificationPublisher } from './modules/notifications/notification.publisher.js';
import { createApiShutdown } from './lifecycle/api-shutdown.js';

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
  for (const client of wss.clients) {
    try {
      client.close(1001, 'Server shutting down');
    } catch {
      // Best effort; the shutdown timeout bounds the drain.
    }
  }

  await new Promise<void>(resolve => {
    wss.close(() => resolve());
  });
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
});
