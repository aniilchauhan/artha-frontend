'use client';

import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Building2, 
  Users, 
  RefreshCw, 
  Loader2, 
  Award,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import type { NseMarketInsights, NseStockDelivery } from '@/lib/nse-smart-money';

export interface NseSmartMoneyWidgetProps {
  selectedTicker?: string | null;
  onSelectTicker?: (ticker: string) => void;
}

export default function NseSmartMoneyWidget({ selectedTicker, onSelectTicker }: NseSmartMoneyWidgetProps) {
  const [data, setData] = useState<NseMarketInsights | null>(null);
  const [tickerDelivery, setTickerDelivery] = useState<NseStockDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMarketInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/nse/smart-money');
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || 'Failed to fetch insights');
      setData(body.insights);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load NSE data');
    } finally {
      setLoading(false);
    }
  }

  async function loadTickerDelivery(ticker: string) {
    setTickerLoading(true);
    try {
      const res = await fetch(`/api/nse/smart-money?ticker=${encodeURIComponent(ticker)}`);
      const body = await res.json();
      if (res.ok && body.success && body.delivery) {
        setTickerDelivery(body.delivery);
      } else {
        setTickerDelivery(null);
      }
    } catch {
      setTickerDelivery(null);
    } finally {
      setTickerLoading(false);
    }
  }

  useEffect(() => {
    void loadMarketInsights();
  }, []);

  useEffect(() => {
    if (selectedTicker) {
      void loadTickerDelivery(selectedTicker);
    }
  }, [selectedTicker]);

  const participantOi = data?.participantOi;
  const fii = participantOi?.fii;
  const client = participantOi?.client;

  return (
    <section 
      aria-label="NSE Smart Money and Delivery Ingestion"
      className="space-y-6 rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              NSE Smart Money & Delivery Intelligence
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Real-time Bhavcopy security delivery positions and FII / DII derivatives positioning directly from the National Stock Exchange of India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {data?.date && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Layers className="h-3 w-3 text-indigo-500" />
              Session: {data.date}
            </span>
          )}
          <button
            id="refresh-smart-money-btn"
            type="button"
            onClick={() => void loadMarketInsights()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex h-44 items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
          <span>Ingesting latest NSE Bhavcopy & derivatives archives…</span>
        </div>
      )}

      {error && !data && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            <span>Archive Ingestion Delay</span>
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {data && (
        <>
          {/* FII vs Retail Sentiment Banner */}
          {participantOi && (
            <div className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-5 dark:border-indigo-900/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-purple-950/20">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                      Derivatives Market Structure
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {participantOi.institutionalBias}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {participantOi.marketRegime}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-indigo-100/80 px-2.5 py-1 font-bold text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200">
                    FII Long: {fii?.longRatio}%
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-xl bg-purple-100/80 px-2.5 py-1 font-bold text-purple-800 dark:bg-purple-900/60 dark:text-purple-200">
                    Retail Long: {client?.longRatio}%
                  </span>
                </div>
              </div>

              {/* FII Index Long Meter */}
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-600 dark:text-slate-400">FII Index Futures Long Ratio:</span>
                  <span className={`font-mono ${
                    (fii?.longRatio ?? 50) <= 22 ? 'text-rose-600 dark:text-rose-400 font-black' :
                    (fii?.longRatio ?? 50) >= 70 ? 'text-amber-600 dark:text-amber-400 font-black' :
                    'text-emerald-600 dark:text-emerald-400 font-black'
                  }`}>
                    {fii?.longRatio}% ({fii?.sentiment})
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      (fii?.longRatio ?? 50) <= 22 ? 'bg-gradient-to-r from-rose-500 to-amber-500' :
                      (fii?.longRatio ?? 50) >= 70 ? 'bg-gradient-to-r from-amber-500 to-rose-500' :
                      'bg-gradient-to-r from-indigo-500 to-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, fii?.longRatio ?? 0))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0% (Extreme Short)</span>
                  <span>22% (Short Squeeze Zone)</span>
                  <span>50% (Neutral)</span>
                  <span>72% (Distribution Risk)</span>
                  <span>100% (Extreme Long)</span>
                </div>
              </div>
            </div>
          )}

          {/* Selected Stock Delivery Card */}
          {selectedTicker && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Security Delivery Assessment · {selectedTicker}
                  </h4>
                </div>
                {tickerLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
              </div>

              {tickerDelivery ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Delivery Percentage</div>
                    <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                      {tickerDelivery.deliveryPercentage}%
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      {tickerDelivery.deliveryPercentage >= 55 ? '✅ High Demat Transfer' : '⚠️ Intraday Speculative'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Delivered Quantity</div>
                    <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                      {tickerDelivery.deliveryQuantity.toLocaleString('en-IN')}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      Out of {tickerDelivery.tradedQuantity.toLocaleString('en-IN')} traded
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Delivery Value</div>
                    <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">
                      ₹{tickerDelivery.turnoverCr} Cr
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      Total turnover in session
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Institutional Signal</div>
                    <div className="mt-1">
                      {tickerDelivery.isInstitutionalAccumulation ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <TrendingUp className="h-3 w-3" /> Accumulation
                        </span>
                      ) : tickerDelivery.isDistribution ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          <TrendingDown className="h-3 w-3" /> Distribution
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Standard Rotation
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500">
                      Move: {tickerDelivery.changePercent >= 0 ? '+' : ''}{tickerDelivery.changePercent}%
                    </div>
                  </div>
                </div>
              ) : !tickerLoading ? (
                <p className="mt-2 text-xs text-slate-500">
                  Delivery statistics for {selectedTicker} were not active in the latest NSE Bhavcopy equity list.
                </p>
              ) : null}
            </div>
          )}

          {/* Top Institutional Accumulation Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top NSE Institutional Delivery Accumulation Names
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Stocks with &gt;50% of traded shares converted to actual Demat delivery with positive price action and &gt;₹1 Cr turnover.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-400">
                Avg Market Delivery: {data.averageDeliveryPercentage}%
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                    <th className="p-3">Stock Ticker</th>
                    <th className="p-3 text-right">Close Price</th>
                    <th className="p-3 text-right">Day Move</th>
                    <th className="p-3 text-right">Delivery %</th>
                    <th className="p-3 text-right">Delivered Quantity</th>
                    <th className="p-3 text-right">Turnover</th>
                    <th className="p-3 text-center">Smart Money Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {data.topAccumulationStocks.slice(0, 8).map((stock) => (
                    <tr 
                      key={stock.symbol}
                      onClick={() => onSelectTicker?.(stock.symbol)}
                      className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{stock.symbol}</span>
                          <ArrowUpRight className="h-3 w-3 text-slate-400 opacity-60" />
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-slate-800 dark:text-slate-200">
                        ₹{stock.closePrice.toFixed(2)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{stock.changePercent.toFixed(2)}%
                      </td>
                      <td className="p-3 text-right">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                          {stock.deliveryPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        {stock.deliveryQuantity.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                        ₹{stock.turnoverCr.toFixed(1)} Cr
                      </td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          Institutional Buying
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
