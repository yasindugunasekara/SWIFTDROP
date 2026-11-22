'use client';
import {useState} from 'react';
import Link from 'next/link';
import {fetchApi} from '../../lib/api';
export default function DeliveryAssistant(){
 const [question,setQuestion]=useState(''),[messages,setMessages]=useState<{role:string;text:string}[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function ask(){if(!question.trim())return;const value=question;setQuestion('');setMessages(previous=>[...previous,{role:'You',text:value}]);setBusy(true);setError('');
 try{const result=await fetchApi<{answer:string}>('/ai/chat',{method:'POST',body:JSON.stringify({question:value})});setMessages(previous=>[...previous,{role:'SwiftDrop',text:result.answer}]);}
 catch(e){setError(e instanceof Error?e.message:'Assistant is unavailable.');}finally{setBusy(false);}}
 return <div className="mx-auto max-w-3xl px-6 py-10"><Link href="/booking" className="text-orange-700">Back to deliveries</Link><h1 className="my-5 text-3xl font-black">Delivery assistant</h1><p>Ask about a tracking number or an estimated delivery fee. Sign in to use the assistant.</p><div aria-live="polite" className="my-6 space-y-4">{messages.map((message,index)=><article key={index} className="rounded-xl border p-4"><p className="font-bold">{message.role}</p><p className="mt-2 whitespace-pre-wrap">{message.text}</p></article>)}</div>{error&&<p role="alert" className="my-4 text-red-700">{error}</p>}<form onSubmit={e=>{e.preventDefault();void ask();}} className="flex gap-3"><input aria-label="Delivery question" required maxLength={1000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Where is my parcel SWIFT-...?" className="min-w-0 flex-1 rounded-xl border p-3"/><button disabled={busy} className="rounded-xl bg-orange-600 px-5 py-3 font-bold text-white">{busy?'Checking...':'Ask'}</button></form></div>;
}
