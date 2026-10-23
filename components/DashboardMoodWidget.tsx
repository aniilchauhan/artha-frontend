'use client';

import React, { useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { BarChart3, TrendingUp, TrendingDown, Layers } from 'lucide-react';

interface SectorData {
  sector: string;
  avgChange: number;
  count: number;
  up: number;
  down: number;
  topStock: { ticker: string; changePercent: number };
}

function getMoodTheme(avg: number) {
  if (avg >= 1.5) {
    return {
      bar: 'from-emerald-500 to-teal-400',
      text: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200/60 dark:border-emerald-800/60',
      badge: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
    };
  }
  if (avg > 0) {
    return {
      bar: 'from-teal-500 to-emerald-400',
      text: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      border: 'border-teal-200/60 dark:border-teal-800/60',
      badge: 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
    };
  }
  if (avg > -1.5) {
    return {
      bar: 'from-amber-500 to-orange-400',
      text: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200/60 dark:border-amber-800/60',
      badge: 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
    };
  }
  return {
    bar: 'from-rose-500 to-red-500',
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200/60 dark:border-rose-800/60',
    badge: 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
  };
}

export default function DashboardMoodWidget() {
  const { stocks, isLoading, setSelectedTicker, setActiveTab } = useStockContext();

  const sectors = useMemo<SectorData[]>(() => {
    const map = new Map<string, { changes: number[]; up: number; down: number; stocks: { ticker: string; changePercent: number }[] }>();
    stocks.forEach(s => {
      const sector = s.sector || 'General';
      if (!map.has(sector)) map.set(sector, { changes: [], up: 0, down: 0, stocks: [] });
      const entry = map.get(sector)!;
      entry.changes.push(s.changePercent);
      entry.stocks.push({ ticker: s.ticker, changePercent: s.changePercent });
      if (s.changePercent > 0) entry.up++;
      else if (s.changePercent < 0) entry.down++;
    });

    return Array.from(map.entries())
      .map(([sector, d]) => {
        const sortedStocks = [...d.stocks].sort((a, b) => b.changePercent - a.changePercent);
        return {
          sector,
          avgChange: d.changes.reduce((a, b) => a + b, 0) / d.changes.length,
          count: d.changes.length,
          up: d.up,
          down: d.down,
          topStock: sortedStocks[0] || { ticker: '', changePercent: 0 },
        };
      })
      .sort((a, b) => b.avgChange - a.avgChange)
      .slice(0, 8);
  }, [stocks]);

  if (isLoading || !sectors.length) {
    return (
      <div className="rounded-3xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 backdrop-blur-xl animate-pulse space-y-4">
        <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  const maxAbs = Math.max(...sectors.map(s => Math.abs(s.avgChange)), 0.5);

  return (
    <div
      id="dashboard-mood-widget"
      className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
              Sector Heatmap
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Ranked by net index momentum &amp; leaders
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
          {sectors.length} Sectors
        </span>
      </div>

      {/* Sector List */}
      <div className="space-y-3">
        {sectors.map((s) => {
          const theme = getMoodTheme(s.avgChange);
          const barWidth = Math.min(100, Math.max(8, Math.round((Math.abs(s.avgChange) / maxAbs) * 100)));
          const isUp = s.avgChange >= 0;

          return (
            <div
              key={s.sector}
              className="group p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`p-1 rounded-lg ${isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'} shrink-0`}>
                    {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {s.sector}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Top stock pill */}
                  {s.topStock.ticker && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicker(s.topStock.ticker);
                        setActiveTab('dashboard');
                      }}
                      className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors cursor-pointer hidden sm:inline"
                      title="Inspect sector leader"
                    >
                      ★ {s.topStock.ticker} ({s.topStock.changePercent > 0 ? '+' : ''}{s.topStock.changePercent.toFixed(1)}%)
                    </button>
                  )}
                  <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg border ${theme.bg} ${theme.text} ${theme.border}`}>
                    {isUp ? '+' : ''}{s.avgChange.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full rounded-full bg-slate-200/80 dark:bg-slate-700/60 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${theme.bar} transition-all duration-700 ease-out`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5">
                <span>{s.count} tracked equities</span>
                <span className="text-slate-400">
                  <span className="text-emerald-500 font-bold">{s.up}↑</span> / <span className="text-rose-500 font-bold">{s.down}↓</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

