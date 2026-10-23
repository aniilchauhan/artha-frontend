'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Plus, TrendingUp, Sparkles, Command, AlertCircle } from 'lucide-react';
import { useStockContext } from '../context/StockContext';

interface SearchResult {
  symbol: string;
  shortname: string;
  exchDisp: string;
  typeDisp: string;
}

const TRENDING_SEARCHES = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'TATAMOTORS'];

export default function SearchBar() {
  const { addCustomTicker, setSelectedTicker } = useStockContext();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isMac, setIsMac] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSearchError(null);
    setSelectedIndex(-1);
    setResults([]);
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Global keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    setSearchError(null);
    setSelectedIndex(-1);
    setResults([]);
    if (query.trim().length < 1) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const controller = new AbortController();
    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) throw new Error('Search unavailable');
        const data = await res.json();
        if (!controller.signal.aborted) {
          setResults(data.quotes || []);
          setSelectedIndex(-1);
        }
      } catch (err) {
        if (!controller.signal.aborted) setSearchError('Stock search is temporarily unavailable. Please try again.');
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, 200);

    return () => { clearTimeout(delayDebounceFn); controller.abort(); };
  }, [query]);

  const handleSelect = useCallback((ticker: string) => {
    addCustomTicker(ticker);
    setSelectedTicker(ticker);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  }, [addCustomTicker, setSelectedTicker]);

  // Key navigation in dropdown
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleSelect(results[selectedIndex].symbol);
      } else if (results.length > 0) {
        handleSelect(results[0].symbol);
      } else if (query.trim().length > 0) {
        handleSelect(query.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="stock-search relative w-full max-w-md ml-2 xl:ml-6 hidden md:block transition-all duration-300">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          aria-label="Search stocks"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen && results.length > 0 ? 'stock-search-results' : undefined}
          aria-activedescendant={isOpen && selectedIndex >= 0 ? `stock-search-option-${selectedIndex}` : undefined}
          className="w-full bg-slate-100/70 dark:bg-slate-800/60 backdrop-blur-md border border-slate-200/70 dark:border-slate-700/60 rounded-2xl pl-10 pr-16 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500/40 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all duration-300 shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-800/80"
          placeholder="Search 5,000+ Indian stocks (NSE & BSE)..."
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
        />

        {/* Right shortcut badge or loader */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
          {isSearching ? (
            <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
          ) : (
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono font-bold text-slate-400 bg-white dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600/60 rounded-md shadow-2xs">
              {isMac ? '⌘K' : 'Ctrl+K'}
            </kbd>
          )}
        </div>
      </div>

      {/* Results / Quick Picks Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto animate-fade-in p-2">
          {query.trim().length === 0 ? (
            /* Quick Picks when search query is empty */
            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Trending Indian Large-Caps</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TRENDING_SEARCHES.map(ticker => (
                  <button
                    key={ticker}
                    onClick={() => handleSelect(ticker)}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold transition-colors cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                  >
                    {ticker}
                  </button>
                ))}
              </div>
            </div>
          ) : searchError ? (
            <div role="alert" className="px-4 py-8 text-center">
              <AlertCircle className="h-8 w-8 text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {searchError}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Please check your network connection or try again in a moment.
              </p>
            </div>
          ) : isSearching ? (
            <div className="px-4 py-8 text-center">
              <Loader2 className="h-6 w-6 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Searching 5,000+ Indian stocks...
              </p>
            </div>
          ) : results.length > 0 ? (
            <ul
              id="stock-search-results"
              role="listbox"
              aria-label="Stock search results"
              className="space-y-1"
            >
              {results.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <li
                    key={`${item.symbol}-${idx}`}
                    id={`stock-search-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    className={`px-3 py-2.5 rounded-2xl cursor-pointer flex items-center justify-between group transition-all ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                    onClick={() => handleSelect(item.symbol)}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {item.symbol}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-400 uppercase font-bold">
                          {item.exchDisp || 'NSE'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {item.shortname || item.symbol}
                      </span>
                    </div>

                    <button
                      className="h-7 w-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Open in Terminal"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center">
              <TrendingUp className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No asset matched &quot;{query}&quot;
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Check the ticker spelling or search by company name
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
