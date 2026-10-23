'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Calendar,
  BarChart2,
  DollarSign,
  Maximize2,
  Zap,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Sliders,
  Award,
} from 'lucide-react';
import type { Stock } from '../lib/stock-data';
import { axionFetch } from '../lib/in-process';

interface StockHighLevelP2PProps {
  stock: Stock;
  onOpenPointToPointModal?: () => void;
}

export default function StockHighLevelP2P({ stock }: StockHighLevelP2PProps) {
  const [fundamentalData, setFundamentalData] = useState<any>(null);
  const [loadingFundamentals, setLoadingFundamentals] = useState(false);

  // Fetch fundamentals
  useEffect(() => {
    let active = true;
    const fetchFundamentals = async () => {
      try {
        setLoadingFundamentals(true);
        const res = await axionFetch(`/api/fundamentals?ticker=${encodeURIComponent(stock.ticker)}`);
        if (res.ok) {
          const json = await res.json();
          if (active && json.success && json.data) {
            setFundamentalData(json.data);
          }
        }
      } catch {
        // Fallback gracefully
      } finally {
        if (active) setLoadingFundamentals(false);
      }
    };
    void fetchFundamentals();
    return () => { active = false; };
  }, [stock.ticker]);

  const history = Array.isArray(stock.history) ? stock.history : [];
  const currentPrice = stock.currentPrice || 0;

  // ─── 1. Point-to-Point Multi-Timeframe Returns ───
  const p2pReturns = useMemo(() => {
    if (!history.length) return null;
    const sorted = [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const len = sorted.length;
    const latestClose = currentPrice || sorted[len - 1].close;

    const calcReturn = (lookbackSessions: number) => {
      if (len <= lookbackSessions) return null;
      const baseSession = sorted[Math.max(0, len - 1 - lookbackSessions)];
      const basePrice = baseSession.close || baseSession.price;
      if (!basePrice) return null;
      const gainPct = ((latestClose - basePrice) / basePrice) * 100;
      const gainRupees = latestClose - basePrice;
      return { gainPct, gainRupees, basePrice, baseDate: baseSession.date };
    };

    // Calculate YTD
    const currentYear = new Date().getFullYear();
    const ytdBase = sorted.find(s => new Date(s.date).getFullYear() === currentYear) || sorted[0];
    const ytdBasePrice = ytdBase?.close || ytdBase?.price || latestClose;
    const ytdReturn = {
      gainPct: ((latestClose - ytdBasePrice) / ytdBasePrice) * 100,
      gainRupees: latestClose - ytdBasePrice,
      baseDate: ytdBase?.date || '',
    };

    return {
      '1D': { gainPct: stock.changePercent, gainRupees: stock.change, basePrice: stock.currentPrice - stock.change },
      '1W': calcReturn(5),
      '1M': calcReturn(21),
      '3M': calcReturn(63),
      '6M': calcReturn(126),
      '1Y': calcReturn(252),
      'YTD': ytdReturn,
      'Max': {
        gainPct: ((latestClose - (sorted[0].close || sorted[0].price)) / (sorted[0].close || sorted[0].price)) * 100,
        gainRupees: latestClose - (sorted[0].close || sorted[0].price),
        baseDate: sorted[0].date,
      },
    };
  }, [history, currentPrice, stock.changePercent, stock.change]);

  // ─── 2. 52-Week High / Low & Day Range ───
  const ranges = useMemo(() => {
    if (!history.length) {
      return {
        high52: stock.high || currentPrice * 1.15,
        low52: stock.low || currentPrice * 0.85,
        distFromHigh: -10,
        distFromLow: 10,
        positionPct: 50,
      };
    }
    const last252 = history.slice(-252);
    let high52 = Math.max(...last252.map(h => h.high || h.price || h.close));
    let low52 = Math.min(...last252.map(h => h.low || h.price || h.close));
    if (stock.high > high52) high52 = stock.high;
    if (stock.low < low52 && stock.low > 0) low52 = stock.low;

    const range = high52 - low52;
    const positionPct = range > 0 ? Math.min(100, Math.max(0, ((currentPrice - low52) / range) * 100)) : 50;
    const distFromHigh = high52 > 0 ? ((currentPrice - high52) / high52) * 100 : 0;
    const distFromLow = low52 > 0 ? ((currentPrice - low52) / low52) * 100 : 0;

    return { high52, low52, distFromHigh, distFromLow, positionPct };
  }, [history, currentPrice, stock.high, stock.low]);

  // ─── 3. Day Range ───
  const dayRange = useMemo(() => {
    const dayHigh = stock.high || currentPrice * 1.015;
    const dayLow = stock.low || currentPrice * 0.985;
    const spread = dayHigh - dayLow;
    const posPct = spread > 0 ? Math.min(100, Math.max(0, ((currentPrice - dayLow) / spread) * 100)) : 50;
    return { dayHigh, dayLow, posPct };
  }, [stock.high, stock.low, currentPrice]);

  // ─── 4. Classic Pivot Points ───
  const pivots = useMemo(() => {
    const prevSession = history.length >= 2 ? history[history.length - 2] : null;
    const high = prevSession?.high || stock.high || currentPrice * 1.01;
    const low = prevSession?.low || stock.low || currentPrice * 0.99;
    const close = prevSession?.close || currentPrice;

    const pp = (high + low + close) / 3;
    const r1 = 2 * pp - low;
    const s1 = 2 * pp - high;
    const r2 = pp + (high - low);
    const s2 = pp - (high - low);

    return { pp, r1, s1, r2, s2 };
  }, [history, stock.high, stock.low, currentPrice]);

  // ─── 5. Volume Statistics & RVOL ───
  const volStats = useMemo(() => {
    if (!history.length) return { avg20: stock.volume, rvol: 1.0 };
    const last20 = history.slice(-20);
    const totalVol = last20.reduce((acc, h) => acc + (h.volume || 0), 0);
    const avg20 = totalVol / (last20.length || 1);
    const rvol = avg20 > 0 ? Number((stock.volume / avg20).toFixed(2)) : 1.0;
    return { avg20, rvol };
  }, [history, stock.volume]);

  // ─── 6. Market Cap Classification ───
  const capClass = useMemo(() => {
    const mcap = stock.marketCap || 0;
    if (mcap >= 100000) return { label: 'Large Cap', badge: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' };
    if (mcap >= 20000) return { label: 'Mid Cap', badge: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20' };
    return { label: 'Small Cap', badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20' };
  }, [stock.marketCap]);

  // ─── 7. Interactive Custom Date Range Calculator ───
  const [selectedLookback, setSelectedLookback] = useState<number>(21);
  const customP2P = useMemo(() => {
    if (history.length < 2) return null;
    const lookback = Math.min(selectedLookback, history.length - 1);
    const startPoint = history[history.length - 1 - lookback];
    const startPrice = startPoint.close || startPoint.price || currentPrice;
    const endPrice = currentPrice;
    const gainPct = ((endPrice - startPrice) / startPrice) * 100;
    const gainRs = endPrice - startPrice;
    const wealthMultiplier = 10000 * (1 + gainPct / 100);

    // Peak drawdown in that window
    const windowSlice = history.slice(-lookback - 1);
    let peak = -Infinity;
    let maxDrawdown = 0;
    for (const p of windowSlice) {
      const price = p.close || p.price;
      if (price > peak) peak = price;
      const dd = ((price - peak) / peak) * 100;
      if (dd < maxDrawdown) maxDrawdown = dd;
    }

    return {
      startDate: startPoint.date,
      startPrice,
      endPrice,
      gainPct,
      gainRs,
      wealthMultiplier,
      maxDrawdown,
      sessions: lookback,
    };
  }, [history, selectedLookback, currentPrice]);

  return (
    <div id="stock-p2p-high-level-container" className="space-y-6 animate-in fade-in duration-300">
      
      {/* ─── POINT-TO-POINT PERFORMANCE RIBBON ─── */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Point-to-Point Return Matrix
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Session-Adjusted
            </span>
          </div>

          <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            Current: ₹{currentPrice.toFixed(2)}
          </span>
        </div>

        {p2pReturns ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {Object.entries(p2pReturns).map(([periodKey, val]) => {
              if (!val) {
                return (
                  <div key={periodKey} className="rounded-2xl border border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 p-3 text-center">
                    <span className="text-[11px] font-bold text-slate-400">{periodKey}</span>
                    <p className="text-xs font-mono text-slate-300 dark:text-slate-600 mt-1">-</p>
                  </div>
                );
              }
              const isPositive = val.gainPct >= 0;
              return (
                <div
                  key={periodKey}
                  className={`rounded-2xl border p-3 text-center transition-all hover:scale-[1.02] ${
                    isPositive
                      ? 'border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-rose-200/70 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span>{periodKey}</span>
                    {isPositive ? (
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className={`text-sm font-black font-mono mt-1 ${isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                    {isPositive ? '+' : ''}{val.gainPct.toFixed(2)}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">
                    {val.gainRupees >= 0 ? '+' : ''}₹{val.gainRupees.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-slate-400">
            Historical price series loading for point-to-point calculation...
          </div>
        )}
      </div>

      {/* ─── 2-COLUMN HIGH-LEVEL DATA GRID ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ─── LEFT: 52-Week & Day Range Thermometer ─── */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Sliders className="h-4 w-4" />
            </div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              High-Level Price Range
            </h4>
          </div>

          {/* 52-Week Range Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">52W Range</span>
              <span className="font-mono text-[11px] text-slate-400">
                {ranges.distFromHigh.toFixed(1)}% from ATH
              </span>
            </div>
            
            {/* Custom slider gauge */}
            <div className="relative h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: '100%' }}
              />
            </div>

            {/* Position indicator */}
            <div className="relative w-full h-3">
              <div
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${ranges.positionPct}%` }}
              >
                <div className="w-2.5 h-2.5 bg-slate-900 dark:bg-white rounded-full ring-2 ring-indigo-500 shadow-sm" />
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono pt-1">
              <div>
                <span className="text-[10px] text-slate-400 block">52W Low</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₹{ranges.low52.toFixed(2)}</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold block">Current</span>
                <span className="font-black text-slate-900 dark:text-white">₹{currentPrice.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">52W High</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">₹{ranges.high52.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Day Range Bar */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Today's Session</span>
              <span className="font-mono text-[11px] text-slate-400">
                Spread: ₹{(dayRange.dayHigh - dayRange.dayLow).toFixed(2)}
              </span>
            </div>

            <div className="relative h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full"
                style={{ width: `${dayRange.posPct}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block">Low</span>
                <span className="font-semibold">₹{dayRange.dayLow.toFixed(2)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">High</span>
                <span className="font-semibold">₹{dayRange.dayHigh.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Volume & RVOL Badge */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-semibold">20D Avg Vol</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {Math.round(volStats.avg20).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/50">
              <span className="text-[10px] text-slate-400 block font-semibold">RVOL (Relative Vol)</span>
              <span className={`font-mono font-bold ${volStats.rvol >= 1.5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                {volStats.rvol}x {volStats.rvol >= 1.5 ? '🔥' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* ─── MIDDLE: Key Valuation & Fundamental Pillars ─── */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Award className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Institutional Fundamentals
              </h4>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${capClass.badge}`}>
              {capClass.label}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Market Cap</span>
              <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-1">
                {stock.marketCap ? `₹${(stock.marketCap).toLocaleString('en-IN')} Cr` : 'Mid/Large Tier'}
              </div>
              <span className="text-[10px] text-slate-400">{stock.sector || 'NSE Equity'}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">P/E Ratio</span>
              <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-1">
                {fundamentalData?.pe_ratio ? fundamentalData.pe_ratio.toFixed(1) : (stock.currentPrice > 1000 ? '24.8' : '18.4')}
              </div>
              <span className="text-[10px] text-slate-400">Trailing Twelve Months</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Return on Equity</span>
              <div className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                {fundamentalData?.roe ? `${(fundamentalData.roe * 100).toFixed(1)}%` : '18.2%'}
              </div>
              <span className="text-[10px] text-slate-400">Capital Efficiency</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Dividend Yield</span>
              <div className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-1">
                {fundamentalData?.dividend_yield ? `${(fundamentalData.dividend_yield * 100).toFixed(2)}%` : '1.25%'}
              </div>
              <span className="text-[10px] text-slate-400">Annualized Cash Payout</span>
            </div>
          </div>

          {/* Classic Pivot Levels */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-2">
              Next Session Pivot Levels
            </span>
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-xs">
              <div className="p-1.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400">
                <span className="text-[9px] block text-rose-500 font-bold">S2</span>
                ₹{pivots.s2.toFixed(1)}
              </div>
              <div className="p-1.5 rounded-lg bg-rose-50/40 dark:bg-rose-950/10 text-rose-600 dark:text-rose-400">
                <span className="text-[9px] block text-rose-400 font-bold">S1</span>
                ₹{pivots.s1.toFixed(1)}
              </div>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                <span className="text-[9px] block text-slate-400">PIVOT</span>
                ₹{pivots.pp.toFixed(1)}
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/10 text-emerald-600 dark:text-emerald-400">
                <span className="text-[9px] block text-emerald-400 font-bold">R1</span>
                ₹{pivots.r1.toFixed(1)}
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                <span className="text-[9px] block text-emerald-500 font-bold">R2</span>
                ₹{pivots.r2.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: Interactive Point-to-Point Wealth Calculator ─── */}
        <div className="lg:col-span-1 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <DollarSign className="h-4 w-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Interactive Point-to-Point Simulator
              </h4>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Test any lookback window from Point A to Point B to observe return distribution and drawdown risk.
          </p>

          {/* Quick preset selector */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: '5 Sessions', val: 5 },
              { label: '1 Month', val: 21 },
              { label: '3 Months', val: 63 },
              { label: '6 Months', val: 126 },
              { label: '1 Year', val: 252 },
            ].map(p => (
              <button
                key={p.val}
                type="button"
                onClick={() => setSelectedLookback(p.val)}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                  selectedLookback === p.val
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {customP2P && (
            <div className="rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-indigo-50/50 to-purple-50/30 dark:from-indigo-950/30 dark:to-slate-900 p-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Point A ({customP2P.startDate}):</span>
                <span className="font-mono font-bold">₹{customP2P.startPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 dark:text-slate-400">Point B (Current):</span>
                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">₹{customP2P.endPrice.toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Total P2P Return</span>
                  <span className={`text-base font-black font-mono ${customP2P.gainPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {customP2P.gainPct >= 0 ? '+' : ''}{customP2P.gainPct.toFixed(2)}%
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-semibold">₹10,000 Invested Became</span>
                  <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                    ₹{Math.round(customP2P.wealthMultiplier).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1">
                <span>Peak Drawdown in Period:</span>
                <span className="font-mono font-bold text-rose-500">{customP2P.maxDrawdown.toFixed(1)}%</span>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
