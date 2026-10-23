'use client';


import { axionAppPath } from '../lib/in-process';
import React from 'react';
import Link from './WorkspaceLink';
import {
  TrendingUp,
  Zap,
  Target,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Rocket,
  ChevronRight,
  Flame,
  Percent,
  Coins
} from 'lucide-react';
import { StockReturnMetrics } from '../lib/return-metrics';
import { Stock, DetailedSuggestionResult } from '../lib/stock-data';

interface ReturnAlphaBannerProps {
  scoredStocks: {
    stock: Stock;
    detailed: DetailedSuggestionResult;
    returnMetrics: StockReturnMetrics;
  }[];
  selectedCapital: number;
  onCapitalChange: (capital: number) => void;
  activeCategory: string;
  onSelectCategory: (category: any) => void;
  onSelectTicker: (ticker: string) => void;
}

export default function ReturnAlphaBanner({
  scoredStocks,
  selectedCapital,
  onCapitalChange,
  activeCategory,
  onSelectCategory,
  onSelectTicker,
}: ReturnAlphaBannerProps) {
  // Aggregate return statistics
  const topRoiStock = React.useMemo(() => {
    if (!scoredStocks.length) return null;
    return [...scoredStocks].sort(
      (a, b) => b.returnMetrics.projectedReturnPercent - a.returnMetrics.projectedReturnPercent
    )[0];
  }, [scoredStocks]);

  const topRrStock = React.useMemo(() => {
    if (!scoredStocks.length) return null;
    return [...scoredStocks]
      .filter(s => s.detailed.suggestion === 'BUY' || s.detailed.score >= 40)
      .sort((a, b) => b.returnMetrics.riskRewardRatio - a.returnMetrics.riskRewardRatio)[0] || scoredStocks[0];
  }, [scoredStocks]);

  const breakoutCount = React.useMemo(() => {
    return scoredStocks.filter(s => s.returnMetrics.isBreakout).length;
  }, [scoredStocks]);

  const highAlphaCount = React.useMemo(() => {
    return scoredStocks.filter(s => s.returnMetrics.isHighAlpha).length;
  }, [scoredStocks]);

  const avgBuyYield = React.useMemo(() => {
    const buySet = scoredStocks.filter(s => s.detailed.suggestion === 'BUY' || s.detailed.score >= 50);
    if (!buySet.length) return 0;
    const sum = buySet.reduce((acc, curr) => acc + curr.returnMetrics.projectedReturnPercent, 0);
    return Number((sum / buySet.length).toFixed(1));
  }, [scoredStocks]);

  return (
    <div
      id="return-alpha-banner"
      className="relative rounded-3xl overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-white dark:from-slate-950 via-slate-50 dark:via-slate-900 to-indigo-50/70 dark:to-indigo-950/70 p-5 sm:p-7 shadow-2xl shadow-emerald-950/20 text-slate-900 dark:text-white space-y-6 animate-fade-up"
    >
      {/* Background glow flares */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 left-10 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

      {/* Top Banner Row: Headline & Quick Return Switchers */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <TrendingUp className="h-5 w-5" />
            </span>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white font-mono flex items-center gap-2">
              <span>Technical Scenario Planner</span>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Target ROI Focused
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
            Illustrative targets and stop levels from technical rules. These scenarios are not validated return forecasts.
          </p>
        </div>

        {/* Position Capital Sizer Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2 text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
            <Coins className="h-3.5 w-3.5 text-amber-700 dark:text-amber-400" />
            <span>Research budget:</span>
          </div>
          <div className="flex items-center gap-1">
            {[25000, 50000, 100000, 250000].map(cap => (
              <button
                key={cap}
                type="button"
                onClick={() => onCapitalChange(cap)}
                className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  selectedCapital === cap
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25 scale-[1.03]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                ₹{cap >= 100000 ? `${cap / 100000}L` : `${cap / 1000}K`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Return Performance KPI Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Top Projected Return */}
        <div
          onClick={() => topRoiStock && onSelectTicker(topRoiStock.stock.ticker)}
          className="group relative bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-emerald-500/40 hover:border-emerald-400 rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
              <Target className="h-3.5 w-3.5" />
              Peak ROI Target
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 flex items-center gap-0.5">
              Analyze <ChevronRight className="h-3 w-3" />
            </span>
          </div>
          {topRoiStock ? (
            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black font-mono text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                  {topRoiStock.stock.ticker}
                </span>
                <span className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-400">
                  +{topRoiStock.returnMetrics.projectedReturnPercent}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-400">
                <span>CMP: ₹{topRoiStock.stock.currentPrice.toFixed(1)}</span>
                <span className="text-emerald-700 dark:text-emerald-300 font-bold">Target: ₹{topRoiStock.returnMetrics.targetPrice.toFixed(1)}</span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-emerald-700 dark:text-emerald-400/90 flex justify-between">
                <span>Est. Gain ({selectedCapital >= 100000 ? `₹${selectedCapital/100000}L` : `₹${selectedCapital/1000}K`}):</span>
                <span className="font-bold">+₹{Math.round(selectedCapital * (topRoiStock.returnMetrics.projectedReturnPercent / 100)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-600 dark:text-slate-500">Scanning universe...</span>
          )}
        </div>

        {/* Card 2: Average Alpha Target */}
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-lg">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" />
              Average scenario upside
            </span>
            <span className="text-[10px] font-mono text-slate-600 dark:text-slate-500">Buy Signals</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black font-mono text-indigo-700 dark:text-indigo-300">
                +{avgBuyYield}%
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded-full border border-indigo-500/30">
                Alpha Mean
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Scenario average across {scoredStocks.filter(s => s.detailed.suggestion === 'BUY' || s.detailed.score >= 50).length} ranked setups
            </p>
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-indigo-700 dark:text-indigo-300/90 flex justify-between">
              <span>Illustrative gain:</span>
              <span className="font-bold">+₹{Math.round(selectedCapital * (avgBuyYield / 100)).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Card 3: +2% Breakout Momentum */}
        <div
          onClick={() => onSelectCategory('breakout')}
          className={`group bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-0.5 ${
            activeCategory === 'breakout'
              ? 'border-amber-400 ring-1 ring-amber-400/40 bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-amber-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              +2% Breakouts Active
            </span>
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 group-hover:underline">
              Filter Now
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                {breakoutCount} Equities
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                Surging
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Immediate volume &amp; price expansion past intraday resistance
            </p>
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-amber-700 dark:text-amber-300/90 flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-700 dark:text-amber-400" />
              <span>Price and volume rule matches</span>
            </div>
          </div>
        </div>

        {/* Card 4: Best Risk/Reward Asymmetry */}
        <div
          onClick={() => onSelectCategory('high_rr')}
          className={`group bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800 border rounded-2xl p-4 transition-all duration-300 cursor-pointer shadow-lg hover:-translate-y-0.5 ${
            activeCategory === 'high_rr'
              ? 'border-teal-400 ring-1 ring-teal-400/40 bg-teal-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-teal-500/50'
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Asymmetric 2.5:1+ R:R
            </span>
            <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 group-hover:underline">
              Filter Now
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-black font-mono text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300 transition-colors">
                {highAlphaCount} Setups
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30">
                {topRrStock ? `${topRrStock.returnMetrics.riskRewardRatio}x Max` : '3.2x'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Tight downside floor with outsized reward headroom
            </p>
            <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-teal-700 dark:text-teal-300/90 flex justify-between">
              <span>Risk/Reward Leader:</span>
              <span className="font-bold">{topRrStock?.stock.ticker || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launchpad to Dedicated Return Engines */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <Rocket className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
            <span>High Return Engines:</span>
          </span>

          <Link
            href={axionAppPath("/small-cap-predictions")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold transition-all hover:scale-[1.02]"
          >
            <span>Small-Cap 2% Picks</span>
            <span className="text-[10px] bg-emerald-500/30 px-1.5 py-0.2 rounded font-mono">3,168 NSE</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href={axionAppPath("/stock-ai")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-700 dark:text-indigo-300 font-bold transition-all hover:scale-[1.02]"
          >
            <span>Multibagger AI Screener</span>
            <span className="text-[10px] bg-indigo-500/30 px-1.5 py-0.2 rounded font-mono">GBDT</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>

          <Link
            href={axionAppPath("/backtest")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-300 font-bold transition-all hover:scale-[1.02]"
          >
            <span>Quant Backtester</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
          Based on available provider observations; targets do not establish a future edge
        </div>
      </div>
    </div>
  );
}
