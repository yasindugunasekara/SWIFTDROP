import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MockLanguageModelV4} from 'ai/test';
import {createDeliveryAssistant,answerDeliveryQuestion} from './assistant.js';
const usage={inputTokens:{total:1,noCache:1,cacheRead:0,cacheWrite:0},outputTokens:{total:1,text:1,reasoning:0}};
test('assistant executes the tracking backend tool before returning a model answer',async()=>{
 const calls:string[]=[];
 const model=new MockLanguageModelV4({doGenerate:[
  {content:[{type:'tool-call',toolCallId:'call-1',toolName:'trackParcel',input:'{"trackingNumber":"SWIFT-AB12CD34"}'}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]},
  {content:[{type:'text',text:'The parcel is in transit.'}],finishReason:{unified:'stop',raw:undefined},usage,warnings:[]}
 ]});
 const agent=createDeliveryAssistant(model,(async(id:string)=>{calls.push(id);return{trackingNumber:id,status:'IN_TRANSIT',statusLabel:'In transit',isFinal:false,bookedAt:null,lastUpdatedAt:null,events:[]};}) as any);
 const result=await agent.generate({prompt:'Where is my parcel SWIFT-AB12CD34?'});
 assert.equal(result.text,'The parcel is in transit.');assert.deepEqual(calls,['SWIFT-AB12CD34']);assert.equal(model.doGenerateCalls.length,2);
 assert.ok(JSON.stringify(model.doGenerateCalls[1].prompt).includes('IN_TRANSIT'));
});
test('assistant executes configured pricing and does not manufacture a destination zone',async()=>{
 let quoted=false;
 const model=new MockLanguageModelV4({doGenerate:[
  {content:[{type:'tool-call',toolCallId:'call-1',toolName:'quoteDelivery',input:'{"weightKg":2,"destination":"Kandy"}'}],finishReason:{unified:'tool-calls',raw:undefined},usage,warnings:[]},
  {content:[{type:'text',text:'The Kandy zone is unavailable.'}],finishReason:{unified:'stop',raw:undefined},usage,warnings:[]}
 ]});
 await createDeliveryAssistant(model,undefined,(async()=>{quoted=true;return{};}) as any,(async()=>({zones:[{zoneName:'Colombo',isActive:true}]})) as any).generate({prompt:'How much for 2 kg to Kandy?'});
 assert.equal(quoted,false);assert.ok(JSON.stringify(model.doGenerateCalls[1].prompt).includes('Destination zone unavailable'));
});
