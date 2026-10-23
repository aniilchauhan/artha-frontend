'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Zap,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Flame,
  Rocket,
  ShieldCheck,
  Star,
  X,
  Command,
  CornerDownLeft,
  Sparkles,
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import QuickTradeModal from './QuickTradeModal';
import BorderBeam from './BorderBeam';
import { playTargetChime } from '../lib/sound-notifications';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPaletteModal({ isOpen, onClose }: CommandPaletteModalProps) {
  const {
    stocks,
    setSelectedTicker,
    setActiveTab,
    addToast,
    toggleWatchlist,
    watchlist,
  } = useStockContext();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'RADAR' | 'IPO' | 'SMALL_CAP'>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tradeStock, setTradeStock] = useState<any | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredResults = useMemo(() => {
    let list = stocks || [];

    if (activeCategory === 'IPO') {
      list = list.filter((s: any) => s.isIpo || s.sector?.toLowerCase().includes('ipo') || (s.tags && s.tags.includes('ipo')));
    } else if (activeCategory === 'RADAR') {
      list = list.filter((s: any) => s.changePercent >= 2.0 || s.momentumScore > 75);
    } else if (activeCategory === 'SMALL_CAP') {
      list = list.filter((s: any) => (s.marketCap && s.marketCap < 5000) || s.series === 'SM');
    }

    if (!query.trim()) {
      return list.slice(0, 10);
    }

    const q = query.toLowerCase().trim();
    return list
      .filter((s: any) => {
        const ticker = (s.ticker || s.symbol || '').toLowerCase();
        const name = (s.name || '').toLowerCase();
        const sector = (s.sector || '').toLowerCase();
        return ticker.includes(q) || name.includes(q) || sector.includes(q);
      })
      .slice(0, 12);
  }, [stocks, query, activeCategory]);

  const handleSelect = (stock: any) => {
    setSelectedTicker(stock.ticker || stock.symbol);
    setActiveTab('dashboard');
    onClose();
  };

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      }
    } else if (e.key.toLowerCase() === 'b' && (e.altKey || e.ctrlKey)) {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        setTradeStock(filteredResults[selectedIndex]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-150">
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-indigo-500/40 bg-slate-900/95 shadow-[0_0_80px_rgba(99,102,241,0.25)] text-white backdrop-blur-2xl"
        >
          {/* Aceternity Style Animated Border Beam */}
          <BorderBeam duration={8} colorFrom="#6366f1" colorTo="#a855f7" borderWidth={1.5} />

          {/* Top Search Input Row */}
          <div className="relative z-10 flex items-center gap-3 border-b border-slate-800/80 px-4 py-3.5">
            <Search className="h-5 w-5 text-indigo-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search 7,383+ NSE equities, small-caps, IPO breakout runners..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDownNav}
              className="w-full bg-transparent text-sm font-semibold text-white placeholder-slate-400 outline-none font-sans"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-300">
                <Command className="h-3 w-3" /> K
              </span>
              <button
                onClick={onClose}
                className="cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2 overflow-x-auto scrollbar-hide">
            {[
              { id: 'ALL', label: 'All Equities' },
              { id: 'RADAR', label: '⚡ Momentum Runners' },
              { id: 'IPO', label: '🚀 Fresh IPO Surges' },
              { id: 'SMALL_CAP', label: '💎 Small-Cap (< ₹5K Cr)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveCategory(tab.id as any);
                  setSelectedIndex(0);
                }}
                className={`cursor-pointer whitespace-nowrap rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
                  activeCategory === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            {filteredResults.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 font-mono">
                No matching equities found for &quot;{query}&quot;. Try ticker or sector name.
              </div>
            ) : (
              filteredResults.map((stock: any, idx: number) => {
                const isSelected = idx === selectedIndex;
                const isUp = (stock.changePercent ?? 0) >= 0;
                const ticker = stock.ticker || stock.symbol;
                const isWatched = watchlist.includes(ticker);

                return (
                  <div
                    key={ticker}
                    onClick={() => handleSelect(stock)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between rounded-2xl px-3 py-2.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-950/80 via-slate-800/90 to-indigo-950/60 border border-indigo-500/40 shadow-sm'
                        : 'hover:bg-slate-800/40 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/90 font-mono text-xs font-black text-indigo-400 border border-slate-700/60">
                        {ticker.slice(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-white">{ticker}</span>
                          {stock.sector && (
                            <span className="truncate rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                              {stock.sector}
                            </span>
                          )}
                          {stock.marketCap && stock.marketCap < 5000 && (
                            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
                              💎 Small-Cap
                            </span>
                          )}
                        </div>
                        <p className="truncate text-[11px] text-slate-400">{stock.name || ticker}</p>
                      </div>
                    </div>

                    {/* Price, Change & Action Buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right font-mono">
                        <span className="block text-xs font-black text-white">
                          ₹{(stock.currentPrice || stock.price || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                        <span className={`block text-[10px] font-extrabold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isUp ? '+' : ''}{(stock.changePercent ?? 0).toFixed(2)}%
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            try { playTargetChime(); } catch {}
                            setTradeStock(stock);
                          }}
                          className="rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-2 py-1 text-[10px] font-black text-emerald-300 hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
                          title="Quick 1-Click Order Execution"
                        >
                          ⚡ Trade
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleWatchlist(ticker);
                            addToast(`Watchlist updated for ${ticker}`, 'success', ticker);
                          }}
                          className={`rounded-lg p-1.5 transition-colors cursor-pointer ${
                            isWatched ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}
                          title="Toggle Watchlist"
                        >
                          <Star className={`h-3.5 w-3.5 ${isWatched ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts Guide */}
          <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-4 py-2.5 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-slate-800 px-1 py-0.5 text-[10px] font-bold text-slate-300">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-slate-800 px-1 py-0.5 text-[10px] font-bold text-slate-300">Enter</kbd>
                Inspect
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded bg-slate-800 px-1 py-0.5 text-[10px] font-bold text-slate-300">Alt+B</kbd>
                Price Scenario
              </span>
            </div>
            <span className="text-[10px] text-indigo-400 font-bold">7,383 Equities Loaded</span>
          </div>
        </div>
      </div>

      {/* Quick Trade Modal */}
      {tradeStock && (
        <QuickTradeModal
          isOpen={true}
          onClose={() => setTradeStock(null)}
          ticker={tradeStock.ticker || tradeStock.symbol}
          name={tradeStock.name}
          currentPrice={tradeStock.currentPrice ?? tradeStock.price ?? 0}
          initialTargetPct={tradeStock.changePercent && tradeStock.changePercent > 5 ? 10.0 : 2.0}
          initialStopLossPct={1.0}
        />
      )}
    </>
  );
}
