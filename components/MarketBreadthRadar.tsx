'use client';

import React, { useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Flame,
  Activity,
  ArrowUpRight,
  Sparkles,
  Compass,
} from 'lucide-react';

export default function MarketBreadthRadar() {
  const { stocks, setSelectedTicker, setActiveTab } = useStockContext();

  // Advance / Decline Breadth
  const breadth = useMemo(() => {
    if (!stocks || !stocks.length) return { advances: 0, declines: 0, unchanged: 0, advPct: 50, decPct: 50 };
    let advances = 0;
    let declines = 0;
    let unchanged = 0;

    stocks.forEach(s => {
      if (s.changePercent > 0.05) advances++;
      else if (s.changePercent < -0.05) declines++;
      else unchanged++;
    });

    const total = advances + declines + unchanged || 1;
    const advPct = Math.round((advances / total) * 100);
    const decPct = Math.round((declines / total) * 100);

    return { advances, declines, unchanged, advPct, decPct };
  }, [stocks]);

  // 52-Week High Breakout Radar (stocks near their highest price point)
  const highBreakouts = useMemo(() => {
    return stocks
      .map(stock => {
        const historyPrices = (stock.history || []).map(h => h.close).filter(Boolean);
        const maxPrice = historyPrices.length ? Math.max(...historyPrices) : stock.currentPrice;
        const distFromHighPct = ((maxPrice - stock.currentPrice) / maxPrice) * 100;
        return { stock, maxPrice, distFromHighPct };
      })
      .filter(item => item.distFromHighPct <= 3.5 && item.stock.changePercent > 0)
      .sort((a, b) => a.distFromHighPct - b.distFromHighPct)
      .slice(0, 4);
  }, [stocks]);

  // Volume Surge Accumulation (stocks with top volume and positive 1D change)
  const volumeSurges = useMemo(() => {
    return [...stocks]
      .filter(s => s.changePercent > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 4);
  }, [stocks]);

  // Contrarian Oversold Dip Candidates (dips with high technical conviction)
  const oversoldDips = useMemo(() => {
    return [...stocks]
      .filter(s => s.changePercent <= -0.5)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 4);
  }, [stocks]);

  const handleStockClick = (ticker: string) => {
    setSelectedTicker(ticker);
    setActiveTab('dashboard');
  };

  return (
    <div
      id="market-breadth-radar-panel"
      className="rounded-3xl border border-slate-200/80 dark:border-slate-800/90 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-sm space-y-5 animate-fade-up"
    >
      {/* ─── Breadth Ratio & Header ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Compass className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
              Market Breadth &amp; Technical Breakouts
            </h3>
            <p className="text-[11px] text-slate-400">
              Institutional order flow momentum &amp; technical range expansions
            </p>
          </div>
        </div>

        {/* Advance/Decline Counts */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
            <TrendingUp className="h-3.5 w-3.5" />
            {breadth.advances} Advancing ({breadth.advPct}%)
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
            <TrendingDown className="h-3.5 w-3.5" />
            {breadth.declines} Declining ({breadth.decPct}%)
          </span>
        </div>
      </div>

      {/* Visual Breadth Bar */}
      <div className="relative w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
        <div
          className="h-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${breadth.advPct}%` }}
        />
        <div
          className="h-full bg-rose-500 transition-all duration-700"
          style={{ width: `${breadth.decPct}%` }}
        />
      </div>

      {/* ─── Breakout Radars Grid ──────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        {/* Radar 1: 52-Week High Breakouts */}
        <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Near 52W Highs
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Within 3.5%</span>
          </div>

          <div className="space-y-1.5">
            {highBreakouts.length > 0 ? (
              highBreakouts.map(({ stock, distFromHighPct }) => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleStockClick(stock.ticker)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-800/60 transition-colors text-left cursor-pointer group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {stock.ticker}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate font-sans">
                      ₹{stock.currentPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      +{stock.changePercent.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      -{distFromHighPct.toFixed(1)}% High
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">Scanning for 52W breakouts...</p>
            )}
          </div>
        </div>

        {/* Radar 2: Institutional Volume Expansion */}
        <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <Zap className="h-3.5 w-3.5 text-indigo-500" />
              Volume Expansion
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Heavy Inflows</span>
          </div>

          <div className="space-y-1.5">
            {volumeSurges.length > 0 ? (
              volumeSurges.map(stock => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleStockClick(stock.ticker)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-800/60 transition-colors text-left cursor-pointer group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {stock.ticker}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate font-sans">
                      ₹{stock.currentPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                      {(stock.volume / 1000).toFixed(0)}k Vol
                    </span>
                    <span className="text-[9px] text-emerald-500 block mt-0.5">
                      +{stock.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">Tracking volume inflows...</p>
            )}
          </div>
        </div>

        {/* Radar 3: Oversold Pullbacks / Value Dips */}
        <div className="rounded-2xl bg-slate-50/70 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800/60 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 font-mono">
              <Activity className="h-3.5 w-3.5 text-rose-500" />
              Dip Opportunities
            </span>
            <span className="text-[10px] text-slate-400 font-mono">Support Watch</span>
          </div>

          <div className="space-y-1.5">
            {oversoldDips.length > 0 ? (
              oversoldDips.map(stock => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => handleStockClick(stock.ticker)}
                  className="w-full flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-rose-50/40 dark:hover:bg-rose-950/20 border border-slate-200/60 dark:border-slate-800/60 transition-colors text-left cursor-pointer group"
                >
                  <div className="min-w-0">
                    <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400">
                      {stock.ticker}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate font-sans">
                      ₹{stock.currentPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                      {stock.changePercent.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      Pullback
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No major pullbacks detected.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
