'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarCheck, TrendingUp, History, Megaphone,
  ChevronRight, DollarSign, Percent, BarChart3,
  Filter, Search, AlertCircle, ArrowUpRight, ArrowDownRight,
  Building2, Clock, RefreshCw, SlidersHorizontal
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ─── Types ─────────────────────────────────────────────────────────────────
interface DividendRecord {
  ticker: string; companyName: string; sector: string;
  exDate: string; recordDate: string; paymentDate: string;
  amount: number; frequency: string; dividendYield: number;
  faceValue: number; type: string; announced: string;
}

interface DividendStock {
  quoteAsOf?: string; quoteStatus?: string;
  ticker: string; companyName: string; sector: string;
  currentPrice: number; dividendYield: number; annualDividend: number;
  payoutRatio: number; frequency: string; lastExDate: string;
  history: { year: number; amount: number }[];
}

interface ResultRecord {
  ticker: string; companyName: string; sector: string;
  amount: number; type: string; boardMeetingDate: string;
  nextExDate: string; announced: string;
}

type Tab = 'upcoming' | 'screener' | 'history' | 'results';

const SECTORS = ['All', 'Technology', 'Financials', 'Energy', 'Utilities', 'Consumer Staples', 'Metals & Mining'];

const SECTOR_COLORS: Record<string, string> = {
  Technology: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  Financials: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Energy: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  Utilities: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
  'Consumer Staples': 'bg-pink-500/15 text-pink-400 border-pink-500/20',
  'Metals & Mining': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  Financials2: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
};

const TYPE_COLORS: Record<string, string> = {
  Final: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
  Interim: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  Special: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `${Math.abs(days)}d ago`, urgent: false, past: true };
  if (days === 0) return { label: 'Today', urgent: true, past: false };
  if (days <= 7) return { label: `${days}d`, urgent: true, past: false };
  return { label: `${days}d`, urgent: false, past: false };
}

// ─── Sub-components ────────────────────────────────────────────────────────

