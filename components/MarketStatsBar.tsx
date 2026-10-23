'use client';

import React, { useMemo, useEffect, useState } from 'react';
import { useStockContext } from '../context/StockContext';
import { Stock } from '../lib/stock-data';
import { TrendingUp, TrendingDown, Minus, Activity, Gauge, Flame } from 'lucide-react';

function useAnimatedValue(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const from = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

function FearGreedGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color =
    clampedScore < 25 ? '#f43f5e'
    : clampedScore < 40 ? '#fb923c'
    : clampedScore < 60 ? '#facc15'
    : clampedScore < 75 ? '#10b981'
    : '#06b6d4';

  const label =
    clampedScore < 25 ? 'Extreme Fear'
    : clampedScore < 40 ? 'Fear'
    : clampedScore < 60 ? 'Neutral'
    : clampedScore < 75 ? 'Greed'
    : 'Extreme Greed';

  const rad = (((clampedScore / 100) * 270 - 135 - 90) * Math.PI) / 180;
  const nx = 32 + 22 * Math.cos(rad);
  const ny = 32 + 22 * Math.sin(rad);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg viewBox="0 0 64 42" width="76" height="48" aria-label={`Fear & Greed: ${label}`}>
        {/* Track */}
        <path
          d="M 8 36 A 24 24 0 1 1 56 36"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          className="text-slate-200 dark:text-slate-800"
        />
        {/* Value Arc */}
        <path
          d="M 8 36 A 24 24 0 1 1 56 36"
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${(clampedScore / 100) * 75.4} 75.4`}
          className="transition-all duration-700 ease-out"
        />
        {/* Needle Line & Hub */}
        <line
          x1="32"
          y1="32"
          x2={nx.toFixed(1)}
          y2={ny.toFixed(1)}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="3.5" fill={color} />
        <text
          x="32"
          y="42"
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          fontWeight="800"
          className="font-mono text-slate-800 dark:text-slate-100"
        >
          {Math.round(clampedScore)}
        </text>
      </svg>
      <span
        className="text-[10px] font-black tracking-wider uppercase font-mono px-2 py-0.5 rounded-full border border-current/20"
        style={{ color }}
      >
        {label}
      </span>
    </div>
  );
}

export default function MarketStatsBar({ customStocks }: { customStocks?: Stock[] } = {}) {
  const { stocks: contextStocks, isLoading } = useStockContext();
  const stocks = customStocks && customStocks.length > 0 ? customStocks : contextStocks;

  const stats = useMemo(() => {
    if (!stocks.length) return null;
    const up = stocks.filter(s => s.changePercent > 0).length;
    const down = stocks.filter(s => s.changePercent < 0).length;
    const flat = stocks.length - up - down;
    const breadth = stocks.length > 0 ? Math.round((up / stocks.length) * 100) : 50;
    const avgChange = stocks.reduce((a, s) => a + s.changePercent, 0) / stocks.length;
    const breadthComponent = breadth;
    const momentumComponent = Math.min(100, Math.max(0, 50 + avgChange * 5));
    const fearGreed = Math.round((breadthComponent * 0.6) + (momentumComponent * 0.4));
    return { up, down, flat, total: stocks.length, breadth, fearGreed, avgChange };
  }, [stocks]);

  const animatedUp = useAnimatedValue(stats?.up ?? 0);
  const animatedDown = useAnimatedValue(stats?.down ?? 0);
  const animatedBreadth = useAnimatedValue(stats?.breadth ?? 0);

  if (isLoading || !stats) {
    return (
      <div className="rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 p-5 animate-pulse flex gap-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-9 w-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  const breadthLabel =
    stats.breadth >= 65 ? 'Bullish Dominance'
    : stats.breadth >= 52 ? 'Moderate Bullish'
    : stats.breadth >= 48 ? 'Balanced Breadth'
    : stats.breadth >= 35 ? 'Moderate Bearish'
    : 'Heavy Selling Pressure';

  const breadthBarGradient =
    stats.breadth >= 60 ? 'from-emerald-500 to-teal-400'
    : stats.breadth >= 45 ? 'from-amber-500 to-yellow-400'
    : 'from-rose-500 to-red-400';

  const adRatio = stats.down > 0 ? (stats.up / stats.down).toFixed(2) : stats.up.toFixed(1);

  return (
    <div
      id="market-stats-bar"
      className="rounded-3xl bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 p-4 sm:p-5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-wrap items-center justify-between gap-4 lg:gap-6 animate-fade-up hover:border-slate-300 dark:hover:border-slate-700"
    >
      {/* Advancing / Declining / Unchanged Counters + A/D Ratio */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        {/* Advancing */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 shadow-xs hover:scale-[1.02] transition-transform">
          <span className="p-1.5 rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
            <TrendingUp className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              {animatedUp}
            </div>
            <div className="text-[10px] text-emerald-700 dark:text-emerald-300/80 font-bold uppercase tracking-wider mt-0.5">
              Advancing
            </div>
          </div>
        </div>

        {/* Declining */}
        <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-rose-50/90 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-800/60 shadow-xs hover:scale-[1.02] transition-transform">
          <span className="p-1.5 rounded-xl bg-rose-500 text-white shadow-sm shadow-rose-500/30">
            <TrendingDown className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-base font-black font-mono text-rose-600 dark:text-rose-400 leading-none">
              {animatedDown}
            </div>
            <div className="text-[10px] text-rose-700 dark:text-rose-300/80 font-bold uppercase tracking-wider mt-0.5">
              Declining
            </div>
          </div>
        </div>

        {/* Unchanged / Flat */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800/70">
          <span className="p-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
            <Minus className="h-3.5 w-3.5" />
          </span>
          <div>
            <div className="text-base font-black font-mono text-slate-700 dark:text-slate-300 leading-none">
              {stats.flat}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Flat
            </div>
          </div>
        </div>

        {/* A/D Ratio Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/40 text-[10px] font-mono">
          <span className="text-slate-400 font-sans font-bold">A/D Ratio:</span>
          <span className={`font-black ${Number(adRatio) >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {adRatio}:1
          </span>
        </div>
      </div>

      {/* Market Breadth Progress Bar */}
      <div className="flex-1 min-w-[200px] max-w-sm">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-indigo-500" />
            <span>Market Breadth</span>
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold ${stats.avgChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}% avg
            </span>
            <span className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400">
              {animatedBreadth}%
            </span>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${breadthBarGradient} transition-all duration-1000 ease-out`}
            style={{ width: `${stats.breadth}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
          <span>{breadthLabel}</span>
          <span>{stats.total} Tracked</span>
        </div>
      </div>

      {/* Fear & Greed Index */}
      <div className="hidden md:flex items-center gap-3.5 border-l border-slate-200/60 dark:border-slate-800/70 pl-4 lg:pl-6">
        <FearGreedGauge score={stats.fearGreed} />
        <div>
          <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>Market Sentiment</span>
          </div>
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            Real-time multi-factor index
          </div>
        </div>
      </div>
    </div>
  );
}
