'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Maximize2,
  Layers,
  Sparkles,
  BarChart2,
  Calendar,
  Zap,
  Info,
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { axionApiPath } from '../lib/in-process';

type IndexKey = 'nifty' | 'banknifty' | 'sensex' | 'niftyit';
type TimeframeKey = '1W' | '1M' | '3M';

interface HistoricalBar {
  date: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndexRecord {
  name: string;
  symbol: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  history: HistoricalBar[];
}

interface IndicesApiResponse {
  nifty?: IndexRecord | null;
  banknifty?: IndexRecord | null;
  sensex?: IndexRecord | null;
  niftyit?: IndexRecord | null;
}

/* ─── Moving Average Helper ───────────────────────────────── */
function computeSMA(data: number[], window: number): (number | null)[] {
  return data.map((_, idx) => {
    if (idx < window - 1) return null;
    const slice = data.slice(idx - window + 1, idx + 1);
    const sum = slice.reduce((acc, v) => acc + v, 0);
    return +(sum / window).toFixed(2);
  });
}

function computeEMA(data: number[], window: number): (number | null)[] {
  const k = 2 / (window + 1);
  const emaValues: (number | null)[] = [];
  let prevEMA: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      emaValues.push(null);
    } else if (i === window - 1) {
      const slice = data.slice(0, window);
      prevEMA = slice.reduce((a, b) => a + b, 0) / window;
      emaValues.push(+prevEMA.toFixed(2));
    } else if (prevEMA !== null) {
      const currentVal = data[i];
      const ema: number = currentVal * k + prevEMA * (1 - k);
      prevEMA = ema;
      emaValues.push(+ema.toFixed(2));
    } else {
      emaValues.push(null);
    }
  }
  return emaValues;
}

