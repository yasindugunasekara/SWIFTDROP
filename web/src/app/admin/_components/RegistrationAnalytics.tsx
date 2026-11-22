'use client';
import {useEffect,useState} from 'react';
import {fetchApi} from '../../../lib/api';
export default function RegistrationAnalytics(){
 const [counts,setCounts]=useState<Record<string,number>|null>(null);const [failed,setFailed]=useState(false);const [retry,setRetry]=useState(0);
 useEffect(()=>{const c=new AbortController();fetchApi('/admin/users?page=1',{signal:c.signal}).then(d=>{if(!c.signal.aborted){setCounts(d.summary);setFailed(false);}}).catch(()=>{if(!c.signal.aborted)setFailed(true)});return()=>c.abort()},[retry]);
 return <div className="max-w-6xl mx-auto p-5 sm:p-10"><p className="text-orange-600 text-xs font-bold tracking-widest">COMMUNITY INSIGHTS</p><h1 className="text-3xl font-bold my-3">Registration analytics</h1><p className="text-slate-500 mb-8">Current registered accounts by workspace role.</p>{failed?<div role="status">Counts are unavailable. <button onClick={()=>setRetry(v=>v+1)}>Try again</button></div>:<div className="grid sm:grid-cols-2 gap-5">{[['customers','Customers'],['couriers','Couriers'],['businesses','Merchants'],['dispatchers','Dispatchers']].map(([key,label])=><section className="border bg-white p-7" key={key}><h2 className="text-slate-500">{label}</h2><p className="text-5xl font-bold my-5">{counts?.[key]??'—'}</p><div className="h-2 bg-orange-50"><div className="h-2 bg-orange-500" style={{width:`${counts?.accounts?counts[key]/counts.accounts*100:0}%`}}/></div><p className="mt-3 text-sm text-slate-500">{counts?.accounts?Math.round(counts[key]/counts.accounts*100):0}% of all accounts</p></section>)}</div>}</div>
}
