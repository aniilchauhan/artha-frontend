'use client';
import React from 'react';
import { FRAMEWORK_REGISTRY } from '../lib/framework-registry';
import type { FinancialEvidence } from '../lib/framework-financials';
import type { FrameworkBacktest } from '../lib/framework-backtest';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const percent = (n: number | null) => n === null ? 'Unavailable' : `${(n * 100).toFixed(2)}%`;

export function FinancialEvidencePanel({ evidence }: { evidence: FinancialEvidence }) {
  return <section aria-label="Annual financial evidence" className={card}>
    <h3 className="font-semibold">Annual financial statements</h3>
    <p className="mt-2 text-sm">Provider observations · Filing verification unavailable · Sector: {evidence.sector ?? 'Unavailable'}</p>
    <a className="mt-2 inline-block text-xs text-indigo-600 underline" href={evidence.url} target="_blank" rel="noopener noreferrer">{evidence.source} financial statements</a>
    <p className="mt-1 text-xs text-slate-500">Retrieved {evidence.retrievedAt}. Publication dates and consolidated/standalone basis are unverified.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">{evidence.checks.map(check => <article key={check.id} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700">
      <div className="flex flex-wrap justify-between gap-2"><h4 className="font-medium">{check.label}</h4><span>{check.status.replace('_', ' ')}</span></div>
      {check.observed !== null && <p className="mt-1">{Number(check.observed).toLocaleString('en-IN', { maximumFractionDigits: 4 })} {check.unit}</p>}
      <p className="mt-1 text-xs text-slate-500">{check.rule}</p><p className="mt-1 text-xs text-slate-500">{check.explanation}</p>
      <p className="mt-1 text-xs text-slate-500">Periods: {check.evidenceIds.map(id => id.replace('financials.', '')).join(', ') || 'Unavailable'}</p>
    </article>)}</div>
    <details className="mt-4 text-xs"><summary className="cursor-pointer">Source periods and values</summary>
      {evidence.statements.length === 0 && <p className="mt-2">No usable INR annual statements were returned.</p>}
      {evidence.statements.map(row => <div key={row.periodEnd} className="mt-3"><h4 className="font-semibold">Year ended {row.periodEnd} · INR</h4>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(row.values).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value!.toLocaleString('en-IN')}</dd></div>)}</dl>
      </div>)}
    </details>
    <ul className="mt-4 list-disc space-y-1 pl-4 text-xs text-slate-500">{evidence.limitations.map(line => <li key={line}>{line}</li>)}</ul>
  </section>;
}

export function FrameworkBacktestPanel({ backtest }: { backtest: FrameworkBacktest }) {
  return <section aria-label="Historical framework simulation" className={card}>
    <h3 className="font-semibold">Historical strategy simulation · {backtest.ticker}</h3>
    <p className="mt-2 text-xs text-slate-500">{backtest.ruleVersion} · {backtest.execution.version} · Single selected stock · Illustrative costs</p>
    {backtest.strategies.map(strategy => <section key={strategy.id} className="mt-5">
      <h4 className="font-semibold">{FRAMEWORK_REGISTRY[strategy.id].name}</h4>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">{(['development', 'holdout'] as const).map(name => {
        const window = strategy[name], stats = window.summary;
        const metrics = [['Completed trades', stats.completedTrades], ['Win rate after costs', percent(stats.winRate)],
          ['Mean net trade return', percent(stats.meanNetReturn)], ['Sequential sleeve return', percent(stats.compoundedNetReturn)],
          ['Closed-trade drawdown', percent(stats.closedTradeMaxDrawdown)], ['Nifty price return', percent(stats.benchmarkReturn)],
          ['Session exposure', percent(stats.exposureFraction)], ['Unavailable signal sessions', `${stats.unavailableSessions} / ${stats.evaluatedSessions}`]];
        return <article key={name} className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-700">
          <h5 className="font-semibold">{name === 'development' ? 'Earlier 70% of sessions' : 'Later 30% holdout'}</h5>
          <p className="mt-1 text-xs text-slate-500">{window.from ?? 'Unavailable'} → {window.through ?? 'Unavailable'}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3">{metrics.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          {stats.smallSample && <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">Fewer than 30 completed trades; insufficient evidence for a dependable performance claim.</p>}
          <details className="mt-3 text-xs"><summary className="cursor-pointer">All candidate outcomes ({window.trades.length})</summary>
            <ul className="mt-2 space-y-3">{window.trades.map(trade => <li key={trade.signalDay}>
              <p className="font-medium">{trade.signalDay}: {trade.outcome.replace('_', ' ')} · Net {percent(trade.netReturn)}</p>
              <p>{trade.entryDay ?? 'No entry'} → {trade.exitDay ?? 'Unresolved'} · Entry {trade.entry?.toFixed(2) ?? '—'} / stop {trade.stop.toFixed(2)} / exit {trade.exit?.toFixed(2) ?? '—'}</p>
              <p className="text-slate-500">{trade.reason}</p>
            </li>)}</ul>
          </details>
        </article>;
      })}</div>
    </section>)}
    <details className="mt-5 text-xs"><summary className="cursor-pointer font-medium">Execution assumptions and limitations</summary>
      <p className="mt-2">Trigger validity: 3 sessions. Holding limit: 20 sessions including entry. Target: 3 times initial price risk. Entry/exit cost estimates: 0.10% each. Slippage: 0.05% per fill. Opening chase limit: 3%.</p>
      <ul className="mt-2 list-disc space-y-2 pl-4 text-slate-500">{backtest.limitations.map(line => <li key={line}>{line}</li>)}</ul>
    </details>
  </section>;
}
