'use client';

import { useEffect, useState } from 'react';
import { axionFetch } from '../lib/in-process';

type Horizon = 'week' | 'month' | 'year' | 'multibagger';
type Entry = { id: string; ticker: string; horizon: Horizon; recordedAt: string; referencePrice: number; ruleVersion: string; outcome: {
  status: string; reason: string; returnPercent?: number; benchmarkReturnPercent?: number; relativeReturnPercent?: number; entryPrice?: number; dataAsOf?: string;
} };
type Day = { date: string; horizon: Horizon; ruleVersion: string; saved: number; right: number; wrong: number; pending: number; unscorable: number; scored: number; rightRate: number | null };
type History = { from: string; to: string; page: number; pageSize: number; total: number; entries: Entry[]; days: Day[] };
const label: Record<Horizon, string> = { week: 'One week', month: 'One month', year: 'One year', multibagger: 'Multibagger · 3 years' };

export default function HorizonPredictionHistory({ signedIn, refreshToken }: { signedIn: boolean; refreshToken: number }) {
  const [data, setData] = useState<History | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function load(reconcile = false) {
    if (!signedIn) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const query = new URLSearchParams({ page: String(page) });
      if (from) query.set('from', from);
      if (to) query.set('to', to);
      const response = await axionFetch(`/api/research/horizons/history?${query}`, { method: reconcile ? 'POST' : 'GET', cache: 'no-store' });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'History unavailable.');
      setData(body.data);
      setLoaded(true);
      if (reconcile) setNotice(`Checked ${body.data.checked} pending predictions. Pending outcomes remain visible and will be retried later.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'History unavailable.'); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (refreshToken > 0) {
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);

  return <section aria-label="Long-horizon prediction history" className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold">Horizon prediction history</h3><p className="mt-1 text-xs text-slate-500">Only assessments issued as candidates enter this scorecard. Saved snapshots are immutable; failed and pending outcomes stay visible.</p></div>
      {signedIn && <button disabled={busy} onClick={() => void load(true)} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Checking…' : 'Check outcomes'}</button>}</div>
    {!signedIn ? <p className="text-sm">Sign in to save predictions and view their later outcomes.</p> : <>
      <div className="flex flex-wrap items-end gap-3"><label className="text-xs">From<input aria-label="Horizon history from date" type="date" max={to || undefined} value={from} onChange={event => { setPage(1); setFrom(event.target.value); }} className="mt-1 block rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-950" /></label>
        <label className="text-xs">To<input aria-label="Horizon history to date" type="date" min={from || undefined} value={to} onChange={event => { setPage(1); setTo(event.target.value); }} className="mt-1 block rounded-lg border p-2 dark:border-slate-700 dark:bg-slate-950" /></label>
        <button disabled={busy} onClick={() => void load()} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-50">{loaded ? 'Refresh history' : 'Load prediction history'}</button></div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}{notice && <p role="status" className="text-xs">{notice}</p>}
      {data && <><p className="text-xs text-slate-500">{data.from} to {data.to} · {data.total ?? 0} candidate predictions. Daily totals cover the full date range, independent of record pagination.</p>
        {(!data.days || !data.days.length) ? <p className="text-sm">No candidate predictions saved in this date range.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Prediction date (IST)', 'Horizon / rule', 'Issued', 'Right', 'Wrong', 'Pending', 'Unscorable', 'Observed success rate'].map(name => <th key={name} className="p-2">{name}</th>)}</tr></thead><tbody>{data.days.map(day => <tr key={`${day.date}:${day.horizon}:${day.ruleVersion}`} className="border-t dark:border-slate-800"><td className="p-2">{day.date}</td><td className="p-2">{label[day.horizon]}<br /><span className="text-slate-500">{day.ruleVersion}</span></td><td className="p-2">{day.saved}</td><td className="p-2 text-emerald-600">{day.right}</td><td className="p-2 text-rose-600">{day.wrong}</td><td className="p-2">{day.pending}</td><td className="p-2">{day.unscorable}</td><td className="p-2">{day.rightRate === null ? 'Awaiting results' : `${(day.rightRate * 100).toFixed(1)}% (${day.scored} scored)`}</td></tr>)}</tbody></table></div>}
        {Array.isArray(data.entries) && data.entries.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold">Individual saved predictions · page {data.page ?? 1} of {Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize || 1)))}</summary><div className="mt-2 space-y-2">{data.entries.map(item => <article key={item.id} className="rounded-lg border p-3 dark:border-slate-800"><strong>{item.ticker}</strong> · {label[item.horizon]} · {new Date(item.recordedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br />Reference ₹{item.referencePrice.toFixed(2)} · {item.outcome.status.replace(/_/g, ' ')} · {item.outcome.reason.replace(/_/g, ' ')}{item.outcome.entryPrice !== undefined ? ` · assumed entry ₹${item.outcome.entryPrice.toFixed(2)}` : ''}{item.outcome.returnPercent !== undefined ? ` · stock ${item.outcome.returnPercent.toFixed(2)}%` : ''}{item.outcome.benchmarkReturnPercent !== undefined ? ` · Nifty ${item.outcome.benchmarkReturnPercent.toFixed(2)}%` : ''}{item.outcome.relativeReturnPercent !== undefined ? ` · relative ${item.outcome.relativeReturnPercent.toFixed(2)}%` : ''}{item.outcome.dataAsOf ? ` · data through ${item.outcome.dataAsOf.slice(0, 10)}` : ''}</article>)}</div></details>}
        {typeof data.total === 'number' && typeof data.pageSize === 'number' && data.total > data.pageSize && <div className="flex items-center justify-between gap-3"><button disabled={busy || page <= 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Previous records</button><span className="text-xs text-slate-500">Page {data.page} of {Math.ceil(data.total / data.pageSize)}</span><button disabled={busy || page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-2 text-xs disabled:opacity-40">Next records</button></div>}
      </>}
      <p className="text-[11px] text-slate-500">Observed success rate = right / (right + wrong); pending and unscorable records are excluded. One-week outcomes require the entry trigger to occur within its validity window, then score the fifth-session close against the entry estimate. Other horizons use their declared end-price rule; Nifty and relative return are shown separately. Corporate actions without verified adjustment are unscorable.</p>
    </>}
  </section>;
}
