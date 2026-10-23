'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  FileSpreadsheet,
} from 'lucide-react';
import type { DecisionSignal, SignalType } from '@/lib/signal-schema';

export interface DecisionCardProps {
  symbol: string;
  companyName: string;
  series?: string;
  currentPrice: number;
  changePercent: number;
  quoteAsOf: string;
  quoteSource?: string;
  quoteStatus?: 'recent' | 'delayed' | 'historical' | 'simulated';
  state?: 'watching' | 'entry_met' | 'paper_open' | 'review_due' | 'invalidated' | 'expired';
  strategyVersion?: string;
  signalId?: string;
  revision?: number;
  parentSignalId?: string | null;
  immutableHash?: string;
  signalType?: SignalType;
  metrics: {
    resistance20d: number;
    volumeRatio: number;
    momentum5dPct: number;
    turnoverCr: number;
    atr14: number;
    atrPct: number;
  };
  plan: {
    entryTrigger: number;
    maxOpeningGap: number;
    targetScenario: number;
    invalidationStop: number;
    validitySessions: number;
    reviewSessions: number;
    rewardToRiskRatio: number;
  };
  portfolioSizing?: {
    portfolioCapital: number;
    riskBudgetInr: number;
    slotCapital: number;
    wholeShares: number;
    allocatedAmount: number;
    plannedRiskAmount: number;
  };
  companyHold?: {
    status: 'not_established' | 'caution' | 'supportive';
    label: string;
    reason: string;
    checks?: Array<{ id: string; label: string; status: 'pass' | 'fail' | 'unavailable'; observed: string | number | null }>;
  };
  onAddToWatchlist?: () => void;
  onCreatePaperPlan?: () => void;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);

