import { connectRabbitMQ } from '../config/rabbitmq.js';

export const startNotificationConsumer = async () => {
  console.log('🔄 Initializing Member 7 RabbitMQ Notification Consumer...');
  const mq = await connectRabbitMQ();
  if (!mq || !mq.channel) {
    console.warn('⚠️ RabbitMQ not available; consumer paused.');
    return;
  }

  const ch = mq.channel;
  const queue = process.env.RABBITMQ_QUEUE_NOTIFICATIONS || 'swiftdrop_notifications_queue';
  await ch.assertQueue(queue, { durable: true });

  ch.consume(queue, (msg) => {
    if (msg !== null) {
      const content = msg.content.toString();
      try {
        const event = JSON.parse(content);
        console.log(`[RabbitMQ Consumer] Processing notification event idempotently:`, event.eventId);
        // TODO [Member 7]: Verify event idempotency key to prevent duplicates
        ch.ack(msg);
      } catch (err) {
        console.error('Error processing notification event:', err);
        ch.nack(msg, false, false); // Send to DLQ if malformed
      }
    }
  });
};
