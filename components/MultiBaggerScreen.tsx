'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Rocket, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Building2, 
  Filter, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight,
  Target,
  BarChart3,
  Flame,
  Info
} from 'lucide-react';
import { MultiBaggerCandidate, MultiBaggerResponse } from '../lib/multibagger-types';
import { useStockContext } from '../context/StockContext';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';

const INITIAL_MULTIBAGGERS: MultiBaggerCandidate[] = [
  {
    ticker: "CYIENTDLM.NS",
    symbol: "CYIENTDLM",
    name: "Cyient DLM Limited",
    sector: "EMS & Aerospace Electronics",
    marketCapCategory: "Small-Cap (₹1,500–₹10,000 Cr)",
    marketCapCr: 5400,
    currentPrice: 680,
    multiBaggerScore: 95,
    convictionTier: "ULTRA_CONVICTION",
    pillarsPassedCount: 6,
    pillars: {
      capitalEfficiency: { roe: 19.8, roce: 24.2, passed: true, verdict: "High-margin aerospace design and critical defense electronics manufacturing." },
      growthAcceleration: { salesGrowth3Y: 42.5, profitGrowth3Y: 58.2, passed: true, verdict: "Order book backlog exceeding ₹2,500 Cr with Boeing and Honeywell key accounts." },
      balanceSheetSolvency: { debtToEquity: 0.12, interestCoverage: 18.5, passed: true, verdict: "Virtually zero long-term debt post-IPO recapitalization." },
      institutionalFootprint: { fiiDiiHolding: 38.5, fiiQoQChange: 3.2, passed: true, verdict: "HEAVY_ACCUMULATION" },
      valuationRunway: { peRatio: 48, pegRatio: 0.88, passed: true, verdict: "PEG under 1.0 indicates substantial valuation runway given 50%+ earnings CAGR." },
      technicalStage: { stage: "Stage-2 Cup & Handle Breakout", support200D: 590, breakoutVolumeRatio: 3.2, passed: true, verdict: "Breakout above ₹650 listing consolidation with high institutional volume." }
    },
    keyMoats: [
      "Sole-source supplier for specialized defense avionics & cockpit displays.",
      "Strict AS9100 aerospace certification barriers to entry."
    ],
    catalysts: [
      "Expanding Mysore & Hyderabad manufacturing plants for global aerospace exports.",
      "Make-in-India defense indigenization mandates for radar avionics."
    ],
    risks: ["Customer concentration in top 3 aerospace tier-1 OEMs."],
    investmentThesis: "Cyient DLM is an aerospace-grade EMS pure-play poised for a 3x-5x compounding trajectory as global defense budgets expand and commercial aviation supply chains re-shore to India.",
    entryPrice: 673,
    target1Y: 1360,
    target3Y: 2380,
    expectedMultiplier: "3.5x Multiplier",
    stopLossLongTerm: 544
  },
  {
    ticker: "ORIENTTECH.NS",
    symbol: "ORIENTTECH",
    name: "Orient Technologies Limited",
    sector: "IT Infrastructure & Cloud AI",
    marketCapCategory: "Micro-Cap (< ₹1,500 Cr)",
    marketCapCr: 1250,
    currentPrice: 300,
    multiBaggerScore: 93,
    convictionTier: "HIGH_GROWTH",
    pillarsPassedCount: 6,
    pillars: {
      capitalEfficiency: { roe: 28.5, roce: 32.4, passed: true, verdict: "Industry-leading asset turnover and software-defined cloud solutions." },
      growthAcceleration: { salesGrowth3Y: 34.2, profitGrowth3Y: 46.8, passed: true, verdict: "Rapid expansion in enterprise cloud migration and banking IT automation." },
      balanceSheetSolvency: { debtToEquity: 0.08, interestCoverage: 24.0, passed: true, verdict: "Clean balance sheet with zero financial leverage." },
      institutionalFootprint: { fiiDiiHolding: 22.4, fiiQoQChange: 2.1, passed: true, verdict: "HEAVY_ACCUMULATION" },
      valuationRunway: { peRatio: 26, pegRatio: 0.65, passed: true, verdict: "Extremely attractive PEG of 0.65 with high growth at reasonable price." },
      technicalStage: { stage: "Stage-2 Continuation", support200D: 240, breakoutVolumeRatio: 2.8, passed: true, verdict: "Stage-1 base accumulation breakout above ₹290 on 2.8x volume." }
    },
    keyMoats: [
      "Deep tier-1 partnerships with Cisco, Dell, and VMware.",
      "High-margin cloud data center transformation expertise."
    ],
    catalysts: [
      "Expansion into AI data center infrastructure and private cloud deployments."
    ],
    risks: ["Hardware supplier warranty and price fluctuations."],
    investmentThesis: "Micro-cap IT pure-play growing at 35%+ with 30%+ ROCE, priced at just 26x P/E. Ideal micro-cap rerating candidate for 3x+ upside.",
    entryPrice: 297,
    target1Y: 600,
    target3Y: 1050,
    expectedMultiplier: "3.5x Multiplier",
    stopLossLongTerm: 240
  },
  {
    ticker: "SHAILY.NS",
    symbol: "SHAILY",
    name: "Shaily Engineering Plastics Limited",
    sector: "Precision Medical Devices & Injectors",
    marketCapCategory: "Small-Cap (₹1,500–₹10,000 Cr)",
    marketCapCr: 2400,
    currentPrice: 1120,
    multiBaggerScore: 94,
    convictionTier: "ULTRA_CONVICTION",
    pillarsPassedCount: 6,
    pillars: {
      capitalEfficiency: { roe: 22.6, roce: 25.8, passed: true, verdict: "High-value medical devices and complex drug delivery pen devices." },
      growthAcceleration: { salesGrowth3Y: 28.4, profitGrowth3Y: 48.2, passed: true, verdict: "GLP-1 and insulin pen delivery contracts ramping with global pharma giants." },
      balanceSheetSolvency: { debtToEquity: 0.22, interestCoverage: 12.5, passed: true, verdict: "Low leverage with expanding operating cash flows." },
      institutionalFootprint: { fiiDiiHolding: 26.8, fiiQoQChange: 2.6, passed: true, verdict: "HEAVY_ACCUMULATION" },
      valuationRunway: { peRatio: 42, pegRatio: 0.95, passed: true, verdict: "Medical device rerating runway with massive margin expansion." },
      technicalStage: { stage: "Stage-2 Continuation", support200D: 880, breakoutVolumeRatio: 2.5, passed: true, verdict: "All-time-high breakout above ₹1,050 base." }
    },
    keyMoats: [
      "FDA/CE approved cleanroom facilities for medical drug delivery devices.",
      "IP-protected proprietary pen injector platforms."
    ],
    catalysts: [
      "Commercial scale-up of diabetes and obesity GLP-1 auto-injector supplies."
    ],
    risks: ["Raw polymer price swings."],
    investmentThesis: "High-entry-barrier medical device manufacturer transitioning from industrial plastics to complex drug delivery systems. Poised for 3x compounding over 3 years.",
    entryPrice: 1108,
    target1Y: 2240,
    target3Y: 3920,
    expectedMultiplier: "3.5x Multiplier",
    stopLossLongTerm: 896
  }
];

