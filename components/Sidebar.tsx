'use client';

import React, { useState, useEffect } from 'react';
import Link from './WorkspaceLink';
import { usePathname } from '../lib/workspace-router';
import {
  Home, Search, Star, Briefcase, Sparkles, Zap, Target,
  Flame, Activity, Maximize2, BookOpen, SlidersHorizontal,
  Gauge, Rocket, Filter, Layers, Newspaper, Award,
  Calendar, BarChart3, FlaskConical, ShieldCheck, Info,
  ChevronDown, PanelLeftClose, PanelLeftOpen,
  TrendingUp, Compass, Menu
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string;
  badgeType?: 'live' | 'hot' | 'ai' | 'pro' | 'gmp' | 'greek' | 'neutral';
  color?: string; // Accent color class for icon on hover/active
}

interface NavGroup {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  items: NavItem[];
}

const primaryNav: NavItem[] = [
  { href: '/', name: 'Today (Terminal)', icon: Home, badge: 'CORE', badgeType: 'live', color: 'text-emerald-500' },
  { href: '/stock-ai', name: 'Stock Research', icon: Sparkles, badge: 'DECISION', badgeType: 'ai', color: 'text-cyan-500' },
  { href: '/watchlist', name: 'Watchlist', icon: Star, color: 'text-amber-500' },
  { href: '/portfolio', name: 'Paper Portfolio', icon: Briefcase, color: 'text-indigo-500' },
  { href: '/results', name: 'Results', icon: BarChart3, color: 'text-purple-500' },
  { href: '/data-health', name: 'Data Health', icon: ShieldCheck, badge: 'HEALTH', badgeType: 'neutral', color: 'text-blue-500' },
];

