import { randomUUID } from 'node:crypto';
import { db } from '../../config/database.js';
import type { OperationalDatabase } from '../operations/database.js';
import { WebhookService, validateEndpointUrl, signWebhookPayload, calculateExponentialBackoff,
  type WebhookEndpoint, type WebhookDeliveryAttempt } from './webhook.service.js';
import {assertPublicWebhookTarget} from './webhook-target.js';

/** Durable production webhook transport. The legacy memory store is for demos only. */
export class DatabaseWebhookService extends WebhookService {
  constructor(private database:OperationalDatabase=db, private send:typeof fetch=fetch,private validateTarget=assertPublicWebhookTarget){super();}
  async registerEndpoint(merchantId:string,targetUrl:string,events=['PARCEL_STATUS_UPDATED','PARCEL_DELIVERED','PARCEL_FAILED']) {
    const valid=validateEndpointUrl(targetUrl);if(!valid.valid)throw new Error('Invalid webhook URL');
    await this.validateTarget(targetUrl);
    const previous=await this.getEndpoint(merchantId);
    const result=await this.database.query(`INSERT INTO public.merchant_webhook_endpoints(id,merchant_id,target_url,signing_secret,events,is_active)
      VALUES($1,$2,$3,$4,$5,true) ON CONFLICT(id) DO UPDATE SET target_url=excluded.target_url,events=excluded.events,is_active=true RETURNING *`,
      [previous?.id??randomUUID(),merchantId,targetUrl,previous?.signing_secret??randomUUID()+randomUUID(),events]);
    return {endpoint:result.rows[0] as WebhookEndpoint,created:!previous};
  }
  async getEndpoint(merchantId:string):Promise<WebhookEndpoint|null> {
    const result=await this.database.query('SELECT * FROM public.merchant_webhook_endpoints WHERE merchant_id=$1 AND is_active ORDER BY created_at DESC LIMIT 1',[merchantId]);
    return result.rows[0]??null;
  }
  async deactivateEndpoint(endpointId:string,merchantId:string) {
    const r=await this.database.query('UPDATE public.merchant_webhook_endpoints SET is_active=false WHERE id=$1 AND merchant_id=$2 RETURNING id',[endpointId,merchantId]);return r.rows.length>0;
  }
  async getDeliveries(merchantId:string,filter:'all'|'dead_letter'|'delivered'='all') {
    const r=await this.database.query(`SELECT d.*,e.merchant_id FROM public.webhook_delivery_attempts d JOIN public.merchant_webhook_endpoints e ON e.id=d.endpoint_id
      WHERE e.merchant_id=$1 ORDER BY d.created_at DESC LIMIT 500`,[merchantId]);
    const deliveries=r.rows as WebhookDeliveryAttempt[];
    return {attempts:filter==='all'?deliveries:deliveries.filter(d=>filter==='dead_letter'?d.is_dead_letter:(d.response_code??0)>=200&&(d.response_code??0)<300),deadLetters:deliveries.filter(d=>d.is_dead_letter)};
  }
  async dispatchEvent(endpoint:WebhookEndpoint,eventType:string,parcelData:any,parcelId?:string,eventId:string=randomUUID()):Promise<WebhookDeliveryAttempt> {
    if(!endpoint.events.includes(eventType)) throw new Error('Webhook event is not subscribed');
    const payload={id:eventId,event:eventType,timestamp:new Date().toISOString(),merchantId:endpoint.merchant_id,parcel:parcelData};
    const r=await this.database.query(`INSERT INTO public.webhook_delivery_attempts(id,endpoint_id,parcel_id,payload,event_id,event_type,attempt_count,next_retry_at)
      VALUES($1,$2,$3,$4::jsonb,$5,$6,0,now()) ON CONFLICT(endpoint_id,event_id) WHERE event_id IS NOT NULL DO NOTHING RETURNING id`,
      [randomUUID(),endpoint.id,parcelId??null,JSON.stringify(payload),eventId,eventType]);
    if(r.rows.length) return this.retryDelivery(r.rows[0].id,endpoint.merchant_id,true);
    const existing=await this.database.query(`SELECT d.*,e.merchant_id FROM public.webhook_delivery_attempts d JOIN public.merchant_webhook_endpoints e ON e.id=d.endpoint_id WHERE d.endpoint_id=$1 AND d.event_id=$2`,[endpoint.id,eventId]);
    return existing.rows[0];
  }
  async getPendingRetries() {
    const result=await this.database.query(`SELECT d.id,e.merchant_id FROM public.webhook_delivery_attempts d JOIN public.merchant_webhook_endpoints e ON e.id=d.endpoint_id
      WHERE NOT d.is_dead_letter AND d.next_retry_at<=now() AND d.attempt_count<d.max_retries AND e.is_active ORDER BY d.next_retry_at LIMIT 100`);
    return result.rows;
  }
  async retryDelivery(deliveryId:string,merchantId:string,automatic=false):Promise<WebhookDeliveryAttempt> {
    const claim=await this.database.query(`UPDATE public.webhook_delivery_attempts d
      SET attempt_count=CASE WHEN is_dead_letter AND NOT $3 THEN 1 ELSE attempt_count+1 END,is_dead_letter=false,
        next_retry_at=now()+interval '1 minute',updated_at=now()
      FROM public.merchant_webhook_endpoints e WHERE d.id=$1 AND e.id=d.endpoint_id AND e.merchant_id=$2 AND e.is_active
        AND (NOT $3 OR (d.next_retry_at<=now() AND d.attempt_count<d.max_retries AND NOT d.is_dead_letter))
      RETURNING d.*,e.merchant_id,e.target_url,e.signing_secret`,[deliveryId,merchantId,automatic]);
    const d=claim.rows[0];if(!d)throw new Error('Delivery unavailable or already being processed');
    const body=JSON.stringify(d.payload),signed=signWebhookPayload(body,d.signing_secret);
    let status=0;
    try {
      const valid=validateEndpointUrl(d.target_url);if(!valid.valid)throw new Error('Invalid webhook URL');
      await this.validateTarget(d.target_url);
      const response=await this.send(d.target_url,{method:'POST',redirect:'error',body,signal:AbortSignal.timeout(6000),headers:{
      'Content-Type':'application/json','X-SwiftDrop-Signature':signed.signature,'X-SwiftDrop-Signature-Header':signed.header,
      'X-SwiftDrop-Timestamp':String(signed.timestamp),'X-SwiftDrop-Event':d.event_type}});status=response.status;await response.body?.cancel();}
    catch {status=0;}
    const success=status>=200&&status<300,dead=!success&&d.attempt_count>=d.max_retries;
    const next=success||dead?null:new Date(Date.now()+calculateExponentialBackoff(d.attempt_count+1)).toISOString();
    const saved=await this.database.query(`UPDATE public.webhook_delivery_attempts SET response_code=$2,response_body=$3,is_dead_letter=$4,next_retry_at=$5,updated_at=now()
      WHERE id=$1 RETURNING *`,[d.id,status,success?'Accepted':'Delivery failed',dead,next]);
    return {...saved.rows[0],merchant_id:merchantId};
  }
}
export const databaseWebhookService=new DatabaseWebhookService();
