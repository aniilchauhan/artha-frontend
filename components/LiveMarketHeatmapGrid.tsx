'use client';

import React, { useState, useMemo } from 'react';
import {
  Grid,
  Filter,
  TrendingUp,
  TrendingDown,
  Flame,
  Zap,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Layers,
  Target,
  Sparkles,
  Compass,
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { calculateDetailedStockSuggestion } from '../lib/stock-data';
import { calculateReturnMetrics } from '../lib/return-metrics';
import QuickTradeModal from './QuickTradeModal';

interface LiveMarketHeatmapGridProps {
  customStocks?: any[];
  initialFilter?: string;
}

export default function LiveMarketHeatmapGrid({
  customStocks,
  initialFilter = 'all',
}: LiveMarketHeatmapGridProps = {}) {
  const { stocks: contextStocks, setSelectedTicker, setActiveTab } = useStockContext();
  const rawStocks = customStocks || contextStocks;

  // Mode: 'forward' (who can move AFTER current time) vs 'retrospective' (who already moved earlier today)
  const [viewPerspective, setViewPerspective] = useState<'forward' | 'retrospective'>('forward');
  const [filterMode, setFilterMode] = useState<string>(initialFilter);
  const [columns, setColumns] = useState<3 | 4 | 5>(4); // Default to 4 items per row (less items, more room)
  const [search, setSearch] = useState('');
  const [tradeStock, setTradeStock] = useState<any | null>(null);

  const gridColsClass = useMemo(() => {
    switch (columns) {
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5';
      case 4:
      default:
        return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4';
    }
  }, [columns]);

  // Enrich all stocks with forward-looking return metrics from current price (CMP)
  const enrichedPool = useMemo(() => {
    let pool = rawStocks || [];

    // Filter out synthetic/mock BSE catalogue items that have dummy numeric suffixes
    pool = pool.filter((s) => {
      const sym = (s.symbol || s.ticker || '').replace(/\.(NS|BO)$/, '');
      if (s.exchange === 'BSE' || s.ticker?.endsWith('.BO')) return false;
      if (/\d+$/.test(sym)) return false;
      return true;
    });

    return pool.map((s) => {
      const detailed = Array.isArray(s.history) && s.history.length >= 20 ? calculateDetailedStockSuggestion(s.history) : null;
      const metrics = calculateReturnMetrics(s, detailed);
      const cmp = s.currentPrice ?? (s as any).price ?? 100;
      const targetPrice = metrics.targetPrice || Number((cmp * (1 + metrics.projectedReturnPercent / 100)).toFixed(2));
      const stopLossPrice = metrics.stopLossPrice || Number((cmp * (1 - metrics.downsideRiskPercent / 100)).toFixed(2));
      
      // Coiled condition: Stock has NOT already surged past +3.5% today (so the move is still ahead of us!)
      const pastChange = s.changePercent ?? 0;
      const isCoiled = pastChange <= 2.8 && pastChange >= -2.0 && metrics.projectedReturnPercent >= 2.0;

      return {
        ...s,
        cmp,
        detailed,
        returnMetrics: metrics,
        targetPrice,
        stopLossPrice,
        projectedReturnPercent: metrics.projectedReturnPercent,
        riskRewardRatio: metrics.riskRewardRatio,
        setupType: metrics.setupType,
        isCoiled,
      };
    });
  }, [rawStocks]);

  const filteredStocks = useMemo(() => {
    let pool = enrichedPool;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.sector && s.sector.toLowerCase().includes(q))
      );
    }

    if (viewPerspective === 'forward') {
      switch (filterMode) {
        case 'next_2_5':
          // Stocks consolidating/coiled in base (not already spiked) with +2% to +5% target from CMP
          return pool
            .filter((s) => s.isCoiled && s.projectedReturnPercent >= 2.0 && s.projectedReturnPercent <= 6.0)
            .sort((a, b) => b.projectedReturnPercent - a.projectedReturnPercent);

        case 'swings_5_plus':
          // Setups with >= 5% forward expansion potential
          return pool
            .filter((s) => (s.changePercent ?? 0) <= 3.0 && s.projectedReturnPercent >= 5.0)
            .sort((a, b) => b.projectedReturnPercent - a.projectedReturnPercent);

        case 'small_cap_bases':
          // Small caps consolidating near support base with forward upside
          return pool
            .filter((s) => (!s.marketCap || s.marketCap <= 25000) && (s.changePercent ?? 0) <= 2.5 && s.projectedReturnPercent >= 2.5)
            .sort((a, b) => b.projectedReturnPercent - a.projectedReturnPercent);

        case 'high_rr':
          // Asymmetric setups with Risk-Reward >= 2.5x
          return pool
            .filter((s) => (s.changePercent ?? 0) <= 3.0 && s.riskRewardRatio >= 2.5)
            .sort((a, b) => b.riskRewardRatio - a.riskRewardRatio);

        case 'gainers':
          return pool.filter((s) => (s.changePercent || 0) >= 1.0).sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
        case 'losers':
          return pool.filter((s) => (s.changePercent || 0) < 0).sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));

        case 'all':
        case 'all_forward':
        default:
          // All forward setups sorted by projected return from CMP
          return [...pool].sort((a, b) => b.projectedReturnPercent - a.projectedReturnPercent);
      }
    } else {
      // Retrospective view: Today's Past Movers
      switch (filterMode) {
        case 'small_cap': {
          const smallCaps = pool.filter((s) => s.marketCap && s.marketCap >= 50 && s.marketCap <= 25000);
          const list = smallCaps.length > 0 ? smallCaps : pool.filter((s) => !s.marketCap || s.marketCap <= 25000);
          return [...list].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
        }
        case 'gainers':
          return pool.filter((s) => (s.changePercent || 0) >= 1.0).sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
        case 'losers':
          return pool.filter((s) => (s.changePercent || 0) < 0).sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
        case 'high_volume':
          return pool.filter((s) => (s.volume || 0) > 100_000).sort((a, b) => (b.volume || 0) - (a.volume || 0));
        case 'radar':
          return pool.filter((s) => (s.changePercent || 0) >= 2.0 || (s.changePercent || 0) <= -2.0);
        case 'all':
        default:
          return [...pool].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      }
    }
  }, [enrichedPool, viewPerspective, filterMode, search]);

  const getHeatmapColor = (pct: number) => {
    if (pct >= 5.0) return 'bg-emerald-600/90 text-white border-emerald-500 shadow-emerald-500/20';
    if (pct >= 2.0) return 'bg-emerald-500/80 text-white border-emerald-400/80 shadow-emerald-500/10';
    if (pct >= 0.5) return 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-200 border-emerald-500/30';
    if (pct > -0.5) return 'bg-slate-100 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200 border-slate-200 dark:border-slate-700/60';
    if (pct > -2.0) return 'bg-rose-500/30 text-rose-900 dark:text-rose-200 border-rose-500/30';
    if (pct > -5.0) return 'bg-rose-500/80 text-white border-rose-400/80 shadow-rose-500/10';
    return 'bg-rose-600/90 text-white border-rose-500 shadow-rose-500/20';
  };

  return (
    <section
      aria-label="Live Intraday Heatmap"
      id="live-market-heatmap-grid"
      className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur-xl shadow-sm dark:border-slate-800 dark:bg-slate-900/70 space-y-4"
    >
      {/* ─── Top Header & Dual Perspective Switcher ─── */}
      <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white shadow-xs">
              <Grid className="h-4 w-4" />
            </div>
            <h3 className="font-sans text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <span>Live Intraday Multi-Indicator Heatmap</span>
              {viewPerspective === 'forward' && (
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                  Predictive Next Moves
                </span>
              )}
            </h3>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              {filteredStocks.length} Setups
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {viewPerspective === 'forward'
              ? 'Modeled forward return targets for stocks currently consolidating near base (ready to move after current price CMP)'
              : 'Visual real-time matrix of NSE market movers and historical intraday expansion'}
          </p>
        </div>

        {/* View Perspective Selector: Forward (Next Moves) vs Retrospective (Past Movers) */}
        <div className="flex items-center gap-2 self-start lg:self-center">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setViewPerspective('forward');
                setFilterMode('all');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewPerspective === 'forward'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Target className="h-3.5 w-3.5 text-emerald-500" />
              <span>Next Moves (After CMP)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewPerspective('retrospective');
                setFilterMode('small_cap');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewPerspective === 'retrospective'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5 text-slate-400" />
              <span>Already Moved Today</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Search & Sub-Filter Toolbar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Quick Search & Per-Row Control */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Density Selector: 3 | 4 | 5 items per row */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 px-1.5">Per row:</span>
            {([3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setColumns(n)}
                aria-label={`${n} cards per row`}
                className={`cursor-pointer rounded-lg px-2.5 py-0.5 text-xs font-mono font-bold transition-all ${
                  columns === n
                    ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filter Pills */}
        <div className="flex flex-wrap rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800 gap-1">
          {viewPerspective === 'forward' ? (
            <>
              {[
                { id: 'all', label: 'All Forward' },
                { id: 'next_2_5', label: '🎯 Next 2–5% Breakouts' },
                { id: 'small_cap_bases', label: '💎 Small Cap Coils' },
                { id: 'swings_5_plus', label: '🚀 5%+ Swings' },
                { id: 'high_rr', label: '⚡ High R:R (≥2.5x)' },
                { id: 'gainers', label: '+1.5% Gainers' },
                { id: 'losers', label: 'Losers' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilterMode(btn.id)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    filterMode === btn.id || (btn.id === 'all' && filterMode === 'all_forward')
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </>
          ) : (
            <>
              {[
                { id: 'small_cap', label: '💎 Small Cap' },
                { id: 'all', label: 'All' },
                { id: 'gainers', label: '+1.5% Gainers' },
                { id: 'losers', label: 'Losers' },
                { id: 'high_volume', label: 'High Vol' },
                { id: 'radar', label: '⚡ Anomaly' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => setFilterMode(btn.id)}
                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    filterMode === btn.id
                      ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ─── Grid Matrix ─── */}
      <div className={`grid ${gridColsClass} gap-3.5`}>
        {filteredStocks.slice(0, 48).map((stock) => {
          if (viewPerspective === 'forward') {
            // Forward Perspective: Highlights modeled upside from CMP
            const projectedPct = stock.projectedReturnPercent || 3.0;

            return (
              <div
                key={stock.ticker}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-emerald-500/70 p-4 transition-all duration-200 hover:scale-[1.02] hover:z-20 cursor-pointer shadow-xs hover:shadow-xl hover:shadow-emerald-500/10"
                onClick={() => {
                  setSelectedTicker(stock.ticker);
                  setActiveTab('dashboard');
                }}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black tracking-tight text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {stock.ticker}
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Coiled
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{stock.name}</p>
                </div>

                {/* Forward Upside Hero Badge */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between font-mono bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-2.5 py-1.5">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-300">Modeled Upside</span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      +{projectedPct}%
                    </span>
                  </div>

                  {/* CMP, Target Levels & Today's Past Change */}
                  <div className="bg-slate-50 dark:bg-slate-950/70 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80 font-mono text-[11px] space-y-1">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>CMP:</span>
                      <span className="font-bold text-slate-900 dark:text-white">₹{stock.cmp.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                      <span>Target:</span>
                      <span>₹{stock.targetPrice.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400 dark:text-slate-500 pt-1 border-t border-slate-200/50 dark:border-slate-800/50 text-[10px]">
                      <span>Today:</span>
                      <span className={`font-semibold ${(stock.changePercent ?? 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {(stock.changePercent ?? 0) >= 0 ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer setup type & Action */}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px] font-mono text-slate-500">
                  <span className="font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[140px]">{stock.setupType || 'Breakout'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTradeStock(stock);
                    }}
                    className="cursor-pointer rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 font-bold text-[11px] transition-colors"
                    title="Open Trade Scenario"
                  >
                    Trade ⚡
                  </button>
                </div>
              </div>
            );
          }

          // Retrospective Perspective: Today's past gainers
          const isUp = (stock.changePercent ?? 0) >= 0;
          const isExtreme = Math.abs(stock.changePercent ?? 0) >= 3.0;

          return (
            <div
              key={stock.ticker}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:scale-[1.02] hover:z-20 cursor-pointer shadow-xs ${getHeatmapColor(
                stock.changePercent ?? 0
              )}`}
              onClick={() => {
                setSelectedTicker(stock.ticker);
                setActiveTab('dashboard');
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm font-black tracking-tight">{stock.ticker}</span>
                  {isExtreme && (
                    <span className="flex h-2 w-2 animate-ping rounded-full bg-amber-300" />
                  )}
                </div>
                <p className="mt-1 truncate text-xs opacity-85">{stock.name}</p>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-sm font-bold">
                    ₹{stock.cmp.toFixed(1)}
                  </span>
                  <span className="text-sm font-black">
                    {isUp ? '+' : ''}
                    {(stock.changePercent ?? 0).toFixed(2)}%
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-black/10 pt-2 text-[10px] font-mono opacity-85 group-hover:opacity-100">
                  <span className="font-medium">{stock.sector || 'Equity'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTradeStock(stock);
                    }}
                    className="cursor-pointer rounded-lg bg-black/20 hover:bg-black/30 px-2.5 py-1 font-bold text-[11px]"
                    title="Open price scenario"
                  >
                    Trade ⚡
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStocks.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-400">
          No stocks match the selected heatmap filter criteria.
        </div>
      )}

      {/* Quick Trade Modal */}
      {tradeStock && (
        <QuickTradeModal
          isOpen={true}
          onClose={() => setTradeStock(null)}
          ticker={tradeStock.ticker}
          name={tradeStock.name}
          currentPrice={tradeStock.cmp || tradeStock.currentPrice || 0}
          initialTargetPct={tradeStock.projectedReturnPercent || 2.0}
        />
      )}
    </section>
  );
}
