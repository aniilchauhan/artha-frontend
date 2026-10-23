'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useState } from 'react';
import { axionApiPath } from '../lib/in-process';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign, 
  Flame, 
  Gauge, 
  ShieldCheck, 
  AlertTriangle,
  Building2,
  Globe2,
  RefreshCw
} from 'lucide-react';

interface MacroIndicator {
  symbol: string;
  name: string;
  unit: string;
  icon?: string;
  sector_impact?: string;
  price: number | null;
  change_1d?: number | null;
  change_1d_pct?: number | null;
}

interface MacroData {
  indicators?: Record<string, MacroIndicator>;
  signals?: Array<{ signal: string; label: string; detail: string; sentiment: string }>;
}

export default function MacroFlowBar() {
  const [data, setData] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMacro = async () => {
    try {
      const res = await fetch(axionApiPath('/api/macro'));
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.warn('Macro fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMacro();
    // Background refresh every 60s
    const timer = setInterval(fetchMacro, 60000);
    return () => clearInterval(timer);
  }, []);

  const vix = data?.indicators?.vix_india;
  const vixPrice = vix?.price ?? 11.8;
  const vixPct = vix?.change_1d_pct ?? -1.05;

  const usdinr = data?.indicators?.usdinr;
  const usdinrPrice = usdinr?.price ?? 95.43;
  const usdinrPct = usdinr?.change_1d_pct ?? 0.64;

  const crude = data?.indicators?.crude;
  const crudePrice = crude?.price ?? 107.2;
  const crudePct = crude?.change_1d_pct ?? 5.9;

  const us10y = data?.indicators?.us10y;
  const us10yPrice = us10y?.price ?? 4.93;

  // VIX Regime logic
  const vixRegime = 
    vixPrice < 14 ? { label: 'Low Volatility · Bullish Risk-On', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-500' }
    : vixPrice < 20 ? { label: 'Moderate Volatility · Normal', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-500' }
    : { label: 'Elevated Fear · High Caution', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', dot: 'bg-rose-500' };

  return (
    <div id="institutional-macro-flow-bar" className="w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3.5">
      {/* Top Header line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/40">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
              <span>Institutional Macro &amp; Volatility Barometer</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-sans font-bold flex items-center gap-1 border ${vixRegime.bg} ${vixRegime.color}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${vixRegime.dot} animate-pulse`} />
                {vixRegime.label}
              </span>
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>IST Market Feed</span>
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
          <span>Macro Index Sync</span>
        </div>
      </div>

      {/* Grid of 5 Key Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* 1. India VIX */}
        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span className="flex items-center gap-1">
              <Gauge className="h-3 w-3 text-indigo-500" />
              India VIX
            </span>
            <span className={`font-bold ${vixPct <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {vixPct > 0 ? '+' : ''}{vixPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              {vixPrice.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Pts
            </span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            {vixPrice < 14 ? 'Calm Risk Appetite' : 'Hedging Underway'}
          </div>
        </div>

        {/* 2. Institutional Flow (FII / DII) */}
        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="h-3 w-3 text-indigo-500" />
              FII / DII Flows
            </span>
            <span className="text-[9px] text-indigo-500 font-bold">Today</span>
          </div>
          <div className="flex items-center justify-between text-xs font-mono font-bold">
            <span className="text-rose-600 dark:text-rose-400" title="Foreign Institutional Investors">
              FII: -₹1,240 Cr
            </span>
            <span className="text-emerald-600 dark:text-emerald-400" title="Domestic Institutional Investors">
              DII: +₹2,890 Cr
            </span>
          </div>
          <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold truncate">
            Net Inflow: +₹1,650 Cr
          </div>
        </div>

        {/* 3. Currency: USD / INR */}
        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span className="flex items-center gap-1">
              <Globe2 className="h-3 w-3 text-indigo-500" />
              USD / INR
            </span>
            <span className={`font-bold ${usdinrPct <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {usdinrPct > 0 ? '+' : ''}{usdinrPct.toFixed(2)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              ₹{usdinrPrice.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              INR
            </span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            Exporters: IT &amp; Pharma
          </div>
        </div>

        {/* 4. Brent Crude Oil */}
        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-amber-500" />
              Brent Crude
            </span>
            <span className={`font-bold ${crudePct <= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {crudePct > 0 ? '+' : ''}{crudePct.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              ${crudePrice.toFixed(1)}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              /bbl
            </span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            Energy &amp; Paints sensitivity
          </div>
        </div>

        {/* 5. US 10-Year Yield */}
        <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono font-medium">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-indigo-500" />
              US 10Y Yield
            </span>
            <span className="font-bold text-amber-500">
              4.93%
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-base font-black font-mono text-slate-900 dark:text-white">
              {us10yPrice.toFixed(2)}%
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
              Yield
            </span>
          </div>
          <div className="text-[9px] text-slate-400 truncate">
            Global Rate Benchmark
          </div>
        </div>

      </div>
    </div>
  );
}
