'use client';

import { useStockContext } from '../context/StockContext';

export default function PortfolioSaveStatus() {
  const { portfolioSync, retryPortfolioSave, useSavedPortfolio, downloadPendingPortfolio } = useStockContext();
  if (!portfolioSync) return null;
  const attention = ['error', 'conflict', 'pending'].includes(portfolioSync.status);
  return <section aria-label="Portfolio save status" className="mb-4 rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
    <p role="status" aria-live="polite">{portfolioSync.message}</p>
    {attention && <div className="mt-2 flex flex-wrap gap-3">
      <button type="button" className="underline" onClick={retryPortfolioSave}>Retry save</button>
      <button type="button" className="underline" onClick={downloadPendingPortfolio}>Download pending changes</button>
      <button type="button" className="underline" onClick={useSavedPortfolio}>Discard pending changes and use account data</button>
    </div>}
  </section>;
}
