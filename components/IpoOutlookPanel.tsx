'use client';


import { axionFetch as fetch, axionAppPath } from '../lib/in-process';
import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowUpRight, BarChart3, Compass, Loader2, Target } from 'lucide-react';
import { parseIpoOutlookRequest, type IpoOutlook } from '../lib/ipo-outlook';

const price = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const percent = (value: number | null) => value === null ? 'Unavailable' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
const labels = { bullish_setup: 'Bullish setup', mixed: 'Mixed evidence', weakening: 'Weakening setup', insufficient_data: 'Insufficient data' };

export default function IpoOutlookPanel() {
  const { data: session, status } = useSession();
  const owner = status === 'authenticated' ? session?.user?.email ?? '' : '';
  return <OutlookForm key={`${status}:${owner}`} signedIn={!!owner} />;
}

function OutlookForm({ signedIn }: { signedIn: boolean }) {
  const [ticker, setTicker] = useState('');
  const [listingDate, setListingDate] = useState('');
  const [horizon, setHorizon] = useState('5');
  const [target, setTarget] = useState('');
  const [issue, setIssue] = useState('');
  const [entry, setEntry] = useState('');
  const [result, setResult] = useState<IpoOutlook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const deadline = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; if (deadline.current) clearTimeout(deadline.current); }, []);
  const change = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(event.target.value); setResult(null); setError(null);
  };
  async function run(event: React.FormEvent) {
    event.preventDefault();
    if (active.current) return;
    setError(null); setResult(null);
    if (!signedIn) { setError('Sign in to analyse an IPO.'); return; }
    let input;
    try {
      input = parseIpoOutlookRequest({ ticker, listingDate, horizon: Number(horizon),
        ...(target ? { targetPrice: Number(target) } : {}), ...(issue ? { issuePrice: Number(issue) } : {}),
        ...(entry ? { entryPrice: Number(entry) } : {}) });
    } catch (failure) { setError((failure as Error).message); return; }
    const controller = new AbortController(); active.current = controller;
    const timer = setTimeout(() => controller.abort(), 25000);
    deadline.current = timer;
    setBusy(true);
    try {
      const response = await fetch('/api/ipo/outlook', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input), signal: controller.signal });
      const body = await response.json();
      if (!response.ok || !body.success || !body.data) throw new Error(body.error || 'IPO outlook is unavailable.');
      if (active.current === controller && !controller.signal.aborted) setResult(body.data);
    } catch (failure) {
      if (active.current === controller) setError(controller.signal.aborted ? 'Analysis timed out. Please try again.' : (failure as Error).message);
    } finally {
      clearTimeout(timer);
      if (deadline.current === timer) deadline.current = null;
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }
  const field = 'mt-1.5 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-3 text-sm focus:border-indigo-500 disabled:opacity-60';
  return <section aria-label="IPO outlook" className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 text-gray-900 dark:text-gray-100 sm:p-6">
    <div className="flex items-center gap-2"><Target className="h-5 w-5 text-indigo-500" /><h3 className="text-lg font-bold">IPO Outlook</h3></div>
    <p className="mt-2 max-w-3xl text-sm text-gray-500 dark:text-gray-400">Assess a recently listed NSE stock using completed sessions, volume and Nifty performance. Enter a target to see the move it requires and the evidence to watch.</p>
    <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Experimental scenarios · Target-hit probability unavailable · No validated accuracy record</p>
    <div className="mt-6 grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
    <form onSubmit={run} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40 sm:p-5">
      <h4 className="mb-4 text-sm font-semibold">Set up your research</h4>
      <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <label className="text-xs font-semibold">NSE symbol<input required maxLength={33} value={ticker} onChange={change(setTicker)} placeholder="e.g. KANOHAR" className={field} /></label>
        <label className="text-xs font-semibold">Actual listing date<input required type="date" value={listingDate} onChange={change(setListingDate)} className={field} /></label>
        <label className="text-xs font-semibold">Review window<select value={horizon} onChange={change(setHorizon)} className={field}><option value="5">Next 5 trading sessions</option><option value="10">Next 10 trading sessions</option><option value="20">Next 20 trading sessions</option></select></label>
        <label className="text-xs font-semibold">Target price (optional)<input type="number" min="0.01" max="10000000" step="any" value={target} onChange={change(setTarget)} placeholder="e.g. 1000" className={field} /></label>
        <details className="sm:col-span-2 xl:col-span-1"><summary className="cursor-pointer py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Add purchase details <span className="font-normal text-slate-500">(optional)</span></summary><div className="mt-3 grid gap-4">
          <label className="text-xs font-semibold">Issue price (optional)<input type="number" min="0.01" max="10000000" step="any" value={issue} onChange={change(setIssue)} placeholder="IPO allotment price" className={field} /></label>
          <label className="text-xs font-semibold">Your entry price (optional)<input type="number" min="0.01" max="10000000" step="any" value={entry} onChange={change(setEntry)} placeholder="Your purchase price" className={field} /></label>
        </div></details>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}{busy ? 'Analysing completed sessions…' : 'Analyse IPO'}</button>
        <span className="text-xs text-gray-500">At least 5 completed sessions · Listed within 365 days · Run on demand</span>
      </div>
      {!signedIn && <p className="mt-3 text-xs text-slate-500"><a href={axionAppPath("/auth")} className="font-semibold text-indigo-600 underline dark:text-indigo-400">Sign in</a> to run your analysis.</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    </form>
    {!result && <div role={busy ? 'status' : undefined} className="flex min-h-80 flex-col justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/40 px-5 py-10 text-center dark:border-slate-700 dark:bg-slate-950/20 sm:px-8">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">{busy ? <Loader2 size={24} className="animate-spin" /> : <Compass size={24} />}</div>
      <h4 className="text-lg font-semibold">{busy ? 'Checking the trading evidence' : 'Your research starts here'}</h4>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{busy ? 'Loading completed sessions and comparing the stock with Nifty. This may take a few seconds.' : 'Enter a symbol and listing date. Add a target to understand the move it needs and the conditions to watch.'}</p>
      {!busy && <div className="mx-auto mt-7 grid w-full max-w-md grid-cols-3 gap-3 border-t border-slate-200 pt-5 dark:border-slate-800">{[[BarChart3, 'Price & volume'], [Target, 'Target context'], [Compass, 'Three scenarios']].map(([Icon, label]) => { const Glyph = Icon as typeof Target; return <div key={String(label)} className="text-xs text-slate-500 dark:text-slate-400"><Glyph size={18} className="mx-auto mb-2 text-indigo-500" />{String(label)}</div>; })}</div>}
    </div>}
    {result && <div aria-live="polite" className="min-w-0 space-y-5">
      <div>
        <p className="text-xs text-gray-500">{result.input.ticker} · Completed-session cutoff: {result.asOf ?? 'Unavailable'}</p>
        <h4 className={`mt-2 text-2xl font-semibold tracking-tight ${result.status === 'bullish_setup' ? 'text-emerald-700 dark:text-emerald-400' : result.status === 'weakening' ? 'text-rose-700 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}`}>{labels[result.status]}</h4>
        <p className="mt-2 text-sm">{result.summary}</p>
        <p className="mt-2 text-xs text-gray-500">Evidence coverage: {result.evidenceCoverage} ({result.sessions} sessions). Coverage is not prediction confidence.</p>
      </div>
      {result.metrics && <>
        <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
          ['Latest completed close', price(result.metrics.close)], ['From issue price (entered)', percent(result.metrics.issueReturnPct)],
          ['From listing open', percent(result.metrics.listingOpenReturnPct)], ['From your entry (entered)', percent(result.metrics.entryReturnPct)],
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 dark:bg-gray-950 p-3"><dt className="text-xs text-gray-500">{label}</dt><dd className="mt-1 text-lg font-semibold">{value}</dd></div>)}</dl>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          <p>Same-date comparison ({result.metrics.comparisonStart} to {result.asOf}): stock {percent(result.metrics.stockReturnPct)} · Nifty {percent(result.metrics.benchmarkReturnPct)}.</p>
          <p className="mt-1">Relative performance: {result.metrics.relativeReturnPoints === null ? 'Unavailable' : `${result.metrics.relativeReturnPoints > 0 ? '+' : ''}${result.metrics.relativeReturnPoints.toFixed(2)} percentage points`} · Volume: {result.metrics.volumeRatio === null ? 'Unavailable' : `${result.metrics.volumeRatio.toFixed(2)}× prior average`}.</p>
        </div>
      </>}
      {result.target && <div className="rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
        <h5 className="font-bold">Your {price(result.target.price)} target</h5>
        <p className="mt-1 text-sm">{result.target.position === 'at_or_below_close' ? 'The latest completed close is already at or above this target.' : `Requires ${percent(result.target.requiredRisePct)} from the latest completed close.`}</p>
        <p className="mt-1 text-sm">{result.target.position === 'above_observed_high' ? 'Above every observed post-listing high; further price discovery would be needed.' : result.target.position === 'within_observed_range' ? 'Inside the observed price range; a previous visit does not guarantee a return.' : 'This does not establish whether a sell order could have filled at your target.'}</p>
        {result.target.rewardToReferenceRisk !== null && <p className="mt-2 text-xs">Upside to target / downside to the recent prior-session low: {result.target.rewardToReferenceRisk.toFixed(2)}×. Reference arithmetic only; the low is not a guaranteed exit.</p>}
        <p className="mt-2 text-xs font-semibold">Probability of reaching this target within {result.input.horizon} sessions: unavailable.</p>
      </div>}
      <div><h5 className="text-sm font-bold">Evidence behind this assessment</h5><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300">{result.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul></div>
      {result.scenarios.length > 0 && <div className="grid gap-3 lg:grid-cols-3">{result.scenarios.map(scenario => <div key={scenario.name} className="rounded-xl border border-gray-200 dark:border-gray-800 p-4"><h5 className="text-sm font-bold">{scenario.name} scenario</h5><p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{scenario.condition}</p></div>)}</div>}
      <details className="text-xs text-gray-500"><summary className="cursor-pointer font-semibold">Sources and limitations</summary>
        <ul className="mt-3 space-y-2">{result.sources.map(source => <li key={source.url}><a className="text-indigo-600 underline dark:text-indigo-400" href={source.url} target="_blank" rel="noreferrer">{source.name}</a> · through {source.asOf} · retrieved {new Date(source.retrievedAt).toLocaleString('en-IN')}</li>)}</ul>
        <ul className="mt-3 list-disc space-y-2 pl-5">{result.limitations.map(line => <li key={line}>{line}</li>)}</ul>
      </details>
    </div>}
    </div>
  </section>;
}
