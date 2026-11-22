'use client';
import { useCallback, useEffect, useState } from 'react';
import { fetchApi } from '../../../lib/api';
import PrivateImage from '../../../components/ui/PrivateImage';
type Job={id:string;trackingNumber:string;recipientName:string;deliveryAddress:string;status:string;latestProof?:{photoUrl:string}};
const next:Record<string,string>={ASSIGNED:'PICKED_UP',PICKED_UP:'IN_TRANSIT',IN_TRANSIT:'OUT_FOR_DELIVERY',OUT_FOR_DELIVERY:'DELIVERED',FAILED:'OUT_FOR_DELIVERY'};
export default function CourierTasks(){
  const [jobs,setJobs]=useState<Job[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [busy,setBusy]=useState(''),[notes,setNotes]=useState<Record<string,string>>({});
  const load=useCallback(async()=>{setLoading(true);try{const data=await fetchApi<{assignedJobs:Job[]}>('/courier/jobs');setJobs(data.assignedJobs);setError('');}catch(e){setError(e instanceof Error?e.message:'Unable to load jobs');}finally{setLoading(false);}},[]);
  useEffect(()=>{void load();},[load]);
  async function action(job:Job,kind:'status'|'fail',value:string){
    setBusy(job.id);setNotice('');setError('');
    try {await fetchApi(`/courier/jobs/${job.id}/${kind}`,{method:kind==='status'?'PATCH':'POST',body:JSON.stringify(kind==='status'?{status:value,note:notes[job.id]}:{failureReason:value})});setNotice('Delivery record saved.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Unable to save delivery');}finally{setBusy('');}
  }
  async function upload(job:Job,file?:File){
    if(!file)return;setBusy(job.id);setError('');setNotice('');
    try {const body=new FormData();body.append('photo',file);await fetchApi(`/courier/jobs/${job.id}/proof`,{method:'POST',body});setNotice('Proof photo uploaded.');await load();}
    catch(e){setError(e instanceof Error?e.message:'Upload failed');}finally{setBusy('');}
  }
  return <div className="mx-auto max-w-5xl px-6 py-10"><div className="flex flex-wrap justify-between gap-4"><div><p className="font-bold text-orange-600">COURIER WORKSPACE</p><h1 className="text-3xl font-black">Today�s deliveries</h1></div><button onClick={()=>void load()} disabled={loading} className="rounded-xl border px-5 py-2">Refresh</button></div>
    {error&&<p role="alert" className="my-4 text-red-700">{error}</p>}{notice&&<p role="status" className="my-4 text-green-700">{notice}</p>}
    {loading?<p role="status" className="py-10">Loading assigned deliveries�</p>:!jobs.length?<p className="py-10">No deliveries assigned for today.</p>:<div className="mt-8 grid gap-5 md:grid-cols-2">{jobs.map(job=><article key={job.id} className="rounded-2xl border border-slate-200 p-6"><p className="font-bold">{job.trackingNumber}</p><p className="my-2 text-sm text-orange-700">{job.status.replaceAll('_',' ')}</p><h2 className="font-bold">{job.recipientName}</h2><p>{job.deliveryAddress}</p>
    {job.latestProof&&<PrivateImage src={job.latestProof.photoUrl} alt="Delivery proof" className="my-3 h-32 w-full rounded-xl object-cover"/>}
    {next[job.status]&&<><label className="mt-4 block">Delivery note<textarea aria-label={`Delivery note for ${job.trackingNumber}`} maxLength={2000} value={notes[job.id]||''} onChange={e=>setNotes({...notes,[job.id]:e.target.value})} className="mt-1 w-full rounded-lg border p-2"/></label>
    <label className="my-3 block text-sm font-bold">Upload doorstep photo<input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={!!busy} onChange={e=>void upload(job,e.target.files?.[0])} className="mt-2 block w-full"/></label>
    <div className="flex flex-wrap gap-2"><button disabled={!!busy||(next[job.status]==='DELIVERED'&&!job.latestProof)} onClick={()=>void action(job,'status',next[job.status])} className="rounded-lg bg-orange-600 px-4 py-2 text-white disabled:opacity-40">{busy===job.id?'Saving�':next[job.status].replaceAll('_',' ')}</button>
    {['PICKED_UP','IN_TRANSIT','OUT_FOR_DELIVERY'].includes(job.status)&&<button disabled={!!busy||!notes[job.id]?.trim()} onClick={()=>void action(job,'fail',notes[job.id])} className="rounded-lg border px-4 py-2">Mark failed (reason in note)</button>}</div></>}
    </article>)}</div>}
  </div>;
}
