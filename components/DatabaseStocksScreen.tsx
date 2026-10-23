'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Star,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  LayoutGrid,
  List,
  SlidersHorizontal,
  X,
  TrendingUp,
  TrendingDown,
  Building2,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface DBStock {
  ticker: string;
  symbol: string;
  name: string;
  price: number | null;
  currentPrice: number;
  closePrice: number;
  previousClose: number;
  change: number | null;
  changePercent: number | null;
  high: number;
  low: number;
  volume: number | null;
  marketCap?: number | null;
  sector?: string;
  exchange?: string;
  indices?: string[];
  sparkline?: number[];
  isFallback: boolean;
  quoteAsOf?: string;
  quoteStatus?: string;
}

const ALL_SECTORS = [
  'Agricultural',
  'Apparel & Accessories',
  'Automobile & Ancillaries',
  'Banking',
  'Consumer Durables',
  'Derived Materials',
  'Energy',
  'Financial',
  'Healthcare & Pharma',
  'Technology & IT',
  'Infrastructure & Construction',
  'FMCG & Retail',
  'Metals & Mining',
  'Real Estate',
  'Telecommunication',
  'Utilities',
  'Media & Entertainment'
];

const ALL_INDICES = [
  'Nifty 50',
  'Nifty Bank',
  'Nifty IT',
  'BSE Sensex',
  'BSE 500',
  'BSE SME'
];

