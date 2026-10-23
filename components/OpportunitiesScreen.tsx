'use client';


import { axionFetch as fetch } from '../lib/in-process';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Target, RefreshCw, Search, ChevronDown, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Compass, AlertOctagon } from 'lucide-react';
import type { OpportunitiesResponse, OpportunityHorizon, ShareOpportunity } from '../lib/opportunity-types';
import TomorrowMarketOutlookWidget from './TomorrowMarketOutlook';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';

const rupees = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
const dateLabel = (value: string) => value.includes('T') ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : value + ' close';

function OpportunityCard({ 
  item, 
  horizon, 
  onTrade 
}: { 
  item: ShareOpportunity; 
  horizon: OpportunityHorizon;
  onTrade?: (item: ShareOpportunity, entry: number, targetPct: number, stopPct: number) => void;
}) {
  const [buyInput, setBuyInput] = useState(item.reference.toFixed(2));
  const buy = Number(buyInput);
  const validBuy = /^\d+(\.\d{1,2})?$/.test(buyInput) && Number.isFinite(buy) && buy > 0 && buy <= 1000000000;
  const isShort = item.direction === 'SHORT';
  const entry = validBuy ? buy : item.reference;

  // Multi-tier targets from item or calculated
  const baseTiers = item.targetTiers && item.targetTiers.length >= 3 ? item.targetTiers : [
    { tier: 'T1' as const, label: 'Quick Scalp', price: isShort ? Number((item.reference * 0.98).toFixed(2)) : Number((item.reference * 1.02).toFixed(2)), returnPct: 2.0 },
    { tier: 'T2' as const, label: 'Key Swing', price: isShort ? Number((item.reference * 0.94).toFixed(2)) : Number((item.reference * 1.06).toFixed(2)), returnPct: 6.0 },
    { tier: 'T3' as const, label: 'Extended Runner', price: isShort ? Number((item.reference * 0.85).toFixed(2)) : Number((item.reference * 1.15).toFixed(2)), returnPct: 15.0 },
  ];

  const t1Pct = baseTiers[0]?.returnPct ?? 2.0;
  const t2Pct = baseTiers[1]?.returnPct ?? 6.0;
  const t3Pct = baseTiers[2]?.returnPct ?? (item.maxPotentialPct ?? 15.0);
  const maxPotential = item.maxPotentialPct ?? t3Pct;

  const t1Price = isShort ? Math.round(entry * (100 - t1Pct)) / 100 : Math.round(entry * (100 + t1Pct)) / 100;
  const t2Price = isShort ? Math.round(entry * (100 - t2Pct)) / 100 : Math.round(entry * (100 + t2Pct)) / 100;
  const t3Price = isShort ? Math.round(entry * (100 - t3Pct)) / 100 : Math.round(entry * (100 + t3Pct)) / 100;
  const stopPct = t1Pct;
  const stopPrice = isShort ? Math.round(entry * (100 + stopPct)) / 100 : Math.round(entry * (100 - stopPct)) / 100;

  const hasWarnings = (item.liquidityAudit?.warnings?.length ?? 0) > 0;

  return <article className="relative group rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-7 shadow-xl shadow-indigo-900/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
    {/* Colored Edge Highlight */}
    <div className={`absolute top-0 left-0 bottom-0 w-2.5 ${isShort ? 'bg-rose-500' : 'bg-emerald-500'}`} />
    <div className={`absolute -right-20 -bottom-20 w-64 h-64 rounded-full blur-3xl opacity-15 transition-all duration-700 pointer-events-none group-hover:scale-125 ${isShort ? 'bg-rose-500' : 'bg-emerald-500'}`} />
    
    <div className="flex flex-wrap items-start justify-between gap-4 relative z-10 pl-2">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-xs ${
            isShort
              ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isShort ? 'bg-rose-400' : 'bg-emerald-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isShort ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            </span>
            {isShort ? 'SHORT / BUY PE' : 'LONG BREAKOUT'}
          </span>
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">{item.status}</span>
          
          {/* Multi-Horizon Potential Badge */}
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
            maxPotential >= 12
              ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30'
              : maxPotential >= 5
              ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30'
              : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
          }`}>
            <span>⚡ Max Potential: {isShort ? '-' : '+'}{maxPotential.toFixed(1)}%</span>
            <span className="text-[9px] opacity-75 font-normal">
              ({maxPotential >= 12 ? 'Runner' : maxPotential >= 5 ? 'Swing' : 'Scalp'})
            </span>
          </span>

          {item.liquidityAudit && (
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              item.liquidityAudit.badgeColor === 'emerald'
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                : item.liquidityAudit.badgeColor === 'rose'
                ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20'
            }`}>
              {item.liquidityAudit.isLiquid ? <ShieldCheck size={12} /> : <AlertTriangle size={12} />}
              {item.liquidityAudit.label}
            </span>
          )}

          {/* Book Masters Quantitative Prediction Signals */}
          {item.bookMasterSignals?.badges?.map((badge, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30"
            >
              <span>⭐ {badge}</span>
            </span>
          ))}
          {item.bookMasterSignals?.riskWarnings?.map((warning, idx) => (
            <span
              key={`warn-${idx}`}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30"
            >
              <AlertTriangle size={11} />
              <span>{warning}</span>
            </span>
          ))}
        </div>
        <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm font-mono">{item.ticker}</h2>
        <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">{item.name}</p>
      </div>
      <div className="text-right flex flex-col items-end gap-2.5">
        <div>
          <p className={`text-4xl sm:text-5xl font-black tracking-tighter drop-shadow-md font-mono ${isShort ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {item.estimate === null ? `${item.evidenceCount}/4` : `${item.estimate.toFixed(1)}%`}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1.5">{item.estimate === null ? 'Momentum triggers' : isShort ? 'Breakdown conviction' : 'Model conviction'}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTrade?.(item, entry, t2Pct, stopPct);
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer ${
            isShort 
              ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20' 
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
          title={`1-Click Trade ${item.ticker}`}
        >
          <span>Price Scenario</span>
        </button>
      </div>
    </div>

    {/* Book Masters Confluence Banner */}
    {item.bookMasterSignals && (item.bookMasterSignals.badges.length > 0 || item.bookMasterSignals.riskWarnings.length > 0) && (
      <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-500 dark:text-amber-300 font-bold text-[10px] uppercase tracking-wider border border-amber-500/30 shrink-0">
            Book Master Signal
          </span>
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate">
            {item.bookMasterSignals.weinsteinStage === 'STAGE_2_ADVANCING'
              ? "Institutional Stage-2 Advance (Weinstein) with O'Neil Pivot Expansion."
              : item.bookMasterSignals.weinsteinStage === 'STAGE_4_DECLINING'
              ? 'Stage-4 Overhead Resistance — Strictly enforce 8% hard cut.'
              : 'Base building phase detected.'}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] shrink-0">
          <span className="text-rose-600 dark:text-rose-400 font-bold">8% Cut: ₹{item.bookMasterSignals.hardCutStopPrice}</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">20% Target: ₹{item.bookMasterSignals.extendedTargetPrice}</span>
        </div>
      </div>
    )}

    {/* Dedicated Warning Alert Box if Liquidity / Circuit issues are flagged */}
    {hasWarnings && (
      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200 shadow-sm">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
          <AlertTriangle size={14} className="shrink-0" />
          <span>Tradability & Execution Warning</span>
        </div>
        <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-4">
          {item.liquidityAudit!.warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Prominent Historical Snapshot Warning if data is not from today */}
    {item.status === 'Historical snapshot' && (
      <div className="mt-4 rounded-2xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/40 p-3.5 text-xs text-amber-900 dark:text-amber-200 shadow-sm">
        <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
          <AlertTriangle size={14} className="shrink-0 text-amber-600" />
          <span>Historical Reference Snapshot — Verify Current Price</span>
        </div>
        <p className="mt-1 leading-relaxed text-[11px] text-amber-900/90 dark:text-amber-200/90">
          This setup was recorded on <strong>{item.asOf}</strong> with reference price <strong>₹{item.reference.toFixed(2)}</strong>. If today’s market price has moved significantly away, this historical setup is <strong>expired</strong>. To evaluate today’s price levels, enter your current live price in the planner below.
        </p>
      </div>
    )}

    {/* Options Contract Overlay Strip (if available) */}
    {item.optionsRecommendation && (
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200/80 bg-indigo-50/70 p-3.5 text-xs dark:border-indigo-900/60 dark:bg-indigo-950/40 shadow-xs">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white shadow-xs ${isShort ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            {item.optionsRecommendation.optionType} OPTION
          </span>
          <span className="font-bold font-mono text-slate-900 dark:text-white">
            {item.optionsRecommendation.symbolFormatted}
          </span>
          <span className="text-slate-500">Lot {item.optionsRecommendation.lotSize}</span>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span>Prem: <strong>₹{item.optionsRecommendation.estimatedPremium.toFixed(2)}</strong></span>
          <span>Target: <strong className="text-emerald-700 dark:text-emerald-300">₹{item.optionsRecommendation.targetPremium.toFixed(2)} (+{item.optionsRecommendation.expectedRoiPct}%)</strong></span>
          <span>Stop: <strong className="text-rose-700 dark:text-rose-300">₹{item.optionsRecommendation.stopPremium.toFixed(2)} (-{item.optionsRecommendation.maxRiskPct}%)</strong></span>
        </div>
      </div>
    )}

    {item.entryCondition && <div className="mt-4 flex flex-wrap gap-2 text-xs">
      <span className={`rounded-xl px-3 py-1 font-medium ${isShort ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/40 dark:border-rose-900/40' : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/40 dark:border-blue-900/40'}`}>
        {item.entryCondition}
      </span>
      {item.deadline && <span className="rounded-xl bg-slate-100 dark:bg-slate-800 px-3 py-1 font-medium text-slate-700 dark:text-slate-300 border border-slate-200/40 dark:border-slate-700/40">{item.deadline}</span>}
      {item.calibrationStatus && <span className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 font-medium text-emerald-700 dark:text-emerald-300 border border-emerald-200/40 dark:border-emerald-900/40">{item.calibrationStatus}</span>}
    </div>}

    {/* ─── 3-TIER MULTI-HORIZON PROFIT TARGET LADDER ─── */}
    <div className="mt-4 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-gradient-to-r from-slate-50 via-indigo-50/25 to-slate-50 dark:from-slate-950/70 dark:via-indigo-950/30 dark:to-slate-950/70 p-4 sm:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-indigo-500 animate-spin-slow" />
          Multi-Tier Profit Targets (Scale-Out Strategy)
        </span>
        <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
          ⚡ Max Potential: {isShort ? '-' : '+'}{maxPotential.toFixed(1)}%
        </span>
      </div>

      {/* Visual Roadmap Connecting Track */}
      <div className="relative mb-3.5 px-3 hidden sm:block">
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${
            isShort
              ? 'bg-gradient-to-r from-rose-500 via-amber-500 to-purple-500 w-full'
              : 'bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 w-full'
          }`} />
        </div>
        <div className="flex justify-between -mt-2">
          <span className="h-3 w-3 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900 shadow-sm" />
          <span className="h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 shadow-sm" />
          <span className="h-3 w-3 rounded-full bg-purple-500 ring-4 ring-white dark:ring-slate-900 shadow-sm" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 text-center">
        <div className="rounded-2xl border border-blue-200/80 bg-white/90 dark:border-blue-900/50 dark:bg-slate-900/80 p-3 shadow-xs interactive-lift">
          <div className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            T1 Scalp
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white mt-1">{validBuy ? rupees(t1Price) : '—'}</div>
          <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5">{isShort ? '-' : '+'}{t1Pct.toFixed(1)}% (Book 50%)</div>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-white/90 dark:border-emerald-900/50 dark:bg-slate-900/80 p-3 shadow-xs interactive-lift">
          <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            T2 Key Swing
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white mt-1">{validBuy ? rupees(t2Price) : '—'}</div>
          <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{isShort ? '-' : '+'}{t2Pct.toFixed(1)}% (Book 30%)</div>
        </div>

        <div className="rounded-2xl border border-purple-200/80 bg-white/90 dark:border-purple-900/50 dark:bg-slate-900/80 p-3 shadow-xs interactive-lift">
          <div className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase tracking-wide flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            T3 Runner
          </div>
          <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white mt-1">{validBuy ? rupees(t3Price) : '—'}</div>
          <div className="text-[10px] font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{isShort ? '-' : '+'}{t3Pct.toFixed(1)}% (Trail 20%)</div>
        </div>
      </div>
    </div>

    {/* ─── AI TRADING BLUEPRINT: WHEN TO ENTER & WHEN TO EXIT ─── */}
    <div className="my-4 rounded-3xl border border-slate-200/90 dark:border-slate-800/90 bg-slate-50/70 dark:bg-slate-950/50 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 dark:border-slate-800/60 pb-2.5">
        <span className="text-xs font-bold font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-500" />
          AI Execution Blueprint: Entry & Exit Instructions
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          AUTOMATED RULES
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* WHEN TO ENTER */}
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-950/20 p-3.5">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs uppercase tracking-wider mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>When To Enter ({isShort ? 'Sell Short' : 'Buy Long'})</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>
                <strong>Entry Zone:</strong> Between{' '}
                <strong className="text-emerald-700 dark:text-emerald-300">
                  {rupees(entry)} – {rupees(isShort ? entry * 0.995 : entry * 1.006)}
                </strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>
                <strong>Timing Window:</strong> Anytime during market hours (09:15 AM – 03:15 PM IST) while within Entry Zone (09:15–09:30 AM open is optimal)
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>
                <strong>Price Rule:</strong> Enter anytime price is within zone; skip if price has already moved &gt; 1.5% away from planned entry
              </span>
            </li>
          </ul>
        </div>

        {/* WHEN TO EXIT */}
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 dark:border-rose-800/50 dark:bg-rose-950/20 p-3.5">
          <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-extrabold text-xs uppercase tracking-wider mb-2">
            <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>When To Exit (Multi-Tier Targets & Protective Cut)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-1.5">
              <span className="text-blue-600 font-bold">•</span>
              <span>
                <strong>T1 Quick Scalp (50% size):</strong> Exit at{' '}
                <strong className="text-blue-700 dark:text-blue-300">{validBuy ? rupees(t1Price) : '—'} ({isShort ? '-' : '+'}{t1Pct.toFixed(1)}%)</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-emerald-600 font-bold">•</span>
              <span>
                <strong>T2 Key Swing (30% size):</strong> Exit at{' '}
                <strong className="text-emerald-700 dark:text-emerald-300">{validBuy ? rupees(t2Price) : '—'} ({isShort ? '-' : '+'}{t2Pct.toFixed(1)}%)</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-purple-600 font-bold">•</span>
              <span>
                <strong>T3 Extended Runner (20% size):</strong> Trail to{' '}
                <strong className="text-purple-700 dark:text-purple-300">{validBuy ? rupees(t3Price) : '—'} ({isShort ? '-' : '+'}{t3Pct.toFixed(1)}%)</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-rose-600 font-bold">•</span>
              <span>
                <strong>Stop Loss:</strong> Cut immediately at{' '}
                <strong className="text-rose-700 dark:text-rose-300">{validBuy ? rupees(stopPrice) : '—'} ({isShort ? '+' : '-'}{stopPct.toFixed(1)}%)</strong>
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-indigo-600 font-bold">•</span>
              <span>
                <strong>Trailing Rule:</strong> Move stop loss to Breakeven once T1 is hit to lock risk-free trade.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-amber-600 font-bold">•</span>
              <span>
                <strong>Time Stop:</strong> Exit by <strong>15:15 IST</strong> if neither target nor stop hit
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    {/* Execution Planner Grid (Multi-Tier Aware) */}
    <div className={`my-4 rounded-2xl border p-4 sm:p-5 ${isShort ? 'border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/20' : 'border-indigo-200/80 bg-indigo-50/40 dark:border-indigo-800/50 dark:bg-indigo-950/20'}`}>
      <h3 className="mb-3 text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {isShort ? 'Short Execution & Multi-Tier Cover Planner' : 'Buy / Sell Multi-Tier Price Planner'}
      </h3>
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="rounded-2xl bg-white dark:bg-slate-950 p-3 border border-slate-200/60 dark:border-slate-800 shadow-xs">
          <span className={`text-[11px] font-bold ${isShort ? 'text-rose-700 dark:text-rose-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
            {isShort ? 'SELL SHORT AT (₹)' : 'BUY AT (₹)'}
          </span>
          <input aria-label={`Price for ${item.ticker}`} aria-invalid={!validBuy} inputMode="decimal" value={buyInput} onChange={e => setBuyInput(e.target.value)} className={`mt-1.5 w-full min-w-0 rounded-xl border bg-transparent p-2 text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${isShort ? 'border-rose-200 dark:border-rose-800' : 'border-indigo-200 dark:border-indigo-800'}`} />
          <span className="mt-0.5 block text-[10px] text-slate-400">Planned entry price</span>
        </label>
        <div className="rounded-2xl bg-blue-500/10 dark:bg-blue-950/50 p-3 border border-blue-500/20 shadow-xs">
          <p className="text-[11px] font-bold text-blue-800 dark:text-blue-300">
            {isShort ? `T1 COVER (-${t1Pct}%)` : `T1 TARGET (+${t1Pct}%)`}
          </p>
          <p aria-live="polite" className="mt-1.5 break-words text-lg font-bold font-mono text-blue-800 dark:text-blue-300">{validBuy ? rupees(t1Price) : '—'}</p>
          <p className="mt-0.5 text-[10px] text-blue-700 dark:text-blue-400">Quick scalp (50% size)</p>
        </div>
        <div className="rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/50 p-3 border border-emerald-500/20 shadow-xs">
          <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            {isShort ? `T2 COVER (-${t2Pct}%)` : `T2 SWING (+${t2Pct}%)`}
          </p>
          <p aria-live="polite" className="mt-1.5 break-words text-lg font-bold font-mono text-emerald-800 dark:text-emerald-300">{validBuy ? rupees(t2Price) : '—'}</p>
          <p className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">Key swing (30% size)</p>
        </div>
        <div className="rounded-2xl bg-purple-500/10 dark:bg-purple-950/50 p-3 border border-purple-500/20 shadow-xs">
          <p className="text-[11px] font-bold text-purple-800 dark:text-purple-300">
            {isShort ? `T3 RUNNER (-${t3Pct}%)` : `T3 RUNNER (+${t3Pct}%)`}
          </p>
          <p aria-live="polite" className="mt-1.5 break-words text-lg font-bold font-mono text-purple-800 dark:text-purple-300">{validBuy ? rupees(t3Price) : '—'}</p>
          <p className="mt-0.5 text-[10px] text-purple-700 dark:text-purple-400">Extended trail (20%)</p>
        </div>
        <div className="rounded-2xl bg-rose-500/10 dark:bg-rose-950/50 p-3 border border-rose-500/20 shadow-xs">
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-300">
            {isShort ? `STOP (+${stopPct}%)` : `STOP (−${stopPct}%)`}
          </p>
          <p className="mt-1.5 break-words text-lg font-bold font-mono text-rose-700 dark:text-rose-300">{validBuy ? rupees(stopPrice) : '—'}</p>
          <p className="mt-0.5 text-[10px] text-rose-700 dark:text-rose-400">Defensive stop cut</p>
        </div>
      </div>
      {!validBuy ? <p role="alert" className="mt-3 text-sm text-red-600">Enter a positive price with up to two decimal places.</p> : <p className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">
        {isShort ? `If sold short at ${rupees(entry)}, T1 cover is ${rupees(t1Price)} (-${t1Pct}%), T2 is ${rupees(t2Price)} (-${t2Pct}%), and max runner T3 is ${rupees(t3Price)} (-${t3Pct}%).` : `If bought at ${rupees(entry)}, T1 target is ${rupees(t1Price)} (+${t1Pct}%), T2 is ${rupees(t2Price)} (+${t2Pct}%), and max runner T3 is ${rupees(t3Price)} (+${t3Pct}%).`}
      </p>}
      <div className="mt-2.5 flex items-center justify-between">
        <button className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer" onClick={() => setBuyInput(item.reference.toFixed(2))}>Reset to reference price</button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTrade?.(item, entry, t2Pct, stopPct);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm cursor-pointer"
        >
          <span>View Scenario</span>
        </button>
      </div>
    </div>

    <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.summary}</p>
    <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500 font-mono">Data as of {dateLabel(item.asOf)}</p>
    <details className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-4 group/details">
      <summary className="flex cursor-pointer items-center justify-between text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
        <span>Full explanation & risks</span>
        <ChevronDown size={16} className="transition-transform group-open/details:rotate-180" />
      </summary>
      <div className="mt-5 space-y-5 text-sm">
        <section><h3 className="mb-2 font-semibold text-emerald-700 dark:text-emerald-400">What supports the setup</h3>
          {item.positives.length ? <ul className="list-disc space-y-2 pl-5">{item.positives.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>No supporting evidence was recorded.</p>}</section>
        <section><h3 className="mb-2 font-semibold text-amber-700 dark:text-amber-400">What could prevent the move</h3><ul className="list-disc space-y-2 pl-5">{item.risks.map((s, i) => <li key={i}>{s}</li>)}</ul></section>
        <dl className="grid grid-cols-2 gap-3">{item.metrics.map(m => <div key={m.label} className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 border border-slate-200/60 dark:border-slate-800"><dt className="text-[11px] text-slate-400 font-mono">{m.label}</dt><dd className="mt-1 font-bold text-slate-900 dark:text-white font-mono">{m.value}</dd></div>)}</dl>
        {item.catalyst && <section><h3 className="mb-2 font-semibold">Recorded news context</h3><p>{item.catalyst}</p><p className="mt-2 text-xs text-gray-500">Snapshot context; headline freshness and causality are not verified.</p></section>}
      </div>
    </details>
  </article>;
}

export default function OpportunitiesScreen() {
  const [horizon, setHorizon] = useState<OpportunityHorizon>('next');
  const [universe, setUniverse] = useState<'curated' | 'full'>('curated');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'LONG' | 'SHORT'>('all');
  const [potentialFilter, setPotentialFilter] = useState<'all' | 'scalp' | 'swing' | 'runner'>('all');
  const [result, setResult] = useState<OpportunitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [minimum, setMinimum] = useState(0);
  const [tradabilityFilter, setTradabilityFilter] = useState<'all' | 'verified_only' | 'warnings_only'>('all');
  const [refresh, setRefresh] = useState(0);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [tradeOpportunity, setTradeOpportunity] = useState<{
    item: ShareOpportunity;
    entry: number;
    targetPct: number;
    stopPct: number;
  } | null>(null);

  const handleTrade = (item: ShareOpportunity, entry: number, targetPct: number, stopPct: number) => {
    playTargetChime();
    setTradeOpportunity({ item, entry, targetPct, stopPct });
  };

  // Auto-refresh countdown for intraday active tracking
  useEffect(() => {
    if (!autoRefresh || horizon !== 'today') return;
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setRefresh(n => n + 1);
          return 30;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, horizon]);

  // Keep track of parameters to distinguish initial / parameter change from auto-refresh
  const prevParamsRef = useRef({ horizon, universe });

  useEffect(() => {
    const isParamChange = prevParamsRef.current.horizon !== horizon || prevParamsRef.current.universe !== universe;
    prevParamsRef.current = { horizon, universe };

    const controller = new AbortController();
    let active = true;

    // Only blank out the UI / show full screen loader on initial mount or when user changes horizon/universe
    if (!result || isParamChange) {
      setLoading(true);
      setError('');
      setResult(null);
    } else {
      setIsRefreshing(true);
    }

    const timeout = setTimeout(() => controller.abort(), 15000);
    const forceParam = refresh > 0 ? '&refresh=true' : '';
    fetch(`/api/opportunities?horizon=${horizon}&universe=${universe}${forceParam}&_t=${Date.now()}`, { signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'Unable to load shares.');
        return json as OpportunitiesResponse;
      })
      .then(data => {
        if (active) {
          setResult(data);
          setError('');
        }
      })
      .catch(e => {
        if (active) {
          const errMsg = controller.signal.aborted ? 'Request timed out. Please retry.' : e.message;
          if (!result || isParamChange) {
            setError(errMsg);
          }
        }
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) {
          setLoading(false);
          setIsRefreshing(false);
        }
      });
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horizon, universe, refresh]);

  const rows = useMemo(() => (result?.data || []).filter(p => {
    const matchQuery = `${p.ticker} ${p.name}`.toLowerCase().includes(query.toLowerCase());
    const matchMin = horizon === 'today' || (p.estimate ?? 0) >= minimum;
    let matchTradability = true;
    if (tradabilityFilter === 'verified_only') {
      matchTradability = p.liquidityAudit?.isLiquid === true;
    } else if (tradabilityFilter === 'warnings_only') {
      matchTradability = (p.liquidityAudit?.warnings?.length ?? 0) > 0;
    }
    const matchDirection = directionFilter === 'all' || p.direction === directionFilter;
    const potPct = p.maxPotentialPct ?? (p.targetTiers?.[2]?.returnPct ?? 15);
    const matchPotential = potentialFilter === 'all' || p.potentialCategory === potentialFilter || (
      potentialFilter === 'scalp' ? potPct <= 4 :
      potentialFilter === 'swing' ? (potPct > 4 && potPct < 10) :
      potPct >= 10
    );
    return matchQuery && matchMin && matchTradability && matchDirection && matchPotential;
  }), [result, query, minimum, horizon, tradabilityFilter, directionFilter, potentialFilter]);

  return <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in duration-300">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20 backdrop-blur-xl">
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <Target className="absolute -right-5 -top-5 h-48 w-48 text-cyan-400/10 pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Dual-Direction Opportunities</span>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Two-Way Market Opportunities<span className="text-cyan-400">.</span></h1>
        <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
          Monetize both market directions: Long Breakouts & Bearish Breakdown / Put Option setups with dynamic multi-tier profit targets (Quick Scalp 1.5–3.5%, Key Swing 4.5–9%, Extended Runner 10–28%+).
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2.5">
            {(['next', 'today'] as const).map(tab => (
              <button
                key={tab}
                aria-pressed={horizon === tab}
                onClick={() => {
                  setHorizon(tab);
                  setCountdown(30);
                }}
                className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                  horizon === tab 
                    ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-400/25 scale-[1.02]' 
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {tab === 'next' ? 'Next trading day' : 'Current day'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-2xl border border-white/15">
            <button
              onClick={() => setUniverse('curated')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                universe === 'curated'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/25'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Curated Liquid (~10)
            </button>
            <button
              onClick={() => setUniverse('full')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                universe === 'full'
                  ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/25'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Full Universe (5,055 Stocks)
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Tomorrow's Broad Market Outlook Forecast */}
    <TomorrowMarketOutlookWidget />

    {/* Dedicated Scan Coverage & Quote Freshness Real-Time Bar */}
    {result?.scanCoverage && (
      <div className="rounded-3xl border border-indigo-500/20 bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-cyan-950/60 p-4 sm:p-5 text-xs text-slate-200 shadow-xl backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${result.quoteAgeSummary?.isMarketOpen ? 'bg-emerald-400' : 'bg-cyan-400'}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${result.quoteAgeSummary?.isMarketOpen ? 'bg-emerald-500' : 'bg-cyan-500'}`} />
            </span>
            <div>
              <p className="font-bold text-sm text-white flex items-center gap-2">
                <span>{result.scanCoverage.universeName}</span>
                <span className="rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] font-mono text-cyan-300">
                  {result.scanCoverage.scanned} of {result.scanCoverage.requestedUniverse} Stocks Evaluated
                </span>
              </p>
              <p className="text-[11px] text-slate-300 font-mono mt-1">
                {horizon === 'today'
                  ? `${result.scanCoverage.condition4Count ?? 0} stocks meet 4/4 momentum triggers · ${result.scanCoverage.condition3Count ?? 0} meet 3/4 · Full-universe selection unconstrained`
                  : `${result.scanCoverage.scanned} stocks scored from official Bhavcopy · Dual-direction breakouts & breakdowns`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {result.quoteAgeSummary && (
              <div className="rounded-2xl border border-slate-700/60 bg-slate-800/80 px-3 py-1.5 font-mono text-[11px] flex items-center gap-2">
                <Clock size={13} className="text-cyan-400" />
                <span>
                  Quote Age: <strong className="text-white">{result.quoteAgeSummary.averageAgeMinutes}m</strong> ({dateLabel(result.quoteAgeSummary.latestQuoteTime)})
                </span>
              </div>
            )}
            {horizon === 'today' && (
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 font-mono text-[11px] font-bold transition cursor-pointer ${
                  autoRefresh
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                    : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
                title={autoRefresh ? 'Click to pause automatic 30s refresh' : 'Click to resume automatic 30s refresh'}
              >
                <span className={`h-2 w-2 rounded-full ${autoRefresh ? (isRefreshing ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse') : 'bg-slate-500'}`} />
                {autoRefresh ? (isRefreshing ? 'Updating live quotes…' : `Auto-refresh: ${countdown}s`) : 'Auto-refresh: Paused'}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Liquidity & Circuit Risk Notice Guard */}
    <div className="flex items-start gap-3.5 rounded-3xl border border-amber-300/60 bg-amber-50/80 p-4 sm:p-5 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 shadow-sm backdrop-blur-md">
      <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      <div>
        <span className="font-bold uppercase tracking-wider">Liquidity & Circuit Protection Guard Active: </span>
        Penny stocks (&lt; ₹20), low daily turnover (&lt; ₹10 Cr), and circuit-prone shares carry severe execution slippage and trapped capital risks (orders cannot exit if locked in lower circuits). Each setup is audited with live Tradability health tags. Stocks can legitimately repeat across scans when sustained momentum and VWAP support persist.
      </div>
    </div>

    <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-3xl shadow-xl">
      <label className="flex min-w-48 flex-1 items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-1 dark:border-slate-700/60 dark:bg-slate-800/60">
        <Search size={17} className="text-slate-400" />
        <input aria-label="Search shares" placeholder="Search shares…" value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent py-2.5 text-xs font-semibold outline-none text-slate-900 dark:text-white" />
      </label>
      
      {/* Direction Filter */}
      <select aria-label="Direction Filter" value={directionFilter} onChange={e => setDirectionFilter(e.target.value as any)} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2.5 px-3.5 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 cursor-pointer">
        <option value="all">All Directions (Long & Short)</option>
        <option value="LONG">🟢 Long Breakouts</option>
        <option value="SHORT">🔴 Short / PE Setups</option>
      </select>

      {/* Return Potential Filter */}
      <select aria-label="Return Potential Filter" value={potentialFilter} onChange={e => setPotentialFilter(e.target.value as any)} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2.5 px-3.5 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 cursor-pointer">
        <option value="all">🎯 All Upside Potentials (1.5% – 28%+)</option>
        <option value="scalp">⚡ Quick Scalp (1.5% – 3.5%)</option>
        <option value="swing">📈 Swing Targets (4.5% – 9%)</option>
        <option value="runner">🚀 Extended Runners (10% – 28%+)</option>
      </select>

      {horizon === 'next' && <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">Min estimate <select aria-label="Minimum model estimate" value={minimum} onChange={e => setMinimum(Number(e.target.value))} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2 px-3 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200"><option value={0}>All</option><option value={20}>20%</option><option value={50}>50%</option><option value={70}>70%</option></select></label>}
      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2">Tradability <select aria-label="Tradability Filter" value={tradabilityFilter} onChange={e => setTradabilityFilter(e.target.value as any)} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2 px-3 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200"><option value="all">All Setups</option><option value="verified_only">🛡️ Verified Liquid Only</option><option value="warnings_only">⚠️ With Warnings Only</option></select></label>
      <button
        disabled={loading || isRefreshing}
        onClick={() => {
          setCountdown(30);
          setRefresh(n => n + 1);
        }}
        className="flex items-center gap-2 rounded-2xl border border-slate-200/80 px-4 py-2.5 text-xs font-bold disabled:opacity-50 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <RefreshCw size={14} className={loading || isRefreshing ? 'animate-spin text-cyan-500' : ''} />
        {isRefreshing ? 'Updating…' : 'Refresh'}
      </button>
    </div>
    {loading && <p role="status" className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-8 text-center text-xs font-mono text-slate-500 shadow-xl">Loading {horizon === 'today' ? 'current-session quotes' : 'recorded model estimates'}…</p>}
    {error && !loading && <p role="alert" className="rounded-3xl bg-red-500/10 border border-red-500/20 p-5 text-xs font-bold text-red-700 dark:text-red-300 shadow-sm">{error}</p>}
    {result && !loading && <>
      <section className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4 sm:p-5 text-xs leading-6 text-cyan-950 dark:text-cyan-200 backdrop-blur-sm"><p className="font-medium">{result.explanation}</p><p className="mt-1 font-mono text-[11px] text-cyan-600 dark:text-cyan-400">{result.coverage}</p></section>
      <div className="flex items-center justify-between text-xs font-mono text-slate-400"><p>{rows.length} shares shown</p><ArrowUpRight size={16} /></div>
      {rows.length ? <div className="grid gap-6 lg:grid-cols-2">{rows.map(item => <OpportunityCard key={`${item.ticker}-${item.asOf}`} item={item} horizon={horizon} onTrade={handleTrade} />)}</div> : <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-12 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl"><h2 className="font-bold text-slate-800 dark:text-white">No matching opportunities</h2><p className="mt-2 text-xs text-slate-500">{horizon === 'today' ? 'The market may be closed, quotes may be unavailable or stale, or your search has no matches. Refresh during an active session.' : 'Try a lower minimum estimate, clear the direction or tradability filter, or search another share.'}</p></div>}
      <p className="text-[11px] leading-5 text-slate-400 dark:text-slate-500 font-mono">Source: {result.source}. Retrieved {dateLabel(result.fetchedAt)}. Refresh reloads available data; it does not train or run the prediction model.</p>
    </>}

    {/* 1-Click Quick Trade Modal */}
    {tradeOpportunity && (
      <QuickTradeModal
        isOpen={!!tradeOpportunity}
        onClose={() => setTradeOpportunity(null)}
        ticker={tradeOpportunity.item.ticker}
        name={tradeOpportunity.item.name}
        currentPrice={tradeOpportunity.entry}
        initialTargetPct={tradeOpportunity.targetPct}
        initialStopLossPct={tradeOpportunity.stopPct}
      />
    )}
  </div>;
}
