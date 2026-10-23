'use client';

import React, { useEffect } from 'react';
import {
  ShieldAlert,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Scale,
  X,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { EXECUTION_ASSUMPTIONS } from '../lib/paper-prediction-types';

interface PaperExecutionAssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaperExecutionAssumptionsModal({
  isOpen,
  onClose,
}: PaperExecutionAssumptionsModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="execution-assumptions-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto font-sans">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Scale className="h-5 w-5" />
            </span>
            <div>
              <h2
                id="execution-assumptions-title"
                className="text-base font-black text-gray-900 dark:text-white"
              >
                Execution Realism &amp; Cost Assumptions
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transparent transaction friction and conservative fill invariants
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Execution Assumptions"
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Cost Matrix Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Roundtrip Fees
            </span>
            <span className="text-xl font-black text-gray-900 dark:text-white font-mono mt-1 block">
              {EXECUTION_ASSUMPTIONS.roundtripFeeBps} bps
            </span>
            <span className="text-[10px] text-gray-500">0.10% STT &amp; Charges</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Base Slippage
            </span>
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 block">
              {EXECUTION_ASSUMPTIONS.slippageBps} bps
            </span>
            <span className="text-[10px] text-gray-500">0.05% fill friction</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Total Friction
            </span>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 block">
              {EXECUTION_ASSUMPTIONS.totalCostPct.toFixed(2)}%
            </span>
            <span className="text-[10px] text-gray-500">15 bps baseline</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Stressed Stress-Test
            </span>
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono mt-1 block">
              {EXECUTION_ASSUMPTIONS.stressedCostPct.toFixed(2)}%
            </span>
            <span className="text-[10px] text-gray-500">30 bps 2x stress</span>
          </div>
        </div>

        {/* Detailed Invariant Rules */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase text-gray-700 dark:text-gray-300 tracking-wider">
            Reconciliation &amp; Order Rules
          </h3>

          <div className="space-y-2 text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong>Stop-First Intraday Invariant:</strong>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  {EXECUTION_ASSUMPTIONS.stopFirstRule}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-900 dark:text-blue-300 flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
              <div>
                <strong>Fill &amp; Timing Model:</strong>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  {EXECUTION_ASSUMPTIONS.fillModel}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <strong>Statutory Taxes &amp; Exchange Charges:</strong>
                <p className="mt-0.5 leading-relaxed text-[11px]">
                  {EXECUTION_ASSUMPTIONS.sttAndTaxesDescription}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Idempotence & Recovery Guarantee */}
        <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-purple-500" />
            <span>Idempotent Processing &amp; Crash Recovery</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            Reconciliation writes use atomic staging files and ID-keyed deduplication. Repeated runs
            or process restarts produce identical ledger balances without double fee deductions.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-white transition-colors"
          >
            Close Assumptions
          </button>
        </div>
      </div>
    </div>
  );
}
