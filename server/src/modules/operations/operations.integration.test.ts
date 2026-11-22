import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {createBookingPersistence} from '../booking/booking.persistence.js';
import {loadServiceConfig,saveServiceConfig} from './pricing.js';
import {DatabaseDispatchService} from '../dispatch/dispatch.database.js';
import {DatabaseCourierService} from '../courier/courier.database.js';
import {DatabaseWebhookService} from '../webhooks/webhook.database.js';
import {createNotificationService} from '../notifications/notification.service.js';
import {normalizeParcelEvent,parseParcelEvent} from '../notifications/notification.events.js';
import {flushEventOutbox} from '../../workers/event-outbox.js';
import {getPublicTracking} from '../tracking/tracking.service.js';
import {verifyWebhookSignature} from '../webhooks/webhook.service.js';

let database:PGlite;
const customer=randomUUID(),otherCustomer=randomUUID(),courier=randomUUID(),otherCourier=randomUUID(),admin=randomUUID(),merchant=randomUUID();
const query={async query(sql:string,values?:any[]){const result=await database.query(sql,values);return {rows:result.rows as any[],rowCount:result.affectedRows??null};}};
const booking=createBookingPersistence(query),dispatch=new DatabaseDispatchService(query),execution=new DatabaseCourierService(query);
const input={senderName:'Test Sender',senderPhone:'0700000000',recipientName:'Test Recipient',recipientPhone:'0710000000',pickupAddress:'Test pickup address',dropoffAddress:'Test delivery address',weightKg:2,lengthCm:20,widthCm:15,heightCm:10,category:'Parcels',specialInstructions:'Test only',paymentMethod:'cod',clientFeeEstimate:.01};
before(async()=>{
 database=new PGlite();
 await database.exec('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;');
 const base=(await readFile(new URL('../../database/migrations/001_initial_schema.sql',import.meta.url),'utf8')).replace('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";','').replaceAll('uuid_generate_v4()','gen_random_uuid()');
 await database.exec(base);
 await database.exec(await readFile(new URL('../../database/migrations/004_notifications_hardening.sql',import.meta.url),'utf8'));
 await database.exec(await readFile(new URL('../../database/migrations/20261122162110_operational_persistence_and_delivery_flows.sql',import.meta.url),'utf8'));
 for(const [id,role] of [[customer,'CUSTOMER'],[otherCustomer,'CUSTOMER'],[courier,'COURIER'],[otherCourier,'COURIER'],[admin,'ADMIN']])await query.query('INSERT INTO users(id,email,password_hash,full_name,role) VALUES($1,$2,$3,$4,$5)',[id,`${id}@example.invalid`,'not-a-login','Test Account',role]);
 await query.query('INSERT INTO merchants(id,user_id,company_name,approval_status) VALUES($1,$2,$3,$4)',[merchant,customer,'Test merchant','APPROVED']);
});
after(async()=>{await database.close();});

