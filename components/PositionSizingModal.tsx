'use client';


import React, { useState, useId } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Calculator,
  X,
  Copy,
  Check,
  AlertTriangle,
} from 'lucide-react';
import Link from './WorkspaceLink';

interface PositionSizingModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker?: string;
  symbol: string;
  entryPrice: number;
  stopLossPrice: number;
  targetPrice: number;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);

export default function PositionSizingModal({
  isOpen,
  onClose,
  symbol,
  entryPrice,
  stopLossPrice,
  targetPrice,
}: PositionSizingModalProps) {
  const [totalCapital, setTotalCapital] = useState<number>(500000); // ₹5,00,000 standard
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // 1.0% default
  const [copied, setCopied] = useState<boolean>(false);

  const capitalInputId = useId();
  const riskInputId = useId();

  if (!isOpen) return null;

  const riskPerShare = Math.max(0.1, Math.abs(entryPrice - stopLossPrice));
  const maxRupeeRisk = (totalCapital * riskPercent) / 100;
  const quantity = Math.max(1, Math.floor(maxRupeeRisk / riskPerShare));
  const positionValue = quantity * entryPrice;
  const portfolioExposurePct = Math.round((positionValue / totalCapital) * 1000) / 10;
  const projectedProfitRupees = Math.round(quantity * (targetPrice - entryPrice));
  const maxLossRupees = Math.round(quantity * riskPerShare);
  const rewardRiskRatio =
    Math.round((Math.abs(targetPrice - entryPrice) / riskPerShare) * 100) / 100;

  // Axion Return Improvement Plan Constraints:
  // - Single stock exposure cap: 3%–5% ideal, > 5% warning
  const exceedsConcentrationCap = portfolioExposurePct > 5.0;
  // - Max stop distance: > 3% triggers caution
  const stopDistancePct = Math.round((riskPerShare / entryPrice) * 1000) / 10;
  const isStopTooWide = stopDistancePct > 3.0;

  const copyOrderDraft = () => {
    const draft = `SIMULATED ORDER DRAFT [${symbol}]\nType: BUY CNC/MIS\nQty: ${quantity} shares\nEntry Ref: ${formatINR(entryPrice)}\nTarget: ${formatINR(targetPrice)} (+${Math.round(((targetPrice - entryPrice) / entryPrice) * 100)}%)\nStop Loss: ${formatINR(stopLossPrice)} (-${stopDistancePct}%)\nMax Risk: ${formatINR(maxLossRupees)} (${riskPercent}%)\nPosition Value: ${formatINR(positionValue)}\nNo order has been submitted.`;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Position Sizing Estimate
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {symbol} • Entry: {formatINR(entryPrice)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label
              htmlFor={capitalInputId}
              className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5"
            >
              Total Portfolio Capital
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₹
              </span>
              <input
                id={capitalInputId}
                type="number"
                value={totalCapital}
                onChange={e => setTotalCapital(Math.max(1000, Number(e.target.value) || 0))}
                className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor={riskInputId}
              className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1.5"
            >
              Max Risk Per Trade (%)
            </label>
            <div className="relative">
              <input
                id={riskInputId}
                type="number"
                step="0.25"
                min="0.25"
                max="5.0"
                value={riskPercent}
                onChange={e => setRiskPercent(Math.max(0.1, Number(e.target.value) || 1.0))}
                className="w-full pl-3 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                %
              </span>
            </div>
          </div>
        </div>

        {/* Calculation Result Ribbon */}
        <div className="rounded-2xl p-4 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 mb-5">
          <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 uppercase font-bold tracking-wider mb-2">
            Hypothetical Sizing Estimate · No Order Created
          </div>
          <div className="flex items-baseline justify-between mb-3">
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {quantity.toLocaleString('en-IN')}
              </span>
              <span className="text-xs font-bold text-slate-500 ml-1.5">Shares</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-mono block">Order Value</span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {formatINR(positionValue)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-indigo-500/20 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Max Rupee Risk</span>
              <span className="font-bold text-rose-500">{formatINR(maxLossRupees)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Gross Target Difference</span>
              <span className="font-bold text-emerald-500">+{formatINR(projectedProfitRupees)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-mono">Exposure %</span>
              <span
                className={`font-bold ${
                  exceedsConcentrationCap ? 'text-amber-500' : 'text-slate-900 dark:text-white'
                }`}
              >
                {portfolioExposurePct}%
              </span>
            </div>
          </div>
        </div>

        <div role="note" className="mb-4 rounded-xl border border-amber-300/70 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100">
          This legacy sizing tool is a calculator only. It cannot record a paper fill, and these levels are not an approved trade plan. Create a conditional plan from a dated Radar signal instead.
          <Link href="/rapid-moves" className="ml-1 font-bold underline">Open the research radar</Link>
        </div>

        {/* Guardrail Warnings */}
        <div className="space-y-2 mb-5">
          {exceedsConcentrationCap && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
              <span>
                <strong>Concentration Cap:</strong> Position consumes {portfolioExposurePct}% of portfolio. Return Improvement Plan advises capping single stock allocation at 5.0%.
              </span>
            </div>
          )}
          {isStopTooWide && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-700 dark:text-rose-300">
              <ShieldAlert size={14} className="shrink-0 mt-0.5 text-rose-500" />
              <span>
                <strong>Wide Stop Distance:</strong> Stop loss is {stopDistancePct}% away. Consider reducing position size to avoid excessive volatility drawdowns.
              </span>
            </div>
          )}
          {!exceedsConcentrationCap && !isStopTooWide && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300">
              <ShieldCheck size={14} className="text-emerald-500" />
                <span>Within this calculator&apos;s thresholds only; fees, liquidity and gap risk are not included.</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={copyOrderDraft}
            className="py-2.5 px-3.5 rounded-xl bg-indigo-50 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-indigo-200 dark:border-slate-700"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Draft'}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
