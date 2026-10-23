'use client';

import { axionFetch as fetch, axionAppPath } from '../lib/in-process';
import React, { useState, useEffect } from 'react';
import Link from './WorkspaceLink';
import {
  Cpu,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  ChevronRight,
  Info,
  Scale,
  CheckCircle2,
  AlertCircle,
  Activity,
  FileCode2,
  Gauge,
  HelpCircle,
} from 'lucide-react';
import type { StockPrediction } from '../lib/stock-ai-service';
import type { ArtifactProvenance } from '../lib/artifact-provenance';
import PredictionAiPanel from './PredictionAiPanel';
import ModelProvenanceModal from './ModelProvenanceModal';
import ModelEvaluationModal from './ModelEvaluationModal';

interface StockAiDetailTabProps {
  ticker: string;
  theme: string;
}

export default function StockAiDetailTab({ ticker }: StockAiDetailTabProps) {
  const [prediction, setPrediction] = useState<StockPrediction | null>(null);
  const [provenance, setProvenance] = useState<ArtifactProvenance | null>(null);
  const [showManifest, setShowManifest] = useState(false);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadedTicker, setLoadedTicker] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setPrediction(null);
    setError(null);
    async function loadPrediction() {
      try {
        const response = await fetch('/api/stock-ai/predictions', { signal: controller.signal });
        const data = await response.json().catch(() => null);
        if (controller.signal.aborted) return;
        if (!response.ok || !data?.success || !Array.isArray(data.data)) {
          throw new Error(
            response.status === 401
              ? 'Sign in to load quantitative predictions.'
              : data?.error || 'Could not load quantitative predictions. Please try again.'
          );
        }
        if (data.provenance) {
          setProvenance(data.provenance);
        }
        const cleanTicker = ticker.trim().toUpperCase().replace(/\.NS$/, '');
        setPrediction(
          data.data.find(
            (item: StockPrediction) =>
              item.Ticker.trim().toUpperCase().replace(/\.NS$/, '') === cleanTicker
          ) || null
        );
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Could not load quantitative predictions.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadedTicker(ticker);
          setLoading(false);
        }
      }
    }
    void loadPrediction();
    return () => controller.abort();
  }, [ticker, retry]);

  return (
    <div className="space-y-6">
      <PredictionAiPanel ticker={ticker} fixedTicker />
      {loading || loadedTicker !== ticker ? (
        <p
          role="status"
          className="rounded-2xl border border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400"
        >
          Loading saved quantitative prediction for {ticker}…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-500/30 bg-amber-50 p-5 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-300"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="mt-3 rounded-xl border border-amber-500/30 px-3 py-2 text-xs font-bold"
          >
            Retry quantitative prediction
          </button>
        </div>
      ) : prediction ? (
        <>
          <QuantitativePrediction
            prediction={prediction}
            provenance={provenance}
            onOpenManifest={() => setShowManifest(true)}
            onOpenEvaluation={() => setShowEvaluation(true)}
          />
          <ModelProvenanceModal
            isOpen={showManifest}
            onClose={() => setShowManifest(false)}
            provenance={provenance}
          />
          <ModelEvaluationModal
            isOpen={showEvaluation}
            onClose={() => setShowEvaluation(false)}
            candidateVersion={provenance?.targetVersion ? `v${provenance.targetVersion}` : undefined}
          />
        </>
      ) : (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="font-bold text-gray-900 dark:text-white">
            No saved quantitative prediction for {ticker}
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            The current report has no matching row. You can still request an AI review using the
            stock’s recent market data above.
          </p>
          <Link
            href={axionAppPath('/stock-ai')}
            className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400"
          >
            Explore available model setups <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function QuantitativePrediction({
  prediction,
  provenance,
  onOpenManifest,
  onOpenEvaluation,
}: {
  prediction: StockPrediction;
  provenance: ArtifactProvenance | null;
  onOpenManifest: () => void;
  onOpenEvaluation: () => void;
}) {
  const rawScore = prediction['Model Score'];
  const scorePct = (rawScore * 100).toFixed(1);

  // Confidence Tier categorization (M5-02)
  const confidenceTier =
    rawScore >= 0.7
      ? {
          label: 'Higher Model Score',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          desc: 'Score ≥0.70; predictive calibration is not established',
        }
      : rawScore >= 0.55
      ? {
          label: 'Middle Model Score',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          desc: 'Score 0.55–0.69; this is not a success probability',
        }
      : {
          label: 'Lower Model Score',
          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          desc: 'Score below 0.55; predictive calibration is not established',
        };

  const closeNum =
    prediction.Close_Numeric ||
    parseFloat(prediction['Close (Rs.)'].replace(/[^0-9.]/g, '')) ||
    0;
  const targetPrice = (closeNum * 1.02).toFixed(2);
  const stopPrice = (closeNum * 0.99).toFixed(2);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-500">
      {/* Top AI Overview Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/70 border border-indigo-500/20 backdrop-blur-xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 shadow-md shadow-emerald-500/25">
              <Cpu className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-white font-mono">{prediction.Ticker}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  Rank #{prediction.Rank} in Universe
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${confidenceTier.badgeClass}`}
                >
                  {confidenceTier.label}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {prediction.Label}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Saved ranking for a next-session +2% high-touch observation. No trade fill or profit is established.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenManifest}
              aria-label="View Candidate Manifest and Provenance"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 transition-all cursor-pointer shrink-0"
            >
              <FileCode2 className="h-3.5 w-3.5" />
              Manifest &amp; Provenance
            </button>
            <button
              type="button"
              onClick={onOpenEvaluation}
              aria-label="View Candidate Evaluation Benchmark"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/30 transition-all cursor-pointer shrink-0"
            >
              <Activity className="h-3.5 w-3.5" />
              Evaluation Benchmark
            </button>
            <Link
              href={axionAppPath('/stock-ai')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer shrink-0"
            >
              Terminal View
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Core Prediction Targets Grid with Calibrated Probability (M5-02) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/70">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Model Score (Raw)
              </span>
              <span className="text-[9px] font-mono text-amber-400/80">Research score</span>
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-0.5">{scorePct}%</p>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
              <Gauge className="h-3 w-3 text-teal-400 shrink-0" />
              <span>
                Calibration and probability error bounds are not established.
              </span>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Scenario Target (+2.0%)
            </span>
            <p className="text-2xl font-black text-emerald-300 font-mono mt-0.5">₹{targetPrice}</p>
            <span className="text-[10px] text-slate-400">From Close ₹{closeNum.toFixed(2)}</span>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Scenario Stop (-1.0%)
            </span>
            <p className="text-2xl font-black text-rose-400 font-mono mt-0.5">₹{stopPrice}</p>
            <span className="text-[10px] text-slate-400">Illustrative boundary; no guaranteed fill</span>
          </div>

          <div className="bg-slate-900/60 rounded-2xl p-3.5 border border-slate-800/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Reward to Risk
            </span>
            <p className="text-2xl font-black text-indigo-300 font-mono mt-0.5">2.00x</p>
            <span className="text-[10px] text-slate-400">Illustrative +2% / −1%, before costs</span>
          </div>
        </div>
      </div>

      {/* SHAP Explainability & Technical Regime Card (M5-01) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SHAP Decomposition */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              SHAP Feature Attribution (Why the model picked this)
            </h4>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl font-mono leading-relaxed border border-gray-100 dark:border-gray-800">
            {prediction['SHAP Narrative']}
          </p>

          <div className="space-y-2">
            <p className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
              Top Positive Drivers (+Edge)
            </p>
            {prediction.positive_drivers?.slice(0, 3).map((d) => (
              <div
                key={d.feature}
                className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-xs font-mono"
              >
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  {d.description || d.feature}
                </span>
                <span className="font-black text-emerald-600 dark:text-emerald-400">
                  +{d.shap_value.toFixed(4)}
                </span>
              </div>
            ))}
          </div>

          {prediction.negative_drags && prediction.negative_drags.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-extrabold uppercase text-rose-600 dark:text-rose-400 tracking-wider">
                Top Negative Drags (-Resistance)
              </p>
              {prediction.negative_drags.slice(0, 2).map((d) => (
                <div
                  key={d.feature}
                  className="p-2.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20 flex items-center justify-between text-xs font-mono"
                >
                  <span className="font-bold text-rose-800 dark:text-rose-300">
                    {d.description || d.feature}
                  </span>
                  <span className="font-black text-rose-600 dark:text-rose-400">
                    {d.shap_value.toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feature Snapshot & Setup Drivers (M5-01) */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h4 className="text-sm font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Activity className="h-4 w-4 text-teal-500" />
              Engineered Feature Values at EOD
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase">ATR % Volatility</span>
              <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                {prediction['ATR %']}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase">RSI (14)</span>
              <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                {prediction['RSI (14)']}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase">20D Volume Ratio</span>
              <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                {prediction['Vol Ratio (20d)']}x
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase">5D Momentum</span>
              <p
                className={`text-base font-black font-mono mt-0.5 ${
                  prediction['5D Return'].includes('-') ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {prediction['5D Return']}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase">1D Return</span>
              <p
                className={`text-base font-black font-mono mt-0.5 ${
                  prediction['1D Return'].includes('-') ? 'text-rose-500' : 'text-emerald-500'
                }`}
              >
                {prediction['1D Return']}
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
              <span className="text-[10px] text-gray-400 font-bold uppercase">NIFTY 50 Regime</span>
              <p className="text-base font-black text-indigo-500 font-mono mt-0.5">
                {prediction['Nifty Trend']}
              </p>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed flex items-start gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              These levels are fixed +2% / −1% scenarios based on the report close, not AI price
              forecasts. Review the candidate manifest and 4-period split dates before trading.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
