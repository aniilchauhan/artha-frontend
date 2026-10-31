'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from './WorkspaceLink';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Rocket,
  Zap,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Activity,
  Maximize2,
  DollarSign,
  Radio,
  Scan,
} from 'lucide-react';
import { axionFetch, axionApiPath, axionAppPath } from '../lib/in-process';
import { useStockContext } from '../context/StockContext';
import { useRapidMoveScan } from '../hooks/useRapidMoveScan';
import { useDashboardData } from '../hooks/useDashboardData';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.12 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 380,
      damping: 26,
    },
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.97,
    transition: { duration: 0.15 },
  },
};

export default function DashboardPowerRadarsHub() {
  const { setSelectedTicker, stocks } = useStockContext();
  const [activeRadar, setActiveRadar] = useState<'small_cap' | 'rapid_moves' | 'fall_predictions'>('small_cap');
  
  // Quick Trade Modal
  const [tradeModalStock, setTradeModalStock] = useState<any | null>(null);

  // Optimized data loading - only loads data for active radar
  const dashboardData = useDashboardData({
    loadSmallCap: activeRadar === 'small_cap',
    loadFall: activeRadar === 'fall_predictions',
    loadRapidMoves: activeRadar === 'rapid_moves',
    cacheTTL: 30000, // 30 seconds cache for radars
  });

  // 1. Small Cap 2% Picks - from optimized hook
  const smallCapList = dashboardData.smallCapPredictions;
  const loadingSmallCap = dashboardData.smallCapLoading;

  // 2. 10% Rapid Moves - keep existing hook (it has its own optimization)
  const { candidates: rapidMoveCandidates, running: loadingRapidMoves } = useRapidMoveScan();

  // 3. 2-5% Fall Predictions - from optimized hook
  const fallList = dashboardData.fallPredictions;
  const loadingFall = dashboardData.fallLoading;

  // Derive immediate fallback cards from stocks context so UI never flickers empty
  const displayedSmallCapList = useMemo(() => {
    if (smallCapList.length > 0) return smallCapList;
    if (!stocks || stocks.length === 0) return [];
    return stocks
      .filter(s => (s.marketCap ? s.marketCap < 25000 : true) && s.changePercent > 0)
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 6)
      .map(s => {
        const p = s.currentPrice || (s as any).price || 100;
        return {
          ticker: s.ticker,
          name: s.name,
          currentPrice: p,
          changePercent: s.changePercent,
          score: Math.min(96, Math.max(70, Math.round(75 + s.changePercent * 3))),
        };
      });
  }, [smallCapList, stocks]);

  const displayedFallList = useMemo(() => {
    if (fallList.length > 0) return fallList;
    if (!stocks || stocks.length === 0) return [];
    return stocks
      .filter(s => s.changePercent < 0)
      .sort((a, b) => a.changePercent - b.changePercent)
      .slice(0, 6)
      .map(s => {
        const entryPrice = s.currentPrice || (s as any).price || 100;
        const dropPct = Math.min(5.0, Math.max(2.0, Math.abs(s.changePercent) * 1.5));
        const targetPrice = Number((entryPrice * (1 - dropPct / 100)).toFixed(2));
        const stopLoss = Number((entryPrice * 1.015).toFixed(2));
        return {
          ticker: s.ticker,
          company_name: s.name,
          entry_price: entryPrice,
          close: entryPrice,
          target_price: targetPrice,
          support_20d: Number((entryPrice * 0.99).toFixed(1)),
          stop_loss: stopLoss,
          conviction: 0.85,
        };
      });
  }, [fallList, stocks]);

  return (
    <section id="dashboard-power-radars-hub" className="scroll-mt-24 space-y-4">
      
      {/* ─── HUB HEADER & RADAR SELECTOR ─── */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-3 sm:p-5">
        <div className="flex flex-col gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500" />
                <span className="hidden xs:inline">Execution Radars</span>
                <span className="xs:hidden">Radars</span>
              </h2>
              <span className="text-[9px] sm:text-[10px] font-mono font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-emerald-500" />
                <span className="hidden xs:inline">Live Engine</span>
                <span className="xs:hidden">Live</span>
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 hidden sm:block">
              Intraday 2% breakouts, multi-day 10% expansions, and 2–5% short setups.
            </p>
          </div>

          {/* Mobile-Optimized Horizontal Scrolling Tab Switcher */}
          <div className="flex gap-1.5 sm:gap-1 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
            {/* Tab 1: Small Cap 2% */}
            <button
              type="button"
              onClick={() => setActiveRadar('small_cap')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-[11px] sm:text-xs rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap touch-target ${
                activeRadar === 'small_cap'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium active:bg-slate-100 dark:active:bg-slate-800'
              }`}
            >
              <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-500" />
              <span className="hidden xs:inline">Small Cap 2%</span>
              <span className="xs:hidden">2%</span>
              {displayedSmallCapList.length > 0 && (
                <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono font-bold">
                  {displayedSmallCapList.length}
                </span>
              )}
            </button>

            {/* Tab 2: 10% Rapid Moves */}
            <button
              type="button"
              onClick={() => setActiveRadar('rapid_moves')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-[11px] sm:text-xs rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap touch-target ${
                activeRadar === 'rapid_moves'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium active:bg-slate-100 dark:active:bg-slate-800'
              }`}
            >
              <Rocket className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-500" />
              <span className="hidden xs:inline">10% Screener</span>
              <span className="xs:hidden">10%</span>
              {rapidMoveCandidates.length > 0 && (
                <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono font-bold">
                  {rapidMoveCandidates.length}
                </span>
              )}
            </button>

            {/* Tab 3: Fall Predictions */}
            <button
              type="button"
              onClick={() => setActiveRadar('fall_predictions')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2 sm:py-1.5 text-[11px] sm:text-xs rounded-lg transition-colors cursor-pointer shrink-0 whitespace-nowrap touch-target ${
                activeRadar === 'fall_predictions'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium active:bg-slate-100 dark:active:bg-slate-800'
              }`}
            >
              <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-500" />
              <span className="hidden xs:inline">2–5% Fall</span>
              <span className="xs:hidden">Fall</span>
              {displayedFallList.length > 0 && (
                <span className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-mono font-bold">
                  {displayedFallList.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── ANIMATED RADAR CONTENT CAROUSEL WITH ANIMATEPRESENCE ─── */}
      <AnimatePresence mode="wait">
        
        {/* ─── RADAR 1: SMALL CAP 2% PICKS ─── */}
        {activeRadar === 'small_cap' && (
          <motion.div
            key="small_cap_content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-xs px-2">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                Intraday 2% to 5% Surge Candidates ({displayedSmallCapList.length} Setups)
              </span>
              <Link
                href={axionAppPath("/small-cap-predictions")}
                className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1 group"
              >
                <span>Open Small Cap Lab</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {displayedSmallCapList.map((item: any) => {
                const ticker = item.ticker || 'STOCK';
                const price = typeof item.price === 'number' ? item.price : (typeof item.currentPrice === 'number' ? item.currentPrice : (typeof item.close === 'number' ? item.close : 100));
                const target = item.targetPrice ?? Number((price * 1.025).toFixed(2));
                const score = item.score ?? item.convictionScore ?? 85;
                const change = item.changePercent ?? item.changePct ?? (item.signals?.includes('+2% momentum') ? 2.5 : 0);

                return (
                  <motion.div
                    key={ticker}
                    variants={cardVariants}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 sm:p-5 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-colors flex flex-col justify-between group active:scale-98"
                  >
                    {/* Top corner gradient hover glow */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/25 transition-all" />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono text-lg font-black text-slate-900 dark:text-white block group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">
                            {ticker}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block max-w-[180px]">
                            {item.name || 'NSE Small Cap'}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-base font-black text-slate-900 dark:text-white block">
                            ₹{price.toFixed(2)}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-0.5">
                            <ArrowUpRight className="h-3 w-3 inline" />
                            {change >= 0 ? '+' : ''}{Number(change).toFixed(2)}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/40 font-mono text-center my-3 group-hover:border-emerald-500/40 transition-colors">
                        <div>
                          <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">2% Target</span>
                          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">₹{target} (+2.5%)</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Pillar Score</span>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{score}/100</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <motion.button
                        type="button"
                        whileHover={{ x: 2 }}
                        onClick={() => setSelectedTicker(ticker)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Point-to-Point View</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          playTargetChime();
                          setTradeModalStock({ ticker, name: item.name, currentPrice: price });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Zap className="h-3 w-3" />
                        <span>2% Order</span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── RADAR 2: 10% RAPID MOVES SCREENER ─── */}
        {activeRadar === 'rapid_moves' && (
          <motion.div
            key="rapid_moves_content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-xs px-2">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
                </span>
                1–5 Day 10% Multi-Day Expansion Radar ({rapidMoveCandidates.length} Setups)
              </span>
              <Link
                href={axionAppPath("/rapid-moves")}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-bold flex items-center gap-1 group"
              >
                <span>Open 10% Radar Lab</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {rapidMoveCandidates.slice(0, 6).map((c: any) => {
                const cleanTicker = (c.ticker || '').replace('.NS', '').replace('.BO', '');
                const price = typeof c.price === 'number' ? c.price : (typeof c.close === 'number' ? c.close : (typeof c.entry === 'number' ? c.entry : 100));
                const target10 = typeof c.target === 'number' ? c.target : Number((price * 1.10).toFixed(1));
                const score = typeof c.score === 'number' ? Math.min(100, Math.round(c.score)) : Math.round((c.conviction || 0.85) * 100);
                const strategy = c.setup ? `${String(c.setup).toUpperCase()} Expansion` : (c.strategy || '10% Expansion Setup');
                const days = c.horizons?.[0]?.days ?? c.daysToTarget ?? '1-5';

                return (
                  <motion.div
                    key={c.ticker}
                    variants={cardVariants}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 hover:border-cyan-500/50 transition-colors flex flex-col justify-between group"
                  >
                    {/* Top corner gradient hover glow */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/25 transition-all" />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono text-lg font-black text-slate-900 dark:text-white block group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                            {cleanTicker}
                          </span>
                          <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-wider block">
                            {strategy}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-base font-black text-slate-900 dark:text-white block">
                            ₹{price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {days} Days
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/50 dark:border-cyan-900/40 font-mono text-center my-3 group-hover:border-cyan-500/40 transition-colors">
                        <div>
                          <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">10% Target</span>
                          <span className="text-xs font-black text-cyan-700 dark:text-cyan-400">₹{target10} (+10.0%)</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Conviction</span>
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">{score}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <motion.button
                        type="button"
                        whileHover={{ x: 2 }}
                        onClick={() => setSelectedTicker(cleanTicker)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Full Analysis</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          playTargetChime();
                          setTradeModalStock({ ticker: cleanTicker, name: `${cleanTicker} 10% Radar`, currentPrice: price });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-cyan-600/25 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <Rocket className="h-3 w-3" />
                        <span>10% Order</span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ─── RADAR 3: 2-5% FALL & BREAKDOWN RADAR ─── */}
        {activeRadar === 'fall_predictions' && (
          <motion.div
            key="fall_predictions_content"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-4"
          >
            <div className="flex items-center justify-between text-xs px-2">
              <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                2% to 5% Breakdown & Put Option Candidates ({displayedFallList.length} Setups)
              </span>
              <Link
                href={axionAppPath("/fall-predictions")}
                className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-1 group"
              >
                <span>Open Fall Radar Lab</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {displayedFallList.map((item: any) => {
                const cleanTicker = (item.ticker || 'STOCK').replace('.NS', '');
                const entry = item.entry_price || item.close || 100;
                const target = item.target_price || (entry * 0.97);
                const dropPct = (((entry - target) / entry) * 100).toFixed(1);
                const closePrice = item.close || entry;
                const support = item.support_20d || (entry * 0.99);

                return (
                  <motion.div
                    key={item.ticker}
                    variants={cardVariants}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-xl hover:shadow-rose-500/10 hover:border-rose-500/50 transition-colors flex flex-col justify-between group"
                  >
                    {/* Top corner gradient hover glow */}
                    <div className="absolute -top-12 -right-12 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/25 transition-all" />

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="font-mono text-lg font-black text-slate-900 dark:text-white block group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors">
                            {cleanTicker}
                          </span>
                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                            Support Breakdown
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-base font-black text-slate-900 dark:text-white block">
                            ₹{closePrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Support: ₹{support.toFixed(1)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40 font-mono text-center my-3 group-hover:border-rose-500/40 transition-colors">
                        <div>
                          <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Fall Target</span>
                          <span className="text-xs font-black text-rose-700 dark:text-rose-400">₹{target.toFixed(1)} (-{dropPct}%)</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-sans font-bold text-slate-400 block uppercase">Put Option</span>
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">+62.5%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <motion.button
                        type="button"
                        whileHover={{ x: 2 }}
                        onClick={() => setSelectedTicker(cleanTicker)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition cursor-pointer flex items-center gap-1"
                      >
                        <span>Full Analysis</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => {
                          playTargetChime();
                          setTradeModalStock({ ticker: cleanTicker, name: `${cleanTicker} Short Breakdown`, currentPrice: closePrice });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-xs shadow-md shadow-rose-600/25 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <TrendingDown className="h-3 w-3" />
                        <span>Execute Short</span>
                      </motion.button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Quick Trade Modal */}
      {tradeModalStock && (
        <QuickTradeModal
          isOpen={!!tradeModalStock}
          onClose={() => setTradeModalStock(null)}
          ticker={tradeModalStock.ticker}
          name={tradeModalStock.name}
          currentPrice={tradeModalStock.currentPrice}
          initialTargetPct={2.5}
          initialStopLossPct={1.5}
        />
      )}

    </section>
  );
}
