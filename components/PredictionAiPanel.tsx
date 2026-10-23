'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import type { PredictionAiAssessment, AiPredictionVerdict } from '../lib/prediction-ai-types';
import CompanyHoldAssessment from './CompanyHoldAssessment';
import SavedOllamaReviewPanel from './SavedOllamaReviewPanel';

interface PredictionAiPanelProps {
  ticker?: string;
  onTickerChange?: (ticker: string) => void;
  fixedTicker?: boolean;
  onAnalysisSaved?: () => void;
}

const verdictLabels: Record<AiPredictionVerdict, string> = {
  supports_setup: 'Supports the setup',
  caution: 'Proceed with caution',
  conflicts_with_setup: 'Conflicts with the setup',
  insufficient_evidence: 'Insufficient evidence',
};

const cleanTicker = (value: string) => value.trim().toUpperCase().replace(/\.NS$/, '');
const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
};
const formatDay = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

const formatProviderLabel = (source: string) => {
  const labels: Record<string, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
    groq: 'Groq LPU',
    xai: 'xAI Grok',
    deepseek: 'DeepSeek',
    openrouter: 'OpenRouter',
    huggingface: 'Hugging Face',
    ollama: 'Local Ollama',
  };
  return labels[source] || source;
};

function metricLabel(metric: string) {
  const labels: Record<string, string> = {
    close: 'Last completed close',
    sma20: '20-session moving average',
    sma50: '50-session moving average',
    return1dPct: '1-session return',
    return5dPct: '5-session return',
    return20dPct: '20-session return',
    volatility20dPct: '20-session daily volatility',
    high20dClose: '20-session highest close',
    low20dClose: '20-session lowest close',
    rsi14: 'RSI (14)',
    modelScore: 'Quantitative model score',
  };
  return labels[metric] ?? metric.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
}

function metricValue(metric: string, value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return 'Unavailable';
  if (metric === 'modelScore') return `${(value * 100).toFixed(1)}%`;
  const formatted = value.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  if (/pct|percent/i.test(metric)) return `${formatted}%`;
  if (['close', 'sma20', 'sma50', 'high20dClose', 'low20dClose'].includes(metric)) return `₹${formatted}`;
  return formatted;
}