function UpcomingTab() {
  const [data, setData] = useState<DividendRecord[]>([]);
  const [sector, setSector] = useState('All');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dividends?type=upcoming${sector !== 'All' ? `&sector=${sector}` : ''}`);
      const j = await r.json();
      setData(j.data || []);
    } catch { setData([]); }
    setLoading(false);
  }, [sector]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? data.filter(d => d.ticker.toLowerCase().includes(search.toLowerCase()) || d.companyName.toLowerCase().includes(search.toLowerCase()))
    : data;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company or ticker..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {SECTORS.map(s => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                sector === s
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                  : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
              }`}
            >{s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          <span className="ml-3 text-slate-500 text-sm font-semibold">Loading dividend calendar...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm font-semibold rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">No upcoming dividends found.</div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30">
                {['Company', 'Sector', 'Type', 'Ex-Date', 'Record Date', 'Payment Date', '₹/Share', 'Yield', 'Announced'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/50">
              {filtered.map((d, i) => {
                const exInfo = daysUntil(d.exDate);
                return (
                  <tr key={i} className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center">
                          <span className="text-[10px] font-black text-indigo-500">{d.ticker.slice(0, 2)}</span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{d.ticker}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{d.companyName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${SECTOR_COLORS[d.sector] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {d.sector}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${TYPE_COLORS[d.type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {d.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">{formatDate(d.exDate)}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                          exInfo.past ? 'bg-slate-500/10 text-slate-400'
                          : exInfo.urgent ? 'bg-rose-500/15 text-rose-400 animate-pulse'
                          : 'bg-emerald-500/10 text-emerald-500'
                        }`}>{exInfo.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">{formatDate(d.recordDate)}</td>
                    <td className="px-4 py-3.5 text-xs font-mono text-slate-500 dark:text-slate-400">{formatDate(d.paymentDate)}</td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{d.amount.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">{d.dividendYield.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-[10px] text-slate-400">{d.announced}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ScreenerTab() {
  const [data, setData] = useState<DividendStock[]>([]);
  const [sector, setSector] = useState('All');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DividendStock | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/dividends?type=screener${sector !== 'All' ? `&sector=${sector}` : ''}`);
      const j = await r.json();
      setData(j.data || []);
    } catch { setData([]); }
    setLoading(false);
  }, [sector]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Sector filter */}
      <div className="flex gap-1.5 flex-wrap">
        {SECTORS.map(s => (
          <button
            key={s}
            onClick={() => setSector(s)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              sector === s
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                : 'border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md'
            }`}
          >{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Ranked list */}
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Top Dividend Yield — NSE Stocks</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100/80 dark:border-slate-800/50">
                  {['#', 'Company', 'Sector', 'CMP', 'Yield', 'Ann. Div.', 'Payout', 'Frequency'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80 dark:divide-slate-800/40">
                {data.map((s, i) => (
                  <tr
                    key={s.ticker}
                    onClick={() => setSelected(s)}
                    className={`cursor-pointer transition-colors ${selected?.ticker === s.ticker ? 'bg-indigo-500/10 dark:bg-indigo-500/15' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'}`}
                  >
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono font-black ${i < 3 ? 'text-amber-500' : 'text-slate-400'}`}>#{i + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 dark:text-white text-xs">{s.ticker}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{s.companyName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold border ${SECTOR_COLORS[s.sector] || ''}`}>{s.sector}</span>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">₹{s.currentPrice.toLocaleString()}<div className="text-[10px] font-normal text-slate-500">{s.quoteAsOf ? `${new Date(s.quoteAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST · ${s.quoteStatus}` : 'Quote unavailable'}</div></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 rounded-full bg-indigo-100 dark:bg-indigo-950 w-16 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(s.dividendYield * 10, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">{s.dividendYield.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">₹{s.annualDividend}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{s.payoutRatio}%</td>
                    <td className="px-4 py-3 text-[10px] text-slate-400">{s.frequency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl p-5 space-y-4 relative overflow-hidden">
            {/* Corner glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {selected ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center shadow-xs">
                    <span className="text-xs font-black text-indigo-500">{selected.ticker.slice(0, 2)}</span>
                  </div>
                  <div>
                    <div className="font-black text-slate-900 dark:text-white text-sm">{selected.ticker}</div>
                    <div className="text-[10px] text-slate-400">{selected.companyName}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Div. Yield', value: `${selected.dividendYield.toFixed(1)}%`, color: 'text-indigo-600 dark:text-indigo-400' },
                    { label: 'Annual Div.', value: `₹${selected.annualDividend}`, color: 'text-emerald-600 dark:text-emerald-400' },
                    { label: 'Payout Ratio', value: `${selected.payoutRatio}%`, color: selected.payoutRatio > 80 ? 'text-rose-400' : 'text-slate-700 dark:text-slate-300' },
                    { label: 'CMP', value: `₹${selected.currentPrice.toLocaleString()}`, color: 'text-slate-700 dark:text-slate-300' },
                  ].map(m => (
                    <div key={m.label} className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50">
                      <div className="text-[10px] font-mono text-slate-400 mb-0.5">{m.label}</div>
                      <div className={`text-sm font-mono font-black ${m.color}`}>{m.value}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2">Dividend History (₹/share)</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={selected.history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 11 }}
                        formatter={(v: number) => [`₹${v}`, 'Dividend']}
                      />
                      <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                        {selected.history.map((_, idx) => (
                          <Cell key={idx} fill={idx === selected.history.length - 1 ? '#6366f1' : '#6366f140'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Last Ex-Date: <span className="text-slate-700 dark:text-slate-300 font-semibold font-mono">{formatDate(selected.lastExDate)}</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-center text-slate-400 gap-2">
                <DollarSign className="h-8 w-8 opacity-30" />
                <p className="text-xs font-semibold">Click a row to view detailed dividend history</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultsTab() {
  const [data, setData] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dividends?type=results')
      .then(r => r.json())
      .then(j => { setData(j.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-indigo-500" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {data.map((r, i) => (
        <div key={i} className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 shadow-xl hover:shadow-2xl hover:-translate-y-1 hover:border-emerald-500/40 transition-all duration-300 relative overflow-hidden group">
          {/* Subtle glowing corner */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center shadow-xs">
                  <span className="text-[10px] font-black text-indigo-500">{r.ticker.slice(0, 2)}</span>
                </div>
                <div>
                  <div className="font-black text-slate-900 dark:text-white text-sm">{r.ticker}</div>
                  <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{r.companyName}</div>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${TYPE_COLORS[r.type.includes('Final') ? 'Final' : r.type.includes('Special') ? 'Special' : 'Interim'] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                {r.type}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mb-3 p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              <span className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400">₹{r.amount.toFixed(2)}</span>
              <span className="text-xs text-slate-400 ml-1">per share</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Board Meeting</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatDate(r.boardMeetingDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><CalendarCheck className="h-3.5 w-3.5" />Ex-Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">{formatDate(r.nextExDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Announced</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{r.announced}</span>
              </div>
            </div>

            <div className="mt-3.5 pt-3 border-t border-slate-150/60 dark:border-slate-800/60">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${SECTOR_COLORS[r.sector] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>{r.sector}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DividendsScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [summary, setSummary] = useState({ upcomingCount: 0, avgYield: 0, resultsThisWeek: 0 });

  useEffect(() => {
    fetch('/api/dividends?type=summary')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setSummary(data);
      })
      .catch(console.error);
  }, []);

  const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
    { id: 'upcoming', label: 'Upcoming', icon: CalendarCheck, desc: 'Ex-dates & payment schedule' },
    { id: 'screener', label: 'Yield Screener', icon: TrendingUp, desc: 'Top yielding NSE stocks' },
    { id: 'results', label: 'Results', icon: Megaphone, desc: 'Recent board announcements' },
  ];

  return (
    <div className="space-y-6">
      {/* Elevated Header Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              <DollarSign className="h-3.5 w-3.5" />
              Corporate Dividend Engine
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight font-sans">
              Dividend Calendar & Yield Screener
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Track upcoming ex-dividend schedules, monitor corporate cash distributions, scan high-yield compounders, and inspect board resolution payouts.
            </p>
          </div>

          {/* Summary stats strip */}
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'Upcoming (30d)', value: summary.upcomingCount.toString(), icon: CalendarCheck, color: 'text-indigo-400', border: 'border-indigo-500/30', bg: 'bg-indigo-500/10' },
              { label: 'Avg Yield', value: `${summary.avgYield}%`, icon: Percent, color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10' },
              { label: 'Results This Week', value: summary.resultsThisWeek.toString(), icon: Megaphone, color: 'text-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/10' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-3 px-4 py-3 rounded-2xl ${s.bg} border ${s.border} backdrop-blur-md hover:-translate-y-0.5 transition-all shadow-sm`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <div className={`text-base font-mono font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
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

      {/* Tab Content */}
      <div className="animate-in fade-in duration-300">
        {activeTab === 'upcoming' && <UpcomingTab />}
        {activeTab === 'screener' && <ScreenerTab />}
        {activeTab === 'results' && <ResultsTab />}
      </div>
    </div>
  );
}
