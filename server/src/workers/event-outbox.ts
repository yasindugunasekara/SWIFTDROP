import { db } from '../config/database.js';
import { createNotificationPublisher } from '../modules/notifications/notification.publisher.js';
import { createRabbitMQConfirmChannel } from '../config/rabbitmq.js';
import type { OperationalDatabase } from '../modules/operations/database.js';
import type { PublisherChannel } from '../modules/notifications/notification.publisher.js';

const publisher = (name: () => string) => createNotificationPublisher({
  createConfirmChannel: async () => (await createRabbitMQConfirmChannel()) as unknown as PublisherChannel | null,
  queueName: name,
});
const notifications=publisher(()=>process.env.RABBITMQ_QUEUE_NOTIFICATIONS || 'swiftdrop_notifications_queue');
const webhooks=publisher(()=>process.env.RABBITMQ_QUEUE_WEBHOOKS || 'swiftdrop_webhooks_queue');
export async function flushEventOutbox(database: OperationalDatabase = db,
  publishNotification = notifications.publish, publishWebhook = webhooks.publish) {
  const pending=await database.query('SELECT id,payload FROM public.parcel_event_outbox WHERE published_at IS NULL ORDER BY created_at LIMIT 100');
  let published=0;
  for(const row of pending.rows) {
    // Both confirms must arrive. Redelivery is expected and consumers deduplicate.
    if(!await publishNotification(row.payload)) break;
    if(row.payload.merchantId && !await publishWebhook(row.payload)) break;
    await database.query('UPDATE public.parcel_event_outbox SET published_at=now() WHERE id=$1',[row.id]);
    published++;
  }
  return published;
}
let timer: ReturnType<typeof setInterval> | undefined;
let active: Promise<unknown> | undefined;
export function startEventOutbox() {
  if(timer) return;
  const run=()=>{if(!active) active=flushEventOutbox().catch(()=>console.error('Parcel event relay unavailable')).finally(()=>{active=undefined;});};
  timer=setInterval(run,3000); run();
}
export async function stopEventOutbox() {
  if(timer) clearInterval(timer);timer=undefined;
  await active;
  await Promise.all([notifications.close(),webhooks.close()]);
}
