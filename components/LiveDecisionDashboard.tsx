'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Zap, TrendingUp, TrendingDown, Activity, Target, ShieldAlert, Radio,
  RefreshCw, Plus, X, Clock, BarChart3, Eye, AlertTriangle, ChevronDown,
  ChevronUp, Crosshair, Gauge, Brain, Wifi, WifiOff, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import type { InstantDecision, DecisionBatch, TechnicalSignal } from '../lib/instant-decision-engine';
import type { LiveSnapshot } from '../lib/live-data-hub';

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900';

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  STRONG_BUY: { label: 'STRONG BUY', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100/80 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700', icon: TrendingUp },
  BUY: { label: 'BUY', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: ArrowUpRight },
  HOLD: { label: 'HOLD', color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700', icon: Activity },
  WATCH: { label: 'WATCH', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', icon: Eye },
  SELL: { label: 'SELL', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', icon: ArrowDownRight },
  STRONG_SELL: { label: 'STRONG SELL', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100/80 dark:bg-red-900/40 border-red-300 dark:border-red-700', icon: TrendingDown },
};

export default function LiveDecisionDashboard() {
  const [symbols, setSymbols] = useState<string[]>(['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK']);
  const [newSymbol, setNewSymbol] = useState('');
  const [batch, setBatch] = useState<DecisionBatch | null>(null);
  const [snapshots, setSnapshots] = useState<LiveSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedDecision, setExpandedDecision] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');
  const [useLLM, setUseLLM] = useState(true);
  const [meta, setMeta] = useState<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDecisions = useCallback(async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/live-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols, useLLM }),
      });
      const data = await res.json();
      if (data.success) {
        setBatch({
          decisions: data.decisions,
          marketContext: data.marketContext,
          generatedAt: data.timestamp,
          totalLatencyMs: data.meta?.totalLatencyMs ?? 0,
        });
        setSnapshots(data.snapshots ?? []);
        setMeta(data.meta);
        setLastRefreshed(new Date().toLocaleTimeString('en-IN'));
      } else {
        setError(data.error || 'Failed to fetch decisions');
      }
    } catch (e: any) {
      setError(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }, [symbols, useLLM]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      fetchDecisions();
      timerRef.current = setInterval(fetchDecisions, 30000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [autoRefresh, fetchDecisions]);

  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (sym && !symbols.includes(sym) && symbols.length < 20) {
      setSymbols(prev => [...prev, sym]);
      setNewSymbol('');
    }
  };

  const removeSymbol = (sym: string) => setSymbols(prev => prev.filter(s => s !== sym));

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-20 text-slate-800 dark:text-slate-200">
      {/* Header */}
      <header>
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
          Live Market Intelligence
        </p>
        <h1 className="mt-2 text-3xl font-bold">Instant Decision Engine</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          Real-time price feeds → Gemini LLM analysis → instant BUY/SELL/HOLD signals with entry/exit levels, confidence scores, and position sizing.
        </p>
      </header>

      {/* Controls */}
      <div className={card}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Input */}
          <div className="flex flex-1 items-center gap-2">
            <input
              className="min-w-[120px] flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm font-semibold dark:border-slate-700"
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              placeholder="Add symbol..."
              maxLength={20}
            />
            <button onClick={addSymbol} disabled={!newSymbol.trim()} className="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-600 disabled:opacity-40">
              <Plus size={12} /> Add
            </button>
          </div>

          {/* LLM Toggle */}
          <button
            onClick={() => setUseLLM(!useLLM)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              useLLM
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}
          >
            <Brain size={14} />
            {useLLM ? 'Gemini AI' : 'Heuristic'}
          </button>

          {/* Auto-refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-all ${
              autoRefresh
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
            }`}
          >
            {autoRefresh ? <Radio size={14} className="animate-pulse" /> : <Wifi size={14} />}
            {autoRefresh ? 'Live (30s)' : 'Manual'}
          </button>

          {/* Fetch */}
          <button
            onClick={fetchDecisions}
            disabled={loading || symbols.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Analyzing...' : 'Analyze Now'}
          </button>
        </div>

        {/* Symbol Tags */}
        <div className="mt-3 flex flex-wrap gap-2">
          {symbols.map(sym => (
            <span key={sym} className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {sym}
              <button onClick={() => removeSymbol(sym)} className="ml-0.5 rounded-full p-0.5 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* Market Context Banner */}
      {batch && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className={card}>
            <div className="flex items-center gap-2 mb-1">
              <Gauge size={14} className="text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Market Bias</span>
            </div>
            <span className={`text-xl font-black ${
              batch.marketContext.marketBias === 'BULLISH' ? 'text-emerald-600 dark:text-emerald-400' :
              batch.marketContext.marketBias === 'BEARISH' ? 'text-red-500' : 'text-slate-500'
            }`}>
              {batch.marketContext.marketBias}
            </span>
          </div>
          <div className={card}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-indigo-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Breadth</span>
            </div>
            <span className="text-xl font-black tabular-nums">{(batch.marketContext.breadthRatio * 100).toFixed(0)}%</span>
          </div>
          <div className={card}>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={14} className="text-purple-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Source</span>
            </div>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400">{meta?.decisionSource === 'gemini' ? '🧠 Gemini' : '⚡ Heuristic'}</span>
          </div>
          <div className={card}>
            <div className="flex items-center gap-2 mb-1">
              <Clock size={14} className="text-amber-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latency</span>
            </div>
            <span className="text-xl font-black tabular-nums text-amber-600 dark:text-amber-400">{meta?.totalLatencyMs ?? 0}ms</span>
          </div>
        </div>
      )}

      {/* Decision Cards */}
      {batch && batch.decisions.length > 0 && (
        <div className="space-y-3">
          {batch.decisions
            .sort((a, b) => {
              const order = ['STRONG_BUY', 'BUY', 'WATCH', 'HOLD', 'SELL', 'STRONG_SELL'];
              return order.indexOf(a.action) - order.indexOf(b.action);
            })
            .map(decision => {
              const config = ACTION_CONFIG[decision.action] || ACTION_CONFIG.HOLD;
              const Icon = config.icon;
              const isExpanded = expandedDecision === decision.symbol;
              const snapshot = snapshots.find(s => s.symbol === decision.symbol);

              return (
                <div
                  key={decision.symbol}
                  className={`rounded-2xl border p-4 transition-all ${config.bg} cursor-pointer`}
                  onClick={() => setExpandedDecision(isExpanded ? null : decision.symbol)}
                >
                  {/* Header Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.bg}`}>
                        <Icon size={20} className={config.color} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black">{decision.symbol}</span>
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-black ${config.color} ${config.bg}`}>
                            {config.label}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            decision.urgency === 'IMMEDIATE' ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 animate-pulse' :
                            decision.urgency === 'NEXT_5MIN' ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400' :
                            'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}>
                            {decision.urgency.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{decision.reasoning}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {/* Confidence Gauge */}
                      <div className="text-center">
                        <div className={`text-2xl font-black tabular-nums ${
                          decision.confidence >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                          decision.confidence >= 60 ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                          {decision.confidence}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400">CONFIDENCE</div>
                      </div>
                      {/* Live Price */}
                      {snapshot && (
                        <div className="text-right">
                          <div className="text-lg font-black tabular-nums">₹{snapshot.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                          <div className={`text-xs font-bold tabular-nums ${snapshot.changePercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {snapshot.changePercent >= 0 ? '+' : ''}{snapshot.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t border-slate-200/50 pt-4 dark:border-slate-700/50">
                      {/* Entry/Exit Levels */}
                      {(decision.entryZone || decision.targetPrice || decision.stopLoss) && (
                        <div className="grid gap-3 sm:grid-cols-4">
                          {decision.entryZone && (
                            <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-900/40">
                              <div className="flex items-center gap-1 mb-1">
                                <Crosshair size={12} className="text-indigo-500" />
                                <span className="text-[10px] font-bold uppercase text-slate-400">Entry Zone</span>
                              </div>
                              <span className="text-sm font-bold tabular-nums">₹{decision.entryZone.low} — ₹{decision.entryZone.high}</span>
                            </div>
                          )}
                          {decision.targetPrice && (
                            <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-900/40">
                              <div className="flex items-center gap-1 mb-1">
                                <Target size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-bold uppercase text-slate-400">Target</span>
                              </div>
                              <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">₹{decision.targetPrice}</span>
                            </div>
                          )}
                          {decision.stopLoss && (
                            <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-900/40">
                              <div className="flex items-center gap-1 mb-1">
                                <ShieldAlert size={12} className="text-red-500" />
                                <span className="text-[10px] font-bold uppercase text-slate-400">Stop Loss</span>
                              </div>
                              <span className="text-sm font-bold tabular-nums text-red-500">₹{decision.stopLoss}</span>
                            </div>
                          )}
                          {decision.riskRewardRatio && (
                            <div className="rounded-xl bg-white/60 p-3 dark:bg-slate-900/40">
                              <div className="flex items-center gap-1 mb-1">
                                <BarChart3 size={12} className="text-purple-500" />
                                <span className="text-[10px] font-bold uppercase text-slate-400">R:R Ratio</span>
                              </div>
                              <span className={`text-sm font-bold tabular-nums ${decision.riskRewardRatio >= 2 ? 'text-emerald-600' : decision.riskRewardRatio >= 1.5 ? 'text-amber-500' : 'text-red-500'}`}>
                                {decision.riskRewardRatio}:1
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Technical Signals */}
                      {decision.signals.length > 0 && (
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Technical Signals</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {decision.signals.map((sig, i) => (
                              <span key={i} className={`rounded-md px-2 py-1 text-[10px] font-bold ${
                                sig.type === 'BULLISH' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                sig.type === 'BEARISH' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              }`}>
                                {sig.description}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Catalysts & Risks */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        {decision.catalysts.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">Catalysts</h4>
                            <ul className="space-y-0.5">
                              {decision.catalysts.map((c, i) => (
                                <li key={i} className="text-xs text-slate-600 dark:text-slate-400">• {c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {decision.risks.length > 0 && (
                          <div>
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-1">Risks</h4>
                            <ul className="space-y-0.5">
                              {decision.risks.map((r, i) => (
                                <li key={i} className="text-xs text-slate-600 dark:text-slate-400">• {r}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Options Insight */}
                      {decision.optionsInsight && (
                        <div className="rounded-lg bg-purple-50/80 p-3 dark:bg-purple-950/20">
                          <span className="text-[10px] font-bold uppercase text-purple-500">Options Insight</span>
                          <p className="mt-1 text-xs text-purple-700 dark:text-purple-400">{decision.optionsInsight}</p>
                        </div>
                      )}

                      {/* Position & Meta */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Position: <strong>{decision.positionSizeSuggestion}</strong></span>
                        <span>Source: {decision.source} · {decision.model} · {decision.latencyMs}ms</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Empty State */}
      {!batch && !loading && (
        <div className={`${card} text-center py-12`}>
          <Brain size={40} className="mx-auto mb-4 text-indigo-300" />
          <h3 className="text-lg font-bold text-slate-400">Ready to Analyze</h3>
          <p className="mt-2 text-sm text-slate-400">
            Add symbols above and click &quot;Analyze Now&quot; to get instant LLM-powered trade decisions
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <ShieldAlert size={16} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          AI-generated signals are for research only. Decisions use {useLLM ? 'Gemini 2.5 Flash' : 'rule-based heuristics'} on live price data.
          No orders are placed. Always verify with your broker. {lastRefreshed && `Last refreshed: ${lastRefreshed}`}
        </span>
      </div>
    </div>
  );
}
