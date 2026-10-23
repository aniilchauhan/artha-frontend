'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { useRouter } from '../lib/workspace-router';
import { 
  Calendar, 
  Search, 
  ArrowUpDown, 
  Loader2, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Check, 
  Info, 
  X, 
  AlertTriangle, 
  ArrowUpRight, 
  Award,
  Plus,
  Rocket,
  ShieldCheck,
  Zap,
  Bell,
  Target,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';
import type { PostIpoCandidate, PostIpoResponse, PostIpoBreakoutStatus } from '../lib/post-ipo-types';
import IpoOutlookPanel from './IpoOutlookPanel';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';

interface IPOData {
  _id: string;
  ticker?: string;
  companyName: string;
  issueSize: number;
  priceBand: string;
  minBidQuantity: number;
  openDate: string;
  closeDate: string;
  listingDate: string;
  status: 'upcoming' | 'active' | 'closed' | 'listed';
  gmp: number;
  subscriptionRate: number;
  listingPrice?: number;
  listingGainPercent?: number;
}

const INITIAL_POST_IPOS: PostIpoCandidate[] = [
  {
    ticker: 'WAAREEENER',
    symbol: 'WAAREEENER',
    companyName: 'Waaree Energies Limited',
    sector: 'Solar & Renewable Energy',
    listingDate: '2024-10-28',
    daysSinceListing: 14,
    issuePrice: 1503,
    listingPrice: 2550,
    listingDayHigh: 2600,
    currentPrice: 2845,
    breakoutTriggerPrice: 2600,
    target1: 3450,
    targetMultiBagger: 5200,
    stopLoss: 2420,
    expectedUpsidePct: 82,
    breakoutStatus: 'BREAKOUT_TRIGGERED',
    anchorLockinStatus: 'ABSORBED_STRONG',
    baseDurationWeeks: 2,
    baseDepthPct: 8,
    volumeSurgeRatio: 3.4,
    convictionScore: 94,
    institutionalOwnershipPct: 38,
    keyCatalysts: ['Solar PV manufacturing leadership', 'Massive export backlog to US & EU', 'Q2 margin expansion'],
    risks: ['Polysilicon price volatility'],
    setupSummary: 'Explosive Stage-1 listing breakout. Strong absorption of flippers above listing-day high.',
    isLiveFeed: true,
  },
  {
    ticker: 'NETWEB',
    symbol: 'NETWEB',
    companyName: 'Netweb Technologies India Ltd',
    sector: 'Technology & AI Servers',
    listingDate: '2023-07-27',
    daysSinceListing: 24,
    issuePrice: 500,
    listingPrice: 947,
    listingDayHigh: 952,
    currentPrice: 4731.70,
    breakoutTriggerPrice: 4650,
    target1: 6150,
    targetMultiBagger: 8500,
    stopLoss: 4320,
    expectedUpsidePct: 65,
    breakoutStatus: 'BREAKOUT_TRIGGERED',
    anchorLockinStatus: 'ABSORBED_STRONG',
    baseDurationWeeks: 3,
    baseDepthPct: 12,
    volumeSurgeRatio: 2.8,
    convictionScore: 92,
    institutionalOwnershipPct: 44,
    keyCatalysts: ['NVIDIA OEM server partner in India', 'High-performance computing (HPC) demand', 'Record gross margins'],
    risks: ['Component supply lead times'],
    setupSummary: 'Multi-bagger AI infrastructure leader breaking out of high-tight consolidation flag.',
    isLiveFeed: true,
  },
  {
    ticker: 'CYIENTDLM',
    symbol: 'CYIENTDLM',
    companyName: 'Cyient DLM Limited',
    sector: 'Electronic Manufacturing Services',
    listingDate: '2023-07-10',
    daysSinceListing: 31,
    issuePrice: 265,
    listingPrice: 401,
    listingDayHigh: 420,
    currentPrice: 685.40,
    breakoutTriggerPrice: 690,
    target1: 890,
    targetMultiBagger: 1250,
    stopLoss: 630,
    expectedUpsidePct: 82,
    breakoutStatus: 'NEAR_PIVOT_ACCUMULATION',
    anchorLockinStatus: 'ABSORBED_STRONG',
    baseDurationWeeks: 4,
    baseDepthPct: 14,
    volumeSurgeRatio: 2.2,
    convictionScore: 88,
    institutionalOwnershipPct: 36,
    keyCatalysts: ['Defense aerospace contracts', 'Electronics manufacturing PLI beneficiary', 'Operating leverage'],
    risks: ['Order execution pacing'],
    setupSummary: 'Forming tight accumulation pivot below multi-month resistance with rising institutional volume.',
    isLiveFeed: true,
  },
  {
    ticker: 'IDEAFORGE',
    symbol: 'IDEAFORGE',
    companyName: 'ideaForge Technology',
    sector: 'Aerospace & Defense UAVs',
    listingDate: '2023-07-07',
    daysSinceListing: 38,
    issuePrice: 672,
    listingPrice: 1300,
    listingDayHigh: 1344,
    currentPrice: 712.50,
    breakoutTriggerPrice: 740,
    target1: 940,
    targetMultiBagger: 1420,
    stopLoss: 660,
    expectedUpsidePct: 99,
    breakoutStatus: 'NEAR_PIVOT_ACCUMULATION',
    anchorLockinStatus: 'ABSORBED_STRONG',
    baseDurationWeeks: 5,
    baseDepthPct: 18,
    volumeSurgeRatio: 2.5,
    convictionScore: 86,
    institutionalOwnershipPct: 32,
    keyCatalysts: ['Indian Army drone procurement tenders', 'Homeland security UAV expansion', 'High barrier to entry'],
    risks: ['Government contract timelines'],
    setupSummary: 'Secondary base breakout building following complete anchor supply absorption.',
    isLiveFeed: true,
  }
];

export default function IpoScreen() {
  const { theme, setSelectedTicker, addToast } = useStockContext();
  const router = useRouter();

  const [ipos, setIpos] = useState<IPOData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Controls
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'openDate' | 'issueSize' | 'gmp' | 'subscriptionRate'>('openDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Year & Status Filters
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'upcoming' | 'listed'>('all');

  // Mode Switcher: Primary Offerings vs Post-Listing Breakouts
  const [activeMainTab, setActiveMainTab] = useState<'primary_ipo' | 'post_listing' | 'outlook'>('post_listing');
  const [postIpos, setPostIpos] = useState<PostIpoCandidate[]>(INITIAL_POST_IPOS);
  const [postIpoStats, setPostIpoStats] = useState<PostIpoResponse['marketStats'] | null>(null);
  const [postIpoLoading, setPostIpoLoading] = useState(false);
  const [postIpoStatusFilter, setPostIpoStatusFilter] = useState<'all' | 'FRESH_15D_SURGE' | PostIpoBreakoutStatus>('FRESH_15D_SURGE');
  const [tradeCandidate, setTradeCandidate] = useState<PostIpoCandidate | null>(null);
  const [postIpoSearch, setPostIpoSearch] = useState('');
  const [alertedTickers, setAlertedTickers] = useState<Record<string, boolean>>({});

  // Dynamically extract unique years from data
  const ipoYears = useMemo(() => {
    if (ipos.length === 0) return [];
    const yearsSet = new Set<string>();
    ipos.forEach(ipo => {
      const dateVal = ipo.listingDate || ipo.openDate || ipo.closeDate;
      if (dateVal) {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          yearsSet.add(d.getFullYear().toString());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [ipos]);

  // Default to 'all' so users see all active/upcoming and listed offerings immediately
  useEffect(() => {
    if (!selectedYear) {
      setSelectedYear('all');
    }
  }, [selectedYear]);

  // Modal / Application Drawer State
  const [selectedIpoForApply, setSelectedIpoForApply] = useState<IPOData | null>(null);
  const [bidPrice, setBidPrice] = useState('');
  const [bidQuantity, setBidQuantity] = useState<number>(0);

  // Fetch IPOs
  const fetchIPOs = async (showSpinner = true) => {
    if (showSpinner) {
      setLoading(true);
      setError(null);
    } else {
      setIsRefreshing(true);
    }
    try {
      const response = await fetch('/api/ipo');
      if (!response.ok) {
        throw new Error('Failed to load IPO records');
      }
      const data = await response.json();
      if (data.success) {
        setIpos(data.ipos || []);
        setError(null);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (err: any) {
      console.error('[IpoScreen] Error:', err);
      if (ipos.length === 0 || showSpinner) {
        setError(err?.message || 'Failed to connect to IPO service API.');
      }
    } finally {
      if (showSpinner) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchIPOs(true);
    fetchPostIpos(true);

    // Continuous 30-second live exchange polling interval (background silent sync)
    const liveTimer = setInterval(() => {
      fetchIPOs(false);
      fetchPostIpos(false);
    }, 30000);

    return () => clearInterval(liveTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPostIpos = async (showSpinner = true) => {
    if (showSpinner) {
      setPostIpoLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const res = await fetch('/api/ipo/post-listing?live=true');
      if (res.ok) {
        const json: PostIpoResponse = await res.json();
        if (json.success) {
          setPostIpos(json.data || []);
          setPostIpoStats(json.marketStats || null);
        }
      }
    } catch (err) {
      console.error('[IpoScreen] Error fetching post-IPO candidates:', err);
    } finally {
      if (showSpinner) setPostIpoLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleSetBreakoutAlert = (candidate: PostIpoCandidate) => {
    setAlertedTickers(prev => ({ ...prev, [candidate.symbol]: true }));
    playTargetChime();
    addToast(
      `Breakout Alert configured for ${candidate.symbol} at ₹${candidate.breakoutTriggerPrice.toLocaleString('en-IN')}. Push notifications enabled!`,
      'success',
      candidate.ticker
    );
  };

  const filteredPostIpos = useMemo(() => {
    return postIpos.filter(item => {
      if (postIpoStatusFilter === 'FRESH_15D_SURGE') {
        const isFresh = item.daysSinceListing <= 60 || item.isFresh15DaySurge || item.baseDurationWeeks <= 6;
        const isTriggered = item.breakoutStatus === 'BREAKOUT_TRIGGERED' || item.breakoutStatus === 'NEAR_PIVOT_ACCUMULATION';
        const hasHighUpside = item.expectedUpsidePct >= 30;
        if (!((isFresh && hasHighUpside) || (isTriggered && hasHighUpside))) return false;
      } else if (postIpoStatusFilter !== 'all' && item.breakoutStatus !== postIpoStatusFilter) {
        return false;
      }
      if (postIpoSearch.trim()) {
        const q = postIpoSearch.toLowerCase();
        return (
          item.companyName.toLowerCase().includes(q) ||
          item.symbol.toLowerCase().includes(q) ||
          item.sector.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [postIpos, postIpoStatusFilter, postIpoSearch]);

  // Set default bid quantity when selecting an IPO to apply
  useEffect(() => {
    if (selectedIpoForApply) {
      setBidQuantity(selectedIpoForApply.minBidQuantity);
      // Try to parse cut-off price from priceBand
      // e.g. "₹340 - ₹360" -> extract 360
      const matches = selectedIpoForApply.priceBand.match(/₹?(\d+)\s*$/);
      if (matches && matches[1]) {
        setBidPrice(matches[1]);
      } else {
        setBidPrice('');
      }
    }
  }, [selectedIpoForApply]);

  // Compute Summary Statistics
  const stats = useMemo(() => {
    const total = ipos.length;
    const activeCount = ipos.filter(i => i.status === 'active').length;
    const upcomingCount = ipos.filter(i => i.status === 'upcoming').length;
    
    const listedIpos = ipos.filter(i => i.status === 'listed' && i.listingGainPercent !== undefined);
    const avgGain = listedIpos.length > 0
      ? listedIpos.reduce((acc, curr) => acc + (curr.listingGainPercent || 0), 0) / listedIpos.length
      : 0;

    return {
      total,
      activeCount,
      upcomingCount,
      avgGain: avgGain.toFixed(2)
    };
  }, [ipos]);

  // Filter and Sort IPOs
  const filteredAndSortedIpos = useMemo(() => {
    let result = [...ipos];

    // Year Filter
    if (selectedYear && selectedYear !== 'all') {
      result = result.filter(i => {
        const dateVal = i.listingDate || i.openDate || i.closeDate;
        if (!dateVal) return false;
        const d = new Date(dateVal);
        return !isNaN(d.getTime()) && d.getFullYear().toString() === selectedYear;
      });
    }

    // Status Filter
    if (statusFilter !== 'all') {
      result = result.filter(i => i.status === statusFilter);
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        i => i.companyName.toLowerCase().includes(q) || 
        (i.ticker && i.ticker.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'openDate') {
        comparison = new Date(a.openDate).getTime() - new Date(b.openDate).getTime();
      } else if (sortBy === 'issueSize') {
        comparison = a.issueSize - b.issueSize;
      } else if (sortBy === 'gmp') {
        comparison = (a.gmp || 0) - (b.gmp || 0);
      } else if (sortBy === 'subscriptionRate') {
        comparison = (a.subscriptionRate || 0) - (b.subscriptionRate || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [ipos, selectedYear, statusFilter, search, sortBy, sortOrder]);

  const handleSortToggle = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'openDate' ? 'asc' : 'desc');
    }
  };

  const handleTrackStock = (ticker: string) => {
    setSelectedTicker(ticker);
    addToast(`Redirecting to live telemetry for ${ticker}`, 'info', ticker);
    router.push('/');
  };

  return (
    <div id="ipo-screen-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Brand & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            <span>IPO Center</span>
          </h2>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-tight mt-0.5">
            Explore offerings, follow new listings and assess your next trade.
          </p>
        </div>

        {activeMainTab !== 'outlook' && <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 dark:text-gray-500">
            <span className={`h-2 w-2 rounded-full ${isRefreshing ? 'bg-amber-400 animate-spin' : 'bg-emerald-400 animate-pulse'}`} />
            <span>{isRefreshing ? 'Updating...' : 'Auto-refresh 30s'}</span>
          </div>

          <button
            onClick={() => {
              if (activeMainTab === 'primary_ipo') {
                fetchIPOs(ipos.length === 0);
              } else {
                fetchPostIpos(postIpos.length === 0);
              }
            }}
            disabled={loading || postIpoLoading || isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {loading || postIpoLoading || isRefreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-500" /> : <span>Refresh Data</span>}
          </button>
        </div>}
      </div>

      {/* Top Segment Switcher: Primary Offerings vs Buy After Listing */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-1.5 bg-gray-100/90 dark:bg-gray-850/90 rounded-2xl border border-gray-200/60 dark:border-gray-800/80">
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveMainTab('post_listing')}
            aria-pressed={activeMainTab === 'post_listing'}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeMainTab === 'post_listing'
                ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Rocket className="h-4 w-4" />
            <span>1-15D Post-Listing Setups</span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 uppercase">
              Hot Alpha
            </span>
          </button>
          <button
            onClick={() => setActiveMainTab('primary_ipo')}
            aria-pressed={activeMainTab === 'primary_ipo'}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeMainTab === 'primary_ipo'
                ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>Offerings &amp; GMP</span>
          </button>
          <button aria-pressed={activeMainTab === 'outlook'} onClick={() => setActiveMainTab('outlook')} className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${activeMainTab === 'outlook' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}>
            <Target className="h-4 w-4" /> IPO Outlook
          </button>
        </div>

        {activeMainTab === 'post_listing' && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-450 rounded-xl text-[11px] font-bold border border-emerald-250/40">
            <Zap className="h-3.5 w-3.5 text-emerald-500 animate-bounce" />
            <span>Stage-1 Base Breakout Engine Active (+30% to +100% Targets)</span>
          </div>
        )}
      </div>

      {activeMainTab === 'outlook' ? <IpoOutlookPanel /> : activeMainTab === 'primary_ipo' ? (
        <>
          {/* KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/40 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
          <span className="block text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Total Tracked</span>
          <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">{stats.total}</span>
          <span className="block text-[8px] text-gray-400 mt-1">IPOs logged in system</span>
        </div>
        <div className="bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-500/20 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
          <span className="block text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider mb-1 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Now
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.activeCount}</span>
          <span className="block text-[8px] text-emerald-500/70 mt-1">Open for subscription</span>
        </div>
        <div className="bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-500/20 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
          <span className="block text-[9px] font-mono font-bold text-amber-600 dark:text-amber-450 uppercase tracking-wider mb-1">Upcoming</span>
          <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.upcomingCount}</span>
          <span className="block text-[8px] text-amber-500/70 mt-1">Launching in next weeks</span>
        </div>
        <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-500/20 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all duration-200">
          <span className="block text-[9px] font-mono font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-1">Avg Listing Gains</span>
          <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 font-mono">+{stats.avgGain}%</span>
          <span className="block text-[8px] text-indigo-500/70 mt-1">Premium of recently listed</span>
        </div>
      </div>

      {/* Filters, Search, and Sort Panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Dynamic Year Navigation Pills */}
        <div className="flex bg-gray-100 dark:bg-gray-850 p-1 rounded-xl border border-gray-200/50 dark:border-gray-800 gap-1 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setSelectedYear('all');
              setStatusFilter('all');
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-200 ${
              selectedYear === 'all'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All Offerings
          </button>
          {ipoYears.map(year => (
            <button
              key={year}
              onClick={() => {
                setSelectedYear(year);
                setStatusFilter('all'); // Reset status filter on year switch
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-200 ${
                selectedYear === year
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {year} IPOs
            </button>
          ))}
        </div>

        {/* Right Search and Sort Fields */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search company or ticker..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
            />
          </div>

          {/* Sort Menu Buttons */}
          <div className="flex bg-gray-50 dark:bg-gray-850 p-0.5 rounded-xl border border-gray-200/50 dark:border-gray-800 text-xs">
            <button
              onClick={() => handleSortToggle('openDate')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                sortBy === 'openDate' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-400'
              }`}
              title="Sort by Dates"
            >
              <span>Date</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleSortToggle('issueSize')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                sortBy === 'issueSize' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-400'
              }`}
              title="Sort by Issue Size"
            >
              <span>Size</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => handleSortToggle('gmp')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                sortBy === 'gmp' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-400'
              }`}
              title="Sort by GMP Premium"
            >
              <span>GMP</span>
              <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Status sub-filter pills */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50 dark:bg-gray-850/20 border border-gray-150/40 dark:border-gray-800/40 px-4 py-3 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sub-Filter Status:</span>
          <div className="flex flex-wrap gap-1">
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'active', label: 'Open / Active' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'listed', label: 'Recently Listed' }
            ].map(pill => (
              <button
                key={pill.id}
                onClick={() => setStatusFilter(pill.id as any)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-colors cursor-pointer border ${
                  statusFilter === pill.id
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/30'
                    : 'text-gray-500 hover:text-gray-850 dark:hover:text-gray-250 border-transparent'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
        <div className="text-[10px] font-mono font-bold text-gray-450 dark:text-gray-550 shrink-0">
          Showing {filteredAndSortedIpos.length} campaigns {selectedYear === 'all' ? 'across all offerings' : `for calendar year ${selectedYear}`}
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
          <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            Fetching active listings from database...
          </span>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-955/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-6 text-center text-rose-800 dark:text-rose-300">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
          <h5 className="font-bold text-sm">Failed to Load IPO Data</h5>
          <p className="text-xs mt-1 max-w-md mx-auto">{error}</p>
          <button onClick={() => fetchIPOs()} className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
            Retry Connection
          </button>
        </div>
      ) : filteredAndSortedIpos.length === 0 ? (
        <div className="bg-white/40 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center text-gray-450">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm font-semibold">No IPO Records Found</p>
          <p className="text-xs text-gray-400 mt-1">Adjust search or filters to see results.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedIpos.map((ipo) => {
            const hasGmp = ipo.gmp && ipo.gmp !== 0;
            const isListed = ipo.status === 'listed';
            const isActive = ipo.status === 'active';
            const isUpcoming = ipo.status === 'upcoming';
            const isClosed = ipo.status === 'closed';

            return (
              <div 
                key={ipo._id} 
                className="relative group glass-card glass-card-interactive border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl flex flex-col justify-between overflow-hidden"
              >
                <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl transition-all duration-700 pointer-events-none group-hover:scale-125" />
                
                {/* Card Top: Name and Status Badge */}
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight font-sans group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {ipo.companyName}
                    </h4>

                    {/* Status Badge */}
                    {isActive ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs">
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                        </span>
                        Active
                      </span>
                    ) : isUpcoming ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-xs">
                        Upcoming
                      </span>
                    ) : isClosed ? (
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        Closed
                      </span>
                    ) : (
                      <span className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 shadow-xs">
                        Listed
                      </span>
                    )}
                  </div>

                  {ipo.ticker && (
                    <span className="inline-block mt-1.5 text-[10px] font-mono font-bold uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                      {ipo.ticker}
                    </span>
                  )}

                  {/* Pricing/Issue Details Block */}
                  <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 pt-5 border-t border-slate-100 dark:border-slate-800 mt-4 text-xs font-sans">
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Issue Size</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">₹{ipo.issueSize.toLocaleString('en-IN')} Cr</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Price Band</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">{ipo.priceBand}</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">Lot Size</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">{ipo.minBidQuantity} shares</span>
                    </div>
                    <div>
                      <span className="block text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">
                        {isListed ? 'Listed Date' : 'Tentative List'}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {(() => {
                          const dateVal = ipo.listingDate || ipo.openDate;
                          if (!dateVal) return 'TBA';
                          const d = new Date(dateVal);
                          return isNaN(d.getTime())
                            ? 'TBA'
                            : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* GMP and Subscription Info */}
                  <div className="bg-slate-50/70 dark:bg-slate-800/50 rounded-2xl p-4 mt-4 space-y-3 border border-slate-200/60 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-1.5">
                        <Flame className={`h-3.5 w-3.5 ${ipo.gmp && ipo.gmp > 50 ? 'text-orange-500 animate-pulse' : ipo.gmp && ipo.gmp > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
                        <span className="text-slate-500 dark:text-slate-400 font-medium">GMP (Grey Market):</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono font-black ${ipo.gmp && ipo.gmp > 0 ? 'text-emerald-600 dark:text-emerald-400' : ipo.gmp && ipo.gmp < 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                          {ipo.gmp && ipo.gmp > 0 ? `+₹${ipo.gmp}` : ipo.gmp && ipo.gmp < 0 ? `-₹${Math.abs(ipo.gmp)}` : '₹0'}
                        </span>
                        {ipo.gmp && ipo.gmp > 50 ? (
                          <span className="text-[9px] font-mono font-extrabold uppercase bg-orange-500/15 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20">
                            High Demand
                          </span>
                        ) : ipo.gmp && ipo.gmp > 0 ? (
                          <span className="text-[9px] font-mono font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                            Positive
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Subscription Rate:</span>
                        <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">
                          {ipo.subscriptionRate && ipo.subscriptionRate > 0 ? `${ipo.subscriptionRate.toFixed(2)}x` : '—'}
                        </span>
                      </div>
                      {ipo.subscriptionRate && ipo.subscriptionRate > 0 && (
                        <div className="w-full bg-slate-200/70 dark:bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              ipo.subscriptionRate >= 20
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : ipo.subscriptionRate >= 5
                                ? 'bg-gradient-to-r from-indigo-500 to-cyan-400'
                                : 'bg-gradient-to-r from-slate-400 to-slate-500'
                            }`}
                            style={{ width: `${Math.min(100, (ipo.subscriptionRate / 50) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {!isListed && (
                      <div className="flex justify-between items-center text-xs border-t border-slate-200/60 dark:border-slate-800 pt-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Bid Dates:</span>
                        <span className="font-semibold font-mono text-[10px] text-slate-700 dark:text-slate-300">
                          {(() => {
                            const oDate = ipo.openDate && !isNaN(new Date(ipo.openDate).getTime())
                              ? new Date(ipo.openDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : 'TBA';
                            const cDate = ipo.closeDate && !isNaN(new Date(ipo.closeDate).getTime())
                              ? new Date(ipo.closeDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                              : 'TBA';
                            return `${oDate} - ${cDate}`;
                          })()}
                        </span>
                      </div>
                    )}

                    {isListed && ipo.listingPrice && (
                      <div className="flex justify-between items-center text-xs border-t border-slate-200/60 dark:border-slate-800 pt-2">
                        <span className="text-slate-500 dark:text-slate-400 font-medium">Listed Price:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                          ₹{ipo.listingPrice.toFixed(2)}
                          <span className={`text-[10px] font-extrabold inline-flex items-center gap-0.5 ${ipo.listingGainPercent && ipo.listingGainPercent > 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full' : 'text-slate-500'}`}>
                            {ipo.listingGainPercent && ipo.listingGainPercent > 0 ? `+${ipo.listingGainPercent}%` : `${ipo.listingGainPercent}%`}
                            {ipo.listingGainPercent && ipo.listingGainPercent > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : null}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-5 pt-3">
                  {isActive && (
                    <button 
                      onClick={() => setSelectedIpoForApply(ipo)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm hover:shadow-indigo-600/20 active:scale-98"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Plan IPO bid</span>
                    </button>
                  )}

                  {isListed && ipo.ticker && (
                    <button 
                      onClick={() => handleTrackStock(ipo.ticker!)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-indigo-200 dark:border-indigo-800 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-350 dark:hover:border-indigo-700 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-black transition-all cursor-pointer active:scale-98"
                    >
                      <span>Track Live Chart</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {isUpcoming && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-amber-600 dark:text-amber-500 font-semibold py-2">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Upcoming — Bidding starts soon</span>
                    </div>
                  )}

                  {isClosed && (
                    <div className="flex items-center justify-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 font-semibold py-2">
                      <Check className="h-3.5 w-3.5" />
                      <span>Bidding Closed — Awaiting Listing</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
        </>
      ) : (
        /* ================= POST-LISTING BREAKOUT BASE VIEW ================= */
        <div className="space-y-6">
          {/* Methodology Banner */}
          <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
              <div className="space-y-2 max-w-3xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-gray-950">
                    High Alpha Strategy
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300">
                    Why Buy After Listing vs Allotment Lottery?
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE NSE FEED (30s REFRESH)
                  </span>
                </div>
                <h3 className="text-lg font-black text-white font-sans">
                  Stage-1 IPO Base Breakout Engine: Capture +100% to +300% Compounding
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">
                  In oversubscribed IPOs, retail investors get capped at just 1 lot (&le; ₹15,000). Post-listing, &ldquo;listing gain flippers&rdquo; dump shares and mandatory 30-day/90-day anchor lock-ins expire. When market leaders absorb this supply, form a tight 4–12 week base, and break out past their listing-day high on 2.5x+ volume, institutions deploy 100x more capital. You can buy unlimited quantity with defined risk.
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  onClick={() => fetchPostIpos(postIpos.length === 0)}
                  disabled={postIpoLoading || isRefreshing}
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
                >
                  {postIpoLoading || isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                  <span>Scan Breakouts</span>
                </button>
              </div>
            </div>
          </div>

          {/* Post-IPO KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/40 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all">
              <span className="block text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Curated Candidates</span>
              <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">{postIpos.length}</span>
              <span className="block text-[8px] text-gray-400 mt-1">Screened from 85+ recent listings</span>
            </div>

            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-500/30 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all">
              <span className="block text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-450 uppercase tracking-wider mb-1 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Breakouts Triggered
              </span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {postIpoStats?.breakoutsTriggeredCount ?? postIpos.filter(p => p.breakoutStatus === 'BREAKOUT_TRIGGERED').length}
              </span>
              <span className="block text-[8px] text-emerald-500/80 mt-1">Live entry above listing-day pivot</span>
            </div>

            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-500/30 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all">
              <span className="block text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Avg Base Duration</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
                {postIpoStats?.averageBaseDurationWeeks ?? 9} wks
              </span>
              <span className="block text-[8px] text-amber-500/80 mt-1">Healthy flipper washout completed</span>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-500/30 rounded-2xl p-4 shadow-sm hover:translate-y-[-2px] transition-all">
              <span className="block text-[9px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">Compounding Upside</span>
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">+95%</span>
              <span className="block text-[8px] text-purple-500/80 mt-1">Stage-1 multi-bagger potential</span>
            </div>
          </div>

          {/* Sub-Filters and Search */}
          <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'FRESH_15D_SURGE', label: '🔥 1-Wk to 15-Day Surges (+30% to +100%)' },
                { id: 'all', label: 'All Post-IPO Setups' },
                { id: 'BREAKOUT_TRIGGERED', label: '🚀 Breakouts Active' },
                { id: 'NEAR_PIVOT_ACCUMULATION', label: '🎯 Near Pivot (<3% to LDH)' },
                { id: 'BASE_CONSOLIDATION', label: '⏳ Base Consolidation' }
              ].map(pill => (
                <button
                  key={pill.id}
                  onClick={() => setPostIpoStatusFilter(pill.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                    postIpoStatusFilter === pill.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by company, symbol, or sector..."
                value={postIpoSearch}
                onChange={(e) => setPostIpoSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-sans"
              />
            </div>
          </div>

          {/* Post-IPO Candidates Grid */}
          {postIpoLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
              <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Scanning NSE Post-Listing Base Breakouts...
              </span>
            </div>
          ) : filteredPostIpos.length === 0 ? (
            <div className="bg-white/40 dark:bg-gray-900/40 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-16 text-center text-gray-450">
              <Rocket className="h-10 w-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm font-semibold">No Post-IPO Breakout Setups Found</p>
              <p className="text-xs text-gray-400 mt-1">Clear filters or search to view high-conviction candidates.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredPostIpos.map((candidate) => {
                const isTriggered = candidate.breakoutStatus === 'BREAKOUT_TRIGGERED';
                const isNearPivot = candidate.breakoutStatus === 'NEAR_PIVOT_ACCUMULATION';
                const hasAlert = alertedTickers[candidate.symbol];

                return (
                  <div
                    key={candidate.ticker}
                    className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between group"
                  >
                    {/* Ambient Glow */}
                    <div className="absolute -top-16 -right-16 w-36 h-36 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

                    <div className="relative z-10">
                      {/* Top Row: Symbol, Sector, Conviction Score, Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50">
                              {candidate.symbol}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-full">
                              {candidate.sector}
                            </span>
                            {candidate.daysSinceListing <= 35 && (
                              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <Flame className="h-3 w-3 text-amber-500" />
                                Day {candidate.daysSinceListing} of 15 Window
                              </span>
                            )}
                          </div>
                          <h4 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white mt-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {candidate.companyName}
                          </h4>
                        </div>

                        {/* Status & Conviction */}
                        <div className="flex flex-col items-end gap-1.5">
                          {isTriggered ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                              Breakout Triggered
                            </span>
                          ) : isNearPivot ? (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Target className="h-3 w-3" />
                              Near Pivot Accumulation
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                              <Layers className="h-3 w-3" />
                              Base Consolidation
                            </span>
                          )}

                          <div className="flex items-center gap-1 text-[11px] font-mono font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/30">
                            <span>Score: {candidate.convictionScore}/100</span>
                          </div>
                        </div>
                      </div>

                      {/* Anchor Lock-in & Listing Status Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ShieldCheck className="h-4 w-4 text-emerald-500" />
                          <span className="text-slate-500 dark:text-slate-400 font-medium">Anchor Overhang:</span>
                          {candidate.anchorLockin30d && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              candidate.anchorLockin30d.status === 'EXPIRED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : candidate.anchorLockin30d.status === 'IMMINENT'
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            }`}>
                              <span>30D Lock-In:</span>
                              <span className="font-extrabold">
                                {candidate.anchorLockin30d.status === 'EXPIRED' ? '✅ Absorbed' : candidate.anchorLockin30d.daysRemaining !== undefined ? `⏳ ${candidate.anchorLockin30d.daysRemaining}d` : 'Pending'}
                              </span>
                            </span>
                          )}
                          {candidate.anchorLockin90d && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                              candidate.anchorLockin90d.status === 'EXPIRED'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : candidate.anchorLockin90d.status === 'IMMINENT'
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse'
                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                            }`}>
                              <span>90D Lock-In:</span>
                              <span className="font-extrabold">
                                {candidate.anchorLockin90d.status === 'EXPIRED' ? '✅ Absorbed' : candidate.anchorLockin90d.daysRemaining !== undefined ? `⏳ ${candidate.anchorLockin90d.daysRemaining}d` : 'Pending'}
                              </span>
                            </span>
                          )}
                          {!candidate.anchorLockin30d && (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {candidate.anchorLockinStatus === 'ABSORBED_STRONG' ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                                  Fully Absorbed (Clean Floating Supply)
                                </span>
                              ) : (
                                <span className="text-amber-600 dark:text-amber-400 font-extrabold bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-500/30">
                                  30D Expiry Pending (Watch Dip)
                                </span>
                              )}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <span>Listed {candidate.listingDate}</span>
                          <span>·</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{candidate.daysSinceListing}d ago</span>
                        </div>
                      </div>

                      {/* Price Action Highway Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 p-3.5 bg-slate-50/80 dark:bg-slate-850/70 rounded-2xl border border-slate-200/60 dark:border-slate-800/60 text-xs">
                        <div>
                          <span className="block text-[9px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
                            <span>Current Price</span>
                            {candidate.isLiveFeed && (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Live Exchange Quote" />
                            )}
                          </span>
                          <span className="font-mono font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1 flex-wrap">
                            ₹{candidate.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            {candidate.dayChangePct !== undefined && (
                              <span className={`text-[10px] font-black ${candidate.dayChangePct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                                ({candidate.dayChangePct >= 0 ? `+${candidate.dayChangePct.toFixed(1)}%` : `${candidate.dayChangePct.toFixed(1)}%`})
                              </span>
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[9px] font-mono font-bold text-indigo-500 uppercase">LDH Breakout Pivot</span>
                          <span className="font-mono font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                            ₹{candidate.breakoutTriggerPrice.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[9px] font-mono font-bold text-emerald-600 uppercase">Stage-1 Target (+30%)</span>
                          <span className="font-mono font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                            ₹{candidate.target1.toLocaleString('en-IN')}
                          </span>
                        </div>

                        <div>
                          <span className="block text-[9px] font-mono font-bold text-purple-600 uppercase">Multi-Bagger (+50% to +100%+)</span>
                          <span className="font-mono font-extrabold text-sm text-purple-600 dark:text-purple-400">
                            ₹{candidate.targetMultiBagger.toLocaleString('en-IN')}
                            <span className="text-[10px] ml-1 text-emerald-500 font-bold">(+{candidate.expectedUpsidePct.toFixed(0)}%)</span>
                          </span>
                        </div>
                      </div>

                      {/* Technical Base Metrics Strip */}
                      <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                        <div className="p-2 bg-gray-50 dark:bg-gray-850/40 rounded-xl border border-gray-150/50 dark:border-gray-800/40">
                          <span className="block text-[9px] font-mono text-gray-400 uppercase">Base Duration</span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{candidate.baseDurationWeeks} Weeks</span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-850/40 rounded-xl border border-gray-150/50 dark:border-gray-800/40">
                          <span className="block text-[9px] font-mono text-gray-400 uppercase">Base Depth</span>
                          <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{candidate.baseDepthPct}%</span>
                        </div>
                        <div className="p-2 bg-gray-50 dark:bg-gray-850/40 rounded-xl border border-gray-150/50 dark:border-gray-800/40">
                          <span className="block text-[9px] font-mono text-gray-400 uppercase">Volume Surge</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{candidate.volumeSurgeRatio}x Listing Avg</span>
                        </div>
                      </div>

                      {/* Setup Rationale / Summary */}
                      <p className="text-xs text-gray-650 dark:text-gray-300 mt-3.5 leading-relaxed bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100/40 dark:border-indigo-900/30">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">Setup Analysis: </span>
                        {candidate.setupSummary}
                      </p>

                      {/* Catalysts Bullet List */}
                      <div className="mt-3.5 space-y-1.5">
                        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Key Catalysts:</span>
                        {candidate.keyCatalysts.map((cat, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{cat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="mt-5 pt-3 border-t border-gray-150/60 dark:border-gray-800/60 flex items-center gap-2">
                      <button
                        onClick={() => handleTrackStock(candidate.ticker)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-98"
                      >
                        <span>Track Live Chart</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setTradeCandidate(candidate)}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-98"
                        title="View a +50% / +100% price scenario"
                      >
                        <Zap className="h-3.5 w-3.5 fill-current" />
                        <span>Price Scenario</span>
                      </button>

                      <button
                        onClick={() => handleSetBreakoutAlert(candidate)}
                        className={`px-3.5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          hasAlert
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-600 dark:text-emerald-400'
                            : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                        title="Set Breakout Alert"
                      >
                        <Bell className={`h-3.5 w-3.5 ${hasAlert ? 'text-emerald-500' : 'text-gray-400'}`} />
                        <span>{hasAlert ? 'Alert Set' : 'Set Alert'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedIpoForApply && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <section role="dialog" aria-modal="true" aria-labelledby="ipo-planner-title" className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h2 id="ipo-planner-title" className="text-lg font-bold">IPO bid planner · {selectedIpoForApply.companyName}</h2>
              <button autoFocus onClick={() => setSelectedIpoForApply(null)} aria-label="Close IPO bid planner"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-300">Planning only. Axion does not submit IPO applications or reserve shares. Apply through your broker or bank and verify the current offer terms there.</p>
            <p className="text-sm">Reported price band: {selectedIpoForApply.priceBand} · Lot size: {selectedIpoForApply.minBidQuantity} shares</p>
            <label className="block text-sm">Number of lots
              <input aria-label="Number of lots" type="number" min="1" max="1000" step="1" value={selectedIpoForApply.minBidQuantity > 0 ? bidQuantity / selectedIpoForApply.minBidQuantity : 0}
                onChange={event => setBidQuantity(Math.max(1, Math.min(1000, Math.floor(Number(event.target.value) || 1))) * selectedIpoForApply.minBidQuantity)}
                className="mt-1 block w-full rounded-xl border p-3 bg-transparent" />
            </label>
            <label className="block text-sm">Planning price per share (₹)
              <input aria-label="Planning price per share" type="number" min="0.01" step="0.01" value={bidPrice} onChange={event => setBidPrice(event.target.value)} className="mt-1 block w-full rounded-xl border p-3 bg-transparent" />
            </label>
            <p role="status" className="font-semibold">Estimated bid value: {Number.isFinite(Number(bidPrice)) && Number(bidPrice) > 0 && bidQuantity > 0 ? '₹' + (Number(bidPrice) * bidQuantity).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 'Enter a valid price and lot size'}</p>
            <button onClick={() => setSelectedIpoForApply(null)} className="rounded-xl bg-indigo-600 text-white px-4 py-2">Done planning</button>
          </section>
        </div>
      )}

      {/* Quick Trade Modal for Post-IPO Breakout */}
      {tradeCandidate && (
        <QuickTradeModal
          isOpen={true}
          onClose={() => setTradeCandidate(null)}
          ticker={tradeCandidate.symbol}
          name={tradeCandidate.companyName}
          currentPrice={tradeCandidate.livePrice || tradeCandidate.currentPrice}
          initialTargetPct={tradeCandidate.surgeTarget15dPct || (tradeCandidate.expectedUpsidePct >= 30 ? tradeCandidate.expectedUpsidePct : 45)}
          initialStopLossPct={7.0}
        />
      )}
    </div>
  );
}
