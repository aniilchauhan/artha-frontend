'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Activity, TrendingUp, TrendingDown, Target, Zap, Clock, BarChart3,
  RefreshCw, ChevronDown, ChevronUp, Shield, Gauge, ArrowUpRight,
} from 'lucide-react';

import { calculateGreeks, buildGreeksChain, solveImpliedVolatility } from '../lib/option-greeks';
import { getNSEStrikeStep } from '../lib/option-chain';
import type { GreeksResult, GreeksChainRow, GreeksMatrix } from '../lib/option-greeks';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';
const control = 'mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm font-semibold tabular-nums dark:border-slate-700';
const money = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const greekFmt = (n: number, dp = 4) => n.toFixed(dp);

function Pill({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={`mt-1 text-lg font-bold tabular-nums ${color ?? 'text-slate-800 dark:text-slate-200'}`}>
        {value}
      </span>
    </div>
  );
}

export default function GreeksMonitor() {
  // ─── Inputs ──────────────────────────────────────────────────
  const [symbol, setSymbol] = useState('NIFTY');
  const [spotPrice, setSpotPrice] = useState('25000');
  const [daysToExpiry, setDaysToExpiry] = useState('7');
  const [ivPercent, setIvPercent] = useState('14');
  const [riskFreeRate, setRiskFreeRate] = useState('6.5');
  const [selectedStrike, setSelectedStrike] = useState<number | null>(null);
  const [chainExpanded, setChainExpanded] = useState(true);
  const [ivSolverPremium, setIvSolverPremium] = useState('');
  const [ivSolverStrike, setIvSolverStrike] = useState('');
  const [ivSolverType, setIvSolverType] = useState<'CE' | 'PE'>('CE');

  // ─── Computed Chain ──────────────────────────────────────────
  const chain = useMemo<GreeksMatrix | null>(() => {
    const S = parseFloat(spotPrice);
    const D = parseFloat(daysToExpiry);
    const IV = parseFloat(ivPercent);
    const R = parseFloat(riskFreeRate);
    if (!S || !D || !IV || S <= 0 || D <= 0 || IV <= 0) return null;

    try {
      return buildGreeksChain({
        symbol,
        spotPrice: S,
        daysToExpiry: D,
        impliedVolatilityPercent: IV,
        riskFreeRatePercent: R,
        strikeStep: getNSEStrikeStep(S),
        strikeRange: 8,
      });
    } catch { return null; }
  }, [symbol, spotPrice, daysToExpiry, ivPercent, riskFreeRate]);

  // ─── Selected Strike Greeks ──────────────────────────────────
  const selectedRow = useMemo(() => {
    if (!chain || selectedStrike === null) return null;
    return chain.chain.find(r => r.strike === selectedStrike) ?? null;
  }, [chain, selectedStrike]);

  // ─── IV Solver ──────────────────────────────────────────────
  const solvedIV = useMemo(() => {
    const premium = parseFloat(ivSolverPremium);
    const strike = parseFloat(ivSolverStrike);
    const S = parseFloat(spotPrice);
    const D = parseFloat(daysToExpiry);
    const R = parseFloat(riskFreeRate);
    if (!premium || !strike || !S || !D) return null;
    return solveImpliedVolatility(premium, S, strike, D, ivSolverType, R);
  }, [ivSolverPremium, ivSolverStrike, spotPrice, daysToExpiry, riskFreeRate, ivSolverType]);

  // ─── Delta color helper ──────────────────────────────────────
  const deltaColor = (d: number) =>
    d > 0.6 ? 'text-emerald-600 dark:text-emerald-400'
    : d > 0.4 ? 'text-slate-700 dark:text-slate-300'
    : d > 0.2 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-500 dark:text-red-400';

  const gammaBg = (g: number) => {
    const intensity = Math.min(1, g * 5000);
    return `rgba(99, 102, 241, ${(intensity * 0.25).toFixed(2)})`;
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-20 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Black-Scholes Model
        </p>
        <h1 className="mt-2 text-3xl font-bold">Advanced Greeks Monitor</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Real-time Delta, Gamma, Theta, Vega & Rho calculations across the option chain.
          Powered by Abramowitz-Stegun CDF approximation with Newton-Raphson IV solver.
        </p>
      </header>

      {/* Input Parameters */}
      <section className={card} aria-label="Model parameters">
        <div className="flex items-center gap-2 mb-4">
          <Gauge size={18} className="text-indigo-500" />
          <h2 className="text-lg font-semibold">Model Parameters</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium">
            Symbol
            <input className={control} value={symbol} onChange={e => setSymbol(e.target.value)} maxLength={20} placeholder="NIFTY" />
          </label>
          <label className="text-xs font-medium">
            Spot Price (₹)
            <input className={control} type="number" min="0" step="any" value={spotPrice} onChange={e => setSpotPrice(e.target.value)} />
          </label>
          <label className="text-xs font-medium">
            Days to Expiry
            <input className={control} type="number" min="0" step="1" value={daysToExpiry} onChange={e => setDaysToExpiry(e.target.value)} />
          </label>
          <label className="text-xs font-medium">
            IV (%)
            <input className={control} type="number" min="0" step="0.1" value={ivPercent} onChange={e => setIvPercent(e.target.value)} />
          </label>
          <label className="text-xs font-medium">
            Risk-Free Rate (%)
            <input className={control} type="number" min="0" step="0.1" value={riskFreeRate} onChange={e => setRiskFreeRate(e.target.value)} />
          </label>
        </div>
      </section>

      {/* ATM Summary Cards */}
      {chain && chain.chain.length > 0 && (() => {
        const atmRow = chain.chain.find(r => r.strike === Math.round(parseFloat(spotPrice) / getNSEStrikeStep(parseFloat(spotPrice))) * getNSEStrikeStep(parseFloat(spotPrice)));
        if (!atmRow) return null;
        return (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className={card}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATM Call Delta</span>
              </div>
              <span className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">{greekFmt(atmRow.callGreeks.delta)}</span>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown size={14} className="text-red-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATM Put Delta</span>
              </div>
              <span className="text-2xl font-black tabular-nums text-red-500 dark:text-red-400">{greekFmt(atmRow.putGreeks.delta)}</span>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-indigo-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATM Gamma</span>
              </div>
              <span className="text-2xl font-black tabular-nums">{greekFmt(atmRow.callGreeks.gamma, 6)}</span>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2 mb-2">
                <Clock size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATM Theta/Day</span>
              </div>
              <span className="text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">{money(atmRow.callGreeks.theta)}</span>
            </div>
            <div className={card}>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-purple-500" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ATM Vega/1%</span>
              </div>
              <span className="text-2xl font-black tabular-nums text-purple-600 dark:text-purple-400">{money(atmRow.callGreeks.vega)}</span>
            </div>
          </div>
        );
      })()}

      {/* Option Chain with Greeks */}
      {chain && (
        <section className={card} aria-label="Greeks chain">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => setChainExpanded(!chainExpanded)}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-indigo-500" />
              <h2 className="text-lg font-semibold">Option Chain Greeks</h2>
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                {chain.chain.length} strikes
              </span>
            </div>
            {chainExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>

          {chainExpanded && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th colSpan={5} className="pb-2 text-center text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
                      CALLS
                    </th>
                    <th className="pb-2 text-center font-bold text-indigo-500">Strike</th>
                    <th colSpan={5} className="pb-2 text-center text-red-500 dark:text-red-400 font-bold uppercase tracking-wider text-[10px]">
                      PUTS
                    </th>
                  </tr>
                  <tr className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                    <th className="px-2 py-1.5 text-right">Price</th>
                    <th className="px-2 py-1.5 text-right">Δ</th>
                    <th className="px-2 py-1.5 text-right">Γ</th>
                    <th className="px-2 py-1.5 text-right">Θ</th>
                    <th className="px-2 py-1.5 text-right">V</th>
                    <th className="px-2 py-1.5 text-center font-bold">₹</th>
                    <th className="px-2 py-1.5 text-right">Price</th>
                    <th className="px-2 py-1.5 text-right">Δ</th>
                    <th className="px-2 py-1.5 text-right">Γ</th>
                    <th className="px-2 py-1.5 text-right">Θ</th>
                    <th className="px-2 py-1.5 text-right">V</th>
                  </tr>
                </thead>
                <tbody>
                  {chain.chain.map((row) => {
                    const isATM = row.strike === Math.round(parseFloat(spotPrice) / getNSEStrikeStep(parseFloat(spotPrice))) * getNSEStrikeStep(parseFloat(spotPrice));
                    const isSelected = selectedStrike === row.strike;
                    return (
                      <tr
                        key={row.strike}
                        onClick={() => setSelectedStrike(isSelected ? null : row.strike)}
                        className={`cursor-pointer border-b border-slate-50 transition-all dark:border-slate-800/50 ${
                          isATM ? 'bg-indigo-50/60 dark:bg-indigo-950/30 font-semibold' :
                          isSelected ? 'bg-purple-50/40 dark:bg-purple-950/20' :
                          'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Call side */}
                        <td className="px-2 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{money(row.callGreeks.theoreticalPrice)}</td>
                        <td className={`px-2 py-2 text-right tabular-nums font-semibold ${deltaColor(row.callGreeks.delta)}`}>{greekFmt(row.callGreeks.delta)}</td>
                        <td className="px-2 py-2 text-right tabular-nums" style={{ backgroundColor: gammaBg(row.callGreeks.gamma) }}>{greekFmt(row.callGreeks.gamma, 6)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">{row.callGreeks.theta.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-purple-600 dark:text-purple-400">{row.callGreeks.vega.toFixed(2)}</td>
                        {/* Strike */}
                        <td className={`px-3 py-2 text-center tabular-nums font-bold ${isATM ? 'text-indigo-600 dark:text-indigo-400' : ''}`}>
                          {row.strike.toLocaleString('en-IN')}
                          {isATM && <span className="ml-1 text-[8px] font-bold text-indigo-500">ATM</span>}
                        </td>
                        {/* Put side */}
                        <td className="px-2 py-2 text-right tabular-nums text-red-600 dark:text-red-400">{money(row.putGreeks.theoreticalPrice)}</td>
                        <td className={`px-2 py-2 text-right tabular-nums font-semibold ${deltaColor(-row.putGreeks.delta)}`}>{greekFmt(row.putGreeks.delta)}</td>
                        <td className="px-2 py-2 text-right tabular-nums" style={{ backgroundColor: gammaBg(row.putGreeks.gamma) }}>{greekFmt(row.putGreeks.gamma, 6)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-amber-600 dark:text-amber-400">{row.putGreeks.theta.toFixed(2)}</td>
                        <td className="px-2 py-2 text-right tabular-nums text-purple-600 dark:text-purple-400">{row.putGreeks.vega.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Selected Strike Detail */}
      {selectedRow && (
        <section className={card} aria-label="Strike detail">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-indigo-500" />
            <h2 className="text-lg font-semibold">
              Strike {selectedRow.strike.toLocaleString('en-IN')} Detail
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Call Detail */}
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-800/30 dark:bg-emerald-950/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">
                Call (CE) Greeks
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <Pill label="Price" value={money(selectedRow.callGreeks.theoreticalPrice)} />
                <Pill label="Delta" value={greekFmt(selectedRow.callGreeks.delta)} color="text-emerald-600 dark:text-emerald-400" />
                <Pill label="Gamma" value={greekFmt(selectedRow.callGreeks.gamma, 6)} />
                <Pill label="Theta" value={`₹${selectedRow.callGreeks.theta.toFixed(2)}`} color="text-amber-600 dark:text-amber-400" />
                <Pill label="Vega" value={`₹${selectedRow.callGreeks.vega.toFixed(2)}`} color="text-purple-600 dark:text-purple-400" />
                <Pill label="Rho" value={`₹${selectedRow.callGreeks.rho.toFixed(2)}`} />
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                  {selectedRow.callGreeks.moneyness}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Intrinsic: {money(selectedRow.callGreeks.intrinsicValue)} · Time: {money(selectedRow.callGreeks.timeValue)}
                </span>
              </div>
            </div>

            {/* Put Detail */}
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-800/30 dark:bg-red-950/20">
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400 mb-3">
                Put (PE) Greeks
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <Pill label="Price" value={money(selectedRow.putGreeks.theoreticalPrice)} />
                <Pill label="Delta" value={greekFmt(selectedRow.putGreeks.delta)} color="text-red-600 dark:text-red-400" />
                <Pill label="Gamma" value={greekFmt(selectedRow.putGreeks.gamma, 6)} />
                <Pill label="Theta" value={`₹${selectedRow.putGreeks.theta.toFixed(2)}`} color="text-amber-600 dark:text-amber-400" />
                <Pill label="Vega" value={`₹${selectedRow.putGreeks.vega.toFixed(2)}`} color="text-purple-600 dark:text-purple-400" />
                <Pill label="Rho" value={`₹${selectedRow.putGreeks.rho.toFixed(2)}`} />
              </div>
              <div className="mt-3 flex gap-2">
                <span className="rounded-md bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
                  {selectedRow.putGreeks.moneyness}
                </span>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  Intrinsic: {money(selectedRow.putGreeks.intrinsicValue)} · Time: {money(selectedRow.putGreeks.timeValue)}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* IV Solver */}
      <section className={card} aria-label="Implied volatility solver">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpRight size={18} className="text-indigo-500" />
          <h2 className="text-lg font-semibold">IV Solver (Newton-Raphson)</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Reverse-solve implied volatility from an observed market premium using iterative Black-Scholes inversion.
        </p>
        <div className="grid gap-4 sm:grid-cols-4">
          <label className="text-xs font-medium">
            Market Premium (₹)
            <input className={control} type="number" min="0" step="any" value={ivSolverPremium} onChange={e => setIvSolverPremium(e.target.value)} placeholder="e.g. 150" />
          </label>
          <label className="text-xs font-medium">
            Strike Price (₹)
            <input className={control} type="number" min="0" step="any" value={ivSolverStrike} onChange={e => setIvSolverStrike(e.target.value)} placeholder="e.g. 25000" />
          </label>
          <label className="text-xs font-medium">
            Option Type
            <select className={control} value={ivSolverType} onChange={e => setIvSolverType(e.target.value as 'CE' | 'PE')}>
              <option value="CE">Call (CE)</option>
              <option value="PE">Put (PE)</option>
            </select>
          </label>
          <div className="flex items-end">
            {solvedIV !== null ? (
              <div className="w-full rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 p-3 text-center dark:from-indigo-950/30 dark:to-purple-950/30">
                <span className="text-[10px] font-bold uppercase text-slate-400">Solved IV</span>
                <p className="text-2xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                  {solvedIV}%
                </p>
              </div>
            ) : (
              <div className="w-full rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-950">
                <span className="text-xs text-slate-400">Enter premium to solve</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer Note */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <Shield size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          Theoretical values computed using the Black-Scholes-Merton model with Abramowitz & Stegun normal CDF approximation. Greeks reflect European-style exercise assumptions. Actual NSE option prices may differ due to market microstructure, discrete dividends, and early exercise risk for American-style options.
        </span>
      </div>
    </div>
  );
}
