'use client';


import { axionApiPath } from '../lib/in-process';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi, WifiOff, Radio, RefreshCw, Plus, X, TrendingUp, TrendingDown,
  Activity, Zap, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { buildStreamUrl, STREAM_CONFIG } from '../lib/price-stream';
import type { PriceTick, StreamHeartbeat } from '../lib/price-stream';

interface LivePriceTickerProps {
  /** Initial symbols to stream */
  initialSymbols?: string[];
  /** Compact mode for embedding in other panels */
  compact?: boolean;
}

export default function LivePriceTicker({ initialSymbols = [], compact = false }: LivePriceTickerProps) {
  const [symbols, setSymbols] = useState<string[]>(initialSymbols);
  const [ticks, setTicks] = useState<Map<string, PriceTick>>(new Map());
  const [heartbeat, setHeartbeat] = useState<StreamHeartbeat | null>(null);
  const [connected, setConnected] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [newSymbol, setNewSymbol] = useState('');
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [expanded, setExpanded] = useState(!compact);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Connect to SSE stream
  const connect = useCallback(() => {
    if (symbols.length === 0) return;

    // Close existing connection
    eventSourceRef.current?.close();

    const url = buildStreamUrl(symbols);
    const es = new EventSource(axionApiPath(url));
    eventSourceRef.current = es;

    es.addEventListener('subscribed', (e) => {
      setConnected(true);
      setStreaming(true);
    });

    es.addEventListener('tick', (e) => {
      try {
        const tick: PriceTick = JSON.parse(e.data);
        setTicks(prev => new Map(prev).set(tick.symbol, tick));
        setErrors(prev => {
          const next = new Map(prev);
          next.delete(tick.symbol);
          return next;
        });
      } catch { /* skip malformed ticks */ }
    });

    es.addEventListener('heartbeat', (e) => {
      try {
        const hb: StreamHeartbeat = JSON.parse(e.data);
        setHeartbeat(hb);
      } catch { /* skip */ }
    });

    es.addEventListener('error', (e) => {
      if ('data' in (e as any)) {
        try {
          const err = JSON.parse((e as MessageEvent).data);
          setErrors(prev => new Map(prev).set(err.symbol, err.error));
        } catch { /* skip */ }
      }
    });

    es.onerror = () => {
      setConnected(false);
      setStreaming(false);

      // Auto-reconnect after delay
      reconnectTimerRef.current = setTimeout(() => {
        if (symbols.length > 0) connect();
      }, STREAM_CONFIG.SSE_RETRY_MS);
    };
  }, [symbols]);

  // Disconnect
  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    setConnected(false);
    setStreaming(false);
  }, []);

  // Auto-connect when symbols change
  useEffect(() => {
    if (symbols.length > 0 && streaming) {
      connect();
    }
    return () => disconnect();
  }, [symbols, connect, disconnect, streaming]);

  // Add symbol
  const addSymbol = () => {
    const sym = newSymbol.trim().toUpperCase();
    if (sym && !symbols.includes(sym) && symbols.length < STREAM_CONFIG.MAX_SYMBOLS) {
      setSymbols(prev => [...prev, sym]);
      setNewSymbol('');
    }
  };

  // Remove symbol
  const removeSymbol = (sym: string) => {
    setSymbols(prev => prev.filter(s => s !== sym));
    setTicks(prev => {
      const next = new Map(prev);
      next.delete(sym);
      return next;
    });
  };

  const card = 'rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';

  return (
    <div className={`${card} overflow-hidden`}>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 ${compact ? 'cursor-pointer' : ''}`}
        onClick={compact ? () => setExpanded(!expanded) : undefined}
      >
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="relative">
              <Radio size={16} className="text-emerald-500" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            </div>
          ) : (
            <WifiOff size={16} className="text-slate-400" />
          )}
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Live Price Stream
          </h3>
          {streaming && heartbeat && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {heartbeat.totalTicks} ticks
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!streaming && symbols.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setStreaming(true); connect(); }}
              className="flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-emerald-600"
            >
              <Wifi size={12} /> Start
            </button>
          )}
          {streaming && (
            <button
              onClick={(e) => { e.stopPropagation(); disconnect(); }}
              className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 transition-all hover:bg-red-500/20"
            >
              <WifiOff size={12} /> Stop
            </button>
          )}
          {compact && (
            expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {/* Add symbol */}
          <div className="flex items-center gap-2 px-4 py-3">
            <input
              className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 text-sm font-semibold dark:border-slate-700"
              value={newSymbol}
              onChange={e => setNewSymbol(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addSymbol()}
              placeholder="Add symbol (e.g., RELIANCE)"
              maxLength={20}
            />
            <button
              onClick={addSymbol}
              disabled={!newSymbol.trim() || symbols.length >= STREAM_CONFIG.MAX_SYMBOLS}
              className="flex items-center gap-1 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-bold text-white transition-all hover:bg-indigo-600 disabled:opacity-40"
            >
              <Plus size={12} /> Add
            </button>
          </div>

          {/* Symbols & ticks */}
          {symbols.length === 0 ? (
            <div className="px-4 pb-4 text-center text-xs text-slate-400">
              Add symbols to start live price streaming via SSE
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {symbols.map(sym => {
                const tick = ticks.get(sym);
                const error = errors.get(sym);
                return (
                  <div key={sym} className="flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeSymbol(sym)}
                        className="rounded-md p-0.5 text-slate-300 transition-colors hover:bg-red-100 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-900/30"
                      >
                        <X size={12} />
                      </button>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{sym}</span>
                    </div>

                    {error ? (
                      <span className="text-[10px] text-red-500">{error}</span>
                    ) : tick ? (
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black tabular-nums text-slate-800 dark:text-slate-200">
                          ₹{tick.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                        <span className={`flex items-center gap-0.5 text-xs font-bold tabular-nums ${
                          tick.changePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                        }`}>
                          {tick.changePercent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {tick.changePercent >= 0 ? '+' : ''}{tick.changePercent.toFixed(2)}%
                        </span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold ${
                          tick.quoteStatus === 'recent' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                          tick.quoteStatus === 'delayed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                          'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {tick.quoteStatus.toUpperCase()}
                        </span>
                      </div>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-slate-400">
                        <Activity size={10} className="animate-pulse" /> Waiting…
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Heartbeat footer */}
          {heartbeat && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <Clock size={10} />
                Uptime: {Math.round(heartbeat.uptimeMs / 1000)}s
              </span>
              <span>{heartbeat.subscribedSymbols} symbols · {heartbeat.totalTicks} total ticks</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
