'use client';
import Link from 'next/link';
import type {SessionResponse} from './merchant-api';
export default function MerchantAuth({notice}:{onSession:(session:SessionResponse)=>void;notice?:string}){
 return <div className="mx-auto max-w-lg p-10"><h1 className="text-2xl font-bold">Business portal</h1>{notice&&<p role="status" className="my-4">{notice}</p>}<p className="my-5">Use your verified SwiftDrop business account to continue.</p><Link href="/login" className="mr-5 text-orange-700 underline">Sign in</Link><Link href="/register" className="underline">Apply for a business account</Link></div>;
}
