'use client';

import React, { useState, useMemo } from 'react';
import { calculateFutures, calculateOptions, type OptionLeg } from '../lib/derivatives';
import { calculateOptionEnvelope, type OptionEnvelopeResult } from '../lib/option-chain';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';
import { Zap, Activity, Sparkles, Sliders } from 'lucide-react';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const control = 'mt-1 w-full min-w-0 rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-700';
const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const number = (text: string) => text.trim() === '' ? NaN : Number(text);
type DraftLeg = { side: OptionLeg['side']; type: OptionLeg['type']; strike: string; premium: string; lots: string };
const blankLeg = (): DraftLeg => ({ side: 'buy', type: 'CE', strike: '', premium: '', lots: '1' });
function Field({ label, value, onChange, integer = false }: { label: string; value: string; onChange: (v: string) => void; integer?: boolean }) {
  return <label className="block min-w-0 text-xs font-medium">{label}<input className={control} type="number" min="0" step={integer ? '1' : 'any'} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950"><dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-lg font-semibold">{value}</dd></div>;
}
function PayoffChart({ points }: { points: Array<{ price: number; pnl: number }> }) {
  const maxX = points.at(-1)!.price;
  const minY = Math.min(0, ...points.map(p => p.pnl)), maxY = Math.max(0, ...points.map(p => p.pnl));
  const range = maxY - minY || 1;
  const x = (value: number) => 85 + value / maxX * 500, y = (value: number) => 205 - (value - minY) / range * 180;
  return <svg role="img" aria-label="Expiry payoff diagram: net profit or loss against underlying settlement price" viewBox="0 0 640 250" className="mt-4 w-full text-slate-500">
    {[0, .5, 1].map(f => { const value = minY + range * f; return <g key={f}><line x1="85" x2="585" y1={y(value)} y2={y(value)} stroke="currentColor" opacity=".15" /><text x="78" y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="10">{Math.round(value).toLocaleString('en-IN')}</text></g>; })}
    <line x1="85" x2="585" y1={y(0)} y2={y(0)} stroke="currentColor" strokeDasharray="4 4" />
    <polyline points={points.map(p => `${x(p.price)},${y(p.pnl)}`).join(' ')} fill="none" stroke="#6366f1" strokeWidth="3" />
    {[0, .5, 1].map(f => <text key={f} x={x(maxX * f)} y="225" fill="currentColor" fontSize="10" textAnchor="middle">{money(maxX * f)}</text>)}
    <text x="335" y="245" textAnchor="middle" fill="currentColor" fontSize="11">Underlying price at expiry · P&amp;L in INR after entered costs</text>
  </svg>;
}

