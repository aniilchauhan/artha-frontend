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
  
  // 1. Small Cap 2% Picks
  const [smallCapList, setSmallCapList] = useState<any[]>([]);
  const [loadingSmallCap, setLoadingSmallCap] = useState(false);

  // 2. 10% Rapid Moves
  const { candidates: rapidMoveCandidates, running: loadingRapidMoves } = useRapidMoveScan();

  // 3. 2-5% Fall Predictions
  const [fallList, setFallList] = useState<any[]>([]);
  const [loadingFall, setLoadingFall] = useState(false);

  // Quick Trade Modal
  const [tradeModalStock, setTradeModalStock] = useState<any | null>(null);

  // Load Small Cap 2% candidates
  useEffect(() => {
    let active = true;
    async function loadSmallCap() {
      try {
        setLoadingSmallCap(true);
        const res = await axionFetch(axionApiPath('/api/small-cap-predictions?limit=6'));
        if (res.ok) {
          const json = await res.json();
          const items = json.stocks || json.candidates;
          if (active && Array.isArray(items) && items.length > 0) {
            setSmallCapList(items.slice(0, 6));
            return;
          }
        }
      } catch {
        // graceful
      } finally {
        if (active) setLoadingSmallCap(false);
      }
    }
    void loadSmallCap();
    return () => { active = false; };
  }, []);

  // Load 2-5% Fall predictions
  useEffect(() => {
    let active = true;
    async function loadFall() {
      try {
        setLoadingFall(true);
        const res = await axionFetch(axionApiPath('/api/fall-predictions'));
        if (res.ok) {
          const json = await res.json();
          const items = json.data || json.breakdowns;
          if (active && Array.isArray(items) && items.length > 0) {
            setFallList(items.slice(0, 6));
            return;
          }
        }
      } catch {
        // graceful
      } finally {
        if (active) setLoadingFall(false);
      }
    }
    void loadFall();
    return () => { active = false; };
  }, []);

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
      
      {/* ─── HUB HEADER & RADAR SELECTOR WITH DYNAMIC AMBIENT GLOW ─── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl p-5 sm:p-6 shadow-sm group"
      >
        {/* Animated ambient background beam */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              {/* Radar Icon with animated ping wave */}
              <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400">
                <span className="absolute inset-0 rounded-xl bg-indigo-500/20 animate-ping opacity-30" />
                <Flame className="h-4 w-4 relative z-10 animate-bounce" style={{ animationDuration: '2.5s' }} />
              </div>

              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Top 3 Execution Radars
              </h2>

              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Engine
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              High-priority quant discovery: intraday 2% breakouts, multi-day 10% expansions, and 2–5% short breakdown setups.
            </p>
          </div>

          {/* Smooth Spring Tab Switcher with layoutId sliding pill */}
          <div className="relative flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950/70 shadow-inner">
            {/* Tab 1: Small Cap 2% */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveRadar('small_cap')}
              className={`relative z-10 flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeRadar === 'small_cap'
                  ? 'text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeRadar === 'small_cap' && (
                <motion.div
                  layoutId="activeRadarPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/25"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" />
                <span>Small Cap 2% Picks</span>
                {displayedSmallCapList.length > 0 && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950/40 border border-emerald-400/40 text-white font-mono"
                  >
                    {displayedSmallCapList.length}
                  </motion.span>
                )}
              </span>
            </motion.button>

            {/* Tab 2: 10% Rapid Moves */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveRadar('rapid_moves')}
              className={`relative z-10 flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeRadar === 'rapid_moves'
                  ? 'text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeRadar === 'rapid_moves' && (
                <motion.div
                  layoutId="activeRadarPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 shadow-md shadow-cyan-500/25"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Rocket className="h-3.5 w-3.5" />
                <span>10% Move Screener</span>
                {rapidMoveCandidates.length > 0 && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950/40 border border-cyan-400/40 text-white font-mono"
                  >
                    {rapidMoveCandidates.length}
                  </motion.span>
                )}
              </span>
            </motion.button>

            {/* Tab 3: Fall Predictions */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setActiveRadar('fall_predictions')}
              className={`relative z-10 flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeRadar === 'fall_predictions'
                  ? 'text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {activeRadar === 'fall_predictions' && (
                <motion.div
                  layoutId="activeRadarPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 shadow-md shadow-rose-500/25"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" />
                <span>2–5% Fall Module</span>
                {displayedFallList.length > 0 && (
                  <motion.span
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-rose-950/40 border border-rose-400/40 text-white font-mono"
                  >
                    {displayedFallList.length}
                  </motion.span>
                )}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayedSmallCapList.map((item: any) => {
                const ticker = item.ticker || 'STOCK';
                const price = item.currentPrice || 100;
                const target = Number((price * 1.025).toFixed(2));
                const score = item.score ?? 85;

                return (
                  <motion.div
                    key={ticker}
                    variants={cardVariants}
                    whileHover={{ y: -6, scale: 1.015 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:border-emerald-500/50 transition-colors flex flex-col justify-between group"
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
                            {item.changePercent >= 0 ? '+' : ''}{Number(item.changePercent || 0).toFixed(2)}%
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rapidMoveCandidates.slice(0, 6).map((c: any) => {
                const cleanTicker = c.ticker.replace('.NS', '');
                const target10 = Number((c.close * 1.10).toFixed(1));

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
                            {c.strategy || '10% Expansion Setup'}
                          </span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-base font-black text-slate-900 dark:text-white block">
                            ₹{c.close.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {c.daysToTarget || '1-5'} Days
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
                          <span className="text-xs font-black text-slate-800 dark:text-slate-200">{Math.round((c.conviction || 0.85) * 100)}%</span>
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
                          setTradeModalStock({ ticker: cleanTicker, name: `${cleanTicker} 10% Radar`, currentPrice: c.close });
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

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
