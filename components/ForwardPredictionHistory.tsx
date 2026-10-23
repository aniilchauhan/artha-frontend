'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { axionFetch } from '../lib/in-process';
import type { ForwardHistoryEntry, ForwardHistoryDaySummary } from '../lib/forward-history-types';

interface HistoryData { from: string; to: string; page: number; pageSize: number; total: number; entries: ForwardHistoryEntry[]; days: ForwardHistoryDaySummary[] }

export default function ForwardPredictionHistory({ refreshToken = 0 }: { refreshToken?: number }) {
  const { status } = useSession();
  const [data, setData] = useState<HistoryData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [request, setRequest] = useState({ sequence: 0, method: 'GET', page: 1 });
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  useEffect(() => {
    if (status !== 'authenticated') { setData(null); return; }
    const controller = new AbortController();
    async function load() {
      setBusy(true); setError(''); setNotice('');
      try {
        const query = new URLSearchParams({ page: String(request.page) });
        if (from) query.set('from', from);
        if (to) query.set('to', to);
        const response = await axionFetch(`/api/forward-picks/history?${query}`, { method: request.method, signal: controller.signal, cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'History unavailable.');
        if (!controller.signal.aborted) {
          setData(payload.data);
          if (payload.reconciliation) setNotice(`Checked ${payload.reconciliation.checked} observations. Check again if more pending records remain.`);
        }
      } catch (e) { if (!controller.signal.aborted) { setData(null); setError(e instanceof Error ? e.message : 'History unavailable.'); } }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }
    void load();
    return () => controller.abort();
  }, [status, refreshToken, request, from, to]);
  const update = (method: string, page = 1) => setRequest(value => ({ sequence: value.sequence + 1, method, page }));
  return <section aria-label="Forward prediction history" className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
    <h2 className="text-xl font-bold">Daily prediction history</h2>
    <p className="mt-2 text-sm text-gray-500">Saved forward observations, grouped by prediction date in IST and scoring rule. Right means the defined target event occurred; it does not mean a profitable executed trade.</p>
    {status !== 'authenticated' ? <p className="mt-4 text-sm">Sign in before scanning to save your predictions and view history. Earlier unsaved scans cannot be scored retrospectively.</p> : <>
      <div className="my-4 flex flex-wrap items-end gap-3">
        <label className="text-xs">From<input aria-label="History from date" type="date" value={from} onChange={e => { setFrom(e.target.value); update('GET'); }} className="mt-1 block rounded-lg border p-2 dark:bg-gray-950" /></label>
        <label className="text-xs">To<input aria-label="History to date" type="date" value={to} onChange={e => { setTo(e.target.value); update('GET'); }} className="mt-1 block rounded-lg border p-2 dark:bg-gray-950" /></label>
        <button disabled={busy} onClick={() => update('GET')} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">Refresh history</button>
        <button disabled={busy} onClick={() => update('POST')} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Checking…' : 'Check outcomes'}</button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {notice && <p role="status" className="mb-3 text-sm">{notice}</p>}
      {data && <>
        <p className="text-xs text-gray-500">{data.from} to {data.to} · {data.total} saved observations. Daily totals include every matching record. Repeated stocks in different five-minute slots are separate observations.</p>
        {!data.days.length ? <p className="mt-4 text-sm">No saved predictions in this date range.</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Prediction date', 'Horizon / version', 'Saved', 'Right', 'Wrong', 'Pending', 'Unscorable', 'Target success'].map(label => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{data.days.map(day => <tr key={`${day.date}:${day.horizon}:${day.modelVersion}:${day.policyVersion}`} className="border-t dark:border-gray-800">
          <td className="p-2 whitespace-nowrap">{day.date}</td><td className="p-2"><strong>{day.horizon === 'today' ? 'After now' : 'Next session'}</strong><br /><span title={day.modelVersion}>{day.modelVersion.slice(0, 40)}</span><br /><span className="text-gray-500">{day.policyVersion}</span></td>
          <td className="p-2">{day.saved}</td><td className="p-2 text-emerald-600">{day.right}</td><td className="p-2 text-rose-600">{day.wrong}</td><td className="p-2">{day.pending}</td><td className="p-2">{day.unscorable}</td><td className="p-2">{day.rightRate === null ? 'Awaiting results' : `${(day.rightRate * 100).toFixed(1)}% (${day.scored} scored)`}</td>
        </tr>)}</tbody></table></div>}
        {data.entries.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Individual predictions · page {data.page}</summary><div className="mt-3 space-y-2">{data.entries.map(item => <article key={item.id} className="rounded-lg border p-3 text-xs dark:border-gray-800"><strong>{item.ticker}</strong> · Saved {new Date(item.recordedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST<br />Reference ₹{item.reference.toFixed(2)} · {item.horizon === 'today' ? `Target ₹${item.target.toFixed(2)}` : 'Target +2% / stop −2% from next open'}<br />{item.outcome?.status || 'pending'} · {item.outcome?.reason?.replace(/_/g, ' ')}{item.outcome?.closeReturnPercent !== undefined && ` · Close change ${item.outcome.closeReturnPercent.toFixed(2)}%`}</article>)}</div></details>}
        {data.total > data.pageSize && <div className="mt-3 flex gap-3"><button disabled={busy || data.page === 1} onClick={() => update('GET', data.page - 1)}>Previous records</button><button disabled={busy || data.page * data.pageSize >= data.total} onClick={() => update('GET', data.page + 1)}>Next records</button></div>}
        <p className="mt-4 text-xs text-gray-500">Pending and unscorable records are excluded from the rate. Intraday scoring uses future five-minute bars after saving; missing data and uncertain first-bar timing stay unscorable. Results are separated by version and horizon; week, month, year and multibagger predictions are not currently issued by this scanner.</p>
      </>}
    </>}
  </section>;
}
