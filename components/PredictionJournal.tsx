'use client';


import { axionFetch as fetch } from '../lib/in-process';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, RefreshCw } from 'lucide-react';
import type { JournalEntry, JournalEventStats, JournalSummary } from '../lib/prediction-journal-types';

interface JournalData { entries: JournalEntry[]; summary: JournalSummary; totalRecords: number; limit: number }
const rate = (value: number | null) => value === null ? 'No completed samples' : `${(value * 100).toFixed(1)}%`;
const stats = (value: JournalEventStats) => `${rate(value.eventRate)} · ${value.eventCount}/${value.count} events`;
const date = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
const humanize = (value: string) => value.replace(/_/g, ' ');

export default function PredictionJournal({ refreshToken = 0 }: { refreshToken?: number }) {
  const [data, setData] = useState<JournalData | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState({ sequence: 0, method: 'GET' });
  const [visible, setVisible] = useState(20);
  const lastRefresh = useRef(refreshToken);
  useEffect(() => {
    const controller = new AbortController();
    const method = lastRefresh.current !== refreshToken ? 'GET' : request.method;
    lastRefresh.current = refreshToken;
    setLoading(true); setError(''); setNotice('');
    async function load() {
      try {
        const response = await fetch('/api/stock-ai/journal', { method, signal: controller.signal });
        const body = await response.json();
        if (controller.signal.aborted) return;
        if (response.status === 401) throw new Error('Sign in to view the shared prediction journal.');
        if (!response.ok || !body.success || !Array.isArray(body.data?.entries) || !Array.isArray(body.data?.summary?.cohorts)) throw new Error(body.error || 'The prediction journal is unavailable. Try again.');
        setData(body.data);
        if (body.reconciliation) setNotice(`Checked ${body.reconciliation.checked} saved assessments: ${body.reconciliation.completed} completed, ${body.reconciliation.pending} pending, ${body.reconciliation.excluded} excluded.`);
      } catch (err) {
        if (!controller.signal.aborted) { setData(null); setError(err instanceof Error ? err.message : 'Could not load the journal.'); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [refreshToken, request]);
  return (
    <section aria-label="Prediction outcome journal" className="rounded-3xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><BookOpen className="h-5 w-5 text-indigo-500" />Prediction outcome journal</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500 dark:text-gray-400">Track whether the next session’s high reaches 2% above the saved close. This is a price event, not trading profit or a calibrated win probability.</p></div>
        <div className="flex gap-2">
          <button disabled={loading} onClick={() => setRequest(value => ({ sequence: value.sequence + 1, method: 'GET' }))} className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-600 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Refresh journal</button>
          <button disabled={loading} onClick={() => setRequest(value => ({ sequence: value.sequence + 1, method: 'POST' }))} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Check outcomes</button>
        </div>
      </div>
      {loading && <p role="status" className="mt-4 text-sm text-indigo-600 dark:text-indigo-300">Loading prediction journal…</p>}
      {error && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">{error}</p>}
      {notice && <p role="status" className="mt-4 text-xs text-indigo-600 dark:text-indigo-300">{notice}</p>}
      {data && <>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/50">
            <p className="text-xs capitalize text-gray-500 dark:text-gray-400">Saved assessments</p>
            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{data.summary.total}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Sample Size (N Completed)</p>
            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{data.summary.completed}</p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Pending Observations</p>
            <p className="mt-1 text-xl font-bold text-amber-600 dark:text-amber-400">
              {data.summary.pending}
              {data.summary.total > 0 && (
                <span className="text-xs font-normal text-gray-500 ml-1">
                  ({((data.summary.pending / data.summary.total) * 100).toFixed(0)}%)
                </span>
              )}
            </p>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400">Excluded (Out of Scope)</p>
            <p className="mt-1 text-xl font-bold text-gray-500 dark:text-gray-400">{data.summary.excluded}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Showing {data.entries.length} of {data.totalRecords} saved assessments; comparisons cover this latest {data.limit}-record window. Shared across signed-in users. Each stock/session/model keeps its first review.</p>
        {!data.summary.completed && <p className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300">No completed prospective outcomes yet. Save an AI review before the next session opens, then check after its close.</p>}
        {data.summary.cohorts.map(cohort => <details key={cohort.cohortId} className="mt-4 rounded-2xl border border-gray-200 p-4 dark:border-gray-800"><summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-white">{cohort.source} · {cohort.model} · {cohort.promptVersion} — N = {cohort.completed} completed ({cohort.pending} pending)</summary>
          <div className="mt-3 grid gap-3 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-2">
            <p>All reviewed stocks: <strong>{stats(cohort.reviewedUniverse)}</strong></p><p>AI-supported subset: <strong>{stats(cohort.aiSupported)}</strong><br />Coverage: {rate(cohort.aiSupported.coverage)}</p>
            <p>Matched quantitative scores ≥60%: <strong>{stats(cohort.matched.quantitative)}</strong></p><p>AI-supported subset of those scores: <strong>{stats(cohort.matched.aiSupported)}</strong><br />Coverage: {rate(cohort.matched.aiSupported.coverage)}</p>
          </div><p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Policy: {cohort.policyVersion}. Descriptive results from stocks users chose to review. Small samples, shared market moves and selection bias prevent a claim of proven improvement.</p>
        </details>)}
        {data.entries.length > 0 && <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-gray-500 dark:text-gray-400"><tr><th className="p-2">Stock / saved time (IST)</th><th className="p-2">AI review</th><th className="p-2">Outcome</th></tr></thead><tbody>{data.entries.slice(0, visible).map(entry => <tr key={entry.id} className="border-t border-gray-100 text-gray-600 dark:border-gray-800 dark:text-gray-300"><td className="p-2"><strong>{entry.ticker}</strong><br />{date(entry.recordedAt)}</td><td className="p-2">{humanize(entry.assessment.verdict)}<br /><span className="text-gray-400">{entry.assessment.model}</span></td><td className="p-2">{entry.outcome?.status === 'completed' ? <><strong>{entry.outcome.eventOccurred ? '+2% high reached' : '+2% high not reached'}</strong><br />{entry.outcome.targetDay} · Close change {entry.outcome.closeReturnPercent.toFixed(2)}%</> : <><strong>{entry.outcome?.status === 'excluded' ? 'Excluded' : 'Pending'}</strong><br />{humanize(entry.outcome?.reason || 'awaiting next session')}</>}</td></tr>)}</tbody></table></div>}
        {visible < data.entries.length && <button onClick={() => setVisible(value => value + 20)} className="mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-300">Show more saved assessments</button>}
      </>}
    </section>
  );
}
