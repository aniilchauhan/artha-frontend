'use client';


import { axionAssetPath } from '../lib/in-process';
import React, { useState, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { useRouter } from '../lib/workspace-router';
import { getSmallCapMomentumStocks } from '../lib/market-explorer';
import { 
  Layers, 
  Search, 
  ArrowUpDown, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  PieChart, 
  Sparkles,
  Award,
  Zap,
  ChevronRight,
  FileSpreadsheet,
  Download
} from 'lucide-react';

interface EnrichedStock {
  ticker: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  volume: number;
  marketCap: number;
  sector: string;
  return1d: number;
  return7d: number;
  return30d: number;
}

export default function MarketExplorerScreen() {
  const { stocks, setSelectedTicker, addToast } = useStockContext();
  const router = useRouter();

  // Screen State
  const [groupingMode, setGroupingMode] = useState<'cap' | 'sector'>('cap');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sort State (For Cap Lists)
  const [sortBy, setSortBy] = useState<'ticker' | 'price' | 'change' | 'marketCap'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // helper to calculate returns from stock price history
  const getHistoricalReturn = (history: any[], days: number): number => {
    if (!history || history.length < 2) return 0;
    const lastIndex = history.length - 1;
    const currentPrice = history[lastIndex]?.price ?? history[lastIndex]?.close ?? 0;
    
    // Attempt to look back by `days` elements
    const lookbackIndex = Math.max(0, lastIndex - days);
    const pastPrice = history[lookbackIndex]?.price ?? history[lookbackIndex]?.open ?? history[lookbackIndex]?.close ?? 0;
    
    if (pastPrice === 0) return 0;
    return ((currentPrice - pastPrice) / pastPrice) * 100;
  };

  // 1. Enrich Stocks with Category definitions and calculated returns
  const enrichedStocks = useMemo((): EnrichedStock[] => {
    return stocks.map(s => {
      // Market cap mapping
      const mCapVal = s.marketCap || 5000; // default fallback
      const sectorVal = s.sector || 'Other';
      
      const history = s.history || [];
      const return1d = s.changePercent || 0;
      const return7d = getHistoricalReturn(history, 7);
      const return30d = getHistoricalReturn(history, 30);

      return {
        ticker: s.ticker,
        name: s.name,
        currentPrice: s.currentPrice,
        change: s.change,
        changePercent: s.changePercent,
        high: s.high,
        low: s.low,
        volume: s.volume,
        marketCap: mCapVal,
        sector: sectorVal,
        return1d,
        return7d,
        return30d
      };
    });
  }, [stocks]);

  // 2. Classify and Filter
  const classifiedStocks = useMemo(() => {
    let result = [...enrichedStocks];

    // Apply Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        s => s.name.toLowerCase().includes(q) || 
        s.ticker.toLowerCase().includes(q) || 
        s.sector.toLowerCase().includes(q)
      );
    }

    // Categorization into large, mid, small caps
    const largeCaps = result.filter(s => s.marketCap >= 100000); // >= 1L Cr
    const midCaps = result.filter(s => s.marketCap >= 20000 && s.marketCap < 100000); // 20k - 100k Cr
    const smallCaps = result.filter(s => s.marketCap < 20000); // < 20k Cr

    // Sort function
    const sortList = (list: EnrichedStock[]) => {
      return list.sort((a, b) => {
        let comp = 0;
        if (sortBy === 'ticker') comp = a.ticker.localeCompare(b.ticker);
        else if (sortBy === 'price') comp = a.currentPrice - b.currentPrice;
        else if (sortBy === 'change') comp = a.changePercent - b.changePercent;
        else if (sortBy === 'marketCap') comp = a.marketCap - b.marketCap;

        return sortOrder === 'asc' ? comp : -comp;
      });
    };

    return {
      largeCaps: sortList(largeCaps),
      midCaps: sortList(midCaps),
      smallCaps: sortList(smallCaps),
      raw: result
    };
  }, [enrichedStocks, searchQuery, sortBy, sortOrder]);

  // 3. Dynamic Sector Grouping
  const sectorGroups = useMemo(() => {
    const groups: Record<string, { sector: string; stocks: EnrichedStock[]; avgReturn1d: number }> = {};

    classifiedStocks.raw.forEach(s => {
      if (!groups[s.sector]) {
        groups[s.sector] = { sector: s.sector, stocks: [], avgReturn1d: 0 };
      }
      groups[s.sector].stocks.push(s);
    });

    // Calculate averages and sort sectors by return desc
    return Object.values(groups).map(g => {
      const totalReturn = g.stocks.reduce((acc, curr) => acc + curr.changePercent, 0);
      g.avgReturn1d = g.stocks.length > 0 ? totalReturn / g.stocks.length : 0;
      
      // Sort constituent stocks inside sector by marketCap desc
      g.stocks.sort((a, b) => b.marketCap - a.marketCap);
      return g;
    }).sort((a, b) => b.avgReturn1d - a.avgReturn1d);

  }, [classifiedStocks.raw]);

  // 4. Compute Top Summary Stats
  const summaryStats = useMemo(() => {
    const raw = enrichedStocks;
    if (raw.length === 0) return { avgLarge: 0, avgMid: 0, avgSmall: 0, leader: '—', leaderReturn: 0 };

    const large = raw.filter(s => s.marketCap >= 100000);
    const mid = raw.filter(s => s.marketCap >= 20000 && s.marketCap < 100000);
    const small = raw.filter(s => s.marketCap < 20000);

    const calcAvg = (list: EnrichedStock[]) => 
      list.length > 0 ? list.reduce((acc, curr) => acc + curr.changePercent, 0) / list.length : 0;

    // Find overall leader (highest 1d return)
    const sortedByReturn = [...raw].sort((a, b) => b.changePercent - a.changePercent);
    const topGainer = sortedByReturn[0];

    return {
      avgLarge: calcAvg(large).toFixed(2),
      avgMid: calcAvg(mid).toFixed(2),
      avgSmall: calcAvg(small).toFixed(2),
      leader: topGainer ? topGainer.ticker : '—',
      leaderReturn: topGainer ? topGainer.changePercent.toFixed(2) : '0'
    };
  }, [enrichedStocks]);

  const smallCapMomentumStocks = useMemo(() => getSmallCapMomentumStocks(enrichedStocks), [enrichedStocks]);

  const handleTrackStock = (ticker: string) => {
    setSelectedTicker(ticker);
    addToast(`Loading charting terminal for ${ticker}`, 'info', ticker);
    router.push('/');
  };

  const handleSortToggle = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'ticker' ? 'asc' : 'desc');
    }
  };

  const formatMarketCap = (val: number) => {
    if (val >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L Cr`;
    }
    return `₹${val.toLocaleString('en-IN')} Cr`;
  };

  return (
    <div id="market-explorer-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white font-sans flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            <span>Market Categories Explorer</span>
          </h2>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono tracking-tight mt-0.5">
            Group, analyze, and track equities sorted by market capitalization size and sector product lines
          </p>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Large Cap KPI */}
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/40 rounded-2xl p-4 shadow-sm">
          <span className="block text-[9px] font-mono font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider mb-1">Large Cap Avg (1d)</span>
          <span className={`text-2xl font-black font-mono ${Number(summaryStats.avgLarge) >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
            {Number(summaryStats.avgLarge) >= 0 ? '+' : ''}{summaryStats.avgLarge}%
          </span>
          <span className="block text-[8px] text-gray-400 mt-1">Cap size &gt;= ₹1L Cr</span>
        </div>

        {/* Mid Cap KPI */}
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/40 rounded-2xl p-4 shadow-sm">
          <span className="block text-[9px] font-mono font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider mb-1">Mid Cap Avg (1d)</span>
          <span className={`text-2xl font-black font-mono ${Number(summaryStats.avgMid) >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
            {Number(summaryStats.avgMid) >= 0 ? '+' : ''}{summaryStats.avgMid}%
          </span>
          <span className="block text-[8px] text-gray-400 mt-1">Cap size ₹20k - ₹1L Cr</span>
        </div>

        {/* Small Cap KPI */}
        <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/40 rounded-2xl p-4 shadow-sm">
          <span className="block text-[9px] font-mono font-bold text-gray-450 dark:text-gray-550 uppercase tracking-wider mb-1">Small Cap Avg (1d)</span>
          <span className={`text-2xl font-black font-mono ${Number(summaryStats.avgSmall) >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
            {Number(summaryStats.avgSmall) >= 0 ? '+' : ''}{summaryStats.avgSmall}%
          </span>
          <span className="block text-[8px] text-gray-400 mt-1">Cap size &lt; ₹20k Cr</span>
        </div>

        {/* Market Leader KPI */}
        <div className="bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-500/20 rounded-2xl p-4 shadow-sm">
          <span className="block text-[9px] font-mono font-bold text-indigo-650 dark:text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" /> Top Return (1d)
          </span>
          <span className="text-2xl font-black text-indigo-650 dark:text-indigo-400 font-mono flex items-baseline gap-1">
            {summaryStats.leader}
            <span className="text-xs font-bold text-emerald-500">+{summaryStats.leaderReturn}%</span>
          </span>
          <span className="block text-[8px] text-indigo-500/75 mt-1">Max daily momentum gainer</span>
        </div>

      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">Small-cap 2%+ moves</p>
              <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white">Momentum gap leaders</h3>
            </div>
            <span className="rounded-full border border-amber-300 bg-white/70 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              {smallCapMomentumStocks.length} stocks
            </span>
          </div>
          {smallCapMomentumStocks.length === 0 ? (
            <p className="text-sm text-amber-800/80 dark:text-amber-200/80">No small-cap names are currently trading at or above the +2% momentum threshold.</p>
          ) : (
            <div className="space-y-2">
              {smallCapMomentumStocks.slice(0, 5).map((stock) => (
                <button
                  key={stock.ticker}
                  onClick={() => handleTrackStock(stock.ticker)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200 bg-white/70 px-3 py-2 text-left transition hover:border-amber-300 hover:bg-white dark:border-amber-800 dark:bg-slate-950/30 dark:hover:border-amber-700"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-amber-800 dark:text-amber-200">{stock.ticker}</div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-emerald-600 dark:text-emerald-400">+{stock.changePercent?.toFixed(2)}%</div>
                    <div className="text-[9px] text-gray-500 dark:text-gray-400">₹{(stock.marketCap ?? 0).toLocaleString('en-IN')} Cr</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/80 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
          <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">Prediction gap</p>
          <h3 className="mt-1 text-base font-black text-gray-900 dark:text-white">Small-cap coverage</h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-700 dark:text-gray-200">
            This slice highlights small-cap names trading at least +2% so the next prediction run has a visible high-momentum queue instead of silently missing the segment.
          </p>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Classification Mode Toggle */}
        <div className="flex bg-gray-100 dark:bg-gray-850 p-1 rounded-xl border border-gray-200/50 dark:border-gray-800 gap-1">
          <button
            onClick={() => setGroupingMode('cap')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
              groupingMode === 'cap'
                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="h-3.5 w-3.5" />
            <span>Cap Category Size</span>
          </button>
          <button
            onClick={() => setGroupingMode('sector')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-200 flex items-center gap-1.5 ${
              groupingMode === 'sector'
                ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Product Sectors</span>
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ticker, name, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-850 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Sort for Cap List */}
          {groupingMode === 'cap' && (
            <div className="flex bg-gray-50 dark:bg-gray-850 p-0.5 rounded-xl border border-gray-200/50 dark:border-gray-800 text-xs">
              <button
                onClick={() => handleSortToggle('marketCap')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortBy === 'marketCap' ? 'bg-white dark:bg-gray-700 text-indigo-750 dark:text-indigo-400 shadow-xs' : 'text-gray-405'
                }`}
              >
                <span>Cap</span>
                <ArrowUpDown className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleSortToggle('change')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortBy === 'change' ? 'bg-white dark:bg-gray-700 text-indigo-750 dark:text-indigo-400 shadow-xs' : 'text-gray-405'
                }`}
              >
                <span>Return</span>
                <ArrowUpDown className="h-3 w-3" />
              </button>
              <button
                onClick={() => handleSortToggle('price')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  sortBy === 'price' ? 'bg-white dark:bg-gray-700 text-indigo-750 dark:text-indigo-400 shadow-xs' : 'text-gray-405'
                }`}
              >
                <span>Price</span>
                <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Export CSV for Google Sheets / Excel */}
          <a
            href={axionAssetPath("/axion_all_stocks_universe.csv")}
            download="axion_5055_stocks_universe.csv"
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow-xs"
            title="Download Master CSV of all 5,055 Indian stocks (NSE & BSE) for Google Sheets or Excel"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export 5,055 Stocks CSV</span>
          </a>
        </div>

      </div>

      {/* Main Sections */}

      {/* GROUP BY MARKET CAPITALIZATION */}
      {groupingMode === 'cap' && (
        <div className="space-y-8">
          
          {/* Categorized grids: large, mid, small cap */}
          {[
            { id: 'large', title: 'Large Capitalization', desc: 'Market Valuation exceeding ₹1,00,000 Crores. Premium bluechip leaders.', data: classifiedStocks.largeCaps, headerColor: 'border-indigo-500/20 text-indigo-700 dark:text-indigo-400 bg-indigo-500/5' },
            { id: 'mid', title: 'Mid Capitalization', desc: 'Market Valuation between ₹20,000 and ₹1,00,000 Crores. Quality growth players.', data: classifiedStocks.midCaps, headerColor: 'border-emerald-500/20 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5' },
            { id: 'small', title: 'Small Capitalization', desc: 'Market Valuation under ₹20,000 Crores. High momentum alpha assets.', data: classifiedStocks.smallCaps, headerColor: 'border-amber-500/20 text-amber-700 dark:text-amber-400 bg-amber-500/5' }
          ].map((cat) => (
            <div key={cat.id} className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/50 rounded-2xl md:rounded-[2rem] p-4 sm:p-6 md:p-8 shadow-xl shadow-indigo-900/5 space-y-4">
              
              {/* Category Header */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-dashed rounded-2xl p-4 ${cat.headerColor}`}>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">{cat.title} ({cat.data.length})</h3>
                  <p className="text-[10px] text-gray-550 dark:text-gray-400 font-medium mt-0.5">{cat.desc}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[9px] font-mono uppercase tracking-wider font-bold">Category Mean Return</span>
                  <span className="text-base font-black font-mono">
                    {(() => {
                      const totalChg = cat.data.reduce((acc, curr) => acc + curr.changePercent, 0);
                      const avgChg = cat.data.length > 0 ? totalChg / cat.data.length : 0;
                      return `${avgChg >= 0 ? '+' : ''}${avgChg.toFixed(2)}%`;
                    })()}
                  </span>
                </div>
              </div>

              {/* Category List Table */}
              {cat.data.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 text-xs">
                  No stocks match the query in this category.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                      <tr className="border-b border-gray-150 dark:border-gray-800 font-mono text-[9px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        <th className="py-2.5 font-bold pl-2">Ticker / Symbol</th>
                        <th className="py-2.5 font-bold">Company Profile</th>
                        <th className="py-2.5 font-bold text-right">Market Cap</th>
                        <th className="py-2.5 font-bold text-right">Current Price</th>
                        <th className="py-2.5 font-bold text-right w-20">1-D Return</th>
                        <th className="py-2.5 font-bold text-right w-20">7-D Return</th>
                        <th className="py-2.5 font-bold text-right w-20">30-D Return</th>
                        <th className="py-2.5 font-bold text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/40 text-xs font-sans">
                      {cat.data.map((stock) => (
                        <tr 
                          key={stock.ticker} 
                          className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-all group"
                        >
                          <td className="py-3 font-mono font-bold text-indigo-650 dark:text-indigo-400 pl-2">
                            {stock.ticker}
                          </td>
                          <td className="py-3">
                            <span className="block font-bold text-gray-850 dark:text-white truncate max-w-[160px]" title={stock.name}>
                              {stock.name}
                            </span>
                            <span className="block text-[9px] bg-gray-55/60 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded mt-0.5 w-max font-medium">
                              {stock.sector}
                            </span>
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-gray-800 dark:text-gray-200">
                            {formatMarketCap(stock.marketCap)}
                          </td>
                          <td className="py-3 text-right font-mono font-bold text-gray-850 dark:text-gray-100">
                            ₹{stock.currentPrice.toFixed(2)}
                          </td>
                          <td className={`py-3 text-right font-mono font-extrabold ${stock.return1d >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                            {stock.return1d >= 0 ? '+' : ''}{stock.return1d.toFixed(2)}%
                          </td>
                          <td className={`py-3 text-right font-mono font-bold ${stock.return7d >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                            {stock.return7d >= 0 ? '+' : ''}{stock.return7d.toFixed(1)}%
                          </td>
                          <td className={`py-3 text-right font-mono font-bold ${stock.return30d >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                            {stock.return30d >= 0 ? '+' : ''}{stock.return30d.toFixed(1)}%
                          </td>
                          <td className="py-3 text-right pr-2">
                            <button
                              onClick={() => handleTrackStock(stock.ticker)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold text-indigo-750 hover:text-white dark:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 dark:border-indigo-900/60 dark:hover:bg-indigo-650 rounded-lg cursor-pointer transition-all active:scale-95 group"
                            >
                              <span>Track</span>
                              <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          ))}

        </div>
      )}

      {/* GROUP BY DYNAMIC PRODUCT SECTORS */}
      {groupingMode === 'sector' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {sectorGroups.map((group) => (
            <div 
              key={group.sector}
              className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/50 rounded-3xl p-5 shadow-lg shadow-indigo-950/5 flex flex-col justify-between"
            >
              
              {/* Sector Header */}
              <div>
                <div className="flex items-start justify-between border-b border-gray-150/60 dark:border-gray-800/80 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-gray-950 dark:text-white font-sans">{group.sector}</h3>
                    <span className="inline-block mt-0.5 text-[9px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-150/20">
                      {group.stocks.length} tracked equities
                    </span>
                  </div>
                  <div className="text-right shrink-0 font-sans">
                    <span className="block text-[9px] font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sector Avg (1d)</span>
                    <span className={`text-sm font-black font-mono ${group.avgReturn1d >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                      {group.avgReturn1d >= 0 ? '▲ +' : '▼ '}{group.avgReturn1d.toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Sector constituent stocks list (max 5 with a scrollbar) */}
                <div className="pt-4 divide-y divide-gray-100 dark:divide-gray-850/60 max-h-[250px] overflow-y-auto pr-1.5 scrollbar-thin">
                  {group.stocks.map((stock) => {
                    const isUp = stock.changePercent >= 0;
                    
                    // Determine market cap category badge
                    let capBadge = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                    let capLabel = "Small";
                    if (stock.marketCap >= 100000) {
                      capBadge = "bg-indigo-500/10 text-indigo-500 border-indigo-500/20";
                      capLabel = "Large";
                    } else if (stock.marketCap >= 20000) {
                      capBadge = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                      capLabel = "Mid";
                    }

                    return (
                      <div 
                        key={stock.ticker}
                        onClick={() => handleTrackStock(stock.ticker)}
                        className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-gray-50/50 dark:hover:bg-gray-850/35 rounded-xl px-2 border border-transparent hover:border-gray-150/40 dark:hover:border-gray-850 transition-all group"
                        title={`Click to track chart for ${stock.ticker}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="font-mono font-bold text-indigo-650 dark:text-indigo-400 text-xs shrink-0">{stock.ticker}</div>
                          <div className="min-w-0">
                            <span className="block font-bold text-gray-900 dark:text-white text-xs truncate max-w-[150px] group-hover:underline">{stock.name}</span>
                            <span className={`inline-block text-[8px] font-mono font-bold border px-1.5 py-0.5 rounded mt-0.5 ${capBadge}`}>
                              {capLabel} Cap
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-3 shrink-0">
                          <div>
                            <span className="block font-mono font-bold text-xs text-gray-900 dark:text-white">₹{stock.currentPrice.toFixed(2)}</span>
                            <span className={`block font-mono text-[10px] font-extrabold ${isUp ? 'text-emerald-550' : 'text-rose-500'}`}>
                              {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                            </span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-700 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Sector Card Footer */}
              <div className="border-t border-gray-100 dark:border-gray-850 pt-3 mt-4 text-[9px] text-gray-400 dark:text-gray-550 flex items-center justify-between">
                <span>Dynamic Sector weights from MongoDB</span>
                <span className="font-mono">Capital: {formatMarketCap(group.stocks.reduce((acc, curr) => acc + curr.marketCap, 0))}</span>
              </div>

            </div>
          ))}

        </div>
      )}

    </div>
  );
}
