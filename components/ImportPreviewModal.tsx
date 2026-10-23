'use client';

import React, { useState } from 'react';
import { ImportAnalysisResult, ImportedTrade } from '../lib/portfolio-csv';
import { CheckCircle2, AlertTriangle, Copy, XCircle, FileSpreadsheet, ArrowRight, ShieldCheck } from 'lucide-react';

interface ImportPreviewModalProps {
  analysis: ImportAnalysisResult;
  onConfirm: (validTrades: ImportedTrade[], updateHoldings: boolean) => void;
  onCancel: () => void;
}

export default function ImportPreviewModal({ analysis, onConfirm, onCancel }: ImportPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<'valid' | 'duplicates' | 'rejected'>('valid');
  const [syncHoldings, setSyncHoldings] = useState(false);

  const { summary, validTrades, duplicateTrades, rejectedRows, fileName } = analysis;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Import Trades Preview"
    >
      <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-gray-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Import Preview &amp; Verification
                {fileName && <span className="text-xs font-mono font-normal text-gray-400">({fileName})</span>}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Review parsed trades, matched stock symbols, duplicates and skipped rows before applying to your portfolio.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="sr-only">Close</span>
            &times;
          </button>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <button
            type="button"
            onClick={() => setActiveTab('valid')}
            className={`p-3 rounded-xl text-left border transition-all ${
              activeTab === 'valid'
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30'
                : 'border-gray-200 dark:border-gray-800 hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <span>Ready to Import</span>
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-xl font-mono font-black text-gray-900 dark:text-white">
              {summary.validCount}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {summary.buyCount} Buys · {summary.sellCount} Sells
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`p-3 rounded-xl text-left border transition-all ${
              activeTab === 'duplicates'
                ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/30'
                : 'border-gray-200 dark:border-gray-800 hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-400">
              <span>Duplicates Skipped</span>
              <Copy className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-xl font-mono font-black text-gray-900 dark:text-white">
              {summary.duplicateCount}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Already in ledger</div>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`p-3 rounded-xl text-left border transition-all ${
              activeTab === 'rejected'
                ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30'
                : 'border-gray-200 dark:border-gray-800 hover:border-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-400">
              <span>Invalid / Skipped</span>
              <XCircle className="h-4 w-4" />
            </div>
            <div className="mt-1.5 text-xl font-mono font-black text-gray-900 dark:text-white">
              {summary.rejectedCount}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Subtotals or errors</div>
          </button>

          <div className="p-3 rounded-xl text-left border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40">
            <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">Est. Realized P&amp;L</span>
            <div className={`mt-1.5 text-lg font-mono font-black ${Number(summary.estimatedRealizedPnl || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {Number(summary.estimatedRealizedPnl || 0) >= 0 ? '+' : ''}₹{Number(summary.estimatedRealizedPnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Turnover: ₹{(Number(summary.totalBuyValue || 0) + Number(summary.totalSellValue || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-100 dark:border-gray-800 px-5 gap-4 text-xs font-bold bg-gray-50/30 dark:bg-gray-950/20">
          <button
            type="button"
            onClick={() => setActiveTab('valid')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'valid'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Valid Trades ({validTrades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('duplicates')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'duplicates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Duplicates ({duplicateTrades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'rejected'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Rejected Rows ({rejectedRows.length})
          </button>
        </div>

        {/* Table Content Area */}
        <div className="flex-1 overflow-y-auto p-5 min-h-[250px]">
          {activeTab === 'valid' && (
            validTrades.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No valid trades found to import in this file.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                      <th className="pb-2 font-bold">Date</th>
                      <th className="pb-2 font-bold">Stock / ISIN Match</th>
                      <th className="pb-2 font-bold">Action</th>
                      <th className="pb-2 text-right font-bold">Qty</th>
                      <th className="pb-2 text-right font-bold">Price</th>
                      <th className="pb-2 text-right font-bold">Net Value</th>
                      <th className="pb-2 text-right font-bold">Reported P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800 font-mono">
                    {validTrades.map((trade, i) => (
                      <tr key={trade.id || i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                        <td className="py-2 text-gray-600 dark:text-gray-300">{trade.timestamp}</td>
                        <td className="py-2">
                          <div className="font-sans font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span>{trade.ticker}</span>
                            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded font-mono font-medium">
                              Verified Symbol
                            </span>
                          </div>
                          {trade.displayName && trade.displayName !== trade.ticker && (
                            <span className="font-sans text-[10px] text-gray-400 block truncate max-w-xs">{trade.displayName}</span>
                          )}
                        </td>
                        <td className="py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            trade.action === 'BUY'
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                          }`}>
                            {trade.action}
                          </span>
                        </td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">{trade.quantity}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">₹{Number(trade.price || 0).toFixed(2)}</td>
                        <td className="py-2 text-right text-gray-900 dark:text-white">₹{Number(trade.netValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                        <td className="py-2 text-right">
                          {trade.reportedPnl != null && Number.isFinite(trade.reportedPnl) ? (
                            <span className={trade.reportedPnl >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                              {trade.reportedPnl >= 0 ? '+' : ''}₹{Number(trade.reportedPnl).toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {activeTab === 'duplicates' && (
            duplicateTrades.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No duplicate trades detected. All trades are new!
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  These trades match entries already present in your ledger and will be skipped to prevent double-counting.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-400 uppercase">
                        <th className="pb-2 font-bold">Date</th>
                        <th className="pb-2 font-bold">Stock</th>
                        <th className="pb-2 font-bold">Action</th>
                        <th className="pb-2 text-right font-bold">Qty</th>
                        <th className="pb-2 text-right font-bold">Price</th>
                        <th className="pb-2 font-bold">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800 font-mono">
                      {duplicateTrades.map((d, i) => (
                        <tr key={i} className="text-gray-500">
                          <td className="py-2">{d.trade.timestamp}</td>
                          <td className="py-2 font-sans font-bold">{d.trade.ticker}</td>
                          <td className="py-2">{d.trade.action}</td>
                          <td className="py-2 text-right">{d.trade.quantity}</td>
                          <td className="py-2 text-right">₹{Number(d.trade?.price || 0).toFixed(2)}</td>
                          <td className="py-2 font-sans text-xs text-amber-600">{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {activeTab === 'rejected' && (
            rejectedRows.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                Zero rejected rows! The entire file was parsed cleanly.
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  The following rows were excluded because they are either broker section summaries (e.g. Subtotals) or had incomplete metrics.
                </p>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rejectedRows.map((r, i) => (
                    <div key={i} className="py-2.5 flex items-start justify-between gap-4 text-xs">
                      <div>
                        <span className="font-mono font-bold text-gray-700 dark:text-gray-300">
                          Row {r.rowNumber}
                        </span>
                        <p className="text-rose-600 dark:text-rose-400 font-medium mt-0.5">{r.reason}</p>
                        {r.rawLine && (
                          <p className="font-mono text-[10px] text-gray-400 truncate max-w-xl mt-0.5 bg-gray-50 dark:bg-gray-950 p-1 rounded">
                            {r.rawLine}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded shrink-0">
                        Excluded
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* Modal Footer & Actions */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={syncHoldings}
              onChange={(e) => setSyncHoldings(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Also update Current Holdings for imported stocks (manual holdings are preserved)</span>
            </span>
          </label>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validTrades.length === 0}
              onClick={() => onConfirm(validTrades, syncHoldings)}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-md shadow-indigo-500/20 cursor-pointer flex items-center gap-1.5"
            >
              <span>Confirm &amp; Import {validTrades.length} Trades</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
