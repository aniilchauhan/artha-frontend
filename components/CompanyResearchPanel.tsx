'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, ExternalLink, Loader2, Users } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ResearchHistory from './ResearchHistory';
import FrameworkResearchPanel, { FrameworkReportView } from './FrameworkResearchPanel';
import { RESEARCH_ROLES } from '../lib/research-types';
import type { CompanyResearchReport, ResearchEvidence, ResearchRole, ResearchRoleResult, ResearchSaveReceipt, SavedResearchReport } from '../lib/research-types';

const dateLabel = (value: string) => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
const evidenceLabel = (item: ResearchEvidence) => typeof item.value === 'number'
  ? `${item.value.toLocaleString('en-IN', { maximumFractionDigits: 4 })}${item.unit ? ` ${item.unit}` : ''}` : item.value;

function RoleReport({ result, evidence }: { result: ResearchRoleResult; evidence: ResearchEvidence[] }) {
  const name = result.role === 'summary' ? 'Research lead · combined view' : RESEARCH_ROLES.find(role => role.id === result.role)?.name;
  const review = result.review;
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-label={name}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">{name}</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-300">{review?.outlook ?? 'Unavailable'}</span>
      </div>
      {review ? <>
        <p className="mt-1 text-xs text-slate-500">{result.provider} · {result.model}</p>
        <p className="mt-4 text-sm leading-relaxed">{review.summary}</p>
        <ul className="mt-4 space-y-3 text-sm">
          {review.findings.map((finding, index) => <li key={index}>
            <p>{finding.text}</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {finding.evidenceIds.map(id => {
                const source = evidence.find(item => item.id === id);
                return source ? <a key={id} href={`#research-evidence-${id}`} className="text-xs text-indigo-600 underline underline-offset-2 dark:text-indigo-400">{source.label}</a> : null;
              })}
            </div>
          </li>)}
        </ul>
        <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">Risks and counterpoints</h4>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{review.risks.map((risk, index) => <li key={index}>{risk}</li>)}</ul>
        <h4 className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-500">Questions to investigate</h4>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm">{review.questions.map((question, index) => <li key={index}>{question}</li>)}</ul>
      </> : <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{result.error}</p>}
    </article>
  );
}

export default function CompanyResearchPanel({ ticker }: { ticker: string }) {
  const { data: session, status } = useSession();
  const account = status === 'authenticated' ? (session?.user as { id?: string } | undefined)?.id ?? session?.user?.email ?? '' : '';
  // Remount immediately on account changes so previous reports and pending requests cannot cross sessions.
  return <ResearchPanel key={`${ticker}|${status}|${account}`} ticker={ticker} signedIn={status === 'authenticated' && !!account} />;
}