// Mini SVG Sparkline Component with dashed baseline reference line
function MiniSparkline({
  data,
  isPositive,
  baseline
}: {
  data?: number[];
  isPositive: boolean;
  baseline?: number;
}) {
  const points = useMemo(() => {
    if (!data || data.length < 2) {
      return isPositive ? [10, 11, 10.5, 12, 11.8, 13] : [13, 12, 12.2, 11, 11.2, 10];
    }
    return data;
  }, [data, isPositive]);

  const width = 110;
  const height = 30;
  const padding = 4;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const effectiveBaseline = baseline ?? points[0];
  const baselineY = height - padding - ((effectiveBaseline - min) / range) * (height - 2 * padding);

  const coords = points.map((val, idx) => {
    const x = padding + (idx / (points.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((val - min) / range) * (height - 2 * padding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${coords.join(' L ')}`;
  const strokeColor = isPositive ? '#10b981' : '#ef4444';

  return (
    <div className="w-[110px] h-[30px] flex items-center justify-center">
      <svg width={width} height={height} className="overflow-visible">
        {/* Baseline dotted/dashed reference line */}
        <line
          x1={padding}
          y1={baselineY}
          x2={width - padding}
          y2={baselineY}
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="2,2"
          className="dark:stroke-slate-700"
        />
        {/* Sparkline curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function DatabaseStocksScreen() {
  const { watchlist, toggleWatchlist, setSelectedTicker } = useStockContext();

  const [stocks, setStocks] = useState<DBStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Pagination states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStocks, setTotalStocks] = useState(5055);
  const [totalUniverse, setTotalUniverse] = useState(5055);
  const [limit, setLimit] = useState(50);

  // Filters
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorSearch, setSectorSearch] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<string[]>([]);
  const [selectedMarketCap, setSelectedMarketCap] = useState<string>('all');
  const [selectedExchange, setSelectedExchange] = useState<string>('all');

  // Accordion open/close states
  const [sectorsOpen, setSectorsOpen] = useState(true);
  const [indexOpen, setIndexOpen] = useState(true);
  const [marketCapOpen, setMarketCapOpen] = useState(false);

  // Facet counts from backend
  const [sectorFacets, setSectorFacets] = useState<Record<string, number>>({});
  const [indexFacets, setIndexFacets] = useState<Record<string, number>>({});

  // View state: 'table' | 'cards'
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Sorting states (default by marketCap desc to match high-profile stock view)
  const [sortBy, setSortBy] = useState<'ticker' | 'name' | 'price' | 'closePrice' | 'change' | 'volume' | 'marketCap'>('marketCap');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mobile filters drawer
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Format currency
  const formatInr = (val?: number | null) => {
    if (val == null || !Number.isFinite(val)) return '—';
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Format marketCap value in ₹ Crores (Indian formatting: e.g. ₹16,69,847)
  const formatMarketCap = (value?: number | null) => {
    if (value == null || !Number.isFinite(value)) return '—';
    return `₹${Math.round(value).toLocaleString('en-IN')}`;
  };

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch stocks from database API
  const fetchDBStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        search: debouncedSearch,
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      });

      if (selectedSectors.length === 1) {
        queryParams.set('sector', selectedSectors[0]);
      }
      if (selectedIndices.length === 1) {
        queryParams.set('index', selectedIndices[0]);
      }
      if (selectedMarketCap !== 'all') {
        queryParams.set('marketCap', selectedMarketCap);
      }
      if (selectedExchange !== 'all') {
        queryParams.set('exchange', selectedExchange);
      }

      const response = await fetch(`/api/stocks/database?${queryParams}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect to database API.');
      }

      if (data.success) {
        let loadedStocks: DBStock[] = data.stocks || [];

        // Client-side multi-sector filter if more than 1 selected
        if (selectedSectors.length > 1) {
          loadedStocks = loadedStocks.filter(s => s.sector && selectedSectors.includes(s.sector));
        }

        setStocks(loadedStocks);
        setTotalPages(data.totalPages || 1);
        setTotalStocks(data.total || 0);
        if (data.totalUniverse) setTotalUniverse(data.totalUniverse);
        if (data.facets?.sectors) setSectorFacets(data.facets.sectors);
        if (data.facets?.indices) setIndexFacets(data.facets.indices);
      } else {
        throw new Error(data.error || 'Unknown server error');
      }
    } catch (err: any) {
      console.error('[DatabaseStocksScreen] Fetch error:', err);
      setError(err?.message || 'Failed to connect to database API.');
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    page,
    limit,
    sortBy,
    sortOrder,
    selectedSectors,
    selectedIndices,
    selectedMarketCap,
    selectedExchange
  ]);

  useEffect(() => {
    fetchDBStocks();
  }, [fetchDBStocks]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' || field === 'ticker' ? 'asc' : 'desc');
    }
    setPage(1);
  };

  const clearAllFilters = () => {
    setSelectedSectors([]);
    setSelectedIndices([]);
    setSelectedMarketCap('all');
    setSelectedExchange('all');
    setSearch('');
    setDebouncedSearch('');
    setPage(1);
  };

  const hasActiveFilters =
    selectedSectors.length > 0 ||
    selectedIndices.length > 0 ||
    selectedMarketCap !== 'all' ||
    selectedExchange !== 'all' ||
    search.trim().length > 0;

  const toggleSector = (sector: string) => {
    setSelectedSectors(prev =>
      prev.includes(sector) ? prev.filter(s => s !== sector) : [...prev, sector]
    );
    setPage(1);
  };

  const toggleIndex = (indexName: string) => {
    setSelectedIndices(prev =>
      prev.includes(indexName) ? prev.filter(i => i !== indexName) : [...prev, indexName]
    );
    setPage(1);
  };

  const filteredSectorList = useMemo(() => {
    if (!sectorSearch.trim()) return ALL_SECTORS;
    const q = sectorSearch.toLowerCase();
    return ALL_SECTORS.filter(s => s.toLowerCase().includes(q));
  }, [sectorSearch]);

  const SortIcon = ({ field }: { field: typeof sortBy }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 text-slate-400 opacity-60 group-hover:opacity-100" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
    ) : (
      <ArrowDown className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
    );
  };

  return (
    <div className="space-y-6 animate-fade-up max-w-[1600px] mx-auto px-1 sm:px-2" id="database-stocks-screen">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            All Stocks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Complete Indian Equity Universe ({totalUniverse.toLocaleString('en-IN')} stocks across NSE & BSE)
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="md:hidden flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-indigo-600" />}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/60 shadow-2xs">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => fetchDBStocks()}
            disabled={loading}
            className="cursor-pointer flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-2xs"
            title="Refresh Quotes"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Main Layout: Left Filter Sidebar + Right Stock List Table */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Filter Sidebar */}
        <aside
          className={`w-full md:w-64 lg:w-72 shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs transition-all ${
            showMobileFilters ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Filter Header with Clear All */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-mono font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              FILTERS
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors uppercase tracking-wider"
              >
                CLEAR ALL
              </button>
            )}
          </div>

          {/* Quick Search */}
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search stocks..."
                className="w-full pl-9 pr-7 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Sectors Section */}
          <div className="mt-6 border-b border-slate-100 dark:border-slate-800 pb-5">
            <button
              onClick={() => setSectorsOpen(!sectorsOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span>Sectors</span>
              {sectorsOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {sectorsOpen && (
              <div className="mt-3 space-y-3">
                {/* Sector search input */}
                <div className="relative">
                  <input
                    type="text"
                    value={sectorSearch}
                    onChange={e => setSectorSearch(e.target.value)}
                    placeholder="Search for sectors, sub sectors"
                    className="w-full pl-3 pr-8 py-1.5 text-[11px] rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>

                {/* Sector Checkboxes List */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1 no-scrollbar text-xs">
                  {filteredSectorList.map(sector => {
                    const isChecked = selectedSectors.includes(sector);
                    const count = sectorFacets[sector];
                    return (
                      <label
                        key={sector}
                        onClick={() => toggleSector(sector)}
                        className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isChecked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                            }`}
                          >
                            {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                          <span className={`text-xs truncate ${isChecked ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                            {sector}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 font-mono">
                          {count !== undefined ? count : '+'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Index Section */}
          <div className="mt-5 border-b border-slate-100 dark:border-slate-800 pb-5">
            <button
              onClick={() => setIndexOpen(!indexOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span>Index</span>
              {indexOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {indexOpen && (
              <div className="mt-3 space-y-2 text-xs">
                {ALL_INDICES.map(idxName => {
                  const isChecked = selectedIndices.includes(idxName);
                  const count = indexFacets[idxName];
                  return (
                    <label
                      key={idxName}
                      onClick={() => toggleIndex(idxName)}
                      className="flex items-center justify-between py-1 px-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer group select-none"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 group-hover:border-slate-400'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <span className={`text-xs truncate ${isChecked ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          {idxName}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {count !== undefined ? count : ''}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Market Cap Section */}
          <div className="mt-5 border-b border-slate-100 dark:border-slate-800 pb-5">
            <button
              onClick={() => setMarketCapOpen(!marketCapOpen)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 py-1"
            >
              <span>Market Cap</span>
              {marketCapOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {marketCapOpen && (
              <div className="mt-3 space-y-1 text-xs">
                {[
                  { id: 'all', label: 'All Market Caps' },
                  { id: 'mega', label: 'Mega Cap (> ₹1.5L Cr)' },
                  { id: 'large', label: 'Large Cap (₹50k - 1.5L Cr)' },
                  { id: 'mid', label: 'Mid Cap (₹15k - 50k Cr)' },
                  { id: 'small', label: 'Small Cap (₹2k - 15k Cr)' },
                  { id: 'micro', label: 'Micro Cap (< ₹2k Cr)' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedMarketCap(item.id);
                      setPage(1);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedMarketCap === item.id
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exchange Filter */}
          <div className="mt-5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Exchange
            </span>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
              {['all', 'NSE', 'BSE'].map(ex => (
                <button
                  key={ex}
                  onClick={() => {
                    setSelectedExchange(ex);
                    setPage(1);
                  }}
                  className={`py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    selectedExchange === ex
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Stock List / Table Area */}
        <main className="flex-1 min-w-0 w-full space-y-4">
          {/* Subheader: Search Results Count */}
          <div className="flex items-center justify-between">
            <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Search results <span className="font-bold text-slate-900 dark:text-white">{totalStocks.toLocaleString('en-IN')} Stocks</span>
            </div>

            {/* Limit Selector */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>Show:</span>
              <select
                value={limit}
                onChange={e => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => fetchDBStocks()}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table View */}
          {viewMode === 'table' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      <th
                        onClick={() => handleSort('name')}
                        className="py-3 px-4 sm:px-6 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>COMPANY</span>
                          <SortIcon field="name" />
                        </div>
                      </th>
                      <th className="py-3 px-4 hidden sm:table-cell text-center w-[120px]">
                        TREND
                      </th>
                      <th
                        onClick={() => handleSort('price')}
                        className="py-3 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>MARKET PRICE</span>
                          <SortIcon field="price" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('closePrice')}
                        className="py-3 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>CLOSE PRICE</span>
                          <SortIcon field="closePrice" />
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('marketCap')}
                        className="py-3 px-4 text-right cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 select-none group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span>MARKET CAP (Cr)</span>
                          <SortIcon field="marketCap" />
                        </div>
                      </th>
                      <th className="py-3 px-4 text-center w-12"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading && stocks.length === 0 ? (
                      Array.from({ length: 10 }).map((_, idx) => (
                        <tr key={`skeleton-${idx}`} className="animate-pulse">
                          <td className="py-4 px-6">
                            <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md mb-1.5" />
                            <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/60 rounded-md" />
                          </td>
                          <td className="py-4 px-4 hidden sm:table-cell">
                            <div className="h-6 w-24 mx-auto bg-slate-100 dark:bg-slate-800 rounded-md" />
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="h-4 w-20 ml-auto bg-slate-200 dark:bg-slate-800 rounded-md mb-1" />
                            <div className="h-3 w-12 ml-auto bg-slate-100 dark:bg-slate-800 rounded-md" />
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="h-4 w-20 ml-auto bg-slate-200 dark:bg-slate-800 rounded-md" />
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="h-4 w-24 ml-auto bg-slate-200 dark:bg-slate-800 rounded-md" />
                          </td>
                          <td className="py-4 px-4">
                            <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 mx-auto" />
                          </td>
                        </tr>
                      ))
                    ) : stocks.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm font-medium">No stocks matched your active filters.</p>
                          <button
                            onClick={clearAllFilters}
                            className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            Reset filters
                          </button>
                        </td>
                      </tr>
                    ) : (
                      stocks.map(stock => {
                        const isWatched = watchlist.includes(stock.ticker);
                        const isPositive = (stock.changePercent ?? 0) >= 0;

                        return (
                          <tr
                            key={stock.ticker}
                            onClick={() => setSelectedTicker(stock.ticker)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          >
                            {/* Company Name, Symbol, Exchange */}
                            <td className="py-4 px-4 sm:px-6">
                              <div className="flex flex-col">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {stock.name}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    {stock.symbol}
                                  </span>
                                  {stock.exchange && (
                                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                      {stock.exchange}
                                    </span>
                                  )}
                                  {stock.sector && (
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[120px] hidden lg:inline">
                                      • {stock.sector}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Sparkline Chart */}
                            <td className="py-4 px-4 hidden sm:table-cell text-center">
                              <MiniSparkline
                                data={stock.sparkline}
                                isPositive={isPositive}
                                baseline={stock.closePrice || stock.previousClose}
                              />
                            </td>

                            {/* Market Price + 1D Change */}
                            <td className="py-4 px-4 text-right">
                              <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                                {formatInr(stock.currentPrice || stock.price)}
                              </div>
                              <div
                                className={`text-[11px] font-mono font-medium flex items-center justify-end gap-1 ${
                                  isPositive
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                <span>
                                  {stock.change != null
                                    ? `${stock.change >= 0 ? '+' : ''}${stock.change.toFixed(2)}`
                                    : '0.00'}
                                </span>
                                <span>
                                  ({stock.changePercent != null
                                    ? `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%`
                                    : '0.00%'})
                                </span>
                              </div>
                            </td>

                            {/* Close Price */}
                            <td className="py-4 px-4 text-right font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                              {formatInr(stock.closePrice || stock.previousClose)}
                            </td>

                            {/* Market Cap (Cr) */}
                            <td className="py-4 px-4 text-right font-mono text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                              {formatMarketCap(stock.marketCap)}
                            </td>

                            {/* Action (+) Watchlist Button */}
                            <td
                              className="py-4 px-4 text-center"
                              onClick={e => {
                                e.stopPropagation();
                                toggleWatchlist(stock.ticker);
                              }}
                            >
                              <button
                                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                  isWatched
                                    ? 'bg-emerald-500 text-white shadow-xs'
                                    : 'border border-emerald-500/60 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                }`}
                                title={isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
                              >
                                {isWatched ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Plus className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stocks.map(stock => {
                const isWatched = watchlist.includes(stock.ticker);
                const isPositive = (stock.changePercent ?? 0) >= 0;

                return (
                  <div
                    key={stock.ticker}
                    onClick={() => setSelectedTicker(stock.ticker)}
                    className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all cursor-pointer shadow-xs hover:shadow-md relative group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {stock.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs font-mono text-slate-500">{stock.symbol}</span>
                            {stock.exchange && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                {stock.exchange}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleWatchlist(stock.ticker);
                          }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                            isWatched
                              ? 'bg-emerald-500 text-white'
                              : 'border border-emerald-500/60 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          {isWatched ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : <Plus className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Sparkline in card */}
                      <div className="my-3 flex justify-center">
                        <MiniSparkline
                          data={stock.sparkline}
                          isPositive={isPositive}
                          baseline={stock.closePrice || stock.previousClose}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Price</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {formatInr(stock.currentPrice || stock.price)}
                        </span>
                        <div className={`text-[10px] font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {stock.changePercent != null ? `${stock.changePercent >= 0 ? '+' : ''}${stock.changePercent.toFixed(2)}%` : '0%'}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-mono block">Market Cap</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {formatMarketCap(stock.marketCap)} Cr
                        </span>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {stock.sector}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div>
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalStocks)} of {totalStocks.toLocaleString('en-IN')} stocks
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(prev => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-bold flex items-center gap-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Prev
                </button>

                <div className="px-3 py-1.5 font-mono font-bold text-slate-900 dark:text-white">
                  Page {page} of {totalPages}
                </div>

                <button
                  onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 font-bold flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
