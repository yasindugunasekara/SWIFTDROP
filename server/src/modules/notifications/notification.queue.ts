/**
 * Member 07 — shared RabbitMQ queue configuration.
 *
 * The publisher and consumer must resolve the same names at runtime. Reading
 * the environment through functions (instead of module-load constants) keeps
 * tests and local configuration from freezing an old value into the process.
 */

export const NOTIFICATION_QUEUE_DEFAULT = 'swiftdrop_notifications_queue';
export const NOTIFICATION_DEAD_LETTER_QUEUE_DEFAULT = 'swiftdrop_dead_letter_queue';

export function notificationQueueName(): string {
  return process.env.RABBITMQ_QUEUE_NOTIFICATIONS || NOTIFICATION_QUEUE_DEFAULT;
}

export function notificationDeadLetterQueueName(): string {
  return process.env.RABBITMQ_QUEUE_DLQ || NOTIFICATION_DEAD_LETTER_QUEUE_DEFAULT;
}
