'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, Clock3, Loader2, Pause, Play, Radar, RefreshCw, Search, TrendingUp, Zap, Star, Bell } from 'lucide-react';
import { useRapidMoveScan } from '../hooks/useRapidMoveScan';
import { useSignalWatchlist } from '../hooks/useSignalWatchlist';
import { useStockContext } from '../context/StockContext';
import type { MoveHorizon, RapidMoveCandidate } from '../lib/rapid-move-types';
import CompanyHoldAssessment from './CompanyHoldAssessment';
import SavedOllamaReviewPanel from './SavedOllamaReviewPanel';
import ResearchPaperAction from './ResearchPaperAction';

const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const time = (date: string) => new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const panel = 'rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/70';

function CandidateCard({ pick, days, open, signalSaved, signalBusy, onToggleSignal, isInWatchlist, onToggleWatchlist, onDispatchAlert }: {
  pick: RapidMoveCandidate;
  days: MoveHorizon;
  open: () => void;
  signalSaved: boolean;
  signalBusy: boolean;
  onToggleSignal: (signalId: string) => void;
  isInWatchlist?: boolean;
  onToggleWatchlist?: () => void;
  onDispatchAlert?: (pick: RapidMoveCandidate) => void;
}) {
  const horizon = pick.horizons.find(h => h.days === days)!;
  const fixedBand = pick.band && !pick.band.dynamic ? pick.band : null;
  return <article className={`${panel} overflow-hidden`}>
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleWatchlist?.();
          }}
          className="text-slate-400 hover:text-amber-500 transition-colors cursor-pointer"
          title={isInWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
        >
          <Star size={18} className={isInWatchlist ? 'fill-amber-400 text-amber-500' : 'text-slate-400 hover:text-amber-400'} />
        </button>
        <div>
          <button onClick={open} className="flex items-center gap-2 text-lg font-bold hover:text-cyan-600">
            {pick.ticker.replace('.NS','')} <ArrowUpRight size={16} />
          </button>
          <p className="mt-1 text-xs text-slate-500">{pick.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono font-semibold">{money(pick.price)}</p>
        <p className={`text-xs ${pick.changePct >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{pick.changePct > 0 ? '+' : ''}{pick.changePct}% session</p>
      </div>
    </div>
    <div className="space-y-4 p-5">
      <div className="flex flex-wrap gap-2 text-[11px] font-semibold">
        <span className={`rounded-full px-2.5 py-1 ${pick.setup === 'breakout' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{pick.setup === 'breakout' ? 'Breakout observed' : 'Building setup'}</span>
        <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">Setup score {pick.score}/100</span>
        {pick.circuitMomentum && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-950 dark:text-amber-300">Circuit momentum watch</span>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[['Breakout trigger', pick.entry], ['+10% gross target', pick.target], ['Invalidation', pick.invalidation]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60"><p className="text-[10px] text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold">{money(value as number)}</p></div>)}
      </div>
      <div className="flex justify-between gap-2 text-xs text-slate-500"><span>Volume <strong className="text-slate-900 dark:text-white">{pick.volumeRatio}×</strong></span><span>ATR <strong className="text-slate-900 dark:text-white">{pick.atrPct}%</strong></span><span>Turnover <strong className="text-slate-900 dark:text-white">₹{pick.turnoverCr} Cr</strong></span></div>
      <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3 text-xs dark:border-cyan-900 dark:bg-cyan-950/20">
        <p className="font-semibold">Within {days} trading {days === 1 ? 'day' : 'days'} · {horizon.stretch ? '10% is a stretch' : 'Elevated price range'}</p>
        <p className="mt-1 text-slate-500">Volatility reference {horizon.rangePct}% · not an expected return.</p>
        <p className="mt-1 text-slate-500">Past +10% touches: {horizon.historicalHits}/{horizon.historicalSamples} separate {days}-day windows. {horizon.historicalSamples < 20 ? 'Small sample.' : 'Historical frequency only.'}</p>
      </div>
      <p className="text-xs text-slate-500">{fixedBand ? `NSE upper band ${money(fixedBand.upper)} · ${time(fixedBand.asOf)}` : pick.band?.dynamic ? 'Dynamic operating range · no fixed upper-circuit claim' : 'Upper-circuit band unverified'}</p>
      <section aria-label={`Reasons for ${pick.ticker}`} className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-800/40 dark:text-slate-400">
        <h3 className="mb-2 font-semibold text-slate-900 dark:text-white">Why this stock appears</h3>
        <ul className="space-y-2">{pick.reasons.map(reason => <li key={reason}>• {reason}</li>)}</ul>
        <p className="mt-3"><strong>Why {days}D:</strong> daily ATR {pick.atrPct}% × √{days} gives a {horizon.rangePct}% volatility reference. {horizon.stretch ? `This is below 10%, so a +10% move in ${days} trading ${days === 1 ? 'day' : 'days'} needs an unusually strong move.` : 'The reference exceeds 10%, indicating a large observed price range; it gives no upward direction or success probability.'}</p>
        <p className="mt-2"><strong>Historical evidence:</strong> {horizon.historicalHits} of {horizon.historicalSamples} non-overlapping {days}-day windows touched 10% above their opening price. These windows were not filtered for this setup; this is not its backtested win rate.</p>
        <p className="mt-2"><strong>Target and failure level:</strong> {money(pick.target)} is 10% above the {money(pick.entry)} trigger{pick.entry > pick.price ? `, which is still ${((pick.entry / pick.price - 1) * 100).toFixed(2)}% above the current quote` : ''}. The planned invalidation is {money(pick.invalidation)} ({((1 - pick.invalidation / pick.entry) * 100).toFixed(2)}% below the trigger); it does not guarantee an exit fill.</p>
        <p className="mt-2"><strong>Circuit evidence:</strong> {pick.circuitMomentum ? `Session gain ${pick.changePct}% meets the 3% threshold, observed volume ${pick.volumeRatio}× meets 1.5×, and price was within 2% of the session high.` : `The combined circuit-momentum screen is not met: it requires a session gain of at least 3%, volume of at least 1.5× and price within 2% of the session high.`} {fixedBand ? `The NSE fixed upper band is ${money(fixedBand.upper)}; reaching it is not predicted.` : 'A fixed upper-circuit level has not been verified.'}</p>
      </section>
      <CompanyHoldAssessment ticker={pick.ticker} days={days} />
      <SavedOllamaReviewPanel ticker={pick.ticker} sessions={days} />
      <div className="space-y-2">
        <button type="button" disabled={!pick.signalId || signalBusy} onClick={() => pick.signalId && onToggleSignal(pick.signalId)} className="font-semibold text-amber-600 disabled:opacity-50">
          {signalBusy ? 'Saving…' : signalSaved ? 'Remove dated signal from Watchlist' : 'Save dated signal to Watchlist'}
        </button>
        <p className="text-[11px] text-slate-500">Keeps this immutable observation ID, its original price evidence, trigger, and validity window.</p>
      </div>
      <ResearchPaperAction signalId={pick.signalId} days={days} />
      <details className="text-xs text-slate-500"><summary className="cursor-pointer">Execution notes</summary><ul className="mt-2 space-y-1">{pick.risks.map(risk => <li key={risk}>• {risk}</li>)}</ul></details>
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <span>Provider quote · {time(pick.asOf)}</span>
          <button
            type="button"
            onClick={() => onDispatchAlert?.(pick)}
            className="flex items-center gap-1 text-[11px] font-bold text-cyan-600 hover:text-cyan-500 cursor-pointer"
            title="Dispatch 10% move alert to Webhook / Telegram"
          >
            <Bell size={12} /> Send Alert
          </button>
        </div>
        <button onClick={open} className="text-xs font-semibold text-cyan-600">View stock →</button>
      </div>
    </div>
  </article>;
}

export default function RapidMovesScreen() {
  const scan = useRapidMoveScan();
  const signalWatchlist = useSignalWatchlist();
  const { setSelectedTicker, watchlist = [], toggleWatchlist, addToast } = useStockContext();
  const [days, setDays] = useState<MoveHorizon>(5);
  const [mode, setMode] = useState<'all' | 'circuit'>('all');
  const [search, setSearch] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [page, setPage] = useState(1);

  const handleDispatchAlert = async (pick: RapidMoveCandidate) => {
    try {
      const res = await fetch('/api/alerts/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rapid',
          data: pick,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch alert');
      }
      if (addToast) {
        addToast(data.message || `10% Move alert dispatched for ${pick.ticker}!`, 'success', pick.ticker);
      }
    } catch (err: any) {
      if (addToast) {
        addToast(err.message || 'Alert routing error', 'warning', pick.ticker);
      }
    }
  };

  const isSymbolInWatchlist = (symbol: string) => {
    const clean = symbol.toUpperCase().replace(/\.NS$/, '');
    return (watchlist || []).some((w) => w.toUpperCase().replace(/\.NS$/, '') === clean);
  };

  const rows = useMemo(() => scan.candidates.filter(pick => {
    if (mode !== 'all' && !pick.circuitMomentum) return false;
    if (confirmed && pick.setup !== 'breakout') return false;
    if (!`${pick.ticker} ${pick.name}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (watchlistOnly) {
      const clean = pick.ticker.toUpperCase().replace(/\.NS$/, '');
      if (!(watchlist || []).some(w => w.toUpperCase().replace(/\.NS$/, '') === clean)) return false;
    }
    return true;
  }).sort((a,b) => Number(a.horizons[days - 1].stretch) - Number(b.horizons[days - 1].stretch) || b.score - a.score || a.ticker.localeCompare(b.ticker)), [scan.candidates, mode, confirmed, search, days, watchlistOnly, watchlist]);

  const pages = Math.max(1, Math.ceil(rows.length / 12));
  const current = Math.min(page, pages);
  const progressPct = scan.progress.total ? Math.round(scan.progress.scanned / scan.progress.total * 100) : 0;
  return <div className="space-y-6">
    <header className={`${panel} relative overflow-hidden p-6 sm:p-8`}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-600"><Radar size={16} /> Short-term watchlist</div>
          <h1 className="text-3xl font-bold tracking-tight">10% Move Radar</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Breakout setups for the next 1–5 trading days and possible upper-circuit momentum. Targets are possibilities, not guaranteed returns.</p></div>
        <div className="flex gap-2"><button onClick={() => scan.setEnabled(!scan.enabled)} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold dark:border-slate-700">{scan.enabled ? <Pause size={14} /> : <Play size={14} />}{scan.enabled ? 'Pause' : 'Resume updates'}</button>
          <button onClick={scan.refresh} className="flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white"><RefreshCw size={14} className={scan.running ? 'animate-spin' : ''} />Refresh</button></div>
      </div>
      <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{[
        ['Watchlist', scan.candidates.length, <TrendingUp key="trend" size={16} />],
        ['Circuit momentum', scan.candidates.filter(p => p.circuitMomentum).length, <Zap key="zap" size={16} />],
        ['Breakouts observed', scan.candidates.filter(p => p.setup === 'breakout').length, <ArrowUpRight key="arrow" size={16} />],
        ['Catalog scanned', `${scan.progress.scanned}/${scan.progress.total || '…'}`, <Radar key="radar" size={16} />],
      ].map(([label,value,icon]) => <div key={label as string} className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60"><div className="flex items-center justify-between text-xs text-slate-500">{label}{icon}</div><p className="mt-2 text-xl font-bold">{value}</p></div>)}</div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span className="flex items-center gap-2">{scan.running ? <Loader2 size={13} className="animate-spin" /> : <Clock3 size={13} />}{scan.running ? `Reading backend results · ${progressPct}%` : scan.enabled ? 'Reads backend snapshots every minute' : 'Snapshot polling paused'}</span><span>{scan.asOf ? `Calculated ${time(scan.asOf)}` : 'Waiting for a backend snapshot'}</span></div>
      {scan.running && <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full bg-cyan-500 transition-all" style={{width:`${progressPct}%`}} /></div>}
    </header>
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">{([1,2,3,4,5] as MoveHorizon[]).map(h => <button key={h} onClick={() => {setDays(h);setPage(1);}} aria-pressed={h===days} className={`rounded-lg px-3 py-2 text-xs font-semibold ${h===days ? 'bg-cyan-600 text-white' : 'text-slate-500'}`}>{h}D</button>)}</div>
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">{(['all','circuit'] as const).map(m => <button key={m} onClick={() => {setMode(m);setPage(1);}} aria-pressed={mode===m} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode===m ? 'bg-slate-900 text-white dark:bg-slate-700' : 'text-slate-500'}`}>{m==='all' ? '+10% watchlist' : 'Upper-circuit watch'}</button>)}</div>
      
      {/* Watchlist Filter Toggle */}
      <button
        type="button"
        onClick={() => { setWatchlistOnly(!watchlistOnly); setPage(1); }}
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all cursor-pointer ${
          watchlistOnly
            ? 'border-amber-500 bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
            : 'border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300'
        }`}
      >
        <Star size={14} className={watchlistOnly ? 'fill-slate-950' : 'text-amber-500'} />
        <span>Watchlist Only</span>
      </button>

      <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={confirmed} onChange={e => {setConfirmed(e.target.checked);setPage(1);}} />Breakouts only</label>
      <label className="ml-auto flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"><Search size={14} className="text-slate-400" /><input aria-label="Search radar stocks" value={search} onChange={e => {setSearch(e.target.value);setPage(1);}} placeholder="Search stocks" className="w-40 bg-transparent text-xs outline-none" /></label>
    </div>
    <p className="text-xs text-slate-500">1D means one trading session; 5D is roughly one market week. Scores rank setups, not win probabilities. Intraday volume is partial. Circuit watch includes momentum candidates even when the exchange band is unavailable.</p>
    {scan.error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">{scan.error} {scan.enabled && 'Saved results reload automatically.'} Dated saved results remain visible while recent.</div>}
    {signalWatchlist.error && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">{signalWatchlist.error}</div>}
    {rows.length ? <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{rows.slice((current-1)*12,current*12).map(pick => <CandidateCard key={pick.ticker} pick={pick} days={days} open={() => setSelectedTicker(pick.ticker.replace(/\.NS$/,''))} signalSaved={!!pick.signalId && signalWatchlist.signalIds.has(pick.signalId)} signalBusy={signalWatchlist.loading || signalWatchlist.busySignalId === pick.signalId} onToggleSignal={id => { void signalWatchlist.toggle(id); }} isInWatchlist={isSymbolInWatchlist(pick.ticker)} onToggleWatchlist={() => toggleWatchlist?.(pick.ticker.replace(/\.NS$/, ''))} onDispatchAlert={handleDispatchAlert} />)}</div> : <div className={`${panel} p-12 text-center`}><Radar size={36} className="mx-auto mb-4 text-cyan-500" /><h2 className="text-lg font-semibold">{scan.running ? 'Looking for current setups' : 'No matching candidates right now'}</h2><p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{scan.running ? 'The backend prepares results independently. This page only loads its latest publication.' : 'The radar stays available and refreshes as new data arrives. Adjust the filters or refresh to check again.'}</p></div>}
    {pages > 1 && <div className="flex items-center justify-center gap-4 text-xs"><button disabled={current===1} onClick={() => setPage(current-1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Previous</button><span>{current} / {pages} · {rows.length} candidates</span><button disabled={current===pages} onClick={() => setPage(current+1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Next</button></div>}
    <details className={`${panel} p-4 text-xs text-slate-500`}><summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">How this radar works</summary><p className="mt-3">The scanner uses provider OHLCV observations and the NSE equity/SME identity catalog. It requires at least 25 completed candles, price above ₹10, ₹1 Cr average daily turnover, positive five-session momentum and price above the completed 20-session average. The entry is a breakout trigger; the target is 10% above that trigger. It is a gross price target before costs. History uses non-overlapping windows and does not estimate a calibrated probability.</p><p className="mt-2">Saved results survive page reloads. Scanning runs in a separate backend worker, independently of this page. Refresh reads the latest published snapshot. Observations older than four calendar days disappear. Market holidays may temporarily reduce coverage. Provider prices can be delayed. Fixed and dynamic exchange bands are kept distinct.</p></details>
  </div>;
}