export default function PredictionAiPanel({ ticker, onTickerChange, fixedTicker = false, onAnalysisSaved }: PredictionAiPanelProps) {
  const [draftTicker, setDraftTicker] = useState('');
  const [assessment, setAssessment] = useState<PredictionAiAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const currentRequest = useRef(0);
  const abortController = useRef<AbortController | null>(null);
  const inputId = useId();
  const inputTicker = ticker ?? draftTicker;
  const symbol = cleanTicker(inputTicker);

  function cancelRequest() {
    currentRequest.current += 1;
    abortController.current?.abort();
    abortController.current = null;
  }

  useEffect(() => {
    cancelRequest();
    setAssessment(null);
    setError(null);
    setLoading(false);
    return cancelRequest;
  }, [symbol]);

  function changeTicker(value: string) {
    cancelRequest();
    setAssessment(null);
    setError(null);
    setLoading(false);
    if (onTickerChange) onTickerChange(value.toUpperCase());
    else setDraftTicker(value.toUpperCase());
  }

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!symbol || loading) return;
    cancelRequest();
    const requestId = currentRequest.current;
    const controller = new AbortController();
    abortController.current = controller;
    setLoading(true);
    setError(null);
    setAssessment(null);
    try {
      const response = await fetch('/api/stock-ai/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (requestId !== currentRequest.current || controller.signal.aborted) return;
      if (response.status === 401) throw new Error('Sign in to your account, then try Analyze with AI again.');
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error || 'AI analysis is unavailable. Please try again.');
      }
      if (cleanTicker(payload.data.ticker) !== symbol) throw new Error('The AI returned a different ticker. Please try again.');
      const nextAssessment: PredictionAiAssessment = { ...payload.data, journal: payload.journal ?? payload.data.journal };
      setAssessment(nextAssessment);
      if (nextAssessment.journal?.status === 'recorded' || nextAssessment.journal?.status === 'existing') onAnalysisSaved?.();
    } catch (err) {
      if (requestId !== currentRequest.current || controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Could not reach the AI service. Please try again.');
    } finally {
      if (requestId === currentRequest.current && !controller.signal.aborted) {
        setLoading(false);
        abortController.current = null;
      }
    }
  }

  const visibleAssessment = assessment && cleanTicker(assessment.ticker) === symbol ? assessment : null;

  return (
    <section aria-label="AI prediction review" className="overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-sm dark:border-indigo-500/25 dark:bg-gray-900">
      {symbol && <SavedOllamaReviewPanel key={symbol} ticker={symbol} />}
      <div className="bg-gradient-to-br from-indigo-50 via-white to-teal-50/60 p-5 sm:p-6 dark:from-indigo-950/40 dark:via-gray-900 dark:to-teal-950/20">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-indigo-600 p-2.5 text-white"><Sparkles className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">AI prediction review</h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-600 dark:text-gray-400">
              Assess an NSE stock using prices, volume, Nifty context, fundamentals, news and earnings dates, plus web and public X/Instagram evidence when connected. No scanner run is required.
            </p>
          </div>
        </div>
        <form onSubmit={analyze} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          {fixedTicker ? (
            <p className="py-2 text-lg font-bold text-gray-900 dark:text-white">{symbol}</p>
          ) : (
            <div className="w-full sm:max-w-xs">
              <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-300">NSE ticker</label>
              <input id={inputId} value={inputTicker} onChange={(event) => changeTicker(event.target.value)} placeholder="e.g. RELIANCE" maxLength={40} autoComplete="off" spellCheck={false} className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-white" />
            </div>
          )}
          <button type="submit" disabled={!symbol || loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Analyzing…' : 'Analyze with AI'}
          </button>
        </form>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Runs only when requested. A quantitative model score is optional. AI accuracy has not been validated.</p>
      </div>

      {loading && <div role="status" className="border-t border-indigo-100 px-6 py-4 text-sm text-indigo-700 dark:border-gray-800 dark:text-indigo-300"><p>Reviewing market evidence for {symbol}…</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The first run with a local model can take up to 90 seconds.</p></div>}
      {error && <div role="alert" className="m-5 flex items-start gap-2 rounded-2xl border border-amber-400/30 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-300"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><p>{error}</p></div>}

      {visibleAssessment && (
        <div className="space-y-5 border-t border-gray-100 p-5 sm:p-6 dark:border-gray-800" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="mr-1 text-base font-bold text-gray-900 dark:text-white">{visibleAssessment.ticker}</h3>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300">{verdictLabels[visibleAssessment.verdict]}</span>
            <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold capitalize text-gray-600 dark:border-gray-700 dark:text-gray-300">{visibleAssessment.outlook} outlook</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Unvalidated AI review</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{visibleAssessment.summary}</p>
          {visibleAssessment.context.coverage && (
            <div aria-label="Evidence coverage" className="flex flex-wrap gap-2">
              {visibleAssessment.context.coverage.map(item => <span key={item.category} className={`rounded-full px-3 py-1 text-xs capitalize ${item.status === 'available' ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300' : 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'}`}>{item.category}: {item.status}</span>)}
            </div>
          )}
          {visibleAssessment.context.coverage?.some(item => item.detail) && <div className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 dark:bg-gray-800/50 dark:text-gray-400" aria-label="Web and social source status"><p className="mb-2 font-semibold">Web and social coverage</p><ul className="space-y-2">{visibleAssessment.context.coverage.filter(item => item.detail).map(item => <li key={item.category}><span className="font-semibold capitalize">{item.category === 'x' ? 'X' : item.category}: </span>{item.detail}</li>)}</ul></div>}
          {visibleAssessment.journal && (
            <div role="status" className={`rounded-2xl border p-3 text-xs leading-relaxed ${visibleAssessment.journal.status === 'unavailable' ? 'border-amber-300/50 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-300' : 'border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-800 dark:bg-teal-950/20 dark:text-teal-300'}`}>
              <p className="font-semibold">{visibleAssessment.journal.status === 'recorded' ? 'Saved to the prediction journal' : visibleAssessment.journal.status === 'existing' ? 'Already in the prediction journal' : 'Prediction journal unavailable'}</p>
              <p className="mt-1">{visibleAssessment.journal.message}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">Quantitative baseline score</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                {visibleAssessment.context.baseline.status === 'available' && visibleAssessment.context.baseline.score !== null
                  ? `${(visibleAssessment.context.baseline.score * 100).toFixed(1)}%`
                  : 'Unavailable'}
              </p>
              {visibleAssessment.context.baseline.status === 'available' && visibleAssessment.context.baseline.score !== null && (
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      visibleAssessment.context.baseline.score >= 0.70
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : visibleAssessment.context.baseline.score >= 0.55
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {visibleAssessment.context.baseline.score >= 0.70
                      ? 'Higher model score'
                      : visibleAssessment.context.baseline.score >= 0.55
                      ? 'Middle model score'
                      : 'Lower model score'}
                  </span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    Score calibration is not established; this is not a win probability.
                  </span>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{visibleAssessment.context.baseline.reason}</p>
              {visibleAssessment.context.baseline.date && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Model date: {formatDay(visibleAssessment.context.baseline.date)}
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">Last completed close</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">₹{visibleAssessment.context.referencePrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Quote: {visibleAssessment.context.quoteStatus}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
              <p className="text-xs text-gray-500 dark:text-gray-400">Assessment horizon</p>
              <p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">Next session</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Session after {formatDay(visibleAssessment.context.historyAsOf)}; this may be the current session.</p>
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Evidence used by AI</h4>
              <ul className="space-y-2">
                {visibleAssessment.evidence.map((item, index) => {
                  const source = visibleAssessment.context.sources?.find(source => source.id === item.metric);
                  return (
                  <li key={`${item.metric}-${index}`} className="rounded-2xl border border-gray-100 p-3 dark:border-gray-800">
                    <div className="text-xs font-semibold text-gray-900 dark:text-gray-100"><span>{source?.label ?? metricLabel(item.metric)}</span><p className="mt-1 font-mono">{source ? `${source.value}${source.unit ? ` ${source.unit}` : ''}` : metricValue(item.metric, visibleAssessment.context.metrics[item.metric])}</p></div>
                    <p className="mt-1.5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">{item.interpretation}</p>
                    {source?.verification === 'unverified' && <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">Unverified {source.contentType === 'social_post' ? 'social claim' : 'search excerpt'} · Requires corroboration</p>}
                    {source && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400"><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline dark:text-indigo-300">{source.source}</a> · {source.asOf ? `As of ${formatDate(source.asOf)} IST` : 'Reporting/publication date unverified'} · Retrieved {formatDate(source.retrievedAt)} IST</p>}
                  </li>
                ); })}
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Risks and invalidation</h4>
              <ul className="space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                {visibleAssessment.risks.map((risk, index) => <li key={index} className="flex gap-2"><ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /><span>{risk}</span></li>)}
              </ul>
              <div className="mt-4 rounded-2xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><span className="font-bold">What would invalidate this view: </span>{visibleAssessment.invalidation}</div>
            </div>
          </div>
          {!!visibleAssessment.context.sources?.length && (
            <details className="rounded-2xl border border-gray-200 p-4 text-xs dark:border-gray-700">
              <summary className="cursor-pointer font-semibold text-gray-700 dark:text-gray-200">All collected sources ({visibleAssessment.context.sources.length})</summary>
              <ul className="mt-3 space-y-3 text-gray-600 dark:text-gray-400">
                {visibleAssessment.context.sources.map(source => <li key={source.id}><p><span className="font-semibold">{source.label}:</span> {source.value} {source.unit}</p>{source.verification === 'unverified' && <p className="mt-1 text-amber-700 dark:text-amber-300">Unverified {source.contentType === 'social_post' ? 'social claim' : 'search excerpt'} · Requires corroboration</p>}<p className="mt-1"><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline dark:text-indigo-300">{source.source}</a> · {source.asOf ? `As of ${formatDate(source.asOf)} IST` : 'Reporting/publication date unverified'} · Retrieved {formatDate(source.retrievedAt)} IST</p></li>)}
              </ul>
            </details>
          )}
          <CompanyHoldAssessment key={visibleAssessment.ticker} ticker={visibleAssessment.ticker} days={1} />
          <div className="space-y-2 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <p>{visibleAssessment.validation.note}</p>
            {visibleAssessment.context.limitations.length > 0 && <ul className="list-disc space-y-1 pl-4">{visibleAssessment.context.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}</ul>}
            <p>Provider: {formatProviderLabel(visibleAssessment.source)} · Model: {visibleAssessment.model}</p>
            <p>Generated: {formatDate(visibleAssessment.generatedAt)} IST · Quote as of: {formatDate(visibleAssessment.context.quoteAsOf)} IST · History through: {formatDay(visibleAssessment.context.historyAsOf)}</p>
          </div>
        </div>
      )}
    </section>
  );
}
