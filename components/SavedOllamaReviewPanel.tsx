'use client';

import { useEffect, useState } from 'react';
import { axionFetch } from '../lib/in-process';
import type { SavedOllamaReview } from '../lib/ollama-evidence-review';

interface SavedResult { review: SavedOllamaReview | null; state: string; runtime: string; stale: boolean }
export default function SavedOllamaReviewPanel({ ticker, sessions }: { ticker: string; sessions?: number }) {
  const [result, setResult] = useState<SavedResult | null>(null);
  const [message, setMessage] = useState('Loading saved backend review…');
  const symbol = ticker.trim().toUpperCase().replace(/\.NS$/, '');
  useEffect(() => {
    setResult(null); setMessage('Loading saved backend review…');
    if (!symbol) { setMessage('Choose a stock to see its saved review.'); return; }
    const controller = new AbortController();
    void axionFetch(`/api/stock-ai/saved-ollama-review?ticker=${encodeURIComponent(symbol)}`, { signal: controller.signal })
      .then(async response => {
        if (response.status === 401) throw new Error('Sign in to see saved Ollama reviews.');
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error('Saved review unavailable.');
        if (!controller.signal.aborted) {
          setResult(payload.data);
          setMessage(payload.data.state === 'outside_pilot' ? 'This stock is outside the current 20-stock review pilot.' :
            payload.data.state === 'failed' ? 'The latest backend review failed. Previous saved research is retained when available.' :
            payload.data.state === 'started' ? 'Backend review pending completion. Interrupted attempts resume eligibility next day.' :
            'No saved review yet. The backend reviews the pilot stocks after market close.');
        }
      }).catch(error => { if (!controller.signal.aborted) setMessage(error instanceof Error ? error.message : 'Saved review unavailable.'); });
    return () => controller.abort();
  }, [symbol]);
  const saved = result?.review;
  return <section aria-label="Saved Ollama evidence review" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
    <h3 className="font-semibold">Saved Ollama evidence review</h3>
    {!saved ? <p className="mt-2">{message}</p> : <>
      <p className="mt-2">{saved.assessment.summary}</p>
      <p className="mt-2 text-slate-500 dark:text-slate-400">{saved.assessment.verdict.replaceAll('_', ' ')} · {saved.assessment.model} · {new Date(saved.assessment.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
      {(result.stale || result.state !== 'ready' || result.runtime === 'unavailable') && <p className="mt-2 text-amber-700 dark:text-amber-300">{result.stale ? 'Saved review is stale. ' : ''}{result.state !== 'ready' ? message : ''}{result.runtime === 'unavailable' ? ' Local runtime was unavailable at the last worker check.' : ''}</p>}
      <p className="mt-2">Price evidence cutoff: {saved.assessment.context.historyAsOf}. Directional verdict covers the next session only.</p>
      <ul className="mt-2 space-y-2">{saved.assessment.evidence.map((item, index) => {
        const source = saved.assessment.context.sources?.find(s => s.id === item.metric);
        return <li key={index}>{item.interpretation} <span className="text-slate-500">({source?.label ?? item.metric}: {source?.value ?? saved.assessment.context.metrics[item.metric]} {source?.unit})</span>{source && <span className="block text-slate-500">Observed: {source.asOf ?? 'unknown'} · Retrieved: {source.retrievedAt}</span>}{source && /^https:\/\//.test(source.url) && <a className="ml-2 underline" href={source.url} target="_blank" rel="noopener noreferrer">Source</a>}</li>;
      })}</ul>
      <p className="mt-3 font-semibold">Counterarguments</p>
      <ul className="mt-1 space-y-1">{saved.assessment.risks.map(risk => <li key={risk}>{risk}</li>)}</ul>
      <p className="mt-2">Invalidation: {saved.assessment.invalidation}</p>
      <p className="mt-3 font-semibold">Company holding considerations</p>
      {saved.holdingConsiderations.filter(h => !sessions || h.sessions === sessions).map(h => <div key={h.sessions} className="mt-2">
        <p>{h.sessions} trading session{h.sessions > 1 ? 's' : ''} · {h.status.replaceAll('_', ' ')}: {h.reason}</p>
        {h.evidenceIds.map(id => {
          const source = saved.assessment.context.sources?.find(s => s.id === id);
          return source ? <p key={id} className="mt-1 text-slate-500 dark:text-slate-400">{source.label}: {source.value} {source.unit} · Observation: {source.asOf ?? 'period unknown'}{ /^https:\/\//.test(source.url) && <a className="ml-2 underline" href={source.url} target="_blank" rel="noopener noreferrer">Source</a>}</p> : null;
        })}
      </div>)}
      <details className="mt-3"><summary className="cursor-pointer">Missing evidence and limitations</summary><ul className="mt-2 space-y-1">{saved.assessment.context.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul></details>
      <p className="mt-3 text-slate-500 dark:text-slate-400">Unvalidated research. These observations are not return probabilities or a trade instruction.</p>
    </>}
  </section>;
}
