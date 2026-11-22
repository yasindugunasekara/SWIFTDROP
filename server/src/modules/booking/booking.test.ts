import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {once} from 'node:events';
import type {AddressInfo} from 'node:net';
import {createBookingRouter,createBookingSchema,quoteRequestSchema} from './booking.routes.js';
const valid={pickupAddress:'Test pickup',dropoffAddress:'Test delivery',weightKg:2,senderName:'Sender',senderPhone:'0700000000',recipientName:'Recipient',recipientPhone:'0710000000'};
test('booking validates contact fields, bounds and positive parcel dimensions',()=>{
 assert.ok(createBookingSchema.safeParse(valid).success);
 for(const patch of [{weightKg:0},{weightKg:101},{recipientName:''},{senderPhone:''},{lengthCm:-1},{heightCm:501}])assert.equal(createBookingSchema.safeParse({...valid,...patch}).success,false);
 assert.equal(quoteRequestSchema.safeParse({...valid,zoneId:'invalid'}).success,false);
});
test('booking routes reject anonymous/non-customer access and pass the server identity to persistence',async()=>{
 const calls:string[]=[];
 const persistence={quote:async()=>({totalFee:650}),create:async(id:string)=>{calls.push(id);return{id:'test',trackingNumber:'SWIFT-TEST',totalFee:650};},list:async(id:string)=>{calls.push(id);return[];}};
 const app=express();app.use(express.json());
 app.use('/anonymous',createBookingRouter(undefined,persistence as any));
 app.use('/customer',createBookingRouter((req:any,_res,next)=>{req.user={id:'real-customer',role:'CUSTOMER'};next();},persistence as any));
 app.use('/courier',createBookingRouter((req:any,_res,next)=>{req.user={id:'courier',role:'COURIER'};next();},persistence as any));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try{
  assert.equal((await fetch(base+'/anonymous/list')).status,401);
  assert.equal((await fetch(base+'/courier/list')).status,403);
  const result=await fetch(base+'/customer/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...valid,customerId:'forged',clientFeeEstimate:.01})});
  assert.equal(result.status,201);assert.deepEqual(calls,['real-customer']);assert.equal((await result.json()).clientPriceIgnored,true);
  assert.equal((await fetch(base+'/customer/list')).status,200);assert.deepEqual(calls,['real-customer','real-customer']);
 }finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
test('failed booking storage returns an error instead of success or a synthetic tracking number',async()=>{
 const unavailable={quote:async()=>{throw Error('internal address/secret');},create:async()=>{throw Error('internal address/secret');},list:async()=>{throw Error('internal address/secret');}};
 const app=express();app.use(express.json());app.use(createBookingRouter((req:any,_res,next)=>{req.user={id:'test',role:'CUSTOMER'};next();},unavailable as any));
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try{for(const path of ['create','quote']){const response=await fetch(base+'/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(valid)});assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/internal address|secret/);}}finally{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
