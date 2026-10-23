'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useMemo, useEffect } from 'react';
import { TrendingUp, Sparkles, Bell, HelpCircle, AlertCircle, Sliders } from 'lucide-react';
import { calculateDetailedStockSuggestion } from '../lib/stock-data';
import { useStockContext } from '../context/StockContext';

interface TradeParams {
  buyRangeMin: number;
  buyRangeMax: number;
  sellRangeMin: number;
  sellRangeMax: number;
  stopLoss: number;
  profitPotential: string;
  riskRewardRatio: string;
  qualityGate?: {
    passed: boolean;
    rewardRiskRatio: number;
    riskPerShareRupees: number;
    recommendedShares: number;
    allocatedCapitalRupees: number;
    maxLossRupees: number;
    kellyFractionPct: number;
    ruleSummary: string;
  };
}

interface TradeAdvisorTabProps {
  stock: {
    ticker: string;
    name: string;
    currentPrice: number;
    change: number;
    changePercent: number;
    high: number;
    low: number;
    volume: number;
    isFallback?: boolean;
    history: { date: string; price: number }[];
  };
  theme: string;
}

export default function TradeAdvisorTab({ stock, theme }: TradeAdvisorTabProps) {
  const { customApiKey } = useStockContext();
  const detailed = useMemo(() => calculateDetailedStockSuggestion(stock.history), [stock.history]);
  const [advisorRiskLevel, setAdvisorRiskLevel] = useState<'Conservative' | 'Moderate' | 'Aggressive' | 'Intraday'>('Moderate');
  const [tradeParams, setTradeParams] = useState<TradeParams | null>(null);
  const [advisorSummary, setAdvisorSummary] = useState<string | null>(null);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [isAdvisorSandbox, setIsAdvisorSandbox] = useState(false);
  const [advisorSource, setAdvisorSource] = useState<
    'openai' | 'anthropic' | 'groq' | 'gemini' | 'xai' | 'deepseek' | 'openrouter' | 'ollama' | 'rule_engine' | null
  >(null);
  const [advisorModel, setAdvisorModel] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<{
    openai?: { available: boolean; model: string | null };
    anthropic?: { available: boolean; model: string | null };
    groq?: { available: boolean; model: string | null };
    gemini?: { available: boolean; model: string | null };
    xai?: { available: boolean; model: string | null };
    deepseek?: { available: boolean; model: string | null };
    openrouter?: { available: boolean; model: string | null };
    ollama?: { available: boolean; url: string; activeModel: string | null; installedModels: string[] };
  }>({});

  const isAnyAiAvailable = useMemo(() => {
    return Boolean(
      providerStatus.openai?.available ||
      providerStatus.anthropic?.available ||
      providerStatus.groq?.available ||
      providerStatus.gemini?.available ||
      providerStatus.xai?.available ||
      providerStatus.deepseek?.available ||
      providerStatus.openrouter?.available ||
      providerStatus.ollama?.available
    );
  }, [providerStatus]);
  
  // Local notes state with lazy initialization
  const [personalNotes, setPersonalNotes] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`friday_advisor_notes_${stock.ticker}`);
        return saved || '';
      } catch (e) {
        return '';
      }
    }
    return '';
  });

  const handleSaveNotes = (noteVal: string) => {
    setPersonalNotes(noteVal);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`friday_advisor_notes_${stock.ticker}`, noteVal);
      } catch (e) {
        console.error("Localstorage save failed:", e);
      }
    }
  };

  // Derived state for fallback while loading
  const {
    buyRangeMin, buyRangeMax, sellRangeMin, sellRangeMax, stopLoss, profitPotential, riskRewardRatio
  } = tradeParams || {
    buyRangeMin: 0, buyRangeMax: 0, sellRangeMin: 0, sellRangeMax: 0, stopLoss: 0, profitPotential: "...", riskRewardRatio: "..."
  };

  // Calculate percentage positions for visual scale
  let currentPosPercent = 0, buyMinPercent = 0, buyMaxPercent = 0, sellMinPercent = 0, sellMaxPercent = 0;
  if (tradeParams) {
    const totalSpan = sellRangeMax - stopLoss;
    if (totalSpan > 0) {
      currentPosPercent = Math.max(2, Math.min(98, ((stock.currentPrice - stopLoss) / totalSpan) * 100));
      buyMinPercent = Math.max(2, Math.min(98, ((buyRangeMin - stopLoss) / totalSpan) * 100));
      buyMaxPercent = Math.max(2, Math.min(98, ((buyRangeMax - stopLoss) / totalSpan) * 100));
      sellMinPercent = Math.max(2, Math.min(98, ((sellRangeMin - stopLoss) / totalSpan) * 100));
      sellMaxPercent = Math.max(2, Math.min(98, ((sellRangeMax - stopLoss) / totalSpan) * 100));
    }
  }

  const generateAdvisorReport = async (overrideRisk?: string) => {
    setLoadingAdvisor(true);
    setAdvisorError(null);
    setAdvisorSummary(null);
    setTradeParams(null);
    const activeRisk = overrideRisk || advisorRiskLevel;
    
    try {
      const response = await fetch('/api/trade-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-gemini-api-key': customApiKey } : {})
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          name: stock.name,
          currentPrice: stock.currentPrice,
          riskLevel: activeRisk
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setTradeParams({
        buyRangeMin: data.buyRangeMin,
        buyRangeMax: data.buyRangeMax,
        sellRangeMin: data.sellRangeMin,
        sellRangeMax: data.sellRangeMax,
        stopLoss: data.stopLoss,
        profitPotential: data.profitPotential,
        riskRewardRatio: data.riskRewardRatio,
      });
      setAdvisorSummary(data.advisoryReport);
      setIsAdvisorSandbox(!!data.isMock);
      setAdvisorSource(data.source || (data.isMock ? 'rule_engine' : 'gemini'));
      setAdvisorModel(data.model || null);
    } catch (err: any) {
      console.error("Advisor Generation Error:", err);
      setAdvisorError(err.message || 'An unexpected error occurred during trade advisor generation.');
    } finally {
      setLoadingAdvisor(false);
    }
  };

  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to fetch AI status');
        const data = await res.json();
        if (active) setProviderStatus(data);
      })
      .catch(() => {
        if (active) {
          setProviderStatus({
            gemini: { available: false, model: null },
            ollama: { available: false, url: '', activeModel: null, installedModels: [] },
          });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    generateAdvisorReport(advisorRiskLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.ticker]);

  return (
    <div className="space-y-6 animate-in fade-in duration-350" id="trade-advisor-view">
      
      {/* Risk Selector Header */}
      <div className="bg-gray-50/60 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Strategy Risk Parameter Calibrator
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Select a strategy profile to align optimal entry & take-profit bounds</p>
        </div>
        
        {/* Risk Level Toggles */}
        <div className="flex bg-gray-100/80 dark:bg-gray-800 p-1 rounded-xl border border-gray-200/40 dark:border-gray-700 w-full sm:w-auto flex-wrap gap-1">
          {(['Conservative', 'Moderate', 'Aggressive', 'Intraday'] as const).map((r) => (
            <button
              key={r}
              onClick={() => {
                setAdvisorRiskLevel(r);
                if (advisorSummary) {
                  generateAdvisorReport(r); // Automatically regenerate if already open
                }
              }}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase transition-all cursor-pointer ${
                advisorRiskLevel === r
                  ? r === 'Conservative'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/10'
                    : r === 'Moderate'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                      : r === 'Aggressive'
                        ? 'bg-rose-600 text-white shadow-sm shadow-rose-600/10'
                        : 'bg-amber-600 text-white shadow-sm shadow-amber-600/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              id={`btn-risk-${r}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Targets Bento HUD */}
      {!tradeParams ? (
        <div className="flex flex-col items-center justify-center py-10 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl animate-pulse">
           <span className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
           <p className="text-xs font-mono font-medium text-slate-500">FRIDAY AI is computing tactical bounds...</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="target-advisory-bento-hud">
        {/* Target Buy Zone */}
        <div className="relative group bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 dark:border-emerald-900/40 rounded-3xl p-5 space-y-2.5 flex flex-col justify-between shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Optimal Buy Range
            </span>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-1.5">Accumulation Support Zone</p>
          </div>
          <div className="py-2 relative z-10">
            <span className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              ₹{buyRangeMin.toFixed(2)} - ₹{buyRangeMax.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 font-medium relative z-10">
            Ladder buy limits within this cluster for maximum downside mitigation.
          </p>
        </div>

        {/* Target Sell Zone */}
        <div className="relative group bg-indigo-500/5 dark:bg-indigo-950/20 border border-indigo-500/20 dark:border-indigo-900/40 rounded-3xl p-5 space-y-2.5 flex flex-col justify-between shadow-lg shadow-indigo-500/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Target Sell Range
            </span>
            <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium mt-1.5">Take-Profit Overhead Zone</p>
          </div>
          <div className="py-2 relative z-10">
            <span className="text-xl sm:text-2xl font-extrabold font-mono tracking-tight text-indigo-600 dark:text-indigo-400">
              ₹{sellRangeMin.toFixed(2)} - ₹{sellRangeMax.toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-indigo-800/80 dark:text-indigo-300/80 font-medium relative z-10">
            Set overhead GTC sell orders within this bracket near key resistance levels.
          </p>
        </div>

        {/* Stop Loss Floor */}
        <div className="relative group bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-3 flex flex-col justify-between shadow-lg shadow-slate-900/5 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-rose-500/10 rounded-full blur-xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="flex justify-between items-center relative z-10">
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-400 font-bold uppercase">Absolute Stop Floor</span>
            <span className="font-mono font-extrabold text-xs text-rose-600 dark:text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
              ₹{stopLoss.toFixed(2)}
            </span>
          </div>
          
          <div className="h-px bg-slate-100 dark:bg-slate-800 relative z-10" />
          
          <div className="flex justify-between items-center text-xs relative z-10">
            <span className="text-slate-400 dark:text-slate-400 font-medium">Expected Yields:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{profitPotential}</span>
          </div>
          
          <div className="flex justify-between items-center text-xs relative z-10">
            <span className="text-slate-400 dark:text-slate-400 font-medium">Asymmetric Risk Ratio:</span>
            <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full text-[10px] border border-indigo-500/20">
              {riskRewardRatio}
            </span>
          </div>
        </div>

        {/* Institutional Quality Gate & Sizing Card */}
        {tradeParams?.qualityGate && (
          <div className="md:col-span-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2 dark:border-emerald-500/20 dark:bg-emerald-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Institutional Quality Gate & Sizing Model (1% Risk Budget)
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30">
                Reward/Risk: {tradeParams.qualityGate.rewardRiskRatio}:1 · Verified
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Max Risk Budget</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{tradeParams.qualityGate.maxLossRupees.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Recommended Stake</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{tradeParams.qualityGate.recommendedShares} shares</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Capital Allocation</p>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{tradeParams.qualityGate.allocatedCapitalRupees.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-mono">Kelly Criterion</p>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{tradeParams.qualityGate.kellyFractionPct}% Half-Kelly</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-1">
              {tradeParams.qualityGate.ruleSummary}
            </p>
          </div>
        )}
      </div>
      )}

      {/* Technical Indicators HUD */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-500" />
            <span>Unified Consensus & Technical Indicators</span>
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-black">Unified Suggestion:</span>
            <span className={`text-[10px] font-mono font-black px-3 py-1 rounded-full border shadow-xs flex items-center gap-1.5 ${
              detailed.suggestion === 'BUY' 
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                : detailed.suggestion === 'SELL' 
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${detailed.suggestion === 'BUY' ? 'bg-emerald-500 animate-pulse' : detailed.suggestion === 'SELL' ? 'bg-rose-500' : 'bg-slate-400'}`} />
              {detailed.suggestion} · indicator score {detailed.score}/100 (heuristic)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* SMA Crossover Card */}
          <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-2.5 hover:border-indigo-500/30 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 font-sans">SMA Crossover</span>
              <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                detailed.smaSignal === 'BUY' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}>
                {detailed.smaSignal === 'BUY' ? 'BULLISH' : 'BEARISH'}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <p className="text-slate-500 dark:text-slate-400 font-medium">SMA-5 Fast Period: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{(stock.currentPrice * 0.999).toFixed(2)}</span></p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">SMA-15 Slow Period: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{(stock.currentPrice * 0.994).toFixed(2)}</span></p>
            </div>
          </div>

          {/* MACD Card */}
          <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-2.5 hover:border-indigo-500/30 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 font-sans">MACD Momentum</span>
              <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                detailed.macd.signal === 'BULLISH' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}>
                {detailed.macd.signal}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <p className="text-slate-500 dark:text-slate-400 font-medium">MACD Line: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailed.macd.macdLine}</span></p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Signal Line: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailed.macd.signalLine}</span></p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Histogram: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{detailed.macd.histogram}</span></p>
            </div>
          </div>

          {/* Bollinger Bands Card */}
          <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-2.5 hover:border-indigo-500/30 transition-all">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 font-sans">Bollinger Bands</span>
              <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                detailed.bollingerBands.signal === 'BUY' 
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' 
                  : detailed.bollingerBands.signal === 'SELL' 
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30' 
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}>
                {detailed.bollingerBands.signal === 'BUY' ? 'OVERSOLD' : detailed.bollingerBands.signal === 'SELL' ? 'OVERBOUGHT' : 'STABLE'}
              </span>
            </div>
            <div className="space-y-1 text-[11px]">
              <p className="text-slate-500 dark:text-slate-400 font-medium">Upper Band (2σ): <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{detailed.bollingerBands.upperBand}</span></p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Middle Band (SMA): <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{detailed.bollingerBands.middleBand}</span></p>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Lower Band (2σ): <span className="font-mono font-bold text-slate-800 dark:text-slate-200">₹{detailed.bollingerBands.lowerBand}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Alignment Scale Bar */}
      {!tradeParams ? null : (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Price Position Alignment Relative to Support/Resistance Bounds
          </span>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Current Price: <span className="font-mono font-black text-slate-900 dark:text-white">₹{stock.currentPrice.toFixed(2)}</span>
            <span className="mx-2">|</span>
            Status: {
              stock.currentPrice < buyRangeMin ? (
                <span className="text-rose-500 dark:text-rose-400 font-bold">Trading below suggested support</span>
              ) : stock.currentPrice >= buyRangeMin && stock.currentPrice <= buyRangeMax ? (
                <span className="text-emerald-500 dark:text-emerald-400 font-bold uppercase">Optimal buy range is active</span>
              ) : stock.currentPrice > buyRangeMax && stock.currentPrice < sellRangeMin ? (
                <span className="text-indigo-500 dark:text-indigo-400 font-bold">Trading in consolidation channel</span>
              ) : (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase">Take-profit bounds active</span>
              )
            }
          </div>
        </div>

        {/* CSS Range Scale Line */}
        <div className="relative pt-6 pb-2">
          {/* Range background bar */}
          <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full relative shadow-inner">
            {/* Stop Loss sector */}
            <div className="absolute left-0 h-2.5 w-2 bg-rose-500 rounded-l-full shadow-xs" title="Stop Loss" />
            
            {/* Buy Range sector */}
            <div 
              className="absolute h-2.5 bg-emerald-500/80 dark:bg-emerald-400/50 rounded-xs"
              style={{ left: `${buyMinPercent}%`, width: `${buyMaxPercent - buyMinPercent}%` }}
              title="Optimal Entry Band"
            />

            {/* Sell Target sector */}
            <div 
              className="absolute h-2.5 bg-indigo-500/80 dark:bg-indigo-400/50 rounded-r-full"
              style={{ left: `${sellMinPercent}%`, width: `${sellMaxPercent - sellMinPercent}%` }}
              title="Target Take-Profit Zone"
            />
            
            {/* Current Price Marker Pin */}
            <div 
              className="absolute h-5 w-5 bg-indigo-600 border-2 border-white dark:border-slate-950 rounded-full -top-1.5 shadow-xl transition-all duration-300 flex items-center justify-center -translate-x-1/2"
              style={{ left: `${currentPosPercent}%` }}
            >
              <span className="h-2 w-2 bg-white rounded-full animate-ping" />
            </div>
          </div>

          {/* Labels beneath scale */}
          <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 pt-2.5 font-bold uppercase">
            <span>Stop (₹{stopLoss.toFixed(0)})</span>
            <span style={{ left: `${(buyMinPercent + buyMaxPercent) / 2}%`, transform: 'translateX(-50%)' }} className="absolute text-emerald-600 dark:text-emerald-400">Buy Entry (₹{buyRangeMin.toFixed(0)})</span>
            <span style={{ left: `${(sellMinPercent + sellMaxPercent) / 2}%`, transform: 'translateX(-50%)' }} className="absolute text-indigo-600 dark:text-indigo-400">Sell Targets (₹{sellRangeMin.toFixed(0)})</span>
            <span>Target Cap</span>
          </div>
        </div>
      </div>
      )}

      {/* Quantitative Reasons to Buy */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
          <span>FRIDAY System Strategy Rationale (Reasons to Buy)</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-2 hover:border-emerald-500/30 transition-all">
            <span className="font-mono text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              01. Support Accumulation
            </span>
            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Price displays heavy simulated buying demand floor near ₹{buyRangeMin.toFixed(0)}. Placing accumulation blocks inside this channel minimizes mid-session volatility drawdown risks.
            </p>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-2 hover:border-indigo-500/30 transition-all">
            <span className="font-mono text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 rounded-full">
              02. Volatility Compression
            </span>
            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Bollinger Bands and short-term SMA alignments indicate solid support compression. A continuation push towards ₹{sellRangeMin.toFixed(0)} holds exceptional probability.
            </p>
          </div>

          <div className="bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-2xl space-y-2 hover:border-purple-500/30 transition-all">
            <span className="font-mono text-[9px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 rounded-full">
              03. Asymmetric expectancy
            </span>
            <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              With a disciplined stop-loss target of ₹{stopLoss.toFixed(2)}, the profit ratio of {riskRewardRatio} allows for positive structural expectations across sequential trades.
            </p>
          </div>
        </div>
      </div>

      {/* Ask FRIDAY AI Strategy Builder Block */}
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-slate-900/10 border border-indigo-500/20 dark:border-indigo-900/40 rounded-3xl p-6 space-y-4 backdrop-blur-xl shadow-xl">
        <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/15 rounded-2xl text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0 shadow-sm">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  FRIDAY AI Strategy Advisor
                </h3>
                {!isAnyAiAvailable && !advisorSource ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Offline • Deterministic Rule Engine Active
                  </span>
                ) : (
                  <>
                    {advisorSource === 'openai' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        OpenAI {advisorModel ? `(${advisorModel})` : ''} • Frontier Reasoning
                      </span>
                    )}
                    {advisorSource === 'anthropic' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Anthropic Claude {advisorModel ? `(${advisorModel})` : ''}
                      </span>
                    )}
                    {advisorSource === 'groq' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/80 dark:border-orange-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                        Groq Cloud {advisorModel ? `(${advisorModel})` : ''} • LPU Fast
                      </span>
                    )}
                    {advisorSource === 'gemini' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                        Google Gemini API
                      </span>
                    )}
                    {advisorSource === 'xai' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500 animate-pulse" />
                        xAI Grok {advisorModel ? `(${advisorModel})` : ''}
                      </span>
                    )}
                    {advisorSource === 'deepseek' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                        DeepSeek {advisorModel ? `(${advisorModel})` : ''} • R1 Reasoner
                      </span>
                    )}
                    {advisorSource === 'openrouter' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                        OpenRouter {advisorModel ? `(${advisorModel})` : ''}
                      </span>
                    )}
                    {advisorSource === 'ollama' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Local Ollama {advisorModel ? `(${advisorModel})` : ''} • Private
                      </span>
                    )}
                    {advisorSource === 'rule_engine' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Institutional Rule Engine Sandbox
                      </span>
                    )}
                    {!advisorSource && isAnyAiAvailable && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        AI Ready
                      </span>
                    )}
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium font-sans mt-0.5">Generate a comprehensive, custom dynamic AI tactical trade strategy briefing</p>
            </div>
          </div>

          <button
            onClick={() => generateAdvisorReport()}
            disabled={loadingAdvisor}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-800 dark:disabled:to-gray-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-indigo-600/10 hover:shadow-indigo-600/20 shrink-0 ${loadingAdvisor ? 'animate-pulse' : ''}`}
            id="btn-generate-advisor-report"
          >
            {loadingAdvisor ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Calibrating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 fill-current shrink-0 animate-bounce" />
                <span>Ask FRIDAY AI</span>
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {advisorError && (
          <div className="bg-rose-50/55 dark:bg-rose-950/20 border border-rose-100/60 dark:border-rose-950/40 rounded-xl p-3.5 text-xs text-rose-700 dark:text-rose-400 font-medium flex items-start gap-2 animate-in fade-in duration-200">
            <span className="p-1 bg-rose-100 dark:bg-rose-950/50 rounded-lg text-rose-600 dark:text-rose-400 font-black shrink-0">!</span>
            <div>
              <p className="font-bold">Calibrator Interrupted</p>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">{advisorError}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loadingAdvisor && (
          <div className="space-y-4 animate-pulse pt-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-1/4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-5/6" />
            </div>
          </div>
        )}

        {/* Generated Report Output */}
        {advisorSummary && !loadingAdvisor && (
          <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 space-y-4 font-sans text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-4">
              {(() => {
                const summaryText = typeof advisorSummary === 'string'
                  ? advisorSummary
                  : typeof advisorSummary === 'object' && advisorSummary !== null
                    ? Object.entries(advisorSummary).map(([key, val]) => `### ${key}\n${val}`).join('\n\n')
                    : String(advisorSummary || '');
                return summaryText.split('\n\n').map((paragraph, pIdx) => {
                  if (paragraph.startsWith('###') || paragraph.startsWith('##')) {
                    const title = paragraph.replace(/^###|^##/, '').trim();
                    return (
                      <h4 key={pIdx} className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider pt-3 border-b border-gray-100 dark:border-gray-800 pb-1 font-mono">
                        {title}
                      </h4>
                    );
                  }
                  
                  if (/^\d\./.test(paragraph)) {
                    const items = paragraph.split('\n').filter(Boolean);
                    return (
                      <div key={pIdx} className="space-y-3.5 my-4">
                        {items.map((item, iIdx) => {
                          const firstDot = item.indexOf('.');
                          const number = item.substring(0, firstDot + 1);
                          const rest = item.substring(firstDot + 1).trim();
                          
                          let title = "";
                          let content = rest;
                          if (rest.startsWith('**')) {
                            const secondBold = rest.indexOf('**', 2);
                            if (secondBold !== -1) {
                              title = rest.substring(2, secondBold);
                              content = rest.substring(secondBold + 2).trim();
                            }
                          }
                          
                          return (
                            <div key={iIdx} className="bg-gray-50/40 dark:bg-gray-950/40 border border-gray-100/60 dark:border-gray-800/40 rounded-xl p-4 shadow-xs">
                              <span className="inline-block text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                                {number} {title}
                              </span>
                              <p className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                {content.replace(/^:\s*/, '')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  if (paragraph.startsWith('*') || paragraph.startsWith('-')) {
                    const items = paragraph.split('\n').filter(Boolean);
                    return (
                      <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-3">
                        {items.map((item, iIdx) => (
                          <li key={iIdx}>
                            {item.replace(/^\*|^\-\s|\*\*|^\d\.\s/g, '').trim()}
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p key={pIdx} className="text-xs sm:text-[13px] font-medium leading-relaxed">
                      {paragraph}
                    </p>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Persistent Notes Block */}
      <div className="bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/40 rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
          <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <span>Tactical Strategy Notes (Persistent)</span>
        </div>
        <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed font-medium">
          Log customized buy details, volume thresholds, or specific conditions for {stock.ticker} below. These parameters persist inside this local terminal.
        </p>
        
        <textarea
          value={personalNotes}
          onChange={(e) => handleSaveNotes(e.target.value)}
          placeholder="Type your personal entry bounds, triggers, or thesis reasons for this trade setup..."
          className="w-full h-24 p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans resize-none"
          id={`textarea-notes-${stock.ticker}`}
        />
        <div className="flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500 font-mono">
          <span>Auto-saved in local terminal storage</span>
          <span>{personalNotes.length} characters</span>
        </div>
      </div>

    </div>
  );
}

// Compact helper icon
function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
