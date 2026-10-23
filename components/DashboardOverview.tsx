'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, Activity, ShieldCheck, Star } from 'lucide-react';
import Link from './WorkspaceLink';
import type { Stock } from '../lib/stock-data';
import { isProviderStock, quoteStatusLabel } from '../lib/market-quote';

const rupees = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

export default function DashboardOverview({ stocks, watchlist, capital, loading, onSelectTicker }: {
  stocks: Stock[]; watchlist: string[]; capital: number; loading: boolean;
  onSelectTicker: (ticker: string) => void;
}) {
  const [positions, setPositions] = useState(3);
  const summary = useMemo(() => {
    const observed = stocks.filter(stock => isProviderStock(stock));
    const historyCount = observed.filter(stock => stock.history?.filter(day => Number.isFinite(day.close) && day.close > 0).length >= 21).length;
    const tracked = observed.filter(stock => watchlist.includes(stock.ticker))
      .sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
    const dates = observed.map(stock => Date.parse(stock.quoteAsOf!)).filter(Number.isFinite);
    return { observed, historyCount, tracked, latest: dates.length ? Math.max(...dates) : null };
  }, [stocks, watchlist]);
  const budget = Number.isFinite(capital) && capital > 0 ? capital : 0;

  return (
    <section aria-label="Research overview" className="overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/80 p-5 dark:border-slate-800/80 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Your research desk</p>
          </div>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900 dark:text-white">What needs your attention?</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Inspect a setup, plan its risk, then track the outcome.</p>
        </div>
        <Link href="/data-health" className="flex items-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition-all hover:scale-[1.02] shadow-2xs">
          <ShieldCheck size={15} className="text-indigo-500" />
          <span>Check data health</span>
          <ArrowRight size={14} />
        </Link>
      </div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-3">
        {/* Evidence coverage */}
        <div className="rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60">
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Activity size={16} className="text-indigo-500" />
            <span>Evidence coverage</span>
          </h3>
          <div className="mt-4 flex items-baseline gap-2">
            <strong className="text-3xl font-black font-mono text-slate-900 dark:text-white">
              {loading && !stocks.length ? '…' : summary.observed.length.toLocaleString('en-IN')}
            </strong>
            <span className="text-xs text-slate-500 font-mono">of {stocks.length.toLocaleString('en-IN')} loaded stocks</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Valid provider quotes; includes prior sessions.</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 p-0.5" role="progressbar" aria-label="Provider quote coverage" aria-valuemin={0} aria-valuemax={stocks.length || 1} aria-valuenow={summary.observed.length}>
            <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700 shadow-sm" style={{ width: `${stocks.length ? summary.observed.length / stocks.length * 100 : 0}%` }} />
          </div>
          <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{summary.historyCount} have at least 21 valid closing observations. This measures available history, not signal qualification.</p>
          <p className="mt-2 text-xs font-mono text-slate-500">Newest quote: {summary.latest ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(summary.latest) + ' IST' : 'Unavailable'}</p>
        </div>

        {/* Watchlist movers */}
        <div className="rounded-2xl p-4 bg-slate-50/60 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60 flex flex-col justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
              <Star size={16} className="text-amber-500" />
              <span>Watchlist movers</span>
            </h3>
            <p className="mt-1 text-xs text-slate-500">Largest absolute moves among loaded provider quotes.</p>
            <div className="mt-3 space-y-2">
              {summary.tracked.slice(0, 3).map(stock => (
                <button
                  key={stock.ticker}
                  type="button"
                  onClick={() => onSelectTicker(stock.ticker)}
                  className="flex w-full items-center justify-between rounded-xl bg-white dark:bg-slate-800/80 p-3 text-left hover:bg-indigo-50/70 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-400/50 transition-all hover:scale-[1.01] shadow-2xs group cursor-pointer"
                >
                  <span>
                    <span className="block text-xs font-black font-mono text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{stock.ticker}</span>
                    <span className="text-[11px] text-slate-500">{quoteStatusLabel(stock.quoteStatus)}</span>
                  </span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${
                    stock.changePercent >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}>
                    {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </button>
              ))}
              {!summary.tracked.length && (
                <p className="rounded-xl bg-white dark:bg-slate-800/60 p-3 text-xs text-slate-500 border border-slate-200/50 dark:border-slate-700/50">
                  {watchlist.length ? 'No valid provider quotes loaded for your tracked stocks yet.' : 'Save stocks to your watchlist to monitor their moves here.'}
                </p>
              )}
            </div>
          </div>
          <Link href="/watchlist" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500">
            Open watchlist ({watchlist.length}) <ArrowRight size={13} />
          </Link>
        </div>

        {/* Capital allocation planner */}
        <div className="rounded-2xl bg-indigo-50/80 p-4 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Capital allocation planner</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Split your {rupees(budget)} research budget.</p>
          <div className="mt-3 flex gap-2" role="group" aria-label="Number of positions">
            {[3, 4, 5].map(count => (
              <button
                key={count}
                type="button"
                aria-pressed={positions === count}
                onClick={() => setPositions(count)}
                className={`flex-1 rounded-xl px-2 py-2 text-xs font-black font-mono transition-all cursor-pointer ${
                  positions === count
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-[1.02]'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {count} stocks
              </button>
            ))}
          </div>
          <p className="mt-4 text-2xl font-black font-mono text-slate-900 dark:text-white">
            {rupees(budget / positions)} <span className="text-xs font-normal text-slate-500">per stock</span>
          </p>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Illustrative 1% total risk budget: {rupees(budget * .01)}, or {rupees(budget * .01 / positions)} per stock. Share counts depend on entry, stop distance, and fees.</p>
          <p className="mt-2 text-[11px] text-slate-500">Equal allocation before fees and whole-share rounding. Portfolio size alone does not establish better returns.</p>
        </div>
      </div>
      <nav aria-label="Research shortcuts" className="grid gap-3 border-t border-slate-200/80 p-5 dark:border-slate-800/80 sm:grid-cols-3 sm:p-6">
        {[
          { href: '/rapid-moves', title: 'Inspect 1–5 day setups', description: 'Read dated reasons, triggers and company hold evidence.' },
          { href: '/research-paper', title: 'Monitor radar paper plans', description: 'Review pending entries, marked equity and recorded exits.' },
          { href: '/results', title: 'Review strategy results', description: 'Inspect reconciled outcomes before trusting a forecast.' },
        ].map(item => (
          <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200/70 dark:border-slate-800/80 bg-white/50 dark:bg-slate-900/50 p-3.5 transition-all hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:-translate-y-0.5">
            <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-900 dark:text-white">
              {item.title}
              <ArrowRight size={14} className="text-indigo-500 group-hover:translate-x-1 transition-transform" />
            </span>
            <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
