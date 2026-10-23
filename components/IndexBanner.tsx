'use client';


import { axionFetch as fetch, axionAppPath } from '../lib/in-process';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from './WorkspaceLink';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { axionApiPath } from '../lib/in-process';
import { quoteStatusLabel, withCurrentStatus } from '../lib/market-quote';

interface IndexData {
  quoteAsOf?: string;
  quoteStatus?: string;
  price: number;
  change: number;
  changePercent: number;
  dataSource?: string;
}

interface IndicesResponse {
  source: string;
  retrievedAt?: string;
  cacheAgeMs?: number;
  stale?: boolean;
  nifty: IndexData | null;
  sensex: IndexData | null;
}

/* ─── Market Hours Helper ──────────────────────────────────── */
function getMarketSessionInfo() {
  const now = new Date();
  // IST offset is UTC+5:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + 3600000 * 5.5);
  const day = ist.getDay(); // 0 = Sun, 6 = Sat
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const totalMins = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  const isMarketOpen = isWeekday && totalMins >= 9 * 60 + 15 && totalMins <= 15 * 60 + 30;
  const isPreMarket = isWeekday && totalMins >= 9 * 60 && totalMins < 9 * 60 + 15;

  if (isMarketOpen) {
    return { status: 'NSE/BSE LIVE', color: 'emerald', text: 'Market Open · Closes 3:30 PM IST' };
  } else if (isPreMarket) {
    return { status: 'PRE-MARKET', color: 'amber', text: 'Pre-Market Orders Active' };
  } else {
    return { status: 'MARKET CLOSED', color: 'slate', text: 'Reopens 9:15 AM IST' };
  }
}

