'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStockContext } from '../context/StockContext';
import { STOCK_METADATA, Stock } from '../lib/stock-data';
import { 
  Grid3X3, 
  Layers, 
  Search, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown, 
  Info, 
  Maximize2, 
  Check,
  Building,
  DollarSign
} from 'lucide-react';

// Define range colors for heatmap tiles
const getHeatmapBgClass = (changePercent: number): string => {
  if (changePercent >= 2.0) {
    return 'bg-emerald-600 dark:bg-emerald-700 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600';
  }
  if (changePercent >= 0.5) {
    return 'bg-emerald-500/80 dark:bg-emerald-600/80 text-white hover:bg-emerald-500 dark:hover:bg-emerald-600';
  }
  if (changePercent > 0.1) {
    return 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/30';
  }
  if (changePercent <= -2.0) {
    return 'bg-rose-600 dark:bg-rose-700 text-white hover:bg-rose-500 dark:hover:bg-rose-600';
  }
  if (changePercent <= -0.5) {
    return 'bg-rose-500/80 dark:bg-rose-600/80 text-white hover:bg-rose-500 dark:hover:bg-rose-600';
  }
  if (changePercent < -0.1) {
    return 'bg-rose-500/20 text-rose-800 dark:text-rose-300 border border-rose-500/20 hover:bg-rose-500/30';
  }
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700';
};

// Interface for aggregated sector data
interface SectorData {
  name: string;
  stocks: Stock[];
  averageChange: number;
  totalMarketCap: number;
  advances: number;
  declines: number;
  flat: number;
}

