'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from '../lib/workspace-router';
import { ArrowRight, ChevronLeft, ChevronRight, Layers, Loader2, Pause, Play, RefreshCw, Search, ShieldAlert, TrendingUp, Zap } from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { useSmallCapScan } from '../hooks/useSmallCapScan';
import { buildSmallCapAiSummary, buildSmallCapUniverseStats, evaluateSmallCapBacktest, evaluateSmallCapHealth, isKnownSmallCap, scoreSmallCapCandidate } from '../lib/small-cap-scoring';
import { quoteStatusLabel, withCurrentStatus } from '../lib/market-quote';
import ForwardPicks from './ForwardPicks';
import FrameworkResearchPanel from './FrameworkResearchPanel';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';
import type { SmallCapStock } from '../lib/small-cap-types';

const PAGE_SIZE = 10;
const number = (value: number) => value.toLocaleString('en-IN');
const time = (value: string | null | undefined) => value && Number.isFinite(Date.parse(value))
  ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Unavailable';

function Metric({
  label,
  value,
  detail,
  onClick,
  active,
}: {
  label: string;
  value: string;
  detail: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const isClickable = Boolean(onClick);
  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition-all ${
        isClickable ? 'cursor-pointer hover:border-emerald-500/60 hover:shadow-md' : 'cursor-default'
      } ${
        active
          ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30'
          : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
        {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      </div>
      <div className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{detail}</div>
    </button>
  );
}

export interface SmallCapPredictionsScreenProps {
  autoStart?: boolean;
  initialFilter?: 'all' | 'high_conviction' | 'eligible';
}

export default function SmallCapPredictionsScreen({
  autoStart = typeof window !== 'undefined' && !(typeof process !== 'undefined' && process.env?.VITEST),
  initialFilter = (typeof process !== 'undefined' && process.env?.VITEST) ? 'all' : 'eligible',
}: SmallCapPredictionsScreenProps = {}) {
  const { setSelectedTicker, setSelectedSmallCapStock, addToast } = useStockContext();
  const router = useRouter();
  const exchange = 'NSE' as const;
  const scan = useSmallCapScan(exchange);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'high_conviction' | 'eligible'>(initialFilter);
  const [viewLoaded, setViewLoaded] = useState(false);
  const [researchSymbol, setResearchSymbol] = useState('RELIANCE');
  const [researchTicker, setResearchTicker] = useState('RELIANCE');
  const [tradeStock, setTradeStock] = useState<SmallCapStock | null>(null);
  const autoStarted = useRef(false);

  useEffect(() => {
    if (
      autoStart &&
      !autoStarted.current &&
      scan.catalogVerified &&
      scan.status === 'idle' &&
      (!scan.counts || scan.counts.scanned === 0) &&
      !scan.error
    ) {
      autoStarted.current = true;
      setPage(1);
      void scan.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, scan.catalogVerified, scan.status, scan.counts, scan.error, scan.start]);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem('axion:small-cap-view:v1') || 'null');
      if (saved && typeof saved.search === 'string' && saved.search.length <= 200 &&
          ['all', 'high_conviction', 'eligible'].includes(saved.filter) && Number.isSafeInteger(saved.page) && saved.page > 0) {
        setSearch(saved.search); setSelectedFilter(saved.filter); setPage(saved.page);
      }
    } catch { /* Browser storage can be unavailable or corrupt. */ }
    setViewLoaded(true);
  }, []);
  useEffect(() => {
    if (!viewLoaded) return;
    try { sessionStorage.setItem('axion:small-cap-view:v1', JSON.stringify({ search, filter: selectedFilter, page })); }
    catch { /* Scan results still have an in-memory fallback. */ }
  }, [viewLoaded, search, selectedFilter, page]);

  const scoredStocks = useMemo(() => scan.stocks.filter(isKnownSmallCap)
    .map(stock => ({ ...stock, ...scoreSmallCapCandidate(stock) }))
    .sort((a, b) => {
      // 1. Qualified +2% setups always prioritized
      if (a.isEligibleFor2Pct !== b.isEligibleFor2Pct) {
        return a.isEligibleFor2Pct ? -1 : 1;
      }
      // 2. High conviction setups next
      if (a.isHighConviction !== b.isHighConviction) {
        return a.isHighConviction ? -1 : 1;
      }
      // 3. Higher momentum score
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // 4. Higher percentage gain
      if (b.changePercent !== a.changePercent) {
        return b.changePercent - a.changePercent;
      }
      return a.ticker.localeCompare(b.ticker);
    }), [scan.stocks]);
  const stats = useMemo(() => buildSmallCapUniverseStats(scoredStocks), [scoredStocks]);
  const summary = useMemo(() => buildSmallCapAiSummary(scoredStocks), [scoredStocks]);
  const health = useMemo(() => evaluateSmallCapHealth(scoredStocks), [scoredStocks]);
  const outcomes = useMemo(() => evaluateSmallCapBacktest(scoredStocks), [scoredStocks]);
  const highConvictionCount = scoredStocks.filter(stock => stock.isHighConviction).length;
  const averageMove = scoredStocks.length ? scoredStocks.reduce((sum, stock) => sum + stock.changePercent, 0) / scoredStocks.length : null;
  const filteredStocks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scoredStocks.filter(stock => (!query || stock.ticker.toLowerCase().includes(query) || stock.name.toLowerCase().includes(query)) &&
      (selectedFilter === 'all' || (selectedFilter === 'eligible' ? stock.isEligibleFor2Pct : stock.isHighConviction)));
  }, [scoredStocks, search, selectedFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredStocks.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedStocks = filteredStocks.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const checked = scan.counts?.scanned ?? 0;
  const total = scan.counts?.totalForExchange ?? 0;
  const progressPercent = total > 0 ? Math.min(100, Math.round(checked / total * 100)) : 0;
  const running = scan.status === 'running';
  const loading = scan.status === 'loading';
  const buttonLabel = scan.restartRequired ? 'Restart scan' : scan.status === 'complete' ? 'Scan again' : checked > 0 || scan.status === 'paused' ? 'Resume scan' : scan.status === 'error' ? 'Retry scan' : 'Start full scan';

  return <div className="space-y-6 animate-in fade-in duration-300">
    <ForwardPicks />
    <details className="rounded-2xl border border-indigo-200 bg-white p-5 dark:border-indigo-900 dark:bg-gray-900">
      <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">One-week, one-month, one-year & multibagger research</summary>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Choose a stock to create a dated, evidence-based horizon assessment. Only a supported candidate is entered into the outcome scorecard; missing evidence is shown explicitly.</p>
      <form className="my-4 flex flex-wrap items-end gap-2" onSubmit={event => { event.preventDefault(); const ticker = researchSymbol.trim().toUpperCase().replace(/\.NS$/, ''); if (/^[A-Z0-9&_-]{1,30}$/.test(ticker)) setResearchTicker(ticker); }}>
        <label className="text-xs">NSE ticker<input aria-label="Horizon research ticker" value={researchSymbol} onChange={event => setResearchSymbol(event.target.value)} placeholder="e.g. RELIANCE" className="mt-1 block rounded-lg border p-2 dark:border-gray-700 dark:bg-gray-950" /></label>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Load horizon research</button>
      </form>
      <FrameworkResearchPanel ticker={researchTicker} />
    </details>
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300"><TrendingUp className="h-4 w-4" /> NSE equity and SME screening</p>
        <h1 className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Current small-cap momentum</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-300">Find current +2% momentum names below ₹20,000 Cr, with at least ₹50L turnover and expanding volume. These are screening signals, not predictions of a future return.</p>
      </div>
    </div>

    <section aria-label="Catalog scan" className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"><Layers className="h-4 w-4 text-emerald-600" /> {loading ? 'Loading company catalog…' : `${number(total)} companies in the NSE catalog`}</div>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">
            {scan.status === 'complete' ? 'Scan complete.' : running ? 'Checking quotes, market caps and volume history…' : scan.status === 'paused' ? 'Scan paused. Resume from the last completed batch.' : checked > 0 ? 'Results below cover companies checked so far.' : 'Start a scan to check the full catalog in batches.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {running ? <button type="button" onClick={scan.pause} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-xs font-bold text-white dark:bg-white dark:text-gray-900"><Pause className="h-4 w-4" /> Pause scan</button>
            : <button type="button" disabled={loading || (!!scan.counts && total === 0)} onClick={() => { setPage(1); void scan.start(); }} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}{buttonLabel}
            </button>}
          {!running && !loading && !scan.restartRequired && checked > 0 && scan.status !== 'complete' && <button type="button" onClick={() => { setPage(1); void scan.start(true); }} className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:text-emerald-200"><RefreshCw className="h-4 w-4" /> New scan</button>}
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-900/40" role="progressbar" aria-label="Companies checked" aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={checked}>
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
        <span>{number(checked)} / {number(total)} checked · {progressPercent}%{running && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}</span>
        <span>{scan.fetchedAt && checked > 0 ? `Last batch: ${time(scan.fetchedAt)} IST` : 'Main board and SME listings'}</span>
      </div>
      {scan.catalogSource?.snapshotDate && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">NSE company-list snapshot: {scan.catalogSource.snapshotDate}. Quotes and market caps are checked when scanning.</p>}
      {scan.restored && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Saved scan restored. Quotes reflect the scan time shown above; start a new scan to refresh them.</p>}
      {scan.storageUnavailable && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Browser storage is unavailable. Results are retained while this app stays open, but may not survive a reload.</p>}
      {scan.error && <p role="alert" className="mt-3 text-sm font-medium text-rose-700 dark:text-rose-300">{scan.error}</p>}
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Verified small caps"
        value={checked > 0 ? number(stats.totalSmallCap) : '—'}
        detail="Confirmed market cap under ₹20,000 Cr"
        onClick={checked > 0 ? () => { setSelectedFilter('all'); setPage(1); document.getElementById('small-cap-candidates-section')?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
        active={selectedFilter === 'all'}
      />
      <Metric
        label="Qualified +2% setups"
        value={checked > 0 ? number(stats.totalEligibleFor2Pct) : '—'}
        detail="Momentum, turnover and relative-volume gates"
        onClick={checked > 0 ? () => { setSelectedFilter('eligible'); setPage(1); document.getElementById('small-cap-candidates-section')?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
        active={selectedFilter === 'eligible'}
      />
      <Metric
        label="High score setups"
        value={checked > 0 ? number(highConvictionCount) : '—'}
        detail="Qualified names scoring at least 70 / 100"
        onClick={checked > 0 ? () => { setSelectedFilter('high_conviction'); setPage(1); document.getElementById('small-cap-candidates-section')?.scrollIntoView({ behavior: 'smooth' }); } : undefined}
        active={selectedFilter === 'high_conviction'}
      />
      <Metric label="Average daily move" value={averageMove === null ? '—' : `${averageMove >= 0 ? '+' : ''}${averageMove.toFixed(2)}%`} detail="Across verified small caps checked so far" />
    </div>

    {checked > 0 && <section aria-label="Data coverage" className="rounded-2xl border border-gray-200 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-900/60">
      <h2 className="text-sm font-bold text-gray-900 dark:text-white">Data coverage</h2>
      <div className="mt-3 grid gap-3 text-xs text-gray-600 sm:grid-cols-2 xl:grid-cols-5 dark:text-gray-300">
        <span><strong>{number(scan.counts?.notSmallCap ?? 0)}</strong> outside the small-cap range</span>
        <span><strong>{number(scan.counts?.unknownMarketCaps ?? 0)}</strong> market caps unavailable</span>
        <span><strong>{number(scan.counts?.quotesUnavailable ?? 0)}</strong> quotes unavailable</span>
        <span><strong>{number(scan.counts?.staleQuotes ?? 0)}</strong> stale quotes excluded</span>
        <span><strong>{number(scan.counts?.insufficientHistory ?? 0)}</strong> small caps need more volume history</span>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">Only provider quotes no older than four days, with a known positive market cap, enter this list. Relative volume uses the 20 completed sessions before the quote day. Trade-for-trade series are excluded from qualified setups. Circuit bands and current surveillance status require a separate exchange check.</p>
    </section>}

    {scoredStocks.length > 0 && <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-5 dark:border-violet-900/40 dark:bg-violet-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white">Momentum ranking</h2>
        <span className="text-xs text-violet-700 dark:text-violet-300">Average score {health.averageScore} / 100 · Qualified breadth {stats.marketBreadth}%</span>
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{summary.headline}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{summary.breakdown.map(item => <div key={item.ticker} className="rounded-xl border border-violet-100 bg-white/80 p-3.5 dark:border-violet-800/50 dark:bg-gray-950/40">
        <div className="flex items-center justify-between gap-2"><strong className="text-sm text-gray-900 dark:text-white">{item.ticker}</strong><span className="text-xs font-bold text-violet-600 dark:text-violet-300">{item.score} / 100</span></div>
        <p className="mt-2 text-xs leading-relaxed text-gray-600 dark:text-gray-300">{item.reasoning}</p>
      </div>)}</div>
    </section>}

    <section id="small-cap-candidates-section" className="rounded-2xl border border-gray-200 bg-white/80 p-5 dark:border-gray-800 dark:bg-gray-900/60">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-lg font-black text-gray-900 dark:text-white">Small-cap candidates</h2><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{scan.status === 'complete' ? 'Results from the completed scan' : 'Results from completed batches'} · Ranked by momentum score</p></div>
        <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-950"><Search className="h-4 w-4 text-gray-400" /><input aria-label="Search candidates" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search symbol or company" className="w-44 bg-transparent text-xs text-gray-800 outline-none dark:text-gray-200" /></label>
      </div>
      <div className="my-4 flex flex-wrap gap-2">{([
        ['eligible', `+2% setups (${stats.totalEligibleFor2Pct})`],
        ['high_conviction', `High score (${highConvictionCount})`],
        ['all', `All (${scoredStocks.length})`],
      ] as const).map(([filter, label]) => <button key={filter} type="button" aria-pressed={selectedFilter === filter} onClick={() => { setSelectedFilter(filter); setPage(1); }} className={`rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${selectedFilter === filter ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-750'}`}>{label}</button>)}</div>
      {filteredStocks.length === 0 ? <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
        {checked === 0 ? running ? 'Checking the first batch…' : 'Start a full scan to load verified small-cap candidates.' : scan.status !== 'complete' && scoredStocks.length === 0 ? 'No verified small caps in the batches checked so far. See data coverage above.' : 'No candidates match these filters.'}
      </div> : <div className="space-y-3">
        {paginatedStocks.map(stock => {
          const isMicro = stock.marketCap < 2000;
          return (
            <div
              key={stock.providerSymbol || stock.ticker}
              role="button"
              tabIndex={0}
              onClick={() => {
                setSelectedSmallCapStock?.(stock);
                setSelectedTicker(stock.ticker);
                addToast?.(`Loading chart for ${stock.ticker}`, 'info', stock.ticker);
                router.push('/');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setSelectedSmallCapStock?.(stock);
                  setSelectedTicker(stock.ticker);
                  addToast?.(`Loading chart for ${stock.ticker}`, 'info', stock.ticker);
                  router.push('/');
                }
              }}
              className="rounded-2xl border border-gray-200/80 dark:border-gray-800/80 bg-white/70 dark:bg-gray-900/60 p-4 transition-all hover:border-emerald-500/50 hover:shadow-md backdrop-blur-sm cursor-pointer"
            >
              {/* Tier 1: Identity, Price, 1-Click Trade and Chart Link */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-150/60 dark:border-gray-800/60">
                <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                  <span className="font-mono text-base font-black text-gray-900 dark:text-white">
                    {stock.ticker}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium truncate max-w-[200px]">
                    {stock.name}
                  </span>
                  <span className="rounded-md bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                    Score {stock.score} / 100
                  </span>
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${
                    isMicro
                      ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                      : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                  }`}>
                    {isMicro ? 'Micro-Cap (<₹2k Cr)' : 'Small-Cap'}
                  </span>
                  {stock.isEligibleFor2Pct && (
                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      Qualified +2%
                    </span>
                  )}
                  {stock.isHighConviction && (
                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                      High Score
                    </span>
                  )}
                  {stock.hasEarningsRisk && (
                    <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      Results in {stock.daysToEarnings}d
                    </span>
                  )}
                  {stock.earningsSurprise === 'beat' && (
                    <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                      Beat Catalyst
                    </span>
                  )}
                  {stock.newsSentiment === 'Bullish' && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                      Bullish News
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-mono text-sm font-black text-gray-900 dark:text-white">
                      ₹{stock.currentPrice.toFixed(2)}
                    </div>
                    <div className={`font-mono text-[11px] font-black ${stock.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTradeStock(stock);
                      playTargetChime();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-sm transition-all cursor-pointer active:scale-98"
                    title="View price scenario"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    <span>Price Scenario</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSmallCapStock?.(stock);
                      setSelectedTicker(stock.ticker);
                      addToast?.(`Loading chart for ${stock.ticker}`, 'info', stock.ticker);
                      router.push('/');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    <span>Chart</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Tier 2: Microstructure metrics & signals */}
              <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-gray-500 dark:text-gray-400">
                  <span>Market Cap: <strong className="text-gray-700 dark:text-gray-200 font-mono">₹{number(Math.round(stock.marketCap))} Cr</strong></span>
                  <span>Turnover: <strong className="text-gray-700 dark:text-gray-200 font-mono">₹{number(stock.turnoverLakhs ?? 0)}L</strong></span>
                  <span>{stock.averageVolume && stock.averageVolume > 0 ? <>Relative Vol: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{(stock.volume / stock.averageVolume).toFixed(2)}x</strong></> : 'Volume history unavailable'}</span>
                  {stock.circuitHeadroomPercent !== undefined && stock.circuitHeadroomPercent <= 1 && (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                      <ShieldAlert className="h-3 w-3" /> Circuit Headroom {stock.circuitHeadroomPercent}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {stock.signals.slice(0, 4).map(signal => (
                    <span key={signal} className="rounded-md bg-gray-100 dark:bg-gray-800/80 px-1.5 py-0.5 text-[10px] text-gray-600 dark:text-gray-300 font-medium">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>

              <p data-testid="smallcap-candidate-provenance" className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                Yahoo Finance · {quoteStatusLabel(withCurrentStatus(stock).quoteStatus)} · {time(stock.quoteAsOf)} IST · Market cap checked {time(stock.marketCapAsOf)} IST
              </p>
            </div>
          );
        })}
      </div>}
      {filteredStocks.length > 0 && <div className="mt-5 flex items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
        <button type="button" aria-label="Previous page" disabled={safePage === 1} onClick={() => setPage(safePage - 1)} className="rounded-xl border border-gray-200 p-2 disabled:opacity-30 dark:border-gray-700"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-xs text-gray-500 dark:text-gray-400">Page {safePage} of {totalPages} · {number(filteredStocks.length)} candidates</span>
        <button type="button" aria-label="Next page" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)} className="rounded-xl border border-gray-200 p-2 disabled:opacity-30 dark:border-gray-700"><ChevronRight className="h-4 w-4" /></button>
      </div>}
    </section>

    <div className="rounded-2xl border border-gray-200 p-4 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
      <strong className="text-gray-700 dark:text-gray-200">Outcome validation: </strong>
      {outcomes.evaluatedCount > 0 ? `${outcomes.evaluatedCount} measured outcomes · Hit rate ${outcomes.hitRate}% · Average forward return ${outcomes.averageForwardReturn}% · Risk/reward ${outcomes.riskRewardRatio === null ? 'unavailable' : `${outcomes.riskRewardRatio}×`}.` : 'Win probability, forward returns and risk/reward are unavailable until measured outcomes are recorded.'}
      {' '}The +2% trigger measures the displayed daily move. Momentum scores are screening rules, not calibrated forecasts. Use the separate horizon research panel above for dated one-week/month/year/multibagger assessments; missing evidence prevents unsupported candidate flags.
    </div>

    {/* 1-Click Quick Trade Modal */}
    {tradeStock && (
      <QuickTradeModal
        isOpen={!!tradeStock}
        onClose={() => setTradeStock(null)}
        ticker={tradeStock.ticker}
        name={stockName(tradeStock)}
        currentPrice={tradeStock.currentPrice}
        initialTargetPct={25}
        initialStopLossPct={7}
      />
    )}
  </div>;
}

function stockName(stock: SmallCapStock): string {
  return stock.name || stock.ticker;
}
