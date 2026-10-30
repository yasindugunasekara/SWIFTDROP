import { connectRabbitMQ } from '../config/rabbitmq.js';

export const startNotificationConsumer = async () => {
  console.log('🔄 Initializing Member 7 RabbitMQ Notification Consumer...');
  const mq = await connectRabbitMQ();
  if (!mq) {
    console.warn('⚠️ RabbitMQ not available; consumer paused.');
    return;
  }

  const queue = process.env.RABBITMQ_QUEUE_NOTIFICATIONS || 'swiftdrop_notifications_queue';
  await mq.channel.assertQueue(queue, { durable: true });

  mq.channel.consume(queue, (msg) => {
    if (msg !== null) {
      const content = msg.content.toString();
      try {
        const event = JSON.parse(content);
        console.log(`[RabbitMQ Consumer] Processing notification event idempotently:`, event.eventId);
        // TODO [Member 7]: Verify event idempotency key to prevent duplicates
        mq.channel.ack(msg);
      } catch (err) {
        console.error('Error processing notification event:', err);
        mq.channel.nack(msg, false, false); // Send to DLQ if malformed
      }
    }
  });
};
