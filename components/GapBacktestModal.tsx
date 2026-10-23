'use client';

interface GapBacktestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GapBacktestModal({ isOpen, onClose }: GapBacktestModalProps) {
  if (!isOpen) return null;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="gap-backtest-unavailable" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <h2 id="gap-backtest-unavailable" className="text-base font-bold text-slate-900 dark:text-white">
          Historical gap backtest unavailable
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Axion has no validated historical gap dataset configured, so it cannot report fill probabilities or strategy performance.
        </p>
        <button onClick={onClose} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
          Close
        </button>
      </section>
    </div>
  );
}
