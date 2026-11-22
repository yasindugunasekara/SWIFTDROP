'use client';
import { useEffect, useState } from 'react';
import { getAccessToken } from '../../lib/auth';
export default function PrivateImage({src,alt,className}:{src:string;alt:string;className?:string}) {
  const [url,setUrl]=useState('');
  useEffect(()=>{
    const controller=new AbortController();let objectUrl='';setUrl('');
    void (async()=>{
      if(!src.startsWith('/uploads/')) return;
      const token=await getAccessToken();if(!token)return;
      const response=await fetch(`/api/v1/proof-file?path=${encodeURIComponent(src)}`,{headers:{Authorization:`Bearer ${token}`},signal:controller.signal});
      if(!response.ok) return;
      const blob=await response.blob();if(controller.signal.aborted)return;
      objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);
    })().catch(()=>{});
    return()=>{controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};
  },[src]);
  return url?<img src={url} alt={alt} className={className}/>:<span role="status">Proof image unavailable</span>;
}
