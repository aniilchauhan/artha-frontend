'use client';


import { axionFetch as fetch } from '../lib/in-process';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SmallCapExchange, SmallCapScanCounts, SmallCapScanResponse, SmallCapStock } from '../lib/small-cap-types';
import { clearSavedScan, readSavedScan, saveScan, type SavedSmallCapScan } from '../lib/small-cap-scan-storage';

type ScanStatus = 'loading' | 'idle' | 'running' | 'paused' | 'complete' | 'error';
interface ScanState {
  status: ScanStatus;
  stocks: SmallCapStock[];
  counts: SmallCapScanCounts | null;
  nextOffset: number | null;
  fetchedAt: string | null;
  error: string | null;
  restartRequired: boolean;
  catalogRevision?: string;
  catalogVerified: boolean;
  restored: boolean;
  storageUnavailable?: boolean;
  catalogSource?: SmallCapScanResponse['catalogSource'];
}

const initialState: ScanState = { status: 'loading', stocks: [], counts: null, nextOffset: 0, fetchedAt: null, error: null,
  restartRequired: false, catalogVerified: false, restored: false };
const accumulatedFields = ['scanned', 'quotesUnavailable', 'staleQuotes', 'unknownMarketCaps', 'notSmallCap', 'smallCaps', 'insufficientHistory'] as const;

function clearedCounts(counts: SmallCapScanCounts): SmallCapScanCounts {
  const cleared = { ...counts };
  for (const field of accumulatedFields) cleared[field] = 0;
  return cleared;
}

