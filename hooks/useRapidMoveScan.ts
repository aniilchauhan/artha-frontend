'use client';
import {useEffect,useState} from 'react';
import {axionFetch} from '../lib/in-process';
import type {RapidMoveBatch,RapidMoveCandidate} from '../lib/rapid-move-types';
export function useRapidMoveScan(){
 const [candidates,setCandidates]=useState<RapidMoveCandidate[]>([]),[progress,setProgress]=useState({scanned:0,total:0,unavailable:0});
 const [error,setError]=useState<string|null>(null),[asOf,setAsOf]=useState<string|null>(null),[running,setRunning]=useState(false);
 const [enabled,setEnabled]=useState(true),[version,setVersion]=useState(0);
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();let busy=false;
  async function read(){if(busy||document.hidden)return;busy=true;setRunning(true);
   try{const response=await axionFetch('/api/rapid-moves',{signal:controller.signal,cache:'no-store'});const result=await response.json() as RapidMoveBatch&{error?:string;snapshot:{status:string}};
    if(!response.ok)throw new Error(result.error||'Saved radar unavailable');if(controller.signal.aborted)return;
    const fresh = result.candidates.filter(c => Date.now() - Date.parse(c.asOf) <= 96 * 3600000);
    setCandidates(fresh.length > 0 ? fresh : result.candidates);
    setAsOf(result.fetchedAt);
    setProgress({scanned:result.scanned,total:result.total,unavailable:result.unavailable});
    setError(result.snapshot.status==='ready'?null:`Backend snapshot: ${result.snapshot.status}. Coverage ${result.evaluatedTickers.length}/${result.total}.`);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'Saved radar unavailable');}
   finally{busy=false;if(!controller.signal.aborted)setRunning(false);}
  }void read();const timer=setInterval(()=>void read(),60000);const wake=()=>void read();document.addEventListener('visibilitychange',wake);
  return()=>{controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',wake);};
 },[enabled,version]);
 return {candidates,progress,error,asOf,running,enabled,setEnabled,refresh:()=>{setEnabled(true);setVersion(v=>v+1);}};
}
