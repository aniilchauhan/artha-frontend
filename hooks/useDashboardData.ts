/**
 * Optimized Dashboard Data Hook
 * Manages all dashboard API calls with smart loading states
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api-client';

interface DashboardDataState {
  // AI Predictions
  aiPredictions: any[];
  aiLoading: boolean;
  aiError: string | null;

  // Post-IPO
  postIpoPredictions: any[];
  postIpoLoading: boolean;
  postIpoError: string | null;

  // Small Cap
  smallCapPredictions: any[];
  smallCapLoading: boolean;
  smallCapError: string | null;

  // Fall Predictions
  fallPredictions: any[];
  fallLoading: boolean;
  fallError: string | null;

  // Rapid Moves
  rapidMoves: any[];
  rapidMovesLoading: boolean;
  rapidMovesError: string | null;

  // Momentum Radar
  momentumRadar: any[];
  momentumRadarLoading: boolean;
  momentumRadarError: string | null;

  // Refresh functions
  refreshAiPredictions: () => Promise<void>;
  refreshPostIpo: () => Promise<void>;
  refreshSmallCap: () => Promise<void>;
  refreshFall: () => Promise<void>;
  refreshRapidMoves: () => Promise<void>;
  refreshMomentumRadar: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

interface UseDashboardDataOptions {
  // Which data to load initially
  loadAiPredictions?: boolean;
  loadPostIpo?: boolean;
  loadSmallCap?: boolean;
  loadFall?: boolean;
  loadRapidMoves?: boolean;
  loadMomentumRadar?: boolean;

  // Cache TTL in milliseconds
  cacheTTL?: number;

  // Auto-refresh interval (0 = disabled)
  autoRefreshInterval?: number;
}

const DEFAULT_CACHE_TTL = 60000; // 1 minute
const DEFAULT_OPTIONS: UseDashboardDataOptions = {
  loadAiPredictions: false,
  loadPostIpo: false,
  loadSmallCap: false,
  loadFall: false,
  loadRapidMoves: false,
  loadMomentumRadar: false,
  cacheTTL: DEFAULT_CACHE_TTL,
  autoRefreshInterval: 0,
};

export function useDashboardData(
  options: UseDashboardDataOptions = DEFAULT_OPTIONS
): DashboardDataState {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // AI Predictions State
  const [aiPredictions, setAiPredictions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Post-IPO State
  const [postIpoPredictions, setPostIpoPredictions] = useState<any[]>([]);
  const [postIpoLoading, setPostIpoLoading] = useState(false);
  const [postIpoError, setPostIpoError] = useState<string | null>(null);

  // Small Cap State
  const [smallCapPredictions, setSmallCapPredictions] = useState<any[]>([]);
  const [smallCapLoading, setSmallCapLoading] = useState(false);
  const [smallCapError, setSmallCapError] = useState<string | null>(null);

  // Fall Predictions State
  const [fallPredictions, setFallPredictions] = useState<any[]>([]);
  const [fallLoading, setFallLoading] = useState(false);
  const [fallError, setFallError] = useState<string | null>(null);

  // Rapid Moves State
  const [rapidMoves, setRapidMoves] = useState<any[]>([]);
  const [rapidMovesLoading, setRapidMovesLoading] = useState(false);
  const [rapidMovesError, setRapidMovesError] = useState<string | null>(null);

  // Momentum Radar State
  const [momentumRadar, setMomentumRadar] = useState<any[]>([]);
  const [momentumRadarLoading, setMomentumRadarLoading] = useState(false);
  const [momentumRadarError, setMomentumRadarError] = useState<string | null>(null);

  // Load AI Predictions
  const loadAiPredictions = useCallback(async (signal?: AbortSignal) => {
    try {
      setAiLoading(true);
      setAiError(null);

      const response = await apiClient.request<any>('/api/stock-ai/predictions', {
        cache: true,
        cacheTTL: opts.cacheTTL,
        signal,
      });

      if (response.success && response.data) {
        setAiPredictions(response.data.slice(0, 10));
      } else {
        setAiPredictions([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setAiError(error.message);
        setAiPredictions([]);
      }
    } finally {
      setAiLoading(false);
    }
  }, [opts.cacheTTL]);

  // Load Post-IPO
  const loadPostIpo = useCallback(async (signal?: AbortSignal) => {
    try {
      setPostIpoLoading(true);
      setPostIpoError(null);

      const response = await apiClient.request<any>('/api/post-ipo/predict?live=false', {
        cache: true,
        cacheTTL: opts.cacheTTL,
        signal,
      });

      if (response.success && Array.isArray(response.data)) {
        setPostIpoPredictions(response.data.slice(0, 10));
      } else {
        setPostIpoPredictions([]);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setPostIpoError(error.message);
        setPostIpoPredictions([]);
      }
    } finally {
      setPostIpoLoading(false);
    }
  }, [opts.cacheTTL]);

  // Load Small Cap
  const loadSmallCap = useCallback(async (signal?: AbortSignal) => {
    try {
      setSmallCapLoading(true);
      setSmallCapError(null);

      const response = await apiClient.request<any>('/api/small-cap-predictions?limit=10', {
        cache: true,
        cacheTTL: opts.cacheTTL,
        signal,
      });

      const items = response.stocks || response.candidates || [];
      setSmallCapPredictions(Array.isArray(items) ? items.slice(0, 10) : []);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setSmallCapError(error.message);
        setSmallCapPredictions([]);
      }
    } finally {
      setSmallCapLoading(false);
    }
  }, [opts.cacheTTL]);

  // Load Fall Predictions
  const loadFall = useCallback(async (signal?: AbortSignal) => {
    try {
      setFallLoading(true);
      setFallError(null);

      const response = await apiClient.request<any>('/api/fall-predictions', {
        cache: true,
        cacheTTL: opts.cacheTTL,
        signal,
      });

      const items = response.data || response.breakdowns || [];
      setFallPredictions(Array.isArray(items) ? items.slice(0, 10) : []);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setFallError(error.message);
        setFallPredictions([]);
      }
    } finally {
      setFallLoading(false);
    }
  }, [opts.cacheTTL]);

  // Load Rapid Moves
  const loadRapidMoves = useCallback(async (signal?: AbortSignal) => {
    try {
      setRapidMovesLoading(true);
      setRapidMovesError(null);

      const response = await apiClient.request<any>('/api/rapid-moves', {
        cache: true,
        cacheTTL: opts.cacheTTL,
        signal,
      });

      const items = response.candidates || response.data || [];
      setRapidMoves(Array.isArray(items) ? items.slice(0, 10) : []);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setRapidMovesError(error.message);
        setRapidMoves([]);
      }
    } finally {
      setRapidMovesLoading(false);
    }
  }, [opts.cacheTTL]);

  // Load Momentum Radar
  const loadMomentumRadar = useCallback(async (signal?: AbortSignal) => {
    try {
      setMomentumRadarLoading(true);
      setMomentumRadarError(null);

      const response = await apiClient.request<any>('/api/stock-ai/momentum-radar', {
        cache: true,
        cacheTTL: opts.cacheTTL,
        signal,
      });

      const items = response.data || response.candidates || [];
      setMomentumRadar(Array.isArray(items) ? items.slice(0, 10) : []);
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        setMomentumRadarError(error.message);
        setMomentumRadar([]);
      }
    } finally {
      setMomentumRadarLoading(false);
    }
  }, [opts.cacheTTL]);

  // Refresh functions (bypass cache)
  const refreshAiPredictions = useCallback(async () => {
    apiClient.clearCacheKey('/api/stock-ai/predictions');
    await loadAiPredictions();
  }, [loadAiPredictions]);

  const refreshPostIpo = useCallback(async () => {
    apiClient.clearCacheKey('/api/post-ipo/predict?live=false');
    await loadPostIpo();
  }, [loadPostIpo]);

  const refreshSmallCap = useCallback(async () => {
    apiClient.clearCacheKey('/api/small-cap-predictions?limit=10');
    await loadSmallCap();
  }, [loadSmallCap]);

  const refreshFall = useCallback(async () => {
    apiClient.clearCacheKey('/api/fall-predictions');
    await loadFall();
  }, [loadFall]);

  const refreshRapidMoves = useCallback(async () => {
    apiClient.clearCacheKey('/api/rapid-moves');
    await loadRapidMoves();
  }, [loadRapidMoves]);

  const refreshMomentumRadar = useCallback(async () => {
    apiClient.clearCacheKey('/api/stock-ai/momentum-radar');
    await loadMomentumRadar();
  }, [loadMomentumRadar]);

  const refreshAll = useCallback(async () => {
    apiClient.clearCache();
    const promises: Promise<void>[] = [];
    if (opts.loadAiPredictions) promises.push(loadAiPredictions());
    if (opts.loadPostIpo) promises.push(loadPostIpo());
    if (opts.loadSmallCap) promises.push(loadSmallCap());
    if (opts.loadFall) promises.push(loadFall());
    if (opts.loadRapidMoves) promises.push(loadRapidMoves());
    if (opts.loadMomentumRadar) promises.push(loadMomentumRadar());
    await Promise.all(promises);
  }, [
    opts,
    loadAiPredictions,
    loadPostIpo,
    loadSmallCap,
    loadFall,
    loadRapidMoves,
    loadMomentumRadar,
  ]);

  // Initial load
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    if (opts.loadAiPredictions) loadAiPredictions(signal);
    if (opts.loadPostIpo) loadPostIpo(signal);
    if (opts.loadSmallCap) loadSmallCap(signal);
    if (opts.loadFall) loadFall(signal);
    if (opts.loadRapidMoves) loadRapidMoves(signal);
    if (opts.loadMomentumRadar) loadMomentumRadar(signal);

    return () => controller.abort();
  }, [
    opts.loadAiPredictions,
    opts.loadPostIpo,
    opts.loadSmallCap,
    opts.loadFall,
    opts.loadRapidMoves,
    opts.loadMomentumRadar,
    loadAiPredictions,
    loadPostIpo,
    loadSmallCap,
    loadFall,
    loadRapidMoves,
    loadMomentumRadar,
  ]);

  // Auto-refresh
  useEffect(() => {
    if (!opts.autoRefreshInterval || opts.autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      refreshAll();
    }, opts.autoRefreshInterval);

    return () => clearInterval(interval);
  }, [opts.autoRefreshInterval, refreshAll]);

  return {
    aiPredictions,
    aiLoading,
    aiError,
    postIpoPredictions,
    postIpoLoading,
    postIpoError,
    smallCapPredictions,
    smallCapLoading,
    smallCapError,
    fallPredictions,
    fallLoading,
    fallError,
    rapidMoves,
    rapidMovesLoading,
    rapidMovesError,
    momentumRadar,
    momentumRadarLoading,
    momentumRadarError,
    refreshAiPredictions,
    refreshPostIpo,
    refreshSmallCap,
    refreshFall,
    refreshRapidMoves,
    refreshMomentumRadar,
    refreshAll,
  };
}
