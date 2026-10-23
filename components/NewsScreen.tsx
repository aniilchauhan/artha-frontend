'use client';

import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Newspaper, Search, TrendingUp, TrendingDown, Minus,
  Zap, Filter, RefreshCw, ExternalLink, ChevronRight,
  Radio, Globe, BarChart3, AlertTriangle, Clock,
  Tag, Building2, Flame, Shield, X, ArrowRight,
  Columns, LayoutGrid, Volume2, VolumeX, Play, Pause,
  Sparkles, CheckCircle2, ArrowUpRight, Award, Rocket, Coins
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { playTargetChime, playStopLossChime } from '../lib/sound-notifications';
import QuickTradeModal from './QuickTradeModal';

// ─── Types ─────────────────────────────────────────────────────────────────
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  time: string;
  ticker?: string;
  sector?: string;
  technicalContext: string;
  sourceLink?: string;
  sentimentScore?: number;
  priceImpactEst?: string;
  category?: string;
}

interface NewsScan {
  universeCount: number;
  scannedCount: number;
  totalBatches: number;
  failedBatches: number;
  partial: boolean;
  timedOut: boolean;
  elapsedMs: number;
}

const SECTORS = ['All', 'Technology', 'Financials', 'Energy', 'Consumer Cyclical', 'Pharmaceuticals', 'Auto', 'Metals'];
const SENTIMENTS = ['All', 'bullish', 'bearish', 'neutral'] as const;
const IMPACTS = ['All', 'high', 'medium', 'low'] as const;

export const NEWS_CATEGORIES = [
  { id: 'all', label: 'All Wire', icon: Newspaper, color: 'text-indigo-400' },
  { id: 'ipo', label: 'IPO Whispers & GMP', icon: Rocket, color: 'text-emerald-400' },
  { id: 'earnings', label: 'Earnings & Q3/Q4 Beats', icon: BarChart3, color: 'text-sky-400' },
  { id: 'macro', label: 'RBI & Macro Policy', icon: Building2, color: 'text-amber-400' },
  { id: 'smallcap', label: 'Small-Cap Breakouts', icon: Sparkles, color: 'text-purple-400' },
  { id: 'high_impact', label: 'High Impact Breaks', icon: Flame, color: 'text-rose-400' },
] as const;

export type NewsCategoryType = typeof NEWS_CATEGORIES[number]['id'];

const MARKET_TICKERS = [
  { ticker: 'RELIANCE', name: 'Reliance' },
  { ticker: 'TCS', name: 'TCS' },
  { ticker: 'HDFCBANK', name: 'HDFC Bank' },
  { ticker: 'INFY', name: 'Infosys' },
  { ticker: 'ICICIBANK', name: 'ICICI Bank' },
  { ticker: 'TATAMOTORS', name: 'Tata Motors' },
  { ticker: 'ITC', name: 'ITC' },
  { ticker: 'SBIN', name: 'SBI' },
  { ticker: 'WIPRO', name: 'Wipro' },
  { ticker: 'BHARTIARTL', name: 'Airtel' },
  { ticker: 'BAJAJHFL', name: 'Bajaj HFL' },
  { ticker: 'ZOMATO', name: 'Zomato' },
];

const SECTOR_NEWS_QUERIES: Record<string, { ticker?: string; sector?: string }> = {
  Technology: { sector: 'Technology' },
  Financials: { sector: 'Financials' },
  Energy: { sector: 'Energy' },
  'Consumer Cyclical': { sector: 'Consumer Cyclical' },
  Pharmaceuticals: { sector: 'Healthcare' },
  Auto: { sector: 'Auto' },
  Metals: { sector: 'Metals' },
};

// ─── Sentiment Config ───────────────────────────────────────────────────────
const SENTIMENT_CONFIG = {
  bullish: {
    icon: TrendingUp,
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    text: 'text-emerald-500',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    label: 'Bullish',
    glow: 'shadow-emerald-500/10',
  },
  bearish: {
    icon: TrendingDown,
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
    text: 'text-rose-500',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    label: 'Bearish',
    glow: 'shadow-rose-500/10',
  },
  neutral: {
    icon: Minus,
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-500',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    label: 'Neutral',
    glow: 'shadow-amber-500/10',
  },
};

