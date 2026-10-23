'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { axionFetch, axionApiPath } from '../lib/in-process';
import type { WholeMarketForecast as Forecast, IndexForecast } from '../lib/whole-market-forecast';
import { quoteStatusLabel } from '../lib/market-quote';
import Link from './WorkspaceLink';
import BackendSnapshotNotice from './BackendSnapshotNotice';

const number = (value: number) => value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
const percent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
const biasLabel = { UPWARD: 'Upward trend', DOWNWARD: 'Downward trend', MIXED: 'Mixed / sideways', UNAVAILABLE: 'Unavailable' };
const stressLabel = { ELEVATED: 'Elevated stress', WATCH: 'Watch conditions', NO_FLAGS: 'No measured flags', UNAVAILABLE: 'Assessment unavailable' };
function time(value: string) {
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) + ' IST';
}

function IndexCard({ index, sessions, expanded }: { index: IndexForecast; sessions: number; expanded: boolean }) {
  const scenario = index.scenarios.find(item => item.sessions === sessions);
  const colour = index.bias === 'UPWARD' ? 'text-emerald-600 dark:text-emerald-400' : index.bias === 'DOWNWARD' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400';
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    <div className="flex items-center justify-between gap-2"><h3 className="font-bold text-slate-900 dark:text-white">{index.name}</h3><span className={`text-xs font-semibold ${colour}`}>{biasLabel[index.bias]}</span></div>
    {!index.available ? <p className="mt-4 text-sm text-slate-500">{index.unavailableReason}</p> : <>
      <p className="mt-3 text-2xl font-bold text-slate-900 dark:text-white">{number(index.level!)}</p>
      <p className="mt-1 text-[11px] text-slate-500">{quoteStatusLabel(index.quoteStatus)} · {index.quoteAsOf ? time(index.quoteAsOf) : 'Timestamp unavailable'}</p>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Historical {sessions}-session scenario band</p>
        {scenario?.lowerPct !== null && scenario?.lowerPct !== undefined && scenario.upperPct !== null ? <>
          <div className="mt-2 flex items-center justify-between gap-2 text-lg font-bold"><span className="text-rose-600 dark:text-rose-400">{percent(scenario.lowerPct)}</span><span className="text-xs font-normal text-slate-500">to</span><span className="text-emerald-600 dark:text-emerald-400">{percent(scenario.upperPct)}</span></div>
          <p className="mt-1 text-xs text-slate-500">{number(scenario.lowerLevel!)}–{number(scenario.upperLevel!)} index points</p>
          <p className="mt-2 text-[11px] text-slate-500">10th–90th percentiles · {scenario.samples} overlapping windows · Historical median {percent(scenario.medianPct!)}</p>
        </> : <p className="mt-2 text-xs text-slate-500">Insufficient completed windows (minimum 30). No range estimated.</p>}
      </div>
      <div className="mt-3 flex items-start gap-2"><ShieldAlert size={16} className={index.stress === 'ELEVATED' ? 'shrink-0 text-rose-500' : 'shrink-0 text-amber-500'} /><div><p className="text-xs font-bold text-slate-700 dark:text-slate-200">{stressLabel[index.stress]}</p><p className="mt-1 text-xs text-slate-500">{index.stressFlags.length ? index.stressFlags.join(' ') : 'Current rules have not triggered. This does not exclude a future crash.'}</p></div></div>
      <details open={expanded} className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-700">
        <summary className="cursor-pointer text-xs font-semibold text-indigo-600 dark:text-indigo-400">Concrete reasons & historical crash observations</summary>
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{index.evidence.map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p className="mt-3 text-xs text-slate-500">Completed closes through {index.historyThrough} ({index.historyCount} observations).</p>
        {scenario && <p className="mt-2 text-xs text-slate-500">{scenario.historicalCrashWindows} of {scenario.samples} historical {sessions}-session windows experienced a closing-level fall of at least 10% from their starting close. This is a historical count, not a forecast probability.</p>}
        <p className="mt-2 text-xs text-slate-500">Upward rule: level &gt; SMA20 &gt; SMA50 and positive five-session momentum. Downward rule reverses all three conditions; otherwise mixed.</p>
      </details>
    </>}
  </article>;
}

export default function WholeMarketForecast({ expanded = false }: { expanded?: boolean }) {
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [sessions, setSessions] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await axionFetch(axionApiPath('/api/whole-market'), { cache: 'no-store', signal });
      if (!response.ok) throw new Error('Market observations are currently unavailable.');
      const payload = await response.json();
      if (!payload.success || !Array.isArray(payload.data?.indices)) throw new Error('Market response could not be verified.');
      if (!signal?.aborted) { setForecast(payload.data); setCheckedAt(Date.now()); setError(null); }
    } catch (failure) {
      if (!signal?.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load market forecast.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    const timer = setInterval(() => { if (!document.hidden) void refresh(controller.signal); }, 60000);
    const visible = () => { if (!document.hidden) void refresh(controller.signal); };
    document.addEventListener('visibilitychange', visible);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); };
  }, [refresh]);

  return <section aria-label="Whole market forecast" className="rounded-3xl border border-indigo-200 bg-indigo-50/40 p-5 dark:border-indigo-900 dark:bg-indigo-950/20 sm:p-6">
    <BackendSnapshotNotice job="whole-market"/>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400"><Activity size={15} /> Whole-market outlook · Research</p><h2 className="mt-2 text-xl font-bold text-slate-900 dark:text-white">Direction, move ranges & crash watch</h2><p className="mt-1 max-w-2xl text-xs text-slate-500">Trend bias describes current conditions. Historical scenarios show possible move magnitudes; they are not calibrated predictions.</p></div>
      <button type="button" disabled={loading} onClick={() => void refresh()} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} />{loading ? 'Checking…' : 'Reload saved outlook'}</button>
    </div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label="Market forecast horizon" className="flex gap-2">{[1, 5, 20].map(days => <button key={days} type="button" aria-pressed={sessions === days} onClick={() => setSessions(days)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${sessions === days ? 'bg-indigo-600 text-white' : 'border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}>{days === 1 ? '1 session' : `${days} sessions`}</button>)}</div>
      {forecast && <p className="text-[11px] text-slate-500">Calculated {time(forecast.generatedAt)} · {forecast.vix ? `India VIX ${forecast.vix.value.toFixed(2)}` : 'India VIX unavailable'}</p>}
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error} {forecast ? 'The previous assessment is hidden until a refresh succeeds.' : 'No forecast has been created.'}</p>}
    {!forecast && loading && <p role="status" className="mt-4 text-sm text-slate-500">Loading saved backend forecast…</p>}
    {forecast && !error && <>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">{forecast.indices.map(index => <IndexCard key={index.symbol} index={index} sessions={sessions} expanded={expanded} />)}</div>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20"><h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Could a crash happen—and when?</h3><p className="mt-1 text-xs leading-relaxed text-amber-900/80 dark:text-amber-200/80">A crash remains possible even without warning flags. A dependable crash probability or date is unavailable. Review the next 1–20 trading sessions for deteriorating trend, sharp losses, widening drawdown, and elevated VIX. This is a monitoring window, not a predicted crash date.</p></div>
      <details open={expanded} className="mt-4 text-xs text-slate-500"><summary className="cursor-pointer font-semibold">Coverage, methodology & limitations</summary><p className="mt-3">{forecast.scope}</p><ul className="mt-3 list-disc space-y-2 pl-4">{forecast.limitations.map(item => <li key={item}>{item}</li>)}</ul><p className="mt-3">Provider: Yahoo Finance chart observations. Volatility reference: <a href="https://www.nseindia.com/static/products-services/indices-indiavix-index" target="_blank" rel="noreferrer" className="text-indigo-600 underline dark:text-indigo-400">NSE India VIX methodology</a>.</p><p className="mt-2">Last successful check: {checkedAt ? time(new Date(checkedAt).toISOString()) : 'Unavailable'}. Updates every minute while visible. No exchange-certified real-time feed.</p></details>
    </>}
    {!expanded && <Link href="/market-forecast" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">Open full market forecast <ArrowRight size={14} /></Link>}
  </section>;
}