const navigationGroups: NavGroup[] = [
  {
    id: 'radars',
    name: 'Research Labs (Experimental)',
    icon: FlaskConical,
    accentColor: 'text-cyan-500 dark:text-cyan-400',
    items: [
      { name: 'Market Forecast (Lab)', href: '/market-forecast', icon: Activity, badge: 'RESEARCH', badgeType: 'neutral', color: 'text-indigo-500' },
      { name: '10% Move Radar', href: '/rapid-moves', icon: TrendingUp, badge: '1–5D', badgeType: 'neutral', color: 'text-cyan-500' },
      { name: 'Radar Paper Portfolio', href: '/research-paper', icon: BookOpen, badge: 'PAPER', badgeType: 'neutral', color: 'text-blue-500' },
      { name: 'Portfolio Backtests', href: '/research-backtests', icon: FlaskConical, badge: 'RESEARCH', badgeType: 'neutral', color: 'text-indigo-500' },
      { name: 'Manual Holdings Tracker (Local)', href: '/portfolio-tracker', icon: Briefcase, badge: 'LOCAL', badgeType: 'neutral', color: 'text-slate-500' },
      { name: 'Swing Setups', href: '/swing-opportunities', icon: Activity, color: 'text-cyan-500' },
      { name: 'Legacy Cohort Archive (Unverified)', href: '/paper-predictions', icon: BookOpen, badge: 'ARCHIVE', badgeType: 'neutral', color: 'text-slate-500' },
      { name: 'Prediction Tracker', href: '/predictions', icon: Target, badge: 'RESEARCH', badgeType: 'neutral', color: 'text-indigo-500' },
      { name: 'Strategy Lab', href: '/frameworks', icon: FlaskConical, badge: 'LAB', badgeType: 'pro', color: 'text-pink-500' },
      { name: 'Quant Suite', href: '/quant', icon: ShieldCheck, badge: 'PRO', badgeType: 'pro', color: 'text-indigo-500' },
      { name: 'Futures & Options', href: '/futures-options', icon: SlidersHorizontal, color: 'text-violet-500' },
      { name: 'Greeks Monitor', href: '/greeks', icon: Gauge, badge: 'Δ', badgeType: 'greek', color: 'text-teal-500' },
      { name: 'Gap Screener', href: '/gap-analysis', icon: Maximize2, badge: 'GAP', badgeType: 'neutral', color: 'text-amber-500' },
      { name: 'Small Cap 2% Picks', href: '/small-cap-predictions', icon: TrendingUp, color: 'text-emerald-500' },
      { name: 'Multibagger Ideas', href: '/multibagger', icon: Rocket, color: 'text-fuchsia-500' },
      { name: 'Stock Opportunities', href: '/opportunities', icon: Flame, badge: 'HOT', badgeType: 'hot', color: 'text-rose-500' },
      { name: 'Live Decisions', href: '/live-decisions', icon: Zap, badge: 'LIVE', badgeType: 'live', color: 'text-emerald-500' },
    ],
  },
  {
    id: 'markets',
    name: 'Market Reference',
    icon: Newspaper,
    accentColor: 'text-sky-500 dark:text-sky-400',
    items: [
      { name: 'All Stocks Catalog', href: '/database', icon: Search, badge: '2.5K', badgeType: 'neutral', color: 'text-blue-500' },
      { name: 'Market News', href: '/news', icon: Newspaper, color: 'text-sky-500' },
      { name: 'IPOs & GMP', href: '/ipo', icon: Award, badge: 'GMP', badgeType: 'gmp', color: 'text-amber-500' },
      { name: 'Post-IPO Predictions', href: '/post-ipo', icon: Rocket, badge: '2YR', badgeType: 'ai', color: 'text-indigo-500' },
      { name: 'Dividends Calendar', href: '/dividends', icon: Calendar, color: 'text-emerald-500' },
      { name: 'Stock Screener', href: '/screener', icon: Filter, color: 'text-indigo-500' },
      { name: 'Market Categories', href: '/market-explorer', icon: Layers, color: 'text-sky-500' },
      { name: 'About Platform', href: '/about', icon: Info, color: 'text-slate-500' },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { setSelectedTicker, watchlist } = useStockContext();

  // Sidebar collapse/rail state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(120);

  // Track open sections
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    radars: true,
    markets: false,
    institutional: false,
  });

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

  // Keep section open if active route is inside it
  useEffect(() => {
    navigationGroups.forEach(group => {
      if (group.items.some(item => item.href === pathname)) {
        setOpenSections(prev => ({ ...prev, [group.id]: true }));
      }
    });
  }, [pathname]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearSelection = () => setSelectedTicker(null);

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
        <div id="sidebar-tools" className="sidebar-tools min-h-0 flex-1 overflow-y-auto overscroll-contain pt-3 space-y-4">
          {/* PRIMARY CORE WORKSPACE */}
          <nav aria-label="Core workspace" className="space-y-1">
            {!isCollapsed && (
              <h3 className="px-3 mb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Workspace
              </h3>
            )}
            {primaryNav.map(({ href, name, icon: Icon, badge, badgeType, color }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={clearSelection}
                  title={isCollapsed ? name : undefined}
                  aria-label={isCollapsed ? name : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center rounded-2xl transition-all duration-200 overflow-hidden ${
                    isCollapsed
                      ? 'min-h-[42px] justify-center p-2.5 my-1'
                      : 'min-h-[42px] justify-between px-3 py-2 text-xs font-semibold'
                  } ${
                    active
                      ? 'bg-gradient-to-r from-indigo-500/15 via-purple-500/10 to-indigo-500/5 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-500/30 backdrop-blur-md shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {active && !isCollapsed && (
                    <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                  )}

                  <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div
                      className={`p-1.5 rounded-xl transition-all duration-200 ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                          : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:scale-110 group-hover:text-slate-800 dark:group-hover:text-slate-100'
                      }`}
                    >
                      <Icon size={16} strokeWidth={active ? 2.5 : 2} />
                    </div>
                    {!isCollapsed && (
                      <span className="sidebar-tool-label">
                        {name}
                      </span>
                    )}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center gap-1.5">
                      {name === 'Watchlist' && watchlist.length > 0 && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                          {watchlist.length}
                        </span>
                      )}
                      {renderBadge(badge, badgeType)}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* GROUPED COLLAPSIBLE SECTIONS */}
          {navigationGroups.map(group => {
            const GroupIcon = group.icon;
            const isOpen = openSections[group.id];
            const hasActiveChild = group.items.some(i => i.href === pathname);

            if (isCollapsed) {
              // Rail mode: Show mini category divider with dot
              return (
                <div key={group.id} className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
                  {group.items.map(item => {
                    const active = pathname === item.href;
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={clearSelection}
                        title={`${group.name}: ${item.name}`}
                        aria-label={item.name}
                        aria-current={active ? 'page' : undefined}
                        className={`group relative flex items-center justify-center min-h-[40px] rounded-xl p-2 transition-all ${
                          active
                            ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/30 shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <ItemIcon size={16} className={`transition-transform group-hover:scale-110 ${item.color}`} />
                      </Link>
                    );
                  })}
                </div>
              );
            }

            return (
              <section key={group.id} className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => toggleSection(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`sidebar-group-${group.id}`}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs font-bold transition-colors ${
                    hasActiveChild
                      ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GroupIcon size={14} className={group.accentColor} />
                    <span className="text-[11px] font-bold uppercase tracking-wide">
                      {group.id === 'radars' ? 'Research labs' : group.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {group.items.length}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div id={`sidebar-group-${group.id}`} className="mt-1.5 space-y-0.5">
                    {group.id === 'radars' && <p className="px-3 pb-1 text-[10px] text-slate-500">Experimental research tools</p>}
                    {group.items.map(item => {
                      const active = pathname === item.href;
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={clearSelection}
                          aria-current={active ? 'page' : undefined}
                          className={`group relative flex min-h-[38px] items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-200 overflow-hidden ${
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
                              className={`p-1 rounded-lg transition-transform duration-200 group-hover:scale-110 ${
                                active
                                  ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                                  : 'bg-slate-100/70 dark:bg-slate-800/50 group-hover:bg-slate-200 dark:group-hover:bg-slate-700/60'
                              }`}
                            >
                              <ItemIcon
                                size={14}
                                className={active ? 'text-indigo-600 dark:text-indigo-400' : item.color || 'text-slate-400'}
                              />
                            </div>
                            <span className="sidebar-tool-label">
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
            );
          })}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          MOBILE BOTTOM DOCK & EXPANDABLE DRAWER
      ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-slate-200/80 bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl dark:border-slate-800/80 pb-safe shadow-lg"
      >
        <div className="grid grid-cols-4 px-2 py-2">
          {primaryNav.slice(0, 3).map(({ href, name, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
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
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                </div>
                <span>{name}</span>
              </Link>
            );
          })}

          <details key={pathname} className="group">
            <summary
              className={`flex min-h-12 cursor-pointer list-none flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-bold transition-colors [&::-webkit-details-marker]:hidden ${
                primaryNav.slice(0, 3).some(item => item.href === pathname)
                  ? 'text-slate-500 dark:text-slate-400'
                  : 'text-indigo-600 dark:text-indigo-400 font-extrabold'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  !primaryNav.slice(0, 3).some(item => item.href === pathname)
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                <Menu size={18} />
              </div>
              <span className="group-open:hidden">More</span>
              <span className="hidden group-open:inline">Close</span>
            </summary>

            <div className="absolute bottom-[calc(100%+8px)] inset-x-2 max-h-[75dvh] overflow-y-auto rounded-3xl border border-slate-200/80 bg-white/95 backdrop-blur-2xl p-4 shadow-2xl dark:border-slate-800/80 dark:bg-slate-900/95 animate-in slide-in-from-bottom-2 fade-in duration-200">
              {/* Primary remaining tools */}
              <div className="space-y-1 mb-4">
                <p className="px-2 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Workspace</p>
                {primaryNav.slice(3).map(({ href, name, icon: Icon, badge, badgeType }) => {
                  const active = pathname === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={clearSelection}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[40px] items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold ${
                        active
                          ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={16} />
                        <span>{name}</span>
                      </div>
                      {renderBadge(badge, badgeType)}
                    </Link>
                  );
                })}
              </div>

              {/* All Grouped Tools in mobile drawer */}
              {navigationGroups.map(group => {
                const GroupIcon = group.icon;
                return (
                  <div key={group.id} className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mb-3">
                    <div className="flex items-center gap-2 px-2 mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      <GroupIcon size={12} className={group.accentColor} />
                      <span>{group.name}</span>
                    </div>
                    <div className="space-y-0.5">
                      {group.items.map(item => {
                        const active = pathname === item.href;
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={clearSelection}
                            aria-current={active ? 'page' : undefined}
                            className={`flex min-h-[38px] items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                              active
                                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ItemIcon size={14} className={item.color} />
                              <span className="truncate">{item.name}</span>
                            </div>
                            {renderBadge(item.badge, item.badgeType)}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      </nav>
    </>
  );
}
