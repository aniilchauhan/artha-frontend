'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Zap,
  ShieldAlert,
  TrendingUp,
  AlertCircle,
  Clock,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import type { OllamaCatalystAnalysis } from '../app/api/stock-ai/ollama-catalyst/route';

interface LocalOllamaCatalystWidgetProps {
  ticker: string;
  name?: string;
  currentPrice: number;
  history?: any[];
}

export default function LocalOllamaCatalystWidget({
  ticker,
  name,
  currentPrice,
  history,
}: LocalOllamaCatalystWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<OllamaCatalystAnalysis | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Clear previous analysis on ticker switch
  useEffect(() => {
    setAnalysis(null);
    setError(null);
    setLoading(false);
  }, [ticker]);

  // Track elapsed seconds while analyzing
  useEffect(() => {
    let interval: any = null;
    if (loading) {
      setElapsed(0);
      interval = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const runAnalysis = async () => {
    if (!ticker || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/stock-ai/ollama-catalyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker,
          name: name || ticker,
          price: currentPrice,
          history: Array.isArray(history) ? history.slice(-60) : [],
        }),
      });

      const json = await response.json().catch(() => null);

      if (!response.ok || !json?.success || !json?.data) {
        throw new Error(json?.error || 'Local Ollama analysis was interrupted.');
      }

      setAnalysis(json.data);
    } catch (err: any) {
      setError(err?.message || 'Could not complete local AI review.');
    } finally {
      setLoading(false);
    }
  };

  const cleanSymbol = ticker.trim().toUpperCase().replace(/\.NS$/, '');

  const verdictColor = (verdict?: string) => {
    switch (verdict) {
      case 'supports_breakout':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50';
      case 'cautious_reversal':
        return 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50';
      default:
        return 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/50';
    }
  };

  return (
    <section
      aria-label="Local Ollama AI Catalyst"
      id="local-ollama-catalyst-widget"
      className="relative overflow-hidden rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-white via-indigo-50/20 to-teal-50/20 p-5 shadow-sm transition-all duration-300 dark:border-indigo-900/40 dark:from-gray-900 dark:via-gray-900/90 dark:to-indigo-950/20"
    >
      {/* Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 text-white shadow-md shadow-indigo-600/20">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-sans text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
                Local Ollama AI Catalyst
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                100% Offline / Free
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Zero cloud cost · Runs on your local GPU/CPU via Ollama port 11434
            </p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={runAnalysis}
          disabled={loading || !cleanSymbol}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Analyzing ({elapsed}s)…</span>
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 fill-current text-teal-200" />
              <span>{analysis ? 'Re-run Local AI' : 'Run Local AI Catalyst'}</span>
            </>
          )}
        </button>
      </div>

      {/* Loading Progress State */}
      {loading && (
        <div className="mt-5 rounded-xl border border-indigo-100 bg-white/80 p-4 dark:border-gray-800 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <span className="flex items-center gap-2">
              <Cpu className="h-4 w-4 animate-pulse text-indigo-500" />
              Running local inference on {cleanSymbol}…
            </span>
            <span className="font-mono text-gray-500 dark:text-gray-400">{elapsed}s elapsed</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100 dark:bg-gray-700">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 to-teal-400" />
          </div>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
            Evaluating SMA trend, RSI momentum, breakout trigger bands, and risk factors using local Qwen model.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && !loading && (
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
          <div>
            <p className="font-bold">Local Inference Interrupted</p>
            <p className="mt-0.5 text-[11px] opacity-90">{error}</p>
          </div>
        </div>
      )}

      {/* Idle Prompt State when no analysis has been run yet */}
      {!analysis && !loading && !error && (
        <div className="mt-4 rounded-xl border border-dashed border-indigo-200/70 bg-white/40 p-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-200">Zero Cloud Quota</p>
                <p className="mt-0.5 text-[11px]">Free offline inference with no rate limits or API bills.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-200">Catalyst Detection</p>
                <p className="mt-0.5 text-[11px]">Identifies breakout probability and multi-day momentum setup.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-bold text-gray-900 dark:text-gray-200">Setup Invalidation</p>
                <p className="mt-0.5 text-[11px]">Pinpoints exact price levels where the thesis fails.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results Display */}
      {analysis && !loading && (
        <div className="mt-5 space-y-4">
          {/* Verdict Banner */}
          <div
            className={`flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${verdictColor(
              analysis.verdict
            )}`}
          >
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-75">
                AI Directional Verdict
              </span>
              <h4 className="text-base font-black tracking-tight">{analysis.verdictLabel}</h4>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/80 px-3 py-1 font-mono text-xs font-black shadow-xs dark:bg-gray-800">
                Confidence: {analysis.confidenceScore}%
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-1 font-mono text-xs font-bold text-gray-700 shadow-xs dark:bg-gray-800 dark:text-gray-300">
                {analysis.timeHorizon}
              </div>
            </div>
          </div>

          {/* Catalyst Thesis */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-4 text-xs leading-relaxed text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Catalyst Thesis
            </span>
            <p className="mt-1 text-xs sm:text-[13px]">{analysis.catalystThesis}</p>
          </div>

          {/* Key Trigger Levels */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3.5 text-xs dark:border-emerald-950/40 dark:bg-emerald-950/20">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                <span>Breakout Trigger Condition</span>
              </div>
              <p className="mt-1 font-medium text-emerald-900/90 dark:text-emerald-200">
                {analysis.breakoutTrigger}
              </p>
            </div>

            <div className="rounded-xl border border-rose-200/70 bg-rose-50/50 p-3.5 text-xs dark:border-rose-950/40 dark:bg-rose-950/20">
              <div className="flex items-center gap-1.5 font-bold text-rose-800 dark:text-rose-300">
                <ShieldAlert className="h-4 w-4" />
                <span>Invalidation Level</span>
              </div>
              <p className="mt-1 font-medium text-rose-900/90 dark:text-rose-200">
                {analysis.invalidationLevel}
              </p>
            </div>
          </div>

          {/* Technical Alignment Grid */}
          <div className="rounded-xl border border-gray-200/80 bg-white p-4 dark:border-gray-800 dark:bg-gray-800/40">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Technical Alignment
            </span>
            <div className="mt-2.5 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900/60">
                <span className="block text-[10px] font-medium text-gray-500">Trend (SMA)</span>
                <span className="mt-0.5 block font-bold text-gray-800 dark:text-gray-200">
                  {analysis.technicalAlignment.trendStatus}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900/60">
                <span className="block text-[10px] font-medium text-gray-500">RSI Oscillator</span>
                <span className="mt-0.5 block font-bold text-gray-800 dark:text-gray-200">
                  {analysis.technicalAlignment.rsiStatus}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900/60">
                <span className="block text-[10px] font-medium text-gray-500">MACD / Signal</span>
                <span className="mt-0.5 block font-bold text-gray-800 dark:text-gray-200">
                  {analysis.technicalAlignment.macdStatus}
                </span>
              </div>
              <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900/60">
                <span className="block text-[10px] font-medium text-gray-500">Volatility</span>
                <span className="mt-0.5 block font-bold text-gray-800 dark:text-gray-200">
                  {analysis.technicalAlignment.volatilityStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Key Risks */}
          {analysis.risks && analysis.risks.length > 0 && (
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 text-xs dark:border-amber-950/40 dark:bg-amber-950/15">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                Key Downside Risks
              </span>
              <ul className="mt-2 space-y-1 text-gray-700 dark:text-gray-300">
                {analysis.risks.map((risk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-500 dark:text-gray-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-indigo-500" />
              Model: {analysis.model} · {analysis.latencyMs}ms local
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {new Date(analysis.generatedAt).toLocaleTimeString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })} IST
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
