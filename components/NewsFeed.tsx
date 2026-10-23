'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback } from 'react';
import { useStockContext } from '../context/StockContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Newspaper, 
  Sparkles, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Globe, 
  AlertCircle,
  Filter,
  Check,
  RefreshCw,
  BookOpen
} from 'lucide-react';

interface NewsItem {
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
}

const SECTORS = ['Technology', 'Energy', 'Financials', 'Consumer Cyclical'];
const TICKERS = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'ITC', 'SBIN'];

const GET_STOCK_SECTOR: Record<string, string> = {
  RELIANCE: 'Energy',
  TCS: 'Technology',
  HDFCBANK: 'Financials',
  INFY: 'Technology',
  ICICIBANK: 'Financials',
  ITC: 'Consumer Cyclical',
  SBIN: 'Financials'
};

interface NewsFeedProps {
  ticker?: string;
  sector?: string;
}

export default function NewsFeed({ ticker: propTicker, sector: propSector }: NewsFeedProps = {}) {
  const { selectedTicker, stocks, isUsingFallback, addToast, customApiKey } = useStockContext();

  // News State
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewsSandbox, setIsNewsSandbox] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'bullish' | 'bearish' | 'neutral'>('all');

  // Filter State
  const [activeMode, setActiveMode] = useState<'ticker' | 'sector' | 'active'>('active');
  const [filterTicker, setFilterTicker] = useState<string>('TCS');
  const [filterSector, setFilterSector] = useState<string>('Technology');
  
  // Interactive UI state
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Resolve currently active ticker or sector
  const cleanActiveTicker = (propTicker || selectedTicker || 'TCS').replace(/\.NS$/i, '');
  const currentActiveTicker = cleanActiveTicker;
  const currentActiveSector = propSector || GET_STOCK_SECTOR[currentActiveTicker] || 'Technology';

  // Toggle detail expansion
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Main Fetch Routine
  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let targetTicker = '';
      let targetSector = '';

      if (activeMode === 'active') {
        targetTicker = currentActiveTicker;
        targetSector = currentActiveSector;
      } else if (activeMode === 'ticker') {
        targetTicker = filterTicker;
        targetSector = GET_STOCK_SECTOR[filterTicker] || '';
      } else {
        targetSector = filterSector;
      }

      // Premium resilient fetching with auto-retry
      let response: Response | null = null;
      let attempt = 0;
      const maxAttempts = 3;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      while (attempt < maxAttempts) {
        try {
          response = await fetch('/api/news', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(customApiKey ? { 'x-gemini-api-key': customApiKey } : {})
            },
            body: JSON.stringify({
              ticker: targetTicker,
              sector: targetSector
            }),
          });
          if (response.ok) {
            break;
          }
        } catch (fetchErr) {
          attempt++;
          if (attempt >= maxAttempts) {
            throw fetchErr;
          }
          console.warn(`[News Terminal] Fetch attempt ${attempt} failed, retrying...`, fetchErr);
          await delay(800 * attempt);
        }
      }

      if (!response || !response.ok) {
        throw new Error(`News server responded with HTTP ${response ? response.status : 'unknown'}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setNews(data.news || []);
      setIsNewsSandbox(!!data.isMock);
      
      // Auto-expand the first item for instant technical context clarity
      if (data.news && data.news.length > 0) {
        setExpandedItems({ [data.news[0].id]: true });
      }
    } catch (err: any) {
      console.error('Failed to load market news:', err);
      setError(err.message || 'An unexpected error occurred while loading headlines.');
    } finally {
      setLoading(false);
    }
  }, [activeMode, currentActiveTicker, currentActiveSector, filterTicker, filterSector, customApiKey]);

  // Re-fetch on filter changes
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const bullishCount = news.filter(n => n.sentiment === 'bullish').length;
  const bearishCount = news.filter(n => n.sentiment === 'bearish').length;
  const neutralCount = news.filter(n => n.sentiment === 'neutral').length;
  const totalCount = news.length;
  const bullishPct = totalCount > 0 ? Math.round((bullishCount / totalCount) * 100) : 0;
  const bearishPct = totalCount > 0 ? Math.round((bearishCount / totalCount) * 100) : 0;
  const neutralPct = totalCount > 0 ? Math.max(0, 100 - bullishPct - bearishPct) : 0;

  const filteredNews = news.filter(item => {
    if (sentimentFilter === 'all') return true;
    return item.sentiment === sentimentFilter;
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-5" id="news-feed-root-card">
      
      {/* Title block with futuristic micro-indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 rounded-xl shrink-0">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              FRIDAY Quantum News Terminal
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium font-sans">Synthesize news sentiment with chart resistance, support, and indicator ranges</p>
          </div>
        </div>

        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-indigo-500/30 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer font-sans font-bold"
          id="btn-news-refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Feed</span>
        </button>
      </div>

      {/* Control Selector Bar */}
      <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3.5 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200/30 dark:border-gray-800/40 pb-2">
          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Filter className="h-3 w-3" /> Selector Protocols
          </span>
          <span className="text-[10px] font-mono text-gray-500">
            Active: <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase">{activeMode} news</span>
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Mode toggle button group */}
          <button
            onClick={() => setActiveMode('active')}
            className={`flex-1 min-w-[120px] py-1.5 px-3 text-[11px] font-bold rounded-lg transition-all border cursor-pointer flex items-center justify-center gap-1 ${
              activeMode === 'active'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            id="btn-news-mode-active"
          >
            <Cpu className="h-3 w-3 shrink-0" />
            <span>Follow Active ({currentActiveTicker})</span>
          </button>

          <button
            onClick={() => setActiveMode('ticker')}
            className={`flex-1 min-w-[120px] py-1.5 px-3 text-[11px] font-bold rounded-lg transition-all border cursor-pointer flex items-center justify-center gap-1 ${
              activeMode === 'ticker'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            id="btn-news-mode-ticker"
          >
            <span>Specific Ticker</span>
          </button>

          <button
            onClick={() => setActiveMode('sector')}
            className={`flex-1 min-w-[120px] py-1.5 px-3 text-[11px] font-bold rounded-lg transition-all border cursor-pointer flex items-center justify-center gap-1 ${
              activeMode === 'sector'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            id="btn-news-mode-sector"
          >
            <span>Specific Sector</span>
          </button>
        </div>

        {/* Conditional Dropdown Selection Panels */}
        <AnimatePresence mode="wait">
          {activeMode === 'ticker' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="pt-2 border-t border-gray-100 dark:border-gray-800/50 flex flex-wrap gap-1.5"
              id="news-tickers-pills"
            >
              {TICKERS.map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterTicker(t)}
                  className={`py-1 px-2.5 rounded-lg text-[10px] font-black uppercase font-mono transition-all border cursor-pointer ${
                    filterTicker === t
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 text-indigo-700 dark:text-indigo-400 font-extrabold'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </motion.div>
          )}

          {activeMode === 'sector' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="pt-2 border-t border-gray-100 dark:border-gray-800/50 flex flex-wrap gap-1.5"
              id="news-sectors-pills"
            >
              {SECTORS.map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSector(s)}
                  className={`py-1 px-3 rounded-lg text-[10px] font-bold uppercase transition-all border cursor-pointer ${
                    filterSector === s
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 text-indigo-700 dark:text-indigo-400'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}

          {activeMode === 'active' && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="pt-1 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5"
            >
              <Check className="h-3 w-3 text-emerald-500" />
              <span>Monitoring active workspace filters for <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{currentActiveTicker} ({currentActiveSector})</span>.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sentiment Consensus Breakdown Bar */}
      {news.length > 0 && (
        <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800/60 rounded-xl p-3.5 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-indigo-500" />
              AI Sentiment Consensus ({news.length} Headlines)
            </span>
            <div className="flex items-center gap-3 text-[11px] font-mono font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">🟢 {bullishPct}% Bullish</span>
              <span className="text-rose-600 dark:text-rose-400">🔴 {bearishPct}% Bearish</span>
              <span className="text-amber-600 dark:text-amber-400">🟡 {neutralPct}% Neutral</span>
            </div>
          </div>

          {/* Segmented distribution bar */}
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {bullishPct > 0 && (
              <div style={{ width: `${bullishPct}%` }} className="bg-emerald-500 h-full transition-all duration-500" title={`Bullish: ${bullishPct}%`} />
            )}
            {neutralPct > 0 && (
              <div style={{ width: `${neutralPct}%` }} className="bg-amber-400 h-full transition-all duration-500" title={`Neutral: ${neutralPct}%`} />
            )}
            {bearishPct > 0 && (
              <div style={{ width: `${bearishPct}%` }} className="bg-rose-500 h-full transition-all duration-500" title={`Bearish: ${bearishPct}%`} />
            )}
          </div>

          {/* Quick sentiment filter chips */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Filter:</span>
            {(['all', 'bullish', 'bearish', 'neutral'] as const).map((sent) => (
              <button
                key={sent}
                onClick={() => setSentimentFilter(sent)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer border ${
                  sentimentFilter === sent
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-900 border-gray-200/60 dark:border-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {sent === 'all' ? `All (${news.length})` : sent === 'bullish' ? `🟢 Bullish (${bullishCount})` : sent === 'bearish' ? `🔴 Bearish (${bearishCount})` : `🟡 Neutral (${neutralCount})`}
              </button>
            ))}
          </div>
        </div>
      )}



      {/* Main content display list */}
      {loading ? (
        <div className="space-y-4 py-4 animate-pulse">
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl w-full" />
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl w-full" />
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl w-full" />
        </div>
      ) : error ? (
        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 rounded-xl p-4 text-xs text-rose-700 dark:text-rose-400 font-medium flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">News Stream Offline</p>
            <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">{error}</p>
          </div>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-8 rounded-xl text-center text-xs text-gray-400 dark:text-gray-500 font-medium">
          No corresponding market news headlines found for selection.
        </div>
      ) : (
        <div className="space-y-3.5" id="news-list-container">
          <AnimatePresence>
            {filteredNews.map((item, idx) => {
              const isExpanded = !!expandedItems[item.id];
              
              // Custom badge styles based on sentiment
              let sentimentBg = '';
              let sentimentText = '';
              if (item.sentiment === 'bullish') {
                sentimentBg = 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-900/40';
                sentimentText = 'text-emerald-700 dark:text-emerald-400';
              } else if (item.sentiment === 'bearish') {
                sentimentBg = 'bg-rose-50 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-900/40';
                sentimentText = 'text-rose-700 dark:text-rose-400';
              } else {
                sentimentBg = 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
                sentimentText = 'text-gray-600 dark:text-gray-400';
              }

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.05 }}
                  className={`border rounded-xl transition-all overflow-hidden ${
                    isExpanded 
                      ? 'border-indigo-300 dark:border-indigo-900 bg-indigo-500/2 dark:bg-indigo-950/10 shadow-xs' 
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                  }`}
                  id={`news-card-${item.id}`}
                >
                  {/* Headline Header click zone */}
                  <div 
                    onClick={() => toggleExpand(item.id)}
                    className="p-4 cursor-pointer select-none space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-gray-400 dark:text-gray-500">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded uppercase">{item.source}</span>
                        <span>•</span>
                        <span>{item.time}</span>
                        {(item.ticker || item.sector) && (
                          <>
                            <span>•</span>
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.2 rounded font-sans font-bold uppercase">
                              {item.ticker || item.sector}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Sentiment badge */}
                        <span className={`px-2 py-0.5 rounded font-black border text-[9px] uppercase tracking-wide flex items-center gap-1 ${sentimentBg} ${sentimentText}`}>
                          {item.sentiment === 'bullish' ? <TrendingUp className="h-2.5 w-2.5" /> : item.sentiment === 'bearish' ? <TrendingDown className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5" />}
                          {item.sentiment}
                        </span>

                        {/* Impact badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          item.impact === 'high' 
                            ? 'bg-rose-100/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/30 animate-pulse' 
                            : item.impact === 'medium'
                              ? 'bg-amber-100/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}>
                          {item.impact} Impact
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-xs sm:text-[13px] font-black leading-snug text-gray-900 dark:text-white group-hover:text-indigo-600 font-sans">
                        {item.title}
                      </h4>
                      <div className="p-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white shrink-0">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-sans line-clamp-2">
                      {item.content}
                    </p>
                  </div>

                  {/* Expandable Technical Context Overlay Drawer */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <div className="p-4 bg-gray-50/50 dark:bg-gray-950/30 space-y-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                            <BookOpen className="h-3.5 w-3.5 animate-pulse" />
                            <span>FRIDAY Technical Analyst Overlay</span>
                          </div>

                          <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200/60 dark:border-gray-800/80 p-3 rounded-lg text-[11px] sm:text-xs text-gray-600 dark:text-gray-300 leading-relaxed space-y-1.5 font-sans shadow-xs">
                            <p>
                              {item.technicalContext}
                            </p>
                            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-mono uppercase tracking-wide">
                              Suggested Indicators: {item.sentiment === 'bullish' ? 'RSI Overbought boundary, Bollinger Upper Band' : item.sentiment === 'bearish' ? 'RSI Oversold pivot, SMA 20, SMA 50 cross support' : 'Stochastic swing oscillator range bounds'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

    </div>
  );
}
