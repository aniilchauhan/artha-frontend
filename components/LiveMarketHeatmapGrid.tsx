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
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import QuickTradeModal from './QuickTradeModal';

interface LiveMarketHeatmapGridProps {
  customStocks?: any[];
  initialFilter?: 'all' | 'small_cap' | 'gainers' | 'losers' | 'high_volume' | 'radar';
}

export default function LiveMarketHeatmapGrid({
  customStocks,
  initialFilter = 'small_cap',
}: LiveMarketHeatmapGridProps = {}) {
  const { stocks: contextStocks, setSelectedTicker, setActiveTab } = useStockContext();
  const stocks = customStocks || contextStocks;
  const [filterMode, setFilterMode] = useState<'all' | 'small_cap' | 'gainers' | 'losers' | 'high_volume' | 'radar'>(initialFilter);
  const [search, setSearch] = useState('');
  const [tradeStock, setTradeStock] = useState<any | null>(null);

  const filteredStocks = useMemo(() => {
    let pool = stocks || [];

    // Filter out synthetic/mock BSE catalogue items that have dummy numeric suffixes (e.g., PTC3, INDRAPRASTHA5)
    pool = pool.filter((s) => {
      const sym = (s.symbol || s.ticker || '').replace(/\.(NS|BO)$/, '');
      if (s.exchange === 'BSE' || s.ticker?.endsWith('.BO')) return false;
      if (/\d+$/.test(sym)) return false;
      return true;
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      pool = pool.filter(
        (s) =>
          s.ticker.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.sector && s.sector.toLowerCase().includes(q))
      );
    }

    switch (filterMode) {
      case 'small_cap': {
        // Genuine small caps (Market Cap between ₹100 Cr and ₹25,000 Cr) sorted by highest gainers
        const smallCaps = pool.filter((s) => s.marketCap && s.marketCap >= 50 && s.marketCap <= 25000);
        const list = smallCaps.length > 0 ? smallCaps : pool.filter((s) => !s.marketCap || s.marketCap <= 25000);
        return [...list].sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      }
      case 'gainers':
        return pool.filter((s) => (s.changePercent || 0) >= 1.0).sort((a, b) => b.changePercent - a.changePercent);
      case 'losers':
        return pool.filter((s) => (s.changePercent || 0) < 0).sort((a, b) => a.changePercent - b.changePercent);
      case 'high_volume':
        return pool.filter((s) => (s.volume || 0) > 100_000).sort((a, b) => (b.volume || 0) - (a.volume || 0));
      case 'radar':
        // Highlight stocks with positive momentum (>2%) or active breakout characteristics
        return pool.filter((s) => (s.changePercent || 0) >= 2.0 || (s.changePercent || 0) <= -2.0);
      default:
        return pool;
    }
  }, [stocks, filterMode, search]);

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
      className="rounded-3xl border border-slate-200/80 bg-white/70 p-5 backdrop-blur-xl shadow-sm dark:border-slate-800 dark:bg-slate-900/70"
    >
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white shadow-md">
            <Grid className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Live Intraday Multi-Indicator Heatmap
              </h3>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 font-mono text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                {filteredStocks.length} Equities
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visual real-time matrix of NSE market movers, momentum anomalies, and volume expansion
            </p>
          </div>
        </div>

        {/* Search & Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-36 rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            {(
              [
                { id: 'small_cap', label: '💎 Small Cap' },
                { id: 'all', label: 'All' },
                { id: 'gainers', label: '+1.5% Gainers' },
                { id: 'losers', label: 'Losers' },
                { id: 'high_volume', label: 'High Vol' },
                { id: 'radar', label: '⚡ Anomaly' },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
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
          </div>
        </div>
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
        {filteredStocks.slice(0, 48).map((stock) => {
          const isUp = stock.changePercent >= 0;
          const isExtreme = Math.abs(stock.changePercent) >= 3.0;

          return (
            <div
              key={stock.ticker}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-3 transition-all duration-200 hover:scale-[1.03] hover:z-20 cursor-pointer shadow-xs ${getHeatmapColor(
                stock.changePercent
              )}`}
              onClick={() => {
                setSelectedTicker(stock.ticker);
                setActiveTab('dashboard');
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-black tracking-tight">{stock.ticker}</span>
                  {isExtreme && (
                    <span className="flex h-1.5 w-1.5 animate-ping rounded-full bg-amber-300" />
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] opacity-80">{stock.name}</p>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-xs font-bold">
                    ₹{(stock.currentPrice ?? (stock as any).price ?? 0).toFixed(1)}
                  </span>
                  <span className="text-xs font-black">
                    {isUp ? '+' : ''}
                    {stock.changePercent.toFixed(2)}%
                  </span>
                </div>

                {/* Sub-Badges on Hover */}
                <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-1.5 text-[9px] font-mono opacity-80 group-hover:opacity-100">
                  <span>{stock.sector ? stock.sector.slice(0, 10) : 'Equity'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTradeStock(stock);
                    }}
                    className="cursor-pointer rounded bg-black/20 px-1 py-0.5 font-bold hover:bg-black/30"
                    title="Open price scenario"
                  >
                    Price Scenario
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
          currentPrice={tradeStock.currentPrice ?? (tradeStock as any).price ?? 0}
          initialTargetPct={tradeStock.changePercent >= 2 ? 10.0 : 2.0}
        />
      )}
    </section>
  );
}
