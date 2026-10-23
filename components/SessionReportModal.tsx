'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect } from 'react';
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  RefreshCw,
  X,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import type { DailyMarketSessionReport } from '../lib/market-report-generator';

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SessionReportModal({ isOpen, onClose }: SessionReportModalProps) {
  const [report, setReport] = useState<DailyMarketSessionReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'briefing' | 'raw'>('briefing');

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market-session/report');
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to generate briefing`);
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        throw new Error(data.error || 'Failed to parse session report');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch executive session report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !report) {
      fetchReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyMarkdown = async () => {
    if (!report?.markdownContent) return;
    try {
      await navigator.clipboard.writeText(report.markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = report.markdownContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdownContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Axion_Session_Report_${report.date}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md animate-fade-in print:p-0 print:bg-white">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden print:border-none print:shadow-none print:max-h-full">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Market Session Briefing
                </h3>
                {report && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {report.date}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                Provider-backed NSE gap observations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMarkdown}
              disabled={!report || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title="Copy markdown to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy MD'}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              disabled={!report || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title="Download report file"
            >
              <Download size={14} />
              Export
            </button>
            <button
              onClick={handlePrint}
              disabled={!report || loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 disabled:opacity-50"
              title="Print or export as PDF"
            >
              <Printer size={14} />
              PDF
            </button>
            <button
              onClick={fetchReport}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Briefing"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <button
            onClick={() => setViewMode('briefing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'briefing'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Briefing & Highlights
          </button>
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'raw'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Raw Markdown
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading && !report && (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <RefreshCw size={32} className="animate-spin text-indigo-500 mb-3" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Loading session report...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Loading provider-backed price bars and observed gap fills.
              </p>
            </div>
          )}

          {error && !report && (
            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-center">
              <AlertTriangle size={28} className="mx-auto mb-2 text-rose-500" />
              <p className="text-sm font-bold">Failed to load session report</p>
              <p className="text-xs mt-1 text-rose-500/80">{error}</p>
              <button
                onClick={fetchReport}
                className="mt-4 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {report && (
            <>
              {/* Top Metrics Ribbon */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Quotes Evaluated
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-slate-900 dark:text-white">
                      {report.universeScanned}/{report.universeTotal}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">stocks</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Observed Gap Fill Rate
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                      {report.gapSummary.fillRatePercent}%
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      ({report.gapSummary.filledCount}/{report.gapSummary.totalGaps})
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Gap Bias (Up / Down)
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1">
                      <span className="text-emerald-500">+{report.gapSummary.gapUpCount}</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-rose-500">-{report.gapSummary.gapDownCount}</span>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Extreme Gaps (&gt;3%)
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-black text-amber-500">
                      {report.gapSummary.extremeGapsCount}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">extended</span>
                  </div>
                </div>
              </div>

              {/* View 1: Briefing & Highlights */}
              {viewMode === 'briefing' && (
                <div className="space-y-6">
                  {/* Top Gaps of the Day */}
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Activity size={14} className="text-indigo-500" />
                        Largest Observed Opening Gaps
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {report.topGaps.length} Top Setups
                      </span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                      {report.topGaps.map((item, idx) => (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-black text-slate-900 dark:text-white">
                              {item.symbol}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              item.gapPercent >= 0
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            }`}>
                              {item.gapPercent >= 0 ? `+${item.gapPercent}%` : `${item.gapPercent}%`}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Setup: <strong className="text-slate-700 dark:text-slate-300">{item.setupType}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-slate-600 dark:text-slate-400">
                              Fill: <strong className="text-indigo-600 dark:text-indigo-400">{item.fillPercent}%</strong>
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {item.dayChangeFromOpenPercent >= 0 ? '+' : ''}{item.dayChangeFromOpenPercent}% from open
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Source and measurement context */}
                  <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/15">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-2">
                      <Activity size={14} /> Observation Details
                    </h4>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      Source: <strong>{report.source.provider}</strong>, session {report.source.sessionDate}, quote timestamps from {new Date(report.source.quoteAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} through {new Date(report.source.latestQuoteAsOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}. Gap fill means the observed daily range touched the previous close. It does not measure strategy returns, portfolio drawdown, or order execution.
                    </p>
                  </div>
                </div>
              )}

              {/* View 3: Raw Markdown */}
              {viewMode === 'raw' && (
                <div className="relative">
                  <pre className="p-4 rounded-2xl bg-slate-950 text-slate-200 text-xs font-mono leading-relaxed overflow-x-auto max-h-[450px] border border-slate-800 selection:bg-indigo-600">
                    {report.markdownContent}
                  </pre>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Generated: {report ? new Date(report.generatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : '—'} IST</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
