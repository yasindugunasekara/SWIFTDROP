import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function client(fetch){const source=ts.transpileModule(readFileSync(new URL('../src/services/booking-api.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;const exports={};vm.runInNewContext(source,{exports,require:()=>({mobileApiFetch:fetch})});return exports;}
test('mobile quote forwards parcel dimensions and uses the server currency and price',async()=>{let request;const api=client(async(path,options)=>{request={path,body:JSON.parse(options.body)};return{quote:{totalFee:650,currency:'LKR'}};});const result=await api.getBookingQuote({weightKg:2,lengthCm:30,widthCm:20,heightCm:10});assert.equal(result.totalFee,650);assert.equal(result.currency,'LKR');assert.equal(request.path,'/booking/quote');assert.equal(request.body.lengthCm,30);});
test('mobile booking never manufactures confirmation or a quote after server failure',async()=>{const api=client(async()=>{throw Error('Server unavailable');});await assert.rejects(api.createParcelBooking({}),/Server unavailable/);await assert.rejects(api.getBookingQuote({weightKg:2}),/Server unavailable/);});
test('mobile booking requires an explicit successful server result',async()=>{const api=client(async()=>({success:false}));await assert.rejects(api.createParcelBooking({}),/could not be confirmed/);});
test('mobile returns the real tracking number',async()=>{const api=client(async()=>({success:true,parcel:{trackingNumber:'SWIFT-AB12CD34'}}));assert.equal((await api.createParcelBooking({})).parcel.trackingNumber,'SWIFT-AB12CD34');});
