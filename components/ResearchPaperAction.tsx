'use client';
import {useState} from 'react';
import {axionFetch} from '../lib/in-process';
import {axionAppPath} from '../lib/in-process';
import Link from 'next/link';
export default function ResearchPaperAction({signalId,days}:{signalId?:string;days:number}) {
  const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
  async function propose(){
    setBusy(true);setMessage('');
    try{const response=await axionFetch('/api/research-paper',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({signalId,days})});
      const data=await response.json();setMessage(response.ok?'Conditional paper plan saved. It is pending, not a confirmed fill.':data.error||'Sign in to save a paper plan.');
    }catch{setMessage('Could not save paper plan.');}finally{setBusy(false);}
  }
  return <div className="text-xs"><button disabled={!signalId||busy} onClick={propose} className="font-semibold text-cyan-600 disabled:opacity-50">{busy?'Saving…':'Create conditional paper plan'}</button><p className="mt-1 text-slate-500">Research simulation only; no broker order. A worker must be running to evaluate future sessions.</p>{message&&<p role="status" className="mt-2">{message}</p>}<Link href={axionAppPath('/research-paper')} className="mt-2 block text-cyan-600">View radar paper portfolio →</Link></div>;
}
