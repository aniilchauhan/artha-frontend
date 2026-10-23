'use client';


import { axionFetch as fetch, axionAppPath } from '../lib/in-process';
import React, { useState, useEffect, useMemo } from 'react';
import Link from './WorkspaceLink';
import PredictionWorkbench from './PredictionWorkbench';
import {
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Sparkles,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Columns,
  Grid,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  BarChart3,
  SlidersHorizontal,
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { indiaDay } from '../lib/market-quote';
import type { DailyPredictionItem } from '../app/api/predictions/daily/route';

interface DailyPredictionsData {
  success: boolean;
  universe?: 'curated' | 'full';
  selectedDate: string;
  availableDates: string[];
  page?: number;
  totalPages?: number;
  limit?: number;
  sectors?: string[];
  summary: {
    total: number;
    worked: number;
    failed: number;
    pending: number;
    winRatePct: number;
    avgWinReturnPct: number;
    avgLossReturnPct: number;
  };
  predictions: DailyPredictionItem[];
}

export default function DailyPredictionsScreen() {
  const { setSelectedTicker } = useStockContext();
  const [data, setData] = useState<DailyPredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(indiaDay(new Date()));
  const [universe, setUniverse] = useState<'curated' | 'full'>('full');
  const [page, setPage] = useState<number>(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'worked' | 'failed' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'split' | 'grid'>('split');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSector, setSelectedSector] = useState('ALL');
  const [potentialFilter, setPotentialFilter] = useState<'all' | 'scalp' | 'swing' | 'runner'>('all');

  // Fetch predictions for the selected date and universe
  const fetchPredictions = async (
    date: string,
    univ: 'curated' | 'full' = universe,
    currPage: number = page,
    search: string = searchQuery,
    sec: string = selectedSector,
    status: string = filterStatus,
    pot: string = potentialFilter
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        date,
        universe: univ,
      });
      if (pot && pot !== 'all') params.set('potential', pot);
      if (univ === 'full') {
        params.set('page', String(currPage));
        params.set('limit', '30');
        if (search.trim()) params.set('search', search.trim());
        if (sec && sec !== 'ALL') params.set('sector', sec);
        if (status && status !== 'all') params.set('status', status);
      }
      const res = await fetch(`/api/predictions/daily?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch predictions');
      setData(json);
      if (json.selectedDate) setSelectedDate(json.selectedDate);
    } catch (err: any) {
      setError(err.message || 'Failed to load daily prediction records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions(selectedDate, universe, page, searchQuery, selectedSector, filterStatus, potentialFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, universe, page, selectedSector, filterStatus, potentialFilter]);

  // Debounced search for full universe
  useEffect(() => {
    if (universe !== 'full') return;
    const timer = setTimeout(() => {
      setPage(1);
      fetchPredictions(selectedDate, universe, 1, searchQuery, selectedSector, filterStatus, potentialFilter);
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Unique sectors for filter dropdown
  const sectors = useMemo(() => {
    if (data?.sectors && data.sectors.length > 0) {
      return data.sectors.filter(s => s !== 'ALL');
    }
    if (!data?.predictions) return [];
    const set = new Set<string>();
    data.predictions.forEach(p => {
      if (p.sector) set.add(p.sector);
    });
    return Array.from(set).sort();
  }, [data?.sectors, data?.predictions]);

  // Filtered list
  const filteredPredictions = useMemo(() => {
    if (!data?.predictions) return [];
    if (universe === 'full') {
      return data.predictions;
    }
    return data.predictions.filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (selectedSector !== 'ALL' && item.sector !== selectedSector) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTicker = item.ticker.toLowerCase().includes(q);
        const matchCompany = item.companyName?.toLowerCase().includes(q) ?? false;
        const matchModel = item.model.toLowerCase().includes(q);
        if (!matchTicker && !matchCompany && !matchModel) return false;
      }
      return true;
    });
  }, [data?.predictions, universe, filterStatus, selectedSector, searchQuery]);

  // Separate worked and failed for the split view
  const workedPredictions = useMemo(() => {
    return filteredPredictions.filter(p => p.status === 'worked');
  }, [filteredPredictions]);

  const failedPredictions = useMemo(() => {
    return filteredPredictions.filter(p => p.status === 'failed');
  }, [filteredPredictions]);

  const pendingPredictions = useMemo(() => {
    return filteredPredictions.filter(p => p.status === 'pending');
  }, [filteredPredictions]);

  // Format date helper
  const formatDateLabel = (isoDate: string) => {
    try {
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950/70 p-3 sm:p-6 lg:p-8 space-y-6">
      <PredictionWorkbench />
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl p-6 sm:p-8 shadow-sm">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20">
                <Sparkles className="w-3.5 h-3.5" />
                Prediction Outcome Auditor
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                DAILY VERIFICATION
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Prediction Verification Hub
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
              Transparent daily record showing exactly which AI model trade setups worked (target reached) and which did not (stop loss triggered or failed).
            </p>
          </div>

          {/* Date Selector & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100/90 dark:bg-slate-800/80 px-3 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={() => fetchPredictions(selectedDate)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition"
              title="Refresh day's predictions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ─── Universe Switcher (Curated vs Full Universe) ─── */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
            <button
              onClick={() => { setUniverse('curated'); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                universe === 'curated'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Curated AI Basket (10 Setups)</span>
            </button>
            <button
              onClick={() => { setUniverse('full'); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                universe === 'full'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Full Universe (5,055 Stocks)</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-cyan-400 text-slate-950">
                ACTIVE
              </span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>
              {universe === 'full'
                ? 'Displaying all listed Indian equities (NSE & BSE) with quantitative technical target/stop analysis'
                : 'Displaying top liquid F&O candidates vetted by LightGBM & CatBoost models'}
            </span>
          </div>
        </div>

        {/* Quick Date Pills */}
        {data?.availableDates && data.availableDates.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 mr-1">
              Select Session:
            </span>
            {data.availableDates.map(d => {
              const isSelected = d === selectedDate;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {formatDateLabel(d)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Metric Scorecards ─── */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Win Rate Card */}
          <div className="col-span-2 sm:col-span-1 rounded-2xl border border-indigo-200/70 dark:border-indigo-500/20 bg-linear-to-br from-indigo-500/10 via-white/80 to-purple-500/5 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-purple-950/20 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Accuracy / Win Rate
              </span>
              <Percent className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {data.summary.winRatePct}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({data.summary.worked} of {data.summary.worked + data.summary.failed})
              </span>
            </div>
            <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, data.summary.winRatePct)}%` }}
              />
            </div>
          </div>

          {/* Worked Predictions Card */}
          <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-white/80 to-emerald-500/5 dark:from-emerald-950/40 dark:via-slate-900/60 dark:to-emerald-950/20 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Predictions Worked
              </span>
              <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-emerald-700 dark:text-emerald-300">
                {data.summary.worked}
              </span>
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Target Hit
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400/90 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Avg Return: +{data.summary.avgWinReturnPct}%
            </p>
          </div>

          {/* Failed Predictions Card */}
          <div className="rounded-2xl border border-rose-200/80 dark:border-rose-500/20 bg-linear-to-br from-rose-500/10 via-white/80 to-rose-500/5 dark:from-rose-950/40 dark:via-slate-900/60 dark:to-rose-950/20 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Did Not Work
              </span>
              <div className="p-1 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-rose-700 dark:text-rose-300">
                {data.summary.failed}
              </span>
              <span className="text-xs font-medium text-rose-600 dark:text-rose-400">
                Stop Breached
              </span>
            </div>
            <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400/90 flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              Avg Return: {data.summary.avgLossReturnPct}%
            </p>
          </div>

          {/* Pending / In-flight Card */}
          <div className="rounded-2xl border border-amber-200/80 dark:border-amber-500/20 bg-linear-to-br from-amber-500/10 via-white/80 to-amber-500/5 dark:from-amber-950/40 dark:via-slate-900/60 dark:to-amber-950/20 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Pending / Active
              </span>
              <div className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-300">
                {data.summary.pending}
              </span>
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                In Session
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Awaiting close evaluation
            </p>
          </div>

          {/* Total Evaluated Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-4 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Total Predictions
              </span>
              <BarChart3 className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {data.summary.total}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Evaluated on {formatDateLabel(selectedDate)}
            </p>
          </div>
        </div>
      )}

      {/* ─── Filter & View Mode Controls ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/50 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            All ({data?.predictions?.length || 0})
          </button>
          <button
            onClick={() => setFilterStatus('worked')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              filterStatus === 'worked'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Worked ({data?.summary?.worked || 0})
          </button>
          <button
            onClick={() => setFilterStatus('failed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              filterStatus === 'failed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Didn&apos;t Work ({data?.summary?.failed || 0})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
              filterStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending ({data?.summary?.pending || 0})
          </button>
        </div>

        {/* Search, Sector, and Split/Grid Switcher */}
        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative grow sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100/80 dark:bg-slate-800/80 pl-8 pr-3 py-1.5 rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-slate-200/60 dark:border-slate-700/60"
            />
          </div>

          {/* Sector Filter */}
          {sectors.length > 0 && (
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              className="bg-slate-100/80 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sectors</option>
              {sectors.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}

          {/* View Toggle */}
          <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('split')}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'split'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Side-by-Side Comparison"
            >
              <Columns className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Multi-Horizon Upside Potential Filter Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-linear-to-r from-indigo-50/80 via-white/80 to-purple-50/80 dark:from-slate-900/60 dark:via-slate-900/40 dark:to-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Potential Upside:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setPotentialFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                potentialFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800'
              }`}
            >
              All Upsides (1% – 25%+)
            </button>
            <button
              onClick={() => setPotentialFilter('scalp')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                potentialFilter === 'scalp'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-blue-700 dark:text-blue-300 bg-blue-50/80 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40'
              }`}
            >
              <span>⚡ Quick Scalps (1% – 3%)</span>
            </button>
            <button
              onClick={() => setPotentialFilter('swing')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                potentialFilter === 'swing'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 dark:text-purple-300 bg-purple-50/80 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40'
              }`}
            >
              <span>🎯 Swing Targets (4% – 9%)</span>
            </button>
            <button
              onClick={() => setPotentialFilter('runner')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                potentialFilter === 'runner'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-700 dark:text-amber-300 bg-amber-50/80 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40'
              }`}
            >
              <span>🚀 Extended Runners (10% – 25%+)</span>
            </button>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          Multi-Tier Targets: T1 Intraday · T2 Swing · T3 Runner
        </span>
      </div>

      {/* ─── Content View ─── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Evaluating day predictions & outcomes...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-8 text-center">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-rose-800 dark:text-rose-200">Unable to load predictions</h3>
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
          <button
            onClick={() => fetchPredictions(selectedDate)}
            className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : filteredPredictions.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3 text-indigo-500">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            {data?.summary.total === 0
              ? `No recorded prediction journals for ${selectedDate}`
              : 'No predictions matching current filters'}
          </h3>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {data?.summary.total === 0
              ? 'Daily prediction journals are committed following the closing bell after verifying official settlement prices. Try selecting an earlier trading session from the date dropdown above, or check live model candidates in the Stock AI tab.'
              : 'Try clearing your search query, adjusting your sector selection, or resetting the outcome status filter.'}
          </p>
          {data?.summary.total === 0 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link
                href={axionAppPath("/ai")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Go to Stock AI Candidates
              </Link>
            </div>
          )}
        </div>
      ) : viewMode === 'split' ? (
        /* ─── Side-by-Side Comparison Layout ─── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column: WORKED */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Predictions That Worked
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-extrabold">
                    {workedPredictions.length}
                  </span>
                </h2>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Target Reached / Winning
              </span>
            </div>

            {workedPredictions.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-emerald-300/40 dark:border-emerald-800/40 text-center text-xs text-slate-500">
                No winning predictions matching the current filter.
              </div>
            ) : (
              <div className="space-y-3.5">
                {workedPredictions.map(item => (
                  <PredictionCard key={item.id} item={item} onSelectTicker={setSelectedTicker} />
                ))}
              </div>
            )}
          </div>

          {/* Right Column: DID NOT WORK & PENDING */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Predictions That Did Not Work
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-extrabold">
                    {failedPredictions.length}
                  </span>
                </h2>
              </div>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Stop Loss Triggered / Missed
              </span>
            </div>

            {failedPredictions.length === 0 ? (
              <div className="p-8 rounded-3xl border border-dashed border-rose-300/40 dark:border-rose-800/40 text-center text-xs text-slate-500">
                No failed predictions on this session!
              </div>
            ) : (
              <div className="space-y-3.5">
                {failedPredictions.map(item => (
                  <PredictionCard key={item.id} item={item} onSelectTicker={setSelectedTicker} />
                ))}
              </div>
            )}

            {/* In-flight / Pending Section */}
            {pendingPredictions.length > 0 && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-3 w-3 rounded-full bg-amber-500 animate-pulse" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      In-Progress / Pending Verification
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-extrabold">
                        {pendingPredictions.length}
                      </span>
                    </h3>
                  </div>
                </div>
                <div className="space-y-3.5">
                  {pendingPredictions.map(item => (
                    <PredictionCard key={item.id} item={item} onSelectTicker={setSelectedTicker} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ─── Unified Grid View ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPredictions.map(item => (
            <PredictionCard key={item.id} item={item} onSelectTicker={setSelectedTicker} />
          ))}
        </div>
      )}

      {/* ─── Pagination Controls (Full Universe Mode) ─── */}
      {universe === 'full' && data?.totalPages && data.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing Page <strong className="text-slate-800 dark:text-slate-100">{data.page || page}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-100">{data.totalPages}</strong> (
            <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{data.summary.total}</strong> total stocks scanned)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setPage(1); }}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              First
            </button>
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); }}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Previous
            </button>

            <span className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold bg-indigo-600 text-white shadow-xs">
              {page}
            </span>

            <button
              onClick={() => { setPage(p => Math.min(data.totalPages || 1, p + 1)); }}
              disabled={page >= (data.totalPages || 1) || loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Next
            </button>
            <button
              onClick={() => { setPage(data.totalPages || 1); }}
              disabled={page >= (data.totalPages || 1) || loading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              Last ({data.totalPages})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponent: Prediction Card ───────────────────────────────────────────

function PredictionCard({
  item,
  onSelectTicker,
}: {
  item: DailyPredictionItem;
  onSelectTicker: (ticker: string) => void;
}) {
  const isWorked = item.status === 'worked';
  const isFailed = item.status === 'failed';
  const isPending = item.status === 'pending';

  const returnVal = item.returnPct ?? 0;
  const isPositive = returnVal >= 0;

  return (
    <div
      className={`group relative rounded-3xl border transition-all duration-300 p-4 sm:p-5 overflow-hidden backdrop-blur-md shadow-xs hover:shadow-md ${
        isWorked
          ? 'border-emerald-200/80 dark:border-emerald-500/25 bg-white/85 dark:bg-slate-900/80 hover:border-emerald-400 dark:hover:border-emerald-500/40'
          : isFailed
          ? 'border-rose-200/80 dark:border-rose-500/25 bg-white/85 dark:bg-slate-900/80 hover:border-rose-400 dark:hover:border-rose-500/40'
          : 'border-amber-200/80 dark:border-amber-500/25 bg-white/85 dark:bg-slate-900/80 hover:border-amber-400'
      }`}
    >
      {/* Top Accent Line */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          isWorked
            ? 'bg-linear-to-r from-emerald-500 to-teal-400'
            : isFailed
            ? 'bg-linear-to-r from-rose-500 to-amber-500'
            : 'bg-linear-to-r from-amber-400 to-yellow-400'
        }`}
      />

      {/* Header: Ticker, Status Badge, Return Pill */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTicker(item.ticker)}
              className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center gap-1 cursor-pointer"
            >
              {item.ticker}
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
            </button>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              NSE
            </span>
            {item.direction && (
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  item.direction === 'LONG'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                }`}
              >
                {item.direction}
              </span>
            )}
          </div>
          {item.companyName && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
              {item.companyName} {item.sector ? `· ${item.sector}` : ''}
            </p>
          )}
        </div>

        {/* Outcome Badge */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              isWorked
                ? 'bg-emerald-100/80 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/50 dark:border-emerald-500/30'
                : isFailed
                ? 'bg-rose-100/80 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300/50 dark:border-rose-500/30'
                : 'bg-amber-100/80 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300/50 dark:border-amber-500/30'
            }`}
          >
            {isWorked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
            {isFailed && <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
            {isPending && <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />}
            {isWorked ? 'WORKED' : isFailed ? 'DID NOT WORK' : 'IN PROGRESS'}
          </span>

          {item.returnPct !== undefined && (
            <span
              className={`text-xs font-extrabold flex items-center gap-0.5 ${
                isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {isPositive ? '+' : ''}{item.returnPct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* ─── Multi-Tier Profit Target Ladder ─── */}
      <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/90 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
            <span>Entry Zone:</span>
            <span className="font-mono text-slate-900 dark:text-white">₹{item.entryPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {item.rewardRiskRatio && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                R:R {item.rewardRiskRatio}:1
              </span>
            )}
            {item.maxPotentialPct && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                Recorded threshold {item.maxPotentialPct}%
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {(item.targetTiers || []).map(tier => <div key={tier.tier} className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-800">
            <p className="font-semibold">{tier.label}</p><p className="mt-1">₹{tier.price.toLocaleString('en-IN')} · {tier.returnPct}% from reference</p>
          </div>)}
        </div>
        <p className="mt-2 text-xs text-slate-500">{item.stopPrice !== null ? `Recorded stop: ₹${item.stopPrice.toLocaleString('en-IN')}` : 'No recorded stop or executed entry; this is an observation.'}</p>
      </div>

      {/* Actual Peak/Exit reached */}
      {item.actualPrice && (
        <div className="mt-2.5 flex items-center justify-between text-xs px-1">
          <span className="text-slate-500 dark:text-slate-400">
            {item.direction === 'OBSERVATION' ? 'Observed session close:' : 'Recorded exit price:'}
          </span>
          <span className="font-bold text-slate-900 dark:text-white">
            ₹{item.actualPrice.toLocaleString('en-IN')}
          </span>
        </div>
      )}

      {/* Outcome Reason & Explanation */}
      <div
        className={`mt-3 p-3 rounded-2xl text-xs leading-relaxed ${
          isWorked
            ? 'bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-900/30'
            : isFailed
            ? 'bg-rose-50/80 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 border border-rose-100 dark:border-rose-900/30'
            : 'bg-amber-50/80 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border border-amber-100 dark:border-amber-900/30'
        }`}
      >
        <span className="font-bold block mb-0.5">
          {isWorked ? 'Why it worked:' : isFailed ? 'Why it failed:' : 'Status detail:'}
        </span>
        {item.outcomeReason}
      </div>

      <details className="mt-3 rounded-xl border border-slate-200 p-3 text-xs dark:border-slate-800">
        <summary className="cursor-pointer font-semibold">Prediction evidence and invalidation</summary>
        <p className="mt-2">Issued: {item.issuedAt || 'not recorded'} · history cutoff: {item.dataAsOf || 'not recorded'}</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">{(item.measuredReasons || ['Supporting indicator values were not saved.']).map(reason => <li key={reason}>{reason}</li>)}</ul>
        <p className="mt-2">Invalidation: {item.invalidation || 'Not recorded.'}</p>
        <p className="mt-2 text-slate-500">Company evidence and other gaps: {(item.evidenceMissing || ['Company information was not embedded.']).join('; ')}</p>
        <p className="mt-2 text-slate-500">Review current company evidence in stock research before extending a hold. A high-touch observation is not a filled-trade profit.</p>
      </details>

      {/* Footer: Conviction Score & Model Provenance */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
          <span>{item.model}</span>
        </div>
        <div className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
          <span>Recorded score:</span>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{item.convictionScore === null || item.convictionScore === undefined ? 'Unavailable' : `${item.convictionScore}% (uncalibrated)`}</span>
        </div>
      </div>
    </div>
  );
}