/* ─── Custom Interactive Chart Tooltip ─────────────────────── */
function CustomChartTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;
  if (!data) return null;

  const isUp = data.close >= data.open;
  const changeVal = data.close - data.open;
  const changePct = ((changeVal / Math.max(data.open, 1)) * 100).toFixed(2);

  const formattedDate = new Date(data.date).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl text-xs font-mono text-slate-200 min-w-[200px] z-50">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
        <span className="text-slate-400 font-sans text-[11px] font-semibold">{formattedDate}</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}
        >
          {isUp ? '+' : ''}
          {changePct}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div>
          <span className="text-slate-500 text-[10px] uppercase block font-sans">Close</span>
          <span className="font-bold text-white">₹{data.close?.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block font-sans">Open</span>
          <span className="text-slate-300">₹{data.open?.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block font-sans">High</span>
          <span className="text-emerald-400">₹{data.high?.toLocaleString('en-IN')}</span>
        </div>
        <div>
          <span className="text-slate-500 text-[10px] uppercase block font-sans">Low</span>
          <span className="text-rose-400">₹{data.low?.toLocaleString('en-IN')}</span>
        </div>
        {data.ema20 && (
          <div className="col-span-2 pt-1 border-t border-slate-800/80 flex justify-between text-[10px]">
            <span className="text-cyan-400">20 EMA:</span>
            <span className="text-slate-300">₹{data.ema20?.toLocaleString('en-IN')}</span>
          </div>
        )}
        {data.sma50 && (
          <div className="col-span-2 flex justify-between text-[10px]">
            <span className="text-violet-400">50 SMA:</span>
            <span className="text-slate-300">₹{data.sma50?.toLocaleString('en-IN')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MarketBenchmarkChart() {
  const { dataSource } = useStockContext();
  const [indicesData, setIndicesData] = useState<IndicesApiResponse | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<IndexKey>('nifty');
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1M');
  const [showEMA, setShowEMA] = useState(true);
  const [showSMA, setShowSMA] = useState(false);
  const [showVolume, setShowVolume] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch benchmark data
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch(axionApiPath(`/api/indices?mode=${dataSource === 'real' ? 'real' : 'mock'}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (active) {
          setIndicesData(data);
          setIsLoading(false);
        }
      } catch {
        if (active) setIsLoading(false);
      }
    };
    load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [dataSource]);

  // Current active index record
  const currentRecord: IndexRecord | null = useMemo(() => {
    if (!indicesData) return null;
    return indicesData[selectedIndex] || null;
  }, [indicesData, selectedIndex]);

  // Filter and decorate chart points with EMAs/SMAs
  const chartData = useMemo(() => {
    if (!currentRecord || !currentRecord.history || !currentRecord.history.length) return [];

    let sliceCount = 20; // 1M ~ 20 trading days
    if (timeframe === '1W') sliceCount = 5;
    else if (timeframe === '3M') sliceCount = 65;

    const fullHistory = currentRecord.history;
    const closes = fullHistory.map(h => h.close);
    const ema20 = computeEMA(closes, 20);
    const sma50 = computeSMA(closes, 50);

    const decorated = fullHistory.map((item, idx) => ({
      ...item,
      ema20: ema20[idx],
      sma50: sma50[idx],
      label: new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    }));

    return decorated.slice(-sliceCount);
  }, [currentRecord, timeframe]);

  // Calculations for range meters & metrics
  const stats = useMemo(() => {
    if (!currentRecord) return null;
    const price = currentRecord.currentPrice || currentRecord.previousClose || 1;
    const dayHigh = currentRecord.high || price * 1.008;
    const dayLow = currentRecord.low || price * 0.992;
    const dayRange = Math.max(dayHigh - dayLow, 1);
    const dayPct = Math.min(100, Math.max(0, ((price - dayLow) / dayRange) * 100));

    // 52-week or 3M high/low estimate from history
    const historyPrices = (currentRecord.history || []).map(h => h.close).filter(Boolean);
    const min52 = historyPrices.length ? Math.min(...historyPrices) : dayLow * 0.92;
    const max52 = historyPrices.length ? Math.max(...historyPrices) : dayHigh * 1.08;
    const range52 = Math.max(max52 - min52, 1);
    const pct52 = Math.min(100, Math.max(0, ((price - min52) / range52) * 100));

    // Technical Bias estimation
    const isAbovePrev = currentRecord.change >= 0;
    const lastPoint = chartData[chartData.length - 1];
    const aboveEMA20 = lastPoint?.ema20 ? price >= lastPoint.ema20 : isAbovePrev;
    const bias =
      aboveEMA20 && isAbovePrev
        ? { label: 'Bullish Momentum', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' }
        : !aboveEMA20 && !isAbovePrev
        ? { label: 'Correction / Defensive', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' }
        : { label: 'Consolidation Range', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };

    return {
      price,
      dayHigh,
      dayLow,
      dayPct,
      min52,
      max52,
      pct52,
      bias,
    };
  }, [currentRecord, chartData]);

  // Determine trend color for chart gradient
  const trendIsUp = useMemo(() => {
    if (chartData.length < 2) return true;
    return chartData[chartData.length - 1].close >= chartData[0].close;
  }, [chartData]);

  const strokeColor = trendIsUp ? '#10b981' : '#f43f5e';
  const fillColor = trendIsUp ? '#10b981' : '#f43f5e';

  // Min and max for Y-Axis
  const yDomain = useMemo(() => {
    if (!chartData.length) return ['auto', 'auto'];
    const lows = chartData.map(d => d.low || d.close).filter(Boolean);
    const highs = chartData.map(d => d.high || d.close).filter(Boolean);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const padding = (max - min) * 0.08 || 10;
    return [Math.floor(min - padding), Math.ceil(max + padding)];
  }, [chartData]);

  const indexTabs: { id: IndexKey; label: string; ticker: string }[] = [
    { id: 'nifty', label: 'NIFTY 50', ticker: 'NSE Benchmark' },
    { id: 'banknifty', label: 'BANK NIFTY', ticker: 'Financial Sector' },
    { id: 'sensex', label: 'SENSEX', ticker: 'BSE Benchmark' },
    { id: 'niftyit', label: 'NIFTY IT', ticker: 'Tech Index' },
  ];

  return (
    <div
      id="market-benchmark-chart-terminal"
      className="relative rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800/90 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl shadow-xl p-5 sm:p-7 space-y-6 animate-fade-up"
    >
      {/* ─── Top Index Selection Tabs ───────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full lg:w-auto">
          {indexTabs.map(tab => {
            const isSelected = selectedIndex === tab.id;
            const rec = indicesData ? indicesData[tab.id] : null;
            const price = rec?.currentPrice;
            const changePct = rec?.changePercent ?? 0;
            const isUp = changePct >= 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedIndex(tab.id)}
                className={`p-3 rounded-2xl text-left transition-all duration-200 cursor-pointer border ${
                  isSelected
                    ? 'bg-indigo-600/10 dark:bg-indigo-500/15 border-indigo-500 text-slate-900 dark:text-white shadow-sm ring-1 ring-indigo-500/30'
                    : 'bg-slate-50/70 dark:bg-slate-900/60 border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-black font-mono tracking-tight">{tab.label}</span>
                  {rec && (
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isUp ? 'text-emerald-500 bg-emerald-500/10' : 'text-rose-500 bg-rose-500/10'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-extrabold font-mono text-slate-900 dark:text-slate-100">
                    {price ? `₹${price.toLocaleString('en-IN')}` : '—'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-sans truncate hidden sm:inline">
                    {tab.ticker}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Timeframe & Overlays Toolbar */}
        <div className="flex items-center justify-between lg:justify-end gap-2 flex-wrap">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-800">
            {(['1W', '1M', '3M'] as const).map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Indicator toggles */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowEMA(v => !v)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                showEMA
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-600 dark:text-cyan-300'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              20 EMA
            </button>
            <button
              type="button"
              onClick={() => setShowSMA(v => !v)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                showSMA
                  ? 'bg-violet-500/15 border-violet-500/40 text-violet-600 dark:text-violet-300'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              50 SMA
            </button>
            <button
              type="button"
              onClick={() => setShowVolume(v => !v)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                showVolume
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-600 dark:text-indigo-300'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Volume
            </button>
          </div>
        </div>
      </div>

      {/* ─── Hero Index Stats Strip ─────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/70 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60">
          {/* Active Price & Verdict */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                ₹{stats.price.toLocaleString('en-IN')}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                  currentRecord?.change! >= 0
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                }`}
              >
                {currentRecord?.change! >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {currentRecord?.change! >= 0 ? '+' : ''}
                {currentRecord?.change?.toFixed(2)} ({currentRecord?.changePercent?.toFixed(2)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${stats.bias.color}`}>
                {stats.bias.label}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Prev: ₹{currentRecord?.previousClose?.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Intraday Range Bar */}
          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Day L: ₹{stats.dayLow.toLocaleString('en-IN')}</span>
              <span className="text-slate-500 font-sans font-medium text-[10px]">Session Range</span>
              <span className="text-slate-400">Day H: ₹{stats.dayHigh.toLocaleString('en-IN')}</span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-visible">
              <div
                className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-80"
                style={{ width: '100%' }}
              />
              {/* Position Needle Hub */}
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 shadow-md"
                style={{ left: `${stats.dayPct}%` }}
              />
            </div>
          </div>

          {/* 52-Week / Quarterly Range Bar */}
          <div className="space-y-1.5 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400">Range L: ₹{stats.min52.toLocaleString('en-IN')}</span>
              <span className="text-slate-500 font-sans font-medium text-[10px]">Quarterly Range</span>
              <span className="text-slate-400">Range H: ₹{stats.max52.toLocaleString('en-IN')}</span>
            </div>
            <div className="relative w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-visible">
              <div
                className="absolute top-0 bottom-0 left-0 rounded-full bg-indigo-500/70"
                style={{ width: `${stats.pct52}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-400 shadow-md"
                style={{ left: `${stats.pct52}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Interactive Recharts Canvas ───────────────────────── */}
      <div className="relative w-full">
        {isLoading ? (
          <div className="h-72 w-full flex items-center justify-center animate-pulse bg-slate-100 dark:bg-slate-900/60 rounded-2xl">
            <Activity className="h-8 w-8 text-indigo-500 animate-spin opacity-40" />
          </div>
        ) : chartData.length > 0 ? (
          <div className="space-y-2">
            {/* Primary Price Area Chart */}
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="indexPriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={fillColor} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={fillColor} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800/80" />
                  <XAxis
                    dataKey="label"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={24}
                  />
                  <YAxis
                    domain={yDomain as any}
                    orientation="right"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `₹${(v / 1000).toFixed(1)}k`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />

                  {/* Previous close reference line */}
                  {currentRecord?.previousClose && (
                    <ReferenceLine
                      y={currentRecord.previousClose}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      strokeOpacity={0.6}
                    />
                  )}

                  {/* Main Price Area */}
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={strokeColor}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#indexPriceGrad)"
                    dot={false}
                    activeDot={{ r: 5, fill: strokeColor, stroke: '#fff', strokeWidth: 2 }}
                  />

                  {/* Moving Averages */}
                  {showEMA && (
                    <Line
                      type="monotone"
                      dataKey="ema20"
                      stroke="#06b6d4"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {showSMA && (
                    <Line
                      type="monotone"
                      dataKey="sma50"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Synchronized Volume Sub-Panel */}
            {showVolume && (
              <div className="h-16 w-full pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 2, right: 10, left: 10, bottom: 0 }}>
                    <Bar
                      dataKey="volume"
                      fill="#6366f1"
                      opacity={0.35}
                      radius={[2, 2, 0, 0]}
                    />
                    <YAxis orientation="right" hide />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-400 text-xs font-mono">
            Benchmark feed temporarily offline. Polling live stream...
          </div>
        )}
      </div>

      {/* ─── Footer Technical Intelligence Bar ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4 flex-wrap font-mono text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300 font-bold">Tick Stream:</span> Active
          </span>
          {showEMA && (
            <span className="flex items-center gap-1 text-cyan-500">
              <span className="w-2 h-0.5 bg-cyan-400 inline-block" />
              20 EMA Trend
            </span>
          )}
          {showSMA && (
            <span className="flex items-center gap-1 text-violet-500">
              <span className="w-2 h-0.5 bg-violet-400 inline-block" />
              50 SMA Baseline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <Info className="h-3.5 w-3.5" />
          <span>Calculated on official NSE/BSE regular market sessions</span>
        </div>
      </div>
    </div>
  );
}
