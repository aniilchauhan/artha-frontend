'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Stock } from '../lib/stock-data';
import { canUseQuoteForExecution } from '../lib/market-quote';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { usePortfolioSync } from '../lib/use-portfolio-sync';
import { validateProfileUpdates } from '../lib/profile-validation';
import { deriveDataQualityStatus, type DataQualityStatus } from '../lib/data-quality';
import type { SmallCapStock } from '../lib/small-cap-types';
import { axionApiPath, axionLocalPath } from '../lib/in-process';
import { useMarketStockPolling } from '../hooks/use-market-stock-polling';
import { type ThemeId, THEMES, isThemeDark } from '../lib/themes';

export type { ThemeId } from '../lib/themes';
export type { DataQualityStatus } from '../lib/data-quality';
export { deriveDataQualityStatus } from '../lib/data-quality';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'warning' | 'info';
  ticker?: string;
}

export interface PortfolioHolding {
  ticker: string;
  quantity: number;
  buyPrice: number;
}

  // Removed AuthState from here because we use NextAuth now

interface StockContextType extends ReturnType<typeof usePortfolioSync> {
  stocks: Stock[];
  watchlist: string[];
  toggleWatchlist: (ticker: string) => Promise<void>;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedTicker: string | null;
  setSelectedTicker: (ticker: string | null) => void;
  selectedSmallCapStock?: SmallCapStock | null;
  setSelectedSmallCapStock?: (stock: SmallCapStock | null) => void;
  livePolling: boolean;
  setLivePolling: (active: boolean) => void;
  isFetching: boolean;
  isLoading: boolean;
  pollingError: string | null;
  // Removed login/logout/auth from context interface
  updatePollingInterval: (interval: number) => Promise<void>;
  toggleSimulatedError: (type: 'network' | 'rateLimit') => Promise<void>;
  resetBackendLimits: () => Promise<void>;
  // Threshold alert and custom toast notifications
  thresholds: Record<string, number>;
  setThreshold: (ticker: string, price: number | null) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  addToast: (message: string, type?: 'success' | 'warning' | 'info', ticker?: string) => void;
  pollingInterval: number;
  simulatedErrorType: 'network' | 'rateLimit' | null;
  dataSource: 'real' | 'simulated';
  updateDataSource: (source: 'real' | 'simulated') => Promise<void>;
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  toggleTheme: () => void;
  isDark: boolean;
  apiSource: string | null;
  dataQualityStatus: DataQualityStatus;
  isUsingFallback: boolean;
  screenerFilter: 'all' | 'gainers' | 'losers' | 'intraday';
  setScreenerFilter: (filter: 'all' | 'gainers' | 'losers' | 'intraday') => void;
  customApiKey: string | null;
  setCustomApiKey: (key: string | null) => void;
  customTickers: string[];
  addCustomTicker: (ticker: string) => void;
  holdings: Record<string, PortfolioHolding>;
  updateHoldings: (newHoldings: Record<string, PortfolioHolding>) => void;
  syncLiveData: (scope?: 'indices' | 'all') => Promise<{ success: boolean; durationMs?: number; benchmarks?: any; message?: string }>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

type ProfileField = 'watchlist' | 'customTickers' | 'thresholds';
type BrowserProfile = {
  email: string | null;
  watchlist: string[];
  customTickers: string[];
  thresholds: Record<string, number>;
  pending: ProfileField[];
};
const profileFields: ProfileField[] = ['watchlist', 'customTickers', 'thresholds'];
const emptyBrowserProfile = (email: string | null): BrowserProfile => ({ email, watchlist: [], customTickers: [], thresholds: {}, pending: [] });
const browserProfileKey = (email: string) => `axion_${email}_profile_v1`;

function readBrowserProfile(email: string): BrowserProfile {
  const raw = localStorage.getItem(browserProfileKey(email));
  if (!raw) return emptyBrowserProfile(email);
  const saved = JSON.parse(raw);
  const result = validateProfileUpdates({ watchlist: saved.watchlist, customTickers: saved.customTickers, thresholds: saved.thresholds });
  if (saved.email !== email || !result.valid || !Array.isArray(saved.pending)
    || saved.pending.some((field: unknown) => !profileFields.includes(field as ProfileField))) throw new Error('Invalid account profile cache');
  return { email, ...result.cleanUpdates, pending: [...new Set(saved.pending)] };
}

export function StockProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [selectedSmallCapStock, setSelectedSmallCapStock] = useState<SmallCapStock | null>(null);