/* ─── SVG Sparkline with smooth gradients ──────────────────── */
function Sparkline({ prices, isUp, id }: { prices: number[]; isUp: boolean; id: string }) {
  if (prices.length < 2) {
    return (
      <div className="h-9 w-full flex items-center justify-center opacity-30 text-[10px] font-mono text-slate-400">
        Awaiting live ticks...
      </div>
    );
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 120;
  const H = 34;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const fillPts = `0,${H} ${pts} ${W},${H}`;
  const strokeColor = isUp ? '#10b981' : '#f43f5e';
  const gradId = `spark-grad-${id}`;

  return (
    <div className="relative w-full h-9 overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" aria-hidden className={isUp ? 'sparkline-glow-emerald' : 'sparkline-glow-rose'}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <polygon points={fillPts} fill={`url(#${gradId})`} />
        <polyline
          points={pts}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/* ─── Animated Price Counter ───────────────────────────────── */
function AnimatedPrice({ value, prefix = '₹' }: { value: number; prefix?: string }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;
    const dur = 500;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(from + (to - from) * eased);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  return (
    <span className="text-xl sm:text-2xl font-black tracking-tight font-mono text-slate-900 dark:text-white">
      {prefix}{display.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
    </span>
  );
}

/* ─── Index Card ───────────────────────────────────────────── */
function IndexCard({
  title, badge, indexData, priceHistory, delay = '0ms', id, source
}: {
  title: string;
  badge: string;
  indexData: IndexData | null;
  priceHistory: number[];
  delay?: string;
  id: string;
  source?: string;
}) {
  if (!indexData) {
    return (
      <div className="rounded-3xl border border-slate-200/70 dark:border-slate-800/80 p-5 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-sm animate-pulse">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
        <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
    );
  }

  const isUp = indexData.change >= 0;
  const isSimulated = indexData.quoteStatus === 'simulated' || source === 'simulated' || indexData.dataSource === 'simulated';
  const sourceLabel = isSimulated ? 'Simulated' : source === 'unavailable' ? 'Unavailable' : 'Yahoo Finance';
  const statusLabel = quoteStatusLabel(withCurrentStatus(indexData).quoteStatus);
  const timeLabel = indexData.quoteAsOf
    ? new Date(indexData.quoteAsOf).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) + ' IST'
    : 'Time n/a';

  // Intraday Day Range (derived from current price and change or price history)
  const price = indexData.price;
  const absChg = Math.abs(indexData.change);
  const histMin = priceHistory.length > 0 ? Math.min(...priceHistory) : price;
  const histMax = priceHistory.length > 0 ? Math.max(...priceHistory) : price;
  const dayLow = Math.min(histMin, isUp ? price - absChg * 1.1 : price - absChg * 0.4);
  const dayHigh = Math.max(histMax, isUp ? price + absChg * 0.4 : price + absChg * 1.1);
  const rangeSpan = Math.max(1, dayHigh - dayLow);
  const posPct = Math.max(0, Math.min(100, Math.round(((price - dayLow) / rangeSpan) * 100)));

  return (
    <div
      className={`group relative rounded-3xl border transition-all duration-300 backdrop-blur-xl overflow-hidden interactive-lift hover:shadow-2xl hover:-translate-y-1 ${
        isUp
          ? 'bg-gradient-to-b from-white/95 via-emerald-500/[0.05] to-white/95 dark:from-slate-900/90 dark:via-emerald-500/[0.08] dark:to-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/50 dark:hover:border-emerald-400/50 shadow-emerald-500/10'
          : 'bg-gradient-to-b from-white/95 via-rose-500/[0.05] to-white/95 dark:from-slate-900/90 dark:via-rose-500/[0.08] dark:to-slate-900/90 border-slate-200/80 dark:border-slate-800 hover:border-rose-500/50 dark:hover:border-rose-400/50 shadow-rose-500/10'
      }`}
      style={{ animationDelay: delay }}
    >
      {/* Ambient background glow on hover */}
      <div
        className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none ${
          isUp ? 'bg-emerald-400' : 'bg-rose-400'
        }`}
      />

      <div className="p-5 pb-2">
        {/* Header line */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            </span>
            <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {title}
            </span>
          </div>
          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
            isUp
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          }`}>
            {badge}
          </span>
        </div>

        {/* Price & Change Pill */}
        <div className="flex items-baseline justify-between gap-3 mt-1 flex-wrap">
          <AnimatedPrice value={indexData.price} />
          <span className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded-xl border shadow-2xs ${
            isUp
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60'
          }`}>
            {isUp ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownRight className="h-3 w-3 shrink-0" />}
            {isUp ? '+' : ''}{indexData.change.toFixed(2)} ({indexData.changePercent.toFixed(2)}%)
          </span>
        </div>

        {/* Intraday Day Range Slider */}
        <div className="mt-3 pt-2.5 border-t border-slate-100/80 dark:border-slate-800/60">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-1">
            <span>L: ₹{dayLow.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-sans font-semibold">Day Range</span>
            <span>H: ₹{dayHigh.toLocaleString('en-IN', { maximumFractionDigits: 1 })}</span>
          </div>
          <div className="relative h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-visible">
            <div
              className={`h-full rounded-full ${isUp ? 'bg-emerald-400/70' : 'bg-rose-400/70'}`}
              style={{ width: `${posPct}%` }}
            />
            {/* Range Position Indicator Dot */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 shadow-sm ${
                isUp ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              style={{ left: `${posPct}%` }}
              title={`Live Position: ${posPct}% of Day Range`}
            />
          </div>
        </div>

        {/* Source, Observation Time (IST) & Status (M3-03) */}
        <div data-testid={`index-provenance-${id}`} className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <span className="flex items-center gap-1.5 truncate">
            <span className={`h-1.5 w-1.5 rounded-full ${isSimulated ? 'bg-amber-400' : 'bg-emerald-500'}`} />
            {sourceLabel} · {statusLabel}
          </span>
          <span className="shrink-0">{timeLabel}</span>
        </div>
      </div>

      {/* Sparkline at bottom */}
      <div className="px-3 pb-2 pt-1">
        <Sparkline prices={priceHistory} isUp={isUp} id={id} />
      </div>
    </div>
  );
}

/* ─── Portfolio Card ───────────────────────────────────────── */
function PortfolioCard({
  portValue, port1DChange, portChangePercent, hasPortfolio, missingQuotes
}: {
  portValue: number;
  port1DChange: number;
  portChangePercent: number;
  hasPortfolio: boolean;
  missingQuotes: boolean;
}) {
  const isUp = port1DChange >= 0;

  return (
    <div className="group relative rounded-3xl border border-indigo-200/60 dark:border-indigo-900/50 bg-gradient-to-b from-white/90 via-indigo-500/[0.04] to-white/90 dark:from-slate-900/90 dark:via-indigo-500/[0.06] dark:to-slate-900/90 backdrop-blur-xl p-5 shadow-sm hover:shadow-2xl hover:border-indigo-400/70 dark:hover:border-indigo-400/60 interactive-lift transition-all duration-300 overflow-hidden flex flex-col justify-between">
      {/* Background radial highlight */}
      <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20 bg-indigo-500 pointer-events-none group-hover:opacity-40 transition-opacity" />

      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
              <TrendingUp className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs font-mono font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              Portfolio
            </span>
          </div>
          <Link
            href={axionAppPath("/portfolio")}
            className="inline-flex items-center gap-1 text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline"
          >
            Manage
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="mt-1">
          {hasPortfolio ? (
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <AnimatedPrice value={portValue} />
              <span className={`inline-flex items-center gap-1 text-xs font-bold font-mono px-2.5 py-1 rounded-xl border shadow-2xs ${
                isUp
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/70 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/70 dark:border-rose-800/60'
              }`}>
                {isUp ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownRight className="h-3 w-3 shrink-0" />}
                {isUp ? '+' : ''}{port1DChange.toFixed(2)} ({portChangePercent.toFixed(2)}%)
              </span>
            </div>
          ) : (
            <div className="py-2">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {missingQuotes ? 'Valuation in progress...' : 'No holdings yet'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                Add stocks to track live portfolio P&amp;L
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Footer bar */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="h-3 w-3 text-indigo-500" />
          Real-time mark-to-market
        </span>
        <span className="font-mono text-[10px]">1D Delta</span>
      </div>
    </div>
  );
}

/* ─── Main Index Banner ────────────────────────────────────── */
export default function IndexBanner() {
  const { dataSource, stocks, holdings } = useStockContext();
  const [data, setData] = useState<IndicesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [niftyHistory, setNiftyHistory] = useState<number[]>([]);
  const [sensexHistory, setSensexHistory] = useState<number[]>([]);

  const session = useMemo(() => getMarketSessionInfo(), []);

  useEffect(() => {
    let mounted = true;
    const fetchIndices = async () => {
      try {
        const res = await fetch(axionApiPath(`/api/indices?mode=${dataSource === 'real' ? 'real' : 'mock'}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: IndicesResponse = await res.json();
        if (mounted) {
          setData(json);
          setIsLoading(false);
          if (json.nifty) setNiftyHistory(prev => [...prev.slice(-19), json.nifty!.price]);
          if (json.sensex) setSensexHistory(prev => [...prev.slice(-19), json.sensex!.price]);
        }
      } catch {
        if (mounted) {
          setData({ source: 'unavailable', nifty: null, sensex: null });
          setIsLoading(false);
        }
      }
    };
    fetchIndices();
    const interval = setInterval(fetchIndices, 30000);
    return () => { mounted = false; clearInterval(interval); };
  }, [dataSource]);

  // Portfolio calculation
  let portValue = 0;
  let port1DChange = 0;
  stocks.forEach(stock => {
    const h = holdings[stock.ticker];
    if (h && h.quantity > 0) {
      portValue += h.quantity * stock.currentPrice;
      port1DChange += h.quantity * stock.change;
    }
  });
  const missingQuotes = Object.entries(holdings).some(([ticker, h]) => h.quantity > 0 && !stocks.some(s => s.ticker === ticker));
  const hasPortfolio = portValue > 0 && !missingQuotes;
  const portChangePercent = hasPortfolio ? (port1DChange / Math.max(portValue - port1DChange, 1)) * 100 : 0;

  return (
    <div className="space-y-3 mb-2 animate-fade-up">
      {/* Market Session Pill Bar */}
      <div className="flex items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              session.color === 'emerald' ? 'bg-emerald-400' : session.color === 'amber' ? 'bg-amber-400' : 'bg-slate-400'
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              session.color === 'emerald' ? 'bg-emerald-500' : session.color === 'amber' ? 'bg-amber-500' : 'bg-slate-400'
            }`} />
          </span>
          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide text-[11px]">
            {session.status}
          </span>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <span className="text-[11px] font-sans text-slate-500 dark:text-slate-400 hidden sm:inline">
            {session.text}
          </span>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <Clock className="h-3 w-3" />
          <span>Auto-refresh 30s</span>
        </div>
      </div>

      {/* Index Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <IndexCard
          id="nifty"
          title="Nifty 50"
          badge="NSE INDEX"
          indexData={data?.nifty ?? null}
          priceHistory={niftyHistory}
          delay="0ms"
          source={data?.source}
        />
        <IndexCard
          id="sensex"
          title="BSE Sensex"
          badge="BSE INDEX"
          indexData={data?.sensex ?? null}
          priceHistory={sensexHistory}
          delay="60ms"
          source={data?.source}
        />
        <PortfolioCard
          portValue={portValue}
          port1DChange={port1DChange}
          portChangePercent={portChangePercent}
          hasPortfolio={hasPortfolio}
          missingQuotes={missingQuotes}
        />
      </div>
    </div>
  );
}
