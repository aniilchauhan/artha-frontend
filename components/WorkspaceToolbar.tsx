'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from './WorkspaceLink';
import { usePathname } from '../lib/workspace-router';
import { ArrowLeft, ArrowUpRight, ChevronRight, Compass, Search, X } from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { filterWorkspacePages, workspacePages } from '../lib/workspace-navigation';

export default function WorkspaceToolbar() {
  const pathname = usePathname();
  const { selectedTicker, setSelectedTicker } = useStockContext();
  const [query, setQuery] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const page = workspacePages.find(item => item.href === pathname);
  const matches = filterWorkspacePages(query);
  const close = () => { dialog.current?.close(); setQuery(''); trigger.current?.focus(); };
  useEffect(() => { dialog.current?.close(); setQuery(''); }, [pathname]);
  return <>
    <div className="workspace-toolbar">
      <nav aria-label="Page location" className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {selectedTicker ? <button onClick={() => setSelectedTicker(null)} className="workspace-back"><ArrowLeft size={14} />Back to {page?.name ?? 'workspace'}</button> : <span className="hidden sm:inline">{page?.group ?? 'Workspace'}</span>}
        <ChevronRight size={13} className="hidden shrink-0 sm:block" />
        <span aria-current="page" className="truncate font-semibold text-slate-700 dark:text-slate-200">{selectedTicker ?? page?.name ?? 'Workspace'}</span>
      </nav>
      <button ref={trigger} onClick={() => { dialog.current?.showModal(); search.current?.focus(); }} className="workspace-tool-trigger" aria-haspopup="dialog">
        <Compass size={16} /><span>Find a tool</span>
      </button>
    </div>
    <dialog ref={dialog} aria-labelledby="workspace-tools-title" className="workspace-tool-dialog" onCancel={() => setQuery('')} onClose={() => setQuery('')}
      onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="workspace-dialog-content">
        <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
          <div><h2 id="workspace-tools-title" className="text-lg font-semibold">Where would you like to go?</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Find a page, research tool or calendar.</p></div>
          <button onClick={close} aria-label="Close tool directory" className="workspace-icon-button"><X size={18} /></button>
        </div>
        <div className="relative mx-5 mb-4"><Search size={18} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
          <input ref={search} type="search" aria-label="Search app tools" placeholder="Try IPO, portfolio or earnings" value={query} onChange={event => setQuery(event.target.value)} className="workspace-directory-input" />
        </div>
        <nav aria-label="Tool directory" className="workspace-directory-results">
          {matches.map((item, i) => <React.Fragment key={item.href}>
            {(i === 0 || matches[i - 1].group !== item.group) && <p className="px-3 pb-1 pt-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.group}</p>}
            <Link href={item.href} aria-current={pathname === item.href && !selectedTicker ? 'page' : undefined}
              onClick={() => { setSelectedTicker(null); close(); }} className="workspace-directory-link">
              <div><span className="block text-sm font-semibold">{item.name}</span><span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{item.description}</span></div><ArrowUpRight size={16} className="shrink-0 text-slate-400" />
            </Link>
          </React.Fragment>)}
          {matches.length === 0 && <div role="status" className="px-4 py-10 text-center"><p className="font-semibold">No tools match “{query}”</p><p className="mt-2 text-sm text-slate-500">Try a shorter term, or search stocks in the header.</p><button onClick={() => setQuery('')} className="mt-4 text-sm font-semibold text-indigo-600 dark:text-indigo-400">Clear search</button></div>}
        </nav>
        <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-800">Tab to move between tools · Enter to open · Esc to close</p>
      </div>
    </dialog>
  </>;
}
