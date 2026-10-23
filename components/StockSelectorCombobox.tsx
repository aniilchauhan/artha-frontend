'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Plus, X, Loader2 } from 'lucide-react';

export interface StockOption {
  ticker: string;
  name: string;
  currentPrice?: number;
  sector?: string;
}

interface StockSelectorComboboxProps {
  value: string;
  onChange: (ticker: string, price?: number) => void;
  options: StockOption[];
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
}

export default function StockSelectorCombobox({
  value,
  onChange,
  options,
  placeholder = 'Search stock or enter ticker...',
  className = '',
  inputClassName = '',
  id
}: StockSelectorComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<StockOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display search query when value changes from outside
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Debounced dynamic search to /api/search for non-catalog stocks
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          const quotes: Array<{ symbol?: string; shortname?: string; exchDisp?: string }> = data.quotes || [];
          const existingTickers = new Set(options.map(o => o.ticker.toUpperCase()));
          
          const mapped: StockOption[] = quotes
            .map(item => {
              const ticker = (item.symbol || '').toUpperCase().replace(/\.(NS|BO)$/, '');
              return {
                ticker,
                name: item.shortname || ticker,
                sector: item.exchDisp || 'NSE/BSE'
              };
            })
            .filter(item => item.ticker && !existingTickers.has(item.ticker));

          setRemoteResults(mapped);
        }
      } catch (err) {
        console.warn('Dynamic search error', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, options]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find(opt => opt.ticker.toUpperCase() === (value || '').toUpperCase());
  }, [options, value]);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(opt =>
      opt.ticker.toLowerCase().includes(q) ||
      opt.name.toLowerCase().includes(q) ||
      (opt.sector && opt.sector.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  // Combined options (local filtered + remote search results)
  const combinedOptions = useMemo(() => {
    return [...filteredOptions, ...remoteResults];
  }, [filteredOptions, remoteResults]);

  // Exact match flag for custom ticker entry
  const exactMatchExists = useMemo(() => {
    const q = searchQuery.trim().toUpperCase();
    if (!q) return true;
    return combinedOptions.some(opt => opt.ticker.toUpperCase() === q);
  }, [combinedOptions, searchQuery]);

  const cleanCustomTicker = searchQuery.trim().toUpperCase().replace(/[^A-Z0-9&._-]/g, '');

  const handleSelect = async (ticker: string, price?: number) => {
    onChange(ticker, price);
    setIsOpen(false);
    setSearchQuery('');

    // If price is not yet available, query backend detail in background to auto-populate price
    if (!price || price <= 0) {
      try {
        const res = await fetch(`/api/stocks/detail?ticker=${encodeURIComponent(ticker)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.stock?.currentPrice && data.stock.currentPrice > 0) {
            onChange(ticker, data.stock.currentPrice);
          }
        }
      } catch {
        // Fallback gracefully with selected ticker
      }
    }
  };

  const handleCustomSelect = () => {
    if (cleanCustomTicker) {
      handleSelect(cleanCustomTicker);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!exactMatchExists && cleanCustomTicker) {
        handleCustomSelect();
      } else if (combinedOptions.length > 0) {
        handleSelect(combinedOptions[0].ticker, combinedOptions[0].currentPrice);
      }
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
      <div
        className={`flex items-center w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-xl text-xs transition-all cursor-pointer ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        } ${inputClassName}`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search className="h-3.5 w-3.5 text-gray-400 mr-2 shrink-0" />
        
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={isOpen ? searchQuery : (selectedOption ? `${selectedOption.ticker} (${selectedOption.currentPrice ? `₹${selectedOption.currentPrice.toFixed(1)}` : selectedOption.name})` : value || '')}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedOption ? `${selectedOption.ticker} - ₹${selectedOption.currentPrice?.toFixed(1) || '0'}` : placeholder}
          className="w-full bg-transparent border-none outline-none text-xs font-semibold text-gray-900 dark:text-gray-100 placeholder:text-gray-400 font-mono cursor-text"
        />

        {isSearching && (
          <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin mr-1.5 shrink-0" />
        )}

        {isOpen && searchQuery && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            className="p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mr-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform shrink-0 ${
            isOpen ? 'rotate-180 text-indigo-500' : ''
          }`}
        />
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header info */}
          <div className="px-3 py-1.5 bg-gray-50/80 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 font-mono">
            <span>{combinedOptions.length} stocks available</span>
            <span>Type to filter or add custom</span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/50">
            {/* Custom Ticker option if typed and not in exact matches */}
            {!exactMatchExists && cleanCustomTicker && (
              <div
                onClick={handleCustomSelect}
                className="px-3 py-2.5 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 cursor-pointer transition-colors flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/40"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-indigo-600 text-white">
                    <Plus className="h-3 w-3" />
                  </div>
                  <div>
                    <div className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      Use Custom Ticker: &ldquo;{cleanCustomTicker}&rdquo;
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">
                      Add any custom NSE/BSE stock ticker
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                  Select
                </span>
              </div>
            )}

            {/* Filtered list of options */}
            {combinedOptions.length > 0 ? (
              combinedOptions.map((stock) => {
                const isSelected = stock.ticker.toUpperCase() === (value || '').toUpperCase();
                return (
                  <div
                    key={stock.ticker}
                    onClick={() => handleSelect(stock.ticker, stock.currentPrice)}
                    className={`px-3 py-2 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                            {stock.ticker}
                          </span>
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[200px] sm:max-w-[280px]">
                          {stock.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {stock.sector && (
                        <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                          {stock.sector}
                        </span>
                      )}
                      {stock.currentPrice !== undefined && stock.currentPrice > 0 ? (
                        <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100 bg-gray-100/80 dark:bg-gray-800 px-2 py-0.5 rounded-lg border border-gray-200/60 dark:border-gray-700/60">
                          ₹{stock.currentPrice.toFixed(1)}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-gray-400">
                          Quote
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No predefined stock matches &ldquo;{searchQuery}&rdquo;
                </p>
                {cleanCustomTicker && (
                  <button
                    type="button"
                    onClick={handleCustomSelect}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-mono transition-colors inline-flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Use &ldquo;{cleanCustomTicker}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
