import { connectRabbitMQ, createRabbitMQChannel } from '../config/rabbitmq.js';
import type { Channel } from 'amqplib';
import { z } from 'zod';
import { databaseWebhookService as webhookService } from '../modules/webhooks/webhook.database.js';
let running=false;
let channel:Channel|null=null;
let timer:ReturnType<typeof setInterval>|null=null;
let sweep:Promise<void>|null=null;
const eventSchema=z.object({eventId:z.string().uuid(),merchantId:z.string().uuid(),parcelId:z.string().uuid(),event:z.string().min(1),parcel:z.object({id:z.string(),trackingNumber:z.string(),status:z.string()})});
async function connectConsumer(){
  if(!running||channel)return;
  if(!await connectRabbitMQ())return;
  const ch=await createRabbitMQChannel();if(!ch||!running){await ch?.close();return;}
  channel=ch;
  ch.on('close',()=>{if(channel===ch)channel=null;});
  ch.on('error',()=>console.error('Webhook broker channel unavailable'));
  const queue=process.env.RABBITMQ_QUEUE_WEBHOOKS||'swiftdrop_webhooks_queue';
  await ch.assertQueue(queue,{durable:true});await ch.prefetch(10);
  await ch.consume(queue,async msg=>{
    if(!msg)return;
    let payload;
    try{payload=eventSchema.parse(JSON.parse(msg.content.toString()));}
    catch {ch.ack(msg);return;}
    try {
      const endpoint=await webhookService.getEndpoint(payload.merchantId);
      const webhookEvent=['PARCEL_DELIVERED','PARCEL_FAILED'].includes(payload.event)?payload.event:'PARCEL_STATUS_UPDATED';
      if(endpoint?.events.includes(webhookEvent))await webhookService.dispatchEvent(endpoint,webhookEvent,payload.parcel,payload.parcelId,payload.eventId);
      ch.ack(msg);
    } catch {
      console.error('Webhook event processing unavailable; retrying');
      setTimeout(()=>{try{ch.nack(msg,false,true);}catch{}},1000);
    }
  });
}
export function startRetryEngine(intervalMs=3000){
  if(timer)return;
  const run=()=>{
    if(sweep||!running)return;
    sweep=(async()=>{
      await connectConsumer();
      for(const item of await webhookService.getPendingRetries()){
        try{await webhookService.retryDelivery(item.id,item.merchant_id,true);}catch{console.error('Webhook retry unavailable');}
      }
    })().catch(()=>console.error('Webhook worker unavailable')).finally(()=>{sweep=null;});
  };
  timer=setInterval(run,intervalMs);run();
}
export async function startWebhookWorker(){if(running)return;running=true;startRetryEngine();}
export async function stopWebhookWorker(){
  running=false;if(timer)clearInterval(timer);timer=null;
  await channel?.close().catch(()=>{});channel=null;await sweep;
}
