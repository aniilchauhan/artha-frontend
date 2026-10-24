'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { type Stock, INITIAL_STOCKS } from '../lib/stock-data';
import { isProviderStock } from '../lib/market-quote';
import { axionApiPath } from '../lib/in-process';

type SimulatedError = 'network' | 'rateLimit' | null;
type DataSource = 'real' | 'simulated';

export function useMarketStockPolling(options: {
  livePolling: boolean;
  pollingInterval: number;
  simulatedErrorType: SimulatedError;
  dataSource: DataSource;
  customTickers: string[];
  addToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}) {
  const { livePolling, pollingInterval, simulatedErrorType, dataSource, customTickers, addToast } = options;
  const customTickersKey = customTickers.join(',');
  const [stocks, setStocks] = useState<Stock[]>(INITIAL_STOCKS);
  const [isFetching, setIsFetching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pollingError, setPollingError] = useState<string | null>(null);
  const [apiSource, setApiSource] = useState<string | null>('cached-snapshot');
  const isFetchingRef = useRef(false);

  const fetchBackendStocks = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    setIsFetching(true);
    setPollingError(null);

    if (simulatedErrorType === 'network') {
      setPollingError('Network Error: Failed to connect to Indian Stock Exchange gateways.');
      addToast('Sync failed: Network Connection Lost', 'warning');
      isFetchingRef.current = false;
      setIsFetching(false);
      setIsLoading(false);
      return;
    }

    if (simulatedErrorType === 'rateLimit') {
      setPollingError('Rate Limit Exceeded: Too many parallel connection requests from your IP. Standard limits apply.');
      addToast('Sync failed: API Rate Limit Exceeded (429)', 'warning');
      isFetchingRef.current = false;
      setIsFetching(false);
      setIsLoading(false);
      return;
    }

    try {
      if (dataSource === 'real') {
        try {
          const customParam = customTickersKey ? `?custom=${customTickersKey}` : '';
          const response = await fetch(axionApiPath(`/api/stocks${customParam}`), {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(45000),
          });
          if (!response.ok) throw new Error(`Real-time API error: HTTP ${response.status}`);

          const data = await response.json();
          const observations = Array.isArray(data.stocks)
            ? data.stocks.filter((stock: unknown) => isProviderStock(stock))
            : [];
          if (observations.length === 0) throw new Error('Real-time API returned empty stock results');

          setStocks(observations);
          setApiSource('yahoo-finance');
          if (observations.length !== data.stocks.length) {
            setPollingError('Some quotes were rejected because their source, price or timestamp could not be validated.');
          }
        } catch (error: any) {
          setStocks(previous => (previous.length > 0 ? previous : []));
          setApiSource('unavailable');
          setPollingError(error.message || 'Timestamped provider quotes unavailable.');
        }
      } else {
        setApiSource('simulated');
      }
    } finally {
      isFetchingRef.current = false;
      setIsFetching(false);
      setIsLoading(false);
    }
  }, [addToast, customTickersKey, dataSource, simulatedErrorType]);

  useEffect(() => {
    void fetchBackendStocks();
    if (!livePolling) return;

    const intervalId = setInterval(() => { void fetchBackendStocks(); }, pollingInterval);
    return () => clearInterval(intervalId);
  }, [fetchBackendStocks, livePolling, pollingInterval]);

  return { stocks, setStocks, isFetching, isLoading, setIsLoading, pollingError, setPollingError, apiSource, fetchBackendStocks };
}
