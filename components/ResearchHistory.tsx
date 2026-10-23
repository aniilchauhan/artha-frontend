'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useRef, useState } from 'react';
import { RESEARCH_ROLES } from '../lib/research-types';
import type { ResearchHistoryItem, SavedResearchReport } from '../lib/research-types';

const dateLabel = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

export default function ResearchHistory({ ticker, disabled, onOpen, onBusyChange }: {
  ticker: string;
  disabled: boolean;
  onOpen: (saved: SavedResearchReport) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [items, setItems] = useState<ResearchHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);

  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);

  async function fetchHistory(id?: string, append = false) {
    if (active.current || disabled) return;
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20_000);
    setBusy(true);
    onBusyChange(true);
    setError(null);
    try {
      const url = id ? `/api/research/history/${encodeURIComponent(id)}`
        : `/api/research/history?ticker=${encodeURIComponent(ticker)}${append && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (response.status === 401) throw new Error('Sign in again to view your saved research.');
      const body = await response.json();
      if (!response.ok || !body.success || !body.data) throw new Error(body.error || 'Saved research is unavailable.');
      if (active.current !== controller || controller.signal.aborted) return;
      if (id) {
        if (body.data.report?.ticker !== ticker.toUpperCase().replace(/\.NS$/, '')) throw new Error('This saved report belongs to a different stock.');
        onOpen(body.data);
      } else {
        const newItems = Array.isArray(body.data.items) ? body.data.items : [];
        setItems(current => append ? [...current, ...newItems.filter((item: ResearchHistoryItem) => !current.some(old => old.id === item.id))] : newItems);
        setCursor(body.data.nextCursor);
        setLoaded(true);
      }
    } catch (failure) {
      if (active.current === controller) setError(controller.signal.aborted ? 'History took too long to load. Please retry.'
        : failure instanceof Error ? failure.message : 'Saved research is unavailable.');
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
        onBusyChange(false);
      }
    }
  }

  return <section aria-label="Saved research history" className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="font-semibold">Your saved reports</h3><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Private to your account. Reopen the original report without running AI again.</p></div>
      <button onClick={() => fetchHistory()} disabled={busy || disabled} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-600">{loaded ? 'Refresh history' : 'Load saved reports'}</button>
    </div>
    {busy && <p role="status" className="mt-3 text-sm text-slate-500">Loading saved research…</p>}
    {error && <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-400">{error}</p>}
    {loaded && (!items || items.length === 0) && <p className="mt-3 text-sm text-slate-500">No saved reports for {ticker} yet. New research is saved automatically when the database is available.</p>}
    <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">
      {(items || []).map(item => <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.summary}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.status === 'partial' ? 'Partial report' : 'Complete report'} · Generated {dateLabel(item.generatedAt)} IST</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Saved {dateLabel(item.savedAt)} IST · {item.roles.map(id => RESEARCH_ROLES.find(role => role.id === id)?.name ?? id).join(', ')}</p>
        </div>
        <button onClick={() => fetchHistory(item.id)} disabled={busy || disabled} aria-label={`Open report generated ${dateLabel(item.generatedAt)} IST`}
          className="rounded-lg bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 disabled:opacity-50 dark:bg-indigo-950 dark:text-indigo-300">Open report</button>
      </li>)}
    </ul>
    {cursor && <button onClick={() => fetchHistory(undefined, true)} disabled={busy || disabled} className="mt-3 text-sm font-semibold text-indigo-600 disabled:opacity-50 dark:text-indigo-400">Load older reports</button>}
  </section>;
}
