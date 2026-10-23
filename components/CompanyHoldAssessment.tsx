'use client';

import React, { useEffect, useState } from 'react';
import { axionFetch } from '../lib/in-process';
import type { FinancialEvidence } from '../lib/framework-financials';
import type { CompanyHoldAssessmentDetail } from '../lib/company-hold';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Building2,
  Calendar,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EvidencePayload {
  profile: {
    description: string | null;
    sector: string | null;
    industry: string | null;
  };
  financials: FinancialEvidence;
  assessment: CompanyHoldAssessmentDetail;
}

interface CompanyHoldAssessmentProps {
  ticker: string;
  days: number;
}

export default function CompanyHoldAssessment({ ticker, days }: CompanyHoldAssessmentProps) {
  const [requested, setRequested] = useState(false);
  const [data, setData] = useState<EvidencePayload | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFullDisclosures, setShowFullDisclosures] = useState(false);

  useEffect(() => {
    if (!requested) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);

    axionFetch(`/api/rapid-moves/company?ticker=${encodeURIComponent(ticker)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.error || 'Company evidence unavailable.');
        }
        return body as EvidencePayload;
      })
      .then(setData)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [ticker, requested]);

  const assessmentStatus = data?.assessment.status || 'not_established';

  const statusBadge = {
    supportive: {
      color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300',
      icon: <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />,
      title: 'Company Supports Further Hold Review',
    },
    caution: {
      color: 'bg-rose-500/10 text-rose-700 border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-300',
      icon: <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />,
      title: 'Longer Hold Needs Caution',
    },
    not_established: {
      color: 'bg-amber-500/10 text-amber-800 border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-300',
      icon: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />,
      title: 'Longer Hold Not Established',
    },
  }[assessmentStatus];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200">
      {/* ─── Header: Wall Between Tactical Trade vs Longer Hold ────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
            Company Evidence & Longer Hold Assessment (AX-10 / AX-11)
          </h3>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          NSE: {ticker}
        </span>
      </div>

      {/* ─── Tactical Swing Review Policy ──────────────────────────── */}
      <div className="mt-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3.5 text-xs text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/20 dark:text-blue-200">
        <div className="flex items-start gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Tactical Review Deadline:</span> Reassess after{' '}
            <strong>{days} trading {days === 1 ? 'session' : 'sessions'}</strong>, or sooner if the entry thesis fails.
            <p className="mt-1 text-[11px] text-blue-700 dark:text-blue-300 italic">
              Invariant: A declining trade price NEVER justifies converting a short momentum trade into an unreviewed long-term investment.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Action Button or Loading / Error ──────────────────────── */}
      {!requested && (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            A longer fundamental hold requires separate verified business and financial evidence. It is never inferred from price momentum alone.
          </p>
          <button
            onClick={() => setRequested(true)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-cyan-500"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Load Dated Financial Evidence</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-slate-50 p-6 text-xs text-slate-500 dark:bg-slate-800/40">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>Auditing company profile, annual statements, and sector applicability…</span>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
          <p className="font-bold">Evidence Unavailable</p>
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* ─── Detailed Evidence & Sector Assessment ─────────────────── */}
      {data && (
        <div className="mt-4 space-y-4 text-xs">
          {/* Assessment Banner */}
          <div className={`rounded-xl border p-3.5 ${statusBadge.color}`}>
            <div className="flex items-start gap-2.5">
              {statusBadge.icon}
              <div>
                <p className="text-xs font-bold">{data.assessment.label}</p>
                <p className="mt-1 text-[11px] leading-relaxed">{data.assessment.reason}</p>
              </div>
            </div>
          </div>

          {/* Business & Sector Metadata */}
          <div className="rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/40">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sector / Industry</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {data.profile.sector || 'Unknown'} / {data.profile.industry || 'Unknown'}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporting Periods</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  {data.financials.statements.map((s) => s.periodEnd).join(', ') || 'Unavailable'}
                </p>
              </div>
            </div>

            {data.profile.description && (
              <div className="mt-2.5 border-t border-slate-200/60 pt-2.5 dark:border-slate-700/60">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Activity</span>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3">
                  {data.profile.description}
                </p>
                <p className="mt-1 text-[10px] italic text-slate-400">
                  * Note: Business descriptions describe activities, not current balance-sheet health or return suitability.
                </p>
              </div>
            )}
          </div>

          {/* Financial Facts & Checks Table */}
          <div className="rounded-xl border border-slate-200 overflow-hidden dark:border-slate-800">
            <div className="bg-slate-100 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Evaluated Financial Facts (Unit · Period · Observed)
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.financials.checks
                .filter((c) =>
                  ['cash-conversion', 'revenue-growth', 'leverage', 'free-cash-flow', 'roiic'].includes(c.id)
                )
                .map((check) => {
                  const statusColor =
                    check.status === 'pass'
                      ? 'text-emerald-600 bg-emerald-500/10'
                      : check.status === 'fail'
                      ? 'text-rose-600 bg-rose-500/10'
                      : check.status === 'not_applicable'
                      ? 'text-purple-600 bg-purple-500/10'
                      : 'text-slate-500 bg-slate-100 dark:bg-slate-800';

                  return (
                    <div key={check.id} className="p-3 bg-white dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{check.label}</span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor}`}>
                          {check.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                        Observed:{' '}
                        <strong>
                          {check.observed === null
                            ? 'Unavailable'
                            : typeof check.observed === 'number'
                            ? check.observed.toLocaleString('en-IN', { maximumFractionDigits: 3 })
                            : check.observed}{' '}
                          {check.unit || ''}
                        </strong>{' '}
                        · Rule: {check.rule}
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-500 italic">{check.explanation}</p>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Missing Disclosures & Verification Gaps (AX-12) */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 dark:border-amber-500/30 dark:bg-amber-950/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Unverified Disclosures & Governance Limits (AX-12)
              </span>
              <button
                onClick={() => setShowFullDisclosures(!showFullDisclosures)}
                className="text-[11px] font-semibold text-amber-700 hover:underline dark:text-amber-300 flex items-center gap-1"
              >
                {showFullDisclosures ? 'Hide Details' : 'View All Checklist'}
                {showFullDisclosures ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>
            <ul className="mt-2 space-y-1.5 text-[11px] text-amber-900 dark:text-amber-200">
              {data.assessment.missingDisclosures.map((disc, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="text-amber-600 shrink-0">•</span>
                  <span>{disc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Provenance & Limitations Footer */}
          <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Source:{' '}
                <a
                  href={data.financials.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-cyan-600 underline hover:text-cyan-500 inline-flex items-center gap-0.5"
                >
                  Yahoo Finance <ExternalLink className="h-2.5 w-2.5" />
                </a>{' '}
                · Retrieved: {new Date(data.financials.retrievedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
              </span>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">
                Point-in-Time Availability: Unverified
              </span>
            </div>
            <p className="mt-1 text-[10px] italic text-slate-400">
              Historical Point-in-Time Limitation: Filing publication timestamps are unverified. These facts cannot be used in strategy selection backtests without lookahead bias.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