  const pathname = usePathname();

  // Sync activeTab state with URL pathname changes
  useEffect(() => {
    if (pathname) {
      const tab = axionLocalPath(pathname).substring(1) || 'dashboard';
      setActiveTab(tab);
    }
  }, [pathname]);
  
  // We no longer need local auth state, replacing with useSession
  const { data: session, status } = useSession();
  const profileEmail = status === 'authenticated' && session?.user?.email ? session.user.email.toLowerCase() : null;
  const profileAccount = useRef({ email: profileEmail, generation: 0 });
  if (profileAccount.current.email !== profileEmail) profileAccount.current = { email: profileEmail, generation: profileAccount.current.generation + 1 };
  const profileGeneration = profileAccount.current.generation;
  const [browserProfile, setBrowserProfile] = useState<BrowserProfile>(() => emptyBrowserProfile(null));
  const browserProfileRef = useRef(browserProfile);
  const profileWrites = useRef<Promise<unknown>>(Promise.resolve());
  const profileWriteControllers = useRef(new Set<AbortController>());
  const visibleProfile = browserProfile.email === profileEmail ? browserProfile : emptyBrowserProfile(profileEmail);
  const { watchlist, customTickers, thresholds } = visibleProfile;
  const accountStoragePrefix = session?.user?.email ? `axion_${session.user.email.toLowerCase()}_` : null;
  const portfolioControls = usePortfolioSync(status === 'authenticated' && session?.user?.email ? session.user.email.toLowerCase() : null);
  const [livePolling, setLivePolling] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(30000); // 30s interval to avoid socket contention
  const [simulatedErrorType, setSimulatedErrorType] = useState<'network' | 'rateLimit' | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'simulated'>('real');

