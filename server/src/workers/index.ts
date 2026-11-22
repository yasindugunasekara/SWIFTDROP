import dotenv from 'dotenv';
dotenv.config();

import { closeRabbitMQ } from '../config/rabbitmq.js';
import { createWorkerShutdown } from '../lifecycle/worker-shutdown.js';
import {
  startNotificationConsumer,
  stopNotificationConsumer,
} from './notification-consumer.js';
import { startWebhookWorker, stopWebhookWorker } from './webhook-worker.js';

console.log('⚡ SwiftDrop Background Workers starting...');

let shuttingDown = false;

const shutdown = createWorkerShutdown({
  stopConsumer: stopNotificationConsumer,
  stopWebhook: stopWebhookWorker,
  closeBroker: closeRabbitMQ,
  exit: code => process.exit(code),
});

const handleShutdownSignal = (signal: string) => {
  shuttingDown = true;
  void shutdown(signal);
};

process.on('SIGINT', () => handleShutdownSignal('SIGINT'));
process.on('SIGTERM', () => handleShutdownSignal('SIGTERM'));

const init = async () => {
  try {
    if (shuttingDown) return;

    await startNotificationConsumer();
    if (shuttingDown) return;

    await startWebhookWorker();

    if (shuttingDown) {
      // A signal arrived while the webhook worker was starting. The shutdown
      // controller already ran, so stop any retry engine this late start added.
      stopWebhookWorker();
      return;
    }

    console.log('✅ SwiftDrop Background Workers operational.');
  } catch (error) {
    console.error('Worker startup failure:', error);
  }
};

void init();
