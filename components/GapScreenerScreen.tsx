'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Flame,
  ShieldAlert,
  Search,
  RefreshCw,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  BarChart3,
  Layers,
  ChevronDown,
  ChevronUp,
  Download,
  Bell,
  BellRing,
  Calculator,
  Radio,
  FileText,
} from 'lucide-react';
import PositionSizingModal from './PositionSizingModal';
import WebhookConfigModal from './WebhookConfigModal';
import SessionReportModal from './SessionReportModal';
import GapCandlePayoffChart from './GapCandlePayoffChart';
import { calculateOptionEnvelope } from '../lib/option-chain';
import { gapSetupLabel } from '../lib/gap-types';
import type {
  GapItem,
  GapScreenSummary,
  GapDirection,
  GapFillStatus,
  GapSetupType,
} from '../lib/gap-types';
import { useStockContext } from '../context/StockContext';
import {
  playTargetChime,
  playStopLossChime,
  playGapFillChime,
  requestNotificationPermission,
  sendGapNotification,
  registerServiceWorker,
} from '../lib/sound-notifications';

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);

export default function GapScreenerScreen() {
  const [items, setItems] = useState<GapItem[]>([]);
  const [summary, setSummary] = useState<GapScreenSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // Filters
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'up' | 'down'>('all');
  const [magnitudeFilter, setMagnitudeFilter] = useState<'all' | 'extreme' | 'moderate' | 'mild'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unfilled' | 'filled' | 'partial'>('all');
  const [setupFilter, setSetupFilter] = useState<'all' | 'gap_and_go' | 'gap_fade' | 'breakaway'>('all');
  const [rvolFilter, setRvolFilter] = useState<'all' | 'high' | 'surge'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [audioAlerts, setAudioAlerts] = useState<boolean>(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedSizingItem, setSelectedSizingItem] = useState<GapItem | null>(null);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState<boolean>(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  const { setSelectedTicker } = useStockContext();
  const [alertSuccess, setAlertSuccess] = useState<Record<string, string>>({});

  const toggleAudioAlerts = async () => {
    if (!audioAlerts) {
      await requestNotificationPermission();
      await registerServiceWorker();
      playTargetChime();
      setAudioAlerts(true);
    } else {
      setAudioAlerts(false);
    }
  };

  const setAlert = async (ticker: string, threshold: number, label: string, direction?: 'above' | 'below') => {
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set', ticker, threshold, direction, label }),
      });
      if (res.ok) {
        if (audioAlerts) {
          if (label === 'Illustrative target') playTargetChime();
          else if (label === 'Gap Fill') playGapFillChime();
          else playStopLossChime();
        }
        sendGapNotification(`${ticker} ${label} Alert Set`, `Triggering at ${formatINR(threshold)}`);
        setAlertSuccess(prev => ({ ...prev, [ticker]: `${label} alert set at ${formatINR(threshold)}` }));
        setTimeout(() => setAlertSuccess(prev => {
          const next = { ...prev };
          delete next[ticker];
          return next;
        }), 4000);
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error || 'Sign in or enable personal access to set price alerts.');
      }
    } catch {
      alert('Failed to connect to alert service.');
    }
  };

  const exportToCsv = () => {
    if (!filteredItems.length) return;
    const headers = [
      'Symbol',
      'Name',
      'Sector',
      'Gap Percent',
      'Gap Amount (INR)',
      'Previous Close (INR)',
      'Open Price (INR)',
      'Current Price (INR)',
      'Fill Status',
      'Fill Percent',
      'Setup Type',
      'Target Price (INR)',
      'Stop Loss (INR)',
      'Reward/Risk Ratio',
      'Risk Rating',
      'Extended Gap Warning',
    ];
    const rows = filteredItems.map(item => [
      `"${item.symbol}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.sector}"`,
      item.gapPercent,
      item.gapAmount,
      item.previousClose,
      item.openPrice,
      item.currentPrice,
      item.fillStatus,
      item.fillPercent,
      gapSetupLabel(item.setupType),
      item.tradeLevels.targetPrice,
      item.tradeLevels.stopLossPrice,
      item.tradeLevels.rewardRiskRatio,
      item.riskRating,
      item.isExtendedGap ? 'YES' : 'NO',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nse_gap_screener_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchGaps = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gap-screener?limit=150');
      if (!res.ok) throw new Error('Failed to retrieve gap scan data');
      const data = await res.json();
      if (data.success) {
        setItems(data.items || []);
        setSummary(data.summary || null);
        setLastRefreshed(new Date(data.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } else {
        throw new Error(data.error || 'Server returned failure status');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load gap screener');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchGaps();
    }, 30_000);
    return () => clearInterval(timer);
  }, [autoRefresh]);

  const uniqueSectors = useMemo(() => {
    const set = new Set<string>();
    items.forEach(it => {
      if (it.sector) set.add(it.sector);
    });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Direction
      if (directionFilter === 'up' && item.direction !== 'GAP_UP') return false;
      if (directionFilter === 'down' && item.direction !== 'GAP_DOWN') return false;

      // Magnitude
      const absGap = Math.abs(item.gapPercent);
      if (magnitudeFilter === 'extreme' && absGap < 3.0) return false;
      if (magnitudeFilter === 'moderate' && (absGap < 1.0 || absGap >= 3.0)) return false;
      if (magnitudeFilter === 'mild' && absGap >= 1.0) return false;

      // Status
      if (statusFilter === 'filled' && item.fillStatus !== 'FILLED') return false;
      if (statusFilter === 'unfilled' && item.fillStatus !== 'UNFILLED') return false;
      if (statusFilter === 'partial' && item.fillStatus !== 'PARTIALLY_FILLED') return false;

      // Setup
      if (setupFilter === 'gap_and_go' && item.setupType !== 'GAP_AND_GO') return false;
      if (setupFilter === 'gap_fade' && item.setupType !== 'GAP_FADE') return false;
      if (setupFilter === 'breakaway' && item.setupType !== 'BREAKAWAY_GAP') return false;

      // RVOL
      if (rvolFilter === 'high' && (item.relativeVolume ?? 0) < 1.5) return false;
      if (rvolFilter === 'surge' && (item.relativeVolume ?? 0) < 2.5) return false;

      // Sector
      if (sectorFilter !== 'all' && item.sector !== sectorFilter) return false;

      // Search
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        return (
          item.symbol.toLowerCase().includes(query) ||
          item.name.toLowerCase().includes(query) ||
          item.sector.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [items, directionFilter, magnitudeFilter, statusFilter, setupFilter, rvolFilter, sectorFilter, search]);

  return (
    <main className="min-h-screen bg-slate-50/60 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 text-slate-800 dark:text-slate-100 transition-colors">
      {/* Header Section */}
      <header className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 backdrop-blur-md">
                <Zap size={13} className="text-indigo-500" />
                PROVIDER OHLC • TRACKED NSE SYMBOLS
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                SAVED BACKEND SNAPSHOT
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 dark:from-white dark:via-indigo-200 dark:to-slate-300 bg-clip-text text-transparent">
              Market Opening Gap Screener
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-3xl">
              Provider-backed opening gap observations for tracked symbols. Fill status reflects the reported daily range through the quote timestamp; extended gaps use a 3% screener threshold.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {lastRefreshed && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 hidden sm:inline">
                Calculated: {lastRefreshed}
              </span>
            )}
            <button
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                autoRefresh
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title="Reload the saved snapshot every 30 seconds"
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              {autoRefresh ? 'Auto reload ON' : 'Auto reload'}
            </button>
            <button
              onClick={toggleAudioAlerts}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                audioAlerts
                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
              title="Toggle audio alerts and browser notifications"
            >
              <Bell size={13} className={audioAlerts ? 'text-indigo-500' : ''} />
              {audioAlerts ? 'Audio Chimes ON' : 'Audio Chimes'}
            </button>
            <button
              onClick={() => setIsWebhookModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200 dark:border-slate-700 hover:border-indigo-500/30"
              title="Configure Discord, Slack, or Telegram webhook alerts"
            >
              <Radio size={13} />
              Webhooks
            </button>
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200 dark:border-slate-700 hover:border-indigo-500/30"
              title="View provider-backed observations for the latest quote session"
            >
              <FileText size={13} />
              Session Briefing
            </button>
            <button
              onClick={exportToCsv}
              disabled={loading || filteredItems.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-40 cursor-pointer border border-slate-200/80 dark:border-slate-700/80"
              title="Download filtered gaps as CSV"
            >
              <Download size={14} />
              Export CSV
            </button>
            <button
              onClick={fetchGaps}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-600/25 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Reload Snapshot'}
            </button>
          </div>
        </div>

        {/* Top KPI Summary Ribbon */}
        {summary && (
          <section className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {/* Card 1: Gap Up Count */}
            <div className="relative group rounded-3xl p-5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 backdrop-blur-xl shadow-lg shadow-emerald-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Gap-up observations
                </span>
                <span className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {summary.gapUpCount}
                </span>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {summary.maxGapUp ? `Max +${summary.maxGapUp.percent}% (${summary.maxGapUp.symbol})` : ''}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Opening drives above previous close
              </p>
            </div>

            {/* Card 2: Gap Down Count */}
            <div className="relative group rounded-3xl p-5 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/20 backdrop-blur-xl shadow-lg shadow-rose-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Gap-down observations
                </span>
                <span className="p-2 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
                  <ArrowDownRight size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {summary.gapDownCount}
                </span>
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {summary.maxGapDown ? `Max ${summary.maxGapDown.percent}% (${summary.maxGapDown.symbol})` : ''}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Opened below the previous close
              </p>
            </div>

            {/* Card 3: Gap & Go Momentum */}
            <div className="relative group rounded-3xl p-5 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-500/20 backdrop-blur-xl shadow-lg shadow-indigo-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Price beyond open
                </span>
                <span className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                  <Flame size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {summary.gapAndGoCount}
                </span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Rule-classified cases
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Current price remains beyond open in the gap direction
              </p>
            </div>

            {/* Card 4: Gap Fill Rate */}
            <div className="relative group rounded-3xl p-5 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 backdrop-blur-xl shadow-lg shadow-amber-500/5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Observed gap fills
                </span>
                <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Activity size={18} />
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {summary.totalGaps > 0
                    ? `${Math.round((summary.filledCount / summary.totalGaps) * 100)}%`
                    : '0%'}
                </span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {summary.filledCount} of {summary.totalGaps} filled
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Of observed gaps in this snapshot
              </p>
            </div>
          </section>
        )}
      </header>

      {/* Filter and Search Bar */}
      <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white/70 p-4 sm:p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/70">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter by Symbol, Name or Sector..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          {/* Direction Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 self-start sm:self-auto">
            <button
              onClick={() => setDirectionFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                directionFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All Gaps
            </button>
            <button
              onClick={() => setDirectionFilter('up')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                directionFilter === 'up'
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-emerald-600'
              }`}
            >
              <TrendingUp size={13} />
              Gap Up
            </button>
            <button
              onClick={() => setDirectionFilter('down')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                directionFilter === 'down'
                  ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                  : 'text-slate-500 hover:text-rose-600'
              }`}
            >
              <TrendingDown size={13} />
              Gap Down
            </button>
          </div>

          {/* Magnitude & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={magnitudeFilter}
              onChange={e => setMagnitudeFilter(e.target.value as any)}
              className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Any Magnitude</option>
              <option value="extreme">&gt; 3.0% (Extreme Chase)</option>
              <option value="moderate">1.0% – 3.0% (Optimal Drive)</option>
              <option value="mild">&lt; 1.0% (Mild Gap)</option>
            </select>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">Any Fill Status</option>
              <option value="unfilled">Unfilled (Open Runway)</option>
              <option value="partial">Partially Filled</option>
              <option value="filled">Fully Filled (Reverted)</option>
            </select>

            <select
              value={setupFilter}
              onChange={e => setSetupFilter(e.target.value as any)}
              className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Setup Types</option>
              <option value="gap_and_go">Price beyond open in gap direction</option>
              <option value="gap_fade">Price retraced across open</option>
              <option value="breakaway">Gap with high relative volume</option>
            </select>

            <select
              value={rvolFilter}
              onChange={e => setRvolFilter(e.target.value as any)}
              className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Volumes</option>
              <option value="high">&gt; 1.5x RVOL</option>
              <option value="surge">&gt; 2.5x RVOL (Surge)</option>
            </select>

            {uniqueSectors.length > 0 && (
              <select
                value={sectorFilter}
                onChange={e => setSectorFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Sectors ({uniqueSectors.length})</option>
                {uniqueSectors.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </section>

      {/* Main Results Table / Cards */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw size={32} className="animate-spin text-indigo-500 mb-3" />
          <p className="text-sm font-semibold text-slate-500">Scanning full NSE universe for opening gap patterns...</p>
        </div>
      ) : error ? (
        <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-6 text-center text-rose-600 dark:text-rose-400">
          <AlertTriangle size={24} className="mx-auto mb-2" />
          <p className="font-bold">{error}</p>
          <button
            onClick={fetchGaps}
            className="mt-3 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
          >
            Try Again
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
          <p className="text-sm font-semibold text-slate-500">No stocks match your specific gap filter criteria.</p>
          <button
            onClick={() => {
              setDirectionFilter('all');
              setMagnitudeFilter('all');
              setStatusFilter('all');
              setSetupFilter('all');
              setSearch('');
            }}
            className="mt-3 text-xs font-bold text-indigo-600 dark:text-indigo-400 underline"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-mono">
            <span>Showing {filteredItems.length} filtered opportunities</span>
            <span>Sorted by gap absolute magnitude</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredItems.map(item => {
              const isExpanded = expandedRow === item.symbol;
              const isBullish = item.direction === 'GAP_UP';

              return (
                <article
                  key={item.symbol}
                  className="rounded-3xl border border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-900/80 p-5 sm:p-6 shadow-sm backdrop-blur-xl hover:shadow-md transition-all duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Symbol & Name */}
                    <div className="flex items-start gap-4 min-w-[280px]">
                      <div
                        onClick={() => setSelectedTicker(item.symbol)}
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 font-black text-sm cursor-pointer transition-transform hover:scale-105 ${
                          isBullish
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {isBullish ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedTicker(item.symbol)}
                            className="text-base font-black hover:text-indigo-600 dark:hover:text-indigo-400 text-left cursor-pointer"
                          >
                            {item.symbol}
                          </button>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                            {item.sector}
                          </span>
                          {item.isExtendedGap && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <ShieldAlert size={11} />
                              &gt;3% CHASE RISK
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
                          {item.name}
                        </p>
                      </div>
                    </div>

                    {/* Gap Metrics Visual Ribbon */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Gap Size
                        </span>
                        <span
                          className={`text-sm sm:text-base font-black ${
                            isBullish
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.gapPercent >= 0 ? `+${item.gapPercent}%` : `${item.gapPercent}%`}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {formatINR(item.gapAmount)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Current Price
                        </span>
                        <span className="text-sm sm:text-base font-black">
                          {formatINR(item.currentPrice)}
                        </span>
                        <span
                          className={`text-[10px] font-bold block ${
                            item.currentChangePercent >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {item.currentChangePercent >= 0 ? '+' : ''}
                          {item.currentChangePercent}% 1D
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Fill Status
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-bold mt-0.5">
                          {item.fillStatus === 'FILLED' ? (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <CheckCircle2 size={12} /> 100% Filled
                            </span>
                          ) : item.fillStatus === 'PARTIALLY_FILLED' ? (
                            <span className="text-blue-600 dark:text-blue-400">
                              {item.fillPercent}% Filled
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              0% Unfilled (Runway)
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Prev Cl: {formatINR(item.previousClose)}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block uppercase">
                          Setup Type
                        </span>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          {gapSetupLabel(item.setupType)}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Volume / avg daily: {item.relativeVolume === null ? 'n/a' : `${item.relativeVolume}x`}
                        </span>
                      </div>
                    </div>

                    {/* Expand rule-level details */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setExpandedRow(isExpanded ? null : item.symbol)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            Less <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Rule Levels <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Trade Blueprint and Quant Context */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-slate-200/60 dark:border-slate-800/60">
                      {/* Interactive Gap Candlestick & Payoff Overlay Chart */}
                      <div className="mb-4">
                        <GapCandlePayoffChart
                          openPrice={item.openPrice}
                          currentPrice={item.currentPrice}
                          highPrice={item.highPrice}
                          lowPrice={item.lowPrice}
                          previousClose={item.previousClose}
                          targetPrice={item.tradeLevels.targetPrice}
                          stopLossPrice={item.tradeLevels.stopLossPrice}
                          gapPercent={item.gapPercent}
                          symbol={item.symbol}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Box 1: Trade Levels */}
                        <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                            <Target size={13} className="text-indigo-500" />
                            Illustrative Rule Levels
                          </h4>
                          <p className="mb-3 text-[10px] leading-relaxed text-slate-400">Fixed-rule scenarios from the observed bar; not backtested or executed.</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Entry Reference:</span>
                              <span className="font-bold">{formatINR(item.tradeLevels.entryPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Model target (+2.5%):</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatINR(item.tradeLevels.targetPrice)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Model stop:</span>
                              <span className="font-bold text-rose-600 dark:text-rose-400">
                                {formatINR(item.tradeLevels.stopLossPrice)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400">Rule-level ratio:</span>
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                {item.tradeLevels.rewardRiskRatio}:1
                              </span>
                            </div>
                          </div>

                          {/* Quick Alert Buttons */}
                          <div className="mt-3.5 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 grid grid-cols-3 gap-1.5">
                            <button
                              onClick={() => setAlert(item.ticker, item.tradeLevels.targetPrice, 'Illustrative target', 'above')}
                              className="py-1.5 px-1.5 rounded-xl text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Set an alert at this illustrative rule target"
                            >
                              <Bell size={11} /> Target
                            </button>
                            <button
                              onClick={() => setAlert(item.ticker, item.previousClose, 'Gap Fill', item.gapPercent >= 0 ? 'below' : 'above')}
                              className="py-1.5 px-1.5 rounded-xl text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title={`Set alert when price touches previous close (${formatINR(item.previousClose)}) to complete gap fill`}
                            >
                              <Target size={11} /> Fill (100%)
                            </button>
                            <button
                              onClick={() => setAlert(item.ticker, item.tradeLevels.stopLossPrice, 'Illustrative stop', 'below')}
                              className="py-1.5 px-1.5 rounded-xl text-[10px] font-bold bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
                              title="Set an alert at this illustrative rule stop"
                            >
                              <ShieldAlert size={11} /> Stop
                            </button>
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-2">
                            <button
                              onClick={() => setSelectedSizingItem(item)}
                              className="py-2 px-2.5 rounded-xl text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 active:scale-98 text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                              title="Calculate exact quantity, rupee risk, and concentration cap"
                            >
                              <Calculator size={13} /> Size Capital
                            </button>
                          </div>
                          {alertSuccess[item.ticker] && (
                            <div className="mt-2 py-1 px-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold text-center animate-fade-in">
                              ✓ {alertSuccess[item.ticker]}
                            </div>
                          )}
                        </div>

                        {/* Box 2: Intraday Range & Fill Dynamics */}
                        <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                            <Activity size={13} className="text-amber-500" />
                            Session Range & Dynamics
                          </h4>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Session Open:</span>
                              <span className="font-bold">{formatINR(item.openPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Day High:</span>
                              <span className="font-bold">{formatINR(item.highPrice)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Day Low:</span>
                              <span className="font-bold">{formatINR(item.lowPrice)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                              <span className="text-slate-400">Day Move from Open:</span>
                              <span
                                className={`font-bold ${
                                  item.dayChangeFromOpenPercent >= 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {item.dayChangeFromOpenPercent >= 0 ? '+' : ''}
                                {item.dayChangeFromOpenPercent}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Box 3: Quantitative Synthesis & Options Envelope */}
                        <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                              <ShieldAlert size={13} className="text-indigo-500" />
                              Quant Evaluation
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {item.analysisSummary}
                            </p>

                            {(() => {
                              try {
                                if (item.currentPrice > 0 && item.previousClose > 0) {
                                  const env = calculateOptionEnvelope(item.symbol, item.currentPrice, item.previousClose);
                                  return (
                                    <div className="mt-3 p-2.5 rounded-xl border border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs">
                                      <div className="flex items-center justify-between gap-1 mb-1">
                                        <span className="font-bold text-[10px] uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                                          1D IV Expected Move
                                        </span>
                                        <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                          ±{formatINR(env.dailyExpectedMoveINR)} ({env.dailyExpectedMovePercent}%)
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-tight">
                                        {env.suggestedOptionStrategy}
                                      </p>
                                    </div>
                                  );
                                }
                              } catch {
                                return null;
                              }
                              return null;
                            })()}
                          </div>

                          {item.isExtendedGap ? (
                            <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                              ⚠️ Axion Target Spec: Gap exceeds 3.0%. Model marks setup as `SKIPPED_GAP_TOO_LARGE` to prevent chasing morning extremes.
                            </div>
                          ) : (
                            <div className="mt-3 p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                              ✓ Normal Gap Envelope: Within safe 0.2%–3.0% quantitative execution boundary.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {selectedSizingItem && (
        <PositionSizingModal
          isOpen={!!selectedSizingItem}
          onClose={() => setSelectedSizingItem(null)}
          ticker={selectedSizingItem.ticker}
          symbol={selectedSizingItem.symbol}
          entryPrice={selectedSizingItem.tradeLevels.entryPrice}
          stopLossPrice={selectedSizingItem.tradeLevels.stopLossPrice}
          targetPrice={selectedSizingItem.tradeLevels.targetPrice}
        />
      )}

      <WebhookConfigModal
        isOpen={isWebhookModalOpen}
        onClose={() => setIsWebhookModalOpen(false)}
      />

      <SessionReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </main>
  );
}
