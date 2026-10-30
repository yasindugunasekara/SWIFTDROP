import dotenv from 'dotenv';
dotenv.config();

import { startNotificationConsumer } from './notification-consumer.js';
import { startWebhookWorker } from './webhook-worker.js';

console.log('⚡ SwiftDrop Background Workers starting...');

const init = async () => {
  try {
    await startNotificationConsumer();
    await startWebhookWorker();
    console.log('✅ SwiftDrop Background Workers operational.');
  } catch (error) {
    console.error('Worker startup failure:', error);
  }
};

init();
