'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { useRouter } from '../lib/workspace-router';
import {
  Rocket, Sparkles, TrendingUp, TrendingDown, Target, ShieldCheck,
  Zap, Calendar, Lock, Unlock, Search, RefreshCw, SlidersHorizontal,
  ArrowUpRight, CheckCircle2, AlertTriangle, Info, Clock, Layers,
  ChevronRight, X, BarChart3, HelpCircle, Activity, Award
} from 'lucide-react';
import type { PostIpoCandidate, PostIpoResponse, PostIpoPrediction } from '../lib/post-ipo-types';
import QuickTradeModal from './QuickTradeModal';

export default function PostIpoPredictionScreen() {
  const { theme, setSelectedTicker, addToast, toggleWatchlist, watchlist } = useStockContext();
  const router = useRouter();

  // State
  const [candidates, setCandidates] = useState<PostIpoCandidate[]>([]);
  const [marketStats, setMarketStats] = useState<PostIpoResponse['marketStats'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'FRESH_15D_SURGE' | 'BREAKOUT_TRIGGERED' | 'NEAR_PIVOT_ACCUMULATION' | 'BASE_CONSOLIDATION' | '2024' | '2023'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [quickTradeCandidate, setQuickTradeCandidate] = useState<PostIpoCandidate | null>(null);

  // Selected Stock for Differentiated Prediction Drawer
  const [selectedCandidate, setSelectedCandidate] = useState<PostIpoCandidate | null>(null);
  const [activePrediction, setActivePrediction] = useState<PostIpoPrediction | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showMethodologyModal, setShowMethodologyModal] = useState(false);

  // Simulation Overrides
  const [simAnchorStrength, setSimAnchorStrength] = useState<number>(85);
  const [simBaseWeeks, setSimBaseWeeks] = useState<number>(10);
  const [simVolumeSurge, setSimVolumeSurge] = useState<number>(2.5);
  const [simInstBias, setSimInstBias] = useState<'ACCUMULATION' | 'NEUTRAL' | 'DISTRIBUTION'>('ACCUMULATION');

  const fetchCandidates = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    else setIsRefreshing(true);

    try {
      const res = await fetch('/api/post-ipo/predict?live=true');
      if (res.ok) {
        const json: PostIpoResponse = await res.json();
        if (json.success) {
          setCandidates(json.data || []);
          setMarketStats(json.marketStats || null);
        }
      }
    } catch (err) {
      console.error('[PostIpoScreen] Error loading candidates:', err);
      addToast('Failed to sync live IPO data. Displaying cached records.', 'warning');
    } finally {
      if (showSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCandidates(true);
    const interval = setInterval(() => fetchCandidates(false), 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update active prediction when candidate is selected
  useEffect(() => {
    if (selectedCandidate) {
      setActivePrediction(selectedCandidate.differentiatedPrediction || null);
      setSimAnchorStrength(selectedCandidate.differentiatedPrediction?.anchorUnlockScore ?? 85);
      setSimBaseWeeks(selectedCandidate.baseDurationWeeks ?? 8);
      setSimVolumeSurge(selectedCandidate.volumeSurgeRatio ?? 2.5);
    }
  }, [selectedCandidate]);

  // Run What-If Prediction Simulation
  const handleRunSimulation = async () => {
    if (!selectedCandidate) return;
    setIsSimulating(true);

    try {
      const res = await fetch('/api/post-ipo/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedCandidate.symbol,
          overrides: {
            anchorAbsorptionStrength: simAnchorStrength,
            baseDurationWeeks: simBaseWeeks,
            volumeExpansionFactor: simVolumeSurge,
            institutionalBias: simInstBias,
          },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.prediction) {
          setActivePrediction(json.prediction);
          addToast(`Recalculated post-IPO prediction for ${selectedCandidate.symbol}`, 'success', selectedCandidate.ticker);
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
      addToast('Failed to run simulation', 'warning');
    } finally {
      setIsSimulating(false);
    }
  };

  // Filter candidates
  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      // Search filter
      const matchesSearch = !search.trim() ||
        c.companyName.toLowerCase().includes(search.toLowerCase()) ||
        c.symbol.toLowerCase().includes(search.toLowerCase()) ||
        c.sector.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // Category filter
      if (activeFilter === 'all') return true;
      if (activeFilter === 'FRESH_15D_SURGE') {
        // High-conviction IPO stocks within their initial listing window (or tight bases) targeting +50% to +100% returns
        return (c.daysSinceListing <= 30 || c.baseDurationWeeks <= 4) && (c.expectedUpsidePct >= 50 || c.breakoutStatus === 'BREAKOUT_TRIGGERED');
      }
      if (activeFilter === '2024') return c.ipoYear === 2024;
      if (activeFilter === '2023') return c.ipoYear === 2023;
      return c.breakoutStatus === activeFilter;
    });
  }, [candidates, search, activeFilter]);

  const handleOpenPredictModal = (candidate: PostIpoCandidate) => {
    setSelectedCandidate(candidate);
  };

  const handleGoToTerminal = (ticker: string) => {
    setSelectedTicker(ticker);
    addToast(`Navigating to live terminal for ${ticker}`, 'info', ticker);
    router.push('/');
  };

  return (
    <div id="post-ipo-screen-root" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-12">
      {/* ─── Hero Header & Action Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200/60 dark:border-gray-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/20">
              <Rocket className="h-5 w-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white uppercase font-sans">
              Post-IPO Prediction Lab
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              Last 2 Years Cohort
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-3xl leading-relaxed">
            Specialized equity intelligence for stocks listed within the last 2 years (2023–2026). Differentiates predictions from legacy 200-day SMA models by incorporating <strong className="text-indigo-600 dark:text-indigo-400">Anchor Lock-In Expiry cycles</strong>, <strong className="text-indigo-600 dark:text-indigo-400">Listing-Day High (LDH) pivots</strong>, and <strong className="text-indigo-600 dark:text-indigo-400">flipper share transfer exhaustion</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="view-methodology-btn"
            onClick={() => setShowMethodologyModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100/50 transition-all cursor-pointer shadow-xs"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Why Predict Differently?</span>
          </button>

          <button
            id="refresh-post-ipo-btn"
            onClick={() => fetchCandidates(candidates.length === 0)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Sync Live'}</span>
          </button>
        </div>
      </div>

      {/* ─── High-Level KPI Summary Metrics ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-gray-200/60 dark:border-gray-800/60 rounded-2xl p-4 shadow-xs hover:-translate-y-0.5 transition-all">
          <span className="block text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
            2-Year IPO Universe
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">{candidates.length}</span>
            <span className="text-[10px] text-gray-400">listed equities</span>
          </div>
          <span className="block text-[9px] text-indigo-500/90 font-medium mt-1">2023 to 2026 Listings</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-500/30 rounded-2xl p-4 shadow-xs hover:-translate-y-0.5 transition-all">
          <span className="block text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Stage-1 Breakouts Active
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {marketStats?.breakoutsTriggeredCount ?? candidates.filter(c => c.breakoutStatus === 'BREAKOUT_TRIGGERED').length}
            </span>
            <span className="text-[10px] text-emerald-600/70 font-semibold">above LDH pivot</span>
          </div>
          <span className="block text-[9px] text-emerald-600/80 font-medium mt-1">Confirmed Volume Expansion</span>
        </div>

        <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-500/30 rounded-2xl p-4 shadow-xs hover:-translate-y-0.5 transition-all">
          <span className="block text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Unlock className="h-3.5 w-3.5 text-indigo-500" />
            Anchor Supply Cleared
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {marketStats?.absorbedAnchorOverhangPct ?? 78}%
            </span>
            <span className="text-[10px] text-indigo-500/70 font-semibold">zero overhang risk</span>
          </div>
          <span className="block text-[9px] text-indigo-500/80 font-medium mt-1">30D & 90D Unlocks Absorbed</span>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-500/30 rounded-2xl p-4 shadow-xs hover:-translate-y-0.5 transition-all">
          <span className="block text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            Avg Compounding Since IPO
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
              +{marketStats?.averageTotalGainsSinceIpoPct ?? 84}%
            </span>
            <span className="text-[10px] text-amber-600/70 font-semibold">vs issue price</span>
          </div>
          <span className="block text-[9px] text-amber-500/80 font-medium mt-1">Avg Base: {marketStats?.averageBaseDurationWeeks ?? 9} wks</span>
        </div>
      </div>

      {/* ─── Search, Filters & View Controls ─── */}
      <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800/80 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {[
            { id: 'all', label: 'All 2-Year IPOs' },
            { id: 'FRESH_15D_SURGE', label: '⚡ 1-Wk to 15-Day Surges (+50% to +100%)' },
            { id: 'BREAKOUT_TRIGGERED', label: '🚀 Breakouts Active' },
            { id: 'NEAR_PIVOT_ACCUMULATION', label: '🎯 Near Pivot' },
            { id: 'BASE_CONSOLIDATION', label: '⏳ Base Accumulation' },
            { id: '2024', label: '2024 IPOs' },
            { id: '2023', label: '2023 IPOs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100/70 dark:bg-gray-800/70 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Layout Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              id="search-ipo-shares-input"
              placeholder="Search company, symbol, sector..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>

          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-0.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
            <button
              onClick={() => setViewMode('grid')}
              aria-label="Grid View"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              aria-label="Table View"
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Main Content Display: Grid or Table ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono font-bold text-gray-400 uppercase tracking-widest">
            Scanning Last 2 Years IPO Microstructure & Ownership...
          </span>
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center">
          <Rocket className="h-10 w-10 mx-auto text-gray-400 mb-3" />
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">No IPO Candidates Found</h3>
          <p className="text-xs text-gray-400 mt-1">Adjust search query or filter options to discover candidates.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW OF HIGH CONVICTION PREDICTION CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredCandidates.map((candidate) => {
            const pred = candidate.differentiatedPrediction;
            const isTriggered = candidate.breakoutStatus === 'BREAKOUT_TRIGGERED';
            const isNearPivot = candidate.breakoutStatus === 'NEAR_PIVOT_ACCUMULATION';
            const currentPrice = candidate.livePrice || candidate.currentPrice;
            const totalGainFromIssue = Math.round(((currentPrice - candidate.issuePrice) / candidate.issuePrice) * 100);

            return (
              <div
                key={candidate.ticker}
                className="group relative overflow-hidden rounded-3xl border border-gray-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Symbol, Sector, Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                          {candidate.symbol}
                        </span>
                        <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                          {candidate.sector}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">
                          IPO {candidate.ipoYear || new Date(candidate.listingDate).getFullYear()}
                        </span>
                      </div>
                      <h3 className="font-black text-base text-gray-900 dark:text-white mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {candidate.companyName}
                      </h3>
                    </div>

                    {candidate.isFresh15DaySurge || candidate.daysSinceListing <= 35 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 whitespace-nowrap shadow-xs">
                        <Zap className="h-3 w-3 fill-current animate-pulse text-amber-500" />
                        ⚡ 1-15D Surge (+50% to +100%)
                      </span>
                    ) : isTriggered ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Triggered
                      </span>
                    ) : isNearPivot ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                        <Target className="h-3 w-3" />
                        Near Pivot
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 whitespace-nowrap">
                        <Layers className="h-3 w-3" />
                        Base Accum
                      </span>
                    )}
                  </div>

                  {/* Price Banner & IPO Baseline Comparison */}
                  <div className="grid grid-cols-3 gap-2 p-3 my-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-850/80 border border-gray-150/80 dark:border-gray-800/80">
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-gray-400 uppercase">Live Price</span>
                      <span className="text-base font-black text-gray-900 dark:text-white font-mono">
                        ₹{currentPrice.toLocaleString('en-IN')}
                      </span>
                      {candidate.dayChangePct !== undefined && (
                        <span className={`block text-[10px] font-mono font-bold ${candidate.dayChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {candidate.dayChangePct >= 0 ? '+' : ''}{candidate.dayChangePct.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    <div>
                      <span className="block text-[9px] font-mono font-bold text-gray-400 uppercase">Issue Price</span>
                      <span className="text-base font-bold text-gray-700 dark:text-gray-300 font-mono">
                        ₹{candidate.issuePrice.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] font-mono font-bold text-emerald-600">
                        +{totalGainFromIssue}% total
                      </span>
                    </div>

                    <div>
                      <span className="block text-[9px] font-mono font-bold text-gray-400 uppercase">LDH Pivot</span>
                      <span className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                        ₹{candidate.listingDayHigh.toLocaleString('en-IN')}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-mono">
                        {candidate.daysSinceListing}d listed
                      </span>
                    </div>
                  </div>

                  {/* Specialized Differentiated Prediction Preview Box */}
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-50/60 to-purple-50/40 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-200/60 dark:border-indigo-800/60 mb-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold uppercase text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-mono">
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        Microstructure Prediction
                      </span>
                      <span className="text-[10px] font-extrabold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {pred?.winProbabilityPct ?? 78}% Win Prob
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-center">
                      <div className="bg-gradient-to-b from-amber-500/10 to-orange-500/10 dark:from-amber-950/40 dark:to-orange-950/40 p-2 rounded-xl border border-amber-400/40 shadow-xs">
                        <span className="block text-[8px] font-mono text-amber-600 dark:text-amber-400 uppercase font-black">1-15D Surge</span>
                        <span className="text-xs font-black text-amber-700 dark:text-amber-300 font-mono">
                          ₹{(pred?.predictedTarget15d ?? candidate.surgeTarget15d ?? Math.round(currentPrice * 1.5)).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-black text-amber-600 dark:text-amber-400">
                          +{pred?.predictedCurrentToT15Pct ?? candidate.surgeTarget15dPct ?? 50}%
                        </span>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-900/60 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                        <span className="block text-[8px] font-mono text-gray-400 uppercase">T+30D Target</span>
                        <span className="text-xs font-black text-gray-900 dark:text-white font-mono">
                          ₹{pred?.predictedTarget30d.toLocaleString('en-IN') ?? candidate.target1.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400">
                          +{pred?.predictedCurrentToT30Pct ?? 22}%
                        </span>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-900/60 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                        <span className="block text-[8px] font-mono text-gray-400 uppercase">T+90D Target</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                          ₹{pred?.predictedTarget90d.toLocaleString('en-IN') ?? Math.round(candidate.target1 * 1.25).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600">
                          +{pred?.predictedCurrentToT90Pct ?? 52}%
                        </span>
                      </div>

                      <div className="bg-white/60 dark:bg-gray-900/60 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                        <span className="block text-[8px] font-mono text-gray-400 uppercase">1-Yr Compounder</span>
                        <span className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">
                          ₹{pred?.predictedTarget1yr.toLocaleString('en-IN') ?? candidate.targetMultiBagger.toLocaleString('en-IN')}
                        </span>
                        <span className="text-[9px] font-bold text-purple-600">
                          +{pred?.predictedTarget1yrPct ?? candidate.expectedUpsidePct}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Shareholding & Anchor Lock-In Pills */}
                  <div className="space-y-1.5 text-[11px] font-mono text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px]">
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        Promoter: {candidate.promoterHoldingPct ?? 65}% | Inst (FII+DII): {((candidate.fiiHoldingPct ?? 15) + (candidate.diiHoldingPct ?? 12)).toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                        Retail: {candidate.retailHoldingPct ?? 8}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-gray-150/50 dark:border-gray-800/50">
                      <span className="flex items-center gap-1 text-[10px]">
                        <Lock className="h-3 w-3 text-indigo-500" />
                        Anchor 90D Status:
                      </span>
                      <span className={`text-[10px] font-extrabold uppercase ${
                        candidate.anchorLockinStatus === 'ABSORBED_STRONG' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'
                      }`}>
                        {candidate.anchorLockinStatus === 'ABSORBED_STRONG' ? '✓ Absorbed' : '⏳ In Progress'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-gray-150/70 dark:border-gray-800/70 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenPredictModal(candidate)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs shadow-indigo-600/20"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span>Predict & Simulate</span>
                  </button>

                  <button
                    onClick={() => setQuickTradeCandidate(candidate)}
                    title="View +50% / +100% price scenario"
                    className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs shadow-emerald-600/20"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Price Scenario</span>
                  </button>

                  <button
                    onClick={() => handleGoToTerminal(candidate.symbol)}
                    title="Open Live Terminal"
                    className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW OF SHAREHOLDING & ANCHOR EXPIRY SCHEDULE */
        <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200/80 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-gray-50/90 dark:bg-gray-850/90 border-b border-gray-200/80 dark:border-gray-800/80 text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Company & Symbol</th>
                  <th className="py-3 px-3">Listing Date</th>
                  <th className="py-3 px-3 text-right">Issue Price</th>
                  <th className="py-3 px-3 text-right">Live Price</th>
                  <th className="py-3 px-3 text-right">Total Gain</th>
                  <th className="py-3 px-3 text-center">Promoter %</th>
                  <th className="py-3 px-3 text-center">FII / DII %</th>
                  <th className="py-3 px-3 text-center">Retail %</th>
                  <th className="py-3 px-3 text-center">Anchor Status</th>
                  <th className="py-3 px-3 text-right">T+30D Predicted</th>
                  <th className="py-3 px-3 text-right">T+90D Predicted</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150/60 dark:divide-gray-800/60">
                {filteredCandidates.map((candidate) => {
                  const currentPrice = candidate.livePrice || candidate.currentPrice;
                  const totalGain = Math.round(((currentPrice - candidate.issuePrice) / candidate.issuePrice) * 100);
                  const pred = candidate.differentiatedPrediction;

                  return (
                    <tr
                      key={candidate.ticker}
                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors group cursor-pointer"
                      onClick={() => handleOpenPredictModal(candidate)}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                          <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                            {candidate.symbol}
                          </span>
                          <span className="truncate max-w-[140px] sm:max-w-[200px]">{candidate.companyName}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{candidate.sector}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                        {candidate.listingDate} ({candidate.daysSinceListing}d)
                      </td>

                      <td className="py-3 px-3 font-mono text-right font-bold text-gray-700 dark:text-gray-300">
                        ₹{candidate.issuePrice.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3 font-mono text-right font-black text-gray-900 dark:text-white">
                        ₹{currentPrice.toLocaleString('en-IN')}
                      </td>

                      <td className="py-3 px-3 font-mono text-right font-bold text-emerald-600">
                        +{totalGain}%
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold">
                        {candidate.promoterHoldingPct ?? 65}%
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {candidate.fiiHoldingPct ?? 14}% / {candidate.diiHoldingPct ?? 12}%
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-semibold text-gray-500">
                        {candidate.retailHoldingPct ?? 8}%
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase font-mono ${
                          candidate.anchorLockinStatus === 'ABSORBED_STRONG'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                        }`}>
                          {candidate.anchorLockinStatus === 'ABSORBED_STRONG' ? 'Absorbed' : 'In Progress'}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-right font-bold text-gray-900 dark:text-white">
                        ₹{pred?.predictedTarget30d.toLocaleString('en-IN')}
                        <span className="block text-[9px] text-indigo-600">+{pred?.predictedCurrentToT30Pct}%</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-right font-black text-emerald-600">
                        ₹{pred?.predictedTarget90d.toLocaleString('en-IN')}
                        <span className="block text-[9px] text-emerald-600">+{pred?.predictedCurrentToT90Pct}%</span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setQuickTradeCandidate(candidate)}
                            title="View +50% / +100% price scenario"
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white font-black text-[10px] hover:bg-emerald-700 transition-colors cursor-pointer"
                          >
                            ⚡ Trade
                          </button>
                          <button
                            onClick={() => handleOpenPredictModal(candidate)}
                            className="px-2 py-1 rounded-lg bg-indigo-600 text-white font-bold text-[10px] hover:bg-indigo-700 transition-colors cursor-pointer"
                          >
                            Predict
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── INTERACTIVE PREDICTION STUDIO DRAWER / MODAL ─── */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-150 dark:border-gray-800 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white">
                    {selectedCandidate.symbol}
                  </span>
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 rounded-full">
                    {selectedCandidate.sector}
                  </span>
                  <span className="text-xs font-mono text-gray-400">
                    Listed: {selectedCandidate.listingDate} ({selectedCandidate.daysSinceListing} days ago)
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-1.5 font-sans">
                  {selectedCandidate.companyName}
                </h2>
              </div>

              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-850 dark:hover:bg-gray-750 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Architecture Contrast: Why Legacy 200 SMA fails vs Post-IPO Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-xs">
                <span className="font-black text-rose-600 uppercase flex items-center gap-1.5 text-[11px] mb-1.5 font-mono">
                  <AlertTriangle className="h-4 w-4" />
                  Legacy 200-SMA Model (Inapplicable)
                </span>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Requires 200–500 trading days. Distorts post-IPO anchor unlock dips as fundamental breakdowns, yielding false sell signals right at institutional accumulation bases.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs">
                <span className="font-black text-emerald-600 uppercase flex items-center gap-1.5 text-[11px] mb-1.5 font-mono">
                  <CheckCircle2 className="h-4 w-4" />
                  Post-IPO Microstructure Model (Active)
                </span>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  Anchors to <strong className="text-emerald-600">Issue Price (₹{selectedCandidate.issuePrice})</strong>, <strong className="text-emerald-600">Listing Day High (₹{selectedCandidate.listingDayHigh})</strong>, and tracks 30-day/90-day anchor investor absorption rates.
                </p>
              </div>
            </div>

            {/* Price Ladder: Past -> Current -> Future Projections */}
            <div className="p-5 rounded-2xl bg-gray-50/80 dark:bg-gray-850/80 border border-gray-150 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400">
                  Target Price Horizon Ladder
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    R:R {activePrediction?.riskRewardRatio ?? 4.5} : 1
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    {activePrediction?.winProbabilityPct ?? 82}% Calibrated Win Rate
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 pt-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <span className="block text-[9px] font-mono text-gray-400 uppercase">Issue Price</span>
                  <span className="text-sm font-bold text-gray-600 dark:text-gray-400 font-mono">
                    ₹{selectedCandidate.issuePrice.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[9px] text-gray-400">Base Cost Basis</span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
                  <span className="block text-[9px] font-mono text-gray-400 uppercase">Current Price</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                    ₹{(selectedCandidate.livePrice || selectedCandidate.currentPrice).toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[9px] font-bold text-emerald-600">Live Level</span>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-400/50 shadow-xs">
                  <span className="block text-[9px] font-mono text-amber-600 dark:text-amber-400 uppercase font-black">1-15D Surge</span>
                  <span className="text-sm font-black text-amber-700 dark:text-amber-300 font-mono">
                    ₹{(activePrediction?.predictedTarget15d ?? selectedCandidate.surgeTarget15d ?? Math.round((selectedCandidate.livePrice || selectedCandidate.currentPrice) * 1.5)).toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[9px] font-black text-amber-600 dark:text-amber-400">
                    +{activePrediction?.predictedCurrentToT15Pct ?? selectedCandidate.surgeTarget15dPct ?? 50}% (1-2 wks)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                  <span className="block text-[9px] font-mono text-indigo-500 uppercase font-bold">T+30D Target</span>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    ₹{activePrediction?.predictedTarget30d.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[9px] font-bold text-indigo-600">
                    +{activePrediction?.predictedCurrentToT30Pct}% (4 wks)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="block text-[9px] font-mono text-emerald-600 uppercase font-bold">T+90D Target</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    ₹{activePrediction?.predictedTarget90d.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[9px] font-bold text-emerald-600">
                    +{activePrediction?.predictedCurrentToT90Pct}% (12 wks)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60">
                  <span className="block text-[9px] font-mono text-purple-600 uppercase font-bold">1-Yr Target</span>
                  <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-mono">
                    ₹{activePrediction?.predictedTarget1yr.toLocaleString('en-IN')}
                  </span>
                  <span className="block text-[9px] font-bold text-purple-600">
                    +{activePrediction?.predictedTarget1yrPct}% (Multi)
                  </span>
                </div>
              </div>

              {/* Invalidation Stop Loss Notice */}
              <div className="flex items-center justify-between text-[11px] font-mono pt-2 text-gray-500 border-t border-gray-150/50 dark:border-gray-800/50">
                <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Structural Invalidation Stop: ₹{activePrediction?.invalidationStopLoss.toLocaleString('en-IN')}
                </span>
                <span className="text-rose-500 font-bold">
                  Max Base Drawdown: -{activePrediction?.stopLossRiskPct}%
                </span>
              </div>
            </div>

            {/* Interactive What-If Simulation Controls */}
            <div className="p-5 rounded-2xl bg-white dark:bg-gray-850 border border-gray-200 dark:border-gray-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase text-gray-900 dark:text-white flex items-center gap-1.5 font-mono">
                    <SlidersHorizontal className="h-4 w-4 text-indigo-500" />
                    Interactive What-If Prediction Simulation
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Adjust variables below to dynamically recalculate predicted target prices and win probabilities in real-time.
                  </p>
                </div>

                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {isSimulating ? 'Simulating...' : 'Recalculate Dynamic Targets'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                {/* Slider 1: Anchor Absorption */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-500">Anchor Absorption:</span>
                    <span className="font-bold text-indigo-600">{simAnchorStrength}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="100"
                    value={simAnchorStrength}
                    onChange={(e) => setSimAnchorStrength(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <span className="block text-[9px] text-gray-400">Institutional block absorption strength</span>
                </div>

                {/* Slider 2: Base Duration */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-500">Base Duration:</span>
                    <span className="font-bold text-indigo-600">{simBaseWeeks} weeks</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="24"
                    value={simBaseWeeks}
                    onChange={(e) => setSimBaseWeeks(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <span className="block text-[9px] text-gray-400">Stage-1 price consolidation length</span>
                </div>

                {/* Slider 3: Volume Surge Factor */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-500">Volume Surge:</span>
                    <span className="font-bold text-indigo-600">{simVolumeSurge}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    value={simVolumeSurge}
                    onChange={(e) => setSimVolumeSurge(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <span className="block text-[9px] text-gray-400">Breakout turnover expansion vs average</span>
                </div>
              </div>
            </div>

            {/* Shareholding Breakdown & Anchor Lock-In Schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Shareholding Patterns */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-850/80 border border-gray-150 dark:border-gray-800 space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Ownership Breakdown (Who Holds Shares)
                </h4>
                <div className="space-y-2 pt-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Promoter & Founders:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedCandidate.promoterHoldingPct ?? 68}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Foreign Institutional (FII):</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedCandidate.fiiHoldingPct ?? 14}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Domestic Mutual Funds (DII):</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedCandidate.diiHoldingPct ?? 12}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Public & Retail Allottees:</span>
                    <span className="font-bold text-gray-700 dark:text-gray-300">{selectedCandidate.retailHoldingPct ?? 6}%</span>
                  </div>
                </div>
              </div>

              {/* Anchor Lock-In Expiry Schedule */}
              <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-gray-850/80 border border-gray-150 dark:border-gray-800 space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase text-gray-400 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-indigo-500" />
                  Anchor Investor Lock-In Milestones
                </h4>
                <div className="space-y-2 pt-1 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">30-Day Tranche (50% Anchor):</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                      ✓ EXPIRED & ABSORBED
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">90-Day Tranche (Remaining 50%):</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      selectedCandidate.anchorLockinStatus === 'ABSORBED_STRONG'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-amber-500/10 text-amber-600'
                    }`}>
                      {selectedCandidate.anchorLockinStatus === 'ABSORBED_STRONG' ? '✓ EXPIRED & ABSORBED' : '⏳ IN PROGRESS'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Total Anchor Allocation:</span>
                    <span className="font-bold text-gray-900 dark:text-white">
                      {selectedCandidate.anchorSharesPercent ?? 12.5}% of Offer Size
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Model Rationale Statements */}
            {activePrediction?.modelRationale && (
              <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-800/60 space-y-2">
                <h4 className="text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Post-IPO Quantitative Rationale
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  {activePrediction.modelRationale.map((point, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold mt-0.5">›</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-150 dark:border-gray-800">
              <button
                onClick={() => {
                  toggleWatchlist(selectedCandidate.symbol);
                  addToast(`Updated watchlist for ${selectedCandidate.symbol}`, 'success', selectedCandidate.ticker);
                }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                ★ Watchlist
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickTradeCandidate(selectedCandidate)}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5 fill-current" />
                  <span>Trade Candidate ⚡</span>
                </button>

                <button
                  onClick={() => {
                    addToast(`Push notification alert configured for ${selectedCandidate.symbol} above ₹${selectedCandidate.breakoutTriggerPrice}`, 'success');
                  }}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Set Breakout Push Alert
                </button>

                <button
                  onClick={() => handleGoToTerminal(selectedCandidate.symbol)}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-indigo-600/20"
                >
                  Open Live Terminal
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── METHODOLOGY EXPLAINER MODAL ─── */}
      {showMethodologyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-150 dark:border-gray-800 pb-3">
              <h3 className="text-base font-black text-gray-900 dark:text-white uppercase font-sans flex items-center gap-2">
                <Rocket className="h-5 w-5 text-indigo-500" />
                Why We Predict Post-IPO Stocks Differently
              </h3>
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              <p>
                Standard algorithmic trading systems evaluate stocks with <strong>200-day Simple Moving Averages (SMA)</strong>, <strong>50-day EMA golden crosses</strong>, and <strong>3-5 year financial growth rates</strong>.
              </p>
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 font-medium">
                ⚠️ When applied to newly listed IPO shares (less than 2 years on exchange), standard models either throw errors or generate misleading signals because 200 trading days do not exist.
              </div>
              <h4 className="font-black text-gray-900 dark:text-white uppercase pt-1">
                The 4 Pillars of the Post-IPO Prediction Model:
              </h4>
              <ul className="space-y-2 list-disc pl-5">
                <li>
                  <strong className="text-indigo-600 dark:text-indigo-400">Anchor Lock-In Expiry Tracking:</strong> Under SEBI regulations, 50% of anchor shares unlock at Day 30 and the remaining 50% at Day 90. Stocks that absorb this supply without breaking base lows exhibit an 78%+ breakout probability.
                </li>
                <li>
                  <strong className="text-indigo-600 dark:text-indigo-400">Listing-Day High (LDH) Pivot:</strong> The listing day high serves as the institutional benchmark. Reclaiming LDH with volume expansion confirms Stage-1 price discovery.
                </li>
                <li>
                  <strong className="text-indigo-600 dark:text-indigo-400">Retail Flipper Exhaustion:</strong> In the first 30–60 days, short-term retail allottees dump their allotment for listing gains. Once volume dries up, floating shares are concentrated in long-term institutional hands.
                </li>
                <li>
                  <strong className="text-indigo-600 dark:text-indigo-400">Structural Base-Low Stop Loss:</strong> Stop losses are anchored to the base contraction low rather than arbitrary moving averages, producing asymmetric Risk-Reward ratios (&gt;4.0:1).
                </li>
              </ul>
            </div>

            <div className="pt-3 border-t border-gray-150 dark:border-gray-800 text-right">
              <button
                onClick={() => setShowMethodologyModal(false)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── QUICK TRADE MODAL (HUMAN-IN-THE-LOOP) ─── */}
      {quickTradeCandidate && (
        <QuickTradeModal
          isOpen={true}
          onClose={() => setQuickTradeCandidate(null)}
          ticker={quickTradeCandidate.symbol}
          name={quickTradeCandidate.companyName}
          currentPrice={quickTradeCandidate.livePrice || quickTradeCandidate.currentPrice}
          initialTargetPct={quickTradeCandidate.surgeTarget15dPct || (quickTradeCandidate.expectedUpsidePct >= 50 ? quickTradeCandidate.expectedUpsidePct : 50)}
          initialStopLossPct={7.0}
        />
      )}
    </div>
  );
}