export default function DecisionCard({
  symbol,
  companyName,
  series = 'EQ',
  currentPrice,
  changePercent,
  quoteAsOf,
  quoteSource = 'Yahoo Finance',
  quoteStatus = 'recent',
  state = 'watching',
  strategyVersion = 'AX-STRAT-01 (v1.0-swing-5d)',
  signalId,
  revision,
  parentSignalId,
  immutableHash,
  signalType,
  metrics,
  plan,
  portfolioSizing = {
    portfolioCapital: 50000,
    riskBudgetInr: 500,
    slotCapital: 16666.67,
    wholeShares: Math.max(0, Math.min(
      Math.floor(16666.67 / plan.entryTrigger),
      Math.floor(500 / Math.max(0.1, plan.entryTrigger - plan.invalidationStop))
    )),
    allocatedAmount: 0,
    plannedRiskAmount: 0,
  },
  companyHold = {
    status: 'not_established',
    label: 'Longer hold not established',
    reason: 'Company filings or valuation metrics are unverified. A short-term price breakout does not justify holding a falling trade.',
  },
  onAddToWatchlist,
  onCreatePaperPlan,
}: DecisionCardProps) {
  const [showCompanyDetails, setShowCompanyDetails] = useState(false);

  const calculatedShares = portfolioSizing.wholeShares > 0
    ? portfolioSizing.wholeShares
    : Math.max(0, Math.min(
        Math.floor(portfolioSizing.slotCapital / Math.max(1, plan.entryTrigger)),
        Math.floor(portfolioSizing.riskBudgetInr / Math.max(0.1, plan.entryTrigger - plan.invalidationStop))
      ));
  const allocatedAmount = calculatedShares * plan.entryTrigger;
  const plannedRiskAmount = calculatedShares * (plan.entryTrigger - plan.invalidationStop);

  const stateBadges = {
    watching: {
      label: 'WATCHING: ENTRY CONDITIONS NOT MET',
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      desc: `Awaiting session high to cross ₹${plan.entryTrigger.toFixed(2)} with volume confirmation.`,
    },
    entry_met: {
      label: 'ENTRY TRIGGER MET: PENDING NEXT SESSION',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      desc: `Price crossed trigger level. Valid for opening next session below ₹${plan.maxOpeningGap.toFixed(2)}.`,
    },
    paper_open: {
      label: 'PAPER POSITION OPEN',
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      desc: 'Active paper position held in portfolio. Monitoring review deadlines.',
    },
    review_due: {
      label: 'REVIEW DUE: HORIZON REACHED',
      color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      desc: `Holding horizon (${plan.reviewSessions} sessions) reached. Evaluate thesis or execute time exit.`,
    },
    invalidated: {
      label: 'SETUP INVALIDATED',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      desc: 'Price fell below invalidation stop level or gap-up exceeded tolerance.',
    },
    expired: {
      label: 'EXPIRED UNFILLED',
      color: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      desc: 'Order validity window elapsed without reaching entry trigger.',
    },
  };

  const activeBadge = stateBadges[state] || stateBadges.watching;

  const quoteBadgeColor =
    quoteStatus === 'recent'
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      : quoteStatus === 'delayed'
      ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100">
      {/* ─── Top Header: Identity, Series & Price ──────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {symbol}
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              NSE: {series}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${quoteBadgeColor}`}>
              {quoteStatus} quote
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{companyName}</p>
        </div>

        <div className="text-right">
          <div className="text-xl font-extrabold text-slate-900 dark:text-white">
            {formatINR(currentPrice)}
          </div>
          <div
            className={`flex items-center justify-end gap-1 text-xs font-semibold ${
              changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
            }`}
          >
            {changePercent >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>
              {changePercent >= 0 ? '+' : ''}
              {changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>

      {/* ─── Strategy & Lifecycle State Badge ──────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Layers className="h-3.5 w-3.5 text-cyan-500" />
          <span>Strategy: <strong className="text-slate-800 dark:text-slate-200">{strategyVersion}</strong></span>
          {typeof revision === 'number' && (
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                revision > 1
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
              }`}
              title={parentSignalId ? `Revised from prior signal: ${parentSignalId}` : 'Original immutable snapshot'}
            >
              Revision: r{revision}{parentSignalId ? ' (revised)' : ' (original)'}
            </span>
          )}
          {signalType === 'WATCHLIST_OBSERVATION' && (
            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
              Unverified Watchlist
            </span>
          )}
          {immutableHash && (
            <span
              className="text-[10px] font-mono text-slate-400 dark:text-slate-500"
              title={`Snapshot Hash: ${immutableHash}`}
            >
              Hash: {immutableHash.substring(0, 8)}...
            </span>
          )}
        </div>
        <div className={`rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wide ${activeBadge.color}`}>
          {activeBadge.label}
        </div>
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 italic">
        {activeBadge.desc}
      </p>

      {/* ─── Qualifying Measurements Table ─────────────────────────────── */}
      <div className="mt-4 rounded-xl bg-slate-50 p-3.5 dark:bg-slate-800/40">
        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Qualifying Measurements vs Strategy Thresholds
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2.5 text-xs sm:grid-cols-4">
          <div className="rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-800/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">20d Resistance (R20)</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">₹{metrics.resistance20d.toFixed(2)}</div>
            <div className="text-[10px] text-emerald-500">
              {currentPrice >= metrics.resistance20d ? '✓ At/Above R20' : 'Building below R20'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-800/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">Volume Ratio (20d)</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">{metrics.volumeRatio.toFixed(2)}×</div>
            <div className={`text-[10px] ${metrics.volumeRatio >= 1.2 ? 'text-emerald-500' : 'text-amber-500'}`}>
              {metrics.volumeRatio >= 1.2 ? '✓ Meets 1.2×' : 'Missing (needs 1.2×)'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-800/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">5-Day Momentum</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">
              {metrics.momentum5dPct >= 0 ? '+' : ''}{metrics.momentum5dPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-emerald-500">
              {metrics.momentum5dPct > 0 ? '✓ Positive trend' : 'Flat/Negative'}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200/60 bg-white p-2 dark:border-slate-700/50 dark:bg-slate-800/80">
            <div className="text-[10px] text-slate-500 dark:text-slate-400">20d Median Turnover</div>
            <div className="font-bold text-slate-800 dark:text-slate-200">₹{metrics.turnoverCr.toFixed(1)} Cr</div>
            <div className="text-[10px] text-emerald-500">
              {metrics.turnoverCr >= 1.0 ? '✓ Liquid (>= ₹1 Cr)' : 'Illiquid'}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Conditional Trade Plan ─────────────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 dark:border-cyan-500/20 dark:bg-cyan-950/20">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            Conditional Trade Plan (1–5 Session Horizon)
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Reward/Risk: <strong className="text-cyan-500">{plan.rewardToRiskRatio.toFixed(1)}:1</strong>
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Entry Trigger (+0.25%)</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">₹{plan.entryTrigger.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">Valid: next {plan.validitySessions} sessions</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Target Scenario (+10.0%)</div>
            <div className="text-sm font-bold text-emerald-500">₹{plan.targetScenario.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">Gross price milestone</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Invalidation Stop</div>
            <div className="text-sm font-bold text-rose-500">₹{plan.invalidationStop.toFixed(2)}</div>
            <div className="text-[10px] text-slate-500">1.5× ATR14 anchor</div>
          </div>

          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">Review Deadline</div>
            <div className="text-sm font-bold text-purple-400">{plan.reviewSessions} Sessions</div>
            <div className="text-[10px] text-slate-500">Max holding limit: 5d</div>
          </div>
        </div>

        <div className="mt-2.5 rounded-lg bg-cyan-500/10 p-2 text-[11px] text-cyan-700 dark:text-cyan-300">
          <strong>Gap Rule:</strong> If session open exceeds ₹{plan.maxOpeningGap.toFixed(2)} (+2.5% chase), setup is automatically aborted.
        </div>
      </div>

      {/* ─── Portfolio Risk & Whole-Share Sizing ───────────────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-800/30">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Portfolio Allocation & Sizing (₹{portfolioSizing.portfolioCapital.toLocaleString('en-IN')} Base)
          </span>
          <span className="text-[11px] text-slate-500">
            Budget: 1% planned risk (₹{portfolioSizing.riskBudgetInr.toFixed(0)})
          </span>
        </div>

        <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-slate-700 dark:text-slate-300">
          <div className="rounded-lg bg-white p-2 shadow-2xs dark:bg-slate-800">
            <div className="text-[10px] text-slate-400">Proposed Quantity</div>
            <div className="text-base font-extrabold text-slate-900 dark:text-white">
              {calculatedShares} <span className="text-xs font-normal">shares</span>
            </div>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-2xs dark:bg-slate-800">
            <div className="text-[10px] text-slate-400">Planned Capital</div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {formatINR(allocatedAmount)}
            </div>
          </div>
          <div className="rounded-lg bg-white p-2 shadow-2xs dark:bg-slate-800">
            <div className="text-[10px] text-slate-400">Planned Risk</div>
            <div className="text-base font-bold text-rose-500">
              {formatINR(plannedRiskAmount)}
            </div>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          * Whole shares calculated by the tighter of risk budget and 1-of-3 portfolio slot (₹16,666). Adverse opening gaps and circuit locks can exceed the planned risk limit.
        </p>
      </div>

      {/* ─── Separate Longer-Hold Fundamental Assessment ───────────────── */}
      <div className="mt-4 rounded-xl border border-slate-200 p-3.5 text-xs dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Building2 className="h-4 w-4 text-slate-400" />
            <span className="font-semibold text-slate-900 dark:text-white">
              Longer-Hold Review (Company Fundamentals)
            </span>
          </div>
          <span
            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
              companyHold.status === 'supportive'
                ? 'bg-emerald-500/10 text-emerald-400'
                : companyHold.status === 'caution'
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {companyHold.label}
          </span>
        </div>

        <p className="mt-1.5 text-slate-600 dark:text-slate-400">
          {companyHold.reason}
        </p>

        {companyHold.checks && companyHold.checks.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setShowCompanyDetails(!showCompanyDetails)}
              className="flex items-center gap-1 text-[11px] font-semibold text-cyan-500 hover:text-cyan-400"
            >
              <span>{showCompanyDetails ? 'Hide fundamental checks' : 'View financial checks'}</span>
              {showCompanyDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showCompanyDetails && (
              <ul className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600 dark:bg-slate-800/50 dark:text-slate-400">
                {companyHold.checks.map(check => (
                  <li key={check.id} className="flex items-center justify-between">
                    <span>{check.label}:</span>
                    <span className="font-mono">
                      {check.observed !== null ? String(check.observed) : 'Unavailable'} ·{' '}
                      <strong className={check.status === 'pass' ? 'text-emerald-500' : 'text-rose-500'}>
                        {check.status.toUpperCase()}
                      </strong>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Action Bar ─────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Source: {quoteSource} · Observed: {new Date(quoteAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
        </div>

        <div className="flex items-center gap-2">
          {onAddToWatchlist && (
            <button
              onClick={onAddToWatchlist}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <BookmarkPlus className="h-3.5 w-3.5" />
              <span>Watchlist</span>
            </button>
          )}

          {onCreatePaperPlan && (
            <button
              onClick={onCreatePaperPlan}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 font-semibold text-white shadow-xs transition-colors hover:bg-cyan-500"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Save Paper Plan</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Adapter helper to transform an immutable DecisionSignal record into DecisionCardProps
 */
export function decisionSignalToCardProps(
  signal: DecisionSignal,
  callbacks?: { onAddToWatchlist?: () => void; onCreatePaperPlan?: () => void }
): DecisionCardProps {
  return {
    symbol: signal.symbol,
    companyName: signal.companyName,
    series: signal.series,
    currentPrice: signal.referencePrice,
    changePercent: signal.metrics.momentum5dPct,
    quoteAsOf: signal.dataCutoff,
    quoteSource: signal.quoteSource,
    quoteStatus: signal.quoteStatus,
    state: signal.state,
    strategyVersion: signal.strategyVersion,
    signalId: signal.id,
    revision: signal.revision,
    parentSignalId: signal.parentSignalId,
    immutableHash: signal.immutableHash,
    signalType: signal.signalType,
    metrics: signal.metrics,
    plan: signal.conditions,
    portfolioSizing: signal.sizing,
    companyHold: {
      status: signal.companyHoldAssessment.status,
      label: signal.companyHoldAssessment.label,
      reason: signal.companyHoldAssessment.reason,
    },
    onAddToWatchlist: callbacks?.onAddToWatchlist,
    onCreatePaperPlan: callbacks?.onCreatePaperPlan,
  };
}
