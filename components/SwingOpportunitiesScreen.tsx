'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useMemo, useState } from 'react';
import { 
  TrendingUp, 
  Target, 
  ShieldAlert, 
  Clock, 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Activity,
  BarChart3,
  Star,
  Bell
} from 'lucide-react';
import type { 
  SwingOpportunity, 
  SwingOpportunitiesResponse, 
  SwingStatus 
} from '../lib/swing-opportunity-types';
import { useStockContext } from '../context/StockContext';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);

function SwingCard({ 
  opp, 
  onTrade,
  isInWatchlist,
  onToggleWatchlist,
  onDispatchAlert,
}: { 
  opp: SwingOpportunity;
  onTrade?: (opp: SwingOpportunity, entry: number, targetPct: number, stopPct: number) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onDispatchAlert?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [customFillInput, setCustomFillInput] = useState<string>(opp.triggerPrice.toFixed(2));
  
  const customFill = parseFloat(customFillInput);
  const isValidFill = !isNaN(customFill) && customFill > 0;
  const plannedTarget = isValidFill ? Math.round(customFill * 1.10 * 100) / 100 : opp.targetPrice;
  const plannedStop = isValidFill ? Math.round(Math.max(customFill * 0.95, opp.stopPrice) * 100) / 100 : opp.stopPrice;
  const plannedStopPct = isValidFill ? Math.round(((plannedStop - customFill) / customFill) * 1000) / 10 : opp.stopDistancePct;

  const statusBadge = (status: SwingStatus) => {
    switch (status) {
      case 'watching':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"><Clock size={12} /> Watching (Valid 3d)</span>;
      case 'active':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"><Activity size={12} /> Active Swing</span>;
      case 'target_hit':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle2 size={12} /> Target Hit (+10%)</span>;
      case 'stopped':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"><ShieldAlert size={12} /> Invalidation Hit</span>;
      case 'expired':
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"><Clock size={12} /> Expired (No Trigger)</span>;
      default:
        return null;
    }
  };

  return (
    <article className="relative group rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-7 shadow-xl shadow-amber-900/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl">
      <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl transition-all duration-700 pointer-events-none group-hover:scale-125" />
      {/* Top Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 relative z-10">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
              20-Day Breakout Setup
            </span>
            {statusBadge(opp.status)}
            {opp.liquidityAudit && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                opp.liquidityAudit.badgeColor === 'emerald'
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                  : opp.liquidityAudit.badgeColor === 'rose'
                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                  : 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
              }`}>
                {opp.liquidityAudit.isLiquid ? '🛡️' : '⚠️'} {opp.liquidityAudit.label}
              </span>
            )}
            {opp.evidence?.institutionalAccumulation && (
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                opp.evidence.institutionalAccumulation.includes('Accumulation')
                  ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                  : opp.evidence.institutionalAccumulation.includes('Risk')
                  ? 'bg-rose-500/10 text-rose-700 border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                  : 'bg-slate-500/10 text-slate-700 border-slate-500/20 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800'
              }`}>
                {opp.evidence.institutionalAccumulation}
              </span>
            )}
            {opp.breakevenTrailingStopActive && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50" title="Stop loss trails to Breakeven (+0.15% friction) upon reaching +6.0% gain">
                Breakeven Trail Active
              </span>
            )}
            {opp.risks?.upcomingEarningsInWindow && (
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50">
                Earnings Event Risk
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center flex-wrap gap-2.5 font-mono">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            {opp.symbol}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWatchlist?.();
              }}
              className="rounded-lg p-1 text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
              title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              <Star size={18} className={isInWatchlist ? 'fill-amber-400 text-amber-500' : 'text-slate-400 hover:text-amber-400'} />
            </button>
            {opp.companyName && opp.companyName !== opp.symbol && (
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300 font-sans truncate max-w-[220px]">
                {opp.companyName}
              </span>
            )}
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full font-sans">
              {opp.sector}
            </span>
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-0.5">Cutoff: {opp.dataCutoff}</p>
        </div>

        {/* Target Probability & Net Return Expectancy Badges & Trade Action */}
        <div className="text-right flex flex-col items-end gap-2.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="inline-block rounded-2xl bg-amber-500/15 border border-amber-500/30 px-3.5 py-2 shadow-xs text-center">
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Calibrated Prob</p>
              <p className="text-xl sm:text-2xl font-black font-mono text-amber-700 dark:text-amber-300">
                {(opp.targetProbability * 100).toFixed(1)}%
              </p>
            </div>
            {((opp.expectedRealisticNetReturnPct !== undefined && opp.expectedRealisticNetReturnPct !== null) || (opp.expectedNetReturnPct !== undefined && opp.expectedNetReturnPct !== null)) && (
              <div className={`inline-block rounded-2xl border px-3.5 py-2 shadow-xs text-center ${
                (opp.expectedRealisticNetReturnPct ?? opp.expectedNetReturnPct) > 0
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}>
                <p className="text-[10px] font-bold uppercase tracking-wider">Net Realized Expectancy</p>
                <p className="text-xl sm:text-2xl font-black font-mono">
                  {(opp.expectedRealisticNetReturnPct ?? (opp.expectedNetReturnPct * 100)) > 0 ? '+' : ''}
                  {(opp.expectedRealisticNetReturnPct !== undefined
                    ? opp.expectedRealisticNetReturnPct
                    : (opp.expectedNetReturnPct * 100)
                  ).toFixed(2)}%
                </p>
                <p className="text-[9px] text-slate-400 font-sans">After STT, DP, GST & Slippage</p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDispatchAlert?.();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-500/20 transition-all cursor-pointer shadow-xs"
              title="Dispatch Breakout Alert to Webhook / Telegram"
            >
              <Bell size={13} />
              <span>Send Alert</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTrade?.(opp, isValidFill ? customFill : opp.triggerPrice, 10, Math.abs(plannedStopPct));
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-md shadow-amber-600/20 transition-all cursor-pointer"
              title={`1-Click Trade ${opp.symbol}`}
            >
              <span>Price Scenario</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">P(+10% before Stop/20d)</p>
        </div>
      </div>

      {/* Dedicated Warning Box if Tradability / Circuit issues flagged */}
      {(opp.liquidityAudit?.warnings?.length ?? 0) > 0 && (
        <div className="my-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
            <AlertTriangle size={14} className="shrink-0" />
            <span>Liquidity & Tradability Warning</span>
          </div>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 leading-4">
            {opp.liquidityAudit!.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 3-Level Price Execution Grid */}
      <div className="my-4 grid grid-cols-3 gap-2 sm:gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3 dark:border-gray-800/80 dark:bg-gray-950/50">
        {/* Trigger */}
        <div className="rounded-lg bg-white p-2.5 dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800">
          <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase">1. Breakout Trigger</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white mt-1">
            {formatINR(opp.triggerPrice)}
          </p>
          <p className="text-[10px] text-gray-500">20d High + 0.2% buffer</p>
        </div>

        {/* Target */}
        <div className="rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20">
          <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">2. Target (+10.0%)</p>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {formatINR(opp.targetPrice)}
          </p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">Gross modeled fill × 1.10</p>
        </div>

        {/* Stop Loss */}
        <div className="rounded-lg bg-rose-500/10 p-2.5 border border-rose-500/20">
          <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase">3. Invalidation Stop</p>
          <p className="text-lg font-bold text-rose-700 dark:text-rose-300 mt-1">
            {formatINR(opp.stopPrice)}
          </p>
          <p className="text-[10px] text-rose-600 dark:text-rose-400">
            {opp.stopDistancePct > 0 ? `-${opp.stopDistancePct}` : opp.stopDistancePct}% risk anchor
          </p>
        </div>
      </div>

      {/* Probability and Metric Progress Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-gray-600 dark:text-gray-400">
          <span>Trigger Likelihood: <strong className="text-gray-900 dark:text-gray-200">{(opp.entryProbability * 100).toFixed(0)}%</strong></span>
          <span>Holding Limit: <strong className="text-gray-900 dark:text-gray-200">{opp.horizonSessions} sessions</strong></span>
          <span>Risk : Reward: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">{opp.riskRewardRatio ? `${opp.riskRewardRatio}:1` : '2.8:1'}</strong></span>
          <span>Statutory Tax & Friction: <strong className="text-gray-900 dark:text-gray-200 font-mono">{opp.statutoryFrictionPct ? `${opp.statutoryFrictionPct}%` : '0.65%'}</strong> (STT+DP+GST)</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2 overflow-hidden flex">
          <div 
            className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, opp.targetProbability * 100 * 2.5)}%` }} 
          />
        </div>
      </div>

      {/* Accordion Toggle */}
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700"
      >
        <span>{expanded ? 'Hide Technical Evidence & Price Planner' : 'View Technical Evidence & Price Planner'}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Expanded Section */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-800 space-y-4 text-xs">
          {/* Custom Buy Price Planner */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
            <p className="font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Interactive Execution Fill Planner
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Actual Fill:</span>
                <input 
                  type="number"
                  step="0.05"
                  value={customFillInput}
                  onChange={(e) => setCustomFillInput(e.target.value)}
                  className="w-28 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 font-bold text-sm"
                />
              </label>
              <div className="text-gray-700 dark:text-gray-300">
                Recalculated Target: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(plannedTarget)}</strong> (+10%)
              </div>
              <div className="text-gray-700 dark:text-gray-300">
                Stop: <strong className="text-rose-600 dark:text-rose-400">{formatINR(plannedStop)}</strong> ({plannedStopPct}%)
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTrade?.(opp, isValidFill ? customFill : opp.triggerPrice, 10, Math.abs(plannedStopPct));
                }}
                className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition shadow-sm cursor-pointer"
              >
                <span>Execute Fill ⚡</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500 mt-2">
              Note: A stock reaching +10% above yesterday&apos;s close does not automatically count as a successful trade. Actual targets are measured strictly from your execution fill.
            </p>
          </div>

          {/* Evidence Grid */}
          <div>
            <p className="font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Evidence Supporting Setup
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-500">BB Squeeze Ratio</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {opp.evidence.bollingerBandSqueezeRatio}x
                </p>
              </div>
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-500">Rel. Strength vs Nifty</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {opp.evidence.relativeStrengthVsNifty > 0 ? `+${opp.evidence.relativeStrengthVsNifty}%` : `${opp.evidence.relativeStrengthVsNifty}%`}
                </p>
              </div>
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-500">Volume Surge</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {opp.evidence.volumeSurgeRatio}x 20d avg
                </p>
              </div>
              <div className="p-2 rounded bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800">
                <p className="text-gray-500">Consolidation</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                  {opp.evidence.resistanceDays} sessions
                </p>
              </div>
              {opp.evidence.chaikinMoneyFlow !== undefined && (
                <div className="p-2 rounded bg-gray-50 dark:bg-gray-950/60 border border-gray-100 dark:border-gray-800">
                  <p className="text-gray-500">Chaikin Money Flow</p>
                  <p className={`text-sm font-bold mt-0.5 ${opp.evidence.chaikinMoneyFlow > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                    {opp.evidence.chaikinMoneyFlow > 0 ? `+${opp.evidence.chaikinMoneyFlow}` : opp.evidence.chaikinMoneyFlow}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Risk Factors */}
          <div>
            <p className="font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Risk Factors & Disclosures
            </p>
            <ul className="list-disc pl-4 space-y-1 text-gray-600 dark:text-gray-400">
              <li>
                <strong>Adverse Opening Gap Risk:</strong> Rated <span className="uppercase font-semibold">{opp.risks.gapRiskRating}</span>. If an overnight gap opens below the stop price, the exit is executed at the market open, not the stop level (per Investor.gov realities).
              </li>
              <li>
                <strong>Opening Gap Filter:</strong> If the stock opens &gt;3% above trigger price, the trade is automatically aborted to avoid chasing extended prices.
              </li>
              <li>
                <strong>Time Exit:</strong> If neither target nor stop is hit by session {opp.horizonSessions}, position is closed at market close.
              </li>
            </ul>
          </div>
        </div>
      )}
    </article>
  );
}

export default function SwingOpportunitiesScreen() {
  const { syncLiveData, addToast, watchlist = [], toggleWatchlist } = useStockContext();
  const [horizon, setHorizon] = useState<number>(20);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tradabilityFilter, setTradabilityFilter] = useState<'all' | 'liquid_only' | 'warnings_only'>('all');
  const [expectancyFilter, setExpectancyFilter] = useState<'all' | 'positive'>('positive');
  const [minProb, setMinProb] = useState<number>(0);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSyncingLive, setIsSyncingLive] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SwingOpportunitiesResponse | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [tradeOpp, setTradeOpp] = useState<{
    opp: SwingOpportunity;
    entry: number;
    targetPct: number;
    stopPct: number;
  } | null>(null);

  const handleTrade = (opp: SwingOpportunity, entry: number, targetPct: number, stopPct: number) => {
    playTargetChime();
    setTradeOpp({ opp, entry, targetPct, stopPct });
  };

  const handleDispatchAlert = async (opp: SwingOpportunity) => {
    try {
      const res = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'swing',
          data: opp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch alert');
      }
      if (addToast) {
        addToast(data.message || `Breakout alert dispatched for ${opp.symbol}!`, 'success', opp.symbol);
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err.message || 'Alert routing error', 'warning', opp.symbol);
      }
    }
  };

  const isSymbolInWatchlist = (symbol: string) => {
    const clean = symbol.toUpperCase().replace(/\.NS$/, '');
    return (watchlist || []).some((w) => w.toUpperCase().replace(/\.NS$/, '') === clean);
  };

  const handleLiveSync = async () => {
    if (isSyncingLive) return;
    setIsSyncingLive(true);
    try {
      if (syncLiveData) {
        await syncLiveData('all');
      } else {
        await fetch('/api/sync-live-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: 'all' }),
        });
      }
      setRefreshCount((n) => n + 1);
    } catch (e: any) {
      if (addToast) addToast(`Sync failed: ${e.message}`, 'warning');
    } finally {
      setIsSyncingLive(false);
    }
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    fetch(`/api/swing-opportunities?horizon=${horizon}&status=${statusFilter}&tradability=${tradabilityFilter}&expectancy=${expectancyFilter}&minProb=${minProb}&_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed to load swing opportunities');
        return json as SwingOpportunitiesResponse;
      })
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Error loading swing data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [horizon, statusFilter, tradabilityFilter, expectancyFilter, minProb, refreshCount]);

  const filteredItems = useMemo(() => {
    if (!result?.data) return [];
    return result.data.filter((opp) => {
      const matchesQuery = `${opp.symbol} ${opp.companyName} ${opp.sector}`.toLowerCase().includes(query.toLowerCase());
      if (!matchesQuery) return false;
      if (watchlistOnly) {
        const cleanSym = opp.symbol.toUpperCase().replace(/\.NS$/, '');
        const inWl = (watchlist || []).some((w) => w.toUpperCase().replace(/\.NS$/, '') === cleanSym);
        if (!inWl) return false;
      }
      return true;
    });
  }, [result, query, watchlistOnly, watchlist]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Banner / Hero */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 p-6 sm:p-8 text-white shadow-2xl border border-amber-500/20 backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <TrendingUp className="absolute -right-6 -bottom-6 h-56 w-56 text-amber-400/10 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300 border border-amber-500/30 flex items-center gap-1.5 shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              Dedicated Swing Feature
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Multi-Session Breakout Engine (20-Day Horizon)
            </span>
          </div>

          <h1 className="text-3xl font-black sm:text-4xl tracking-tight">
            Swing Trading Opportunities<span className="text-amber-400">.</span>
          </h1>
          <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-300">
            Identifies high-liquidity NSE equities poised for a +10% move from confirmed 20-day breakout triggers before invalidation. Evaluated with calibrated probability and conservative friction deduction.
          </p>

          {/* Horizon Tabs (Primary vs Research Variants) */}
          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setHorizon(20)}
              className={`rounded-2xl px-5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                horizon === 20
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 scale-[1.02]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              20 Sessions (Primary Specification)
            </button>
            <button
              onClick={() => setHorizon(10)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                horizon === 10
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 scale-[1.02]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/15'
              }`}
            >
              10 Sessions (Research Variant)
            </button>
            <button
              onClick={() => setHorizon(40)}
              className={`rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                horizon === 40
                  ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-400/25 scale-[1.02]'
                  : 'bg-white/5 text-slate-300 hover:bg-white/15'
              }`}
            >
              40 Sessions (Research Variant)
            </button>
          </div>
        </div>
      </header>

      {/* Multi-Session Tradability & Liquidity Guard Notice */}
      <div className="flex items-start gap-3.5 rounded-3xl border border-amber-300/60 bg-amber-50/80 p-4 sm:p-5 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200 shadow-sm backdrop-blur-md">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
        <div>
          <span className="font-bold uppercase tracking-wider">Multi-Session Tradability Guard Active: </span>
          Swing trading holds positions across multiple overnight gaps. Shares with low daily turnover (&lt; ₹10 Cr), thin volume (&lt; 250k), or circuit-prone histories carry severe trapped capital risks (stop-loss orders fail if locked in circuit). Each candidate features an audited Tradability health status.
        </div>
      </div>

      {/* Full Universe Scan Coverage Ribbon */}
      {result?.scanCoverage && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 px-5 py-3 text-xs text-slate-300 shadow-md backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Scan Universe:</strong> {result.scanCoverage.scope}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 font-mono text-[11px] flex-wrap">
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <strong className="text-amber-400">{result.scanCoverage.auditedTotal}</strong> Audited
            </span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <strong className="text-emerald-400">{result.scanCoverage.tradabilityQualified}</strong> Liquid Qualified
            </span>
            <span className="bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              <strong className="text-amber-300">{result.scanCoverage.breakoutSetupsActive}</strong> Breakout Setups
            </span>
          </div>
        </div>
      )}

      {/* Portfolio Simulation Metrics Banner */}
      {result?.portfolioMetrics && (
        <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={18} className="text-amber-500" />
            <h2 className="text-xs font-mono font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Portfolio Simulation Backtest (6-Year Walk-Forward)
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Max Positions</p>
              <p className="text-xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {result.portfolioMetrics.max_concurrent_positions_limit}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20">
              <p className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Win Rate</p>
              <p className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {result.portfolioMetrics.win_rate_pct}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/20">
              <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Total Net Return</p>
              <p className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                +{result.portfolioMetrics.total_net_return_pct}%
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 dark:bg-rose-950/40 border border-rose-500/20">
              <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400 uppercase tracking-wider">Max Drawdown</p>
              <p className="text-xl font-black font-mono text-rose-600 dark:text-rose-400 mt-1">
                {result.portfolioMetrics.max_drawdown_pct}%
              </p>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 font-mono">
            Simulation assumes ₹10 Lakh initial capital, 1% risk budget per trade, maximum 20% equity per position, and 0.15% roundtrip statutory/brokerage friction. Realized stop gap-downs filled at open.
          </p>
        </section>
      )}

      {/* Filter and Control Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-3.5 rounded-3xl shadow-xl">
        {/* Search */}
        <label className="flex min-w-48 flex-1 items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/70 px-4 py-1 dark:border-slate-700/60 dark:bg-slate-800/60">
          <Search size={16} className="text-slate-400" />
          <input
            placeholder="Search symbol, company, or sector…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent py-2.5 text-xs font-semibold outline-none text-slate-900 dark:text-white"
          />
        </label>

        {/* Expectancy Filter */}
        <select
          value={expectancyFilter}
          onChange={(e) => setExpectancyFilter(e.target.value as any)}
          className="rounded-2xl border border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30 py-2.5 px-3.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 cursor-pointer"
        >
          <option value="positive">📈 Positive Expectancy Only</option>
          <option value="all">All Expectancies</option>
        </select>

        {/* Watchlist Filter Toggle */}
        <button
          type="button"
          onClick={() => setWatchlistOnly(!watchlistOnly)}
          className={`rounded-2xl border py-2.5 px-3.5 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            watchlistOnly
              ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
              : 'border-slate-200/70 bg-slate-50/70 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300'
          }`}
        >
          <Star size={14} className={watchlistOnly ? 'fill-slate-950' : 'text-amber-500'} />
          <span>Watchlist Only</span>
        </button>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2.5 px-3.5 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="watching">Watching (Pending Trigger)</option>
          <option value="active">Active Swings</option>
          <option value="target_hit">Target Hit (+10%)</option>
          <option value="stopped">Stopped Out</option>
          <option value="expired">Expired</option>
        </select>

        {/* Tradability Filter */}
        <select
          value={tradabilityFilter}
          onChange={(e) => setTradabilityFilter(e.target.value as any)}
          className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2.5 px-3.5 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="all">All Tradability</option>
          <option value="liquid_only">🛡️ Verified Liquid Only</option>
          <option value="warnings_only">⚠️ With Warnings Only</option>
        </select>

        {/* Min Probability Filter */}
        <select
          value={minProb}
          onChange={(e) => setMinProb(parseFloat(e.target.value))}
          className="rounded-2xl border border-slate-200/70 bg-slate-50/70 py-2.5 px-3.5 text-xs font-bold dark:border-slate-700/60 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 cursor-pointer"
        >
          <option value="0">All Probabilities</option>
          <option value="0.08">Min 8% Calibrated</option>
          <option value="0.12">Min 12% Calibrated</option>
          <option value="0.15">Min 15% Calibrated</option>
        </select>

        {/* Sync Live Market */}
        <button
          onClick={handleLiveSync}
          disabled={isSyncingLive || loading}
          id="btn-sync-swing-live-data"
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-xs font-bold text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-500/20 disabled:opacity-50"
          title="Sync real-time index benchmarks and live stock quotes from Indian exchange gateways"
        >
          <RefreshCw size={14} className={isSyncingLive ? 'animate-spin' : ''} />
          {isSyncingLive ? 'Syncing Live…' : 'Sync Live Market'}
        </button>

        {/* Refresh */}
        <button
          onClick={() => setRefreshCount((n) => n + 1)}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Loading / Error States */}
      {loading && (
        <div className="rounded-2xl bg-white p-8 text-center dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <RefreshCw size={24} className="animate-spin mx-auto text-amber-500 mb-2" />
          <p className="text-sm font-semibold">Scanning 20-day swing opportunities…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl bg-red-50 p-5 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900">
          <p className="text-sm font-bold">Error loading swing data</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      )}

      {/* Grid of Results */}
      {!loading && !error && (
        <>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Showing {filteredItems.length} candidate setups</span>
            <span>Horizon: {horizon} Trading Sessions</span>
          </div>

          {filteredItems.length > 0 ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {filteredItems.map((opp) => (
                <SwingCard
                  key={`${opp.symbol}-${opp.signalDate}`}
                  opp={opp}
                  onTrade={handleTrade}
                  isInWatchlist={isSymbolInWatchlist(opp.symbol)}
                  onToggleWatchlist={() => toggleWatchlist?.(opp.symbol)}
                  onDispatchAlert={() => handleDispatchAlert(opp)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 p-12 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                No Qualifying Swing Opportunities
              </h2>
              <p className="mt-2 max-w-md mx-auto text-xs text-gray-500 leading-relaxed">
                No stocks currently satisfy all 20-session breakout criteria, liquidity filters (₹10 Cr median turnover), and minimum probability thresholds. The system preserves cash during indecisive or adverse market conditions rather than forcing low-probability swing trades.
              </p>
            </div>
          )}
        </>
      )}

      {/* 1-Click Quick Trade Modal */}
      {tradeOpp && (
        <QuickTradeModal
          isOpen={!!tradeOpp}
          onClose={() => setTradeOpp(null)}
          ticker={tradeOpp.opp.symbol}
          name={tradeOpp.opp.companyName || tradeOpp.opp.symbol}
          currentPrice={tradeOpp.entry}
          initialTargetPct={tradeOpp.targetPct}
          initialStopLossPct={tradeOpp.stopPct}
        />
      )}
    </div>
  );
}
