'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { FRAMEWORK_REPORTS_ENABLED } from '../lib/framework-feature';
import { FRAMEWORK_REGISTRY } from '../lib/framework-registry';
import { sizePosition, type PositionScenario } from '../lib/position-sizing';
import type { FrameworkReport } from '../lib/framework-types';
import type { ResearchSaveReceipt } from '../lib/research-types';
import { FinancialEvidencePanel, FrameworkBacktestPanel } from './FrameworkEvidencePanels';
import HorizonPredictionHistory from './HorizonPredictionHistory';

const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const panel = 'rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900';
const initialScenario: PositionScenario = {
  portfolioEquity: 500000, availableCash: 50000, entry: 500, stop: 475,
  riskFraction: 0.01, maxAllocationFraction: 0.05, entryCostFraction: 0.001,
  exitCostFraction: 0.001, stopSlippageFraction: 0.005,
};
const fields: Array<{ key: keyof PositionScenario; label: string; percent?: boolean }> = [
  { key: 'portfolioEquity', label: 'Portfolio equity (INR)' }, { key: 'availableCash', label: 'Available cash (INR)' },
  { key: 'entry', label: 'Assumed entry (INR)' }, { key: 'stop', label: 'Assumed stop (INR)' },
  { key: 'riskFraction', label: 'Risk budget (%)', percent: true },
  { key: 'maxAllocationFraction', label: 'Position allocation cap (%)', percent: true },
  { key: 'entryCostFraction', label: 'Estimated entry costs (%)', percent: true },
  { key: 'exitCostFraction', label: 'Estimated exit costs (%)', percent: true },
  { key: 'stopSlippageFraction', label: 'Estimated stop slippage (%)', percent: true },
];