const IMPACT_CONFIG = {
  high: { label: 'High Impact', color: 'text-rose-400', icon: Flame },
  medium: { label: 'Medium Impact', color: 'text-amber-400', icon: Zap },
  low: { label: 'Low Impact', color: 'text-gray-400', icon: Shield },
};

// ─── Live Ticker Strip ──────────────────────────────────────────────────────
function LiveTickerStrip() {
  const items = [
    '🟢 NIFTY 50 +0.82%', '🔴 SENSEX -0.14%', '🟢 BANK NIFTY +1.23%',
    '🟢 RELIANCE +1.4%', '🔴 TCS -0.6%', '🟢 HDFCBANK +0.9%',
    '🔴 INFY -0.3%', '🟢 ITC +0.7%', '🟢 SBIN +2.1%', '🔴 WIPRO -0.8%',
    '🟢 ADANI ENT +1.5%', '🔴 BAJFINANCE -0.4%', '🟢 TATA MOTORS +2.4%',
    '🚀 PREMIER ENERGIES +120% LISTING', '⚡ SWIGGY IPO GMP +28%'
  ];
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md py-2.5 shadow-md">
      <div className="flex animate-marquee gap-8 whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="text-xs font-mono font-bold text-slate-300">{item}</span>
        ))}
      </div>
    </div>
  );
}

