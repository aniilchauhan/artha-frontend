'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback } from 'react';
import {
  FileBarChart2, TrendingUp, TrendingDown, Minus, Calendar,
  Search, Filter, RefreshCw, ChevronDown, ChevronUp, ChevronRight,
  Trophy, AlertTriangle, CheckCircle, Building2, Clock,
  BarChart3, ArrowUpRight, ArrowDownRight, Zap, Target, Activity
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import ResearchPaperResultsScreen from './ResearchPaperResultsScreen';
import ResearchBacktests from './ResearchBacktests';

// ─── Types ─────────────────────────────────────────────────────────────────
interface QuarterlyResult {
  ticker: string; companyName: string; sector: string;
  quarter: string; resultDate: string; announced: string;
  revenue: number; revenuePrev: number; revenueYoY: number;
  netProfit: number; netProfitPrev: number; netProfitYoY: number;
  ebitda: number; ebitdaMargin: number;
  eps: number; epsEstimate?: number;
  beat: 'beat' | 'miss' | 'inline';
  revenueGrowthQoQ: number; revenueGrowthYoY: number;
  profitGrowthQoQ: number; profitGrowthYoY: number;
  nii?: number; grossMargin?: number;
  commentary: string;
}

interface UpcomingResult {
  ticker: string; companyName: string; sector: string;
  resultDate: string; quarter: string;
  estimatedRevenue?: number; estimatedEps?: number;
  daysUntil: number; announced: string;
}

type Tab = 'backtests' | 'paper' | 'earnings' | 'calendar';

const SECTORS = ['All', 'Technology', 'Financials', 'Energy', 'Auto', 'Pharmaceuticals', 'Consumer', 'Utilities'];
const BEAT_FILTERS = ['All', 'beat', 'miss', 'inline'] as const;

const BEAT_CONFIG = {
  beat: { label: 'Beat', icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', glow: 'shadow-emerald-500/10' },
  miss: { label: 'Miss', icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400', glow: 'shadow-rose-500/10' },
  inline: { label: 'In-Line', icon: CheckCircle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400', glow: 'shadow-amber-500/10' },
};

const SECTOR_COLORS: Record<string, string> = {
  Technology: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Financials: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Energy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Auto: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  Pharmaceuticals: 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  Consumer: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Utilities: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L Cr`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(2)}K Cr`;
  return `₹${n.toFixed(0)} Cr`;
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function GrowthBadge({ value, label }: { value: number; label: string }) {
  const pos = value >= 0;
  return (
    <div className="flex items-center gap-1">
      {pos
        ? <ArrowUpRight className="h-3 w-3 text-emerald-500" />
        : <ArrowDownRight className="h-3 w-3 text-rose-500" />}
      <span className={`text-xs font-bold ${pos ? 'text-emerald-500' : 'text-rose-500'}`}>
        {pos ? '+' : ''}{value.toFixed(1)}%
      </span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
}

// ─── ResultCard ─────────────────────────────────────────────────────────────
function ResultCard({ r, expanded, onToggle }: { r: QuarterlyResult; expanded: boolean; onToggle: () => void }) {
  const bc = BEAT_CONFIG[r.beat];
  const BeatIcon = bc.icon;
  const isBank = !!r.nii;

  const barData = [
    {
      name: 'YoY Prev',
      Revenue: r.revenueYoY / 1000,
      Profit: r.netProfitYoY / 1000,
    },
    {
      name: 'Prev Qtr',
      Revenue: r.revenuePrev / 1000,
      Profit: r.netProfitPrev / 1000,
    },
    {
      name: r.quarter,
      Revenue: r.revenue / 1000,
      Profit: r.netProfit / 1000,
    },
  ];

  return (
    <div className={`relative overflow-hidden rounded-3xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 shadow-xl group ${expanded ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-200/80 dark:border-slate-800/80'}`}>
      {/* Top accent bar */}
      <div className={`h-1.5 w-full ${r.beat === 'beat' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : r.beat === 'miss' ? 'bg-gradient-to-r from-rose-500 to-pink-400' : 'bg-gradient-to-r from-amber-400 to-yellow-300'}`} />

      {/* Subtle corner glow */}
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500 ${r.beat === 'beat' ? 'bg-emerald-500/10' : r.beat === 'miss' ? 'bg-rose-500/10' : 'bg-amber-500/10'}`} />

      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 shadow-xs">
              <span className="text-[10px] font-black text-indigo-500">{r.ticker.slice(0, 2)}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-slate-900 dark:text-white text-sm">{r.ticker}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">{r.quarter}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${SECTOR_COLORS[r.sector] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{r.sector}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{r.companyName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${bc.bg}`}>
              <BeatIcon className="h-3 w-3" />{bc.label}
            </span>
            <button onClick={onToggle} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
          {[
            { label: isBank ? 'Net Revenue' : 'Revenue', value: fmt(r.revenue), qoq: r.revenueGrowthQoQ, yoy: r.revenueGrowthYoY },
            { label: 'Net Profit', value: fmt(r.netProfit), qoq: r.profitGrowthQoQ, yoy: r.profitGrowthYoY },
            isBank
              ? { label: 'NII', value: fmt(r.nii!), qoq: 0, yoy: 0 }
              : { label: 'EBITDA', value: fmt(r.ebitda), qoq: 0, yoy: 0 },
            { label: 'EPS', value: `₹${r.eps.toFixed(2)}`, qoq: 0, yoy: 0, estimate: r.epsEstimate },
          ].map((m, mi) => (
            <div key={mi} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-700/40">
              <div className="text-[10px] font-mono text-slate-400 mb-0.5">{m.label}</div>
              <div className="text-sm font-mono font-black text-slate-900 dark:text-white mb-1.5">{m.value}</div>
              {mi <= 1 && (
                <div className="flex flex-col gap-0.5">
                  <GrowthBadge value={m.qoq} label="QoQ" />
                  <GrowthBadge value={m.yoy} label="YoY" />
                </div>
              )}
              {m.estimate && (
                <div className="text-[9px] font-mono text-slate-400">Est: ₹{m.estimate.toFixed(2)}</div>
              )}
              {mi === 2 && !isBank && r.ebitdaMargin > 0 && (
                <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400">{r.ebitdaMargin.toFixed(1)}% margin</div>
              )}
            </div>
          ))}
        </div>

        {/* Expanded: Chart + Commentary */}
        {expanded && (
          <div className="space-y-4 border-t border-slate-150/80 dark:border-slate-800/80 pt-4 mt-1 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bar Chart */}
              <div className="p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-150/60 dark:border-slate-800/60">
                <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Revenue vs Profit Trend (₹K Cr)</div>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={barData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                      formatter={(v: number, n: string) => [`₹${v.toFixed(1)}K Cr`, n]}
                    />
                    <Bar dataKey="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Commentary */}
              <div className="p-4 rounded-2xl bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <BarChart3 className="h-4 w-4 text-indigo-500" />
                    <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Management Commentary</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">{r.commentary}</p>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-indigo-500/10">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[10px] font-mono text-slate-400">Result Date: {fmtDate(r.resultDate)}</span>
                  <span className="text-[10px] font-mono font-bold text-indigo-500 ml-auto">{r.announced}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Upcoming Calendar ───────────────────────────────────────────────────────
function CalendarTab() {
  const [data, setData] = useState<UpcomingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sector, setSector] = useState('All');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch(`/api/results?type=upcoming${sector !== 'All' ? `&sector=${sector}` : ''}`, { signal: controller.signal })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Upcoming earnings data is unavailable.');
        if (!controller.signal.aborted) setData(payload.data || []);
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setData([]);
          setError(cause instanceof Error ? cause.message : 'Upcoming earnings data is unavailable.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [sector]);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Sector filter */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTORS.map(s => (
          <button key={s} onClick={() => setSector(s)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              sector === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20' : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
            }`}>{s}</button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>
      ) : data.length === 0 ? (
        <p role="status" className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No verified upcoming earnings dates are available.</p>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {data.map((r, i) => {
          const urgent = r.daysUntil <= 5;
          return (
            <div key={i} className={`relative overflow-hidden rounded-3xl border bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group ${urgent ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-slate-200/80 dark:border-slate-800/80'}`}>
              {/* Corner glow */}
              <div className={`absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500 ${urgent ? 'bg-amber-500/10' : 'bg-indigo-500/10'}`} />

              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center shadow-xs">
                      <span className="text-[10px] font-black text-indigo-500">{r.ticker.slice(0, 2)}</span>
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-white text-sm">{r.ticker}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">{r.companyName}</div>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-black border uppercase tracking-wider ${urgent ? 'bg-amber-500/15 border-amber-500/30 text-amber-500 animate-pulse' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500'}`}>
                    <Clock className="h-3 w-3" />
                    {r.daysUntil === 0 ? 'Today' : r.daysUntil === 1 ? 'Tomorrow' : `${r.daysUntil}d`}
                  </div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-lg font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50">{r.quarter}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-bold border ${SECTOR_COLORS[r.sector] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{r.sector}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Result Date</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{fmtDate(r.resultDate)}</span>
                  </div>
                  {r.estimatedRevenue && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" />Est. Revenue</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{fmt(r.estimatedRevenue)}</span>
                    </div>
                  )}
                  {r.estimatedEps && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" />Est. EPS</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{r.estimatedEps}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ─── Main Results Screen ─────────────────────────────────────────────────────
export default function ResultsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('backtests');
  const [results, setResults] = useState<QuarterlyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultsError, setResultsError] = useState('');
  const [sector, setSector] = useState('All');
  const [beatFilter, setBeatFilter] = useState<typeof BEAT_FILTERS[number]>('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [summary, setSummary] = useState({ beats: 0, misses: 0, inline: 0, total: 0 });
  const [showFilters, setShowFilters] = useState(false);

  const loadResults = useCallback(async () => {
    setLoading(true);
    setResultsError('');
    try {
      const params = new URLSearchParams({ type: 'recent' });
      if (sector !== 'All') params.set('sector', sector);
      if (beatFilter !== 'All') params.set('beat', beatFilter);
      const [resultsResponse, summaryResponse] = await Promise.all([
        fetch(`/api/results?${params}`),
        fetch('/api/results?type=summary'),
      ]);
      const [r, s] = await Promise.all([resultsResponse.json(), summaryResponse.json()]);
      if (!resultsResponse.ok || !summaryResponse.ok) {
        throw new Error(r.error || s.error || 'Company earnings data is unavailable.');
      }
      setResults(r.data || []);
      setSummary(s);
    } catch (cause) {
      setResults([]);
      setResultsError(cause instanceof Error ? cause.message : 'Company earnings data is unavailable.');
    }
    setLoading(false);
  }, [sector, beatFilter]);

  useEffect(() => {
    if (activeTab === 'earnings') void loadResults();
  }, [activeTab, loadResults]);

  const filtered = search
    ? results.filter(r => r.ticker.toLowerCase().includes(search.toLowerCase()) || r.companyName.toLowerCase().includes(search.toLowerCase()))
    : results;

  const beatRate = summary.total > 0 ? Math.round((summary.beats / summary.total) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Elevated Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-wider border border-blue-500/30">
              <FileBarChart2 className="h-3.5 w-3.5" />
              {activeTab === 'paper' ? 'Forward Paper Evidence' : activeTab === 'backtests' ? 'Historical Strategy Research' : 'Company Earnings'}
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight font-sans">
              {activeTab === 'paper' ? 'Radar Paper Results' : activeTab === 'backtests' ? 'Historical Strategy Backtests' : 'Company Earnings & Results'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              {activeTab === 'paper'
                ? 'Signal-linked research plans and reconciled paper outcomes. Daily OHLC observations do not prove real fills or establish a trading edge.'
                : activeTab === 'backtests'
                  ? 'Review historical portfolio backtests with modeled costs, drawdown, and trade-by-trade records. Historical simulation is separate from forward paper evidence.'
                : 'Quarterly earnings scorecard and upcoming dates appear here when verified source data is available.'}
            </p>
          </div>

          {/* Summary Stats Interactive Pills */}
          {activeTab === 'earnings' && !loading && !resultsError && <div className="flex gap-2.5 flex-wrap">
            {[
              { label: 'Beats', value: summary.beats, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', onClick: () => setBeatFilter('beat') },
              { label: 'Misses', value: summary.misses, color: 'text-rose-400', border: 'border-rose-500/30', bg: 'bg-rose-500/10', onClick: () => setBeatFilter('miss') },
              { label: 'In-Line', value: summary.inline, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10', onClick: () => setBeatFilter('inline') },
              { label: 'Beat Rate', value: `${beatRate}%`, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10', onClick: () => setBeatFilter('All') },
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
          </div>}
        </div>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Results views" className="flex flex-wrap gap-1.5 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md w-fit max-w-full">
        {[
          { id: 'backtests' as Tab, label: 'Backtest Research', icon: TrendingUp },
          { id: 'paper' as Tab, label: 'Radar Paper Ledger', icon: Activity },
          { id: 'earnings' as Tab, label: 'Company Earnings', icon: FileBarChart2 },
          { id: 'calendar' as Tab, label: 'Earnings Calendar', icon: Calendar },
        ].map(tab => (
          <button
            key={tab.id}
            id={`results-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="results-tabpanel"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <section id="results-tabpanel" role="tabpanel" aria-labelledby={`results-tab-${activeTab}`} tabIndex={0}>
      {activeTab === 'backtests' ? (
        <ResearchBacktests />
      ) : activeTab === 'paper' ? (
        <ResearchPaperResultsScreen />
      ) : activeTab === 'calendar' ? (
        <CalendarTab />
      ) : (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ticker or company..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm"
              />
            </div>

            {/* Beat filter */}
            <div className="flex gap-1.5 flex-wrap">
              {BEAT_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setBeatFilter(f)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all capitalize cursor-pointer ${
                    beatFilter === f
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                      : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
                  }`}
                >{f === 'All' ? 'All' : BEAT_CONFIG[f].label}</button>
              ))}
            </div>

            {/* Sector filter toggle */}
            <button
              onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${showFilters ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'}`}
            >
              <Filter className="h-3.5 w-3.5" />
              Sector
            </button>

            <button
              onClick={() => void loadResults()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Sector Filter */}
          {showFilters && (
            <div className="flex flex-wrap gap-1.5 p-3.5 rounded-3xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl animate-in fade-in duration-200 shadow-md">
              {SECTORS.map(s => (
                <button key={s} onClick={() => setSector(s)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    sector === s ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200/70 dark:border-slate-700/50 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/40 dark:bg-slate-800/30'
                  }`}>{s}</button>
              ))}
            </div>
          )}

          {/* Results List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="ml-3 text-sm text-slate-500 font-semibold">Loading results...</span>
            </div>
          ) : resultsError ? (
            <p role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{resultsError}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-slate-400 text-sm font-semibold rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">{search || sector !== 'All' || beatFilter !== 'All' ? 'No company earnings match these filters.' : 'No company earnings are available for this date range.'}</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {filtered.map(r => (
                <ResultCard
                  key={r.ticker}
                  r={r}
                  expanded={expandedId === r.ticker}
                  onToggle={() => setExpandedId(expandedId === r.ticker ? null : r.ticker)}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </section>
    </div>
  );
}
