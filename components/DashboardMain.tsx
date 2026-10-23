'use client';


import { axionFetch as fetch, axionAppPath } from '../lib/in-process';
import dynamic from 'next/dynamic';
import React, { useState, useMemo, useEffect, useDeferredValue, useRef } from 'react';
import Link from './WorkspaceLink';
import DashboardOverview from './DashboardOverview';
import ResearchWorkflowStatus from './ResearchWorkflowStatus';
import { isProviderStock } from '../lib/market-quote';
import { useStockContext } from '../context/StockContext';
import { Stock, calculateDetailedStockSuggestion } from '../lib/stock-data';
import { calculateReturnMetrics, StockReturnMetrics } from '../lib/return-metrics';
import { axionApiPath, axionAssetPath } from '../lib/in-process';

const IndexBanner = dynamic(() => import('./IndexBanner'), { ssr: false });
const MarketStatsBar = dynamic(() => import('./MarketStatsBar'), { ssr: false, loading: () => <div className="h-20 rounded-3xl bg-slate-100 dark:bg-slate-900/80 animate-pulse" /> });
const ReturnAlphaBanner = dynamic(() => import('./ReturnAlphaBanner'), { ssr: false });
const MomentumRadarBanner = dynamic(() => import('./MomentumRadarBanner'), { ssr: false });
const MacroFlowBar = dynamic(() => import('./MacroFlowBar'), { ssr: false });
const MarketBenchmarkChart = dynamic(() => import('./MarketBenchmarkChart'), { ssr: false });
const MarketBreadthRadar = dynamic(() => import('./MarketBreadthRadar'), { ssr: false });
const DashboardMoodWidget = dynamic(() => import('./DashboardMoodWidget'), { ssr: false });
const DashboardMarketRadar = dynamic(() => import('./DashboardMarketRadar'), { ssr: false });
const WholeMarketForecast = dynamic(() => import('./WholeMarketForecast'), { ssr: false });
const NseSmartMoneyWidget = dynamic(() => import('./NseSmartMoneyWidget'), { ssr: false });
const LiveMarketHeatmapGrid = dynamic(() => import('./LiveMarketHeatmapGrid'), { ssr: false });
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';
import {
  Star, ArrowUpRight, ArrowDownRight, ArrowRight, Loader2, AlertCircle,
  ArrowUpDown, Cpu, ChevronRight, ChevronLeft, Sparkles, Search, SlidersHorizontal,
  Flame, TrendingUp, TrendingDown, Zap, ShieldCheck, LayoutGrid, List, Database, Plus, BarChart2,
  Target, Rocket, Coins, Percent, Lock, Unlock, Calendar
} from 'lucide-react';


