'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  ShieldCheck, 
  AlertTriangle, 
  Compass, 
  Layers, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight,
  RefreshCw,
  Sparkles,
  Zap,
  Target
} from 'lucide-react';
import type { TomorrowMarketOutlook } from '../lib/market-outlook-engine';
import { axionApiPath } from '../lib/in-process';

export default function TomorrowMarketOutlookWidget() {
  const [outlook, setOutlook] = useState<TomorrowMarketOutlook | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOutlook = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(axionApiPath('/api/market-outlook'), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && json.data) {
        setOutlook(json.data);
      } else {
        throw new Error('Invalid market outlook payload');
      }
    } catch (e: any) {
      console.error('[TomorrowMarketOutlook] Fetch failed:', e);
      setError(e.message || 'Unable to load market prediction');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOutlook();
  }, []);

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 border border-slate-800 animate-pulse space-y-4">
        <div className="h-6 w-48 bg-slate-800 rounded-xl" />
        <div className="h-16 w-full bg-slate-800/60 rounded-2xl" />
      </div>
    );
  }

  if (error || !outlook) {
    return null;
  }

  const isPositive = outlook.direction === 'POSITIVE';
  const isNegative = outlook.direction === 'NEGATIVE';

  return (
    <section className={`relative overflow-hidden rounded-3xl glass-card border transition-all duration-300 p-6 sm:p-7 shadow-2xl ${
      isPositive 
        ? 'border-emerald-500/30 glow-emerald' 
        : isNegative 
        ? 'border-rose-500/30 glow-rose' 
        : 'border-amber-500/30 glow-amber'
    }`}>
      {/* Background Ambient Blur Orbs */}
      <div className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
        isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-amber-500'
      }`} />

      {/* Header Row */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Compass className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Broad Market Direction Forecast
            </span>
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPositive ? 'bg-emerald-400' : isNegative ? 'bg-rose-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isPositive ? 'bg-emerald-500' : isNegative ? 'bg-rose-500' : 'bg-amber-500'
              }`} />
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight mt-1 flex items-center gap-2">
            <span>Tomorrow&apos;s Market Outlook</span>
          </h2>
        </div>

        {/* Direction Badge */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2.5 shadow-lg ${
            isPositive
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
              : isNegative
              ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
              : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
          }`}>
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            ) : isNegative ? (
              <TrendingDown className="w-5 h-5 text-rose-400" />
            ) : (
              <Activity className="w-5 h-5 text-amber-400" />
            )}
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-80">
                Predicted Direction
              </div>
              <div className="text-sm font-black tracking-tight">
                {outlook.directionLabel}
              </div>
            </div>
          </div>

          {/* Probability Gauge */}
          <div className="px-4 py-2 rounded-2xl bg-slate-950/60 border border-slate-800 text-center min-w-[90px]">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Bullish Odds</span>
            <p className={`text-base font-black font-mono ${
              isPositive ? 'text-emerald-400' : isNegative ? 'text-rose-400' : 'text-amber-400'
            }`}>
              {outlook.bullishProbabilityPct}%
            </p>
          </div>

          <button
            onClick={fetchOutlook}
            title="Refresh Market Outlook"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Probability Split Bar */}
      <div className="relative z-10 mt-4 pt-3 border-t border-slate-800/70">
        <div className="flex items-center justify-between text-[11px] font-mono mb-1.5">
          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Bullish Upside Probability: {outlook.bullishProbabilityPct}%
          </span>
          <span className="text-rose-400 font-bold flex items-center gap-1.5">
            Bearish Downside Risk: {outlook.bearishProbabilityPct}%
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden flex p-0.5 border border-slate-800">
          <div 
            className="h-full rounded-l-full bg-gradient-to-r from-teal-500 via-emerald-400 to-emerald-500 transition-all duration-1000 ease-out"
            style={{ width: `${outlook.bullishProbabilityPct}%` }}
          />
          <div 
            className="h-full rounded-r-full bg-gradient-to-r from-rose-500 via-rose-600 to-red-600 transition-all duration-1000 ease-out"
            style={{ width: `${outlook.bearishProbabilityPct}%` }}
          />
        </div>
      </div>

      {/* Grid: 4 Pillars & Expected Nifty 50 Levels */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
        
        {/* Left: 4 Market Pillars */}
        <div className="lg:col-span-7 space-y-2.5">
          <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Quantitative Forecast Pillars</span>
            <span className="text-[10px] text-indigo-400 font-bold">4-Factor Model</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {outlook.pillars.map((pillar, i) => (
              <div 
                key={i} 
                className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-3.5 space-y-2 interactive-lift transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate">{pillar.name}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md font-mono ${
                    pillar.signal === 'BULLISH' 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : pillar.signal === 'BEARISH'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {pillar.signal}
                  </span>
                </div>
                
                {/* Pillar Strength Progress */}
                <div className="w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ${
                      pillar.signal === 'BULLISH' ? 'bg-emerald-500' : pillar.signal === 'BEARISH' ? 'bg-rose-500' : 'bg-slate-600'
                    }`}
                    style={{ width: `${pillar.score}%` }}
                  />
                </div>

                <p className="text-[11px] text-slate-400 leading-tight">
                  {pillar.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Tomorrow's Expected Nifty Range */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" /> Tomorrow&apos;s Key Nifty Levels
            </span>
            <span className="text-[10px] font-mono text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-950/40 border border-cyan-800/40">Floor Pivots</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 transition-colors">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Support S1</span>
              <p className="text-sm font-bold font-mono text-rose-400 mt-0.5">₹{outlook.expectedNiftyRange.s1}</p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-indigo-500/20 hover:border-indigo-500/40 transition-colors">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Pivot</span>
              <p className="text-sm font-bold font-mono text-slate-100 mt-0.5">₹{outlook.expectedNiftyRange.pivot}</p>
            </div>
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
              <span className="text-[10px] font-mono text-slate-500 uppercase">Resist R1</span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-0.5">₹{outlook.expectedNiftyRange.r1}</p>
            </div>
          </div>

          {/* Actionable Playbook Note */}
          <div className={`p-3.5 rounded-xl border text-xs space-y-2 ${
            isPositive
              ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
              : isNegative
              ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
              : 'bg-amber-950/30 border-amber-800/40 text-amber-300'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{outlook.tradingPlaybook.bias}</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] font-mono font-bold">
                <span className={`px-1.5 py-0.5 rounded ${outlook.tradingPlaybook.longSuitability === 'FAVORABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  LONG: {outlook.tradingPlaybook.longSuitability}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${outlook.tradingPlaybook.shortSuitability === 'FAVORABLE' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'}`}>
                  SHORT: {outlook.tradingPlaybook.shortSuitability}
                </span>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              {outlook.tradingPlaybook.actionableAdvice}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
