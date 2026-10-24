'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Calculator, CheckCircle2, Download, ShieldCheck, X } from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { playTargetChime } from '../lib/sound-notifications';

interface QuickTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
  name?: string;
  currentPrice?: number | null;
  initialTargetPct?: number;
  initialStopLossPct?: number;
}

interface ExecutedOrderReceipt {
  orderId: string;
  ticker: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  executionPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  mode: string;
  status: string;
  timestamp: string;
  grossValue?: number;
  charges?: {
    brokerage: number;
    stt: number;
    gst: number;
    exchangeTurnover: number;
    stampDuty?: number;
    dpCharges?: number;
    sebiCharges?: number;
    slippage?: number;
    totalCharges: number;
    totalFrictionPct?: number;
  };
  dynamicRatchets?: {
    statutoryBreakevenPrice: number;
    profitLockPrice: number;
    breakevenThresholdGainPct: number;
    trailingThresholdGainPct: number;
  };
  expectancy?: {
    grossReturnPct: number;
    netReturnPct: number;
    grossProfitINR: number;
    netProfitINR: number;
    rewardRiskRatio: string;
    netRewardRiskRatio: string;
  };
  netCapitalDeployed?: number;
}

/** Prevents CSV formula injection (cells starting with =, +, -, @). */
function sanitizeCsvCell(value: string | number): string {
  const str = String(value);
  if (/^[=+\-@]/.test(str)) return `'${str}`;
  return str;
}

