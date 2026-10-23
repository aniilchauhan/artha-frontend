'use client';

import { useState } from 'react';
import type { ShareOpportunity } from '../lib/opportunity-types';
import { axionFetch } from '../lib/in-process';
import { useSession } from 'next-auth/react';
import ForwardPredictionHistory from './ForwardPredictionHistory';

export default function ForwardPicks() {
  const { status } = useSession();
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [horizon, setHorizon] = useState('today');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: ShareOpportunity[]; message?: string; checkedAt?: string; generatedAt?: string; scanned?: number; history?: { message: string; status: string } } | null>(null);
  const [error, setError] = useState('');
  const time = (s: string) => new Date(s).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  async function scan() {
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await axionFetch(`/api/forward-picks?horizon=${horizon}`, { method: status === 'authenticated' ? 'POST' : 'GET', cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      setResult(payload);
      setHistoryRefresh(value => value + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Scan failed.'); }
    finally { setBusy(false); }
  }
  return <><section className="space-y-4 rounded-2xl border border-emerald-300 bg-white p-5 dark:bg-gray-900 dark:border-emerald-800">
    <h2 className="text-xl font-bold">Forward +2% opportunities</h2>
    <p className="text-sm text-gray-500">Check potential from now, or request the next trading session’s model report after market close.</p>
    <div className="flex flex-wrap gap-3">
      <select aria-label="Prediction horizon" disabled={busy} value={horizon} onChange={e => { setHorizon(e.target.value); setResult(null); setError(''); }} className="rounded-lg border p-2 dark:bg-gray-950">
        <option value="today">After now · until today’s close</option>
        <option value="next">Next trading session · after today’s close</option>
      </select>
      <button disabled={busy} onClick={scan} className="rounded-lg bg-emerald-600 px-4 py-2 text-white disabled:opacity-50">{busy ? 'Checking fresh data…' : 'Check forward opportunities'}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {result && <div className="space-y-3" aria-live="polite">
      <p className="text-sm">{result.message}</p>
      {result.history && <p role="status" className="text-sm text-indigo-600 dark:text-indigo-300">{result.history.message}</p>}
      <p className="text-xs text-gray-500">Checked {result.checkedAt && time(result.checkedAt)} IST{result.generatedAt && ` · Model generated ${time(result.generatedAt)} IST`}{result.scanned !== undefined && ` · ${result.scanned} catalog shares checked`}</p>
      {!result.data.length && <p className="text-sm font-medium">No qualifying forward candidates available.</p>}
      {result.data.map(item => <article key={item.ticker} className="rounded-xl border p-4">
        <strong>{item.name}</strong><p className="text-sm">Reference ₹{item.reference.toFixed(2)} · +2% scenario ₹{item.target.toFixed(2)}</p>
        <p className="text-xs text-gray-500">{item.asOf.includes('T') ? `Quote ${time(item.asOf)} IST` : `Input session ${item.asOf}`} · {item.estimate === null ? `${item.evidenceCount}/4 momentum conditions · probability unavailable` : `Model estimate ${item.estimate.toFixed(1)}%`}</p>
        <p className="mt-2 text-sm">{item.summary}</p>
      </article>)}
    </div>}
  </section><ForwardPredictionHistory refreshToken={historyRefresh} /></>;
}
