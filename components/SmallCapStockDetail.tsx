'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  BarChart,
  Bar,
} from 'recharts';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Target,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  Check,
  Zap,
  BarChart2,
  Cpu,
  Activity,
} from 'lucide-react';
import {
  scoreSmallCapCandidate,
  buildSmallCapNarrative,
  type SmallCapCandidateInput,
} from '../lib/small-cap-scoring';
import type { SmallCapStock } from '../lib/small-cap-types';
import { historicalVolumeCoverage } from '../lib/small-cap-history';
import { indiaDay, quoteStatusLabel, withCurrentStatus } from '../lib/market-quote';
import {
  computeAlphaFactors,
  computeTripleBarriers,
  evaluateMetaLabeling,
} from '../lib/institutional-quant';

interface SmallCapStockDetailProps {
  stock: any;
  smallCapData?: SmallCapStock | null;
  onBack: () => void;
  isWatchlisted: boolean;
  onToggleWatchlist: () => void;
  onSwitchToFullView: () => void;
}

const formatNumber = (value: number) => value.toLocaleString('en-IN');

export default function SmallCapStockDetail({
  stock,
  smallCapData,
  onBack,
  isWatchlisted,
  onToggleWatchlist,
  onSwitchToFullView,
}: SmallCapStockDetailProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Compute 20-session volume statistics from stock history if not already supplied
  const coverage = useMemo(() => {
    const quoteAsOf = stock.quoteAsOf ?? smallCapData?.quoteAsOf;
    const observed = Date.parse(quoteAsOf || '');
    const savedObserved = Date.parse(smallCapData?.quoteAsOf || '');
    const sameSession = Number.isFinite(observed) && Number.isFinite(savedObserved) &&
      indiaDay(new Date(observed)) === indiaDay(new Date(savedObserved));
    if (sameSession && smallCapData?.historyCoverage.sufficient && smallCapData.historyCoverage.completedSessions >= 20 &&
        typeof smallCapData.averageVolume === 'number' && Number.isFinite(smallCapData.averageVolume) && smallCapData.averageVolume > 0) {
      return { averageVolume: smallCapData.averageVolume, historyCoverage: smallCapData.historyCoverage };
    }
    return historicalVolumeCoverage({ quoteAsOf, history: Array.isArray(stock.history) ? stock.history : [] });
  }, [stock, smallCapData]);

  const series = stock.series ?? smallCapData?.series;
  const isT2T = stock.isT2T === true || smallCapData?.isT2T === true || ['BE', 'BZ', 'ST', 'SZ'].includes(series)
    ? true : stock.isT2T === false || smallCapData?.isT2T === false || ['EQ', 'SM'].includes(series) ? false : undefined;

  // Construct standardized SmallCap candidate input
  const candidateInput = useMemo<SmallCapCandidateInput>(() => {
    const marketCap =
      typeof stock.marketCap === 'number' && stock.marketCap > 0
        ? stock.marketCap
        : smallCapData?.marketCap ?? 0;

    return {
      ticker: stock.ticker,
      name: stock.name,
      marketCap,
      changePercent: stock.changePercent,
      volume: stock.volume,
      averageVolume: coverage.averageVolume,
      currentPrice: stock.currentPrice,
      previousClose: stock.previousClose || stock.currentPrice - stock.change,
      sector: stock.sector,
      turnover: stock.volume * stock.currentPrice,
      circuitLimit: stock.circuitLimit,
      isT2T,
      isAsmGsm: typeof stock.isAsmGsm === 'boolean' ? stock.isAsmGsm : undefined,
    };
  }, [stock, smallCapData, coverage, isT2T]);

  // Quantitative 4-Pillar Score & Breakout Signal evaluation
  const signal = useMemo(() => scoreSmallCapCandidate(candidateInput), [candidateInput]);
  const narrative = useMemo(() => buildSmallCapNarrative(candidateInput), [candidateInput]);

  const currentPrice = stock.currentPrice || 0;
  const isUp = stock.change >= 0;
  const changePercent = stock.changePercent || 0;
  const marketCapCr = Math.round(candidateInput.marketCap || 0);
  const turnoverLakhs = signal.turnoverLakhs ?? Number(((stock.volume * currentPrice) / 100000).toFixed(1));
  const rvol =
    coverage.averageVolume && coverage.averageVolume > 0
      ? Number((stock.volume / coverage.averageVolume).toFixed(2))
      : 0;

  // Fixed illustrative price scenario; these levels are not derived from outcomes.
  const targetMin = currentPrice * 1.03; // +3.0% Target
  const targetMax = currentPrice * 1.05; // +5.0% Target
  const stopLoss = currentPrice * 0.975; // -2.5% Stop-loss boundary
  const riskAmount = currentPrice - stopLoss;
  const rewardAmount = (targetMin + targetMax) / 2 - currentPrice;
  const rrRatio = Number.isFinite(riskAmount) && riskAmount > 0 ? (rewardAmount / riskAmount).toFixed(1) : null;

  // Institutional Quantitative Engine (Alpha158, Triple Barrier & Meta-Labeling)
  const quantAlpha = useMemo(() => computeAlphaFactors(Array.isArray(stock?.history) ? stock.history : [], {
    currentPrice,
    volume: stock.volume,
    high: stock.high,
    low: stock.low,
    open: stock.open,
  }), [stock?.history, currentPrice, stock.volume, stock.high, stock.low, stock.open]);

  const tripleBarriers = useMemo(() => computeTripleBarriers(currentPrice, quantAlpha.natr14), [currentPrice, quantAlpha.natr14]);

  const metaDecision = useMemo(() => evaluateMetaLabeling(quantAlpha, tripleBarriers, signal.score), [quantAlpha, tripleBarriers, signal.score]);

  // Historical Chart data preparation
  const chartData = useMemo(() => {
    const rawHistory = Array.isArray(stock?.history) ? stock.history : [];
    const sliceCount = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    return rawHistory.slice(-sliceCount);
  }, [stock?.history, period]);

  // Custom clean tooltip for point-to-point chart
  const ChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      return (
        <div className="rounded-xl border border-gray-200 bg-white/95 p-3 font-mono text-xs shadow-xl dark:border-gray-800 dark:bg-gray-950/95">
          <div className="font-sans font-bold text-gray-400 border-b border-gray-100 pb-1 mb-1.5 dark:border-gray-800">
            {p.date}
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-gray-500 dark:text-gray-400">Price:</span>
            <span className="font-bold text-gray-900 dark:text-white">₹{Number(p.price).toFixed(2)}</span>
          </div>
          {p.volume !== undefined && (
            <div className="flex items-center justify-between gap-4 mt-1">
              <span className="text-gray-500 dark:text-gray-400">Volume:</span>
              <span className="font-medium text-emerald-600 dark:text-emerald-400">{formatNumber(p.volume)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ─── Top Navigation & View Switcher ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          id="btn-small-cap-back"
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Small Cap Picks</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Active Mode Indicator + Pro View Switcher */}
          <div className="inline-flex items-center rounded-xl bg-emerald-50 p-1 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-xs">
              <Zap className="h-3.5 w-3.5" /> Point-to-Point View
            </span>
            <button
              type="button"
              onClick={onSwitchToFullView}
              id="btn-switch-full-pro-view"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              title="Show full technical analysis with indicators, drawing canvas and subtabs"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" /> Full Pro View
            </button>
          </div>

          {/* Watchlist Toggle */}
          <button
            type="button"
            onClick={onToggleWatchlist}
            id={`btn-toggle-watchlist-${stock.ticker}`}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition shadow-xs ${
              isWatchlisted
                ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                : 'border-gray-200 bg-white text-gray-600 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:text-white'
            }`}
          >
            <Star className={`h-4 w-4 ${isWatchlisted ? 'fill-current text-amber-500' : ''}`} />
            <span>{isWatchlisted ? 'Watchlisted' : 'Watchlist'}</span>
          </button>
        </div>
      </div>

      {/* ─── Hero Headline & Point-to-Point Status ─── */}
      <section
        aria-label="Stock headline"
        className="rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:p-6"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-3xl sm:text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                {stock.ticker}
              </span>
              <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                NSE Small Cap
              </span>
              {series && (
                <span className="rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-bold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  Series: {series}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm sm:text-base font-semibold text-gray-600 dark:text-gray-300 truncate max-w-xl">
              {stock.name}
              {stock.sector ? ` · ${stock.sector}` : ''}
            </p>

            {/* Point-to-Point Badges */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                Momentum Score {signal.score} / 100
              </span>
              {signal.isHighConviction && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <Sparkles className="h-3 w-3" /> High Conviction Setup
                </span>
              )}
              {signal.isEligibleFor2Pct && (
                <span className="rounded-md bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800 dark:bg-teal-900/40 dark:text-teal-300">
                  Qualified +2% Breakout
                </span>
              )}
              <span
                className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                  signal.riskLevel === 'low'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : signal.riskLevel === 'medium'
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                }`}
              >
                {signal.riskLevel.toUpperCase()} Screen Risk
              </span>

              {/* Event & News Catalyst Badges */}
              {signal.hasEarningsRisk && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <AlertTriangle className="h-3 w-3" /> Results in {signal.daysToEarnings}d (Binary Risk)
                </span>
              )}
              {signal.earningsSurprise === 'beat' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <TrendingUp className="h-3 w-3" /> Earnings Beat Catalyst
                </span>
              )}
              {signal.earningsSurprise === 'miss' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                  <ArrowDownRight className="h-3 w-3" /> Earnings Miss Overhang
                </span>
              )}
              {signal.newsSentiment === 'Bullish' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Sparkles className="h-3 w-3" /> Bullish News
                </span>
              )}
              {signal.newsSentiment === 'Bearish' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                  <AlertTriangle className="h-3 w-3" /> Bearish News
                </span>
              )}
            </div>
          </div>

          {/* Price & Trigger Box */}
          <div className="flex flex-col items-start lg:items-end">
            <div className="font-mono text-4xl sm:text-5xl font-black text-gray-900 dark:text-white">
              ₹{currentPrice.toFixed(2)}
            </div>
            <div
              className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-3 py-1 font-mono text-sm font-black ${
                isUp
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40'
              }`}
            >
              {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {isUp ? '+' : ''}
              {changePercent.toFixed(2)}% ({isUp ? '+' : ''}₹{Math.abs(stock.change || 0).toFixed(2)})
            </div>

            {(() => {
              const currentStatus = withCurrentStatus(stock).quoteStatus;
              const isSimulated = stock.dataSource === 'simulated' || currentStatus === 'simulated';
              const sourceLabel = isSimulated ? 'Simulated' : (stock.dataSource === 'provider' ? 'Yahoo Finance' : stock.dataSource || 'Yahoo Finance');
              const statusLabel = quoteStatusLabel(currentStatus);
              const timeLabel = stock.quoteAsOf
                ? `${new Date(stock.quoteAsOf).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST`
                : 'Quote time unavailable';
              return (
                <div data-testid="smallcap-detail-provenance" className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSimulated ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{sourceLabel}</span>
                  <span>·</span>
                  <span>{statusLabel}</span>
                  <span>·</span>
                  <span>{timeLabel}</span>
                </div>
              );
            })()}

            {/* Direct Trigger Point */}
            <div className="mt-2 text-xs font-semibold">
              {changePercent >= 2 ? (
                <span className="text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> +2% Momentum Trigger Met
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Below +2% Trigger (+{changePercent.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── POINT-TO-POINT: 5 Core Institutional Data Points ─── */}
      <section aria-label="Point to point key metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Point 1: Market Cap */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            1. Market Capitalization
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-gray-900 dark:text-white">
            ₹{marketCapCr > 0 ? formatNumber(marketCapCr) : '—'} Cr
          </div>
          <div className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {marketCapCr > 0 && marketCapCr < 20000 ? '✓ Verified Small Cap (<₹20k Cr)' : 'Unverified cap'}
          </div>
        </div>

        {/* Point 2: Daily Turnover */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            2. Traded Turnover
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-gray-900 dark:text-white">
            ₹{formatNumber(turnoverLakhs)}L
          </div>
          <div
            className={`mt-1 text-xs font-semibold ${
              turnoverLakhs >= 50
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {turnoverLakhs >= 50 ? '✓ Passed (≥ ₹50 Lakhs gate)' : '✗ Below ₹50L floor'}
          </div>
        </div>

        {/* Point 3: Relative Volume */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            3. Relative Volume (RVOL)
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-gray-900 dark:text-white">
            {rvol > 0 ? `${rvol.toFixed(2)}×` : '—'}
          </div>
          <div
            className={`mt-1 text-xs font-semibold ${
              rvol >= 1.05
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {coverage.averageVolume === undefined ? '20-session volume history unavailable' : rvol >= 1.05 ? '✓ 20D expansion confirmed' : 'Normal / Low participation'}
          </div>
        </div>

        {/* Point 4: Circuit Headroom */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            4. Circuit Headroom
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-gray-900 dark:text-white">
            {signal.circuitHeadroomPercent !== undefined ? `${signal.circuitHeadroomPercent}%` : 'Unavailable'}
          </div>
          <div
            className={`mt-1 text-xs font-semibold ${
              signal.circuitHeadroomPercent === undefined ? 'text-amber-600 dark:text-amber-400' : signal.isCircuitLocked
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {signal.circuitHeadroomPercent === undefined ? 'Circuit band unverified' : signal.isCircuitLocked ? '⚠️ Upper circuit lock risk' : '✓ Execution room clear'}
          </div>
        </div>

        {/* Point 5: Series & Surveillance */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            5. Settlement & Series
          </div>
          <div className="mt-2 font-mono text-2xl font-black text-gray-900 dark:text-white">
            {series || 'Unavailable'}
          </div>
          <div
            className={`mt-1 text-xs font-semibold ${
              isT2T === undefined ? 'text-amber-600 dark:text-amber-400' : isT2T ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {isT2T === undefined ? 'Settlement series unverified' : isT2T ? 'T2T Restricted' : '✓ Rolling Delivery'}
          </div>
        </div>
      </section>

      {/* ─── POINT-TO-POINT: Actionable Swing Trade Plan ─── */}
      <section
        aria-label="Actionable trade plan"
        className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/50 p-6 dark:border-emerald-900/60 dark:from-emerald-950/30 dark:via-gray-900/80 dark:to-teal-950/30 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 pb-3 dark:border-emerald-900/40">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-base font-black text-gray-900 dark:text-white">
              Point-to-Point Swing Execution Plan
            </h2>
          </div>
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
            Illustrative +3% to +5% target / −2.5% stop scenario
          </span>
        </div>

        <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">These fixed levels illustrate a price scenario; they are not a forecast, measured return or calibrated expectancy.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-white/80 p-3.5 dark:border-emerald-800/40 dark:bg-gray-950/40">
            <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Entry Reference</span>
            <div className="mt-1 font-mono text-xl font-black text-gray-900 dark:text-white">
              ₹{currentPrice.toFixed(2)}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Current observation price</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white/80 p-3.5 dark:border-emerald-800/40 dark:bg-gray-950/40">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
              Profit Target (+3% to +5%)
            </span>
            <div className="mt-1 font-mono text-xl font-black text-emerald-700 dark:text-emerald-400">
              ₹{targetMin.toFixed(2)} – ₹{targetMax.toFixed(2)}
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">+3.0% to +5.0% swing gain</span>
          </div>

          <div className="rounded-xl border border-rose-100 bg-white/80 p-3.5 dark:border-rose-900/40 dark:bg-gray-950/40">
            <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">
              Stop-Loss Boundary (-2.5%)
            </span>
            <div className="mt-1 font-mono text-xl font-black text-rose-600 dark:text-rose-400">
              ₹{stopLoss.toFixed(2)}
            </div>
            <span className="text-[11px] text-rose-600 dark:text-rose-400">-2.5% max adverse excursion limit</span>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-white/80 p-3.5 dark:border-emerald-800/40 dark:bg-gray-950/40">
            <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Scenario Reward-to-Risk</span>
            <div className="mt-1 font-mono text-xl font-black text-gray-900 dark:text-white">
              {rrRatio === null ? 'Unavailable' : `${rrRatio} : 1`}
            </div>
            <span className="text-[11px] text-gray-500 dark:text-gray-400">Calculated from the displayed scenario levels</span>
          </div>
        </div>
      </section>

      {/* ─── INSTITUTIONAL QUANT: Alpha158 Factors, AFML Triple Barrier & Meta-Labeling ─── */}
      <section
        aria-label="Institutional quant intelligence"
        className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 p-6 dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-gray-900/80 dark:to-purple-950/20 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3 dark:border-indigo-900/40">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-black text-gray-900 dark:text-white">
              Institutional Quant Signals (Alpha158 & AFML Triple Barrier)
            </h2>
          </div>
          <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
            Inspired by Microsoft Qlib & López de Prado AFML
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Card 1: AFML Dynamic Volatility Barrier */}
          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/40 dark:bg-gray-950/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400">
                1. AFML Dynamic Triple Barrier
              </span>
              <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
                {tripleBarriers.volatilityRegime} Volatility
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Volatility Upper Target:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{tripleBarriers.upperTargetPrice.toFixed(2)} (+{tripleBarriers.targetPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Volatility Lower Stop:</span>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  ₹{tripleBarriers.lowerStopPrice.toFixed(2)} (-{tripleBarriers.stopPercent}%)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">Dynamic R:R / Horizon:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {tripleBarriers.rewardToRiskRatio} : 1 · {tripleBarriers.maxHoldingHorizonDays}D
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
              Scaled to 14-session NATR ({quantAlpha.natr14}% daily range)
            </div>
          </div>

          {/* Card 2: Alpha158 Multi-Factor Suite */}
          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/40 dark:bg-gray-950/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400">
                2. Alpha158 Factor Score
              </span>
              <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
                {quantAlpha.compositeAlphaScore} / 100
              </span>
            </div>
            <div className="mt-2.5 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Chaikin Money Flow:</span>
                <span className={`font-mono font-bold ${quantAlpha.cmf20 >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {quantAlpha.cmf20 >= 0 ? '+' : ''}{quantAlpha.cmf20}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Momentum Acceleration:</span>
                <span className={`font-mono font-bold ${quantAlpha.momentumAcceleration >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {quantAlpha.momentumAcceleration >= 0 ? '+' : ''}{quantAlpha.momentumAcceleration}%/d
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 dark:text-gray-400">VWAP Distance / Volume Z:</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">
                  {quantAlpha.vwapDistancePct >= 0 ? '+' : ''}{quantAlpha.vwapDistancePct}% · {quantAlpha.volumeZScore >= 0 ? '+' : ''}{quantAlpha.volumeZScore}σ
                </span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 truncate">
              {quantAlpha.factorSignals.slice(0, 2).join(' · ') || 'Factors computed across session window'}
            </div>
          </div>

          {/* Card 3: ML Meta-Labeling Decision */}
          <div className="rounded-2xl border border-indigo-100 bg-white/80 p-4 dark:border-indigo-900/40 dark:bg-gray-950/50">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400">
                3. Meta-Labeling Recommendation
              </span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {metaDecision.metaConfidence}% Conf
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                metaDecision.actionRecommendation === 'HIGH_CONVICTION_BREAKOUT'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : metaDecision.actionRecommendation === 'EXHAUSTION_WARNING'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  : metaDecision.actionRecommendation === 'LOW_EDGE_VOLATILITY'
                  ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
              }`}>
                {metaDecision.actionRecommendation.replace(/_/g, ' ')}
              </span>
              <span className="rounded-lg bg-purple-50 px-2 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                {metaDecision.recommendedPositionSizeMultiplier}× Size Multiplier
              </span>
            </div>
            <div className="mt-2.5 text-xs text-gray-600 dark:text-gray-300">
              <span className="font-semibold text-gray-900 dark:text-white">Calibrated Win Rate: </span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {(metaDecision.calibratedWinRate * 100).toFixed(0)}%
              </span>
              <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2">
                {metaDecision.reasons[0] || 'Ensemble evaluated against 4 quantitative pillars.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <p className="text-xs text-gray-500 dark:text-gray-400">Score contributions are added before the total is limited to 0–100. Sector and market observations are unavailable in this view.</p>
      {/* ─── POINT-TO-POINT: 4-Pillar Score Breakdown ─── */}
      <section aria-label="4-pillar score breakdown" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* Pillar 1 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-600" /> 1. Trend Quality
            </div>
            <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400">
              {signal.scorePillars?.trend ?? 0} pts
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Momentum: {changePercent >= 2 ? `+${changePercent.toFixed(2)}% breakout` : 'Sub-trigger'}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Small-cap size boost (&lt;₹20k Cr)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Daily momentum and price-strength contributions</span>
            </li>
          </ul>
        </div>

        {/* Pillar 2 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-teal-600" /> 2. Volume Shock
            </div>
            <span className="font-mono text-xs font-black text-teal-600 dark:text-teal-400">
              {signal.scorePillars?.volume ?? 0} pts
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              <span>{coverage.averageVolume === undefined ? 'RVOL unavailable: 20 prior sessions required' : `RVOL: ${rvol.toFixed(2)}× vs 20-session average`}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              <span>Turnover: ₹{formatNumber(turnoverLakhs)}L (≥ ₹50L required)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />
              <span>Turnover screen only; execution checks pending</span>
            </li>
          </ul>
        </div>

        {/* Pillar 3 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-indigo-600" /> 3. Sector & Market
            </div>
            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">
              {signal.scorePillars?.relativeStrength ?? 0} pts
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Sector: {stock.sector || 'Unavailable'}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Sector performance unavailable</span>
            </li>
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
              <span>Market trend unavailable</span>
            </li>
          </ul>
        </div>

        {/* Pillar 4 */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-600" /> 4. Risk Penalties
            </div>
            <span
              className={`font-mono text-xs font-black ${
                (signal.scorePillars?.riskPenalty ?? 0) < 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {signal.scorePillars?.riskPenalty ?? 0} pts
            </span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Blow-off move check (&lt;8% swing)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{signal.circuitHeadroomPercent === undefined ? 'Upper circuit buffer unverified' : `Upper circuit buffer: ${signal.circuitHeadroomPercent}%`}</span>
            </li>
            <li className="flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>{candidateInput.isAsmGsm === undefined ? 'ASM / GSM status unverified' : candidateInput.isAsmGsm ? 'ASM / GSM restriction reported' : 'No ASM / GSM restriction reported'}</span>
            </li>
          </ul>
        </div>
      </section>

      {/* ─── POINT-TO-POINT: Clean Price & Volume Chart ─── */}
      <section
        aria-label="Price history chart"
        className="rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/70 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-800">
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-white">Price Action & Volume Participation</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Clean swing trajectory without conflicting indicator clutter
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex bg-gray-100 p-0.5 rounded-xl dark:bg-gray-800">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  period === p
                    ? 'bg-white text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Price Area Chart */}
        <div className="mt-4 h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="smallCapGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888820" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#88888860" />
                <YAxis
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tick={{ fontSize: 10 }}
                  stroke="#88888860"
                  tickFormatter={val => `₹${Number(val).toFixed(0)}`}
                />
                <Tooltip content={<ChartTooltip />} />
                <ReferenceLine
                  y={currentPrice}
                  stroke={isUp ? '#10b981' : '#f43f5e'}
                  strokeDasharray="4 4"
                  label={{
                    value: `Last: ₹${currentPrice.toFixed(1)}`,
                    fill: isUp ? '#10b981' : '#f43f5e',
                    fontSize: 10,
                    position: 'right',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isUp ? '#10b981' : '#f43f5e'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#smallCapGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-gray-400">
              No historical price series available for this asset.
            </div>
          )}
        </div>

        {/* Volume Sub-Bar Chart */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 mb-2">
            <span>Daily Traded Volume</span>
            <span>{coverage.averageVolume === undefined ? '20-session baseline unavailable' : `20-Session Baseline: ${formatNumber(Math.round(coverage.averageVolume))} shares`}</span>
          </div>
          <div className="h-20 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  {coverage.averageVolume && coverage.averageVolume > 0 && (
                    <ReferenceLine y={coverage.averageVolume} stroke="#6366f1" strokeDasharray="3 3" />
                  )}
                  <Bar dataKey="volume" fill="#10b981" radius={[3, 3, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </section>

      {/* ─── POINT-TO-POINT: Pre-Trade Verification Checklist ─── */}
      <section
        aria-label="Pre-trade checklist"
        className="rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900/70"
      >
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Point-to-Point Pre-Trade Checklist
        </h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 text-xs">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-gray-700 dark:text-gray-300">Market Cap &lt; ₹20,000 Cr</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${turnoverLakhs >= 50 ? 'text-emerald-600' : 'text-rose-500'}`}
            />
            <span className="text-gray-700 dark:text-gray-300">Turnover ≥ ₹50 Lakhs ({turnoverLakhs}L)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${rvol >= 1.05 ? 'text-emerald-600' : 'text-amber-500'}`}
            />
            <span className="text-gray-700 dark:text-gray-300">{coverage.averageVolume === undefined ? 'RVOL check unavailable' : `RVOL ≥ 1.05× 20-Session Avg (${rvol}×)`}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${changePercent >= 2 ? 'text-emerald-600' : 'text-amber-500'}`}
            />
            <span className="text-gray-700 dark:text-gray-300">Move ≥ +2.0% ({changePercent.toFixed(2)}%)</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${signal.circuitHeadroomPercent === undefined ? 'text-amber-500' : !signal.isCircuitLocked ? 'text-emerald-600' : 'text-rose-500'}`}
            />
            <span className="text-gray-700 dark:text-gray-300">{signal.circuitHeadroomPercent === undefined ? 'Circuit headroom unverified' : 'Circuit Headroom > 0.5%'}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-2.5 dark:bg-gray-800/50">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${isT2T === undefined ? 'text-amber-500' : !isT2T ? 'text-emerald-600' : 'text-rose-500'}`}
            />
            <span className="text-gray-700 dark:text-gray-300">{isT2T === undefined ? 'Settlement check unverified' : isT2T ? 'Trade-for-trade restricted' : `Rolling settlement (${series || 'reported'})`}</span>
          </div>
        </div>

        {/* AI Narrative Footer */}
        {narrative && (
          <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs leading-relaxed text-gray-700 dark:border-emerald-950 dark:bg-emerald-950/20 dark:text-gray-300">
            <strong className="text-emerald-800 dark:text-emerald-300">Summary: </strong>
            {narrative}
          </div>
        )}
      </section>
    </div>
  );
}
