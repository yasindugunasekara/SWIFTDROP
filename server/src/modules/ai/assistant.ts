import {ToolLoopAgent,isStepCount,tool,type LanguageModel} from 'ai';
import {createGoogle} from '@ai-sdk/google';
import {z} from 'zod';
import {getPublicTracking} from '../tracking/tracking.service.js';
import {loadServiceConfig,quoteDelivery} from '../operations/pricing.js';

export function createDeliveryAssistant(model:LanguageModel,tracking=getPublicTracking,quote=quoteDelivery,config=loadServiceConfig){
 return new ToolLoopAgent({model,stopWhen:isStepCount(4),
  instructions:'You are SwiftDrop delivery support. Use the tools for every parcel status or price claim. Only public tracking fields may be disclosed. Never invent fees, statuses or confirmations. Quote currency is LKR; distance defaults to 10 km and is an estimate. If a destination zone is unavailable, explain that and ask the user for a configured zone; do not claim a destination-specific fee. You cannot create bookings or change delivery state.',
  tools:{
   trackParcel:tool({description:'Get current public parcel status and timeline.',inputSchema:z.object({trackingNumber:z.string().regex(/^SWIFT-[A-Z0-9]{6,12}$/)}),execute:async({trackingNumber})=>tracking(trackingNumber)}),
   quoteDelivery:tool({description:'Estimate a delivery fee from configured rates and optional destination zone.',inputSchema:z.object({weightKg:z.number().positive().max(100),destination:z.string().max(100).optional(),distanceKm:z.number().min(0).max(2000).optional()}),execute:async({weightKg,destination,distanceKm})=>{
    const settings=await config();const zone=destination?settings.zones.find((z:any)=>z.isActive&&z.zoneName.toLowerCase().includes(destination.toLowerCase())):undefined;
    if(destination&&!zone)return {error:'Destination zone unavailable',availableZones:settings.zones.filter((z:any)=>z.isActive).map((z:any)=>z.zoneName)};
    return quote({weightKg,zoneId:zone?.id,distanceKm});
   }})
  }
 });
}
export async function answerDeliveryQuestion(question:string){
 const key=process.env.GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY,model=process.env.AI_MODEL_NAME;
 if(!key||!model)throw new Error('Assistant provider is not configured');
 const google=createGoogle({apiKey:key});
 const result=await createDeliveryAssistant(google(model)).generate({prompt:question,abortSignal:AbortSignal.timeout(30000)});
 if(!result.text)throw new Error('Assistant did not return an answer');return result.text;
}