export default function SectorHeatmap({ customStocks }: { customStocks?: Stock[] } = {}) {
  const { stocks: contextStocks, setSelectedTicker, setActiveTab } = useStockContext();
  const stocks = customStocks && customStocks.length > 0 ? customStocks : contextStocks;
  const [searchQuery, setSearchQuery] = useState('');
  const [viewType, setViewType] = useState<'grouped' | 'treemap'>('grouped');
  const [sortBy, setSortBy] = useState<'performance' | 'cap' | 'name'>('performance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Track hovered stock for detail overlay
  const [hoveredStock, setHoveredStock] = useState<Stock | null>(null);

  // Group and aggregate stock data by sector
  const sectorsData = useMemo(() => {
    const groups: Record<string, Stock[]> = {};
    
    stocks.forEach((stock) => {
      const sector = stock.sector || STOCK_METADATA[stock.ticker]?.sector || 'Other';
      if (!groups[sector]) {
        groups[sector] = [];
      }
      groups[sector].push(stock);
    });

    const aggregated: SectorData[] = Object.entries(groups).map(([name, sectorStocks]) => {
      let sumChange = 0;
      let totalCap = 0;
      let advances = 0;
      let declines = 0;
      let flat = 0;

      sectorStocks.forEach((stock) => {
        sumChange += stock.changePercent;
        totalCap += stock.marketCap || STOCK_METADATA[stock.ticker]?.marketCap || 0;
        if (stock.changePercent > 0.1) {
          advances++;
        } else if (stock.changePercent < -0.1) {
          declines++;
        } else {
          flat++;
        }
      });

      return {
        name,
        stocks: sectorStocks,
        averageChange: sumChange / sectorStocks.length,
        totalMarketCap: totalCap,
        advances,
        declines,
        flat
      };
    });

    // Apply sorting
    return aggregated.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'performance') {
        comparison = a.averageChange - b.averageChange;
      } else if (sortBy === 'cap') {
        comparison = a.totalMarketCap - b.totalMarketCap;
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [stocks, sortBy, sortOrder]);

  // All stocks filtered by search query
  const filteredAllStocks = useMemo(() => {
    return stocks.filter(s => 
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (STOCK_METADATA[s.ticker]?.sector || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
      // Sort by market cap descending in treemap mode
      const capA = STOCK_METADATA[a.ticker]?.marketCap || 0;
      const capB = STOCK_METADATA[b.ticker]?.marketCap || 0;
      return capB - capA;
    });
  }, [stocks, searchQuery]);

  const toggleSort = (field: 'performance' | 'cap' | 'name') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-5" id="sector-heatmap-panel-root">
      
      {/* Heatmap Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 shrink-0">
            <Grid3X3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              Sector Heatmap Tracker
              <span className="text-[9px] bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black">MARKET MAP</span>
            </h3>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
              Real-time sector density grids grouped by industry sectors. Darker green indicates strong bullish trend; darker red indicates bearish sell-off.
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* View Toggles */}
          <div className="flex bg-gray-50 dark:bg-gray-950 p-0.5 rounded-lg border border-gray-200/50 dark:border-gray-800 text-xs">
            <button
              onClick={() => setViewType('grouped')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewType === 'grouped'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              id="btn-heatmap-view-grouped"
            >
              <Layers className="h-3 w-3" />
              <span>Grouped Sectors</span>
            </button>
            <button
              onClick={() => setViewType('treemap')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                viewType === 'treemap'
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
              id="btn-heatmap-view-treemap"
            >
              <Grid3X3 className="h-3 w-3" />
              <span>Flat Grid (By Size)</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search ticker, name, industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-full lg:w-56 text-xs bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium"
              id="input-heatmap-search"
            />
          </div>

        </div>
      </div>

      {/* Sorting bar & Color scale legend */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-1.5 border-t border-gray-50 dark:border-gray-800/80">
        
        {/* Grouped sorting toggles */}
        {viewType === 'grouped' ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-gray-400 dark:text-gray-500 font-mono text-[9px] uppercase tracking-wider mr-1">Sort Sectors:</span>
            
            <button
              onClick={() => toggleSort('performance')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                sortBy === 'performance'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              id="btn-heatmap-sort-perf"
            >
              <span>Performance</span>
              {sortBy === 'performance' && (
                <ArrowUpDown className="h-3 w-3 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => toggleSort('cap')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                sortBy === 'cap'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              id="btn-heatmap-sort-cap"
            >
              <span>Market Capital</span>
              {sortBy === 'cap' && (
                <ArrowUpDown className="h-3 w-3 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => toggleSort('name')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                sortBy === 'name'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:text-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              id="btn-heatmap-sort-name"
            >
              <span>Alphabetical</span>
              {sortBy === 'name' && (
                <ArrowUpDown className="h-3 w-3 ml-0.5" />
              )}
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Showing all stocks ordered by Market Capitalization sizing.
          </div>
        )}

        {/* Color Legend scales */}
        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-950 px-2.5 py-1.5 border border-gray-200 dark:border-gray-800 rounded-xl text-[9px] font-mono font-bold uppercase shrink-0">
          <span className="text-rose-500 mr-1 font-sans">Bearish</span>
          <div className="h-3 w-5 bg-rose-600 rounded-sm" title="<= -2.0%" />
          <div className="h-3 w-5 bg-rose-500/80 rounded-sm" title="-2.0% to -0.5%" />
          <div className="h-3 w-5 bg-rose-500/20 rounded-sm" title="-0.5% to -0.1%" />
          <div className="h-3 w-5 bg-gray-200 dark:bg-gray-800 rounded-sm" title="-0.1% to +0.1%" />
          <div className="h-3 w-5 bg-emerald-500/20 rounded-sm" title="+0.1% to +0.5%" />
          <div className="h-3 w-5 bg-emerald-500/80 rounded-sm" title="+0.5% to +2.0%" />
          <div className="h-3 w-5 bg-emerald-600 rounded-sm" title=">= +2.0%" />
          <span className="text-emerald-500 ml-1 font-sans">Bullish</span>
        </div>
      </div>

      {/* Main Heatmap Visualizer */}
      <div className="w-full relative min-h-[300px]">
        {viewType === 'grouped' ? (
          
          /* VIEW A: Grouped Sectors Grid Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5" id="heatmap-sectors-grid">
            {sectorsData.map((sector) => {
              // Filter stocks by query inside sector
              const sectorStocksFiltered = sector.stocks.filter(s =>
                s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
                s.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (searchQuery && sectorStocksFiltered.length === 0) return null;

              const isSectorUp = sector.averageChange >= 0;
              const sectorCapCr = (sector.totalMarketCap).toLocaleString('en-IN') + ' Cr';

              return (
                <div 
                  key={sector.name} 
                  className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800/50 rounded-xl p-4 flex flex-col justify-between hover:shadow-xs hover:border-gray-300 transition-all"
                  id={`sector-card-heatmap-${sector.name.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <div>
                    {/* Sector Card Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-bold text-xs text-gray-900 dark:text-gray-200 tracking-tight flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{sector.name}</span>
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 font-mono font-medium">Cap: ₹{sectorCapCr}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">•</span>
                          <span className="text-[10px] text-gray-400 font-mono font-medium">{sector.stocks.length} Stocks</span>
                        </div>
                      </div>

                      {/* Sector Performance Pill */}
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        isSectorUp 
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30'
                      }`}>
                        {isSectorUp ? '+' : ''}{sector.averageChange.toFixed(2)}%
                      </span>
                    </div>

                    {/* Advances vs Declines Progress Bar */}
                    <div className="mt-3 flex items-center gap-1.5 text-[9px] font-mono font-bold text-gray-400">
                      <span className="text-emerald-500">{sector.advances} Adv</span>
                      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                        {sector.advances > 0 && (
                          <div 
                            className="bg-emerald-500 h-full" 
                            style={{ width: `${(sector.advances / (sector.advances + sector.declines + sector.flat)) * 100}%` }}
                          />
                        )}
                        {sector.flat > 0 && (
                          <div 
                            className="bg-gray-300 dark:bg-gray-600 h-full" 
                            style={{ width: `${(sector.flat / (sector.advances + sector.declines + sector.flat)) * 100}%` }}
                          />
                        )}
                        {sector.declines > 0 && (
                          <div 
                            className="bg-rose-500 h-full" 
                            style={{ width: `${(sector.declines / (sector.advances + sector.declines + sector.flat)) * 100}%` }}
                          />
                        )}
                      </div>
                      <span className="text-rose-500">{sector.declines} Dec</span>
                    </div>

                    {/* Grid of stock cells inside the sector */}
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-1.5" id={`sector-cells-grid-${sector.name.replace(/\s+/g, '-').toLowerCase()}`}>
                      {sectorStocksFiltered.map((stock) => {
                        const bgClass = getHeatmapBgClass(stock.changePercent);
                        const isStockUp = stock.changePercent >= 0;
                        const isMatch = searchQuery && (
                          stock.ticker.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          stock.name.toLowerCase().includes(searchQuery.toLowerCase())
                        );

                        return (
                          <div
                            key={stock.ticker}
                            onMouseEnter={() => setHoveredStock(stock)}
                            onMouseLeave={() => setHoveredStock(null)}
                            onClick={() => {
                              setSelectedTicker(stock.ticker);
                              setActiveTab('dashboard');
                            }}
                            className={`p-2 rounded-lg cursor-pointer transition-all flex flex-col justify-between text-center select-none ${bgClass} ${
                              isMatch ? 'ring-2 ring-indigo-500 scale-102 z-10' : ''
                            }`}
                            id={`heatmap-cell-${stock.ticker}`}
                            style={{ minHeight: '52px' }}
                          >
                            <span className="text-[10px] font-black tracking-tight block truncate font-mono uppercase">{stock.ticker}</span>
                            <span className="text-[9px] font-mono font-bold block opacity-90 leading-tight">
                              {isStockUp ? '+' : ''}{stock.changePercent.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          
          /* VIEW B: Flat Treemap-style equal cell Grid Layout (Order by Cap) */
          <div className="space-y-4" id="heatmap-treemap-container">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
              {filteredAllStocks.map((stock) => {
                const bgClass = getHeatmapBgClass(stock.changePercent);
                const isStockUp = stock.changePercent >= 0;
                const marketCapStr = (STOCK_METADATA[stock.ticker]?.marketCap || 0).toLocaleString('en-IN') + ' Cr';
                
                return (
                  <div
                    key={stock.ticker}
                    onMouseEnter={() => setHoveredStock(stock)}
                    onMouseLeave={() => setHoveredStock(null)}
                    onClick={() => {
                      setSelectedTicker(stock.ticker);
                      setActiveTab('dashboard');
                    }}
                    className={`p-2.5 rounded-xl cursor-pointer transition-all flex flex-col justify-between text-center select-none ${bgClass} hover:-translate-y-0.5 border dark:border-transparent`}
                    id={`treemap-tile-${stock.ticker}`}
                    style={{ minHeight: '64px' }}
                  >
                    <div className="text-[11px] font-black tracking-tight font-mono uppercase truncate">{stock.ticker}</div>
                    <div className="text-[9px] opacity-80 font-mono font-medium block truncate mt-0.5">₹{stock.currentPrice.toFixed(1)}</div>
                    <div className="text-[10px] font-mono font-bold block mt-1">
                      {isStockUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
            </div>
            {filteredAllStocks.length === 0 && (
              <div className="text-center py-12 text-xs text-gray-400 dark:text-gray-500">
                No matching stocks found for &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Hover Details overlay HUD bar (No clutter / Minimalist) */}
      <div 
        className="min-h-11 bg-gray-50 dark:bg-gray-950 rounded-xl p-3 border border-gray-200/70 dark:border-gray-800/50 flex flex-wrap items-center justify-between gap-3 text-xs"
        id="heatmap-hover-hud-bar"
      >
        {hoveredStock ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-mono font-black text-gray-900 dark:text-gray-200 uppercase bg-gray-200/50 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px]">
                {hoveredStock.ticker}
              </span>
              <span className="font-bold text-gray-800 dark:text-gray-200 truncate max-w-[200px] sm:max-w-[320px]">
                {hoveredStock.name}
              </span>
              <span className="text-gray-400 dark:text-gray-500 text-[10px]">•</span>
              <span className="text-gray-500 dark:text-gray-400 text-[10px] font-mono uppercase tracking-wider">
                {STOCK_METADATA[hoveredStock.ticker]?.sector || 'Other'}
              </span>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px]">
              <div>
                <span className="text-gray-400">PRICE: </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">₹{hoveredStock.currentPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400">CHANGE: </span>
                <span className={`font-bold ${hoveredStock.changePercent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {hoveredStock.changePercent >= 0 ? '+' : ''}{hoveredStock.changePercent.toFixed(2)}%
                </span>
              </div>
              <div className="hidden sm:block">
                <span className="text-gray-400">VOL: </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">{(hoveredStock.volume / 100000).toFixed(1)}L</span>
              </div>
              <div className="hidden md:block">
                <span className="text-gray-400">CAP: </span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  ₹{(STOCK_METADATA[hoveredStock.ticker]?.marketCap || 0).toLocaleString('en-IN')} Cr
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-medium">
            <Info className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span>Hover over any asset tile inside the density grids to display tactical pricing data, sector benchmarks, and volume flows. Click to open detailed charts.</span>
          </div>
        )}
      </div>

    </div>
  );
}