export function useSmallCapScan(exchange: SmallCapExchange) {
  const [state, setState] = useState<ScanState>(initialState);
  const progress = useRef<ScanState>(initialState);
  const generation = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const apply = useCallback((next: ScanState) => {
    if (next.restartRequired) clearSavedScan(exchange);
    else if (next.counts && next.counts.scanned > 0 && next.catalogRevision && next.fetchedAt) {
      next = { ...next, storageUnavailable: !saveScan(exchange, { version: 1, savedAt: Date.now(),
        catalogRevision: next.catalogRevision, stocks: next.stocks, counts: next.counts,
        nextOffset: next.nextOffset, fetchedAt: next.fetchedAt }) };
    }
    progress.current = next;
    setState(next);
  }, [exchange]);
  const cancel = useCallback(() => {
    ++generation.current;
    controller.current?.abort();
  }, []);

  const request = useCallback(async (offset: number, catalogOnly: boolean, signal: AbortSignal) => {
    const params = new URLSearchParams({ exchange, offset: String(offset), limit: '24' });
    if (catalogOnly) params.set('catalogOnly', 'true');
    const response = await fetch(`/api/small-cap-predictions?${params}`, { signal, cache: 'no-store' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Unable to scan the catalog (HTTP ${response.status}).`);
    return payload as SmallCapScanResponse;
  }, [exchange]);

  useEffect(() => {
    const version = ++generation.current;
    controller.current?.abort();
    const summaryController = new AbortController();
    controller.current = summaryController;
    const timeout = setTimeout(() => summaryController.abort(), 30_000);
    const saved = readSavedScan(exchange);
    const restoredState = (snapshot: SavedSmallCapScan): ScanState => ({ ...initialState, ...snapshot,
      status: snapshot.nextOffset === null ? 'complete' : 'paused', restored: true });
    apply(initialState);
    request(0, true, summaryController.signal).then(result => {
      if (generation.current !== version) return;
      if (saved && saved.catalogRevision === result.catalogRevision && saved.counts.totalForExchange === result.counts.totalForExchange) {
        apply({ ...restoredState(saved), catalogVerified: true, catalogSource: result.catalogSource });
        return;
      }
      if (saved) clearSavedScan(exchange);
      apply({ ...initialState, status: result.complete ? 'complete' : 'idle', counts: result.counts,
        nextOffset: result.nextOffset, fetchedAt: result.fetchedAt, catalogSource: result.catalogSource, catalogRevision: result.catalogRevision,
        catalogVerified: true, error: saved ? 'The company catalog changed. Start a new scan for the refreshed list.' : null });
    }).catch(error => {
      if (generation.current === version) apply({ ...(saved ? restoredState(saved) : initialState), status: 'error',
        error: error instanceof Error ? error.message : 'Unable to load the company catalog.' });
    }).finally(() => clearTimeout(timeout));
    return () => { summaryController.abort(); cancel(); };
  }, [apply, request, cancel, exchange]);

  const pause = useCallback(() => {
    cancel();
    apply({ ...progress.current, status: 'paused', error: null });
  }, [apply, cancel]);

  const start = useCallback(async (restart = false) => {
    if (progress.current.status === 'running' || progress.current.status === 'loading') return;
    const version = ++generation.current;
    controller.current?.abort();
    let current = progress.current;
    if (restart || current.restartRequired || current.nextOffset === null) {
      clearSavedScan(exchange);
      current = { ...initialState, catalogVerified: current.catalogVerified, counts: current.counts ? clearedCounts(current.counts) : null };
    }
    current = { ...current, status: 'running', error: null };
    apply(current);
    try {
      if (!current.catalogVerified) {
        const checkController = new AbortController();
        controller.current = checkController;
        const timeout = setTimeout(() => checkController.abort(), 30_000);
        let summary: SmallCapScanResponse;
        try { summary = await request(0, true, checkController.signal); }
        finally { clearTimeout(timeout); }
        if (generation.current !== version) return;
        if (current.catalogRevision && current.catalogRevision !== summary.catalogRevision) {
          current = { ...current, restartRequired: true };
          throw new Error('The company catalog changed. Restart the scan to use the refreshed list.');
        }
        current = { ...current, catalogVerified: true, catalogRevision: summary.catalogRevision,
          catalogSource: summary.catalogSource, counts: current.counts?.scanned ? current.counts : summary.counts };
        apply(current);
      }
      while (current.nextOffset !== null && generation.current === version) {
        const offset = current.nextOffset;
        const batchController = new AbortController();
        controller.current = batchController;
        const timeout = setTimeout(() => batchController.abort(), 55_000);
        let result: SmallCapScanResponse;
        try { result = await request(offset, false, batchController.signal); }
        finally { clearTimeout(timeout); }
        if (generation.current !== version) return;
        if (current.catalogRevision && result.catalogRevision && current.catalogRevision !== result.catalogRevision) {
          current = { ...current, restartRequired: true };
          throw new Error('The company catalog changed during this scan. Restart the scan to use the refreshed list.');
        }
        if (result.nextOffset !== null && result.nextOffset <= offset) throw new Error('Scan did not advance. Resume to retry this batch.');
        const counts = { ...result.counts };
        for (const field of accumulatedFields) counts[field] += current.counts?.[field] ?? 0;
        const stocks = new Map(current.stocks.map(stock => [stock.providerSymbol || stock.ticker, stock]));
        for (const stock of result.stocks) stocks.set(stock.providerSymbol || stock.ticker, stock);
        current = { status: result.nextOffset === null ? 'complete' : 'running', stocks: [...stocks.values()], counts,
          nextOffset: result.nextOffset, fetchedAt: result.fetchedAt, error: null, catalogSource: result.catalogSource,
          catalogRevision: result.catalogRevision ?? current.catalogRevision, restartRequired: false,
          catalogVerified: true, restored: current.restored };
        apply(current);
      }
    } catch (error) {
      if (generation.current !== version) return;
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'The provider took too long to respond. Resume to retry the unfinished batch.'
        : error instanceof Error ? error.message : 'The scan failed. Resume to retry the unfinished batch.';
      apply({ ...current, status: 'error', error: message });
    }
  }, [apply, request, exchange]);

  return { ...state, start, pause };
}
