'use client';

import Link from './WorkspaceLink';
import { useStockContext } from '../context/StockContext';

const steps = [
  { title: '1. What Qualifies Today?', href: '/', detail: 'Check the latest scan, data quality and qualifying candidates.' },
  { title: '2. Inspect Evidence', href: '/stock-ai', detail: 'Review dated price evidence and separate company hold facts.' },
  { title: '3. Track a Dated Signal', href: '/watchlist', detail: 'Keep its immutable ID, original evidence, entry trigger and expiry; plan only while recent.' },
  { title: '4. Monitor Paper Positions', href: '/portfolio', detail: 'Review active plans, cash, share counts and position status.' },
  { title: '5. Audit Results', href: '/results', detail: 'Compare historical research with the separate forward paper ledger.' },
];

export default function ResearchJourney() {
  const { setSelectedTicker } = useStockContext();
  return (
    <section aria-label="Artha core workflow" className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Artha Core Workflow</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Find a candidate → Inspect dated evidence → Track a dated signal → Monitor paper positions → Review outcomes.
          </p>
        </div>
        <div className="rounded-lg bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
          Strategy: AX-STRAT-01 (v1.0-swing-5d)
        </div>
      </div>

      <nav className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Workflow steps">
        {steps.map(step => (
          <Link
            key={step.href + step.title}
            href={step.href}
            onClick={() => setSelectedTicker(null)}
            className="group rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5 transition-all hover:border-cyan-500 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
          >
            <span className="block text-xs font-bold text-cyan-600 transition-colors group-hover:text-cyan-500 dark:text-cyan-400">
              {step.title}
            </span>
            <span className="mt-1 block text-xs text-slate-600 dark:text-slate-400">
              {step.detail}
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
