'use client';

import { useCallback, useEffect, useState } from 'react';
import { Activity, Download, RefreshCw, ShieldAlert } from 'lucide-react';
import { axionFetch, axionAppPath } from '../lib/in-process';
import { calculateWilsonConfidenceInterval } from '../lib/strategy-results-reconciliation';
import type { PaperEvent, PaperOrder, PaperPortfolioSummary } from '../lib/paper-position-state-machine';
import Link from './WorkspaceLink';

interface PaperLedger {
  summary: PaperPortfolioSummary;
  orders: PaperOrder[];
  events: PaperEvent[];
  initialCapital: number;
  maxPositions: number;
  limitation: string;
  marks: Record<string, { price: number; asOf: string }>;
  worker: { status: string; lastSuccess: string | null; note: string };
}

const money = (value: number) =>
  value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

export default function ResearchPaperResultsScreen({ mode = 'results' }: { mode?: 'portfolio' | 'results' }) {
  const [ledger, setLedger] = useState<PaperLedger | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await axionFetch('/api/research-paper', { signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sign in to view Radar paper results.');
      if (!signal?.aborted) {
        setLedger(data);
        setError('');
      }
    } catch (cause) {
      if (!signal?.aborted) {
        setLedger(null);
        setError(cause instanceof Error ? cause.message : 'Radar paper results are unavailable.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const poll = () => {
      if (!document.hidden) void refresh(controller.signal);
    };
    poll();
    const timer = window.setInterval(poll, 30_000);
    document.addEventListener('visibilitychange', poll);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', poll);
    };
  }, [refresh]);

  function exportLedger() {
    if (!ledger) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(ledger, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'radar-paper-ledger.json';
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const closedOrderRecords = ledger?.orders.filter(order => order.status === 'closed') ?? [];
  const closedOrders = closedOrderRecords.filter(order => typeof order.netPnl === 'number' && Number.isFinite(order.netPnl));
  const winningClosedOrders = closedOrders.filter(order => (order.netPnl ?? 0) > 0).length;
  const winRateInterval = closedOrders.length
    ? calculateWilsonConfidenceInterval(winningClosedOrders, closedOrders.length)
    : null;

  return (
    <section aria-labelledby="radar-paper-results-title" className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="radar-paper-results-title" className="text-xl font-bold">{mode === 'portfolio' ? 'Radar paper portfolio' : 'Radar paper results'}</h2>
          <p className="mt-1 text-sm text-slate-500">Signal-linked conditional plans, worker-observed sessions and event-ledger outcomes.</p>
        </div>
        <div className="flex gap-2">
          {mode === 'portfolio' && <Link href={axionAppPath('/portfolio-tracker')} className="inline-flex items-center rounded-xl border px-3 py-2 text-xs font-semibold">Manual holdings tracker · local only</Link>}
          <button onClick={() => { setLoading(true); void refresh(); }} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button onClick={exportLedger} disabled={!ledger} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-50">
            <Download size={14} /> Export ledger
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}

      {ledger && (
        <>
          <aside role="note" className="flex gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{ledger.limitation} These records are a research simulation and do not establish strategy performance or live execution.</span>
          </aside>

          <aside role="note" className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
            <p className="font-semibold">Forward sample gate: not established</p>
            <p className="mt-1">{closedOrders.length}/30 closed positions have recorded net outcomes{closedOrderRecords.length > closedOrders.length ? `; ${closedOrderRecords.length - closedOrders.length} closed records lack a net outcome` : ''}. The ledger does not retain week-by-week observation coverage, so the required eight forward weeks cannot be verified. Results remain preliminary even if the trade count later reaches 30.</p>
            {winRateInterval && <p className="mt-1">Observed win rate {((winningClosedOrders / closedOrders.length) * 100).toFixed(1)}%; 95% Wilson interval {winRateInterval.lower.toFixed(1)}%–{winRateInterval.upper.toFixed(1)}% ({closedOrders.length} closed positions). This interval does not establish a profitable edge or prove independent observations.</p>}
          </aside>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs dark:border-slate-800 dark:bg-slate-900">
            <p>Initial capital {money(ledger.initialCapital)} · {ledger.maxPositions} stock slots · {ledger.summary.pendingCount} pending · {ledger.summary.activeCount} open · {ledger.summary.closedCount} closed · {ledger.summary.expiredCount} missed or expired</p>
            <p className="mt-2">Worker checkpoint: {ledger.worker?.status.replaceAll('_', ' ') || 'unavailable'} · last success {ledger.worker?.lastSuccess || 'not recorded'}</p>
            {ledger.worker?.note && <p className="mt-1 text-slate-500">{ledger.worker.note}</p>}
          </div>

          {Math.abs(ledger.summary.cashReconciliationDelta) > 0.01 && (
            <p role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              Cash reconciliation differs by {money(ledger.summary.cashReconciliationDelta)}. Review the event ledger before relying on portfolio values.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ['Cash', ledger.summary.cash],
              ['Marked paper equity', ledger.summary.totalEquity],
              ['Realized paper P&L', ledger.summary.realizedPnl],
              ['Cash reconciliation delta', ledger.summary.cashReconciliationDelta],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 font-semibold">{money(value as number)}</p>
              </article>
            ))}
          </div>

          {!ledger.orders.length ? (
            <div className="rounded-2xl border border-dashed p-8 text-center">
              <Activity className="mx-auto mb-2 text-slate-400" size={24} />
              <p className="font-semibold">No Radar paper plans yet.</p>
              <Link href={axionAppPath('/rapid-moves')} className="mt-2 inline-block text-sm font-semibold text-cyan-600">Open the Radar and choose a dated signal</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ledger.orders.map(order => (
                <article key={order.id} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-bold">{order.companyName} · {order.status}</h3>
                    <span className="text-xs text-slate-500">{order.symbol}</span>
                  </div>
                  <p className="mt-2">Trigger {money(order.intendedTrigger)} · Target scenario {money(order.targetPrice)} · Invalidation {money(order.invalidationStop)} · {order.maxHoldSessions}-session review</p>
                  <p>{order.filledShares ?? order.requestedShares} whole shares · {order.fillPrice ? `Recorded paper fill ${money(order.fillPrice)} on ${order.fillDate}` : 'Pending observed session evidence'}</p>
                  <p>{order.exitReason || order.cancellationReason || 'No recorded exit.'} {order.netPnl !== undefined && `Net paper P&L ${money(order.netPnl)}`}</p>
                  <p className="mt-2 break-all text-xs text-slate-500">Signal {order.signalId} · submitted {order.submittedAt} · latest mark {ledger.marks?.[order.symbol]?.asOf || 'unavailable'}</p>

                  <details className="mt-3 text-xs">
                    <summary className="cursor-pointer font-semibold">Original signal evidence and execution audit</summary>
                    {order.signalSnapshot ? (
                      <div className="mt-2 space-y-2">
                        <p>Strategy {order.strategyVersion} · source cutoff {order.signalSnapshot.dataCutoff} · issued {order.signalSnapshot.issuedAt}</p>
                        <ul className="list-disc space-y-1 pl-4">{order.signalSnapshot.measuredReasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
                        <p>Company hold: {order.signalSnapshot.companyHoldAssessment.label} — {order.signalSnapshot.companyHoldAssessment.reason}</p>
                        <p>Missing evidence: {order.signalSnapshot.evidenceMissing.join('; ') || 'No gaps recorded in this snapshot; this does not guarantee completeness.'}</p>
                        <p className="break-all text-slate-500">Source hash: {order.signalHash}<br />Paper-plan hash: {order.planHash}</p>
                      </div>
                    ) : <p className="mt-2 text-slate-500">This older order has no embedded signal snapshot. Its recorded signal ID and hash remain available.</p>}
                    <p className="mt-2">Observed holding sessions: {order.holdingSessions ?? 'not recorded'} · buy fees {money(order.entryChargesInr ?? 0)} · exit fees {money(order.exitChargesInr ?? 0)}</p>
                  </details>
                </article>
              ))}
            </div>
          )}

          {!!ledger.events?.length && (
            <details className="rounded-2xl border border-slate-200 p-4 text-xs dark:border-slate-800">
              <summary className="cursor-pointer font-semibold">Sequenced event history ({ledger.events.length})</summary>
              <ol className="mt-3 space-y-2">{ledger.events.map((event, index) => <li key={event.id}>{index + 1}. {event.timestamp} · {event.symbol} · {event.type.replaceAll('_', ' ')}</li>)}</ol>
            </details>
          )}
        </>
      )}
    </section>
  );
}
