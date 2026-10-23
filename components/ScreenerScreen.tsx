'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { useStockContext } from '../context/StockContext';
import { STOCK_METADATA, Stock, calculateDetailedStockSuggestion } from '../lib/stock-data';
import { Search, Star, LineChart as ChartIcon, Filter, ArrowUpDown, RefreshCw, BarChart3, AlertCircle, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import SectorHeatmap from './SectorHeatmap';

interface EnrichedScreenerStock extends Omit<Stock, 'marketCap' | 'sector'> {
  sector: string;
  marketCap: number;
  suggestion: 'BUY' | 'SELL' | 'HOLD';
  score: number;
  macd: any;
  bollingerBands: any;
}

export default function ScreenerScreen() {
  const {
    stocks: liveStocks,
    watchlist,
    toggleWatchlist,
    setSelectedTicker,
    setActiveTab,
    isFetching
  } = useStockContext();

  const [universeStocks, setUniverseStocks] = useState<EnrichedScreenerStock[]>([]);
  const [sectorsList, setSectorsList] = useState<string[]>(['all']);
  const [loadingUniverse, setLoadingUniverse] = useState<boolean>(true);

  // Load and pre-enrich all 5,055 Indian equities on mount once
  useEffect(() => {
    fetch('/all_indian_stocks_5055.json')
      .then(r => r.json())
      .then((catalog: any[]) => {
        if (Array.isArray(catalog) && catalog.length > 0) {
          const sectorsSet = new Set<string>();
          const mapped: EnrichedScreenerStock[] = new Array(catalog.length);

          for (let i = 0; i < catalog.length; i++) {
            const s = catalog[i];
            const rawTicker = s.symbol || s.ticker.replace(/\.(NS|BO)$/, '');
            const sector = s.sector || STOCK_METADATA[rawTicker]?.sector || 'Diversified';
            const marketCap = s.marketCap || STOCK_METADATA[rawTicker]?.marketCap || 1000;
            sectorsSet.add(sector);

            const spark = Array.isArray(s.sparkline) && s.sparkline.length > 0 ? s.sparkline : [s.currentPrice ?? s.price ?? 100];
            const priceHist = spark.map((p: number) => ({ price: p }));
            const detailed = calculateDetailedStockSuggestion(priceHist);

            mapped[i] = {
              ticker: rawTicker,
              name: s.name || s.symbol || s.ticker,
              currentPrice: s.currentPrice ?? s.price ?? 0,
              change: s.change ?? 0,
              changePercent: s.changePercent ?? 0,
              high: s.high ?? Math.max(...spark),
              low: s.low ?? Math.min(...spark),
              volume: s.volume ?? 100000,
              sector,
              marketCap,
              history: priceHist as any,
              isFallback: false,
              suggestion: detailed.suggestion,
              score: detailed.score,
              macd: detailed.macd,
              bollingerBands: detailed.bollingerBands,
            };
          }

          setSectorsList(['all', ...Array.from(sectorsSet).sort()]);
          setUniverseStocks(mapped);
        }
      })
      .catch(err => {
        console.warn('[Screener] Universe load fallback:', err);
      })
      .finally(() => setLoadingUniverse(false));
  }, []);

  // Overlay live streaming quotes from StockContext onto the pre-enriched universe
  const enrichedStocks = useMemo(() => {
    if (universeStocks.length === 0) return [];
    if (liveStocks.length === 0) return universeStocks;

    const liveMap = new Map(liveStocks.map(s => [s.ticker.toUpperCase(), s]));
    return universeStocks.map(stock => {
      const live = liveMap.get(stock.ticker.toUpperCase());
      if (!live) return stock;
      return {
        ...stock,
        currentPrice: live.currentPrice ?? stock.currentPrice,
        change: live.change ?? stock.change,
        changePercent: live.changePercent ?? stock.changePercent,
        high: live.high ?? stock.high,
        low: live.low ?? stock.low,
        volume: live.volume ?? stock.volume,
        dataSource: live.dataSource,
        quoteAsOf: live.quoteAsOf,
        quoteStatus: live.quoteStatus,
      };
    });
  }, [universeStocks, liveStocks]);

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedSector, setSelectedSector] = useState<string>('all');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('all');
  const [selectedMarketCap, setSelectedMarketCap] = useState<string>('all');
  const [selectedChange, setSelectedChange] = useState<string>('all');

  const [sortBy, setSortBy] = useState<'ticker' | 'name' | 'sector' | 'price' | 'change' | 'volume' | 'marketCap' | 'suggestion' | 'score'>('ticker');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtering & Sorting Logic using deferred search for high-frequency input fluidity
  const filteredStocks = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    const hasSearch = term.length > 0;
    const hasSector = selectedSector !== 'all';
    const hasSuggestion = selectedSuggestion !== 'all';
    const hasMarketCap = selectedMarketCap !== 'all';
    const hasChange = selectedChange !== 'all';

    const result: EnrichedScreenerStock[] = [];

    for (let i = 0; i < enrichedStocks.length; i++) {
      const s = enrichedStocks[i];

      // 1. Search Query
      if (hasSearch && !s.ticker.toLowerCase().includes(term) && !s.name.toLowerCase().includes(term)) {
        continue;
      }

      // 2. Sector Filter
      if (hasSector && s.sector !== selectedSector) {
        continue;
      }

      // 3. Suggestion Filter
      if (hasSuggestion && s.suggestion !== selectedSuggestion) {
        continue;
      }

      // 4. Market Capitalization Category Filter
      if (hasMarketCap) {
        if (selectedMarketCap === 'large' && s.marketCap < 100000) continue;
        if (selectedMarketCap === 'mid' && (s.marketCap < 20000 || s.marketCap >= 100000)) continue;
        if (selectedMarketCap === 'small' && s.marketCap >= 20000) continue;
      }

      // 5. Daily Percentage Change Filter
      if (hasChange) {
        if (selectedChange === 'positive' && s.changePercent <= 0) continue;
        if (selectedChange === 'negative' && s.changePercent >= 0) continue;
        if (selectedChange === 'high_gains' && s.changePercent < 2.0) continue;
        if (selectedChange === 'high_losses' && s.changePercent > -2.0) continue;
      }

      result.push(s);
    }

    // Sorting Engine
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'ticker') {
        comparison = a.ticker.localeCompare(b.ticker);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'sector') {
        comparison = a.sector.localeCompare(b.sector);
      } else if (sortBy === 'price') {
        comparison = a.currentPrice - b.currentPrice;
      } else if (sortBy === 'change') {
        comparison = a.changePercent - b.changePercent;
      } else if (sortBy === 'volume') {
        comparison = a.volume - b.volume;
      } else if (sortBy === 'marketCap') {
        comparison = a.marketCap - b.marketCap;
      } else if (sortBy === 'suggestion') {
        comparison = a.suggestion.localeCompare(b.suggestion);
      } else if (sortBy === 'score') {
        comparison = a.score - b.score;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [enrichedStocks, deferredSearch, selectedSector, selectedSuggestion, selectedMarketCap, selectedChange, sortBy, sortOrder]);

  // High-performance single-pass statistics calculation
  const screenerStats = useMemo(() => {
    const total = filteredStocks.length;
    let buys = 0, holds = 0, sells = 0, sumGain = 0;
    for (let i = 0; i < total; i++) {
      const s = filteredStocks[i];
      if (s.suggestion === 'BUY') buys++;
      else if (s.suggestion === 'SELL') sells++;
      else holds++;
      sumGain += s.changePercent || 0;
    }
    const avgGain = total > 0 ? sumGain / total : 0;
    return { total, buys, holds, sells, avgGain };
  }, [filteredStocks]);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Reset to first page when any search, filter, or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedSector, selectedSuggestion, selectedMarketCap, selectedChange, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / pageSize));
  const paginatedStocks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStocks.slice(start, start + pageSize);
  }, [filteredStocks, currentPage, pageSize]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const renderSortHeader = (column: typeof sortBy, label: string, align: 'left' | 'right' | 'center' = 'left') => {
    const isSorted = sortBy === column;
    return (
      <th 
        scope="col"
        role="columnheader"
        tabIndex={0}
        aria-sort={isSorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
        onClick={() => handleSort(column)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleSort(column);
          }
        }}
        className={`px-6 py-4 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-colors border-b border-gray-100 dark:border-gray-800 font-mono font-bold text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 ${
          align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
        }`}
      >
        <div className={`flex items-center gap-1 group ${
          align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
        }`}>
          <span>{label}</span>
          {isSorted ? (
            sortOrder === 'asc' ? (
              <span className="text-indigo-600 dark:text-indigo-400 text-xs" aria-hidden="true">▲</span>
            ) : (
              <span className="text-indigo-600 dark:text-indigo-400 text-xs" aria-hidden="true">▼</span>
            )
          ) : (
            <span className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400 text-[10px]" aria-hidden="true">⇅</span>
          )}
        </div>
      </th>
    );
  };

  const resetFilters = () => {
    setSearch('');
    setSelectedSector('all');
    setSelectedSuggestion('all');
    setSelectedMarketCap('all');
    setSelectedChange('all');
    setSortBy('ticker');
    setSortOrder('asc');
  };

  return (
    <div id="screener-screen-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Page Title & Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <Filter className="h-5 w-5 text-indigo-500" />
            <span>Exchange Screener Engine</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
             Scan Indian equities with SMA, MACD, and Bollinger Band rules. These directional scores are heuristics, not trade recommendations or calibrated probabilities.
          </p>
        </div>

        {/* Reset Quick Action */}
        <button
          onClick={resetFilters}
          className="self-start md:self-auto flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all cursor-pointer border border-transparent dark:border-gray-700"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reset Brackets</span>
        </button>
      </div>

      {/* Real-time Screener Statistics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="group relative glass-card glass-card-interactive rounded-2xl p-5 overflow-hidden transition-all duration-300">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-indigo-500/10 blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider relative z-10">Assets Scanned</p>
          <p className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white mt-1 relative z-10 font-mono">{screenerStats.total}</p>
        </div>
        <div className="group relative glass-card glass-card-interactive rounded-2xl p-5 overflow-hidden transition-all duration-300">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-emerald-500/15 blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
           <p className="text-[10px] text-emerald-600/70 font-black uppercase tracking-wider relative z-10">Bullish rule matches</p>
          <p className="text-2xl font-black tracking-tighter text-emerald-600 dark:text-emerald-400 mt-1 relative z-10 font-mono">{screenerStats.buys}</p>
        </div>
        <div className="group relative glass-card glass-card-interactive rounded-2xl p-5 overflow-hidden transition-all duration-300">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-slate-500/10 blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
           <p className="text-[10px] text-gray-500/70 font-black uppercase tracking-wider relative z-10">Mixed rule matches</p>
          <p className="text-2xl font-black tracking-tighter text-gray-600 dark:text-gray-400 mt-1 relative z-10 font-mono">{screenerStats.holds}</p>
        </div>
        <div className="group relative glass-card glass-card-interactive rounded-2xl p-5 overflow-hidden transition-all duration-300">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 rounded-full bg-rose-500/15 blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
           <p className="text-[10px] text-rose-600/70 font-black uppercase tracking-wider relative z-10">Bearish rule matches</p>
          <p className="text-2xl font-black tracking-tighter text-rose-600 dark:text-rose-400 mt-1 relative z-10 font-mono">{screenerStats.sells}</p>
        </div>
        <div className="group relative glass-card glass-card-interactive rounded-2xl p-5 overflow-hidden transition-all duration-300 col-span-2 md:col-span-1">
          <div className={`absolute -right-8 -bottom-8 w-24 h-24 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700 pointer-events-none ${screenerStats.avgGain >= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`} />
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider relative z-10">Average Change</p>
          <p className={`text-2xl font-black tracking-tighter mt-1 relative z-10 font-mono ${screenerStats.avgGain >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {screenerStats.avgGain >= 0 ? '+' : ''}{screenerStats.avgGain.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Sector-based Market Trend Heatmap */}
      <SectorHeatmap customStocks={enrichedStocks} />

      {/* Advanced Filters Control Console */}
      <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-700/50 rounded-3xl p-6 shadow-xl shadow-indigo-900/5 space-y-6">
        
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search bar */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-3 h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter by ticker or company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-950 border border-gray-200/80 dark:border-gray-800 rounded-2xl text-sm font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all shadow-sm"
              id="screener-search-input"
            />
          </div>

          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 dark:text-gray-500 font-bold uppercase select-none">
            {isFetching ? (
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin text-indigo-500" />
                Updating Gateway...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Gateways Synchronized
              </span>
            )}
          </div>
        </div>

        {/* 4-Column Dropdown Grid Filter Sets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          
          {/* Sector Category Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-black uppercase text-gray-400 dark:text-gray-500">Sector classification</label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-3 py-2 rounded-xl font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Sectors ({sectorsList.length - 1})</option>
              {sectorsList.filter(s => s !== 'all').map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Suggester Verdict Filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-black uppercase text-gray-400 dark:text-gray-500">Indicator rule</label>
            <select
              value={selectedSuggestion}
              onChange={(e) => setSelectedSuggestion(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-3 py-2 rounded-xl font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All rule readings</option>
              <option value="BUY">Bullish rule</option>
              <option value="HOLD">Mixed rule</option>
              <option value="SELL">Bearish rule</option>
            </select>
          </div>

          {/* Market Cap Classification */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-black uppercase text-gray-400 dark:text-gray-500">Market capitalization</label>
            <select
              value={selectedMarketCap}
              onChange={(e) => setSelectedMarketCap(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-3 py-2 rounded-xl font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Capitalizations</option>
              <option value="large">Large-Cap (≥ ₹1,00,000 Cr)</option>
              <option value="mid">Mid-Cap (₹20,000 Cr - ₹1,00,000 Cr)</option>
              <option value="small">Small-Cap (&lt; ₹20,000 Cr)</option>
            </select>
          </div>

          {/* Daily Percentage Change Bracket */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-black uppercase text-gray-400 dark:text-gray-500">Daily Delta delta</label>
            <select
              value={selectedChange}
              onChange={(e) => setSelectedChange(e.target.value)}
              className="w-full bg-gray-50/50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs px-3 py-2 rounded-xl font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Percentage Deltas</option>
              <option value="positive">Gainers Only (&gt; 0%)</option>
              <option value="negative">Losers Only (&lt; 0%)</option>
              <option value="high_gains">High Gainers (≥ +2.0%)</option>
              <option value="high_losses">High Losers (≤ -2.0%)</option>
            </select>
          </div>

        </div>

      </div>

      {/* Filtered Asset Matrix Display Table */}
      {filteredStocks.length === 0 ? (
        <div role="status" className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-16 text-center shadow-xl backdrop-blur-xl">
          <AlertCircle className="h-8 w-8 text-slate-400 mx-auto mb-3" />
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">No Assets Found</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md mx-auto">
            We could not match any listed equities with the filter combination currently selected. Reconfigure your sliders or query string.
          </p>
          <button
            onClick={resetFilters}
            aria-label="Reset all screener filters"
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl transition-all cursor-pointer shadow-md shadow-indigo-600/25"
          >
            Clear Screen filters
          </button>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl overflow-hidden shadow-xl backdrop-blur-xl" id="screener-results-table">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                  {renderSortHeader('ticker', 'Symbol', 'left')}
                  {renderSortHeader('name', 'Company Name', 'left')}
                  {renderSortHeader('sector', 'Sector Class', 'left')}
                  {renderSortHeader('price', 'Live Price', 'right')}
                  {renderSortHeader('change', 'Day change', 'right')}
                  {renderSortHeader('marketCap', 'Market Cap', 'right')}
                  {renderSortHeader('suggestion', 'Rule reading', 'center')}
                  {renderSortHeader('score', 'Heuristic score', 'center')}
                  <th scope="col" className="px-6 py-4 text-center font-mono font-bold text-[10px] uppercase text-slate-400 dark:text-slate-500">
                    Trade actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {paginatedStocks.map((stock) => {
                  const isUp = stock.change >= 0;
                  const isWatchlisted = watchlist.includes(stock.ticker);

                  return (
                    <tr 
                      key={stock.ticker}
                      className="hover:bg-indigo-50/50 dark:hover:bg-slate-800/50 transition-all duration-200 group table-row-hover"
                    >
                      {/* Ticker Symbol */}
                      <td className="px-6 py-4 font-mono font-bold text-slate-950 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true" className={`inline-flex h-2 w-2 rounded-full ${stock.suggestion === 'BUY' ? 'bg-emerald-500' : stock.suggestion === 'SELL' ? 'bg-rose-500' : 'bg-slate-400'}`} />
                          <span className="font-extrabold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{stock.ticker}</span>
                        </div>
                      </td>

                      {/* Company Name */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 font-medium max-w-[180px] truncate">
                        {stock.name}
                      </td>

                      {/* Sector */}
                      <td className="px-6 py-4 text-slate-400 dark:text-slate-400 font-semibold text-[11px]">
                        {stock.sector}
                      </td>

                      {/* Price */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{stock.currentPrice.toFixed(2)}
                      </td>

                      {/* Change % */}
                      <td className={`px-6 py-4 text-right font-mono font-bold ${isUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </td>

                      {/* Market Cap */}
                      <td className="px-6 py-4 text-right font-mono text-slate-500 dark:text-slate-400 font-semibold">
                        ₹{(stock.marketCap / 100).toFixed(1)}B <span className="text-[9px] text-slate-400 font-sans font-normal">Cr</span>
                      </td>

                      {/* Rule-based indicator reading */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex justify-center">
                          {stock.suggestion === 'BUY' ? (
                            <span className="text-[9px] font-mono font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 shadow-xs">
                              BULLISH RULE
                            </span>
                          ) : stock.suggestion === 'SELL' ? (
                            <span className="text-[9px] font-mono font-black bg-rose-500/15 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-full border border-rose-500/30 shadow-xs">
                              BEARISH RULE
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-3 py-1 rounded-full">
                              MIXED
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Signed rule score; this is not a probability. */}
                      <td className="px-6 py-4 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                        {stock.score > 0 ? '+' : ''}{stock.score} / 100
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleWatchlist(stock.ticker)}
                            className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-90 ${
                              isWatchlisted
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 dark:text-amber-400 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 hover:text-amber-500 hover:bg-amber-50/50'
                            }`}
                            title={isWatchlisted ? "Remove from watchlist" : "Add to watchlist"}
                          >
                            <Star className="h-3.5 w-3.5 fill-current" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedTicker(stock.ticker);
                              setActiveTab('dashboard');
                            }}
                            className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-colors cursor-pointer border border-indigo-500/20 active:scale-90"
                            title="Analyze Asset"
                          >
                            <ChartIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Clean Pagination Bar */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50 dark:bg-slate-900/50">
            <span className="font-mono text-slate-500 dark:text-slate-400">
              Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredStocks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-900 dark:text-white font-bold">{Math.min(currentPage * pageSize, filteredStocks.length)}</strong> of{' '}
              <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{filteredStocks.length}</strong> Equities
              {universeStocks.length > 0 && <span className="ml-1 text-[11px] text-slate-400">({universeStocks.length} Master Universe)</span>}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Prev</span>
              </button>

              <span className="px-3 py-1 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono font-bold">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
