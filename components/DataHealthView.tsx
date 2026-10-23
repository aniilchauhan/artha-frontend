'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Database,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';
import type { DataHealthSummary } from '../lib/observation-pipeline';

export default function DataHealthView() {
  const [healthData, setHealthData] = useState<DataHealthSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/data-health', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status === 503 ? 'No provider-backed scan or worker heartbeat has been recorded.' : 'Failed to retrieve data health telemetry.');
      const data = await res.json();
      if (data.success && data.data) {
        setHealthData(data.data);
      } else {
        throw new Error(data.error || 'Server error');
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to data health service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  if (loading && !healthData) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-500" />
        <span className="ml-2 text-sm text-slate-500">Loading Data Health coverage telemetry...</span>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300/50 bg-amber-50 p-6 text-slate-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-white">
        <h1 className="text-lg font-bold">Data health telemetry unavailable</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{error || 'No provider-backed scan or worker heartbeat has been recorded.'}</p>
        <button onClick={() => void fetchHealth()} disabled={loading} className="mt-4 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          {loading ? 'Refreshing…' : 'Refresh telemetry'}
        </button>
      </div>
    );
  }

  const data = healthData;

  const statusBannerConfig = {
    healthy: {
      title: 'Last recorded batch passed validation',
      desc: 'This describes the observations in the last recorded batch. Provider connectivity and live quote freshness are reported separately.',
      color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      icon: ShieldCheck,
    },
    degraded: {
      title: 'Data Health Degraded: Delayed Quotes Detected',
      desc: 'The last recorded batch contained stale observations or missing volume.',
      color: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      icon: AlertTriangle,
    },
    outage: {
      title: 'Market Data Provider Outage Detected',
      desc: 'The last recorded batch contained no valid observations. Do not treat unavailable observations as current quotes.',
      color: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
      icon: ShieldAlert,
    },
  };

  const activeBanner = statusBannerConfig[data.status] || statusBannerConfig.healthy;
  const BannerIcon = activeBanner.icon;

  return (
    <div className="space-y-6">
      {/* ─── Top Header & Controls ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Data Health & Observation Quality
            </h1>
            <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              AX-06 View
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Last recorded observation validation and any available provider or worker telemetry.
          </p>
        </div>

        <button
          onClick={() => void fetchHealth()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-cyan-500 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Refreshing…' : 'Refresh telemetry'}</span>
        </button>
      </div>

      {/* ─── Status Alert Banner ───────────────────────────────────────── */}
      <div className={`flex items-start gap-3 rounded-2xl border p-4 ${activeBanner.color}`}>
        <BannerIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="text-xs">
          <div className="font-bold text-slate-900 dark:text-white">{activeBanner.title}</div>
          <div className="mt-0.5 opacity-90">{activeBanner.desc}</div>
          <div className="mt-2 text-[11px] opacity-75">
            These counts describe the last submitted batch; they do not measure strategy eligibility or live provider health unless separately reported.
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
          {error}
        </div>
      )}

      {/* ─── Summary Coverage Metrics ──────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Input Rows</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
            {data.catalogSize.toLocaleString('en-IN')}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">Input rows in recorded batch</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Evaluated</div>
          <div className="mt-1 text-xl font-extrabold text-blue-500">
            {data.evaluatedCount}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">Active Scan Universe</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Valid Quotes</div>
          <div className="mt-1 text-xl font-extrabold text-emerald-500">
            {data.validCount}
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-500/80">Conforms to AX-04</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Stale Quotes</div>
          <div className="mt-1 text-xl font-extrabold text-amber-500">
            {data.staleCount}
          </div>
          <div className="mt-0.5 text-[10px] text-amber-500/80">&gt; 120s age in session</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Rejected Quality</div>
          <div className="mt-1 text-xl font-extrabold text-rose-500">
            {data.rejectedCount}
          </div>
          <div className="mt-0.5 text-[10px] text-rose-500/80">Failed OHLC / split</div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Missing rows</div>
          <div className="mt-1 text-xl font-extrabold text-slate-400">{data.missingCount}</div>
          <div className="mt-0.5 text-[10px] text-slate-400">Not valid observations</div>
        </div>
      </div>

      {/* ─── Quality Rejection Breakdown ────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Data Quality Rejection Breakdown
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every rejected market quote carries an explicit diagnostic reason. Synthetic data is prohibited.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Total Rejections: {data.rejectedCount}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Invalid OHLC</span>
              <span className="font-bold text-rose-500">{data.rejectionBreakdown.INVALID_OHLC}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              High &lt; Low, negative prices, or inverted candlestick values.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Circuit Locked</span>
              <span className="font-bold text-amber-500">{data.rejectionBreakdown.CIRCUIT_LOCKED}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              High === Low price bands. Unexecutable orders cannot enter trial.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Split Discontinuity</span>
              <span className="font-bold text-rose-500">{data.rejectionBreakdown.SPLIT_DISCONTINUITY}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Overnight drop &ge; 1.7×. Unadjusted splits blocked from baseline.
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200">Future Timestamp</span>
              <span className="font-bold text-slate-400">{data.rejectionBreakdown.FUTURE_TIMESTAMP}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Timestamps exceeding current time by &gt; 30 seconds.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Daemon Heartbeat & Source Provenance ───────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 text-xs">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Server className="h-4 w-4 text-cyan-500" />
            <span>Market Session Daemon (`scripts/market-session-daemon.mjs`)</span>
          </div>
          <div className="mt-3 space-y-1.5 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Daemon Heartbeat:</span>
              <span className={`font-bold uppercase ${data.daemonHeartbeat.status === 'active' ? 'text-emerald-500' : 'text-slate-400'}`}>{data.daemonHeartbeat.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Current Phase:</span>
              <span className="font-mono text-cyan-500">{data.daemonHeartbeat.phase}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Last Accepted Batch:</span>
              <span className="font-mono">{data.lastSuccessfulScanAt ? `${new Date(data.lastSuccessfulScanAt).toLocaleTimeString('en-IN')} IST` : 'None recorded'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span>Market Data Source ({data.providerStatus.name})</span>
          </div>
          <div className="mt-3 space-y-1.5 text-slate-600 dark:text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-400">Provider Connectivity:</span>
              <span className={`font-bold uppercase ${data.providerStatus.status === 'connected' ? 'text-emerald-500' : data.providerStatus.status === 'unknown' ? 'text-slate-400' : 'text-amber-500'}`}>{data.providerStatus.status}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Roundtrip Latency:</span>
              <span className="font-mono">{data.providerStatus.latencyMs === null ? 'Unavailable' : `${data.providerStatus.latencyMs} ms`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Exchange Timezone:</span>
              <span className="font-mono">Asia/Kolkata (IST, UTC+05:30)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
