'use client';

import React, { useState, useEffect } from 'react';
import Link from './WorkspaceLink';
import { usePathname } from '../lib/workspace-router';
import {
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Compass,
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { FOCUS_NAV_GROUP } from '../lib/navigation-items';

export default function Sidebar() {
  const pathname = usePathname();
  const { setSelectedTicker } = useStockContext();

  // Sidebar collapse/rail state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(120);

  // Accordion open state for the first (and only focus) accordion
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  useEffect(() => {
    const header = document.getElementById('app-main-header');
    if (!header) return;
    const measure = () => setHeaderHeight(Math.ceil(header.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // Restore collapsed state
  useEffect(() => {
    try {
      const stored = localStorage.getItem('axion_sidebar_collapsed');
      if (stored !== null) {
        setIsCollapsed(stored === 'true');
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('axion_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard shortcut Ctrl+\ or Cmd+\ to toggle collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const clearSelection = () => setSelectedTicker(null);

  const openSettingsPanel = () => {
    const btn = document.getElementById('btn-toggle-settings-panel');
    if (btn) {
      btn.click();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Badge pill renderer
  const renderBadge = (badge?: string, type?: string) => {
    if (!badge) return null;
    switch (type) {
      case 'live':
        return (
          <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
            {badge}
          </span>
        );
      case 'hot':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shrink-0">
            {badge}
          </span>
        );
      case 'ai':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 shrink-0 shadow-[0_0_8px_rgba(168,85,247,0.2)]">
            {badge}
          </span>
        );
      case 'pro':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 shrink-0">
            {badge}
          </span>
        );
      case 'greek':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30 shrink-0">
            {badge}
          </span>
        );
      case 'gmp':
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
            {badge}
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-300/40 dark:border-slate-700/60 shrink-0">
            {badge}
          </span>
        );
    }
  };

  const GroupIcon = FOCUS_NAV_GROUP.icon;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          DESKTOP SIDEBAR
      ───────────────────────────────────────────────────────────── */}
      <aside
        id="app-sidebar-nav"
        aria-label="Workspace sidebar"
        data-collapsed={isCollapsed}
        style={{ top: headerHeight, height: `calc(100dvh - ${headerHeight}px)` }}
        className={`hidden md:flex flex-col shrink-0 sticky self-start bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width,padding] duration-200 z-20 ${
          isCollapsed ? 'w-[72px] p-2' : 'w-[272px] p-3'
        }`}
      >
        {/* Top Header: Brand Pulse & Collapse Toggle */}
        <div className={`flex shrink-0 items-center pb-3 border-b border-slate-100 dark:border-slate-800/80 ${isCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Compass size={17} className="text-indigo-500" />
              <span className="text-[11px] font-black tracking-wider uppercase bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 dark:from-emerald-400 dark:via-teal-400 dark:to-indigo-400 bg-clip-text text-transparent">
                Workspace
              </span>
            </div>
          )}

          <button
            onClick={toggleCollapsed}
            title={isCollapsed ? 'Expand sidebar (Ctrl+\\)' : 'Collapse to icon rail (Ctrl+\\)'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            aria-controls="sidebar-tools"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-all duration-200 active:scale-95"
          >
            {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div id="sidebar-tools" className="sidebar-tools min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 flex flex-col justify-between">
          {/* FIRST ACCORDION: FOCUS RADARS */}
          {isCollapsed ? (
            /* Rail mode: Show mini focus icons */
            <div className="space-y-1.5">
              {FOCUS_NAV_GROUP.items.map(item => {
                const active = pathname === item.href;
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={clearSelection}
                    title={item.name}
                    aria-label={item.name}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center justify-center min-h-[42px] rounded-xl p-2.5 transition-all ${
                      active
                        ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ItemIcon size={18} className={`transition-transform group-hover:scale-110 ${item.color}`} />
                  </Link>
                );
              })}
            </div>
          ) : (
            <section className="space-y-1.5">
              {/* Accordion Toggle Header */}
              <button
                type="button"
                onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                aria-expanded={isAccordionOpen}
                aria-controls="sidebar-focus-accordion"
                className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs font-bold transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <GroupIcon size={14} className={FOCUS_NAV_GROUP.accentColor} />
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    Primary Focus
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                    {FOCUS_NAV_GROUP.items.length}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-slate-400 transition-transform duration-200 ${isAccordionOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {/* Accordion Items Body */}
              {isAccordionOpen && (
                <div id="sidebar-focus-accordion" className="mt-1 space-y-1 pl-1">
                  {FOCUS_NAV_GROUP.items.map(item => {
                    const active = pathname === item.href;
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={clearSelection}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex min-h-[42px] items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 overflow-hidden ${
                          active
                            ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-transparent text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {active && (
                          <div className="absolute left-0 top-1 bottom-1 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                        )}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg transition-transform duration-200 group-hover:scale-110 ${
                              active
                                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                : 'bg-slate-100/70 dark:bg-slate-800/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/60'
                            }`}
                          >
                            <ItemIcon
                              size={15}
                              className={active ? 'text-indigo-600 dark:text-indigo-400' : item.color || 'text-slate-400'}
                            />
                          </div>
                          <span className="sidebar-tool-label truncate">
                            {item.name}
                          </span>
                        </div>
                        {renderBadge(item.badge, item.badgeType)}
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* Bottom Settings Link & Status Card */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
            {isCollapsed ? (
              <button
                type="button"
                onClick={openSettingsPanel}
                title="Open Settings Panel (All Other Tools)"
                className="group relative flex items-center justify-center w-full min-h-[40px] rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Settings size={18} className="group-hover:rotate-45 transition-transform duration-200" />
              </button>
            ) : (
              <button
                type="button"
                onClick={openSettingsPanel}
                className="group w-full flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 border border-slate-200/60 dark:border-slate-800/80 transition-all text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 border border-slate-200/50 dark:border-slate-700/50 shadow-xs">
                    <Settings size={15} className="group-hover:rotate-45 transition-transform duration-300" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 leading-tight">
                      Settings Panel
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
                      All other tools & modules
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">
                  25+
                </span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE BOTTOM DOCK
      ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-slate-200/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl dark:border-slate-800/80 pb-safe shadow-lg"
      >
        <div className="grid grid-cols-5 px-1.5 py-2">
          {FOCUS_NAV_GROUP.items.map(item => {
            const active = pathname === item.href;
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={clearSelection}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition-all duration-200 ${
                  active ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl transition-all ${
                    active ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  <ItemIcon size={18} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span className="truncate max-w-[70px]">{item.name.replace(' Predictions', '').replace(' Picks', '')}</span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={openSettingsPanel}
            aria-label="Open Settings and all other tools"
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <div className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
              <Settings size={18} />
            </div>
            <span>Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
}