export default function MultiBaggerScreen() {
  const { setSelectedTicker } = useStockContext();
  const [allCandidates, setAllCandidates] = useState<MultiBaggerCandidate[]>(INITIAL_MULTIBAGGERS);
  const [marketContext, setMarketContext] = useState<MultiBaggerResponse['marketContext'] | null>({
    macroCycle: 'India Secular Capex & Tech Sovereignty Expansion',
    smallCapIndexBreadth: 'Stage-2 Accumulation above 200-day Moving Average',
    averageScore: 94,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick Focus Pill: defaults to Small & Micro-Caps!
  const [quickPill, setQuickPill] = useState<'All' | 'SMALL_MICRO' | 'ULTRA' | 'DEBT_FREE'>('SMALL_MICRO');
  const [tradeCandidate, setTradeCandidate] = useState<MultiBaggerCandidate | null>(null);

  // Filters
  const [sectorFilter, setSectorFilter] = useState<string>('All');
  const [marketCapFilter, setMarketCapFilter] = useState<string>('All');
  const [convictionFilter, setConvictionFilter] = useState<string>('All');
  const [minScore, setMinScore] = useState<number>(0);

  // Expanded thesis drawers
  const [expandedTheses, setExpandedTheses] = useState<Record<string, boolean>>({});

  const toggleThesis = (ticker: string) => {
    setExpandedTheses(prev => ({ ...prev, [ticker]: !prev[ticker] }));
  };

  const fetchPicks = useCallback(async (isRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/multibagger${isRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url, {
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: MultiBaggerResponse = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAllCandidates(json.data);
        setMarketContext(json.marketContext);
      } else {
        throw new Error('Invalid data returned from Multi-Bagger API');
      }
    } catch (err: any) {
      console.error('Failed to load multi-bagger candidates:', err);
      setError(err.message || 'Failed to fetch predictions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPicks();
  }, [fetchPicks]);

  const sectors = useMemo(() => {
    const list = Array.from(new Set(allCandidates.map(c => c.sector)));
    return ['All', ...list.sort()];
  }, [allCandidates]);

  const candidates = useMemo(() => {
    let list = allCandidates;
    if (quickPill === 'SMALL_MICRO') {
      list = list.filter(c => c.marketCapCategory === 'Micro-Cap (< ₹1,500 Cr)' || c.marketCapCategory === 'Nano-Cap (< ₹500 Cr)' || c.marketCapCategory === 'Small-Cap (₹1,500–₹10,000 Cr)' || c.marketCapCr <= 10000);
    } else if (quickPill === 'ULTRA') {
      list = list.filter(c => c.convictionTier === 'ULTRA_CONVICTION' || c.multiBaggerScore >= 90);
    } else if (quickPill === 'DEBT_FREE') {
      list = list.filter(c => c.pillars?.balanceSheetSolvency?.debtToEquity <= 0.2);
    }

    if (sectorFilter !== 'All') {
      list = list.filter(c => c.sector.toLowerCase().includes(sectorFilter.toLowerCase()));
    }
    if (marketCapFilter !== 'All') {
      list = list.filter(c => c.marketCapCategory === marketCapFilter);
    }
    if (convictionFilter !== 'All') {
      list = list.filter(c => c.convictionTier === convictionFilter);
    }
    if (minScore > 0) {
      list = list.filter(c => c.multiBaggerScore >= minScore);
    }
    return list;
  }, [allCandidates, quickPill, sectorFilter, marketCapFilter, convictionFilter, minScore]);

  return (
    <div id="multibagger-screen-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Hero Radar Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-950/90 via-indigo-950/95 to-slate-900/95 border border-purple-500/30 backdrop-blur-2xl p-6 sm:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold uppercase tracking-wider shadow-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
              <Rocket className="h-3.5 w-3.5" />
              <span>Curated research list · Long-term horizon</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              Long-Term Growth Watchlist
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Curated research candidates for further review. Scores and price scenarios are unvalidated and do not represent calibrated probabilities or forecasts.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ROE &gt; 18% / ROCE &gt; 20%
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                3Y Profit CAGR &gt; 20%
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Debt-to-Equity &lt; 0.5
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                FII/DII Accumulation
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900/80 border border-slate-700/60 text-xs font-semibold text-slate-300 backdrop-blur-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Stage-2 200-SMA Breakout
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => fetchPicks(true)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-purple-600/25 hover:from-purple-500 hover:to-indigo-500 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh candidates</span>
            </button>
            <div className="bg-slate-900/90 border border-purple-500/20 p-3.5 rounded-2xl text-center backdrop-blur-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Candidates shown</span>
              <p className="text-xl font-black text-purple-400 font-mono mt-0.5">{candidates.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Focus Pills Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-slate-900/10 dark:from-purple-950/30 dark:via-indigo-950/30 dark:to-slate-900/30 border border-purple-500/20 px-5 py-3 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Flame className="h-3 w-3 text-purple-500" />
            Quick Alpha Filter:
          </span>
          {[
            { id: 'SMALL_MICRO', label: '🚀 Small & Micro-Caps (< ₹10,000 Cr)', desc: 'High-growth small-cap focus' },
            { id: 'All', label: 'All Candidates', desc: 'Full universe' },
            { id: 'ULTRA', label: '💎 Ultra Conviction (90+)', desc: 'Highest pillar alignment' },
            { id: 'DEBT_FREE', label: '🛡️ Low Debt (D/E < 0.2)', desc: 'Pristine balance sheets' },
          ].map(pill => (
            <button
              key={pill.id}
              onClick={() => setQuickPill(pill.id as any)}
              className={`px-3 py-1.5 text-xs font-black rounded-xl transition-all cursor-pointer border ${
                quickPill === pill.id
                  ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-600/25 scale-[1.02]'
                  : 'bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:border-purple-400'
              }`}
              title={pill.desc}
            >
              {pill.label}
            </button>
          ))}
        </div>
        <div className="text-[10px] font-mono text-purple-400 font-bold shrink-0">
          Showing {candidates.length} high-growth setups
        </div>
      </div>

      {/* Filter Control Ribbon */}
      <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Sector Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Sector</label>
            <select
              value={sectorFilter}
              onChange={(e) => setSectorFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Market Cap Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Market Cap Tier</label>
            <select
              value={marketCapFilter}
              onChange={(e) => setMarketCapFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="All">All Market Caps</option>
              <option value="Micro-Cap (< ₹1,500 Cr)">Micro-Cap (&lt; ₹1,500 Cr)</option>
              <option value="Small-Cap (₹1,500–₹10,000 Cr)">Small-Cap (₹1,500–₹10,000 Cr)</option>
              <option value="Mid-Cap (₹10,000–₹35,000 Cr)">Mid-Cap (₹10,000–₹35,000 Cr)</option>
              <option value="Large-Cap (> ₹35,000 Cr)">Large-Cap (&gt; ₹35,000 Cr)</option>
            </select>
          </div>

          {/* Research tier filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Research tier</label>
            <select
              value={convictionFilter}
              onChange={(e) => setConvictionFilter(e.target.value)}
              className="w-full sm:w-auto bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer focus:outline-hidden"
            >
              <option value="All">All research tiers</option>
              <option value="ULTRA_CONVICTION">Top research tier</option>
              <option value="HIGH_GROWTH">Growth research tier</option>
              <option value="EMERGING_COMPOUNDER">Emerging research tier</option>
            </select>
          </div>

          {/* Min Score Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Min Score</label>
            <div className="flex items-center gap-1.5">
              {[0, 85, 90].map(s => (
                <button
                  key={s}
                  onClick={() => setMinScore(s)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                    minScore === s
                      ? 'bg-purple-600 border-purple-600 text-white shadow-md shadow-purple-600/20'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {s === 0 ? 'All' : `Score ≥ ${s}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-xs font-mono font-bold text-slate-500">
          Showing <span className="text-purple-600 dark:text-purple-400">{candidates.length}</span> high-conviction compounders
        </div>
      </div>

      {/* Main Candidate Cards Grid */}
      {loading ? (
        <div className="space-y-4 py-8 animate-pulse">
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl w-full" />
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl w-full" />
          <div className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl w-full" />
        </div>
      ) : error ? (
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 p-6 rounded-3xl text-center space-y-2">
          <AlertTriangle className="h-6 w-6 text-rose-500 mx-auto" />
          <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">Failed to Load Multi-Bagger Picks</h3>
          <p className="text-xs text-slate-500">{error}</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <p className="text-sm font-bold text-slate-500">No multi-bagger candidates match current filter criteria.</p>
          <button
            onClick={() => { setSectorFilter('All'); setMarketCapFilter('All'); setConvictionFilter('All'); setMinScore(0); }}
            className="text-xs font-bold text-purple-600 hover:underline cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6" id="multibagger-cards-container">
          {candidates.map((c) => {
            const isExpanded = !!expandedTheses[c.ticker];
            const isUltra = c.convictionTier === 'ULTRA_CONVICTION';
            const upside1Y = Math.round(((c.target1Y - c.currentPrice) / c.currentPrice) * 100);
            const upside3Y = Math.round(((c.target3Y - c.currentPrice) / c.currentPrice) * 100);

            return (
              <div 
                key={c.ticker}
                className={`relative group glass-card glass-card-interactive rounded-3xl p-6 sm:p-7 overflow-hidden ${
                  isUltra ? 'border-purple-500/50 shadow-purple-500/15 glow-indigo' : 'border-slate-800'
                }`}
                id={`multibagger-card-${c.symbol}`}
              >
                <div className="absolute -right-20 -bottom-20 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl transition-all duration-700 pointer-events-none group-hover:scale-125" />
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/80 relative z-10">
                  <div className="flex items-start gap-3">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/15 to-indigo-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-400 shrink-0 shadow-sm">
                      <Rocket className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          onClick={() => setSelectedTicker(c.ticker)}
                          className="text-lg sm:text-xl font-black text-slate-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer font-mono"
                        >
                          {c.name} ({c.symbol})
                        </button>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider border shadow-xs ${
                          isUltra 
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30' 
                            : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                        }`}>
                          {isUltra ? 'TOP RESEARCH TIER' : 'GROWTH RESEARCH TIER'}
                        </span>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold text-slate-500">
                          {c.marketCapCategory}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-400 mt-1 font-medium">{c.sector}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:text-right shrink-0">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Current Price</span>
                      <p className="text-xl font-black font-mono text-slate-900 dark:text-white">₹{c.currentPrice.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-slate-500">{c.quoteAsOf ? `${new Date(c.quoteAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · ${c.quoteStatus}` : 'Quote unavailable'}</p>
                    </div>
                    <div className="p-2.5 rounded-2xl bg-purple-500/10 dark:bg-purple-950/40 border border-purple-500/20 text-center min-w-[90px] shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-purple-600 dark:text-purple-400 font-mono">Unvalidated score</span>
                      <p className="text-lg font-black font-mono text-purple-700 dark:text-purple-300">{c.multiBaggerScore}<span className="text-xs">/100</span></p>
                    </div>
                  </div>
                </div>

                {/* Compounding Roadmap Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4 bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/70 p-4 rounded-2xl backdrop-blur-md shadow-inner">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Illustrative 1-Year scenario (fixed 2x)</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">₹{c.target1Y.toLocaleString('en-IN')}</span>
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">+{upside1Y}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Mechanical scenario, not a forecast</p>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-slate-200/60 sm:dark:border-slate-800/70 sm:pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Flame className="h-3 w-3 text-purple-500 animate-bounce" />
                      3-Year illustrative scenario ({c.expectedMultiplier})
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-purple-600 dark:text-purple-400 font-mono">₹{c.target3Y.toLocaleString('en-IN')}</span>
                      <span className="text-xs font-black text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20 glow-purple">+{upside3Y}%</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Mechanical scenario, not a forecast</p>
                  </div>

                  <div className="space-y-1 sm:border-l sm:border-slate-200/60 sm:dark:border-slate-800/70 sm:pl-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Structural Stop Loss</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">₹{c.stopLossLongTerm.toLocaleString('en-IN')}</span>
                      <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">Below 200 SMA</span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Long-term stage invalidation level</p>
                  </div>
                </div>

                {/* The 6 Core Multi-Bagger Pillars Grid */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      The 6 Multi-Bagger Pillars Status ({c.pillarsPassedCount}/6 Passed)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 uppercase">Unverified research inputs</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
                    {/* Pillar 1 */}
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3 rounded-2xl space-y-1 interactive-lift shadow-2xs hover:border-indigo-500/40">
                      <span className="text-[9px] font-bold uppercase text-slate-400">1. Capital Efficiency</span>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">ROE {c.pillars.capitalEfficiency.roe}%</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">ROCE {c.pillars.capitalEfficiency.roce}%</p>
                    </div>

                    {/* Pillar 2 */}
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3 rounded-2xl space-y-1 interactive-lift shadow-2xs hover:border-indigo-500/40">
                      <span className="text-[9px] font-bold uppercase text-slate-400">2. Growth Acceleration</span>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">Sales +{c.pillars.growthAcceleration.salesGrowth3Y}%</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">PAT +{c.pillars.growthAcceleration.profitGrowth3Y}%</p>
                    </div>

                    {/* Pillar 3 */}
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3 rounded-2xl space-y-1 interactive-lift shadow-2xs hover:border-indigo-500/40">
                      <span className="text-[9px] font-bold uppercase text-slate-400">3. Solvency</span>
                      <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">D/E {c.pillars.balanceSheetSolvency.debtToEquity}</p>
                      <p className="text-[10px] text-slate-500 font-bold font-mono">Int. Cov {c.pillars.balanceSheetSolvency.interestCoverage}x</p>
                    </div>

                    {/* Pillar 4 */}
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3 rounded-2xl space-y-1 interactive-lift shadow-2xs hover:border-indigo-500/40">
                      <span className="text-[9px] font-bold uppercase text-slate-400">4. Smart Money</span>
                      <p className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono">{c.pillars.institutionalFootprint.fiiDiiHolding}% Total</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">QoQ +{c.pillars.institutionalFootprint.fiiQoQChange}%</p>
                    </div>

                    {/* Pillar 5 */}
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3 rounded-2xl space-y-1 interactive-lift shadow-2xs hover:border-indigo-500/40">
                      <span className="text-[9px] font-bold uppercase text-slate-400">5. Valuation PEG</span>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">P/E {c.pillars.valuationRunway.peRatio}x</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">PEG {c.pillars.valuationRunway.pegRatio}</p>
                    </div>

                    {/* Pillar 6 */}
                    <div className="bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 p-3 rounded-2xl space-y-1 interactive-lift shadow-2xs hover:border-indigo-500/40">
                      <span className="text-[9px] font-bold uppercase text-slate-400">6. Stage-2 Base</span>
                      <p className="text-xs font-black text-slate-800 dark:text-slate-100 font-mono">{c.pillars.technicalStage.breakoutVolumeRatio}x Vol</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold font-mono">&gt; 200 SMA (₹{c.pillars.technicalStage.support200D})</p>
                    </div>
                  </div>
                </div>

                {/* Key Moats Chips */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80">
                  <span className="text-[10px] font-bold uppercase text-gray-400">Competitive Moats:</span>
                  {c.keyMoats.map((moat, i) => (
                    <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-900/40 font-medium">
                      🛡️ {moat}
                    </span>
                  ))}
                </div>

                {/* Deep Investment Thesis Drawer Toggle & Action Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/80 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => toggleThesis(c.ticker)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 cursor-pointer"
                  >
                    <span>{isExpanded ? 'Hide Investment Thesis' : 'Read Full Multi-Bagger Thesis'}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setTradeCandidate(c);
                        playTargetChime();
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-black rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-98"
                      title="View price scenario"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Price Scenario</span>
                    </button>

                    <button
                      onClick={() => setSelectedTicker(c.ticker)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-purple-600 hover:text-white transition-all cursor-pointer"
                    >
                      <span>Chart</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expandable Detailed Thesis Panel */}
                {isExpanded && (
                  <div className="mt-4 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                      <h4 className="text-xs font-bold uppercase text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        Long-Term Compounding Thesis
                      </h4>
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed mt-1">
                        {c.investmentThesis}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-purple-200/40 dark:border-purple-900/30">
                      <div>
                        <h5 className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">Catalysts Ahead:</h5>
                        <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 mt-1 list-disc list-inside">
                          {c.catalysts.map((cat, i) => <li key={i}>{cat}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">Key Risks to Monitor:</h5>
                        <ul className="text-[11px] text-gray-600 dark:text-gray-400 space-y-1 mt-1 list-disc list-inside">
                          {c.risks.map((risk, i) => <li key={i}>{risk}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 1-Click Quick Trade Modal */}
      {tradeCandidate && (
        <QuickTradeModal
          isOpen={!!tradeCandidate}
          onClose={() => setTradeCandidate(null)}
          ticker={tradeCandidate.ticker}
          name={tradeCandidate.name}
          currentPrice={tradeCandidate.currentPrice}
          initialTargetPct={100}
          initialStopLossPct={20}
        />
      )}

    </div>
  );
}