  // Threshold and Toast states
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info', ticker?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type, ticker }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 6000);
  }, []);
  const dismissToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const {
    stocks, isFetching, isLoading, setIsLoading, pollingError, setPollingError, apiSource, fetchBackendStocks,
  } = useMarketStockPolling({ livePolling, pollingInterval, simulatedErrorType, dataSource, customTickers, addToast });
  const dataQualityStatus = deriveDataQualityStatus(apiSource, stocks);
  const isUsingFallback = dataQualityStatus !== 'live';

  const [theme, setTheme] = useState<ThemeId>('dark');
  const [screenerFilter, setScreenerFilter] = useState<'all' | 'gainers' | 'losers' | 'intraday'>('all');
  const [customApiKey, setCustomApiKeyInternal] = useState<string | null>(null);
  const [holdings, setHoldings] = useState<Record<string, PortfolioHolding>>({});

  const ownsProfileRequest = () => profileAccount.current.email === profileEmail && profileAccount.current.generation === profileGeneration;
  const applyBrowserProfile = (next: BrowserProfile) => {
    browserProfileRef.current = next;
    setBrowserProfile(next);
  };
  const cacheBrowserProfile = (next: BrowserProfile) => {
    if (!next.email) return true;
    try { localStorage.setItem(browserProfileKey(next.email), JSON.stringify(next)); return true; }
    catch { addToast('Browser storage is unavailable. Keep this tab open to preserve profile changes.', 'warning'); return false; }
  };

  // Serial writes and account binding prevent an old tab callback from saving into a new session.
  const syncToMongo = async (updates: Partial<Pick<BrowserProfile, ProfileField>>) => {
    if (!profileEmail || !ownsProfileRequest()) return false;
    const task = profileWrites.current.then(async () => {
      if (!ownsProfileRequest()) return false;
      const controller = new AbortController();
      profileWriteControllers.current.add(controller);
      try {
        const res = await fetch('/api/user/data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Portfolio-Account': profileEmail,
          },
          body: JSON.stringify(updates),
          signal: controller.signal,
        });
        if (!ownsProfileRequest() || controller.signal.aborted) return false;
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (ownsProfileRequest()) addToast(`${data.error || 'Account sync unavailable.'} Changes remain in this account's browser cache.`, 'warning');
          return false;
        }
        const current = browserProfileRef.current;
        if (current.email === profileEmail) {
          const pending = current.pending.filter(field => !(field in updates) || JSON.stringify(current[field]) !== JSON.stringify(updates[field]));
          const next = { ...current, pending };
          applyBrowserProfile(next);
          cacheBrowserProfile(next);
        }
        return true;
      } catch {
        if (ownsProfileRequest() && !controller.signal.aborted) addToast('Account sync unavailable. Changes remain in this account\'s browser cache.', 'warning');
        return false;
      } finally {
        profileWriteControllers.current.delete(controller);
      }
    });
    profileWrites.current = task;
    return task;
  };

  const updateBrowserProfile = (updates: Partial<Pick<BrowserProfile, ProfileField>>) => {
    if (!ownsProfileRequest()) return false;
    const current = browserProfileRef.current.email === profileEmail ? browserProfileRef.current : emptyBrowserProfile(profileEmail);
    const pending = profileEmail ? [...new Set([...current.pending, ...Object.keys(updates) as ProfileField[]])] : [];
    const next = { ...current, ...updates, pending };
    applyBrowserProfile(next);
    if (cacheBrowserProfile(next)) void syncToMongo(updates);
    return true;
  };

  const updateHoldings = (newHoldings: Record<string, PortfolioHolding>) => {
    if (portfolioControls.savePortfolio({ holdings: newHoldings })) setHoldings(newHoldings);
  };

  useEffect(() => {
    setHoldings(portfolioControls.portfolioSync.profile?.holdings ?? {});
  }, [portfolioControls.portfolioSync.profile]);

  const addCustomTicker = (ticker: string) => {
    if (!ownsProfileRequest()) return;
    const currentTickers = browserProfileRef.current.email === profileEmail ? browserProfileRef.current.customTickers : [];
    if (!currentTickers.includes(ticker)) {
      const updated = [...currentTickers, ticker];
      updateBrowserProfile({ customTickers: updated });
      addToast(`${ticker} added to dashboard`, 'success');
    }
  };

  const setCustomApiKey = (key: string | null) => {
    setCustomApiKeyInternal(key);
    if (key) {
      localStorage.setItem('friday_gemini_api_key', key);
    } else {
      localStorage.removeItem('friday_gemini_api_key');
    }
  };

  useEffect(() => {
    // Load theme from localStorage on client-side mount, respecting saved preference or system theme
    const savedTheme = localStorage.getItem('stock_insight_theme') as ThemeId | null;
    const validTheme = savedTheme && THEMES.some(t => t.id === savedTheme) ? savedTheme : null;
    const systemDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme: ThemeId = validTheme ?? (systemDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('stock_insight_theme', theme);
    // Apply data-theme and dark class to document element
    const root = window.document.documentElement;
    root.setAttribute('data-theme', theme);
    if (isThemeDark(theme)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Sync state from LocalStorage on mount
  useEffect(() => {
    // Global legacy profile copies have no reliable owner. Preserve them on disk
    // without displaying or assigning them to whichever account signs in next.
    localStorage.setItem('stock_insight_data_source', 'real');
    setDataSource('real');

    const savedKey = localStorage.getItem('friday_gemini_api_key');
    if (savedKey) {
      setCustomApiKeyInternal(savedKey);
    }
    
  }, []);

  // Fetch from MongoDB when user logs in or clear state on logout
  useEffect(() => {
    for (const controller of profileWriteControllers.current) controller.abort();
    profileWrites.current = Promise.resolve();
    let cached = emptyBrowserProfile(profileEmail);
    if (profileEmail) {
      try { cached = readBrowserProfile(profileEmail); }
      catch { addToast('Saved browser profile could not be read. Its original data has been preserved.', 'warning'); }
    }
    applyBrowserProfile(cached);
    if (profileEmail) {
      const controller = new AbortController();
      fetch(axionApiPath('/api/user/data'), { signal: controller.signal, cache: 'no-store', headers: { 'X-Portfolio-Account': profileEmail } })
      .then(res => { if (!res.ok) throw new Error('Account profile unavailable'); return res.json(); })
      .then(data => {
        if (controller.signal.aborted || !ownsProfileRequest()) return;
        if (data.success && !data.isLocalFallback) {
          const result = validateProfileUpdates({ watchlist: data.watchlist ?? [], customTickers: data.customTickers ?? [], thresholds: data.thresholds ?? {} });
          if (!result.valid) throw new Error('Invalid account profile response');
          const current = browserProfileRef.current;
          const next: BrowserProfile = { email: profileEmail, ...result.cleanUpdates, pending: current.pending };
          for (const field of current.pending) (next as any)[field] = current[field];
          applyBrowserProfile(next);
          cacheBrowserProfile(next);
        }
      })
      .catch(() => { if (!controller.signal.aborted && ownsProfileRequest()) addToast('Account profile unavailable. This account\'s browser changes are preserved.', 'warning'); });
      return () => {
        controller.abort();
        for (const write of profileWriteControllers.current) write.abort();
      };
    } else if (status === 'unauthenticated' && !pathname?.startsWith('/apps/axion')) {
      // Clear personal browser state when signed out
      setHoldings({});
      // Retain legacy holdings for recovery; never load them into another account.
      localStorage.removeItem('stock_insight_portfolio_transactions');
      localStorage.removeItem('stock_insight_portfolio_cash');
      localStorage.removeItem('stock_insight_portfolio_risk_rules');
      localStorage.removeItem('stock_insight_portfolio_equity_history');
    }
  }, [status, profileEmail]);

  useEffect(() => {
    if (typeof window === 'undefined' || !accountStoragePrefix) return;
    const legacyKeys = [
      'stock_insight_portfolio_transactions',
      'stock_insight_portfolio_cash',
      'stock_insight_portfolio_risk_rules',
      'stock_insight_portfolio_equity_history',
    ];
    for (const key of legacyKeys) localStorage.removeItem(key);
  }, [accountStoragePrefix]);

  // Alert Threshold & Custom Toast implementation
  const setThreshold = (ticker: string, price: number | null) => {
    if (!ownsProfileRequest()) return;
    const current = browserProfileRef.current.email === profileEmail ? browserProfileRef.current.thresholds : {};
    const updated = { ...current };
    if (price === null) delete updated[ticker];
    else updated[ticker] = price;
    updateBrowserProfile({ thresholds: updated });
    
    if (price !== null) {
      addToast(`Alert set for ${ticker} when price exceeds ₹${price.toFixed(2)}`, 'info', ticker);
    }
  };

  // Monitor stocks update to detect when a watchlisted stock's price exceeds its threshold
  useEffect(() => {
    if (stocks.length === 0) return;

    let updatedThresholds = { ...thresholds };
    let thresholdChanged = false;

    watchlist.forEach((ticker) => {
      const threshold = thresholds[ticker];
      if (threshold !== undefined && threshold !== null) {
        const stock = stocks.find(s => s.ticker === ticker);
        if (stock && canUseQuoteForExecution(stock) && stock.currentPrice > threshold) {
          addToast(
            `ALERT: ${stock.ticker} price has exceeded threshold! Current: ₹${stock.currentPrice.toFixed(2)} (Threshold: ₹${threshold.toFixed(2)})`,
            'success',
            stock.ticker
          );
          delete updatedThresholds[ticker];
          thresholdChanged = true;
        }
      }
    });

    if (thresholdChanged) {
      // Safe update via setTimeout to avoid cascading renders
      setTimeout(() => {
        if (ownsProfileRequest()) updateBrowserProfile({ thresholds: updatedThresholds });
      }, 0);
    }
  }, [stocks, watchlist, thresholds]);

  // Toggle stock watchlist item
  const toggleWatchlist = async (ticker: string) => {
    if (!ownsProfileRequest()) return;
    const current = browserProfileRef.current.email === profileEmail ? browserProfileRef.current.watchlist : [];
    const removing = current.includes(ticker);
    const updated = removing ? current.filter(t => t !== ticker) : [...current, ticker];
    if (updateBrowserProfile({ watchlist: updated })) addToast(`${ticker} ${removing ? 'removed from' : 'added to'} your Watchlist`, removing ? 'info' : 'success', ticker);
  };

  // Auth simulators (Removed due to NextAuth integration)

  const updatePollingInterval = async (interval: number) => {
    setPollingInterval(interval);
    addToast(`Polling interval updated to ${interval / 1000}s`, 'info');
  };

  const toggleSimulatedError = async (type: 'network' | 'rateLimit') => {
    setSimulatedErrorType(prev => (prev === type ? null : type));
    addToast(`Simulated ${type} error toggled`, 'info');
  };

  const resetBackendLimits = async () => {
    setSimulatedErrorType(null);
    setPollingError(null);
    addToast('Simulated errors cleared and limits reset', 'success');
  };

  const updateDataSource = async (source: 'real' | 'simulated') => {
    setIsLoading(true);
    setDataSource('real');
    localStorage.setItem('stock_insight_data_source', 'real');
    addToast('Provider quotes selected. Each quote shows its observation time.', 'info');
  };

  const syncLiveData = async (scope: 'indices' | 'all' = 'all') => {
    try {
      addToast('Syncing live market data from exchange gateways…', 'info');
      const res = await fetch(axionApiPath('/api/sync-live-data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      // Also refresh dashboard stocks to align with freshly synced live data
      await fetchBackendStocks();

      const nifty = data.benchmarks?.['NIFTY 50'];
      const niftySummary = nifty
        ? `NIFTY 50: ₹${nifty.price?.toLocaleString('en-IN')} (${nifty.changePct >= 0 ? '+' : ''}${nifty.changePct?.toFixed(2)}%)`
        : 'Live benchmarks updated';

      addToast(`Live sync completed in ${data.durationMs}ms: ${niftySummary}`, 'success');
      return { success: true, durationMs: data.durationMs, benchmarks: data.benchmarks };
    } catch (err: any) {
      console.error('Failed to sync live data:', err);
      addToast(`Sync error: ${err.message || 'Failed to connect to exchange gateways'}`, 'warning');
      return { success: false, message: err.message };
    }
  };

  return (
    <StockContext.Provider
      value={{
        ...portfolioControls,
        stocks,
        watchlist,
        toggleWatchlist,
        activeTab,
        setActiveTab,
        selectedTicker,
        setSelectedTicker,
        selectedSmallCapStock,
        setSelectedSmallCapStock,
        livePolling,
        setLivePolling,
        isFetching,
        isLoading,
        pollingError,
        updatePollingInterval,
        toggleSimulatedError,
        resetBackendLimits,
        thresholds,
        setThreshold,
        toasts,
        dismissToast,
        addToast,
        pollingInterval,
        simulatedErrorType,
        dataSource,
        updateDataSource,
        syncLiveData,
        theme,
        setTheme,
        toggleTheme,
        isDark: isThemeDark(theme),
        apiSource,
        dataQualityStatus,
        isUsingFallback,
        screenerFilter,
        setScreenerFilter,
        customApiKey,
        setCustomApiKey,
        customTickers,
        addCustomTicker,
        holdings,
        updateHoldings
      }}
    >
      {children}
    </StockContext.Provider>
  );
}

export function useStockContext() {
  const context = useContext(StockContext);
  if (!context) {
    throw new Error('useStockContext must be used within a StockProvider');
  }
  return context;
}
