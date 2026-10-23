'use client';

import React, { useState, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { getStockTrendSignal } from '../lib/stock-data';
import { useSignalWatchlist } from '../hooks/useSignalWatchlist';
import ResearchPaperAction from './ResearchPaperAction';
import { isProviderStock, quoteStatus, quoteStatusLabel } from '../lib/market-quote';

function currentQuoteStatus(stock: {
  quoteAsOf?: string;
  sessionStart?: string | null;
  sessionEnd?: string | null;
  dataSource?: 'provider' | 'simulated';
}) {
  if (stock.dataSource !== 'provider' || !stock.quoteAsOf) return 'simulated' as const;
  return quoteStatus({
    quoteAsOf: stock.quoteAsOf,
    sessionStart: stock.sessionStart ?? null,
    sessionEnd: stock.sessionEnd ?? null,
    dataSource: 'provider',
  });
}
import {
  Star, Trash2, ArrowUpRight, ArrowDownRight, Compass,
  Bell, X, Search, Sparkles, AlertCircle, TrendingUp, Check
} from 'lucide-react';

/* ─── Mini Sparkline for Watchlist Card ───────────────────── */
function MiniSparkline({ history, isUp }: { history: { close: number }[]; isUp: boolean }) {
  const prices = history?.slice(-15).map(h => h.close).filter(Boolean) ?? [];
  if (prices.length < 2) {
    return <div className="w-16 h-8 bg-slate-100 dark:bg-slate-800 rounded opacity-40" />;
  }
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const stroke = isUp ? '#10b981' : '#f43f5e';
  const fillColor = isUp ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="80" height="28" preserveAspectRatio="none" aria-hidden>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill={fillColor} />
      <polyline points={pts} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function WatchlistScreen() {
  const {
    stocks,
    watchlist,
    toggleWatchlist,
    setSelectedTicker,
    setActiveTab,
    thresholds,
    setThreshold,
  } = useStockContext();

  const [search, setSearch] = useState('');
  const signalWatchlist = useSignalWatchlist();

  // Find all stocks in watchlist
  const watchlistedStocks = useMemo(() => {
    return stocks.filter(stock => watchlist.includes(stock.ticker));
  }, [stocks, watchlist]);

  // Filter by search query if applicable
  const filteredStocks = useMemo(() => {
    if (!search.trim()) return watchlistedStocks;
    const q = search.toLowerCase();
    return watchlistedStocks.filter(
      s => s.ticker.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q))
    );
  }, [watchlistedStocks, search]);

  const quotedWatchlistedStocks = useMemo(() => watchlistedStocks.filter(stock => isProviderStock(stock)), [watchlistedStocks]);

  // Average 1D change over provider-backed quotes only.
  const avgChange = useMemo(() => {
    if (!quotedWatchlistedStocks.length) return null;
    return quotedWatchlistedStocks.reduce((a, s) => a + s.changePercent, 0) / quotedWatchlistedStocks.length;
  }, [quotedWatchlistedStocks]);

  return (
    <div id="watchlist-screen-container" className="relative space-y-6 animate-fade-up">
      {/* Decorative Orbs */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200/60 dark:border-amber-800/60 text-amber-500">
              <Star className="h-5 w-5 fill-amber-400 text-amber-500" />
            </span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                My Saved Watchlist
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Saved tickers, available quote context, and optional in-app threshold alerts
              </p>
            </div>
          </div>
        </div>

        {/* Stats Pill Dock */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          <div className="px-3.5 py-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 shadow-2xs flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold">Tracked:</span>
            <span className="text-xs font-mono font-black text-slate-800 dark:text-slate-200">
              {watchlistedStocks.length}
            </span>
          </div>

          {avgChange !== null && (
            <div className={`px-3.5 py-1.5 rounded-2xl border backdrop-blur-xl shadow-2xs flex items-center gap-1.5 text-xs font-mono font-bold ${
              avgChange >= 0
                ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-800/50 text-rose-600 dark:text-rose-400'
            }`}>
              <span>Avg 1D:</span>
              <span>{avgChange >= 0 ? '+' : ''}{avgChange.toFixed(2)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Search within watchlist if user has more than 3 stocks */}
      {watchlistedStocks.length > 3 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search watchlist symbols..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shadow-sm"
          />
        </div>
      )}

      {/* Empty State */}
      {watchlistedStocks.length === 0 ? (
        <div
          id="watchlist-empty-state"
          className="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 sm:p-14 text-center max-w-xl mx-auto space-y-5 shadow-xl"
        >
          <div className="mx-auto w-16 h-16 bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 text-amber-500 rounded-3xl flex items-center justify-center shadow-inner border border-amber-500/20">
            <Star className="h-8 w-8 text-amber-400 fill-amber-400/40" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-black text-slate-900 text-base dark:text-white font-mono">
              No tickers saved yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
              Click a star on a stock card to track its ticker. Saved Radar signal IDs appear here separately with their original conditions and expiry.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            id="btn-empty-watchlist-explore"
          >
            <Compass className="h-4 w-4" />
            <span>Discover Opportunities</span>
          </button>
        </div>
      ) : (
        /* Watchlist Cards Grid */
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4" id="watchlist-cards-grid">
          {filteredStocks.map(stock => {
            const isUp = stock.change >= 0;
            const hasProviderQuote = isProviderStock(stock);
            const freshness = currentQuoteStatus(stock);
            const thresholdValue = thresholds[stock.ticker];
            const signal = getStockTrendSignal(stock.history);

            const signalBadge =
              signal === 'BUY'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                : signal === 'SELL'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';

            return (
              <div
                key={stock.ticker}
                className="group relative rounded-3xl border border-slate-200/70 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-indigo-400/60 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col justify-between"
                id={`watchlist-card-${stock.ticker}`}
              >
                {/* Top Accent Line */}
                <div
                  className={`absolute top-0 left-0 right-0 h-1.5 ${
                    isUp ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-red-400'
                  }`}
                />

                <div>
                  {/* Top Bar */}
                  <div className="flex justify-between items-start gap-4">
                    <div
                      className="cursor-pointer group/ticker flex-1 min-w-0"
                      onClick={() => {
                        setSelectedTicker(stock.ticker);
                        setActiveTab('dashboard');
                      }}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="relative flex h-2 w-2">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        </span>
                        <h3 className="font-mono font-black text-slate-900 dark:text-white text-base tracking-tight group-hover/ticker:text-indigo-600 dark:group-hover/ticker:text-indigo-400 transition-colors">
                          {stock.ticker}
                        </h3>
                        <span className="text-[9px] font-sans font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/60">
                          WATCH
                        </span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${signalBadge}`}>
                          Rule trend: {signal}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">
                        {stock.name}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setSelectedTicker(stock.ticker);
                          setActiveTab('dashboard');
                        }}
                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 hover:scale-105 transition-all text-xs font-bold"
                        title="View Full Technicals"
                      >
                        Chart
                      </button>

                      <button
                        onClick={() => toggleWatchlist(stock.ticker)}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/70 dark:border-slate-800 transition-all cursor-pointer"
                        title="Remove from watchlist"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Price & Sparkline Row */}
                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                        {hasProviderQuote ? `₹${stock.currentPrice.toFixed(2)}` : 'Quote unavailable'}
                      </div>
                      {hasProviderQuote && <span className="mt-1 block text-[10px] text-slate-500">{quoteStatusLabel(freshness)}</span>}
                      {hasProviderQuote && <span className={`inline-flex items-center gap-0.5 text-xs font-bold font-mono px-2 py-0.5 rounded-full border mt-1 ${
                        isUp
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                      }`}>
                        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        <span>{isUp ? '+' : ''}{stock.change.toFixed(2)} ({stock.changePercent.toFixed(2)}%)</span>
                      </span>}
                    </div>

                    <div className="shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                      <MiniSparkline history={stock.history ?? []} isUp={isUp} />
                    </div>
                  </div>
                </div>

                {/* Threshold Alert Bar */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                    <Bell className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span>Alert Trigger:</span>
                  </div>

                  {thresholdValue !== undefined && thresholdValue !== null ? (
                    <div className="flex items-center justify-between gap-2 bg-indigo-50/90 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 px-2.5 py-1 rounded-xl shadow-2xs">
                      <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300">
                        ₹{thresholdValue.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setThreshold(stock.ticker, null)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer p-0.5 rounded"
                        title="Remove alert threshold"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      {/* Quick percentage buttons */}
                      {hasProviderQuote && <>
                        <button
                          onClick={() => setThreshold(stock.ticker, Math.round(stock.currentPrice * 1.05))}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Set alert at +5%"
                        >
                          +5%
                        </button>
                        <button
                          onClick={() => setThreshold(stock.ticker, Math.round(stock.currentPrice * 0.95))}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Set alert at -5%"
                        >
                          -5%
                        </button>
                      </>}

                      <input
                        type="number"
                        placeholder="₹ target"
                        className="w-24 px-2 py-1 text-xs bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono text-right text-slate-900 dark:text-white"
                        id={`input-threshold-${stock.ticker}`}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                            if (!isNaN(val) && val > 0) {
                              setThreshold(stock.ticker, val);
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById(`input-threshold-${stock.ticker}`) as HTMLInputElement;
                          if (input) {
                            const val = parseFloat(input.value);
                            if (!isNaN(val) && val > 0) {
                              setThreshold(stock.ticker, val);
                              input.value = '';
                            }
                          }
                        }}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <section aria-labelledby="saved-radar-signals-title" className="relative z-10 space-y-4 rounded-2xl border border-cyan-200/70 bg-cyan-50/40 p-4 sm:p-5 dark:border-cyan-900/70 dark:bg-cyan-950/20">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 id="saved-radar-signals-title" className="text-sm font-bold text-slate-900 dark:text-white">Dated Radar signals</h3>
            <p className="mt-1 text-xs text-slate-500">Saved immutable signal IDs, original price evidence, trigger conditions, and validity windows.</p>
          </div>
          <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-cyan-700 dark:border-cyan-900 dark:bg-slate-900 dark:text-cyan-300">{signalWatchlist.entries.length} saved</span>
        </div>

        {signalWatchlist.error && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{signalWatchlist.error}</p>}
        {signalWatchlist.loading ? <p className="text-xs text-slate-500">Loading saved signal IDs…</p> : signalWatchlist.entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-cyan-200 bg-white/70 p-4 text-xs text-slate-500 dark:border-cyan-900 dark:bg-slate-900/50">No dated signals saved. Save one from a Radar candidate to keep its original evidence and conditions here.</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {signalWatchlist.entries.map(entry => {
              const signal = entry.signal;
              if (!signal) return <article key={entry.signalId} className="rounded-xl border border-amber-200 bg-white p-4 text-xs dark:border-amber-900 dark:bg-slate-900">
                <p className="font-semibold">Signal record unavailable</p><p className="mt-1 text-slate-500">ID {entry.signalId} is preserved, but its archived snapshot could not be loaded.</p>
                <button type="button" disabled={signalWatchlist.busySignalId === entry.signalId} onClick={() => { void signalWatchlist.toggle(entry.signalId); }} className="mt-3 font-semibold text-rose-600 disabled:opacity-50">Remove saved ID</button>
              </article>;

              const paperEligibilityEndsAt = new Date(Date.parse(signal.dataCutoff) + 96 * 60 * 60 * 1000);
              const expired = paperEligibilityEndsAt.getTime() < Date.now();
              const planDays = Math.max(1, Math.min(5, signal.conditions.reviewSessions));
              const currentQuote = stocks.find(stock => stock.ticker.replace(/\.NS$/i, '') === signal.symbol);
              const currentQuotePrice = currentQuote && isProviderStock(currentQuote) && currentQuoteStatus(currentQuote) === 'recent'
                ? currentQuote.currentPrice : null;
              const triggerDistance = currentQuotePrice !== null
                ? (signal.conditions.entryTrigger / currentQuotePrice - 1) * 100
                : null;
              return <article key={entry.signalId} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div><h4 className="font-bold text-slate-900 dark:text-white">{signal.symbol} · {signal.companyName}</h4><p className="mt-0.5 text-[10px] text-slate-500">Observed {new Date(signal.dataCutoff).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p></div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${expired ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'}`}>{expired ? 'Observation window expired' : 'Within stored window'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  {[
                    ['Observed price', signal.referencePrice],
                    ['Entry trigger', signal.conditions.entryTrigger],
                    ['Target scenario', signal.conditions.targetScenario],
                    ['Invalidation', signal.conditions.invalidationStop],
                  ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/60"><span className="block text-[10px] text-slate-500">{label}</span><strong className="mt-1 block">₹{Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></div>)}
                </div>
                <p className="text-[10px] text-slate-500">{triggerDistance === null
                  ? 'Trigger distance unavailable: no recent provider quote.'
                  : `Current quote ₹${currentQuotePrice?.toLocaleString('en-IN', { maximumFractionDigits: 2 })} · ${triggerDistance >= 0 ? `${triggerDistance.toFixed(2)}% to entry trigger` : `${Math.abs(triggerDistance).toFixed(2)}% above entry trigger`}`}</p>
                <p className="text-[10px] text-slate-500">Signal ID {signal.id} · Paper-proposal eligibility until {paperEligibilityEndsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} · {signal.quoteStatus} quote</p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {expired ? <p className="text-xs text-slate-500">This record is kept for history. Create a paper plan only from a recent eligible signal.</p> : <ResearchPaperAction signalId={signal.id} days={planDays} />}
                  <button type="button" disabled={signalWatchlist.busySignalId === signal.id} onClick={() => { void signalWatchlist.toggle(signal.id); }} className="text-xs font-semibold text-rose-600 disabled:opacity-50">Remove</button>
                </div>
              </article>;
            })}
          </div>
        )}
      </section>
    </div>
  );
}