export default function QuickTradeModal({
  isOpen,
  onClose,
  ticker,
  name,
  currentPrice,
  initialTargetPct = 8.5,
  initialStopLossPct = 3.0,
}: QuickTradeModalProps) {
  const stockContext = useStockContext();
  const addToast = stockContext?.addToast;

  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState(25);
  const [targetPct, setTargetPct] = useState(initialTargetPct);
  const [stopLossPct, setStopLossPct] = useState(initialStopLossPct);
  const [selectedBroker, setSelectedBroker] = useState<'paper' | 'zerodha' | 'angelone' | 'dhan'>('paper');
  const [accountCapital, setAccountCapital] = useState<number>(100000);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionReceipt, setExecutionReceipt] = useState<ExecutedOrderReceipt | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAction('BUY');
      setQuantity(25);
      setTargetPct(initialTargetPct);
      setStopLossPct(initialStopLossPct);
      setExecutionReceipt(null);
      setErrorMsg(null);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen, initialTargetPct, initialStopLossPct, ticker]);

  if (!isOpen) return null;

  const cleanSymbol = ticker.trim().toUpperCase().replace(/\.NS$/, '');
  const price: number | null =
    typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0 ? currentPrice : null;
  const hasPrice = price !== null;

  const targetPrice =
    price === null
      ? null
      : Number((price * (action === 'BUY' ? 1 + targetPct / 100 : 1 - targetPct / 100)).toFixed(2));
  const stopLossPrice =
    price === null
      ? null
      : Number((price * (action === 'BUY' ? 1 - stopLossPct / 100 : 1 + stopLossPct / 100)).toFixed(2));
  const capital = price === null ? null : Number((quantity * price).toFixed(2));
  const projectedProfit =
    price === null || targetPrice === null ? null : Number((quantity * Math.abs(targetPrice - price)).toFixed(2));
  const projectedLoss =
    price === null || stopLossPrice === null ? null : Number((quantity * Math.abs(stopLossPrice - price)).toFixed(2));
  const rewardRisk = targetPct > 0 && stopLossPct > 0 ? (targetPct / stopLossPct).toFixed(2) : '—';
  const money = (value: number | null) =>
    value === null ? 'Unavailable' : `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  const targetOptions = [5, 8.5, 10, 15, 25];
  const stopOptions = [2, 3, 4, 5];

  // 1% Risk Size calculation
  const perShareRisk = price && stopLossPrice ? Math.max(0.1, Math.abs(price - stopLossPrice)) : 0;
  const rupeeRiskBudget = accountCapital * 0.01;
  const recommendedQty = perShareRisk > 0 && price ? Math.max(1, Math.floor(rupeeRiskBudget / perShareRisk)) : 25;

  const handleApplyRiskSize = () => {
    setQuantity(recommendedQty);
    if (addToast) {
      addToast(
        `Applied 1% institutional risk sizing: ${recommendedQty} shares (₹${rupeeRiskBudget.toFixed(0)} risk budget).`,
        'info',
        cleanSymbol
      );
    }
  };

  const handleDownloadKiteBasketCsv = () => {
    if (!price) return;
    const headers = ['Instrument', 'Exchange', 'Order Type', 'Product', 'Action', 'Quantity', 'Limit Price', 'Trigger Price'];
    const row = [
      sanitizeCsvCell(cleanSymbol),
      'NSE',
      'LIMIT',
      'CNC',
      action,
      sanitizeCsvCell(quantity),
      sanitizeCsvCell(price.toFixed(2)),
      '0',
    ];
    const csvContent = `${headers.join(',')}\n${row.join(',')}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `axion_kite_basket_${cleanSymbol}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (addToast) {
      addToast(`Downloaded Zerodha Kite Basket CSV for ${cleanSymbol}`, 'success', cleanSymbol);
    }
  };

  const handleExecuteOrder = async () => {
    if (!price) return;
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/stock-ai/quick-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: cleanSymbol,
          action,
          quantity,
          price,
          targetPrice,
          stopLossPrice,
          mode: selectedBroker,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Execution dispatch failed');
      }

      playTargetChime();
      setExecutionReceipt(data.data);
      if (addToast) {
        addToast(
          `${action} order for ${quantity} share(s) of ${cleanSymbol} executed successfully at ₹${data.data?.executionPrice || price}`,
          'success',
          cleanSymbol
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Execution failed');
      if (addToast) {
        addToast(`Order failed: ${err.message}`, 'warning', cleanSymbol);
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 sm:p-4 backdrop-blur-md overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="trade-scenario-title"
        className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-indigo-200/80 bg-white p-4 sm:p-6 text-gray-900 shadow-2xl dark:border-indigo-900/60 dark:bg-gray-900 dark:text-white my-auto"
      >
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
              <Calculator size={19} />
            </div>
            <div>
              <h3 id="trade-scenario-title" className="text-lg font-black tracking-tight">
                {cleanSymbol}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {name || `${cleanSymbol} · NSE Equity`} · NSE Equity
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Reference Price Display */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2.5 text-xs dark:bg-gray-800/70">
          <span className="text-gray-500">Reference quote</span>
          <span className="font-mono text-sm font-black text-gray-900 dark:text-white">
            {price === null ? 'Unavailable' : `₹${price.toFixed(2)}`}
          </span>
        </div>

        {!hasPrice && (
          <div
            role="status"
            className="mt-3 flex gap-2 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <AlertTriangle size={16} className="shrink-0" />
            <span>A usable quote was not supplied, so scenario prices and totals are unavailable.</span>
          </div>
        )}

        {/* Action Toggle */}
        <div className="mt-4 flex gap-2">
          {(['BUY', 'SELL'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => setAction(side)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition-all cursor-pointer ${
                action === side
                  ? side === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {side} scenario
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3.5">
          {/* Shares Input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              Shares
              <input
                type="number"
                role="spinbutton"
                min={1}
                step={1}
                value={quantity}
                onChange={(event) =>
                  setQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))
                }
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 font-mono text-sm font-bold text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              />
            </label>
          </div>

          {/* 1% Risk Size Optimizer */}
          <div className="rounded-2xl border border-indigo-200/90 bg-indigo-50/50 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                <ShieldCheck size={15} /> Institutional 1% Risk Sizing Model
              </span>
              <button
                type="button"
                onClick={handleApplyRiskSize}
                className="rounded-lg bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-indigo-500 cursor-pointer shadow-xs"
              >
                Apply 1% ({recommendedQty} shares)
              </button>
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-xs">
              <label className="text-gray-600 dark:text-gray-400">
                Account Capital:
                <input
                  type="number"
                  step={5000}
                  value={accountCapital}
                  onChange={(e) => setAccountCapital(Math.max(1000, Number(e.target.value) || 100000))}
                  className="ml-2 w-28 rounded-lg border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs font-bold dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </label>
              <span className="text-[11px] text-gray-500 font-mono">
                1% Budget: ₹{rupeeRiskBudget.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Target & Stop Grids */}
          <div className="grid grid-cols-2 gap-3">
            {/* Target */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs dark:border-emerald-950 dark:bg-emerald-950/20">
              <span className="font-semibold text-emerald-900 dark:text-emerald-300">Target Move</span>
              {/* Presets */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {targetOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTargetPct(opt)}
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold cursor-pointer ${
                      targetPct === opt
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-emerald-800 dark:bg-gray-800 dark:text-emerald-300'
                    }`}
                  >
                    {opt}%
                  </button>
                ))}
              </div>
              <span className="mt-2 block font-mono text-sm font-black text-emerald-800 dark:text-emerald-200">
                {money(targetPrice)}
              </span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                {projectedProfit !== null ? `+${money(projectedProfit)} profit` : 'Unavailable'}
              </span>
            </div>

            {/* Stop Loss */}
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 text-xs dark:border-rose-950 dark:bg-rose-950/20">
              <span className="font-semibold text-rose-900 dark:text-rose-300">Stop Move</span>
              {/* Presets */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {stopOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStopLossPct(opt)}
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold cursor-pointer ${
                      stopLossPct === opt
                        ? 'bg-rose-600 text-white'
                        : 'bg-white text-rose-800 dark:bg-gray-800 dark:text-rose-300'
                    }`}
                  >
                    {opt}%
                  </button>
                ))}
              </div>
              <span className="mt-2 block font-mono text-sm font-black text-rose-800 dark:text-rose-200">
                {money(stopLossPrice)}
              </span>
              <span className="text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                {projectedLoss !== null ? `-${money(projectedLoss)} loss` : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Capital and Ratio Summary */}
          <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3.5 py-2 text-xs font-mono dark:bg-gray-800/60">
            <span className="text-gray-500">Capital: {money(capital)}</span>
            <span className="font-bold text-gray-900 dark:text-white">Capital at reference price: {money(capital)}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-indigo-200 bg-indigo-50/60 px-3.5 py-2 text-xs font-mono dark:border-indigo-950 dark:bg-indigo-950/30">
            <span className="text-gray-500">Scenario reward / risk</span>
            <span className="font-bold text-indigo-700 dark:text-indigo-300">{rewardRisk}:1</span>
          </div>

          {/* Broker Destination Selector */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-900/60">
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Target Execution Gateway
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { id: 'paper', label: 'Paper Sandbox' },
                { id: 'zerodha', label: 'Zerodha Kite' },
                { id: 'angelone', label: 'Angel SmartAPI' },
                { id: 'dhan', label: 'Dhan HQ' },
              ].map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBroker(b.id as any)}
                  className={`rounded-xl py-2 px-1 text-[11px] font-bold transition-all cursor-pointer ${
                    selectedBroker === b.id
                      ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Execution Confirmation Receipt (if filled) */}
          {executionReceipt && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/90 p-4 text-xs dark:border-emerald-800 dark:bg-emerald-950/40 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-300 text-sm">
                <CheckCircle2 size={18} /> Order Executed Successfully!
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2 font-mono text-[11px] text-gray-700 dark:text-gray-300">
                <div>Order ID: <strong className="text-gray-900 dark:text-white">{executionReceipt.orderId}</strong></div>
                <div>Status: <span className="rounded bg-emerald-600 text-white px-1.5 py-0.5 text-[10px] font-bold">FILLED</span></div>
                <div>Fill Price: <strong>₹{executionReceipt.executionPrice}</strong></div>
                <div>Net Capital: <strong>₹{executionReceipt.netCapitalDeployed?.toLocaleString('en-IN')}</strong></div>
                <div>Taxes & Friction: <strong>₹{executionReceipt.charges?.totalCharges} ({executionReceipt.charges?.totalFrictionPct?.toFixed(2)}%)</strong></div>
                <div>Net R:R Ratio: <strong className="text-emerald-700 dark:text-emerald-400">{executionReceipt.expectancy?.netRewardRiskRatio || `${rewardRisk}:1`}</strong></div>
                {executionReceipt.dynamicRatchets && (
                  <div className="col-span-2 pt-1 border-t border-emerald-200 dark:border-emerald-800/60 text-[10px] text-emerald-800 dark:text-emerald-300 flex justify-between">
                    <span>🛡️ Breakeven Stop: ₹{executionReceipt.dynamicRatchets.statutoryBreakevenPrice} (+0.8%)</span>
                    <span>📈 Profit Lock: ₹{executionReceipt.dynamicRatchets.profitLockPrice} (+4.5%)</span>
                  </div>
                )}
                <div>Gateway: <strong className="uppercase">{executionReceipt.mode}</strong></div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Action Buttons: 1-Click Execution & Export Basket CSV */}
        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            disabled={!hasPrice || isExecuting}
            onClick={handleExecuteOrder}
            className={`w-full rounded-2xl py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all cursor-pointer ${
              action === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
            } disabled:opacity-50`}
          >
            {isExecuting ? 'Executing...' : `Execute ${action} ${quantity} Shares`}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!hasPrice}
              onClick={handleDownloadKiteBasketCsv}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 cursor-pointer shadow-xs"
              title="Download Zerodha Kite 1-click basket CSV"
            >
              <Download size={14} /> Export Kite Basket CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-100 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        <p className="mt-3.5 text-center text-[10px] text-gray-400 dark:text-gray-500">
          Institutional Risk Execution Engine · 0.15% roundtrip friction modeled.
        </p>
      </section>
    </div>
  );
}