// ─── NewsCard for Grid View ────────────────────────────────────────────────
function NewsCard({
  item,
  expanded,
  onToggle,
  onTrade,
  onInspect,
}: {
  item: NewsItem;
  expanded: boolean;
  onToggle: () => void;
  onTrade: (ticker: string) => void;
  onInspect: (ticker: string) => void;
}) {
  const sc = SENTIMENT_CONFIG[item.sentiment];
  const ic = IMPACT_CONFIG[item.impact];
  const SentIcon = sc.icon;
  const ImpactIcon = ic.icon;
  const score = item.sentimentScore ?? (item.sentiment === 'bullish' ? 75 : item.sentiment === 'bearish' ? -65 : 0);
  const priceMove = item.priceImpactEst || (item.sentiment === 'bullish' ? '+2.5% to +5.0% Upside' : item.sentiment === 'bearish' ? '-2.5% to -5.0% Risk' : '±0.5% Neutral');

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-xl group flex flex-col justify-between ${
        expanded ? 'border-indigo-500/40 ring-1 ring-indigo-500/20' : 'border-slate-200/80 dark:border-slate-800/80'
      }`}
    >
      {/* Sentiment gradient top bar */}
      <div className={`h-1.5 w-full ${
        item.sentiment === 'bullish' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
        : item.sentiment === 'bearish' ? 'bg-gradient-to-r from-rose-500 to-pink-400' 
        : 'bg-gradient-to-r from-amber-400 to-yellow-300'
      }`} />

      {/* Ambient Sentiment Glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500 ${
        item.sentiment === 'bullish' ? 'bg-emerald-500/10' : item.sentiment === 'bearish' ? 'bg-rose-500/10' : 'bg-amber-500/10'
      }`} />

      <div className="p-5 relative z-10 flex flex-col justify-between flex-1">
        <div>
          {/* Top Row: Sentiment, Impact, Score, Ticker */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`h-9 w-9 rounded-2xl ${sc.bg} border ${sc.border} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}>
              <SentIcon className={`h-4 w-4 ${sc.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${sc.badge}`}>
                  {sc.label} ({score > 0 ? `+${score}` : score})
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-bold ${ic.color}`}>
                  <ImpactIcon className="h-3 w-3" />{ic.label}
                </span>
                {item.ticker && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {item.ticker}
                  </span>
                )}
                {item.sector && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-400 border border-slate-200/50 dark:border-slate-800/60">
                    {item.sector}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {item.title}
              </h3>
            </div>
          </div>

          {/* Expected Price Impact Pill */}
          <div className="mb-2.5 flex items-center gap-2">
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
              item.sentiment === 'bullish' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                : item.sentiment === 'bearish'
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
            }`}>
              ⚡ {priceMove}
            </span>
          </div>

          {/* Executive Summary Briefing */}
          <p className={`text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3.5 ${expanded ? '' : 'line-clamp-2'}`}>
            {item.content}
          </p>

          {/* Technical Context (expanded) */}
          {expanded && item.technicalContext && (
            <div className="mb-3.5 p-3.5 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 animate-in fade-in duration-200">
              <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Technical Trade Playbook</span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{item.technicalContext}</p>
            </div>
          )}
        </div>

        {/* Footer: Metadata + 1-Click Action Dock */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              {item.sourceLink ? (
                <a href={item.sourceLink} target="_blank" rel="noreferrer" className="font-semibold text-slate-600 dark:text-slate-300 hover:text-indigo-500 inline-flex items-center gap-1">
                  {item.source}<ExternalLink className="h-2.5 w-2.5" />
                </a>
              ) : (
                <span className="font-semibold text-slate-600 dark:text-slate-300">{item.source}</span>
              )}
            </div>
            <div className="flex items-center gap-1 font-mono">
              <Clock className="h-3 w-3" />
              <span>{item.time}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {item.ticker && (
              <button
                type="button"
                onClick={() => onTrade(item.ticker!)}
                className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] transition-all flex items-center gap-1 shadow-sm shadow-emerald-600/20 active:scale-95 cursor-pointer"
                title={`Instant 1-Click Order for ${item.ticker}`}
              >
                <Zap className="h-3 w-3 fill-current" />
                <span>Trade {item.ticker}</span>
              </button>
            )}
            {item.ticker && (
              <button
                type="button"
                onClick={() => onInspect(item.ticker!)}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors"
                title={`Inspect ${item.ticker} Technicals`}
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={onToggle}
              className="flex items-center gap-0.5 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
            >
              <span>{expanded ? 'Less' : 'Analysis'}</span>
              <ChevronRight className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main NewsScreen Component ──────────────────────────────────────────────
export default function NewsScreen() {
  const router = useRouter();
  const { setSelectedTicker, setActiveTab, stocks } = useStockContext();

  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ bullish: number; bearish: number; neutral: number; high: number; sourceCounts?: Record<string, number> }>({ bullish: 0, bearish: 0, neutral: 0, high: 0 });
  const [activeSource, setActiveSource] = useState<string>("All");
  const [scan, setScan] = useState<NewsScan | null>(null);
  const [fetchError, setFetchError] = useState('');

  // View Mode: Modern Grid Cards vs Bloomberg Split-Screen Reader
  const [viewMode, setViewMode] = useState<'grid' | 'split'>('grid');
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Category and Filters
  const [activeCategory, setActiveCategory] = useState<NewsCategoryType>('all');
  const [activeSector, setActiveSector] = useState('All');
  const [activeSentiment, setActiveSentiment] = useState<typeof SENTIMENTS[number]>('All');
  const [activeImpact, setActiveImpact] = useState<typeof IMPACTS[number]>('All');
  const [tickerSearch, setTickerSearch] = useState('');
  const [activeTicker, setActiveTicker] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Live Auto-Refresh & Audio Chimes
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [audioAlerts, setAudioAlerts] = useState(true);

  // 1-Click Quick Trade Modal
  const [quickTradeStock, setQuickTradeStock] = useState<{
    ticker: string;
    name?: string;
    currentPrice: number;
    targetPct?: number;
    stopLossPct?: number;
  } | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch News Routine ───────────────────────────────────────────────────
  const fetchNews = useCallback(async (
    ticker?: string,
    sector?: string,
    category: NewsCategoryType = activeCategory
  ) => {
    setLoading(true);
    setFetchError('');
    try {
      const payload: Record<string, string> = {};
      if (ticker) payload.ticker = ticker;
      if (sector && sector !== 'All') {
        const q = SECTOR_NEWS_QUERIES[sector];
        if (q?.ticker) payload.ticker = q.ticker;
        if (q?.sector) payload.sector = q.sector;
      }
      if (category && category !== 'all' && category !== 'high_impact') {
        payload.category = category;
      }

      const params = new URLSearchParams();
      if (payload.ticker) params.set('ticker', payload.ticker);
      if (payload.sector) params.set('sector', payload.sector);
      if (payload.category) params.set('category', payload.category);

      const url = `/api/news${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`News request failed (${res.status})`);
      const data = await res.json();
      const newsList: NewsItem[] = data.news || [];
      setNews(newsList);
      setSummary(data.summary || { bullish: 0, bearish: 0, neutral: 0, high: 0 });
      setScan(data.scan || null);

      if (newsList.length > 0) {
        setSelectedArticleId(curr => curr || newsList[0].id);

        // Audio Alert Chime on High-Impact Bullish News
        if (audioAlerts) {
          const hasHighBull = newsList.some(item => item.impact === 'high' && item.sentiment === 'bullish');
          if (hasHighBull) {
            playTargetChime();
          }
        }
      }
    } catch (error) {
      setNews([]);
      setScan(null);
      setFetchError(error instanceof Error ? error.message : 'Unable to fetch news right now.');
    }
    setLoading(false);
    setCountdown(30);
  }, [activeCategory, audioAlerts]);

  // Initial fetch on sector/ticker/category change
  useEffect(() => {
    fetchNews(activeTicker || undefined, activeSector, activeCategory);
  }, [activeSector, activeTicker, activeCategory, fetchNews]);

  // Auto-refresh timer loop
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          fetchNews(activeTicker || undefined, activeSector, activeCategory);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTicker, activeSector, activeCategory, fetchNews]);

  // Debounced ticker search
  const handleTickerInput = (val: string) => {
    setTickerSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const clean = val.trim().toUpperCase();
      if (clean.length >= 2) {
        setActiveTicker(clean);
        setActiveSector('All');
      } else if (clean.length === 0) {
        setActiveTicker('');
      }
    }, 450);
  };

  // Open an arithmetic scenario using only a price already present in the screen.
  const handleTriggerQuickTrade = (ticker: string) => {
    const clean = ticker.replace(/\.NS$/i, '');
    const stockMatch = stocks.find(s => s.ticker === clean);
    setQuickTradeStock({
      ticker: clean,
      name: stockMatch?.name || clean,
      currentPrice: stockMatch?.currentPrice ?? 0,
      targetPct: 4.0,
      stopLossPct: 1.5,
    });
  };

  const handleInspectStock = (ticker: string) => {
    const clean = ticker.replace(/\.NS$/i, '');
    setSelectedTicker(clean);
    setActiveTab('dashboard');
    router.push('/');
  };

  // Client-side filtering by sentiment, impact, and category
  const filtered = useMemo(() => {
    return news.filter(item => {
      if (activeCategory === 'high_impact' && item.impact !== 'high') return false;
      if (activeSentiment !== 'All' && item.sentiment !== activeSentiment) return false;
      if (activeImpact !== 'All' && item.impact !== activeImpact) return false;
      if (activeSource !== 'All' && !item.source?.toLowerCase().includes(activeSource.toLowerCase())) return false;
      return true;
    });
  }, [news, activeCategory, activeSentiment, activeImpact, activeSource]);

  // Currently selected item for Split-Screen Reader View
  const selectedArticle = useMemo(() => {
    if (!selectedArticleId) return filtered[0] || null;
    return filtered.find(n => n.id === selectedArticleId) || filtered[0] || null;
  }, [filtered, selectedArticleId]);

  // Sentiment Breakdown percentages
  const totalArticles = news.length || 1;
  const bullishPct = Math.round((summary.bullish / totalArticles) * 100);
  const bearishPct = Math.round((summary.bearish / totalArticles) * 100);
  const neutralPct = Math.max(0, 100 - bullishPct - bearishPct);

  return (
    <div className="space-y-6">
      {/* ─── Hero Intelligence Header ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-black uppercase tracking-wider border border-violet-500/30">
                <Newspaper className="h-3.5 w-3.5" />
                Live Wire Intelligence Terminal
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-black uppercase tracking-wider">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                LIVE WIRE
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-300 text-[10px] font-mono border border-slate-700/60">
                <Clock className="h-3 w-3 text-emerald-400" />
                <span>Auto-Refresh in {countdown}s</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight font-sans">
              Market News &amp; Sentiment Radar
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Aggregated from 30+ top financial publishers across Dalal Street (Moneycontrol, Economic Times, LiveMint, Business Standard, Reuters, CNBC TV18) with AI technical analysis.
            </p>
          </div>

          {/* Quick Stats Badges */}
          <div className="flex gap-2.5 flex-wrap">
            {[
              { label: 'Bullish', value: summary.bullish, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', onClick: () => setActiveSentiment('bullish') },
              { label: 'Bearish', value: summary.bearish, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', onClick: () => setActiveSentiment('bearish') },
              { label: 'Neutral', value: summary.neutral, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', onClick: () => setActiveSentiment('neutral') },
              { label: 'High Impact', value: summary.high, color: 'text-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/10', onClick: () => setActiveCategory('high_impact') },
            ].map(s => (
              <button
                key={s.label}
                onClick={s.onClick}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border ${s.border} ${s.bg} backdrop-blur-md transition-all hover:-translate-y-0.5 hover:shadow-lg cursor-pointer`}
              >
                <span className={`text-lg font-mono font-black ${s.color}`}>{s.value}</span>
                <span className="text-[11px] text-slate-300 font-semibold">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Market Sentiment Distribution Bar ─────────────────────────────── */}
        <div className="mt-6 pt-4 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs font-mono mb-2">
            <span className="text-slate-400 flex items-center gap-1.5 font-bold">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              Dalal Street Mood Index:
            </span>
            <span className="text-slate-300 font-bold">
              <strong className="text-emerald-400">{bullishPct}% Bullish</strong> · <strong className="text-amber-400">{neutralPct}% Neutral</strong> · <strong className="text-rose-400">{bearishPct}% Bearish</strong>
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
            <div style={{ width: `${bullishPct}%` }} className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" title={`Bullish: ${bullishPct}%`} />
            <div style={{ width: `${neutralPct}%` }} className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full transition-all duration-500" title={`Neutral: ${neutralPct}%`} />
            <div style={{ width: `${bearishPct}%` }} className="bg-gradient-to-r from-rose-500 to-pink-500 h-full transition-all duration-500" title={`Bearish: ${bearishPct}%`} />
          </div>
        </div>
      </div>

      {/* Live Ticker Strip */}
      <LiveTickerStrip />

      {/* ─── Category Filter Navigation Tabs ──────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {NEWS_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                setActiveTicker('');
                setTickerSearch('');
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md shadow-indigo-600/20 scale-[1.02]'
                  : 'bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-white' : cat.color}`} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Multi-Source Publisher Wire Bar ───────────────────────────────── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[10px] font-mono font-bold uppercase text-slate-400 shrink-0 mr-1 flex items-center gap-1">
          <Globe className="h-3.5 w-3.5 text-indigo-400" />
          Wire Sources:
        </span>
        {['All', 'Economic Times', 'Moneycontrol', 'LiveMint', 'Business Standard', 'CNBC TV18', 'Reuters'].map(pub => {
          const isSelected = activeSource === pub;
          const count = pub === 'All' 
            ? news.length 
            : (summary.sourceCounts?.[pub] || news.filter(n => n.source?.toLowerCase().includes(pub.toLowerCase())).length);
          return (
            <button
              key={pub}
              onClick={() => setActiveSource(pub)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs scale-[1.02]'
                  : 'bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
              }`}
            >
              <span>{pub === 'All' ? 'All Publishers' : pub}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-indigo-700/80 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Controls & Search Toolbar ─────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2.5 items-center flex-1">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={tickerSearch}
              onChange={e => handleTickerInput(e.target.value)}
              placeholder="Search ticker (e.g. RELIANCE)..."
              className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm"
            />
            {tickerSearch && (
              <button onClick={() => { setTickerSearch(''); setActiveTicker(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer">
                <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" />
              </button>
            )}
          </div>

          {/* Quick Ticker Chips */}
          <div className="hidden sm:flex gap-1.5 flex-wrap">
            {MARKET_TICKERS.slice(0, 6).map(t => (
              <button
                key={t.ticker}
                onClick={() => { setTickerSearch(t.ticker); setActiveTicker(t.ticker); setActiveSector('All'); }}
                className={`px-3 py-2 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                  activeTicker === t.ticker
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                    : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
                }`}
              >{t.name}</button>
            ))}
          </div>

          {/* Filter Modal Toggle */}
          <button
            onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              showFilters 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
          </button>
        </div>

        {/* View Switcher, Auto-Refresh & Audio Controls */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => setAudioAlerts(a => !a)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              audioAlerts 
                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' 
                : 'border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
            title={audioAlerts ? 'Audio alert chime enabled on breaking news' : 'Audio alert chime muted'}
          >
            {audioAlerts ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Auto Refresh Toggle */}
          <button
            type="button"
            onClick={() => setAutoRefresh(r => !r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              autoRefresh 
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' 
                : 'border-slate-200 dark:border-slate-800 text-slate-400'
            }`}
            title="Toggle 30-second live auto-refresh"
          >
            {autoRefresh ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            <span>{autoRefresh ? `${countdown}s` : 'Paused'}</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            onClick={() => fetchNews(activeTicker || undefined, activeSector, activeCategory)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* View Mode Toggle: Grid vs Split */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Modern Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'split' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Bloomberg Split-Screen Terminal Reader"
            >
              <Columns className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Filters Panel */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl animate-in fade-in duration-200 shadow-md">
          {/* Sector */}
          <div>
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Sector</div>
            <div className="flex gap-1.5 flex-wrap">
              {SECTORS.map(s => (
                <button key={s} onClick={() => { setActiveSector(s); setActiveTicker(''); setTickerSearch(''); }}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${activeSector === s && !activeTicker ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/40 dark:bg-slate-800/30'}`}
                >{s}</button>
              ))}
            </div>
          </div>
          {/* Sentiment */}
          <div>
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Sentiment</div>
            <div className="flex gap-1.5">
              {SENTIMENTS.map(s => (
                <button key={s} onClick={() => setActiveSentiment(s)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all capitalize cursor-pointer ${activeSentiment === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/40 dark:bg-slate-800/30'}`}
                >{s}</button>
              ))}
            </div>
          </div>
          {/* Impact */}
          <div>
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Impact</div>
            <div className="flex gap-1.5">
              {IMPACTS.map(s => (
                <button key={s} onClick={() => setActiveImpact(s)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all capitalize cursor-pointer ${activeImpact === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/40 dark:bg-slate-800/30'}`}
                >{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Content Display: Grid vs Split View ──────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Newspaper className="h-5 w-5 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-sm text-slate-500 font-semibold">Scanning live Dalal Street financial wires &amp; Google News RSS...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
          <Newspaper className="h-10 w-10 text-slate-300 dark:text-slate-700" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No articles match your active filter</p>
          <p className="text-xs text-slate-400">Try switching category tabs or clearing ticker search</p>
          <button onClick={() => { setActiveCategory('all'); setActiveTicker(''); setActiveSentiment('All'); fetchNews(); }} className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /> Reset Wire Filters
          </button>
        </div>
      ) : viewMode === 'split' ? (
        /* ─── Bloomberg-Style Split-Screen Reader View ─────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Live Headline Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-3 max-h-[820px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-400 px-1 mb-1">
              <span>LIVE HEADLINE STREAM ({filtered.length})</span>
              <span>SELECT TO READ</span>
            </div>
            {filtered.map(item => {
              const isSelected = selectedArticle?.id === item.id;
              const sc = SENTIMENT_CONFIG[item.sentiment];
              const score = item.sentimentScore ?? (item.sentiment === 'bullish' ? 75 : item.sentiment === 'bearish' ? -65 : 0);

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedArticleId(item.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? 'bg-indigo-50/80 dark:bg-slate-800/90 border-indigo-500/60 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/30'
                      : 'bg-white/70 dark:bg-slate-900/70 border-slate-200/80 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${
                      item.sentiment === 'bullish' ? 'bg-emerald-500' : item.sentiment === 'bearish' ? 'bg-rose-500' : 'bg-amber-400'
                    }`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {item.ticker && (
                          <span className="font-mono font-black text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {item.ticker}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold ${sc.text}`}>
                          {item.sentiment.toUpperCase()} ({score > 0 ? `+${score}` : score})
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">· {item.time}</span>
                      </div>
                      <h4 className={`text-xs font-bold leading-snug line-clamp-2 ${
                        isSelected ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'
                      }`}>
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 font-mono">
                        <span>{item.source}</span>
                        {item.impact === 'high' && <span className="text-rose-500 font-bold">🔥 HIGH IMPACT</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Sticky Article Reader Console (7 cols) */}
          <div className="lg:col-span-7 sticky top-20 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 shadow-2xl">
            {selectedArticle ? (
              <div className="space-y-5">
                {/* Header Badge Row */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/70 pb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    {selectedArticle.ticker && (
                      <span className="font-mono font-black text-sm px-2.5 py-1 rounded-xl bg-indigo-600 text-white shadow-sm">
                        {selectedArticle.ticker}
                      </span>
                    )}
                    {selectedArticle.sector && (
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {selectedArticle.sector} Sector
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{selectedArticle.time}</span>
                    <span>·</span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{selectedArticle.source}</span>
                  </div>
                </div>

                {/* Article Headline */}
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug">
                  {selectedArticle.title}
                </h2>

                {/* AI Sentiment Meter & Price Impact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">AI Conviction Score</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-black font-mono ${
                        selectedArticle.sentiment === 'bullish' ? 'text-emerald-500' : selectedArticle.sentiment === 'bearish' ? 'text-rose-500' : 'text-amber-500'
                      }`}>
                        {(selectedArticle.sentimentScore ?? (selectedArticle.sentiment === 'bullish' ? 75 : -65)) > 0 ? `+${selectedArticle.sentimentScore ?? 75}` : (selectedArticle.sentimentScore ?? -65)} / 100
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        selectedArticle.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : selectedArticle.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {selectedArticle.sentiment}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-bold mb-1">Estimated Price Move</div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-amber-400" />
                      <span>{selectedArticle.priceImpactEst || '+3.0% to +6.5% Expected Surge'}</span>
                    </div>
                  </div>
                </div>

                {/* Executive Briefing */}
                <div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-1.5">Executive Briefing</h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {selectedArticle.content}
                  </p>
                </div>

                {/* Technical Trade Strategy */}
                {selectedArticle.technicalContext && (
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-bold font-mono uppercase tracking-wider">
                      <BarChart3 className="h-4 w-4" />
                      <span>Technical Chart Impact</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {selectedArticle.technicalContext}
                    </p>
                  </div>
                )}

                {/* 1-Click Action Execution Dock */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {selectedArticle.ticker && (
                      <button
                        type="button"
                        onClick={() => handleTriggerQuickTrade(selectedArticle.ticker!)}
                        className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <Zap className="h-4 w-4 fill-current" />
                        <span>Instant Trade {selectedArticle.ticker}</span>
                      </button>
                    )}
                    {selectedArticle.ticker && (
                      <button
                        type="button"
                        onClick={() => handleInspectStock(selectedArticle.ticker!)}
                        className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Chart</span>
                      </button>
                    )}
                  </div>

                  {selectedArticle.sourceLink && (
                    <a
                      href={selectedArticle.sourceLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Read Original Story</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-24 text-center text-slate-400">
                <Newspaper className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold">Select an article from the stream to read</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── Modern Grid Cards View ──────────────────────────────────────── */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(item => (
              <NewsCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
                onTrade={handleTriggerQuickTrade}
                onInspect={handleInspectStock}
              />
            ))}
          </div>

          <p className="text-center text-[10px] font-mono text-slate-400 mt-4">
            {filtered.length} curated articles · powered by Google News RSS &amp; FRIDAY AI
          </p>
        </>
      )}

      {/* ─── 1-Click Quick Trade Modal ────────────────────────────────────── */}
      {quickTradeStock && (
        <QuickTradeModal
          isOpen={!!quickTradeStock}
          onClose={() => setQuickTradeStock(null)}
          ticker={quickTradeStock.ticker}
          name={quickTradeStock.name}
          currentPrice={quickTradeStock.currentPrice}
          initialTargetPct={quickTradeStock.targetPct ?? 4.0}
          initialStopLossPct={quickTradeStock.stopLossPct ?? 1.5}
        />
      )}

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 35s linear infinite;
        }
      `}</style>
    </div>
  );
}
