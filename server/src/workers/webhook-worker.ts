import { connectRabbitMQ } from '../config/rabbitmq.js';
import {
  inMemoryStore,
  webhookService,
  WebhookDeliveryAttempt
} from '../modules/webhooks/webhook.service.js';

let isRunning = false;
let retryInterval: NodeJS.Timeout | null = null;

/**
 * Member 8 Webhook Worker
 * Handles asynchronous event consumption from RabbitMQ and background retry loop with exponential backoff & DLQ state.
 */
export const startWebhookWorker = async () => {
  if (isRunning) return;
  isRunning = true;

  console.log('🔄 Initializing Member 8 Webhook Dispatch & Retry Worker (DLQ)...');

  // 1. Initialize RabbitMQ Consumer for parcel events
  try {
    const mq = await connectRabbitMQ();
    if (mq && mq.channel) {
      const ch = mq.channel;
      const queue = process.env.RABBITMQ_QUEUE_WEBHOOKS || 'swiftdrop_webhooks_queue';
      const dlq = process.env.RABBITMQ_QUEUE_DLQ || 'swiftdrop_dead_letter_queue';

      await ch.assertQueue(queue, { durable: true });
      await ch.assertQueue(dlq, { durable: true });

      console.log(`📡 [Webhook Worker] Subscribed to RabbitMQ queue '${queue}'`);

      ch.consume(queue, async (msg) => {
        if (!msg) return;

        try {
          const content = JSON.parse(msg.content.toString());
          console.log(`📥 [Webhook Worker] Received parcel event for merchant ${content.merchantId}: ${content.event}`);

          const endpoint = await webhookService.getEndpoint(content.merchantId);
          if (endpoint && endpoint.is_active) {
            const attempt = await webhookService.dispatchEvent(
              endpoint,
              content.event,
              content.parcel,
              content.parcelId
            );

            if (attempt.is_dead_letter) {
              console.warn(`☠️ [Webhook Worker] Delivery ${attempt.id} moved to RabbitMQ DLQ '${dlq}'`);
              ch.sendToQueue(dlq, Buffer.from(JSON.stringify(attempt)), { persistent: true });
            }
          }

          ch.ack(msg);
        } catch (err) {
          console.error('❌ [Webhook Worker] Error consuming message:', err);
          ch.nack(msg, false, false);
        }
      });
    } else {
      console.log('ℹ️ [Webhook Worker] RabbitMQ broker unavailable; running internal async retry engine.');
    }
  } catch (err) {
    console.warn('⚠️ [Webhook Worker] RabbitMQ connection failed; continuing with internal retry loop.');
  }

  // 2. Start internal periodic retry loop for exponential backoff retries
  startRetryEngine();
  console.log('✅ Member 8 Webhook Dispatch & Retry Worker operational.');
};

/**
 * Runs background sweep every 10 seconds to process pending retries
 */
export function startRetryEngine(intervalMs = 10000) {
  if (retryInterval) clearInterval(retryInterval);

  retryInterval = setInterval(async () => {
    try {
      const pending = inMemoryStore.getPendingRetries();
      if (pending.length > 0) {
        console.log(`🔁 [Webhook Worker] Processing ${pending.length} pending retries with exponential backoff...`);
        for (const item of pending) {
          try {
            await webhookService.retryDelivery(item.id, item.merchant_id);
            console.log(`   ➜ Delivery ${item.id} retried (attempt ${item.attempt_count}, code ${item.response_code})`);
          } catch (err: any) {
            console.error(`   ❌ Failed to retry delivery ${item.id}:`, err.message);
          }
        }
      }
    } catch (err) {
      console.error('Error during webhook retry loop:', err);
    }
  }, intervalMs);
}

export function stopWebhookWorker() {
  if (retryInterval) {
    clearInterval(retryInterval);
    retryInterval = null;
  }
  isRunning = false;
  console.log('🛑 Member 8 Webhook Worker stopped.');
}