function ResearchPanel({ ticker, signedIn }: { ticker: string; signedIn: boolean }) {
  const [roles, setRoles] = useState<ResearchRole[]>(RESEARCH_ROLES.map(role => role.id));
  const [report, setReport] = useState<CompanyResearchReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<ResearchSaveReceipt | null>(null);
  const [historical, setHistorical] = useState(false);
  const [historyBusy, setHistoryBusy] = useState(false);
  const active = useRef<AbortController | null>(null);

  useEffect(() => {
    active.current?.abort();
    active.current = null;
    setReport(null);
    setSave(null);
    setHistorical(false);
    setError(null);
    setLoading(false);
    return () => { active.current?.abort(); active.current = null; };
  }, [ticker]);

  function toggleRole(role: ResearchRole) {
    setRoles(current => current.includes(role) ? current.filter(item => item !== role) : [...current, role]);
    setReport(null);
    setSave(null);
    setHistorical(false);
    setError(null);
  }

  async function runResearch() {
    if (active.current || !roles.length || historyBusy) return;
    if (!signedIn) { setError('Sign in to run company research.'); return; }
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 270_000);
    setLoading(true);
    setError(null);
    setReport(null);
    setSave(null);
    setHistorical(false);
    try {
      const response = await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker, roles }), signal: controller.signal });
      if (response.status === 401) throw new Error('Sign in to run company research.');
      const body = await response.json();
      if (!response.ok || !body.success || !body.data) throw new Error(body.error || 'Research is unavailable. Please try again.');
      if (active.current === controller && !controller.signal.aborted) {
        setReport(body.data);
        setSave(body.save ?? { status: 'unavailable', message: 'Saving was not confirmed. This report may not be in your history.' });
      }
    } catch (failure) {
      if (active.current === controller) setError(controller.signal.aborted ? 'Research took too long. Try fewer roles or check the AI provider.'
        : failure instanceof Error ? failure.message : 'Research failed. Please try again.');
    } finally {
      clearTimeout(timeout);
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }

  function openSavedReport(saved: SavedResearchReport) {
    setReport(saved.report);
    if (saved.report.kind !== 'framework') setRoles(saved.report.roles.map(role => role.role as ResearchRole));
    setSave({ status: 'existing', id: saved.id, savedAt: saved.savedAt, message: 'Opened your saved report.' });
    setHistorical(true);
    setError(null);
  }

  return (
    <section className="space-y-5 text-slate-700 dark:text-slate-300" aria-label="Company research team">
      <FrameworkResearchPanel ticker={ticker} />
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 sm:p-6 dark:border-indigo-900 dark:bg-indigo-950/20">
        <div className="flex items-center gap-3"><Users className="h-6 w-6 text-indigo-600" /><h2 className="text-xl font-bold text-slate-900 dark:text-white">Research team · {ticker}</h2></div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">Choose specialist perspectives for this company. Each analyst reviews source evidence, then the research lead combines their findings and unresolved questions.</p>
        <fieldset disabled={loading || historyBusy} className="mt-5">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-500">Research roles</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {RESEARCH_ROLES.map(role => <label key={role.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${roles.includes(role.id) ? 'border-indigo-400 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="checkbox" checked={roles.includes(role.id)} onChange={() => toggleRole(role.id)} className="mt-1 accent-indigo-600" />
              <span><span className="block text-sm font-semibold">{role.name}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{role.description}</span></span>
            </label>)}
          </div>
        </fieldset>
        <button onClick={runResearch} disabled={loading || historyBusy || roles.length === 0} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}{loading ? 'Researching…' : 'Run research team'}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Uses the configured Gemini or Ollama model. Roles may share the same model; agreement is not independent validation. Missing sources are marked unavailable.</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Completed and partial reports are saved to your account when the database is available.</p>
      </div>
      {signedIn ? <ResearchHistory ticker={ticker} disabled={loading} onOpen={openSavedReport} onBusyChange={setHistoryBusy} />
        : <p className="text-sm text-slate-500">Sign in to generate research and view your saved reports.</p>}
      {loading && <p role="status" className="text-sm">Collecting evidence and preparing specialist reports, followed by the combined view. A local model may take several minutes.</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
      {report && report.ticker === ticker.toUpperCase().replace(/\.NS$/, '') && <>
        {save && <div role={save.status === 'unavailable' ? 'alert' : 'status'} className={`rounded-xl border p-4 text-sm ${save.status === 'unavailable' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
          <p>{save.message}{save.savedAt ? ` Saved ${dateLabel(save.savedAt)} IST.` : ''}</p>
          {historical && <p className="mt-1">Historical snapshot — evidence and AI analysis have not been refreshed. Run research again for a current assessment.</p>}
        </div>}
        {report.kind === 'framework' && report.framework ? <FrameworkReportView report={report.framework} /> : <>
        <div className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <p>{report.status === 'partial' ? 'Partial report — some roles or the combined view are unavailable.' : 'Selected roles completed.'} Generated {dateLabel(report.generatedAt)} IST.</p>
          <p className="mt-1">{report.validation}</p>
        </div>
        <RoleReport result={report.synthesis} evidence={report.snapshot.evidence} />
        <div className="grid items-start gap-4 lg:grid-cols-2">{report.roles.map(result => <RoleReport key={result.role} result={result} evidence={report.snapshot.evidence} />)}</div>
        <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
          <h3 className="font-semibold">Evidence and coverage</h3>
          <ul className="mt-3 list-disc space-y-2 pl-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{report.snapshot.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {report.snapshot.evidence.map(item => <li key={item.id} id={`research-evidence-${item.id}`} className="scroll-mt-24 py-3 text-sm">
              <p className="font-semibold">{item.label}</p><p className="mt-1 break-words leading-relaxed">{evidenceLabel(item)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-indigo-600 underline dark:text-indigo-400">{item.source}<ExternalLink className="h-3 w-3" /></a>
                <span>{item.asOf ? `Observed/published ${dateLabel(item.asOf)} IST` : 'Reporting date unavailable'}</span>
                <span>Retrieved {dateLabel(item.retrievedAt)} IST</span>
              </div>
            </li>)}
          </ul>
        </div>
        </>}
      </>}
    </section>
  );
}
