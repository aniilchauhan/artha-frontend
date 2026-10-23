'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  Activity,
  RefreshCw,
  Clock,
} from 'lucide-react';
import type {
  CohortEvaluationReport,
  ProspectiveObservation,
  ReconciledObservation,
} from '../lib/paper-prediction-types';
import Link from './WorkspaceLink';

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);

export default function PaperPredictionsScreen() {
  const [cohorts, setCohorts] = useState<CohortEvaluationReport[]>([]);
  const [currentObservations, setCurrentObservations] = useState<ProspectiveObservation[]>([]);
  const [reconciledHistory, setReconciledHistory] = useState<ReconciledObservation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'today' | 'history'>('today');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/paper-predictions');
      if (!res.ok) throw new Error('Failed to load legacy archive records');
      const data = await res.json();
      if (data.success) {
        setCohorts(data.cohorts || []);
        setCurrentObservations(data.currentObservations || []);
        setReconciledHistory(data.reconciledHistory || []);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to paper prediction service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCohortTitle = (cohort: string) => {
    if (cohort.includes('COHORT_A')) return 'Cohort A · Legacy archive';
    if (cohort.includes('COHORT_B')) return 'Cohort B · Legacy archive';
    return 'Cohort C · Legacy archive';
  };

  return (
    <main className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
              <ShieldAlert size={13} />
              LEGACY COHORT ARCHIVE
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/20">
              READ ONLY · UNVERIFIED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent">
            Archived Cohort Records
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
            Historical sandbox output. Records may contain seeded prices, heuristic scores, or simulated candle replays; they do not establish model accuracy or executable performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/rapid-moves" className="inline-flex items-center rounded-2xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500">
            Open research radar
          </Link>
          <Link href="/research-paper" className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            Open radar paper portfolio
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <aside role="note" className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="text-xs leading-relaxed">
          <p className="font-bold">This page is a read-only legacy archive.</p>
          <p className="mt-1">Older rows can include seeded prices, rule-based values, and simulated outcomes. Return, win-rate, score, and checklist values here are not validation evidence. Use the Radar and Radar Paper Portfolio links above for the current dated research workflow.</p>
        </div>
      </aside>

      {/* Cohort Comparison Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {cohorts.map(c => {
          return (
            <article
              key={c.cohort}
              className="rounded-3xl p-5 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    {getCohortTitle(c.cohort)}
                  </h3>
                  <span className="rounded-md border border-slate-400/30 bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold font-mono text-slate-600 dark:text-slate-300">
                    ARCHIVE ONLY
                  </span>
                </div>

                {/* Return Ribbon */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      Recorded net return · unverified
                    </span>
                    <span
                      className="text-base font-black text-slate-600 dark:text-slate-300"
                    >
                      {c.meanNetReturnPercent >= 0 ? '+' : ''}
                      {c.meanNetReturnPercent}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 block uppercase">
                      Recorded stress value · unverified
                    </span>
                    <span
                      className="text-base font-black text-slate-600 dark:text-slate-300"
                    >
                      {c.meanStressedNetReturnPercent >= 0 ? '+' : ''}
                      {c.meanStressedNetReturnPercent}%
                    </span>
                  </div>
                </div>

                {/* Core Stats */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recorded outcome rate:</span>
                    <span className="font-bold">
                      {c.winRatePercent}% ({c.winCount}W / {c.lossCount}L)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Archived closed records:</span>
                    <span className="font-bold">{c.closedTrades}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Archived sessions:</span>
                    <span className="font-bold">{c.completedSessions} / 60</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recorded drawdown · unverified:</span>
                    <span className="font-bold text-rose-500">{c.maxDrawdownPercent}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recorded Brier-style value · unverified:</span>
                    <span className="font-mono font-bold">{c.brierScore}</span>
                  </div>
                </div>
              </div>

              {/* Historical checklist values are not promotion evidence. */}
              <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800/80 text-[11px] space-y-1">
                <p className="mb-2 font-semibold text-amber-700 dark:text-amber-300">Legacy checklist · not a promotion gate</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{c.gatingChecklist.minimumSessionsMet ? 'Recorded: met' : 'Recorded: not met'} ·</span>
                  <span className="text-slate-500">60 Session Observation Floor</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{c.gatingChecklist.minimumTradesMet ? 'Recorded: met' : 'Recorded: not met'} ·</span>
                  <span className="text-slate-500">100 Closed Recommendations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{c.gatingChecklist.positiveStressedReturn ? 'Recorded: met' : 'Recorded: not met'} ·</span>
                  <span className="text-slate-500">Positive Return under 2x Cost Stress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">{c.gatingChecklist.drawdownUnderLimit ? 'Recorded: met' : 'Recorded: not met'} ·</span>
                  <span className="text-slate-500">Drawdown &le; 8.0%</span>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'today'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Archived Observation Rows ({currentObservations.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Archived Reconciliation Rows ({reconciledHistory.length})
        </button>
      </div>

      {/* Tab 1: Current Observations */}
      {activeTab === 'today' && (
        <section className="rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-sm overflow-hidden">
          {currentObservations.length === 0 ? (
            <div className="py-16 text-center">
              <Clock className="mx-auto text-slate-400 mb-2" size={28} />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Archived Observation Rows for This Date
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                New dated research candidates are available from the Radar. This legacy archive is read-only.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Cohort</th>
                    <th className="py-3 px-4">Recorded reference price</th>
                    <th className="py-3 px-4">Recorded target · unverified</th>
                    <th className="py-3 px-4">Recorded stop · unverified</th>
                    <th className="py-3 px-4">Recorded value · unverified</th>
                    <th className="py-3 px-4">Stored digest · unverified</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {currentObservations.map(obs => (
                    <tr key={obs.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-black font-sans text-slate-900 dark:text-white">
                        {obs.symbol}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {obs.cohort.replace('COHORT_', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatINR(obs.referenceClose)}</td>
                      <td className="py-3 px-4 text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatINR(obs.indicativeTargetPrice)}
                      </td>
                      <td className="py-3 px-4 text-rose-600 dark:text-rose-400 font-bold">
                        {formatINR(obs.indicativeStopLossPrice)}
                      </td>
                      <td className="py-3 px-4 font-bold">{Number.isFinite(obs.rawProbability) ? obs.rawProbability.toFixed(2) : '—'}</td>
                      <td className="py-3 px-4 text-[10px] text-slate-400 truncate max-w-[120px]" title={obs.evidenceBundleHash || 'None'}>
                        {obs.evidenceBundleHash ? obs.evidenceBundleHash.slice(0, 10) + '...' : '—'}
                      </td>
                      <td className="py-3 px-4 text-[10px] text-slate-400">
                        {new Date(obs.predictedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Tab 2: Reconciled History */}
      {activeTab === 'history' && (
        <section className="rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl shadow-sm overflow-hidden">
          {reconciledHistory.length === 0 ? (
            <div className="py-16 text-center">
              <Activity className="mx-auto text-slate-400 mb-2" size={28} />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No Archived Reconciliation Rows
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Reconciliation rows from this legacy sandbox are retained as history only.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-800/50 text-[11px] font-mono uppercase text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Symbol</th>
                    <th className="py-3 px-4">Cohort</th>
                    <th className="py-3 px-4">Fill Open</th>
                    <th className="py-3 px-4">Exit Price</th>
                    <th className="py-3 px-4">Outcome</th>
                    <th className="py-3 px-4">Recorded return · unverified</th>
                    <th className="py-3 px-4">Recorded outcome · unverified</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {reconciledHistory.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 px-4 text-slate-400">{rec.sessionDate}</td>
                      <td className="py-3 px-4 font-black font-sans text-slate-900 dark:text-white">
                        {rec.symbol}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rec.cohort.replace('COHORT_', '')}
                        </span>
                      </td>
                      <td className="py-3 px-4">{formatINR(rec.openFillPrice)}</td>
                      <td className="py-3 px-4">{formatINR(rec.exitPrice)}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold">
                        RECORDED · {rec.outcome.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td
                        className="py-3 px-4 font-black text-slate-600 dark:text-slate-300"
                      >
                        {rec.netReturnPercent >= 0 ? '+' : ''}
                        {rec.netReturnPercent}%
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="rounded bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                        >
                          {rec.isWin ? 'RECORDED WIN' : 'RECORDED LOSS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
