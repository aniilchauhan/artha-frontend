'use client';

import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FRAMEWORK_REPORTS_ENABLED } from '../lib/framework-feature';
import type { FrameworkScreen } from '../lib/framework-screen';

export default function FrameworkScreenPanel({ initialTickers, onSelect }: { initialTickers: string[]; onSelect: (ticker: string) => void }) {
  const { data: session, status } = useSession();
  const owner = status === 'authenticated' ? (session?.user as { id?: string } | undefined)?.id ?? session?.user?.email ?? '' : '';
  if (!FRAMEWORK_REPORTS_ENABLED) return null;
  return <Screen key={`${status}|${owner}`} initialTickers={initialTickers} onSelect={onSelect} signedIn={!!owner} />;
}
function Screen({ initialTickers, onSelect, signedIn }: { initialTickers: string[]; onSelect: (ticker: string) => void; signedIn: boolean }) {
  const [tickers, setTickers] = useState(initialTickers.slice(0, 10).join(', '));
  const [result, setResult] = useState<FrameworkScreen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  async function run() {
    if (active.current) return;
    if (!signedIn) { setError('Sign in to screen stocks.'); return; }
    const symbols = tickers.split(/[\s,]+/).filter(Boolean);
    if (!symbols.length || symbols.length > 10) { setError('Enter between 1 and 10 unique NSE tickers.'); return; }
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 85000);
    setBusy(true); setError(null); setResult(null);
    try {
      const response = await fetch('/api/research/frameworks/screen', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: symbols }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Screen unavailable.');
      if (active.current === controller && !controller.signal.aborted) setResult(body.data);
    } catch (failure) {
      if (active.current === controller) setError(controller.signal.aborted ? 'Screening timed out; try fewer tickers.' : failure instanceof Error ? failure.message : 'Screening failed.');
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  return <section aria-label="Framework stock screener" className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100">
    <h2 className="text-lg font-semibold">Screen your research list</h2>
    <p className="mt-2 text-sm text-slate-400">Compare up to 10 NSE stocks against the same versioned momentum and 44 SMA rules. Missing data stays visible.</p>
    <label className="mt-4 block text-sm">NSE tickers, separated by commas
      <input value={tickers} disabled={busy} onChange={e => { setTickers(e.target.value); setResult(null); }} placeholder="RELIANCE, TCS, INFY"
        className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 p-3" />
    </label>
    <button onClick={run} disabled={busy} className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{busy ? 'Screening…' : 'Run stock screen'}</button>
    {error && <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p>}
    {result && <>
      <p className="mt-4 text-xs text-slate-400">Generated {new Date(result.generatedAt).toLocaleString('en-IN')}. User-selected universe; no market-wide performance claim.</p>
      <ul className="mt-3 divide-y divide-slate-700">{result.rows.map(row => <li key={row.ticker} className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm">
        <div><p className="font-semibold">{row.ticker} · {row.cutoff ?? 'No usable cutoff'}</p>
          {row.strategies.map(strategy => <p key={strategy.id} className="mt-1 text-xs text-slate-400">{strategy.name}: {strategy.status.replace('_', ' ')}</p>)}
          {row.error && <p className="mt-1 text-xs text-amber-300">{row.error}</p>}
        </div><button className="rounded-lg border border-slate-600 px-3 py-2" onClick={() => onSelect(row.ticker)}>Select {row.ticker}</button>
      </li>)}</ul>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-slate-400">{result.limitations.map(line => <li key={line}>{line}</li>)}</ul>
    </>}
  </section>;
}