/* ─── Upgraded Interactive Mini Sparkline with Hover Tooltip ─────────────────────── */
function MiniSparkline({
  history,
  isUp,
  id,
  width = 72,
  height = 28,
  compact = false,
}: {
  history: { close: number; date?: string }[];
  isUp: boolean;
  id: string;
  width?: number;
  height?: number;
  compact?: boolean;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const prices = useMemo(() => history?.slice(-18).map(h => h.close).filter(Boolean) ?? [], [history]);
  if (prices.length < 2) {
    return <div style={{ width, height }} className="bg-slate-100 dark:bg-slate-800/40 rounded-lg opacity-40 shrink-0" />;
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const paddingY = compact ? 2 : 3;
  const usableH = height - paddingY * 2;

  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * width;
    const y = height - paddingY - ((p - min) / range) * usableH;
    return { x, y, price: p };
  });

  const polylineStr = points.map(pt => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ');
  const fillPolyStr = `0,${height} ${polylineStr} ${width},${height}`;
  const stroke = isUp ? '#10b981' : '#f43f5e';
  const cleanId = id.replace(/[^a-zA-Z0-9]/g, '');
  const gradId = `spark-grad-${cleanId}`;

  const lastPoint = points[points.length - 1];
  const activePt = hoverIndex !== null ? points[hoverIndex] : null;
  const firstPrice = prices[0];
  const activeChangePct = activePt ? ((activePt.price - firstPrice) / firstPrice) * 100 : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = Math.max(0, Math.min(width, (e.clientX - rect.left) * (width / rect.width)));
    const closestIdx = Math.round((mouseX / width) * (prices.length - 1));
    setHoverIndex(Math.max(0, Math.min(prices.length - 1, closestIdx)));
  };

  return (
    <div
      className="relative group/spark shrink-0 flex items-center justify-center select-none"
      style={{ width, height }}
      onClick={(e) => e.stopPropagation()}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        preserveAspectRatio="none"
        className="overflow-visible cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <polygon points={fillPolyStr} fill={`url(#${gradId})`} />
        
        <polyline
          points={polylineStr}
          fill="none"
          stroke={stroke}
          strokeWidth={compact ? '1.5' : '1.75'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Pulse dot at latest close when not hovered */}
        {hoverIndex === null && lastPoint && (
          <g>
            <circle cx={lastPoint.x} cy={lastPoint.y} r={compact ? '2' : '2.5'} fill={stroke} />
            <circle cx={lastPoint.x} cy={lastPoint.y} r={compact ? '3.5' : '4.5'} fill={stroke} opacity="0.35" className="animate-ping" />
          </g>
        )}

        {/* Hover Crosshair & Point */}
        {activePt && (
          <g>
            <line
              x1={activePt.x}
              y1="0"
              x2={activePt.x}
              y2={height}
              stroke={stroke}
              strokeWidth="1"
              strokeDasharray="2,2"
              opacity="0.8"
            />
            <circle cx={activePt.x} cy={activePt.y} r="3" fill="#ffffff" stroke={stroke} strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* Floating Hover Tooltip */}
      {activePt && activeChangePct !== null && (
        <div
          className="absolute -top-7 z-40 pointer-events-none px-1.5 py-0.5 rounded-md bg-slate-900/95 text-white border border-slate-700/80 shadow-lg text-[9px] font-mono whitespace-nowrap transform -translate-x-1/2 flex items-center gap-1 backdrop-blur-md"
          style={{
            left: Math.max(22, Math.min(width - 22, activePt.x)),
          }}
        >
          <span className="font-bold">₹{activePt.price.toFixed(1)}</span>
          <span className={activeChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
            {activeChangePct >= 0 ? '+' : ''}{activeChangePct.toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ─── Expand Sparkline into 25-Period History for Technical Indicators ─── */
function sparklineToHistory(_sparkline: number[] | undefined, _basePrice: number) {
  // Data Integrity (DEF-01): Never synthesize artificial OHLCV candles from sparkline values.
  // Missing provider history is kept unavailable rather than fabricated.
  return [];
}

/* ─── AI Score Ring with Glowing Arc ─────────────────────── */
function ScoreRing({ score }: { score: number }) {
  const pct = Math.min(1, Math.max(0, score));
  const r = 13;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const color = pct >= 0.75 ? '#10b981' : pct >= 0.5 ? '#facc15' : '#f43f5e';

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 34 34" width="34" height="34" aria-label={`Score ${(pct * 100).toFixed(0)}%`}>
        <circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-slate-200 dark:text-slate-800"
        />
        <circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
          strokeDashoffset={(circ / 4).toFixed(1)}
          className="transition-all duration-700 ease-out"
        />
        <text
          x="17"
          y="20.5"
          textAnchor="middle"
          fontSize="9"
          fill={color}
          fontWeight="800"
          className="font-mono"
        >
          {(pct * 100).toFixed(0)}
        </text>
      </svg>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────── */
const StockCardSkeleton = () => (
  <div className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm flex items-center justify-between gap-4 animate-pulse">
    <div className="flex items-center gap-3.5 flex-1">
      <div className="w-1.5 h-12 rounded-full bg-slate-200 dark:bg-slate-800" />
      <div className="space-y-2 flex-1">
        <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
      </div>
    </div>
    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-800 rounded-xl" />
    <div className="space-y-1.5 flex flex-col items-end">
      <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg" />
      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
    </div>
  </div>
);

type FilterCategory = 'max_upside' | 'post_ipo' | 'breakout' | 'high_rr' | 'ai' | 'gainers' | 'losers' | 'volume' | 'all';
type SortField = 'upside' | 'rr' | 'score' | 'ticker' | 'changePercent' | 'volume';

export function getScorePool<T>(stocks: T[], limit: number): T[] {
  return stocks.length > limit ? stocks.slice(0, limit) : stocks;
}

const STOCK_SCORING_LIMIT = 1200;

const INITIAL_POST_IPO = [
  {
    ticker: 'NETWEB',
    companyName: 'Netweb Technologies India',
    sector: 'Technology & AI Servers',
    currentPrice: 4731.70,
    target1: 6150.0,
    expectedUpsidePct: 30,
    anchorLockinStatus: 'ABSORBED_STRONG',
    breakoutStatus: 'Stage-1 Breakout',
    ipoYear: 2023,
  },
  {
    ticker: 'CYIENTDLM',
    companyName: 'Cyient DLM Limited',
    sector: 'Electronic Manufacturing Services',
    currentPrice: 685.40,
    target1: 890.0,
    expectedUpsidePct: 30,
    anchorLockinStatus: 'ABSORBED_STRONG',
    breakoutStatus: 'Consolidation Pivot',
    ipoYear: 2023,
  },
  {
    ticker: 'TATATECH',
    companyName: 'Tata Technologies Limited',
    sector: 'Automotive Engineering & ER&D',
    currentPrice: 945.20,
    target1: 1220.0,
    expectedUpsidePct: 29,
    anchorLockinStatus: 'ABSORBED_STRONG',
    breakoutStatus: 'Anchor Absorption Base',
    ipoYear: 2023,
  },
  {
    ticker: 'IDEAFORGE',
    companyName: 'ideaForge Technology',
    sector: 'Aerospace & Defense UAVs',
    currentPrice: 712.50,
    target1: 940.0,
    expectedUpsidePct: 32,
    anchorLockinStatus: 'ABSORBED_STRONG',
    breakoutStatus: 'Multi-Month Base Breakout',
    ipoYear: 2023,
  }
];

/* ─── Main Dashboard ─────────────────────────────────────── */
export default function DashboardMain() {
  const {
    stocks, watchlist, toggleWatchlist, selectedTicker, setSelectedTicker, setActiveTab,
    isFetching, isLoading, pollingError, dataQualityStatus, addCustomTicker
  } = useStockContext();

  const dataStatusLabel = {
    live: 'Recent provider quotes',
    mixed: 'Delayed / mixed quotes',
    simulated: 'Simulated demo feed',
    unavailable: 'Market data unavailable',
  }[dataQualityStatus];
  const dataStatusTone = {
    live: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    mixed: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    simulated: 'border-slate-400/30 bg-slate-500/10 text-slate-600 dark:text-slate-300',
    unavailable: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  }[dataQualityStatus];
  const dataStatusDotTone = {
    live: 'bg-emerald-500',
    mixed: 'bg-amber-500',
    simulated: 'bg-slate-500',
    unavailable: 'bg-rose-500',
  }[dataQualityStatus];

  const [activeCategory, setActiveCategory] = useState<FilterCategory>('breakout');
  const [selectedCapital, setSelectedCapital] = useState<number>(50000);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState<SortField>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'dense'>('cards');
  const [quickTradeStock, setQuickTradeStock] = useState<{
    ticker: string;
    name?: string;
    currentPrice: number;
    targetPct?: number;
    stopLossPct?: number;
  } | null>(null);

  const handleQuickTrade = (stockData: {
    ticker: string;
    name?: string;
    currentPrice: number;
    targetPct?: number;
    stopLossPct?: number;
  }) => {
    try {
      playTargetChime();
    } catch {}
    setQuickTradeStock(stockData);
  };
  const [aiPicks, setAiPicks] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [postIpoPicks, setPostIpoPicks] = useState<any[]>(INITIAL_POST_IPO);
  const [postIpoLoading, setPostIpoLoading] = useState(false);
  const [catalogRequested, setCatalogRequested] = useState(false);

  // Pagination states
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Universal Database Search state (across all 5,055 listed Indian companies)
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [dbResults, setDbResults] = useState<any[]>([]);
  const [isDbSearching, setIsDbSearching] = useState(false);
  const [showDbDropdown, setShowDbDropdown] = useState(false);
  const [dbSearchError, setDbSearchError] = useState(false);
  const [searchAttempt, setSearchAttempt] = useState(0);
  // Dismiss database dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowDbDropdown(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search across the full 5,055 stock universe
  useEffect(() => {
    const q = deferredSearchQuery.trim();
    const controller = new AbortController();
    setDbResults([]);
    setShowDbDropdown(false);
    setDbSearchError(false);
    setHighlightedIndex(-1);
    if (q.length < 2) {
      setIsDbSearching(false);
      return;
    }

    setIsDbSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(axionApiPath(`/api/stocks/database?search=${encodeURIComponent(q)}&limit=6`), { signal: controller.signal });
        if (!res.ok) throw new Error('Database search failed');
        const data = await res.json();
        if (!Array.isArray(data.stocks)) throw new Error('Invalid search results');
        const items = data.stocks.map((s: any) => ({
          ticker: (s.symbol || s.ticker || '').replace(/\.NS$/, ''),
          name: s.name,
          sector: s.sector,
          price: s.price ?? s.currentPrice,
          changePercent: s.changePercent,
        }));
        if (!controller.signal.aborted) {
          setDbResults(items);
          setShowDbDropdown(true);
        }
      } catch {
        if (!controller.signal.aborted) setDbSearchError(true);
      } finally {
        if (!controller.signal.aborted) setIsDbSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [deferredSearchQuery, searchAttempt]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery, sortBy, sortOrder]);

  // Fetch AI Predictions
  useEffect(() => {
    fetch(axionApiPath('/api/stock-ai/predictions'))
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setAiPicks(d.data.slice(0, 4));
        }
      })
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, []);

  // Fetch 2-Year Post-IPO Predictions
  useEffect(() => {
    fetch(axionApiPath('/api/post-ipo/predict?live=false'))
      .then(r => r.json())
      .then(d => {
        if (d.success && Array.isArray(d.data)) {
          setPostIpoPicks(d.data.slice(0, 4));
        }
      })
      .catch(() => {})
      .finally(() => setPostIpoLoading(false));
  }, []);

  const postIpoTickers = useMemo(() => {
    return new Set(postIpoPicks.map(p => (p.ticker || p.symbol || '').toUpperCase().replace(/\.NS$/, '')));
  }, [postIpoPicks]);

  const [universeStocks, setUniverseStocks] = useState<Stock[]>([]);

  // Load catalog on mount
  useEffect(() => {
    fetch(axionAssetPath('/all_indian_stocks_5055.json'))
      .then(r => r.json())
      .then((catalog: any[]) => {
        if (Array.isArray(catalog) && catalog.length > 0) {
          const mapped: Stock[] = catalog.map(s => {

            return {
              ticker: s.symbol || s.ticker.replace(/\.(NS|BO)$/, ''),
              name: s.name || s.symbol || s.ticker,
              currentPrice: s.currentPrice ?? s.price ?? 0,
              change: s.change ?? 0,
              changePercent: s.changePercent ?? 0,
              high: s.high ?? Math.max(...(s.sparkline || [s.price || 0])),
              low: s.low ?? Math.min(...(s.sparkline || [s.price || 0])),
              volume: s.volume ?? 100000,
              sector: s.sector || 'Diversified',
              marketCap: s.marketCap ?? 1000,
              sparkline: s.sparkline,
              history: [], // Generated on demand for active viewport
              isFallback: false,
            };
          });
          setUniverseStocks(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Combine full 5,055 universe stocks with live streaming quotes from StockContext
  const effectiveStocks = useMemo(() => {
    if (universeStocks.length === 0) return stocks;
    const liveMap = new Map(stocks.map(s => [s.ticker.toUpperCase(), s]));
    const combined = new Map(universeStocks.map(stock => [stock.ticker.toUpperCase(), stock]));
    liveMap.forEach((live, ticker) => {
      combined.set(ticker, { ...combined.get(ticker), ...live });
    });
    return [...combined.values()];
  }, [universeStocks, stocks]);

  // Keep the expensive scoring work limited to a manageable pool instead of every stock on every render.
  const scoringPool = useMemo(() => getScorePool(effectiveStocks, STOCK_SCORING_LIMIT), [effectiveStocks]);

  const detailedSuggestionCache = useMemo(() => new Map<string, { lastPrice: number; histLen: number; detailed: any }>(), []);

  const scoredStocks = useMemo(() => {
    return scoringPool.map(stock => {
      const cacheKey = stock.ticker;
      const cached = detailedSuggestionCache.get(cacheKey);
      const history = (stock.history && stock.history.length > 0)
        ? stock.history
        : sparklineToHistory((stock as any).sparkline, stock.currentPrice);
      const histLen = history.length;
      let detailed = cached?.detailed;
      if (!cached || cached.lastPrice !== stock.currentPrice || cached.histLen !== histLen) {
        detailed = calculateDetailedStockSuggestion(history);
        detailedSuggestionCache.set(cacheKey, {
          lastPrice: stock.currentPrice,
          histLen,
          detailed,
        });
      }
      const hydratedStock = { ...stock, history };
      const returnMetrics = calculateReturnMetrics(hydratedStock, detailed, selectedCapital);
      return { stock: hydratedStock, detailed, returnMetrics };
    });
  }, [scoringPool, detailedSuggestionCache, selectedCapital]);

  // Apply active category filter & search
  const filteredStocks = useMemo(() => {
    let list = scoredStocks;

    // Search query filter
    if (deferredSearchQuery.trim()) {
      const q = deferredSearchQuery.trim().toLowerCase();
      list = list.filter(item =>
        item.stock.ticker.toLowerCase().includes(q) ||
        (item.stock.name && item.stock.name.toLowerCase().includes(q)) ||
        (item.stock.sector && item.stock.sector.toLowerCase().includes(q))
      );
    }

    // Category filter
    switch (activeCategory) {
      case 'max_upside': {
        const matches = list.filter(item => item.returnMetrics.projectedReturnPercent >= 5.0 || item.detailed.suggestion === 'BUY');
        if (matches.length > 0) list = matches;
        break;
      }
      case 'post_ipo': {
        const matches = list.filter(item =>
          postIpoTickers.has(item.stock.ticker.toUpperCase()) ||
          Boolean((item.stock as any).isPostIpo)
        );
        if (matches.length > 0) list = matches;
        break;
      }
      case 'breakout': {
        const matches = list.filter(item =>
          item.returnMetrics.isBreakout ||
          item.stock.changePercent >= 2.0 ||
          Boolean((item.stock as any).isEligibleFor2Pct) ||
          item.returnMetrics.projectedReturnPercent >= 2.0
        );
        if (matches.length >= 5) list = matches;
        else if (matches.length > 0) list = matches;
        break;
      }
      case 'high_rr': {
        const matches = list.filter(item => item.returnMetrics.riskRewardRatio >= 2.2);
        if (matches.length > 0) list = matches;
        break;
      }
      case 'ai': {
        // High conviction BUY or high score
        const signals = list.filter(item => item.detailed.suggestion === 'BUY' || item.detailed.score >= 50);
        if (signals.length >= 5) list = signals;
        break;
      }
      case 'gainers':
        list = list.filter(item => item.stock.changePercent > 0);
        break;
      case 'losers':
        list = list.filter(item => item.stock.changePercent < 0);
        break;
      case 'volume':
        break;
      case 'all':
      default:
        break;
    }

    // Sorting
    return [...list].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'upside') {
        comparison = a.returnMetrics.projectedReturnPercent - b.returnMetrics.projectedReturnPercent;
      } else if (sortBy === 'rr') {
        comparison = a.returnMetrics.riskRewardRatio - b.returnMetrics.riskRewardRatio;
      } else if (sortBy === 'score') {
        comparison = a.detailed.score - b.detailed.score;
      } else if (sortBy === 'ticker') {
        comparison = a.stock.ticker.localeCompare(b.stock.ticker);
      } else if (sortBy === 'changePercent') {
        comparison = a.stock.changePercent - b.stock.changePercent;
      } else if (sortBy === 'volume') {
        comparison = a.stock.volume - b.stock.volume;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [scoredStocks, activeCategory, deferredSearchQuery, sortBy, sortOrder, postIpoTickers]);

  const totalPages = pageSize >= filteredStocks.length ? 1 : Math.ceil(filteredStocks.length / pageSize);
  const visiblePage = Math.min(currentPage, totalPages);
  useEffect(() => {
    setCurrentPage(page => Math.min(page, totalPages));
  }, [totalPages]);
  const paginatedStocks = useMemo(() => {
    if (pageSize >= filteredStocks.length) return filteredStocks;
    const start = (visiblePage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, visiblePage, pageSize]);

  const maxVolume = useMemo(() => {
    let max = 1;
    for (let i = 0; i < effectiveStocks.length; i++) {
      const v = effectiveStocks[i].volume;
      if (v > max) max = v;
    }
    return max;
  }, [effectiveStocks]);

  const handleSortToggle = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'ticker' ? 'asc' : 'desc');
    }
  };

  return (
    <div id="dashboard-screen-container" className="space-y-6">

      {/* ─── Top Header & Controls ─────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 animate-fade-up">
        <div className="flex min-w-0 flex-col items-start gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-700 dark:from-white dark:via-indigo-200 dark:to-slate-400 bg-clip-text text-transparent">
              Market Intelligence
            </h1>
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase border ${dataStatusTone}`}>
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${dataStatusDotTone}`} />
              {dataStatusLabel}
            </span>
          </div>
          <nav aria-label="Dashboard sections" className="flex max-w-full gap-1.5 overflow-x-auto pb-0.5">
            {[
              { href: '#live-market-heatmap-grid', label: 'Market heatmap' },
              { href: '#dashboard-research-desk', label: 'Research desk' },
              { href: '#dashboard-stock-opportunities', label: 'Stock opportunities' },
              { href: '#dashboard-market-context', label: 'Market context' },
            ].map(item => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-slate-200/80 bg-white/70 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition-colors hover:border-indigo-300 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={axionAppPath("/database")}
            className="rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Find Stock</span>
          </Link>
          <Link
            href={axionAppPath("/watchlist")}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 px-3.5 py-2 text-xs font-bold bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5"
          >
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" />
            <span>Watchlist ({watchlist.length})</span>
          </Link>
        </div>
      </div>

      {/* ─── Error Notification ─────────────────────────────────── */}
      {pollingError && (
        <div id="polling-error-banner" className="bg-rose-50/90 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-3xl p-4 flex gap-3.5 items-start text-rose-800 dark:text-rose-300 animate-fade-up">
          <AlertCircle className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <h5 className="text-sm font-bold">Data Feed Synchronization Notice</h5>
            <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5 leading-relaxed">{pollingError}</p>
          </div>
        </div>
      )}

      {/* ─── Live Intraday Small-Cap Multi-Indicator Heatmap Grid (Top Priority) ── */}
      <LiveMarketHeatmapGrid customStocks={effectiveStocks} />

      <div id="dashboard-research-desk" className="scroll-mt-24">
        <DashboardOverview
          stocks={effectiveStocks}
          watchlist={watchlist}
          capital={selectedCapital}
          loading={isLoading}
          onSelectTicker={(ticker) => { setSelectedTicker(ticker); setActiveTab('dashboard'); }}
        />
      </div>

      {/* ─── Main Content: Stock Opportunities ─ */}
      <div id="dashboard-stock-opportunities" className="grid scroll-mt-24 grid-cols-1 xl:grid-cols-3 gap-6 items-start">

        {/* Stock List: 2/3 Width */}
        <div className="xl:col-span-2 space-y-4">

          {/* Interactive Filter Toolbar */}
          <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-4">
            {/* Header + Search + View Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Stock Opportunities
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {filteredStocks.length} of {effectiveStocks.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Fast Inline Search with Universal 5,055 Database Dropdown */}
                <div ref={searchContainerRef} className="relative w-full sm:w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    aria-label="Search stocks"
                    aria-describedby={dbSearchError ? 'dashboard-search-error' : undefined}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') {
                        setShowDbDropdown(false);
                        setHighlightedIndex(-1);
                      } else if (e.key === 'ArrowDown') {
                        if (showDbDropdown && dbResults.length > 0) {
                          e.preventDefault();
                          setHighlightedIndex(prev => (prev < dbResults.length - 1 ? prev + 1 : 0));
                        }
                      } else if (e.key === 'ArrowUp') {
                        if (showDbDropdown && dbResults.length > 0) {
                          e.preventDefault();
                          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : dbResults.length - 1));
                        }
                      } else if (e.key === 'Enter') {
                        if (showDbDropdown && highlightedIndex >= 0 && highlightedIndex < dbResults.length) {
                          e.preventDefault();
                          const sel = dbResults[highlightedIndex];
                          setSelectedTicker(sel.ticker);
                          setActiveTab('dashboard');
                          setShowDbDropdown(false);
                          setHighlightedIndex(-1);
                        }
                      }
                    }}
                    placeholder="Search all 5,055 stocks (e.g. RELIANCE, TCS, KAYNES)..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  {isDbSearching && (
                    <span role="status" className="absolute right-3.5 top-1/2 -translate-y-1/2">
                      <span className="sr-only">Searching the stock database</span>
                      <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
                    </span>
                  )}

                  {/* Universal Database Floating Results Dropdown */}
                  {showDbDropdown && dbResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700 shadow-2xl overflow-hidden p-2 text-xs font-mono">
                      <div className="flex items-center justify-between px-2 py-1 text-[10px] text-slate-400 font-sans border-b border-slate-100 dark:border-slate-800 mb-1">
                        <span className="flex items-center gap-1 font-bold text-indigo-600 dark:text-indigo-400">
                          <Database className="h-3 w-3" />
                          Full 5,055 Database Matches ({dbResults.length})
                        </span>
                        <button
                          type="button"
                          aria-label="Close database results"
                          onClick={() => setShowDbDropdown(false)}
                          className="hover:text-slate-200 text-slate-400 cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60 overflow-y-auto">
                        {dbResults.map((item, idx) => (
                          <div
                            key={item.ticker}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onClick={() => {
                              setSelectedTicker(item.ticker);
                              setActiveTab('dashboard');
                              setShowDbDropdown(false);
                              setHighlightedIndex(-1);
                            }}
                            className={`flex items-center justify-between p-2 rounded-xl transition-colors gap-2 cursor-pointer ${
                              highlightedIndex === idx
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 ring-1 ring-indigo-500/50'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-white">
                                  {item.ticker}
                                </span>
                                {item.sector && (
                                  <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1 py-0.2 rounded truncate max-w-[100px]">
                                    {item.sector}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate font-sans">
                                {item.name}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                                ₹{item.price ? Number(item.price).toFixed(2) : '—'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  addCustomTicker(item.ticker);
                                  setShowDbDropdown(false);
                                }}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer"
                                title="Add to dashboard live stream"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedTicker(item.ticker);
                                  setActiveTab('dashboard');
                                  setShowDbDropdown(false);
                                }}
                                className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] transition-colors cursor-pointer"
                              >
                                Analyze
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Switcher Toggle */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'cards' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Visual Cards View"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'table' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="Financial Data Table View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('dense')}
                    className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                      viewMode === 'dense' 
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                    title="High-Density Terminal Grid"
                  >
                    <BarChart2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {dbSearchError && (
              <p id="dashboard-search-error" role="status" className="text-xs text-amber-700 dark:text-amber-300">
                Database search is unavailable. Local matches are still shown.{' '}
                <button type="button" onClick={() => setSearchAttempt(attempt => attempt + 1)} className="font-semibold underline">Retry search</button>
              </p>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {[
                { id: 'breakout', label: '🎯 2% Small-Cap Setups (Priority)', icon: Flame },
                { id: 'ai', label: 'Top AI Signals', icon: Sparkles },
                { id: 'post_ipo', label: '2-Yr IPO Equities', icon: Rocket },
                { id: 'max_upside', label: 'Max Return Potential', icon: Target },
                { id: 'high_rr', label: '2.5:1+ Risk:Reward', icon: ShieldCheck },
                { id: 'gainers', label: 'Top Gainers', icon: TrendingUp },
                { id: 'losers', label: 'Pullbacks / Dips', icon: TrendingDown },
                { id: 'volume', label: 'High Volume', icon: Zap },
                { id: 'all', label: 'All Tracked', icon: SlidersHorizontal },
              ].map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    aria-pressed={isActive}
                    onClick={() => {
                      setActiveCategory(cat.id as FilterCategory);
                      if (cat.id === 'max_upside') {
                        setSortBy('upside');
                        setSortOrder('desc');
                      } else if (cat.id === 'post_ipo') {
                        setSortBy('upside');
                        setSortOrder('desc');
                      } else if (cat.id === 'high_rr') {
                        setSortBy('rr');
                        setSortOrder('desc');
                      } else if (cat.id === 'breakout' || cat.id === 'gainers') {
                        setSortBy('changePercent');
                        setSortOrder('desc');
                      } else if (cat.id === 'losers') {
                        setSortBy('changePercent');
                        setSortOrder('asc');
                      } else if (cat.id === 'volume') {
                        setSortBy('volume');
                        setSortOrder('desc');
                      } else {
                        setSortBy('score');
                        setSortOrder('desc');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25 scale-[1.02]'
                        : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/70'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sort Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-medium">
                <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                <span>Sort by:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(['upside', 'rr', 'score', 'ticker', 'changePercent', 'volume'] as const).map(field => {
                  const isSelected = sortBy === field;
                  const label =
                    field === 'upside' ? 'ROI Target %'
                    : field === 'rr' ? 'Risk : Reward'
                    : field === 'score' ? 'AI Score'
                    : field === 'ticker' ? 'Symbol'
                    : field === 'changePercent' ? '% Change'
                    : 'Volume';

                  return (
                    <button
                      key={field}
                      onClick={() => handleSortToggle(field)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{label}</span>
                      {isSelected && (
                        <span className="text-[9px] bg-emerald-200/60 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold uppercase">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stock Display: Cards vs Table */}
          <div id="stocks-display-container">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <StockCardSkeleton key={i} />)}
              </div>
            ) : filteredStocks.length > 0 ? (
              <>
                {viewMode === 'dense' ? (
                  /* ─── Dense Institutional Terminal View ─────────────────── */
                  <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-lg">
                    <table className="w-full text-left border-collapse min-w-[880px]">
                      <thead>
                        <tr className="bg-slate-100/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                          <th className="py-2.5 pl-3 font-bold w-8 text-center">#</th>
                          <th className="py-2.5 font-bold">Symbol / Sector</th>
                          <th className="py-2.5 text-center font-bold">Trend (15D)</th>
                          <th className="py-2.5 text-right font-bold">LTP (₹)</th>
                          <th className="py-2.5 text-right font-bold">Chg %</th>
                          <th className="py-2.5 text-right font-bold text-emerald-500">Target (₹)</th>
                          <th className="py-2.5 text-right font-bold text-teal-400">Stop (₹) / R:R</th>
                          <th className="py-2.5 text-right font-bold text-emerald-400">Est Gain</th>
                          <th className="py-2.5 text-right font-bold">Volume</th>
                          <th className="py-2.5 text-center font-bold">Signal</th>
                          <th className="py-2.5 text-right pr-3 font-bold">Execute</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-900/60 text-xs font-mono">
                        {paginatedStocks.map(({ stock, detailed, returnMetrics }, idx) => {
                          const isUp = stock.change >= 0;
                          const signal = detailed.suggestion;
                          const affordableShares = stock.currentPrice > 0 ? Math.floor(selectedCapital / stock.currentPrice) : 0;
                          const absChg = Math.abs(stock.changePercent);
                          
                          const chgBg = isUp 
                            ? (absChg >= 5 ? 'bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold')
                            : (absChg >= 5 ? 'bg-rose-500/25 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold');

                          return (
                            <tr
                              key={stock.ticker}
                              className="hover:bg-indigo-50/30 dark:hover:bg-slate-900/70 transition-colors group cursor-pointer h-10"
                              onClick={() => {
                                setSelectedTicker(stock.ticker);
                                setActiveTab('dashboard');
                              }}
                            >
                              <td className="py-2 pl-3 text-center text-[10px] text-slate-400 font-mono">
                                {(visiblePage - 1) * pageSize + idx + 1}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                                    {stock.ticker}
                                  </span>
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                                    {returnMetrics.setupType}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[140px] font-sans">
                                  {stock.sector || stock.name}
                                </div>
                              </td>
                              <td className="py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                <MiniSparkline history={stock.history} isUp={isUp} id={`dense-${stock.ticker}`} width={62} height={22} compact />
                              </td>
                              <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                                ₹{stock.currentPrice.toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${chgBg}`}>
                                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </span>
                              </td>
                              <td className="py-2 text-right font-mono">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">₹{returnMetrics.targetPrice.toFixed(2)}</div>
                                <span className="text-[9px] text-emerald-600 dark:text-emerald-400">+{returnMetrics.projectedReturnPercent}%</span>
                              </td>
                              <td className="py-2 text-right font-mono">
                                <div className="text-slate-500 dark:text-slate-400 text-[10px]">₹{returnMetrics.stopLossPrice.toFixed(1)}</div>
                                <span className="text-[9px] text-teal-600 dark:text-teal-400 font-semibold">{returnMetrics.riskRewardRatio}x</span>
                              </td>
                              <td className="py-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                +₹{returnMetrics.expectedGainRupees.toLocaleString('en-IN')}
                                {affordableShares > 0 && <span className="block text-[9px] font-normal text-slate-400">{affordableShares} sh</span>}
                              </td>
                              <td className="py-2 text-right text-slate-500 dark:text-slate-400 text-[11px]">
                                {stock.volume >= 1000000 ? `${(stock.volume / 1000000).toFixed(1)}M` : `${(stock.volume / 1000).toFixed(0)}K`}
                              </td>
                              <td className="py-2 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                  signal === 'BUY' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : signal === 'SELL' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                }`}>
                                  {signal}
                                </span>
                              </td>
                              <td className="py-2 text-right pr-3" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTrade({
                                      ticker: stock.ticker,
                                      name: stock.name,
                                      currentPrice: stock.currentPrice,
                                      targetPct: returnMetrics.projectedReturnPercent,
                                      stopLossPct: Math.abs(((stock.currentPrice - returnMetrics.stopLossPrice) / stock.currentPrice) * 100) || 1.5,
                                    })}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all flex items-center gap-0.5 shadow-xs cursor-pointer active:scale-95"
                                    title={`Open price scenario for ${stock.ticker}`}
                                  >
                                    <Zap className="h-2.5 w-2.5" />
                                    <span>Buy</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTicker(stock.ticker);
                                      setActiveTab('dashboard');
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-400 transition-colors"
                                    title="Analyze"
                                  >
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : viewMode === 'table' ? (
                  /* ─── Financial Data Table View ─────────────────── */
                  <div className="overflow-x-auto rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[760px]">
                      <thead>
                        <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 pl-4 font-bold">Ticker &amp; Setup</th>
                          <th className="py-3.5 text-center font-bold">Trend (15D)</th>
                          <th className="py-3.5 text-right font-bold">Live Price</th>
                          <th className="py-3.5 text-right font-bold">1D Change</th>
                          <th className="py-3.5 text-right font-bold text-emerald-500">Target &amp; ROI</th>
                          <th className="py-3.5 text-right font-bold">Stop &amp; R:R</th>
                          <th className="py-3.5 text-right font-bold text-emerald-400">Est. Gain &amp; Sizing</th>
                          <th className="py-3.5 text-right font-bold">Volume</th>
                          <th className="py-3.5 text-center font-bold">Verdict</th>
                          <th className="py-3.5 text-right pr-4 font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/60 text-xs font-mono">
                        {paginatedStocks.map(({ stock, detailed, returnMetrics }) => {
                          const isUp = stock.change >= 0;
                          const isWatchlisted = watchlist.includes(stock.ticker);
                          const signal = detailed.suggestion;
                          const affordableShares = stock.currentPrice > 0 ? Math.floor(selectedCapital / stock.currentPrice) : 0;
                          const allocatedCapital = affordableShares * stock.currentPrice;
                          const signalBadge =
                            signal === 'BUY'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                              : signal === 'SELL'
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';

                          return (
                            <tr 
                              key={stock.ticker}
                              className="hover:bg-emerald-50/20 dark:hover:bg-emerald-950/15 transition-colors group cursor-pointer"
                              onClick={() => {
                                setSelectedTicker(stock.ticker);
                                setActiveTab('dashboard');
                              }}
                            >
                              {/* Ticker & Company */}
                              <td className="py-3.5 pl-4">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-500 transition-colors">
                                    {stock.ticker}
                                  </span>
                                  <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-mono font-bold">
                                    {returnMetrics.setupType}
                                  </span>
                                </div>
                                <span className="block text-[10px] text-slate-400 truncate max-w-[160px] font-sans mt-0.5" title={stock.name}>
                                  {stock.name}
                                </span>
                              </td>

                              {/* Trend Mini-Sparkline */}
                              <td className="py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                                <MiniSparkline history={stock.history} isUp={isUp} id={`tbl-${stock.ticker}`} width={64} height={22} compact />
                              </td>

                              {/* Live Price */}
                              <td className="py-3.5 text-right font-bold text-slate-900 dark:text-slate-100">
                                ₹{stock.currentPrice.toFixed(2)}
                              </td>

                              {/* 1D Change */}
                              <td className="py-3.5 text-right font-bold">
                                <span className={`inline-flex items-center gap-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                  {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </span>
                              </td>

                              {/* Target & ROI */}
                              <td className="py-3.5 text-right font-mono">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{returnMetrics.targetPrice.toFixed(2)}
                                </div>
                                <span className="inline-block text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 px-1.5 py-0.2 rounded border border-emerald-500/30">
                                  +{returnMetrics.projectedReturnPercent}%
                                </span>
                              </td>

                              {/* Stop & R:R */}
                              <td className="py-3.5 text-right font-mono">
                                <div className="text-slate-600 dark:text-slate-300 text-[11px]">
                                  ₹{returnMetrics.stopLossPrice.toFixed(2)}
                                </div>
                                <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">
                                  {returnMetrics.riskRewardRatio}x R:R
                                </span>
                              </td>

                              {/* Est. Return */}
                              <td className="py-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                +₹{returnMetrics.expectedGainRupees.toLocaleString('en-IN')}
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">
                                  {affordableShares > 0 ? `${affordableShares} sh · ₹${allocatedCapital.toLocaleString('en-IN')}` : '—'}
                                </span>
                              </td>

                              {/* Volume */}
                              <td className="py-3.5 text-right text-slate-500 dark:text-slate-400">
                                {stock.volume >= 1000000 
                                  ? `${(stock.volume / 1000000).toFixed(2)}M` 
                                  : `${(stock.volume / 1000).toFixed(0)}K`}
                              </td>

                              {/* Verdict & Score */}
                              <td className="py-3.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${signalBadge}`}>
                                  {signal}
                                </span>
                                <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                                  {detailed.score}/100
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 text-right pr-4 font-sans" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickTrade({
                                      ticker: stock.ticker,
                                      name: stock.name,
                                      currentPrice: stock.currentPrice,
                                      targetPct: returnMetrics.projectedReturnPercent,
                                      stopLossPct: Math.abs(((stock.currentPrice - returnMetrics.stopLossPrice) / stock.currentPrice) * 100) || 1.5,
                                    })}
                                    className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all flex items-center gap-1 shadow-xs cursor-pointer active:scale-95"
                                    title={`Open price scenario for ${stock.ticker}`}
                                  >
                                    <Zap className="h-3 w-3" />
                                    <span>Trade</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleWatchlist(stock.ticker)}
                                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                      isWatchlisted
                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 text-amber-500'
                                        : 'text-slate-400 hover:text-amber-500 border-slate-200 dark:border-slate-700'
                                    }`}
                                    title="Toggle watchlist"
                                  >
                                    <Star className={`h-3.5 w-3.5 ${isWatchlisted ? 'fill-current' : ''}`} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTicker(stock.ticker);
                                      setActiveTab('dashboard');
                                    }}
                                    className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-lg transition-colors cursor-pointer"
                                    title="Inspect stock analysis"
                                  >
                                    <ArrowUpRight className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* ─── Compact Visual Cards View ──────────────────────────── */
                  <div className="space-y-2">
                    {paginatedStocks.map((item) => {
                      const { stock, detailed, returnMetrics } = item;
                      const isUp = stock.change >= 0;
                      const isWatchlisted = watchlist.includes(stock.ticker);
                      const signal = detailed.suggestion;

                      // RVOL (Relative Volume vs benchmark)
                      const rvol = stock.volume > 0 && maxVolume > 0 
                        ? Number(((stock.volume / (maxVolume * 0.15)) + 0.6).toFixed(1)) 
                        : 1.0;

                      // Market Cap Tier
                      const mcap = stock.marketCap || 1000;
                      const tierLabel = mcap >= 20000 ? 'LARGE' : mcap >= 5000 ? 'MID' : 'SMALL';
                      const tierBadge = mcap >= 20000 
                        ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20' 
                        : mcap >= 5000 
                        ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20' 
                        : 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20';

                      const signalColor =
                        signal === 'BUY' ? 'bg-emerald-500'
                        : signal === 'SELL' ? 'bg-rose-500'
                        : 'bg-amber-400';

                      const signalBadge =
                        signal === 'BUY'
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                          : signal === 'SELL'
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60';

                      return (
                        <div
                          key={stock.ticker}
                          className="group relative bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 hover:border-emerald-500/50 dark:hover:border-emerald-500/40 rounded-2xl p-3 sm:p-3.5 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                        >
                          {/* Signal Color Left Bar */}
                          <div className={`absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full ${signalColor} opacity-80`} />

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pl-1.5">
                            {/* Stock Info: Ticker, Badges, Name */}
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <button
                                    onClick={() => {
                                      setSelectedTicker(stock.ticker);
                                      setActiveTab('dashboard');
                                    }}
                                    className="text-sm sm:text-base font-black font-mono tracking-tight text-slate-900 dark:text-white hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors cursor-pointer"
                                  >
                                    {stock.ticker}
                                  </button>
                                  <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase border ${signalBadge}`}>
                                    {signal}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                    {returnMetrics.setupType}
                                  </span>
                                  <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${tierBadge}`}>
                                    {tierLabel}
                                  </span>
                                  {rvol >= 1.2 && (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                                      <Flame className="h-2.5 w-2.5 text-amber-500" />
                                      <span>{rvol}x</span>
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium max-w-[200px] sm:max-w-[260px]" title={stock.name}>
                                  {stock.name} {stock.sector ? `· ${stock.sector}` : ''}
                                </p>
                              </div>
                            </div>

                            {/* Center: Sparkline & Key AI Prediction Metrics */}
                            <div className="flex items-center gap-3.5 flex-wrap sm:flex-nowrap">
                              <div className="hidden lg:block shrink-0">
                                <MiniSparkline history={stock.history} isUp={isUp} id={stock.ticker} width={64} height={20} />
                              </div>

                              <div className="font-mono text-left md:text-right">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <span className="text-[10px] uppercase text-slate-400 font-semibold">Target</span>
                                  <span className="font-bold text-slate-900 dark:text-white">₹{returnMetrics.targetPrice.toFixed(2)}</span>
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    <ArrowUpRight className="h-2.5 w-2.5" />
                                    +{returnMetrics.projectedReturnPercent}%
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                  <span>SL: ₹{returnMetrics.stopLossPrice.toFixed(1)}</span>
                                  <span>·</span>
                                  <span className="text-teal-600 dark:text-teal-400 font-semibold">{returnMetrics.riskRewardRatio}x R:R</span>
                                  <span>·</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                                    <Sparkles className="h-2.5 w-2.5" />
                                    {detailed.score}% AI
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Current Price & Actions */}
                            <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                              <div className="text-left md:text-right">
                                <div className="text-sm sm:text-base font-black font-mono text-slate-900 dark:text-white">
                                  ₹{stock.currentPrice.toFixed(2)}
                                </div>
                                <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold font-mono ${
                                  isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                }`}>
                                  {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => toggleWatchlist(stock.ticker)}
                                  aria-label={`Toggle ${stock.ticker} in watchlist`}
                                  className={`p-1.5 rounded-xl border transition-all cursor-pointer active:scale-90 ${
                                    isWatchlisted
                                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-500'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500'
                                  }`}
                                >
                                  <Star className={`h-3.5 w-3.5 ${isWatchlisted ? 'fill-current' : ''}`} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickTrade({
                                      ticker: stock.ticker,
                                      name: stock.name,
                                      currentPrice: stock.currentPrice,
                                      targetPct: returnMetrics.projectedReturnPercent,
                                      stopLossPct: Math.abs(((stock.currentPrice - returnMetrics.stopLossPrice) / stock.currentPrice) * 100) || 1.5,
                                    });
                                  }}
                                  className="flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xs transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                                  title="Instant 1-Click Order Execution"
                                >
                                  <Zap className="h-3 w-3" />
                                  <span>Trade</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ─── Pagination Toolbar ─────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 px-1 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <span>
                      Showing <strong className="text-slate-800 dark:text-slate-200">{filteredStocks.length === 0 ? 0 : (visiblePage - 1) * pageSize + 1}</strong> to <strong className="text-slate-800 dark:text-slate-200">{Math.min(visiblePage * pageSize, filteredStocks.length)}</strong> of <strong className="text-slate-800 dark:text-slate-200">{filteredStocks.length}</strong> active equities ({effectiveStocks.length} Master Universe)
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <Link href={axionAppPath("/database")} className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold">
                      <Database className="h-3 w-3" />
                      Browse 5,055 Database
                    </Link>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Page Size Options */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                      {[25, 50, 9999].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setPageSize(size);
                            setCurrentPage(1);
                          }}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                            pageSize === size
                              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {size === 9999 ? 'All' : size}
                        </button>
                      ))}
                    </div>

                    {/* Page Navigation */}
                    {totalPages > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label="Previous page"
                          disabled={visiblePage === 1}
                          onClick={() => setCurrentPage(Math.max(1, visiblePage - 1))}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="font-mono text-[11px] px-2">
                          {visiblePage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          aria-label="Next page"
                          disabled={visiblePage >= totalPages}
                          onClick={() => setCurrentPage(Math.min(totalPages, visiblePage + 1))}
                          className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* ─── Rich Empty State with Full Database Search Results ─── */
              <div className="rounded-3xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800/80 p-8 text-center space-y-4 backdrop-blur-xl">
                <Search className="h-9 w-9 text-slate-400 mx-auto opacity-50" />
                <div>
                  <p className="text-base font-black text-slate-800 dark:text-slate-200">
                    No active stream matches for &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                    The active live stream tracks high-activity securities. You can search, add, or analyze any of the 5,055 listed Indian equities below:
                  </p>
                </div>

                {/* If full database search returned matches */}
                {dbResults.length > 0 ? (
                  <div className="pt-2 max-w-xl mx-auto space-y-2 text-left">
                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
                      <span className="flex items-center gap-1 font-bold text-indigo-500">
                        <Database className="h-3.5 w-3.5" />
                        Found in Full 5,055 Stock Database:
                      </span>
                      <span>{dbResults.length} matches</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dbResults.map(item => (
                        <div
                          key={item.ticker}
                          className="p-3 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-col justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="font-bold font-mono text-slate-900 dark:text-white">
                                {item.ticker}
                              </span>
                              <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-200">
                                ₹{item.price ? Number(item.price).toFixed(2) : '—'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {item.name}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-700/60">
                            <button
                              type="button"
                              onClick={() => {
                                addCustomTicker(item.ticker);
                                setSearchQuery('');
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold transition-colors text-center cursor-pointer"
                            >
                              + Add to Feed
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicker(item.ticker);
                                setActiveTab('dashboard');
                              }}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-colors text-center cursor-pointer"
                            >
                              Analyze
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  searchQuery.trim() && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const cleanTicker = searchQuery.trim().toUpperCase().replace(/\.NS$/, '');
                          setSelectedTicker(cleanTicker);
                          setActiveTab('dashboard');
                        }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] cursor-pointer"
                      >
                        <Zap className="h-4 w-4 text-amber-300" />
                        <span>Launch Technical Analysis for &ldquo;{searchQuery.toUpperCase()}&rdquo; →</span>
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* ─── Quick Insights Panel (fills empty space when few stocks in feed) ─ */}
          {filteredStocks.length < 15 && !searchQuery.trim() && (
            <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-4 animate-fade-up">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                    <Zap className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-tight">Quick Insights</h3>
                    <p className="text-[11px] text-slate-400">From your active feed of {stocks.length} equities</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60">
                  {stocks.length} tracked
                </span>
              </div>

              {/* Top Projected Return Opportunities */}
              <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/30 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-700 dark:text-emerald-300 font-mono">
                    <Target className="h-4 w-4 text-emerald-500" />
                    <span>Top Return Setups in Feed</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Highest Target ROI
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[...scoredStocks]
                    .sort((a,b) => b.returnMetrics.projectedReturnPercent - a.returnMetrics.projectedReturnPercent)
                    .slice(0, 3)
                    .map(({ stock, returnMetrics }) => (
                      <button
                        key={stock.ticker}
                        type="button"
                        onClick={() => { setSelectedTicker(stock.ticker); setActiveTab('dashboard'); }}
                        className="p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold font-mono text-xs text-slate-900 dark:text-white group-hover:text-emerald-400 transition-colors">{stock.ticker}</span>
                          <span className="text-xs font-black font-mono text-emerald-500">+{returnMetrics.projectedReturnPercent}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1">
                          <span>CMP ₹{stock.currentPrice.toFixed(1)}</span>
                          <span className="text-emerald-400 font-bold">Target ₹{returnMetrics.targetPrice.toFixed(1)}</span>
                        </div>
                        <div className="text-[9px] font-mono text-teal-400 mt-0.5">
                          {returnMetrics.riskRewardRatio}x R:R · Est. +₹{returnMetrics.expectedGainRupees.toLocaleString('en-IN')}
                        </div>
                      </button>
                    ))
                  }
                </div>
              </div>

              {/* Top Gainers vs Losers Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">Top Gainer</span>
                  </div>
                  {(() => {
                    const top = [...scoredStocks].sort((a,b) => b.stock.changePercent - a.stock.changePercent)[0];
                    return top ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedTicker(top.stock.ticker); setActiveTab('dashboard'); }}
                        className="text-left w-full"
                      >
                        <div className="font-black font-mono text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{top.stock.ticker}</div>
                        <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono">+{top.stock.changePercent.toFixed(2)}%</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{top.stock.name}</div>
                      </button>
                    ) : <span className="text-xs text-slate-400">—</span>;
                  })()}
                </div>

                <div className="rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">Top Loser</span>
                  </div>
                  {(() => {
                    const bot = [...scoredStocks].sort((a,b) => a.stock.changePercent - b.stock.changePercent)[0];
                    return bot ? (
                      <button
                        type="button"
                        onClick={() => { setSelectedTicker(bot.stock.ticker); setActiveTab('dashboard'); }}
                        className="text-left w-full"
                      >
                        <div className="font-black font-mono text-sm text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{bot.stock.ticker}</div>
                        <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono">{bot.stock.changePercent.toFixed(2)}%</div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5">{bot.stock.name}</div>
                      </button>
                    ) : <span className="text-xs text-slate-400">—</span>;
                  })()}
                </div>
              </div>

              {/* Volume Leaders */}
              {scoredStocks.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <BarChart2 className="h-3 w-3" /> Volume Leaders
                  </p>
                  <div className="space-y-1.5">
                    {[...scoredStocks]
                      .sort((a,b) => b.stock.volume - a.stock.volume)
                      .slice(0, 3)
                      .map(({ stock }) => (
                        <button
                          key={stock.ticker}
                          type="button"
                          onClick={() => { setSelectedTicker(stock.ticker); setActiveTab('dashboard'); }}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{stock.ticker}</span>
                            <span className="text-[10px] text-slate-400 truncate hidden sm:block">{stock.name}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-slate-500">
                              {stock.volume >= 1000000 ? `${(stock.volume/1000000).toFixed(1)}M` : `${(stock.volume/1000).toFixed(0)}K`}
                            </span>
                            <span className={`text-[10px] font-bold font-mono ${stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </div>
                        </button>
                      ))
                    }
                  </div>
                </div>
              )}

              {/* Add more stocks prompt */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Expand your radar</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Search any of 5,055 NSE/BSE stocks to add to your live feed</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const inputEl = document.querySelector<HTMLInputElement>('#dashboard-screen-container input[type="text"]');
                    if (inputEl) { inputEl.focus(); inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  Search Stocks
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Market Radar & Sector Heatmap: 1/3 Width */}
        <div className="space-y-6">
          <DashboardMarketRadar />
          <DashboardMoodWidget />
        </div>
      </div>

      {/* ─── 5-Minute Momentum Radar & 2% Small-Cap Prediction Dock ── */}
      <MomentumRadarBanner />

      {/* ─── AI Research Spotlight ─────────────────────────────── */}
      <div
        id="ai-research-spotlight"
        className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800/90 bg-gradient-to-br from-white dark:from-slate-950 via-slate-50 dark:via-slate-900 to-indigo-50 dark:to-slate-950 shadow-2xl shadow-indigo-950/20 p-6 sm:p-7 animate-fade-up"
      >
        {/* Ambient background orbs */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

        <div className="relative z-10">
          {/* Spotlight Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3.5">
              <span className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30 shrink-0">
                <Cpu className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    Model Research Radar
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono uppercase bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Experimental setups
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Model-ranked candidates with illustrative technical levels. Scores are rankings, not calibrated probabilities of profit.
                </p>
              </div>
            </div>

            <Link
              href={axionAppPath("/stock-ai")}
              id="btn-goto-stockai-hub"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-700 dark:text-indigo-200 border border-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shrink-0 self-start sm:self-center"
            >
              <span>Terminal Hub</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {/* AI Pick Cards Grid */}
          {aiLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-3xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 p-5 animate-pulse space-y-3">
                  <div className="h-4 w-20 bg-white dark:bg-slate-700 rounded" />
                  <div className="h-8 w-8 bg-white dark:bg-slate-700 rounded-full" />
                  <div className="h-4 w-24 bg-white dark:bg-slate-700 rounded" />
                </div>
              ))}
            </div>
          ) : aiPicks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {aiPicks.map((pick, i) => {
                const tickerRaw = pick.Ticker.replace('.NS', '');
                const matched = scoredStocks.find(s => s.stock.ticker === tickerRaw);
                const rawScore = pick['Model Score'] ?? (matched?.detailed ? matched.detailed.score / 100 : null);
                const scoreNum = typeof rawScore === 'number' && Number.isFinite(rawScore) ? rawScore : null;
                const closeNum = pick.Close_Numeric ||
                  parseFloat((pick['Close (Rs.)'] || '').replace(/[^0-9.]/g, '')) || matched?.stock.currentPrice || 0;
                const retMetrics = matched?.returnMetrics || calculateReturnMetrics({ currentPrice: closeNum }, null, selectedCapital);
                const target = retMetrics.targetPrice.toFixed(2);
                const upsidePct = retMetrics.projectedReturnPercent;

                return (
                  <div
                    key={pick.Ticker}
                    onClick={() => {
                      setSelectedTicker(tickerRaw);
                      setActiveTab('dashboard');
                    }}
                    className="group relative bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/60 rounded-3xl p-5 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1.5 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black font-mono text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
                            {tickerRaw}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30">
                            {retMetrics.setupType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                          CMP ₹{closeNum ? closeNum.toFixed(2) : '—'}
                        </div>
                      </div>
                      <div className="transition-transform duration-300 group-hover:scale-110">
                        {scoreNum === null ? <span className="text-[10px] text-slate-600 dark:text-slate-400">Score unavailable</span> : <ScoreRing score={scoreNum} />}
                      </div>
                    </div>

                    {/* Target & Upside */}
                    <div className="space-y-1.5 mb-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Scenario target</span>
                        <span className="text-xs font-mono font-black text-slate-900 dark:text-white">₹{target}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Target ROI</span>
                        <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                          <ArrowUpRight className="h-3 w-3" />
                          +{upsidePct}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-800/60">
                        <span>SL: ₹{retMetrics.stopLossPrice.toFixed(1)}</span>
                        <span className="text-teal-700 dark:text-teal-400 font-bold">{retMetrics.riskRewardRatio}x R:R</span>
                      </div>
                    </div>

                    {/* Est. Rupee Return */}
                    <div className="flex items-center justify-between text-[11px] font-mono px-1 text-emerald-700 dark:text-emerald-300/90 mb-2">
                      <span className="text-[10px] text-slate-600 dark:text-slate-400">Scenario gain:</span>
                      <span className="font-bold">+₹{retMetrics.expectedGainRupees.toLocaleString('en-IN')}</span>
                    </div>

                    {/* Factor tag */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed flex items-start gap-1.5">
                        <Zap className="h-3 w-3 text-amber-700 dark:text-amber-400 shrink-0" />
                        <span>{pick['Key SHAP Driver'] || 'Model driver unavailable. Inspect dated stock evidence before making a plan.'}</span>
                      </p>
                    </div>

                    {/* Hover Glow Edge */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-emerald-500/0 group-hover:from-emerald-500/10 to-transparent pointer-events-none transition-all duration-300" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-6 text-slate-600 dark:text-slate-400 text-sm">
              <Sparkles className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
              <span>No AI picks available. <Link href={axionAppPath("/stock-ai")} className="text-indigo-700 dark:text-indigo-400 hover:underline">Check model status →</Link></span>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2-Year Post-IPO Breakout Radar Spotlight ──────────── */}
      <div
        id="post-ipo-radar-spotlight"
        className="relative rounded-3xl overflow-hidden border border-indigo-500/30 bg-gradient-to-br from-white dark:from-slate-950 via-slate-50 dark:via-slate-900 to-indigo-50/80 dark:to-indigo-950/80 shadow-2xl shadow-indigo-950/30 p-6 sm:p-7 animate-fade-up"
      >
        {/* Ambient glow */}
        <div className="absolute top-0 right-10 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3.5">
              <span className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 shrink-0">
                <Rocket className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white font-mono">
                    2-Year Post-IPO Breakout Radar
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono uppercase bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Anchor Unlock Microstructure
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  Calibrated predictive models for 2023–2024 listed equities tracking Listing-Day Highs, flipper washout, and 30D/90D unlocks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('post_ipo');
                  const el = document.getElementById('stocks-display-container');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="px-3.5 py-2 rounded-2xl text-xs font-bold bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
              >
                Filter Feed ({postIpoPicks.length})
              </button>
              <Link
                href={axionAppPath("/post-ipo")}
                id="btn-goto-post-ipo-lab"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border border-indigo-400/30 shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Launch Prediction Lab</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Cards Grid */}
          {postIpoLoading && postIpoPicks.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-3xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 p-5 animate-pulse space-y-3">
                  <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-700 rounded-md" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-md" />
                </div>
              ))}
            </div>
          ) : postIpoPicks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {postIpoPicks.map((candidate) => {
                const tickerRaw = candidate.ticker || (candidate.symbol || '').replace('.NS', '');
                const matched = scoredStocks.find(s => s.stock.ticker === tickerRaw);
                const cmp = candidate.currentPrice || matched?.stock.currentPrice || candidate.listingPrice || 0;
                const target1 = candidate.target1 || (cmp * 1.35);
                const upsidePct = candidate.expectedUpsidePct || Math.round(((target1 - cmp) / (cmp || 1)) * 100);
                const lockinStatus = candidate.anchorLockinStatus || 'ABSORBED_STRONG';
                const lockBadge =
                  lockinStatus === 'ABSORBED_STRONG'
                    ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                    : lockinStatus === 'PENDING_30D'
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30'
                    : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';

                return (
                  <div
                    key={tickerRaw}
                    onClick={() => {
                      setSelectedTicker(tickerRaw);
                      setActiveTab('dashboard');
                    }}
                    className="group relative bg-white dark:bg-slate-900/90 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/60 rounded-3xl p-5 transition-all duration-300 cursor-pointer hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1.5 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base font-black font-mono text-slate-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors">
                            {tickerRaw}
                          </span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/30">
                            IPO {candidate.ipoYear || 2024}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[170px] mt-0.5 font-sans">
                          {candidate.companyName || candidate.sector}
                        </p>
                      </div>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase border shrink-0 ${lockBadge}`}>
                        {lockinStatus.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {/* Target & Price Box */}
                    <div className="space-y-1.5 mb-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-2.5 border border-slate-200 dark:border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">CMP</span>
                        <span className="text-xs font-mono font-black text-slate-900 dark:text-white">₹{cmp.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Stage-1 Target</span>
                        <span className="text-xs font-mono font-black text-indigo-700 dark:text-indigo-300">₹{target1.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800/60">
                        <span className="text-[10px] font-mono uppercase text-slate-600 dark:text-slate-400 font-bold">Projected ROI</span>
                        <span className="text-xs font-mono font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5">
                          <ArrowUpRight className="h-3 w-3" />
                          +{upsidePct}%
                        </span>
                      </div>
                    </div>

                    {/* Footer Setup Info */}
                    <div className="flex items-center justify-between text-[11px] font-mono pt-2 border-t border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400">
                      <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold">
                        {candidate.breakoutStatus ? candidate.breakoutStatus.replace(/_/g, ' ') : 'Near Pivot Base'}
                      </span>
                      <Link
                        href={`${axionAppPath("/post-ipo")}?ticker=${tickerRaw}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-indigo-700 dark:text-indigo-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-0.5 hover:underline"
                      >
                        Predict <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>

                    {/* Glow edge */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/0 group-hover:from-indigo-500/10 to-transparent pointer-events-none transition-all duration-300" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 text-slate-600 dark:text-slate-400 text-sm">
              <Rocket className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>No post-IPO candidates loaded. <Link href={axionAppPath("/post-ipo")} className="text-indigo-600 dark:text-indigo-400 hover:underline">Open Lab →</Link></span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Return & Alpha Maximizer Banner ── */}
      <ReturnAlphaBanner
        scoredStocks={scoredStocks.filter(({ stock }) => isProviderStock(stock) && stock.history.length >= 21)}
        selectedCapital={selectedCapital}
        onCapitalChange={setSelectedCapital}
        activeCategory={activeCategory}
        onSelectCategory={setActiveCategory}
        onSelectTicker={(ticker: string) => {
          setSelectedTicker(ticker);
          setActiveTab('dashboard');
        }}
      />

      <WholeMarketForecast />
      <ResearchWorkflowStatus />

      <details id="dashboard-market-context" className="workspace-context scroll-mt-24">
        <summary><div><h2 className="text-sm font-semibold">Market context</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Outlook, benchmark charts, breadth and macro indicators</p></div><ChevronRight size={18} className="shrink-0 text-slate-400 transition-transform" /></summary>
        <div className="workspace-context-content space-y-4">
          <IndexBanner />
          <MarketStatsBar customStocks={effectiveStocks} />
          <NseSmartMoneyWidget selectedTicker={selectedTicker} onSelectTicker={(t) => setSelectedTicker(t)} />
          <MarketBenchmarkChart />
          <MacroFlowBar />
          <MarketBreadthRadar />
        </div>
      </details>

      {/* Institutional 1-Click Quick Trade Modal */}
      {quickTradeStock && (
        <QuickTradeModal
          isOpen={!!quickTradeStock}
          onClose={() => setQuickTradeStock(null)}
          ticker={quickTradeStock.ticker}
          name={quickTradeStock.name}
          currentPrice={quickTradeStock.currentPrice}
          initialTargetPct={quickTradeStock.targetPct ?? 2.0}
          initialStopLossPct={quickTradeStock.stopLossPct ?? 1.0}
        />
      )}

    </div>
  );
}
