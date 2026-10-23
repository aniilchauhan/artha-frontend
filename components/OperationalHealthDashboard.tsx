'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cpu,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ShieldAlert,
} from 'lucide-react';

interface OperationalMetrics {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'critical';
  uptimeSeconds: number;
  system: {
    platform: string;
    nodeVersion: string;
    cpus: number;
    loadAverage: number[];
    freeMemoryBytes: number;
    totalMemoryBytes: number;
    processMemory: {
      rssBytes: number;
      heapTotalBytes: number;
      heapUsedBytes: number;
      externalBytes: number;
      heapUsedPercent: number;
    };
  };
  eventLoop: {
    lagMs: number;
    status: 'optimal' | 'lagging' | 'critical';
  };
  database: {
    status: string;
    readyState: number;
    readyStateLabel: string;
    detail?: string;
  };
  workloadQueues: {
    scanner: {
      activeJobs: number;
      queuedJobs: number;
      maxConcurrent: number;
      maxQueueSize: number;
      totalAccepted: number;
      totalRejected: number;
      totalCompleted: number;
      totalTimedOut: number;
    };
    backtest: {
      activeJobs: number;
      queuedJobs: number;
      maxConcurrent: number;
      maxQueueSize: number;
      totalAccepted: number;
      totalRejected: number;
      totalCompleted: number;
      totalTimedOut: number;
    };
  };
  providerFreshness: {
    status: 'ok' | 'degraded' | 'error';
    breachCount: number;
    breaches: Array<{ source: string; detail: string }>;
  };
  storage: {
    stockAiExists: boolean;
    predictionsDirExists: boolean;
    backupsDirExists: boolean;
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

export default function OperationalHealthDashboard() {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/health/operational');
      if (!res.ok && res.status !== 503) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch operational telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!autoRefresh) return;
    const interval = setInterval(fetchMetrics, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getStatusBadge = (status: 'healthy' | 'degraded' | 'critical') => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5" /> Degraded
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Critical
          </span>
        );
    }
  };

  return (
    <div id="operational-health-dashboard" className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Operational Telemetry & System Health
              </h2>
              {metrics && getStatusBadge(metrics.status)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time monitoring of Node process memory, event loop lag, DB connections, and workload queues.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
              autoRefresh
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {autoRefresh ? 'Auto-refreshing (5s)' : 'Paused'}
          </button>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            aria-label="Refresh metrics"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Node Heap & Memory */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-500" /> Process Memory (RSS)
              </span>
              <span className="font-mono text-slate-900 dark:text-white font-bold">
                {formatBytes(metrics.system.processMemory.rssBytes)}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">V8 Heap Used</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                  {formatBytes(metrics.system.processMemory.heapUsedBytes)} / {formatBytes(metrics.system.processMemory.heapTotalBytes)}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    metrics.system.processMemory.heapUsedPercent > 80
                      ? 'bg-rose-500'
                      : metrics.system.processMemory.heapUsedPercent > 60
                      ? 'bg-amber-500'
                      : 'bg-indigo-500'
                  }`}
                  style={{ width: `${Math.min(100, metrics.system.processMemory.heapUsedPercent)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-right">
                {metrics.system.processMemory.heapUsedPercent}% Heap Utilized
              </p>
            </div>
          </div>

          {/* Card 2: Event Loop Latency */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" /> Event Loop Lag
              </span>
              <span className={`font-mono font-bold text-xs ${
                metrics.eventLoop.lagMs < 30 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {metrics.eventLoop.lagMs} ms
              </span>
            </div>

            <div className="pt-1">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Uptime: <span className="font-mono font-bold">{formatUptime(metrics.uptimeSeconds)}</span>
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Node {metrics.system.nodeVersion} on {metrics.system.platform} ({metrics.system.cpus} vCPUs)
              </p>
            </div>
          </div>

          {/* Card 3: Database & Connections */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-cyan-500" /> Database Pool
              </span>
              <span className={`font-mono text-xs font-bold uppercase ${
                metrics.database.readyState === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}>
                {metrics.database.readyStateLabel}
              </span>
            </div>

            <div className="pt-1">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Status: <span className="font-semibold uppercase">{metrics.database.status}</span>
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                {metrics.database.detail || 'MongoDB connection established'}
              </p>
            </div>
          </div>

          {/* Card 4: Workload Queues */}
          <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-500" /> Workload Limiter
              </span>
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                {metrics.workloadQueues.scanner.activeJobs}/{metrics.workloadQueues.scanner.maxConcurrent} active
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Scanner Queue:</span>
                <span className="font-mono font-medium">{metrics.workloadQueues.scanner.queuedJobs} waiting</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Completed:</span>
                <span className="font-mono font-medium">{metrics.workloadQueues.scanner.totalCompleted}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