test('customer booking survives a new service instance and is isolated by customer',async()=>{
 const parcel=await booking.create(customer,input);
 assert.equal(parcel.totalFee,650);assert.notEqual(parcel.totalFee,input.clientFeeEstimate);
 const reopened=createBookingPersistence(query);
 assert.equal((await reopened.list(customer))[0].id,parcel.id);
 assert.deepEqual(await reopened.list(otherCustomer),[]);
 assert.equal((await query.query('SELECT status FROM parcel_status_history WHERE parcel_id=$1',[parcel.id])).rows[0].status,'CONFIRMED');
 const snapshot=await getPublicTracking(parcel.trackingNumber,query as any);
 assert.equal(snapshot.status,'CONFIRMED');assert.equal(snapshot.trackingNumber,parcel.trackingNumber);
 assert.ok((await dispatch.getUnassignedParcels()).some(p=>p.id===parcel.id));
});
test('pricing changes persist and affect the next quote and booking',async()=>{
 const previous=await loadServiceConfig(query);
 await saveServiceConfig({baseBookingFee:500,perKgRate:100},query);
 assert.equal((await createBookingPersistence(query).quote(input)).totalFee,900);
 assert.equal((await booking.create(customer,input)).totalFee,900);
 await saveServiceConfig(previous,query);
});
test('zone edits and disabled zones persist',async()=>{
 const previous=await loadServiceConfig(query),zone=previous.zones[0];
 await saveServiceConfig({zones:[{...zone,baseRate:1000,perKgRate:10,perKmRate:1}]},query);
 assert.equal((await booking.quote({...input,zoneId:zone.id})).totalFee,1030);
 await saveServiceConfig({zones:[{...zone,isActive:false}]},query);
 await assert.rejects(booking.quote({...input,zoneId:zone.id}),/No active/);
 await saveServiceConfig({zones:[zone]},query);
});
test('assignment and courier updates operate on real database parcels',async()=>{
 const parcel=await booking.create(customer,input);
 await dispatch.assignParcel(courier,parcel.id,admin);
 assert.ok((await execution.getAssignedJobs(courier)).some(p=>p.id===parcel.id));
 assert.equal(await execution.getJobDetails(otherCourier,parcel.id),null);
 await assert.rejects(execution.updateParcelStatus(otherCourier,parcel.id,'PICKED_UP'),/Forbidden/);
 for(const status of ['PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'] as const)await execution.updateParcelStatus(courier,parcel.id,status);
 await assert.rejects(execution.updateParcelStatus(courier,parcel.id,'DELIVERED'),/Proof photo/);
 await assert.rejects(execution.uploadDeliveryProof(otherCourier,parcel.id,{photoUrl:'/uploads/proof-test.jpg'}),/Forbidden/);
 await execution.uploadDeliveryProof(courier,parcel.id,{photoUrl:'/uploads/proof-test.jpg'});
 await execution.updateParcelStatus(courier,parcel.id,'DELIVERED');
 assert.equal((await getPublicTracking(parcel.trackingNumber,query as any)).status,'DELIVERED');
 await assert.rejects(execution.updateParcelStatus(courier,parcel.id,'IN_TRANSIT'),/terminal/);
});
test('daily courier list excludes old assignments',async()=>{
 const parcel=await booking.create(customer,input);await dispatch.assignParcel(courier,parcel.id,admin);
 await query.query("UPDATE courier_assignments SET assigned_at=now()-interval '2 days' WHERE parcel_id=$1",[parcel.id]);
 assert.ok(!(await execution.getAssignedJobs(courier)).some(p=>p.id===parcel.id));
});
test('capacity enforcement and duplicate assignment are atomic',async()=>{
 const first=await booking.create(customer,input),second=await booking.create(customer,input);
 await saveServiceConfig({maxCourierCapacity:1},query);
 await dispatch.assignParcel(otherCourier,first.id,admin);
 await assert.rejects(dispatch.assignParcel(otherCourier,second.id,admin),/capacity/);
 await assert.rejects(dispatch.assignParcel(courier,first.id,admin),/cannot be assigned|capacity/);
 assert.equal((await query.query('SELECT count(*)::int AS count FROM courier_assignments WHERE parcel_id=$1 AND is_active',[first.id])).rows[0].count,1);
 await saveServiceConfig({maxCourierCapacity:15},query);
});
test('failed delivery requires a reason and persists history',async()=>{
 const parcel=await booking.create(customer,input);await dispatch.assignParcel(courier,parcel.id,admin);
 await execution.updateParcelStatus(courier,parcel.id,'PICKED_UP');
 await assert.rejects(execution.recordDeliveryFailure(courier,parcel.id,''),/reason/);
 await execution.recordDeliveryFailure(courier,parcel.id,'RECIPIENT_UNAVAILABLE');
 assert.equal((await getPublicTracking(parcel.trackingNumber,query as any)).status,'FAILED');
});
test('mock SMS delivery is durable, preference-aware and idempotent',async()=>{
 const parcel=await booking.create(customer,input);
 const service=createNotificationService(query as any);
 const row=(await query.query('SELECT payload FROM parcel_event_outbox WHERE parcel_id=$1',[parcel.id])).rows[0];
 const parsed=parseParcelEvent(row.payload);assert.equal(parsed.success,true);if(!parsed.success)return;
 const event=normalizeParcelEvent(parsed.data);assert.ok(event);
 await service.processEvent(event);await service.processEvent(event);
 assert.equal((await query.query('SELECT count(*)::int AS count FROM mock_sms_messages WHERE user_id=$1',[customer])).rows[0].count,1);
 await service.updatePreferences(customer,{smsEnabled:false});
 const next=await booking.create(customer,input);const payload=(await query.query('SELECT payload FROM parcel_event_outbox WHERE parcel_id=$1',[next.id])).rows[0].payload;
 const nextEvent=normalizeParcelEvent(payload);assert.ok(nextEvent);await service.processEvent(nextEvent);
 assert.equal((await query.query('SELECT count(*)::int AS count FROM mock_sms_messages WHERE user_id=$1',[customer])).rows[0].count,1);
 await service.updatePreferences(customer,{smsEnabled:true});
});
test('merchant identity and parcel data are captured by the database trigger',async()=>{
 const parcel=await booking.create(customer,input);await query.query('UPDATE parcels SET merchant_id=$2 WHERE id=$1',[parcel.id,merchant]);
 await dispatch.assignParcel(courier,parcel.id,admin);
 const event=(await query.query("SELECT payload FROM parcel_event_outbox WHERE parcel_id=$1 AND payload->>'event'='COURIER_ASSIGNED'",[parcel.id])).rows[0].payload;
 assert.equal(event.merchantId,merchant);assert.equal(event.parcel.trackingNumber,parcel.trackingNumber);assert.ok(event.eventId);
});
test('outbox retains unconfirmed events and clears only after both broker confirms',async()=>{
 const ids:string[]=[];let attempts=0;
 assert.equal(await flushEventOutbox(query,async p=>{ids.push(p.eventId);return true;},async()=>{attempts++;return false;}),ids.length-(attempts?1:0));
 const pending=(await query.query('SELECT id FROM parcel_event_outbox WHERE published_at IS NULL')).rows;
 assert.ok(pending.length>0);
 await flushEventOutbox(query,async()=>true,async()=>true);
 assert.equal((await query.query('SELECT id FROM parcel_event_outbox WHERE published_at IS NULL')).rows.length,0);
});
test('webhook delivery retries survive a new service instance and deduplicate event IDs',async()=>{
 let status=503,calls=0;const sent:string[]=[];
 const send=(async(_url:any,options:any)=>{calls++;sent.push(options.body);assert.equal(verifyWebhookSignature(options.body,options.headers['X-SwiftDrop-Signature-Header'],secret).verified,true);return new Response(null,{status});}) as typeof fetch;
 let secret='';const service=new DatabaseWebhookService(query,send,async()=>{});
 const endpoint=(await service.registerEndpoint(merchant,'https://example.com/webhooks')).endpoint;secret=endpoint.signing_secret;
 const eventId=randomUUID();const first=await service.dispatchEvent(endpoint,'PARCEL_DELIVERED',{trackingNumber:'SWIFT-TEST'},undefined,eventId);
 assert.equal(first.attempt_count,1);assert.ok(first.next_retry_at);
 await service.dispatchEvent(endpoint,'PARCEL_DELIVERED',{},undefined,eventId);assert.equal(calls,1);
 await query.query("UPDATE webhook_delivery_attempts SET next_retry_at=now()-interval '1 minute' WHERE id=$1",[first.id]);status=204;
 const restarted=new DatabaseWebhookService(query,send,async()=>{}),pending=await restarted.getPendingRetries();assert.equal(pending[0].id,first.id);
 const second=await restarted.retryDelivery(first.id,merchant,true);assert.equal(second.response_code,204);assert.equal(second.next_retry_at,null);assert.equal(second.attempt_count,2);assert.equal(sent[0],sent[1]);
 await assert.rejects(restarted.retryDelivery(first.id,randomUUID()),/unavailable/);
});
test('user administration blocks self-deactivation and non-admin actors',async()=>{
 await assert.rejects(query.query('SELECT public.manage_delivery_user($1,$2,$3::jsonb)',[admin,admin,'{"isActive":false}']),/own account/);
 await assert.rejects(query.query('SELECT public.manage_delivery_user($1,$2,$3::jsonb)',[customer,courier,'{"isActive":false}']),/Administrator/);
 await query.query('SELECT public.manage_delivery_user($1,$2,$3::jsonb)',[otherCustomer,admin,'{"isActive":false,"fullName":"Updated Test User"}']);
 const profile=(await query.query('SELECT full_name,is_active FROM users WHERE id=$1',[otherCustomer])).rows[0];assert.equal(profile.is_active,false);assert.equal(profile.full_name,'Updated Test User');
});
test('migration is safe to apply again without dropping operational data',async()=>{
 await database.exec(await readFile(new URL('../../database/migrations/20261122162110_operational_persistence_and_delivery_flows.sql',import.meta.url),'utf8'));
 assert.ok((await booking.list(customer)).length>0);
});
test('Supabase public roles cannot bypass the API to read private operational data',async()=>{
 for(const table of ['parcels','parcel_status_history','courier_delivery_proofs','merchant_api_keys','merchant_webhook_endpoints','mock_sms_messages']){
  const row=(await query.query("SELECT has_table_privilege('anon',$1,'SELECT') AS anon,has_table_privilege('authenticated',$1,'SELECT') AS authenticated",[`public.${table}`])).rows[0];
  assert.equal(row.anon,false);assert.equal(row.authenticated,false);
 }
 assert.equal((await query.query("SELECT has_function_privilege('authenticated','public.assign_delivery_parcel(uuid,uuid,uuid,text)','EXECUTE') AS allowed")).rows[0].allowed,false);
 for(const signature of ['public.assign_delivery_parcel(uuid,uuid,uuid,text)','public.manage_delivery_user(uuid,uuid,jsonb)']){
  assert.equal((await query.query("SELECT has_function_privilege('service_role',$1,'EXECUTE') AS allowed",[signature])).rows[0].allowed,true);
 }
 for(const table of ['service_settings','parcel_event_outbox','mock_sms_messages']){
  assert.equal((await query.query("SELECT has_table_privilege('service_role',$1,'SELECT,INSERT,UPDATE,DELETE') AS allowed",[`public.${table}`])).rows[0].allowed,true);
 }
});