export default function FuturesOptionsScreen() {
  const [mode, setMode] = useState<'futures' | 'options'>('futures');
  const [symbol, setSymbol] = useState('');
  const [expiry, setExpiry] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [costs, setCosts] = useState('0');
  const [side, setSide] = useState<'long' | 'short'>('long');
  const [entry, setEntry] = useState('');
  const [exit, setExit] = useState('');
  const [lots, setLots] = useState('1');
  const [margin, setMargin] = useState('');
  const [settlement, setSettlement] = useState('');
  const [legs, setLegs] = useState<DraftLeg[]>([blankLeg()]);
  const [example, setExample] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // Quick Trade Modal State
  const [tradeData, setTradeData] = useState<{
    ticker: string;
    price: number;
    targetPct: number;
    stopPct: number;
  } | null>(null);

  // ATM Volatility Envelope State
  const [envelopeSymbol, setEnvelopeSymbol] = useState('NIFTY');
  const [envelopeSpot, setEnvelopeSpot] = useState('24500');
  const [envelopePrevClose, setEnvelopePrevClose] = useState('24450');
  const [envelopeIV, setEnvelopeIV] = useState('18.5');

  const envelopeResult = useMemo<OptionEnvelopeResult | null>(() => {
    const spotNum = number(envelopeSpot);
    const prevNum = number(envelopePrevClose);
    const ivNum = number(envelopeIV);
    if (!Number.isFinite(spotNum) || spotNum <= 0 || !Number.isFinite(prevNum) || prevNum <= 0) {
      return null;
    }
    try {
      return calculateOptionEnvelope(
        envelopeSymbol.trim() || 'NIFTY',
        spotNum,
        prevNum,
        Number.isFinite(ivNum) && ivNum > 0 ? ivNum : 22.0
      );
    } catch {
      return null;
    }
  }, [envelopeSymbol, envelopeSpot, envelopePrevClose, envelopeIV]);

  const loadEnvelopePreset = (sym: string, spot: string, prev: string, iv: string) => {
    setEnvelopeSymbol(sym);
    setEnvelopeSpot(spot);
    setEnvelopePrevClose(prev);
    setEnvelopeIV(iv);
  };

  let futures: ReturnType<typeof calculateFutures> | null = null, options: ReturnType<typeof calculateOptions> | null = null, error: string | null = null;
  if (attempted) {
    try {
      if (mode === 'futures') futures = calculateFutures({ side, entry: number(entry), exit: number(exit), lotSize: number(lotSize), lots: number(lots), costs: number(costs), marginPerLot: margin.trim() ? number(margin) : null });
      else options = calculateOptions({ lotSize: number(lotSize), settlement: number(settlement), costs: number(costs), legs: legs.map(l => ({ ...l, strike: number(l.strike), premium: number(l.premium), lots: number(l.lots) })) });
    } catch (failure) { error = failure instanceof Error ? failure.message : 'Check the scenario inputs.'; }
  }
  function preset(kind: 'call' | 'put' | 'spread' | 'straddle') {
    setSymbol('EXAMPLE'); setExpiry(''); setExample(true); setLotSize('10'); setCosts('10'); setSettlement('110');
    const call: DraftLeg = { side: 'buy', type: 'CE', strike: '100', premium: '5', lots: '1' };
    setLegs(kind === 'call' ? [call] : kind === 'put' ? [{ ...call, type: 'PE' }]
      : kind === 'spread' ? [call, { ...call, side: 'sell', strike: '110', premium: '2' }] : [call, { ...call, type: 'PE' }]);
    setAttempted(true);
  }
  function updateLeg(index: number, patch: Partial<DraftLeg>) { setLegs(current => current.map((leg, i) => i === index ? { ...leg, ...patch } : leg)); }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-20 text-slate-800 dark:text-slate-200">
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Equity derivatives research</p>
        <h1 className="mt-2 text-3xl font-bold">Futures &amp; Options</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-500 dark:text-slate-400">Explore futures price moves and option expiry payoffs using your own contract inputs. Compare scenarios before moving to a broker’s contract and margin checks.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className={card}><p className="text-sm font-semibold">Research tools available</p><p className="mt-1 text-xs text-slate-500">Futures P&amp;L · Option legs · Expiry payoff</p></div>
        <div className={card}><p className="text-sm font-semibold">Live market feed: not connected</p><p className="mt-1 text-xs text-slate-500">Futures quotes, chains, OI, IV and Greeks are unavailable.</p></div>
        <div className={card}><p className="text-sm font-semibold">Contract details: manual</p><p className="mt-1 text-xs text-slate-500">Enter the applicable lot size and expiry. No orders are placed.</p></div>
      </div>

      {/* ATM Volatility & Straddle Payoff Envelope Card */}
      <section className={card} aria-label="ATM Volatility and Straddle Envelope">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Activity className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">ATM Volatility &amp; Straddle Payoff Envelope</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Empirical Black-Scholes daily expected move &amp; straddle breakeven boundaries for NSE equities &amp; benchmark indices.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Presets:</span>
            <button
              onClick={() => loadEnvelopePreset('NIFTY', '24500', '24450', '18.5')}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                envelopeSymbol === 'NIFTY' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              NIFTY 50
            </button>
            <button
              onClick={() => loadEnvelopePreset('BANKNIFTY', '51800', '51600', '21.0')}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                envelopeSymbol === 'BANKNIFTY' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              BANKNIFTY
            </button>
            <button
              onClick={() => loadEnvelopePreset('RELIANCE', '2980', '2950', '24.5')}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                envelopeSymbol === 'RELIANCE' ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              RELIANCE
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Symbol
            <input
              className={control}
              value={envelopeSymbol}
              maxLength={30}
              placeholder="e.g. NIFTY or RELIANCE"
              onChange={e => setEnvelopeSymbol(e.target.value.toUpperCase())}
            />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Underlying Spot (INR)
            <input
              className={control}
              type="number"
              step="any"
              value={envelopeSpot}
              onChange={e => setEnvelopeSpot(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Previous Day Close (INR)
            <input
              className={control}
              type="number"
              step="any"
              value={envelopePrevClose}
              onChange={e => setEnvelopePrevClose(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Implied Volatility (IV %)
            <input
              className={control}
              type="number"
              step="0.1"
              value={envelopeIV}
              onChange={e => setEnvelopeIV(e.target.value)}
            />
          </label>
        </div>

        {envelopeResult && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">ATM Strike</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  ₹{envelopeResult.atmStrike.toLocaleString('en-IN')}
                </dd>
                <span className="text-[11px] text-slate-400 font-mono">Nearest NSE Strike Step</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">1-Day Expected Move</dt>
                <dd className="mt-1 text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  ±₹{envelopeResult.dailyExpectedMoveINR.toLocaleString('en-IN')}
                </dd>
                <span className="text-[11px] text-slate-400 font-mono">±{envelopeResult.dailyExpectedMovePercent}% (1σ move)</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">ATM Straddle Premium</dt>
                <dd className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                  ₹{envelopeResult.straddlePremiumINR.toLocaleString('en-IN')}
                </dd>
                <span className="text-[11px] text-slate-400 font-mono">CE: ₹{envelopeResult.callAtmPremiumINR} · PE: ₹{envelopeResult.putAtmPremiumINR}</span>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
                <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">Breakeven Bounds</dt>
                <dd className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                  ₹{envelopeResult.lowerBreakeven.toLocaleString('en-IN')} — ₹{envelopeResult.upperBreakeven.toLocaleString('en-IN')}
                </dd>
                <span className="text-[11px] text-slate-400 font-mono">Full Payoff Window</span>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-slate-50 to-white p-5 dark:border-indigo-950 dark:from-indigo-950/30 dark:via-slate-900/60 dark:to-slate-900">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Strategy Recommendation:</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600/10 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    {envelopeResult.suggestedOptionStrategy}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    envelopeResult.envelopeStatus === 'INSIDE_ENVELOPE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : envelopeResult.envelopeStatus === 'BREAKOUT_EXPANSION'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}>
                    {envelopeResult.envelopeStatus.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMode('options');
                      setSymbol(envelopeResult.symbol);
                      setLotSize(envelopeResult.symbol === 'NIFTY' ? '25' : envelopeResult.symbol === 'BANKNIFTY' ? '15' : '100');
                      setSettlement(String(envelopeResult.underlyingPrice));
                      setCosts('20');
                      setLegs([
                        { side: 'buy', type: 'CE', strike: String(envelopeResult.atmStrike), premium: String(envelopeResult.callAtmPremiumINR), lots: '1' },
                        { side: 'buy', type: 'PE', strike: String(envelopeResult.atmStrike), premium: String(envelopeResult.putAtmPremiumINR), lots: '1' },
                      ]);
                      setAttempted(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3.5 py-2 text-xs font-semibold text-indigo-700 shadow-xs hover:bg-indigo-50 dark:border-indigo-900 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
                  >
                    <Sliders className="h-3.5 w-3.5" />
                    Apply to Options Builder
                  </button>
                  <button
                    onClick={() => {
                      playTargetChime();
                      setTradeData({
                        ticker: envelopeResult.symbol,
                        price: envelopeResult.underlyingPrice,
                        targetPct: envelopeResult.dailyExpectedMovePercent,
                        stopPct: Number((envelopeResult.dailyExpectedMovePercent / 2).toFixed(2)),
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                  >
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    Trade Straddle ⚡
                  </button>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                {envelopeResult.strategyRATIONALE}
              </p>
            </div>
          </div>
        )}
      </section>

      <div className="flex gap-2" aria-label="Derivative instrument">
        {(['futures', 'options'] as const).map(tab => <button key={tab} aria-pressed={mode === tab} onClick={() => { setMode(tab); setAttempted(false); }} className={`rounded-xl px-5 py-3 text-sm font-semibold ${mode === tab ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{tab === 'futures' ? 'Futures' : 'Options'}</button>)}
      </div>

      <section className={card} aria-label="Manual contract scenario">
        <h2 className="text-lg font-semibold">{mode === 'futures' ? 'Futures scenario' : 'Options strategy builder'}</h2>
        <p className="mt-2 text-xs text-slate-500">{example ? 'Illustrative example inputs; these do not describe a listed contract.' : 'Manual scenario. Symbol and expiry are optional labels; entered prices and contract availability are unverified.'}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium">Underlying label<input className={control} value={symbol} maxLength={30} placeholder="e.g. NIFTY or RELIANCE" onChange={e => setSymbol(e.target.value)} /></label>
          <label className="min-w-0 text-xs font-medium">Contract expiry<input className={control} type="date" value={expiry} onChange={e => setExpiry(e.target.value)} /></label>
          <Field label="Units per lot" value={lotSize} onChange={setLotSize} integer />
          <Field label="Total scenario costs (INR)" value={costs} onChange={setCosts} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Include your estimated fees, taxes and slippage in total costs. All legs must share the same underlying, expiry and units per lot.</p>
        {mode === 'futures' ? <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-medium">Direction<select className={control} value={side} onChange={e => setSide(e.target.value as 'long' | 'short')}><option value="long">Long futures</option><option value="short">Short futures</option></select></label>
            <Field label="Entry futures price (INR)" value={entry} onChange={setEntry} />
            <Field label="Exit futures price (INR)" value={exit} onChange={setExit} />
            <Field label="Number of futures lots" value={lots} onChange={setLots} integer />
            <Field label="Broker margin per lot (INR, optional)" value={margin} onChange={setMargin} />
          </div>
          <button className="mt-4 text-xs font-semibold text-indigo-600 dark:text-indigo-400" onClick={() => { setExample(true); setSymbol('EXAMPLE'); setExpiry(''); setLotSize('10'); setLots('1'); setEntry('100'); setExit('110'); setMargin(''); setCosts('10'); setSide('long'); setAttempted(true); }}>Load illustrative futures example</button>
        </> : <>
          <div className="mt-4 flex flex-wrap gap-2">{([['call', 'Long call'], ['put', 'Long put'], ['spread', 'Bull call spread'], ['straddle', 'Long straddle']] as const).map(([id, label]) => <button key={id} onClick={() => preset(id)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">{label} example</button>)}</div>
          <div className="mt-4 space-y-4">{legs.map((leg, i) => <fieldset key={i} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><legend className="px-1 text-sm font-semibold">Leg {i + 1}</legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="text-xs font-medium">Side, leg {i + 1}<select className={control} value={leg.side} onChange={e => updateLeg(i, { side: e.target.value as OptionLeg['side'] })}><option value="buy">Buy</option><option value="sell">Sell</option></select></label>
              <label className="text-xs font-medium">Type, leg {i + 1}<select className={control} value={leg.type} onChange={e => updateLeg(i, { type: e.target.value as OptionLeg['type'] })}><option value="CE">Call (CE)</option><option value="PE">Put (PE)</option></select></label>
              <Field label={`Strike, leg ${i + 1}`} value={leg.strike} onChange={v => updateLeg(i, { strike: v })} />
              <Field label={`Premium per unit, leg ${i + 1}`} value={leg.premium} onChange={v => updateLeg(i, { premium: v })} />
              <Field label={`Lots, leg ${i + 1}`} value={leg.lots} onChange={v => updateLeg(i, { lots: v })} integer />
            </div>
            {legs.length > 1 && <button className="mt-3 text-xs text-rose-600 dark:text-rose-400" onClick={() => setLegs(current => current.filter((_, index) => index !== i))}>Remove leg {i + 1}</button>}
          </fieldset>)}</div>
          <button disabled={legs.length >= 4} className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-xs disabled:opacity-40 dark:border-slate-700" onClick={() => setLegs(current => [...current, blankLeg()])}>Add option leg</button>
          <div className="mt-4 max-w-sm"><Field label="Underlying price at expiry (INR)" value={settlement} onChange={setSettlement} /></div>
        </>}
        <button onClick={() => setAttempted(true)} className="mt-5 block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Calculate scenario</button>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      </section>

      {(futures || options) && <section className={card} aria-label="Scenario results">
        <h2 className="text-lg font-semibold">{symbol || 'Manual scenario'} · {expiry || 'Expiry not specified'}</h2>
        <p className="mt-1 text-xs text-slate-500">{example ? 'Illustrative inputs' : 'Manual inputs'} · Results update when you edit the scenario.</p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {futures && <>
            <Metric label="Net scenario P&L" value={money(futures.net)} /><Metric label="Gross price P&L" value={money(futures.gross)} />
            <Metric label="Contract units" value={futures.units.toLocaleString('en-IN')} /><Metric label="Entry notional exposure" value={money(futures.notional)} />
            <Metric label="Break-even exit price" value={futures.breakEven === null ? 'Unreachable at a nonnegative price' : money(futures.breakEven)} />
            <Metric label="Entered margin total" value={futures.suppliedMargin === null ? 'Not supplied' : money(futures.suppliedMargin)} />
            <Metric label="P&L per ₹1 price increase" value={money(futures.onePointPnl)} /><Metric label="Maximum modeled loss (price ≥ 0)" value={futures.maximumLoss === null ? 'Unbounded' : money(futures.maximumLoss)} />
          </>}
          {options && <>
            <Metric label="Net P&L at entered expiry price" value={money(options.net)} />
            <Metric label={options.netPremium >= 0 ? 'Net premium paid (before costs)' : 'Net premium received (before costs)'} value={money(Math.abs(options.netPremium))} />
            <Metric label="Maximum expiry profit after costs" value={options.maximumProfit === null ? 'Unbounded' : money(options.maximumProfit)} />
            <Metric label="Maximum expiry loss after costs" value={options.maximumLoss === null ? 'Unbounded' : money(options.maximumLoss)} />
            <Metric label="Break-even underlying prices" value={[...options.breakEvens.map(money), ...options.zeroRanges.map(([a, b]) => `${money(a)} to ${b === null ? '∞' : money(b)}`)].join('; ') || 'None at nonnegative prices'} />
            <Metric label="Broker margin requirement" value={options.hasShortLeg ? 'Required from broker; not calculated' : 'Premium purchase; settlement funding not modeled'} />
          </>}
        </dl>
        {futures && <p className="mt-4 text-sm text-slate-500">Margin is collateral, not a loss limit. This is a total entry-to-exit price scenario; daily mark-to-market cash flows and margin changes are not simulated.</p>}
        {options && <><PayoffChart points={options.points} /><p className="mt-2 text-sm text-slate-500">Expiry intrinsic payoff only. Earlier exits depend on actual option quotes, time value and volatility. Any spread protection assumes all specified legs remain in place. Settlement funding and assignment obligations are not modeled.</p></>}

        {/* 1-Click Execution Action Bar */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-200/60 bg-indigo-50/60 p-4 dark:border-indigo-900/60 dark:bg-indigo-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Live Execution Routing</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Route scenario parameters directly to Paper Trading or Angel One Live Execution terminal.</p>
            </div>
          </div>
          <button
            onClick={() => {
              playTargetChime();
              if (mode === 'futures') {
                const ent = number(entry) || 100;
                const ex = number(exit) || 102;
                const pct = Math.max(0.5, Math.abs(Number((((ex - ent) / ent) * 100).toFixed(2))));
                setTradeData({
                  ticker: symbol.trim() ? `${symbol.trim()}_FUT` : 'NIFTY_FUT',
                  price: ent,
                  targetPct: pct,
                  stopPct: 1.5,
                });
              } else {
                const sett = number(settlement) || 100;
                setTradeData({
                  ticker: symbol.trim() ? `${symbol.trim()}_OPT` : 'NIFTY_OPT',
                  price: sett,
                  targetPct: 3.0,
                  stopPct: 1.5,
                });
              }
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/25 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/40 active:scale-95"
          >
            <Zap className="h-4 w-4 fill-current" />
            Trade Scenario ⚡
          </button>
        </div>
      </section>}

      <section className={card}>
        <h2 className="font-semibold">Contract checks before using a scenario</h2>
        <p className="mt-2 text-sm text-slate-500">Confirm the listed contract, expiry, lot size, settlement method and current broker margin. The old estimated-premium suggestions elsewhere in Axion are not used as contract prices here.</p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-indigo-600 dark:text-indigo-400">
          <a href="https://www.nseindia.com/static/products-services/equity-derivatives-contract-information" target="_blank" rel="noopener noreferrer" className="underline">NSE contract information</a>
          <a href="https://www.nseindia.com/static/products-services/equity-derivatives-contract-specifications" target="_blank" rel="noopener noreferrer" className="underline">NSE contract specifications</a>
          <a href="https://www.nseindia.com/static/products-services/equity-derivatives-margins" target="_blank" rel="noopener noreferrer" className="underline">NSE margin framework</a>
        </div>
      </section>

      {/* 1-Click Quick Trade Modal */}
      {tradeData && (
        <QuickTradeModal
          isOpen={Boolean(tradeData)}
          onClose={() => setTradeData(null)}
          ticker={tradeData.ticker}
          name={`${tradeData.ticker} Derivatives Contract`}
          currentPrice={tradeData.price}
          initialTargetPct={tradeData.targetPct}
          initialStopLossPct={tradeData.stopPct}
        />
      )}
    </div>
  );
}