export function FrameworkReportView({ report }: { report: FrameworkReport }) {
  const horizon = report.horizonAssessment;
  return <section aria-label={`Framework report for ${report.ticker}`} className="space-y-4">
    <div className="text-sm"><p className="font-semibold">{report.summary}</p>
      <p className="mt-1 text-xs text-slate-500">{report.ticker} · {report.status === 'partial' ? 'Partial evidence' : 'Complete evidence'} · Completed-session cutoff: {report.cutoff ?? 'Unavailable'} · Generated {new Date(report.generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
      <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">Axion rule adaptations · Untested effectiveness · No confirmed entry or success probability</p>
    </div>
    {horizon && <article className={`${panel} border-indigo-200 dark:border-indigo-900`} aria-label={`${horizon.label} horizon assessment`}>
      <div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{horizon.label} research plan</h3><p className="mt-1 text-sm">{horizon.thesis}</p></div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${horizon.status === 'candidate' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>{horizon.flag}</span></div>
      <p className="mt-2 text-xs text-slate-500">Reference {horizon.referencePrice === null ? 'unavailable' : money(horizon.referencePrice)} · {horizon.deadline} · Probability unavailable; this rule set is untested.</p>
      <p className="mt-2 text-xs"><strong>Outcome to evaluate:</strong> {horizon.outcomeDefinition}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{[['Favourable case', horizon.bullCase], ['Base case', horizon.baseCase], ['Adverse case', horizon.bearCase]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800"><strong>{label}</strong><p className="mt-1">{value}</p></div>)}</div>
      <dl className="mt-4 grid gap-3 text-xs md:grid-cols-2"><div><dt className="font-semibold">Entry condition</dt><dd className="mt-1">{horizon.entryCondition}</dd></div><div><dt className="font-semibold">Invalidation</dt><dd className="mt-1">{horizon.invalidation}</dd></div><div><dt className="font-semibold">Review plan</dt><dd className="mt-1">{horizon.reviewPlan}</dd></div><div><dt className="font-semibold">Observed evidence</dt><dd className="mt-1">{horizon.evidence.length ? horizon.evidence.join(' ') : 'No qualifying observations.'}</dd></div></dl>
      {horizon.missingEvidence.length > 0 && <details className="mt-3 text-xs"><summary className="cursor-pointer font-semibold">Evidence gaps ({horizon.missingEvidence.length})</summary><ul className="mt-2 list-disc space-y-1 pl-5">{horizon.missingEvidence.map((item, i) => <li key={`${i}:${item}`}>{item}</li>)}</ul></details>}
    </article>}
    <div className="grid gap-4 xl:grid-cols-2">{report.strategies.map(strategy => <article key={strategy.id} className={panel} aria-label={strategy.name}>
      <h3 className="font-semibold">{strategy.name}</h3>
      <p className="mt-1 text-sm">{strategy.status === 'candidate' ? 'Checklist matched — candidate for review' : strategy.status === 'no_match' ? 'Conditions not matched' : 'Insufficient usable evidence'}</p>
      <p className="mt-1 text-xs text-slate-500">Rule version: {strategy.version}</p>
      <ul className="mt-4 space-y-4">{strategy.checks.map(check => <li key={check.id} className="text-sm">
        <div className="flex flex-wrap justify-between gap-2"><span className="font-medium">{check.label}</span>
          <span className={check.status === 'pass' ? 'text-emerald-700 dark:text-emerald-400' : check.status === 'fail' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}>{check.status.replace('_', ' ')}</span></div>
        {check.observed !== null && <p className="mt-1 break-words">{typeof check.observed === 'number' ? check.observed.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : check.observed}{check.unit ? ` ${check.unit}` : ''}</p>}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{check.rule}</p>
        {check.status === 'unavailable' && <p className="mt-1 text-xs text-slate-500">{check.explanation}</p>}
        {check.evidenceIds.length > 0 && <p className="mt-1 text-xs text-slate-500">Evidence: {check.evidenceIds.join(', ')}</p>}
      </li>)}</ul>
      {strategy.levels && <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800">
        <p>Reference trigger: {money(strategy.levels.trigger)} · Initial stop: {money(strategy.levels.stop)}</p>
        <p className="mt-1 text-xs">Valid for {strategy.levels.expiresAfterSessions} subsequent benchmark sessions. {strategy.levels.rounding}</p>
      </div>}
      {FRAMEWORK_REGISTRY[strategy.id].sourceUrls.length > 0 && <details className="mt-4 text-xs"><summary className="cursor-pointer">Indicator references</summary>
        <ul className="mt-2 space-y-1">{FRAMEWORK_REGISTRY[strategy.id].sourceUrls.map((url, i) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Indicator reference {i + 1}</a></li>)}</ul>
      </details>}
    </article>)}</div>
    {report.financials && <FinancialEvidencePanel evidence={report.financials} />}
    {report.backtest && <FrameworkBacktestPanel backtest={report.backtest} />}
    {report.scenario && <div className={panel}>
      <h3 className="font-semibold">Saved manual sizing scenario</h3>
      <p className="mt-2 text-sm">{report.scenario.result.quantity} shares · Investment {money(report.scenario.result.investment)} · Cash required {money(report.scenario.result.cashRequired)} · Planned loss {money(report.scenario.result.plannedLoss)}</p>
      <p className="mt-2 text-xs text-slate-500">Assumed entry {money(report.scenario.input.entry)} / stop {money(report.scenario.input.stop)}. Binding limits: {report.scenario.result.constraints.join(', ')}. {report.scenario.result.capacity === 'hypothetical' ? 'Portfolio exposure capacity was not fully supplied.' : 'Capacity uses supplied values.'} Gaps may exceed planned loss.</p>
      <details className="mt-3 text-xs"><summary className="cursor-pointer">Saved scenario assumptions</summary>
        <dl className="mt-2 grid gap-2 sm:grid-cols-2">{fields.map(field => <div key={field.key}><dt>{field.label}</dt><dd>{((report.scenario!.input[field.key] ?? 0) * (field.percent ? 100 : 1)).toLocaleString('en-IN', { maximumFractionDigits: 4 })}</dd></div>)}</dl>
      </details>
    </div>}
    <details className={panel}><summary className="cursor-pointer font-semibold">Sources and missing coverage</summary>
      <ul className="mt-3 space-y-3 text-xs">{report.evidence.map(item => <li key={item.id}>
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">{item.source} · {item.symbol}</a>
        <p>{item.id} · {item.observations} completed observations through {item.asOf}; retrieved {item.retrievedAt}.</p>
      </li>)}</ul>
      <ul className="mt-4 list-disc space-y-2 pl-4 text-xs text-slate-500 dark:text-slate-400">{report.limitations.map(item => <li key={item}>{item}</li>)}</ul>
    </details>
  </section>;
}

export default function FrameworkResearchPanel({ ticker }: { ticker: string }) {
  const { data: session, status } = useSession();
  const account = status === 'authenticated' ? (session?.user as { id?: string } | undefined)?.id ?? session?.user?.email ?? '' : '';
  if (!FRAMEWORK_REPORTS_ENABLED) return null;
  return <FrameworkPanel key={`${ticker}|${status}|${account}`} ticker={ticker} signedIn={status === 'authenticated' && !!account} />;
}

function FrameworkPanel({ ticker, signedIn }: { ticker: string; signedIn: boolean }) {
  const [report, setReport] = useState<FrameworkReport | null>(null);
  const [receipt, setReceipt] = useState<ResearchSaveReceipt | null>(null);
  const [horizonReceipt, setHorizonReceipt] = useState<string>('');
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeScenario, setIncludeScenario] = useState(false);
  const [includeFinancials, setIncludeFinancials] = useState(false);
  const [horizon, setHorizon] = useState<'week' | 'month' | 'year' | 'multibagger'>('week');
  const [includeBacktest, setIncludeBacktest] = useState(false);
  const [scenario, setScenario] = useState<PositionScenario>({ ...initialScenario });
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, []);
  let sizing: ReturnType<typeof sizePosition> | null = null;
  try { sizing = sizePosition(scenario); } catch { /* Invalid fields disable submitting the scenario. */ }

  async function run() {
    if (active.current) return;
    if (!signedIn) { setError('Sign in to run stock framework checks.'); return; }
    if (includeScenario && !sizing) { setError('Correct the sizing inputs first.'); return; }
    const controller = new AbortController();
    active.current = controller;
    const timer = setTimeout(() => controller.abort(), 55_000);
    setLoading(true); setError(null); setReport(null); setReceipt(null); setHorizonReceipt('');
    try {
      const response = await fetch('/api/research/frameworks', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, ...(horizon !== 'week' ? { horizon } : {}), ...(includeScenario ? { scenario } : {}), ...(includeFinancials ? { financials: true } : {}),
          ...(includeBacktest ? { backtest: true } : {}) }), signal: controller.signal });
      const body = await response.json();
      if (!response.ok || !body.success || body.data?.kind !== 'framework' || !body.data.framework || body.data.framework.ticker !== ticker.toUpperCase().replace(/\.NS$/, '')) {
        throw new Error(response.status === 401 ? 'Sign in to run stock framework checks.' : body.error || 'Framework report is unavailable.');
      }
      if (active.current === controller && !controller.signal.aborted) {
        setReport(body.data.framework);
        setReceipt(body.save ?? { status: 'unavailable', message: 'Saving was not confirmed.' });
        setHorizonReceipt(body.horizonSave?.message ?? 'Prediction history save was not confirmed.');
        setHistoryRefresh(value => value + 1);
      }
    } catch (failure) {
      if (active.current === controller) setError(controller.signal.aborted ? 'The report timed out. Please retry.' : failure instanceof Error ? failure.message : 'Framework report failed.');
    } finally {
      clearTimeout(timer);
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }

  return <section aria-label="Stock framework checks" className="space-y-4 text-slate-700 dark:text-slate-300">
    <div className={panel}>
      <h2 className="text-lg font-bold">Stock research & setup checks · {ticker}</h2>
      <p className="mt-2 text-sm">Choose a holding horizon. The report combines completed-session price checks with any required financial evidence, shows missing data, and saves the original assessment to your research history.</p>
      <fieldset disabled={loading} className="mt-4 flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">Horizon<select aria-label="Research horizon" value={horizon} onChange={e => setHorizon(e.target.value as typeof horizon)} className="rounded-lg border bg-transparent p-2 dark:border-slate-700"><option value="week">One week · five sessions</option><option value="month">One month · 21 sessions</option><option value="year">One year</option><option value="multibagger">Multibagger · three years</option></select></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={includeFinancials || horizon !== 'week'} onChange={e => setIncludeFinancials(e.target.checked)} />Include annual financial statements{horizon !== 'week' && ' (required for this horizon)'}</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={includeBacktest} onChange={e => setIncludeBacktest(e.target.checked)} />Include historical simulation</label>
      </fieldset>
      <details className="mt-4"><summary className="cursor-pointer text-sm font-semibold">Optional position-sizing scenario</summary>
        <p className="mt-2 text-xs text-slate-500">All inputs below are editable examples, independent of the selected stock and your account. Estimates are not a statutory fee schedule. Existing sector, theme, and aggregate risk exposure are not supplied.</p>
        <fieldset disabled={loading} className="mt-3 grid gap-3 sm:grid-cols-3">{fields.map(field => <label key={field.key} className="text-xs">
          {field.label}<input type="number" min="0" step="any" value={Number.isFinite(scenario[field.key]) ? Number(((scenario[field.key] ?? 0) * (field.percent ? 100 : 1)).toFixed(8)) : ''}
            onChange={event => setScenario(current => ({ ...current, [field.key]: event.target.value === '' ? NaN : Number(event.target.value) / (field.percent ? 100 : 1) }))}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent p-2 dark:border-slate-700" />
        </label>)}</fieldset>
        <p className="mt-3 text-sm">{sizing ? `${sizing.quantity} shares · Cash ${money(sizing.cashRequired)} · Planned loss ${money(sizing.plannedLoss)}` : 'Enter valid finite inputs with a positive stop below entry.'}</p>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={includeScenario} disabled={loading} onChange={e => setIncludeScenario(e.target.checked)} />Include this manual scenario in the saved report</label>
      </details>
      <button onClick={run} disabled={loading || (includeScenario && !sizing)} className="mt-4 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{loading ? 'Checking rules…' : 'Run framework checks'}</button>
      <p className="mt-2 text-xs text-slate-500">No AI call required. Saved snapshots are available in Research Team → Your saved reports.</p>
    </div>
    {loading && <p role="status" className="text-sm">Collecting completed market observations…</p>}
    {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
    {receipt && <p role={receipt.status === 'unavailable' ? 'alert' : 'status'} className="text-sm">{receipt.message}</p>}
    {horizonReceipt && <p role={horizonReceipt.startsWith('The research report') ? 'alert' : 'status'} className="text-sm">{horizonReceipt}</p>}
    {report && <FrameworkReportView report={report} />}
    <HorizonPredictionHistory signedIn={signedIn} refreshToken={historyRefresh} />
  </section>;
}
