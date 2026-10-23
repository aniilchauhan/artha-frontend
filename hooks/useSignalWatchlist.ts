'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { axionFetch } from '../lib/in-process';
import type { DecisionSignal } from '../lib/signal-schema';

export interface SignalWatchlistEntry {
  signalId: string;
  signal: DecisionSignal | null;
}

export function useSignalWatchlist() {
  const [entries, setEntries] = useState<SignalWatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busySignalId, setBusySignalId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const signalIds = useMemo(() => new Set(entries.map(entry => entry.signalId)), [entries]);

  const refresh = useCallback(async () => {
    try {
      const response = await axionFetch('/api/watchlist/signals');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Sign in to load saved Radar signals.');
      setEntries(Array.isArray(data.entries) ? data.entries : []);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Signal watchlist unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = useCallback(async (signalId: string) => {
    const action = signalIds.has(signalId) ? 'remove' : 'save';
    setBusySignalId(signalId);
    try {
      const response = await axionFetch('/api/watchlist/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, signalId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Signal watchlist update failed.');

      if (action === 'save' && data.entry) {
        setEntries(previous => previous.some(entry => entry.signalId === signalId)
          ? previous
          : [...previous, data.entry]);
      } else {
        setEntries(previous => previous.filter(entry => entry.signalId !== signalId));
      }
      setError('');
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Signal watchlist update failed.');
      return false;
    } finally {
      setBusySignalId(null);
    }
  }, [signalIds]);

  return { entries, signalIds, loading, busySignalId, error, toggle, refresh };
}
