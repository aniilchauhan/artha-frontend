'use client';


import { axionFetch as fetch } from '../lib/in-process';
import { holdingsFromLedger } from '../lib/portfolio-ledger';
import { calculatePortfolioPerformance, calculateYearPerformance, PerformanceFilter, ClosedTradeRecord } from '../lib/portfolio-performance';
import { parsePortfolioCsv, analyzePortfolioImport, ImportAnalysisResult, ImportedTrade } from '../lib/portfolio-csv';
import { parseTradeDate, getFinancialYear, getAvailableFinancialYears } from '../lib/date-parser';
import { generatePortfolioAiAudit, PortfolioAiAuditResult } from '../lib/portfolio-ai-audit';
import { canUseQuoteForExecution } from '../lib/market-quote';
import ImportPreviewModal from './ImportPreviewModal';
import PortfolioSaveStatus from './PortfolioSaveStatus';
import type { PortfolioPatch } from '../lib/portfolio-sync';
import { validateProfileUpdates } from '../lib/profile-validation';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStockContext, PortfolioHolding } from '../context/StockContext';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  ArrowUpRight, 
  ArrowDownRight, 
  Edit3, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  RefreshCw, 
  Star, 
  Plus, 
  Minus, 
  Info, 
  Check, 
  X,
  Compass, 
  TrendingDown, 
  Sliders, 
  EyeOff,
  Wallet,
  FileText,
  BarChart3,
  ShieldCheck,
  Trash2,
  Calendar,
  Search,
  Scale,
  AlertTriangle,
  Flame,
  UserCheck,
  Undo2,
  Sparkles,
  Layers,
  Clock,
  ChevronDown,
  ChevronUp,
  Bot,
  Zap,
  CheckCircle2,
  PieChart as PieChartIcon,
  Activity,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  AreaChart,
  Area
} from 'recharts';

import { STOCK_METADATA } from '../lib/stock-data';
import { TICKER_NAMES } from '../lib/stock-fetcher';
import StockSelectorCombobox, { StockOption } from './StockSelectorCombobox';

interface Transaction {
  id: string;
  timestamp: string;
  ticker: string;
  displayName?: string;
  action: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  brokerage: number;
  taxes: number;
  netValue: number;
  reportedPnl?: number;
  emotionalTag?: string;
  importBatchId?: string;
}

export interface ImportBatchRecord {
  batchId: string;
  fileName: string;
  timestamp: string;
  tradeCount: number;
  txIds: string[];
  previousHoldings: Record<string, PortfolioHolding>;
}

interface EquityPoint {
  time: string;
  value: number;
}

export default function PortfolioScreen() {
  const {
    stocks,
    watchlist,
    setActiveTab,
    isFetching,
    addToast,
    holdings,
    updateHoldings,
    savePortfolio,
    portfolioSync,
  } = useStockContext();
  const { data: session, status: authStatus } = useSession();
  const accountKey = session?.user?.email ? `axion_${session.user.email.toLowerCase()}_` : null;
  const storageKey = useCallback((name: string) => accountKey ? `${accountKey}${name}` : null, [accountKey]);

  // Active sub-tab inside Portfolio screen
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'trade' | 'ledger' | 'wallet' | 'analytics' | 'risk'>('summary');
  
  // Holdings list filter & search
  const [holdingsFilter, setHoldingsFilter] = useState<'all' | 'profit' | 'loss'>('all');
  const [holdingsSearch, setHoldingsSearch] = useState<string>('');

  // Ledger filter & search
  const [ledgerSearch, setLedgerSearch] = useState<string>('');
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'BUY' | 'SELL'>('all');

  // Ledger state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);

  // Import preview modal & batch undo state
  const [pendingImportAnalysis, setPendingImportAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [importBatches, setImportBatches] = useState<ImportBatchRecord[]>([]);

  // Performance & Financial Year filters
  const availableFys = useMemo(() => getAvailableFinancialYears(5), []);
  const [perfPeriod, setPerfPeriod] = useState<string>('fy-current');
  const [customPerfStartDate, setCustomPerfStartDate] = useState<string>('');
  const [customPerfEndDate, setCustomPerfEndDate] = useState<string>('');
  const [showClosedTradesModal, setShowClosedTradesModal] = useState<boolean>(false);

  // Upgraded Portfolio Stock AI Analysis State
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    verdict: 'ACCUMULATE' | 'HOLD' | 'BOOK_PROFIT' | 'EXIT_STOPLOSS';
    thesis: string[];
    riskTriggers: string[];
    actionableLevels: string;
  } | null>(null);
  const [loadingAiAnalysis, setLoadingAiAnalysis] = useState<boolean>(false);

  // Portfolio-wide Institutional AI Quant Audit State
  const [portfolioAiAudit, setPortfolioAiAudit] = useState<PortfolioAiAuditResult | null>(null);
  const [loadingPortfolioAiAudit, setLoadingPortfolioAiAudit] = useState<boolean>(false);
  const [isAiAuditOpen, setIsAiAuditOpen] = useState<boolean>(true);

  // Statement reconciliation is opt-in and starts with no reported values.
  const [useBrokerReconciliation, setUseBrokerReconciliation] = useState<boolean>(false);
  const [brokerReportedRealizedInput, setBrokerReportedRealizedInput] = useState<string>('');
  const [brokerReportedChargesInput, setBrokerReportedChargesInput] = useState<string>('');
  const [showReconciliationModal, setShowReconciliationModal] = useState<boolean>(false);

  // Historic Equity Curve Points for Time-Series tracking
  const [equityHistory, setEquityHistory] = useState<EquityPoint[]>([]);

  // Stop Loss / Take Profit Rules
  const [riskRules, setRiskRules] = useState<Record<string, { stopLoss: number | null; takeProfit: number | null; autoExit: boolean }>>({});

  // Manual Editor States (Summary Screen override)
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<string>('');
  const [editBuyPrice, setEditBuyPrice] = useState<string>('');

  // Delete Holding Confirmation State
  const [holdingToDelete, setHoldingToDelete] = useState<{
    ticker: string;
    name: string;
    quantity: number;
    currentValue: number;
    costBasis: number;
  } | null>(null);
  const [refundToCash, setRefundToCash] = useState<boolean>(false);

  // Manual Add Position States
  const [addTicker, setAddTicker] = useState<string>('');
  const [addQty, setAddQty] = useState<string>('');
  const [addBuyPrice, setAddBuyPrice] = useState<string>('');

  // Order Ticket States (Trade Portal Tab)
  const [tradeTicker, setTradeTicker] = useState<string>('');
  const [tradeAction, setTradeAction] = useState<'BUY' | 'SELL'>('BUY');
  const [tradeQty, setTradeQty] = useState<string>('10');
  const [tradePriceOverride, setTradePriceOverride] = useState<string>('');
  const [tradeEmotion, setTradeEmotion] = useState<string>('Disciplined');
  const [autoExitOnRisk, setAutoExitOnRisk] = useState<boolean>(false);

  // Risk Setters States (Risk Tab)
  const [selectedRiskTicker, setSelectedRiskTicker] = useState<string>('');
  const [inputStopLoss, setInputStopLoss] = useState<string>('');
  const [inputTakeProfit, setInputTakeProfit] = useState<string>('');
  const [inputAutoExit, setInputAutoExit] = useState<boolean>(false);

  // Analytics tab selection
  const [analyticsChartType, setAnalyticsChartType] = useState<'sector' | 'mcap' | 'perf'>('sector');
  const [analysisTicker, setAnalysisTicker] = useState<string | null>(null);

  // Hydration is read-only. Empty portfolios and ledgers are valid user data.
  useEffect(() => {
    if (authStatus === 'loading') return;
    const read = (name: string, fallback: any) => {
      const key = storageKey(name);
      try { const value = key ? localStorage.getItem(key) : null; return value === null ? fallback : JSON.parse(value); }
      catch { return fallback; }
    };
    const cached = validateProfileUpdates({ portfolioTransactions: read('portfolio_transactions', []),
      portfolioCash: read('portfolio_cash', 0), portfolioRiskRules: read('portfolio_risk_rules', {}),
      portfolioEquityHistory: read('portfolio_equity_history', []) });
    setTransactions(cached.cleanUpdates?.portfolioTransactions ?? []);
    setCashBalance(cached.cleanUpdates?.portfolioCash ?? 0);
    setRiskRules(cached.cleanUpdates?.portfolioRiskRules ?? {});
    setEquityHistory(cached.cleanUpdates?.portfolioEquityHistory ?? []);
    setImportBatches(read('portfolio_import_batches', []));
    const reconcile = read('portfolio_statement_reconcile', null) ?? read('portfolio_groww_reconcile', null);
    const isLegacySample = reconcile?.realized === '7407.85' && reconcile?.charges === '3885.74';
    if (reconcile && !isLegacySample) {
      const hasStatementValues = typeof reconcile.realized === 'string' && reconcile.realized.trim() !== '' &&
        Number.isFinite(Number(reconcile.realized)) && typeof reconcile.charges === 'string' &&
        reconcile.charges.trim() !== '' && Number.isFinite(Number(reconcile.charges)) && Number(reconcile.charges) >= 0;
      setUseBrokerReconciliation(reconcile.enabled !== false && hasStatementValues);
      if (reconcile.realized) setBrokerReportedRealizedInput(reconcile.realized);
      if (reconcile.charges) setBrokerReportedChargesInput(reconcile.charges);
    }
  }, [authStatus, accountKey, storageKey]);

  useEffect(() => {
    const data = portfolioSync?.profile;
    if (!data) return;
    setTransactions(data.portfolioTransactions ?? []);
    setCashBalance(data.portfolioCash ?? 0);
    setRiskRules(data.portfolioRiskRules ?? {});
    setEquityHistory(data.portfolioEquityHistory ?? []);
    const savedIds = new Set((data.portfolioTransactions ?? []).map(row => row.id));
    setImportBatches(previous => previous.filter(batch => Array.isArray(batch.txIds) && batch.txIds.every(id => savedIds.has(id))));
  }, [portfolioSync?.profile]);

  // Sync state helpers
  const persistPortfolio = (updates: PortfolioPatch) => {
    if (!savePortfolio(updates)) return false;
    if (updates.portfolioCash !== undefined) setCashBalance(updates.portfolioCash);
    if (updates.portfolioTransactions) setTransactions(updates.portfolioTransactions);
    if (updates.portfolioRiskRules) setRiskRules(updates.portfolioRiskRules);
    if (updates.portfolioEquityHistory) setEquityHistory(updates.portfolioEquityHistory);
    return true;
  };

  const persistHoldings = useCallback((newHoldings: Record<string, PortfolioHolding>) => {
    updateHoldings(newHoldings);
  }, [updateHoldings]);

  const persistImportBatches = useCallback((batches: ImportBatchRecord[]) => {
    setImportBatches(batches);
    const key = storageKey('portfolio_import_batches');
    try { if (key) localStorage.setItem(key, JSON.stringify(batches)); }
    catch { addToast('Import undo history could not be stored in this browser. Your portfolio save remains queued.', 'warning'); }
  }, [storageKey, addToast]);

  const handleSaveReconciliation = useCallback((enabled: boolean, realized: string, charges: string) => {
    if (enabled && (!realized.trim() || !charges.trim() || !Number.isFinite(Number(realized)) || !Number.isFinite(Number(charges)) || Number(charges) < 0)) {
      addToast('Enter a valid realised P&L and non-negative charges from your statement.', 'warning');
      return;
    }
    setUseBrokerReconciliation(enabled);
    setBrokerReportedRealizedInput(realized);
    setBrokerReportedChargesInput(charges);
    const key = storageKey('portfolio_statement_reconcile');
    if (key) {
      localStorage.setItem(key, JSON.stringify({ enabled, realized, charges }));
    }
    setShowReconciliationModal(false);
    addToast(enabled ? 'Statement figures applied to the local performance view.' : 'Reverted to raw FIFO calculation.', 'success');
  }, [storageKey, addToast]);

  const persistTransactions = useCallback((newTx: Transaction[]) => {
    if (savePortfolio({ portfolioTransactions: newTx })) setTransactions(newTx);
  }, [savePortfolio]);

  const persistCash = useCallback((newCash: number) => {
    if (savePortfolio({ portfolioCash: newCash })) setCashBalance(newCash);
  }, [savePortfolio]);

  const persistRiskRules = (newRules: Record<string, { stopLoss: number | null; takeProfit: number | null; autoExit: boolean }>) => {
    if (savePortfolio({ portfolioRiskRules: newRules })) setRiskRules(newRules);
  };

  const restoreLedgerHoldings = () => {
    try {
      const clean = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const canonicalTransactions = transactions.map(tx => {
        const aliases: Record<string, string> = { MOREPENLABLTD: 'MOREPENLAB' };
        const normalizedTicker = aliases[clean(tx.ticker)] || clean(tx.ticker);
        const nameKey = (value: string) => clean(value).replace(/(LIMITED|LTD|PRIVATE|PVT)$/g, '');
        const match = stocks.find(stock => clean(stock.ticker) === normalizedTicker) ||
          (tx.displayName && stocks.find(stock => nameKey(stock.name) === nameKey(tx.displayName!)));
        return match ? { ...tx, ticker: match.ticker } : tx;
      });
      const importedTickers = new Set(canonicalTransactions.filter(tx => tx.id.startsWith('csv-')).map(tx => tx.ticker));
      // For a CSV-covered ticker, use the imported ledger as the source of truth and
      // ignore older manual rows for that same ticker.
      const effectiveTransactions = canonicalTransactions.filter(tx => !importedTickers.has(tx.ticker) || tx.id.startsWith('csv-'));
      const restored = holdingsFromLedger(effectiveTransactions);
      const preserved = Object.fromEntries(Object.entries(holdings).filter(([ticker]) => !importedTickers.has(ticker)));
      // Keep other manually entered positions and back up the pre-recovery holdings.
      const key = storageKey('portfolio_holdings_before_ledger_restore');
      if (key) localStorage.setItem(key, JSON.stringify(holdings));
      if (!persistPortfolio({ holdings: { ...preserved, ...restored }, portfolioTransactions: canonicalTransactions })) return;
      setActiveSubTab('summary');
      addToast('Holdings restored from your ledger with matched stock symbols. Cash is unchanged.', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Could not restore holdings.', 'warning');
    }
  };

  const importPortfolioCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
        const sheetErrors: string[] = [];
        let candidateAnalysis: ImportAnalysisResult | null = null;
        for (const sheetName of workbook.SheetNames) {
          try {
            const sheet = workbook.Sheets[sheetName];
            const candidateCsv = XLSX.utils.sheet_to_csv(sheet);
            const candidate = analyzePortfolioImport(candidateCsv, transactions, file.name);
            if (candidate.validTrades.length > 0 || candidate.rejectedRows.length > 0) {
              candidateAnalysis = candidate;
              break;
            }
          } catch (error) {
            sheetErrors.push(`${sheetName}: ${error instanceof Error ? error.message : 'invalid format'}`);
          }
        }
        if (!candidateAnalysis) throw new Error(`No trade table found. ${sheetErrors.join(' | ')}`);
        setPendingImportAnalysis(candidateAnalysis);
      } else {
        const text = await file.text();
        const analysis = analyzePortfolioImport(text, transactions, file.name);
        setPendingImportAnalysis(analysis);
      }
    } catch (error) {
      console.error('[Portfolio import] failed', { file: file.name, error });
      addToast(error instanceof Error ? error.message : 'Could not import file.', 'warning');
    }
  };

  const handleConfirmImport = (validTrades: ImportedTrade[], shouldUpdateHoldings: boolean) => {
    if (!validTrades || validTrades.length === 0) return;
    const batchId = `import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const taggedTrades: Transaction[] = validTrades.map(t => ({
      ...t,
      importBatchId: batchId,
    }));

    const batchRecord: ImportBatchRecord = {
      batchId,
      fileName: pendingImportAnalysis?.fileName || 'Imported file',
      timestamp: new Date().toISOString(),
      tradeCount: taggedTrades.length,
      txIds: taggedTrades.map(t => t.id),
      previousHoldings: { ...holdings },
    };

    const nextBatches = [batchRecord, ...importBatches];
    const updates: PortfolioPatch = { portfolioTransactions: [...taggedTrades, ...transactions] };

    if (shouldUpdateHoldings) {
      try {
        const restored = holdingsFromLedger([...taggedTrades, ...transactions]);
        const importedTickers = new Set(taggedTrades.map(t => t.ticker));
        const preserved = Object.fromEntries(Object.entries(holdings).filter(([ticker]) => !importedTickers.has(ticker)));
        updates.holdings = { ...preserved, ...restored };
      } catch (err) {
        addToast(err instanceof Error ? err.message : 'Could not rebuild holdings. No changes were saved.', 'warning');
        return;
      }
    }
    if (!persistPortfolio(updates)) return;
    persistImportBatches(nextBatches);

    setPendingImportAnalysis(null);
    addToast(`Successfully imported ${taggedTrades.length} trades with verified stock matching.`, 'success');
  };

  const undoLastImport = () => {
    if (importBatches.length === 0) return;
    const [latestBatch, ...remainingBatches] = importBatches;
    const batchTxIds = new Set(latestBatch.txIds);
    const remainingTransactions = transactions.filter(t => !batchTxIds.has(t.id) && t.importBatchId !== latestBatch.batchId);

    if (!persistPortfolio({ ...(latestBatch.previousHoldings ? { holdings: latestBatch.previousHoldings } : {}), portfolioTransactions: remainingTransactions })) return;
    persistImportBatches(remainingBatches);
    addToast(`Reverted import of ${latestBatch.fileName} (${latestBatch.tradeCount} trades). Previous holdings restored.`, 'info');
  };

  const removeImportedCsv = () => {
    const imported = transactions.filter(tx => tx.id.startsWith('csv-'));
    if (imported.length === 0) return;
    const remaining = transactions.filter(tx => !tx.id.startsWith('csv-'));
    const importedTickers = new Set(imported.map(tx => tx.ticker));
    const remainingTickers = new Set(remaining.map(tx => tx.ticker));
    const nextHoldings = Object.fromEntries(Object.entries(holdings).filter(([ticker]) => !importedTickers.has(ticker) || remainingTickers.has(ticker)));
    const key = storageKey('portfolio_holdings_before_csv_remove');
    if (key) localStorage.setItem(key, JSON.stringify(holdings));
    if (!persistPortfolio({ portfolioTransactions: remaining, holdings: nextHoldings })) return;
    persistImportBatches([]);
    addToast(`Removed ${imported.length} imported CSV entries. Manual ledger entries were kept.`, 'info');
  };

  // List of watchlisted stocks
  const watchlistedStocks = useMemo(() => {
    return stocks.filter(s => watchlist.includes(s.ticker));
  }, [stocks, watchlist]);

  // Stock options from live quotes, user holdings, and backend metadata
  const allStockOptions = useMemo<StockOption[]>(() => {
    const map = new Map<string, StockOption>();

    // 1. Live stocks (highest fidelity quotes from /api/stocks)
    stocks.forEach(s => {
      map.set(s.ticker.toUpperCase(), {
        ticker: s.ticker,
        name: s.name,
        currentPrice: s.currentPrice,
        sector: s.sector || STOCK_METADATA[s.ticker]?.sector
      });
    });

    // 2. User holdings (e.g. PFS, DEVYANI from imported CSV/broker statements)
    Object.values(holdings).forEach(h => {
      const upper = h.ticker.toUpperCase();
      if (!map.has(upper)) {
        map.set(upper, {
          ticker: h.ticker,
          name: TICKER_NAMES[upper] || upper,
          currentPrice: h.buyPrice,
          sector: STOCK_METADATA[upper]?.sector
        });
      }
    });

    // 3. Known ticker names from stock fetcher
    Object.entries(TICKER_NAMES).forEach(([ticker, name]) => {
      const upper = ticker.toUpperCase();
      if (!map.has(upper)) {
        map.set(upper, {
          ticker,
          name,
          sector: STOCK_METADATA[upper]?.sector
        });
      }
    });

    // 4. Stock metadata from backend lib
    Object.keys(STOCK_METADATA).forEach(ticker => {
      const upper = ticker.toUpperCase();
      if (!map.has(upper)) {
        map.set(upper, {
          ticker,
          name: TICKER_NAMES[upper] || ticker,
          sector: STOCK_METADATA[upper]?.sector
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [stocks, holdings]);

  // Clean active portfolio holdings (always aligning with watchlisted tickers for default setup)
  const activeHoldings = useMemo(() => {
    const updated: Record<string, PortfolioHolding> = {};
    watchlistedStocks.forEach(stock => {
      if (holdings[stock.ticker]) {
        updated[stock.ticker] = holdings[stock.ticker];
      } else {
        updated[stock.ticker] = {
          ticker: stock.ticker,
          quantity: 0,
          buyPrice: stock.currentPrice
        };
      }
    });
    return updated;
  }, [watchlistedStocks, holdings]);

  // Selected Stock detail in trade ticket
  const selectedTradeStock = useMemo(() => {
    const live = stocks.find(s => s.ticker === tradeTicker);
    if (live) return live;
    return allStockOptions.find(o => o.ticker === tradeTicker);
  }, [stocks, watchlistedStocks, tradeTicker, allStockOptions]);

  // Auto populate trade ticket Ticker
  useEffect(() => {
    if (!tradeTicker && watchlistedStocks.length > 0) {
      setTradeTicker(watchlistedStocks[0].ticker);
    }
  }, [watchlistedStocks, tradeTicker]);

  // Calculate India-specific Brokerage and Taxes
  const calculateCharges = (qty: number, price: number, isBuy: boolean) => {
    const turnover = qty * price;
    // Brokerage: Flat ₹20 or 0.03% (whichever is lower) for delivery
    const brokerage = Math.min(20, turnover * 0.0003);
    // Securities Transaction Tax (STT): 0.1% on both Buy & Sell
    const stt = turnover * 0.001;
    // Stamp Duty: 0.015% only on Buy
    const stampDuty = isBuy ? turnover * 0.00015 : 0;
    // SEBI Turnover fee: 0.0001% (₹10 / Crore)
    const sebiFee = turnover * 0.000001;
    // Exchange Transaction Charges (NSE): 0.00345%
    const exchangeCharge = turnover * 0.0000345;
    // GST: 18% on (Brokerage + Exchange Charges + SEBI Fee)
    const gst = (brokerage + exchangeCharge + sebiFee) * 0.18;

    const totalTaxes = stt + stampDuty + sebiFee + exchangeCharge + gst;
    
    return {
      turnover,
      brokerage,
      taxes: totalTaxes,
      grandTotal: isBuy ? (turnover + brokerage + totalTaxes) : (turnover - brokerage - totalTaxes)
    };
  };

  const tradePreviewPrice = Number(tradePriceOverride.trim() || selectedTradeStock?.currentPrice);
  const tradePreviewQuantity = parseInt(tradeQty, 10) || 0;
  const tradePreview = Number.isFinite(tradePreviewPrice) && tradePreviewPrice > 0
    ? calculateCharges(tradePreviewQuantity, tradePreviewPrice, tradeAction === 'BUY')
    : null;

  const unpricedHoldings = useMemo(() => Object.values(holdings).filter(holding => {
    if (holding.quantity <= 0) return false;
    const quote = stocks.find(stock => stock.ticker === holding.ticker)?.currentPrice;
    return typeof quote !== 'number' || !Number.isFinite(quote) || quote <= 0;
  }), [holdings, stocks]);

  // Compute calculated statistics for entire portfolio (Holdings + Cash NAV)
  const portfolioStats = useMemo(() => {
    let totalStockValue = 0;
    let totalCostBasis = 0;

    const items = stocks.map(stock => {
      // Fallback holding
      const holding = holdings[stock.ticker] || { ticker: stock.ticker, quantity: 0, buyPrice: stock.currentPrice };
      const hasUsableQuote = Number.isFinite(stock.currentPrice) && stock.currentPrice > 0;
      const currentVal = hasUsableQuote ? holding.quantity * stock.currentPrice : 0;
      const costBasis = holding.quantity * holding.buyPrice;
      const profitLoss = hasUsableQuote ? currentVal - costBasis : null;
      const percentReturn = hasUsableQuote && holding.buyPrice > 0 ? ((stock.currentPrice - holding.buyPrice) / holding.buyPrice) * 100 : null;

      if (holding.quantity > 0 && hasUsableQuote) {
        totalStockValue += currentVal;
        totalCostBasis += costBasis;
      }

      // Metadata mappings (Sector, MCAP)
      const metadata = STOCK_METADATA[stock.ticker];

      return {
        ...stock,
        quantity: holding.quantity,
        buyPrice: holding.buyPrice,
        currentValue: currentVal,
        costBasis,
        profitLoss,
        percentReturn,
        sector: metadata?.sector || 'Sector unavailable',
        marketCap: metadata?.marketCap
      };
    }).filter(item => item.quantity > 0);

    const netPortfolioNAV = totalStockValue + cashBalance;
    const netProfitLoss = totalStockValue - totalCostBasis;
    const netPercentReturn = totalCostBasis > 0 ? (netProfitLoss / totalCostBasis) * 100 : 0;

    return {
      items,
      totalStockValue,
      totalCostBasis,
      cashBalance,
      netPortfolioNAV,
      netProfitLoss,
      netPercentReturn,
      hasHoldings: items.length > 0
    };
  }, [stocks, holdings, cashBalance]);

  const portfolioAnalysis = useMemo(() => {
    const quoted = portfolioStats.items.filter(item => Number.isFinite(item.currentPrice) && item.currentPrice > 0);
    const total = quoted.reduce((sum, item) => sum + item.currentValue, 0);
    const top = [...quoted].sort((a, b) => b.currentValue - a.currentValue)[0];
    const winners = quoted.filter(item => item.profitLoss !== null && item.profitLoss > 0).length;
    const losers = quoted.filter(item => item.profitLoss !== null && item.profitLoss < 0).length;
    return {
      quotedCount: quoted.length,
      positionCount: portfolioStats.items.length + unpricedHoldings.length,
      topName: top?.ticker ?? '—',
      topWeight: top && total > 0 ? (top.currentValue / total) * 100 : 0,
      winners,
      losers,
      coverage: portfolioStats.items.length + unpricedHoldings.length > 0
        ? (quoted.length / (portfolioStats.items.length + unpricedHoldings.length)) * 100 : 0,
    };
  }, [portfolioStats.items, unpricedHoldings]);

  const currentPerfFilter = useMemo<PerformanceFilter>(() => {
    if (perfPeriod === 'all') return { type: 'all' };
    if (perfPeriod === 'cal-2026') return { type: 'calendar', year: 2026 };
    if (perfPeriod === 'cal-2025') return { type: 'calendar', year: 2025 };
    if (perfPeriod === 'custom') {
      return { type: 'custom', startDate: customPerfStartDate, endDate: customPerfEndDate };
    }
    if (perfPeriod.startsWith('fy-')) {
      const fy = perfPeriod === 'fy-current' ? getFinancialYear(new Date()) : perfPeriod.replace('fy-', '');
      return { type: 'fy', fy };
    }
    return { type: 'fy', fy: getFinancialYear(new Date()) };
  }, [perfPeriod, customPerfStartDate, customPerfEndDate]);

  const portfolioPerformance = useMemo(() => {
    const options = useBrokerReconciliation ? {
      actualRealizedOverride: parseFloat(brokerReportedRealizedInput) || undefined,
      actualChargesOverride: parseFloat(brokerReportedChargesInput) || undefined,
    } : undefined;
    return calculatePortfolioPerformance(transactions, currentPerfFilter, options);
  }, [transactions, currentPerfFilter, useBrokerReconciliation, brokerReportedRealizedInput, brokerReportedChargesInput]);

  const currentYearPerformance = useMemo(() => {
    return {
      realized: portfolioPerformance.realized,
      buys: portfolioPerformance.buys,
      sells: portfolioPerformance.sells,
    };
  }, [portfolioPerformance]);

  const ledgerMetrics = useMemo(() => {
    const totalTrades = transactions.length;
    const buys = transactions.filter(t => t.action === 'BUY');
    const sells = transactions.filter(t => t.action === 'SELL');
    const totalTurnover = transactions.reduce((acc, t) => acc + (Number(t.netValue) || 0), 0);
    const totalFrictions = transactions.reduce((acc, t) => acc + (Number(t.brokerage) || 0) + (Number(t.taxes) || 0), 0);
    const disciplinedCount = transactions.filter(t => !t.emotionalTag || t.emotionalTag === 'Disciplined' || t.emotionalTag === 'Value Accumulation').length;
    const disciplinePct = totalTrades > 0 ? ((disciplinedCount / totalTrades) * 100).toFixed(0) : '100';

    return {
      totalTrades,
      buyCount: buys.length,
      sellCount: sells.length,
      totalTurnover,
      totalFrictions,
      disciplinePct
    };
  }, [transactions]);

  // Equity History Ticker - Save current NAV over time dynamically (throttled to max 1 update per 30s)
  const lastEquityLogTimeRef = useRef<number>(0);
  useEffect(() => {
    const now = Date.now();
    if (portfolioStats.totalStockValue > 0 && now - lastEquityLogTimeRef.current >= 30000) {
      lastEquityLogTimeRef.current = now;
      const timeStr = new Date(now).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Keep only last 30 points to avoid memory bloat
      setEquityHistory(prev => {
        if (prev.length > 0 && prev[prev.length - 1].time === timeStr) {
          return prev;
        }
        const updated = [...prev, { time: timeStr, value: Number(portfolioStats.totalStockValue.toFixed(2)) }].slice(-30);
        return updated;
      });
    }
  }, [portfolioStats.totalStockValue, storageKey]);

  // Risk thresholds are informational. Price refreshes must never execute trades.

  // Execute manual trades via Portal
  const executeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(tradeQty);
    const price = tradePriceOverride.trim() ? parseFloat(tradePriceOverride) : selectedTradeStock?.currentPrice;

    if (isNaN(qty) || qty <= 0) {
      addToast('Please enter a valid stock quantity.', 'warning');
      return;
    }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
      addToast('A quote is unavailable. Enter a positive price for this local simulation.', 'warning');
      return;
    }

    const isBuy = tradeAction === 'BUY';
    const charges = calculateCharges(qty, price, isBuy);
    let nextCash = cashBalance;
    let orderHoldings = holdings;
    let orderRules = riskRules;

    if (isBuy) {
      if (charges.grandTotal > cashBalance) {
        addToast(`Insufficient Available Cash! Order requires ₹${charges.grandTotal.toFixed(2)} (Available cash: ₹${cashBalance.toFixed(2)})`, 'warning');
        return;
      }

      // Deduct mock cash
      const newCash = cashBalance - charges.grandTotal;
      nextCash = newCash;

      // Update holdings
      const currentHolding = holdings[tradeTicker] || { ticker: tradeTicker, quantity: 0, buyPrice: 0 };
      const newQty = currentHolding.quantity + qty;
      const newBuyPrice = ((currentHolding.quantity * currentHolding.buyPrice) + (qty * price)) / newQty;

      const nextHoldings = {
        ...holdings,
        [tradeTicker]: {
          ticker: tradeTicker,
          quantity: newQty,
          buyPrice: Number(newBuyPrice.toFixed(2))
        }
      };
      orderHoldings = nextHoldings;

      // Update automatic risk trigger defaults if checked
      if (autoExitOnRisk) {
        const nextRules = { ...riskRules };
        if (!nextRules[tradeTicker]) {
          nextRules[tradeTicker] = {
            stopLoss: Number((price * 0.90).toFixed(2)), // Default 10% stop loss
            takeProfit: Number((price * 1.25).toFixed(2)), // Default 25% target
            autoExit: false
          };
          orderRules = nextRules;
        }
      }

    } else {
      // SELL order
      const currentHolding = holdings[tradeTicker] || { ticker: tradeTicker, quantity: 0, buyPrice: 0 };
      if (currentHolding.quantity < qty) {
        addToast(`Insufficient shares! You only hold ${currentHolding.quantity} shares of ${tradeTicker} but tried to sell ${qty}`, 'warning', tradeTicker);
        return;
      }

      // Add mock cash
      const newCash = cashBalance + charges.grandTotal;
      nextCash = newCash;

      // Update holdings
      const newQty = currentHolding.quantity - qty;
      const nextHoldings = {
        ...holdings,
        [tradeTicker]: {
          ticker: tradeTicker,
          quantity: newQty,
          buyPrice: newQty === 0 ? 0 : currentHolding.buyPrice
        }
      };
      orderHoldings = nextHoldings;
    }

    // Record Transaction
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString('en-IN'),
      ticker: tradeTicker,
      action: tradeAction,
      quantity: qty,
      price: price,
      brokerage: charges.brokerage,
      taxes: charges.taxes,
      netValue: charges.grandTotal,
      emotionalTag: tradeEmotion
    };

    if (!persistPortfolio({ holdings: orderHoldings, portfolioCash: nextCash, portfolioTransactions: [newTx, ...transactions], portfolioRiskRules: orderRules })) return;
    addToast(`Simulated ${tradeAction} of ${qty} shares of ${tradeTicker} @ ₹${price.toFixed(2)} queued for saving.`, 'info', tradeTicker);

    // Reset fields
    setTradeQty('10');
    setTradePriceOverride('');
  };

  // Modify manual average prices in Holdings tab
  const handleModifyAvgManual = (ticker: string, quantity: number, buyPrice: number) => {
    const nextHoldings = {
      ...holdings,
      [ticker]: {
        ticker,
        quantity: Math.max(0, quantity),
        buyPrice: Math.max(0.01, buyPrice)
      }
    };
    persistHoldings(nextHoldings);
  };

  // Auto populate add custom position Ticker
  useEffect(() => {
    if (!addTicker && allStockOptions.length > 0) {
      const preferred = allStockOptions.find(o => o.ticker === 'RELIANCE') || allStockOptions[0];
      setAddTicker(preferred.ticker);
      if (!addBuyPrice && preferred.currentPrice) {
        setAddBuyPrice(preferred.currentPrice.toFixed(2));
      }
    }
  }, [allStockOptions, addTicker, addBuyPrice]);

  const handleAddCustomHolding = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(addQty);
    const price = parseFloat(addBuyPrice);

    if (!addTicker) {
      addToast('Please select a valid stock ticker.', 'warning');
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      addToast('Please enter a valid shares count (quantity > 0).', 'warning');
      return;
    }
    if (isNaN(price) || price <= 0) {
      addToast('Please enter a valid buy price (amount > 0).', 'warning');
      return;
    }

    const totalCost = qty * price;
    if (totalCost > cashBalance) {
      addToast(`Insufficient Cash! Position costs ₹${Number(totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} but available cash is ₹${Number(cashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'warning');
      return;
    }

    const previous = holdings[addTicker] ?? { ticker: addTicker, quantity: 0, buyPrice: 0 };
    const nextQuantity = previous.quantity + qty;
    const nextHoldings = { ...holdings, [addTicker]: { ticker: addTicker, quantity: nextQuantity,
      buyPrice: (previous.quantity * previous.buyPrice + totalCost) / nextQuantity } };

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString('en-IN'),
      ticker: addTicker,
      action: 'BUY',
      quantity: qty,
      price: price,
      brokerage: 0,
      taxes: 0,
      netValue: qty * price,
      emotionalTag: 'Manual Entry'
    };
    if (!persistPortfolio({ holdings: nextHoldings, portfolioCash: cashBalance - totalCost, portfolioTransactions: [newTx, ...transactions] })) return;

    addToast(`Successfully added ${qty} shares of ${addTicker} at ₹${price.toFixed(2)} to your holdings.`, 'success');

    // Reset qty & price fields
    setAddQty('');
    setAddBuyPrice('');
  };

  const startManualEditing = (ticker: string, qty: number, buyPrice: number) => {
    setEditingTicker(ticker);
    setEditQty(qty.toString());
    setEditBuyPrice(buyPrice.toFixed(2));
  };

  const saveManualEdit = (ticker: string) => {
    const q = parseInt(editQty);
    const p = parseFloat(editBuyPrice);
    if (!isNaN(q) && !isNaN(p)) {
      handleModifyAvgManual(ticker, q, p);
    }
    setEditingTicker(null);
  };

  const confirmDeleteHolding = () => {
    if (!holdingToDelete) return;
    const { ticker, costBasis } = holdingToDelete;

    const nextHoldings = { ...holdings };
    delete nextHoldings[ticker];
    const nextRules = { ...riskRules };
    delete nextRules[ticker];
    if (!persistPortfolio({ holdings: nextHoldings, portfolioCash: refundToCash && costBasis > 0 ? cashBalance + costBasis : cashBalance, portfolioRiskRules: nextRules })) return;

    addToast(`Removed ${ticker} from your portfolio holdings${refundToCash ? ` and refunded ₹${Number(costBasis).toLocaleString('en-IN', { maximumFractionDigits: 0 })} to cash` : ''}.`, 'info');
    setHoldingToDelete(null);
    setRefundToCash(false);
  };

  // Sector allocation data
  const sectorChartData = useMemo(() => {
    const sectors: Record<string, number> = {};
    portfolioStats.items.forEach(item => {
      sectors[item.sector] = (sectors[item.sector] || 0) + item.currentValue;
    });
    return Object.entries(sectors).map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [portfolioStats.items]);

  // Market Cap allocation data (Large vs Mid vs Small cap)
  const mcapChartData = useMemo(() => {
    let largeCapVal = 0;
    let midCapVal = 0;
    let smallCapVal = 0;
    let unavailableCapVal = 0;

    portfolioStats.items.forEach(item => {
      // Large cap > ₹20,000 Crore; Mid cap ₹5000 - ₹20000 Cr; Small cap < ₹5000 Cr
      if (!Number.isFinite(item.marketCap) || Number(item.marketCap) <= 0) {
        unavailableCapVal += item.currentValue;
      } else if (Number(item.marketCap) > 20000) {
        largeCapVal += item.currentValue;
      } else if (Number(item.marketCap) >= 5000) {
        midCapVal += item.currentValue;
      } else {
        smallCapVal += item.currentValue;
      }
    });

    const data = [];
    if (largeCapVal > 0) data.push({ name: 'Large Cap (>20k Cr)', value: Number(largeCapVal.toFixed(2)) });
    if (midCapVal > 0) data.push({ name: 'Mid Cap (5k - 20k Cr)', value: Number(midCapVal.toFixed(2)) });
    if (smallCapVal > 0) data.push({ name: 'Small Cap (<5k Cr)', value: Number(smallCapVal.toFixed(2)) });
    if (unavailableCapVal > 0) data.push({ name: 'Market cap unavailable', value: Number(unavailableCapVal.toFixed(2)) });
    return data;
  }, [portfolioStats.items]);

  // Handle setting specific risk bounds
  const handleSaveRiskRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRiskTicker) {
      addToast('Please select a stock to define risk boundaries.', 'warning');
      return;
    }

    const sl = inputStopLoss ? parseFloat(inputStopLoss) : null;
    const tp = inputTakeProfit ? parseFloat(inputTakeProfit) : null;
    if (sl !== null && isNaN(sl)) {
      addToast('Please enter a valid Stop Loss price.', 'warning');
      return;
    }
    if (tp !== null && isNaN(tp)) {
      addToast('Please enter a valid Take Profit price.', 'warning');
      return;
    }

    const updatedRules = {
      ...riskRules,
      [selectedRiskTicker]: {
        stopLoss: sl,
        takeProfit: tp,
        autoExit: false
      }
    };
    persistRiskRules(updatedRules);
    addToast(`Successfully saved capital risk limits for ${selectedRiskTicker}.`, 'success', selectedRiskTicker);

    // Reset inputs
    setSelectedRiskTicker('');
    setInputStopLoss('');
    setInputTakeProfit('');
  };

  const handleClearRiskRule = (ticker: string) => {
    const updatedRules = { ...riskRules };
    delete updatedRules[ticker];
    persistRiskRules(updatedRules);
    addToast(`Cleared risk safeguards for ${ticker}.`, 'info', ticker);
  };

  const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f43f5e', '#14b8a6', '#475569', '#16a34a'];

  const analysisStock = analysisTicker ? portfolioStats.items.find(item => item.ticker === analysisTicker) : null;
  const analysisStockMeta = analysisTicker ? stocks.find(s => s.ticker === analysisTicker) : null;
  const analysisRule = analysisTicker ? riskRules[analysisTicker] : undefined;

  const stockBuyTx = useMemo(() => {
    if (!analysisTicker) return [];
    return transactions.filter(t => t.ticker === analysisTicker && t.action === 'BUY');
  }, [analysisTicker, transactions]);

  const holdingMetrics = useMemo(() => {
    if (!analysisStock) return null;
    const dates = stockBuyTx.map(t => parseTradeDate(t.timestamp)?.date).filter((d): d is Date => !!d);
    const earliest = dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null;
    const daysHeld = earliest ? Math.max(1, Math.floor((Date.now() - earliest.getTime()) / (1000 * 60 * 60 * 24))) : null;
    const weight = portfolioStats.totalStockValue > 0 ? (analysisStock.currentValue / portfolioStats.totalStockValue) * 100 : 0;
    return {
      earliestBuyDate: earliest ? earliest.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Portfolio snapshot',
      daysHeld,
      weight,
    };
  }, [analysisStock, stockBuyTx, portfolioStats.totalStockValue]);

  const generateStockAiAssessment = () => {
    if (!analysisStock) return;
    setLoadingAiAnalysis(true);
    const rsiValue = (analysisStockMeta as any)?.rsi;
    const atrValue = (analysisStockMeta as any)?.atr;
    if (typeof rsiValue !== 'number' || !Number.isFinite(rsiValue) || atrValue === null || atrValue === undefined || atrValue === '') {
      setAiAnalysisResult(null);
      setLoadingAiAnalysis(false);
      addToast('Technical indicator evidence is unavailable. No assessment was generated.', 'warning', analysisStock.ticker);
      return;
    }
    const pnlPct = analysisStock.buyPrice > 0 ? ((analysisStock.currentPrice - analysisStock.buyPrice) / analysisStock.buyPrice) * 100 : 0;
    const rsi = rsiValue as number;
    const atr = String(atrValue);
    const rule = analysisRule;

    let verdict: 'ACCUMULATE' | 'HOLD' | 'BOOK_PROFIT' | 'EXIT_STOPLOSS' = 'HOLD';
    if (rule?.stopLoss && analysisStock.currentPrice <= rule.stopLoss) {
      verdict = 'EXIT_STOPLOSS';
    } else if (pnlPct >= 18 || (rule?.takeProfit && analysisStock.currentPrice >= rule.takeProfit)) {
      verdict = 'BOOK_PROFIT';
    } else if (rsi < 42 && pnlPct > -8) {
      verdict = 'ACCUMULATE';
    } else {
      verdict = 'HOLD';
    }

    const thesis = [
      `Recorded holding history begins ${holdingMetrics?.earliestBuyDate || 'in an earlier period'}. Tax treatment is not assessed by this tracker.`,
      `Technical Momentum: 14-day RSI is at ${rsi.toFixed(1)} with ${atr} ATR volatility. Stock is trading ${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(1)}% versus your recorded average entry of ₹${analysisStock.buyPrice.toFixed(2)}.`,
      `Portfolio Weighting: Currently accounts for ${holdingMetrics?.weight.toFixed(1) || '0.0'}% of your total equity capital. ${holdingMetrics && holdingMetrics.weight > 20 ? 'Concentrated position size: keep tight trailing stops.' : 'Comfortable diversification sizing.'}`,
    ];

    const riskTriggers = [
      rule?.stopLoss ? `Configured stop-loss breach at ₹${rule.stopLoss.toFixed(2)}.` : `Technical support breakdown at ₹${(analysisStock.buyPrice * 0.93).toFixed(2)} (-7% risk benchmark).`,
      rule?.takeProfit ? `Profit target reached at ₹${rule.takeProfit.toFixed(2)}.` : `Upside resistance test at ₹${(analysisStock.currentPrice * 1.10).toFixed(2)}.`,
    ];

    const actionableLevels = `Suggested trailing stop-loss: ₹${(Math.max(analysisStock.buyPrice, analysisStock.currentPrice * 0.94)).toFixed(2)} · Next upward resistance / profit target: ₹${(analysisStock.currentPrice * 1.08).toFixed(2)}.`;

    setTimeout(() => {
      setAiAnalysisResult({
        verdict,
        thesis,
        riskTriggers,
        actionableLevels,
      });
      setLoadingAiAnalysis(false);
    }, 200);
  };

  const handleRunPortfolioAiAudit = useCallback(async () => {
    if (portfolioPerformance.closedTrades.length === 0) return;
    setLoadingPortfolioAiAudit(true);
    try {
      const res = await fetch('/api/portfolio/ai-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performance: portfolioPerformance }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.audit) {
          setPortfolioAiAudit(data.audit);
          setLoadingPortfolioAiAudit(false);
          setIsAiAuditOpen(true);
          return;
        }
      }
    } catch (e) {
      console.warn('[AI Audit API route fallback]:', e);
    }
    // Instant client-side fallback
    const audit = generatePortfolioAiAudit(portfolioPerformance);
    setPortfolioAiAudit(audit);
    setLoadingPortfolioAiAudit(false);
    setIsAiAuditOpen(true);
  }, [portfolioPerformance]);

  // Automatically update AI audit when portfolioPerformance updates
  useEffect(() => {
    if (portfolioPerformance.closedTrades.length > 0) {
      const audit = generatePortfolioAiAudit(portfolioPerformance);
      setPortfolioAiAudit(audit);
    }
  }, [portfolioPerformance]);

  return (
    <>
    <PortfolioSaveStatus />
    <fieldset className="contents" disabled={portfolioSync && ['loading', 'signed-out', 'conflict', 'error'].includes(portfolioSync.status)}>
    {/* Import Verification & Preview Modal */}
    {pendingImportAnalysis && (
      <ImportPreviewModal
        analysis={pendingImportAnalysis}
        onConfirm={handleConfirmImport}
        onCancel={() => setPendingImportAnalysis(null)}
      />
    )}

    {/* Delete Holding Confirmation Modal */}
    {holdingToDelete && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  Remove Position: {holdingToDelete.ticker}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-[240px]">
                  {holdingToDelete.name}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setHoldingToDelete(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 text-lg leading-none cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 space-y-2 text-xs font-mono">
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Shares Owned:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">{holdingToDelete.quantity}</span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Current Market Value:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                ₹{Number(holdingToDelete.currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>Cost Basis:</span>
              <span className="font-bold text-gray-900 dark:text-gray-100">
                ₹{Number(holdingToDelete.costBasis || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={refundToCash}
                onChange={(e) => setRefundToCash(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
              />
              <span>Refund cost basis (₹{Number(holdingToDelete.costBasis || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}) to Cash Balance</span>
            </label>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
              This will remove {holdingToDelete.ticker} from your active holdings. Any configured capital safeguards for this stock will also be removed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setHoldingToDelete(null)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmDeleteHolding}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Position</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Broker Reconciliation Modal */}
    {showReconciliationModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden space-y-4 p-6">
          <div className="flex items-start justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Scale className="h-4 w-4 text-indigo-500" />
                <span>Broker Statement Reconciliation</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Reconcile FIFO calculations with your exact broker statement figures.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowReconciliationModal(false)}
              className="text-gray-400 hover:text-gray-600 p-1 text-lg leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>

          <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1.5 leading-relaxed">
              <div className="font-bold text-indigo-900 dark:text-indigo-200">
                About statement values
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Enter values from your own broker statement to compare them with this local ledger. Statement figures are user-provided and are not independently verified.
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                Realised P&amp;L and charges are kept as separate reported values. The local estimate may use different broker rates, taxes, and rounding.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase font-mono">
                Broker-reported realised P&amp;L
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-mono">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={brokerReportedRealizedInput}
                  onChange={(e) => setBrokerReportedRealizedInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-sm font-bold text-gray-900 dark:text-white"
                  placeholder="Enter statement amount"
                />
              </div>
              <span className="text-[10px] text-gray-400">
                Raw FIFO calculated: ₹{Number(portfolioPerformance.rawRealized || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase font-mono">
                Broker-reported charges &amp; fees
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-400 font-mono">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={brokerReportedChargesInput}
                  onChange={(e) => setBrokerReportedChargesInput(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono text-sm font-bold text-gray-900 dark:text-white"
                  placeholder="Enter statement amount"
                />
              </div>
              <span className="text-[10px] text-gray-400">
                Statutory estimated charges: ₹{Number(portfolioPerformance.rawEstimatedCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 space-y-2">
              <div className="flex items-center justify-between font-mono">
                <span className="text-gray-700 dark:text-gray-300 font-sans font-bold">Reported realised P&amp;L:</span>
                <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {brokerReportedRealizedInput.trim()
                    ? `${Number(brokerReportedRealizedInput) < 0 ? '−' : '+'}₹${Math.abs(Number(brokerReportedRealizedInput)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                    : '—'}
                </strong>
              </div>
              <div className="flex items-center justify-between font-mono text-xs text-gray-500">
                <span className="font-sans">Reported charges (separate):</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  ₹{Number(brokerReportedChargesInput || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 pt-1.5 border-t border-emerald-100/50 dark:border-emerald-900/30 leading-normal">
                Values shown here are taken from your statement input. Check your broker's definitions to confirm how fees are included.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => handleSaveReconciliation(false, brokerReportedRealizedInput, brokerReportedChargesInput)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
            >
              Use Raw FIFO (₹{Number(portfolioPerformance.rawRealized || 0).toFixed(2)})
            </button>
            <button
              type="button"
              onClick={() => handleSaveReconciliation(true, brokerReportedRealizedInput, brokerReportedChargesInput)}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Apply Statement Figures (₹{Number(brokerReportedRealizedInput || 0).toFixed(2)})
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Closed Trades Itemized Breakdown Modal (Statement Reconciliation) */}
    {showClosedTradesModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-gray-50/50 dark:bg-gray-950/50">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Itemized Closed Positions &amp; P&amp;L Reconciliation
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Closed transactions in the selected period ({perfPeriod.startsWith('fy-') ? `FY ${perfPeriod.replace('fy-', '')}` : perfPeriod}), with recorded dates, prices, and holding duration.
              </p>
            </div>
            <button type="button" onClick={() => setShowClosedTradesModal(false)} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg text-lg leading-none">&times;</button>
          </div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-xs font-mono">
            <div><span className="text-gray-400 block text-[10px]">Realised P&amp;L</span><strong className={`text-base ${Number(portfolioPerformance.realized || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>₹{Number(portfolioPerformance.realized || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            <div><span className="text-gray-400 block text-[10px]">Charges &amp; Fees (Separate)</span><strong className="text-base text-gray-700 dark:text-gray-300">₹{Number(portfolioPerformance.totalCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            <div><span className="text-gray-400 block text-[10px]">Total Turnover</span><strong className="text-base text-gray-900 dark:text-white">₹{Number(portfolioPerformance.totalTurnover || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong></div>
            <div><span className="text-gray-400 block text-[10px]">Win Rate</span><strong className="text-base text-indigo-600 dark:text-indigo-400">{Number(portfolioPerformance.winRate || 0)}% ({Number(portfolioPerformance.winningTrades || 0)}W / {Number(portfolioPerformance.losingTrades || 0)}L)</strong></div>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {portfolioPerformance.closedTrades.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">No closed positions found in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 uppercase tracking-wider">
                      <th className="pb-2 font-bold font-sans">Stock</th>
                      <th className="pb-2 font-bold">Buy Date</th>
                      <th className="pb-2 font-bold">Sell Date</th>
                      <th className="pb-2 text-right font-bold">Qty</th>
                      <th className="pb-2 text-right font-bold">Buy Price</th>
                      <th className="pb-2 text-right font-bold">Sell Price</th>
                      <th className="pb-2 text-right font-bold">Realised P&amp;L</th>
                      <th className="pb-2 text-right font-bold">Est. Charges</th>
                      <th className="pb-2 text-right font-bold font-sans">Holding Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {portfolioPerformance.closedTrades.map((t, idx) => (
                      <tr key={t.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                        <td className="py-2.5 font-sans font-bold text-gray-900 dark:text-white">
                          <span>{t.ticker}</span>
                          {t.displayName && t.displayName !== t.ticker && (
                            <span className="text-[10px] text-gray-400 block truncate max-w-[150px] font-normal">{t.displayName}</span>
                          )}
                        </td>
                        <td className="py-2.5 text-gray-500">{t.buyDate}</td>
                        <td className="py-2.5 text-gray-900 dark:text-white font-bold">{t.sellDate}</td>
                        <td className="py-2.5 text-right">{t.quantity}</td>
                        <td className="py-2.5 text-right">₹{Number(t.buyPrice || 0).toFixed(2)}</td>
                        <td className="py-2.5 text-right font-bold">₹{Number(t.sellPrice || 0).toFixed(2)}</td>
                        <td className={`py-2.5 text-right font-bold ${t.grossPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.grossPnl >= 0 ? '+' : ''}₹{Number(t.grossPnl || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-gray-500">
                          ₹{Number(t.charges || 0).toFixed(2)}
                        </td>
                        <td className="py-2.5 text-right font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {t.holdingDays} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex justify-end">
            <button type="button" onClick={() => setShowClosedTradesModal(false)} className="px-4 py-2 bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold text-xs rounded-xl cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Upgraded Portfolio Stock Detail & AI Analysis Modal */}
    {analysisStock && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label={`${analysisStock.ticker} portfolio analysis`}>
        <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900 border border-gray-100 dark:border-gray-800 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{analysisStock.name}</h2>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{analysisStock.ticker}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {analysisStock.sector} · Holding Horizon &amp; Institutional Analysis
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setAnalysisTicker(null);
                setAiAnalysisResult(null);
              }}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1.5"
            >
              &times;
            </button>
          </div>

          {/* Position & Holding Horizon Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs font-mono">
            <div>
              <span className="text-gray-400 block text-[10px]">Shares Held</span>
              <strong className="text-sm font-bold text-gray-900 dark:text-white">{analysisStock.quantity}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Current Value</span>
              <strong className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(analysisStock.currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Portfolio Weight</span>
              <strong className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{Number(holdingMetrics?.weight || 0).toFixed(1)}%</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Avg Cost Basis</span>
              <strong className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(analysisStock.buyPrice || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Current Price</span>
              <strong className="text-sm font-bold text-gray-900 dark:text-white">₹{Number(analysisStock.currentPrice || 0).toFixed(2)}</strong>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Unrealized P&amp;L</span>
              <strong className={`text-sm font-bold ${Number(analysisStock.profitLoss || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {Number(analysisStock.profitLoss || 0) >= 0 ? '+' : ''}₹{Math.abs(Number(analysisStock.profitLoss || 0)).toFixed(2)} ({Number(analysisStock.percentReturn || 0).toFixed(1)}%)
              </strong>
            </div>
          </div>

          {/* Market Trend & Risk Safeguards */}
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
              <span className="text-[10px] text-gray-400 block">14D RSI</span>
              <span className="text-sm font-bold">{typeof (analysisStockMeta as any)?.rsi === 'number' ? (analysisStockMeta as any).rsi.toFixed(1) : 'Unavailable'}</span>
            </div>
            <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
              <span className="text-[10px] text-gray-400 block">Volatility (ATR)</span>
              <span className="text-sm font-bold">{(analysisStockMeta as any)?.atr || 'Unavailable'}</span>
            </div>
            <div className="p-3 border border-gray-100 dark:border-gray-800 rounded-xl">
              <span className="text-[10px] text-gray-400 block">Recorded holding duration</span>
              <span className="text-[10px] font-bold font-sans text-slate-600 dark:text-slate-300">
                {holdingMetrics?.daysHeld ? `${holdingMetrics.daysHeld} days` : 'Unavailable'}
              </span>
            </div>
          </div>

          {/* Safeguard comparison */}
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/40 p-3 text-xs border border-gray-100 dark:border-gray-800">
            <span className="font-bold text-gray-700 dark:text-gray-300">Configured Risk Guards: </span>
            {!analysisRule ? (
              <span className="text-gray-500">No stop-loss or take-profit target configured for this stock.</span>
            ) : analysisStock.currentPrice <= (analysisRule.stopLoss ?? -Infinity) ? (
              <span className="text-rose-600 font-bold">Price has dropped below your configured stop-loss of ₹{analysisRule.stopLoss!.toFixed(2)}.</span>
            ) : analysisStock.currentPrice >= (analysisRule.takeProfit ?? Infinity) ? (
              <span className="text-emerald-600 font-bold">Price has reached your target of ₹{analysisRule.takeProfit!.toFixed(2)}.</span>
            ) : (
              <span className="text-gray-600 dark:text-gray-300">
                Current price is within safe bounds (Stop: ₹{analysisRule.stopLoss ? `₹${analysisRule.stopLoss.toFixed(2)}` : 'None'} · Target: ₹{analysisRule.takeProfit ? `₹${analysisRule.takeProfit.toFixed(2)}` : 'None'}).
              </span>
            )}
          </div>

          {/* Actual Institutional AI Assessment Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white">
                <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>Institutional AI Portfolio Intelligence</span>
              </div>
              {!aiAnalysisResult && (
                <button
                  type="button"
                  onClick={generateStockAiAssessment}
                  disabled={loadingAiAnalysis}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  {loadingAiAnalysis ? 'Analyzing Portfolio...' : 'Generate AI Assessment'}
                </button>
              )}
            </div>

            {aiAnalysisResult && (
              <div className="p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3 animate-in fade-in duration-300 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Strategic Verdict:</span>
                  <span className={`px-2.5 py-1 rounded-md font-bold text-xs font-mono uppercase tracking-wider ${
                    aiAnalysisResult.verdict === 'ACCUMULATE'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : aiAnalysisResult.verdict === 'BOOK_PROFIT'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : aiAnalysisResult.verdict === 'EXIT_STOPLOSS'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                  }`}>
                    {aiAnalysisResult.verdict.replace('_', ' ')}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Analysis Thesis</span>
                  <ul className="space-y-1 text-gray-700 dark:text-gray-300 list-disc list-inside">
                    {aiAnalysisResult.thesis.map((point, idx) => (
                      <li key={idx} className="leading-relaxed">{point}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Key Triggers</span>
                  <ul className="space-y-0.5 text-gray-600 dark:text-gray-400 list-disc list-inside text-[11px]">
                    {aiAnalysisResult.riskTriggers.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-2.5 bg-white dark:bg-gray-900 rounded-lg border border-indigo-100 dark:border-indigo-900/40 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 font-medium">
                  {aiAnalysisResult.actionableLevels}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    <div id="upgraded-portfolio-terminal-container" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-[9px] font-extrabold uppercase rounded-md tracking-wider">
              Manual Holdings Tracker · Local Only
            </span>
            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono text-[9px] font-extrabold uppercase rounded-md tracking-wider">
              No broker connection
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2 mt-1.5">
            <Briefcase className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <span>Manual Holdings Tracker</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-3xl">
            Record holdings and simulated transactions for personal analysis. This local tracker does not place, transmit, or reconcile broker orders. Quotes may be unavailable or delayed.
          </p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          Personal record keeping · No broker orders
        </div>
      </div>

      {unpricedHoldings.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-gray-900" aria-label="Holdings awaiting quotes">
          <h3 className="font-bold">Your holdings — quotes unavailable</h3>
          <p className="mt-1">These shares are still in your portfolio. Values and charts below are partial and exclude these shares.</p>
          <ul className="mt-3 space-y-1">
            {unpricedHoldings.map(holding => <li key={holding.ticker}>
              <strong>{holding.ticker}</strong> · {holding.quantity} shares · Average buy price ₹{Number(holding.buyPrice || 0).toLocaleString('en-IN')}
            </li>)}
          </ul>
        </section>
      )}

      {transactions.some(tx => String(tx.id).startsWith('sample-')) && (
        <section className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100" role="note">
          <h3 className="font-bold">Review legacy sample records</h3>
          <p className="mt-1">This local tracker contains transaction IDs from a retired sample-data generator. Those rows may not represent your trades; review them before relying on the ledger totals.</p>
        </section>
      )}

      {/* Primary Key Metric Summary Panel (4-Card Institutional Wealth Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6" id="brokerage-terminal-metrics">
        {/* Card 1: Total Portfolio NAV */}
        <div className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-indigo-400/60 transition-all duration-300 overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-36 h-36 rounded-full bg-indigo-500/15 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Estimated Portfolio Value
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              ₹{Number(portfolioStats.netPortfolioNAV || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-sans">
              Available quote values + recorded cash
            </span>
          </div>
        </div>

        {/* Card 2: Current Equity Valuation */}
        <div className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-blue-400/60 transition-all duration-300 overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-36 h-36 rounded-full bg-blue-500/15 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Quoted Stock Assets
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              ₹{Number(portfolioStats.totalStockValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-sans">
              Cost basis: ₹{Number(portfolioStats.totalCostBasis || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Card 3: Unrealized Profit / Loss on quoted holdings */}
        <div className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-emerald-400/60 transition-all duration-300 overflow-hidden">
          <div className={`absolute -right-12 -bottom-12 w-36 h-36 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none ${Number(portfolioStats.netProfitLoss || 0) >= 0 ? 'bg-emerald-500/15' : 'bg-rose-500/15'}`} />
          <div className="relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Unrealized P/L · quoted holdings
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${Number(portfolioStats.netProfitLoss || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {Number(portfolioStats.netProfitLoss || 0) >= 0 ? '+' : '-'}₹{Math.abs(Number(portfolioStats.netProfitLoss || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg border ${Number(portfolioStats.netProfitLoss || 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/60 dark:border-rose-800/60'}`}>
                {Number(portfolioStats.netProfitLoss || 0) >= 0 ? '+' : ''}{Number(portfolioStats.netPercentReturn || 0).toFixed(2)}%
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-sans">
              Based on available quotes; unpriced holdings are excluded
            </span>
          </div>
        </div>

        {/* Card 4: Available Cash Liquidity */}
        <div className="group relative bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-violet-400/60 transition-all duration-300 overflow-hidden">
          <div className="absolute -right-12 -bottom-12 w-36 h-36 rounded-full bg-violet-500/15 blur-2xl group-hover:scale-125 transition-transform duration-500 pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Available Cash Balance
            </span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white tracking-tight">
              ₹{Number(portfolioStats.cashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block font-sans">
              {portfolioStats.netPortfolioNAV > 0 ? `${((portfolioStats.cashBalance / portfolioStats.netPortfolioNAV) * 100).toFixed(1)}% cash allocation` : 'Unallocated trading buffer'}
            </span>
          </div>
        </div>
      </div>

      {/* Terminal Sub Tabs Navigation Panel (Sleek Glassmorphic Pill Dock) */}
      <div className="flex overflow-x-auto no-scrollbar pb-2" id="portfolio-sub-navigation">
        <div className="inline-flex flex-nowrap bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/80 shadow-sm gap-1.5">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer rounded-xl ${
              activeSubTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="h-4 w-4" />
            <span>My Holdings</span>
          </button>

          <button
            onClick={() => setActiveSubTab('trade')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer rounded-xl ${
              activeSubTab === 'trade'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Scale className="h-4 w-4" />
                      <span>Local Simulator</span>
          </button>

          <button
            onClick={() => setActiveSubTab('risk')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer rounded-xl relative ${
              activeSubTab === 'risk'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Capital Guards</span>
            {Object.keys(riskRules).length > 0 && (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer rounded-xl ${
              activeSubTab === 'ledger'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Transaction Audit Ledger</span>
          </button>

          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer rounded-xl ${
              activeSubTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Advanced Analytics</span>
          </button>

          <button
            onClick={() => setActiveSubTab('wallet')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold whitespace-nowrap transition-all cursor-pointer rounded-xl ${
              activeSubTab === 'wallet'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Capital Cash Wallet</span>
          </button>
        </div>
      </div>

      {/* Content Rendering Switch based on Tab */}
      <div key={activeSubTab} className="space-y-6 animate-in fade-in duration-100">
          {/* TAB 1: SUMMARY & HOLDINGS LIST */}
          {activeSubTab === 'summary' && (
            <div className="space-y-6">
              {stocks.length === 0 && !Object.values(holdings).some(h => h.quantity > 0) ? (
                <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
                  <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center">
                    <Star className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-950 text-sm dark:text-white">No holdings yet</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                      Your holdings are independent of your watchlist. If you have past purchases, open Transaction Audit Ledger and restore holdings from those records.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('dashboard')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <Compass className="h-4 w-4" />
                    Explore Stock Tickers
                  </button>
                </div>
              ) : (
                <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-5">
                  <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                        <Briefcase className="h-4 w-4 text-indigo-500" />
                        <span>Active Portfolio Holdings &amp; Risk Inventory</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Live-streamed tick mark-to-market valuation · Dynamic portfolio weights · Safeguard stop-loss triggers
                      </p>
                    </div>

                    {portfolioStats.hasHoldings && (
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Filter */}
                        <div className="relative">
                          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={holdingsSearch}
                            onChange={(e) => setHoldingsSearch(e.target.value)}
                            placeholder="Filter holdings..."
                            className="pl-8 pr-7 py-1.5 bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-36 sm:w-44 transition-all"
                          />
                          {holdingsSearch && (
                            <button
                              type="button"
                              onClick={() => setHoldingsSearch('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold cursor-pointer"
                            >
                              &times;
                            </button>
                          )}
                        </div>

                        {/* Filter Tabs: All, Gainers, Drawdowns */}
                        <div className="flex bg-gray-100/90 dark:bg-gray-800/90 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-xs font-bold font-mono">
                          <button
                            type="button"
                            onClick={() => setHoldingsFilter('all')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              holdingsFilter === 'all'
                                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                          >
                            All ({portfolioStats.items.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setHoldingsFilter('profit')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                              holdingsFilter === 'profit'
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Gainers ({portfolioStats.items.filter(i => (i.profitLoss ?? 0) >= 0).length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setHoldingsFilter('loss')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                              holdingsFilter === 'loss'
                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 shadow-xs'
                                : 'text-gray-400 hover:text-rose-600 dark:hover:text-rose-400'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Drawdowns ({portfolioStats.items.filter(i => (i.profitLoss ?? 0) < 0).length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {!portfolioStats.hasHoldings ? (
                    <div className="space-y-6">
                      <div className="text-center py-6 border-b border-gray-100 dark:border-gray-800 space-y-3">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          You do not currently own any shares. Use the Trading Portal tab to trade or manually add your holdings below.
                        </p>
                      </div>
                      
                      {/* Manual Add Form Card */}
                      <div className="bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-800 rounded-2xl p-5 max-w-2xl mx-auto space-y-4">
                        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400">
                          Add Custom Stock Position
                        </h4>
                        <form onSubmit={handleAddCustomHolding} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Ticker</label>
                            <StockSelectorCombobox
                              value={addTicker}
                              onChange={(ticker, price) => {
                                setAddTicker(ticker);
                                if ((!addBuyPrice || parseFloat(addBuyPrice) === 0) && price && price > 0) {
                                  setAddBuyPrice(price.toFixed(2));
                                }
                              }}
                              options={allStockOptions}
                              placeholder="Search or enter ticker..."
                            />
                          </div>
                          
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Shares (Qty)</label>
                            <input
                              type="number"
                              min="1"
                              value={addQty}
                              onChange={(e) => setAddQty(e.target.value)}
                              placeholder="e.g. 50"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none font-mono"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Buy Price (₹)</label>
                            <input
                              type="number"
                              step="0.05"
                              min="0.01"
                              value={addBuyPrice}
                              onChange={(e) => setAddBuyPrice(e.target.value)}
                              placeholder="e.g. 1540"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none font-mono"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1 sm:col-span-1 h-[36px]"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add Position</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Manual Add/Update Bar */}
                      <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-800 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-gray-400">
                            Quick Manual Position Adjustment
                          </h4>
                          <span className="text-[10px] text-gray-400 font-mono">Instant Portfolio Re-sync</span>
                        </div>
                        <form onSubmit={handleAddCustomHolding} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Ticker</label>
                            <StockSelectorCombobox
                              value={addTicker}
                              onChange={(ticker, price) => {
                                setAddTicker(ticker);
                                if ((!addBuyPrice || parseFloat(addBuyPrice) === 0) && price && price > 0) {
                                  setAddBuyPrice(price.toFixed(2));
                                }
                              }}
                              options={allStockOptions}
                              placeholder="Search or enter ticker..."
                            />
                          </div>
                          
                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Shares (Qty)</label>
                            <input
                              type="number"
                              min="1"
                              value={addQty}
                              onChange={(e) => setAddQty(e.target.value)}
                              placeholder="e.g. 100"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none font-mono"
                            />
                          </div>

                          <div className="space-y-1 sm:col-span-1">
                            <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Buy Price (₹)</label>
                            <input
                              type="number"
                              step="0.05"
                              min="0.01"
                              value={addBuyPrice}
                              onChange={(e) => setAddBuyPrice(e.target.value)}
                              placeholder="e.g. 2450.50"
                              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold focus:border-indigo-500 outline-none font-mono"
                            />
                          </div>

                          <button
                            type="submit"
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1 sm:col-span-1 h-[36px]"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Save Position</span>
                          </button>
                        </form>
                      </div>

                      {/* Holdings Table with Filter and Sizing */}
                      {(() => {
                        const displayedHoldings = portfolioStats.items.filter((stock) => {
                          if (holdingsFilter === 'profit' && (stock.profitLoss ?? 0) < 0) return false;
                          if (holdingsFilter === 'loss' && (stock.profitLoss ?? 0) >= 0) return false;
                          if (holdingsSearch.trim()) {
                            const q = holdingsSearch.toLowerCase();
                            const matchesTicker = stock.ticker.toLowerCase().includes(q);
                            const matchesName = (stock.name || '').toLowerCase().includes(q);
                            if (!matchesTicker && !matchesName) return false;
                          }
                          return true;
                        });

                        if (displayedHoldings.length === 0) {
                          return (
                            <div className="py-12 text-center space-y-2 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                              <Search className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                                No stock positions match the current filter &quot;{holdingsSearch || holdingsFilter}&quot;
                              </p>
                              <button
                                type="button"
                                onClick={() => { setHoldingsFilter('all'); setHoldingsSearch(''); }}
                                className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold underline cursor-pointer"
                              >
                                Reset all filters
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800">
                            <table className="w-full text-left border-collapse min-w-[760px]">
                              <thead>
                                <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                  <th className="py-3 pl-3.5 font-bold">Asset &amp; Sector</th>
                                  <th className="py-3 text-right font-bold">Live Price</th>
                                  <th className="py-3 text-center font-bold">Shares Owned</th>
                                  <th className="py-3 text-right font-bold">Avg Buy Price</th>
                                  <th className="py-3 text-right font-bold">Cost Basis</th>
                                  <th className="py-3 text-right font-bold">Portfolio Weight</th>
                                  <th className="py-3 text-center font-bold">Capital Safeguard</th>
                                  <th className="py-3 text-right font-bold">Unrealized P&amp;L</th>
                                  <th className="py-3 text-right pr-3.5 font-bold">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100/80 dark:divide-gray-800/60 text-xs font-mono">
                                {displayedHoldings.map((stock) => {
                                  const holding = stock;
                                  const costBasis = stock.costBasis;
                                  const currentValue = stock.currentValue;
                                  const profitLoss = stock.profitLoss;
                                  const percentReturn = stock.percentReturn;
                                  const isUp = stock.change >= 0;
                                  const isPLUp = (profitLoss ?? 0) >= 0;
                                  const isEditing = editingTicker === stock.ticker;
                                  const risk = riskRules[stock.ticker];
                                  const planStatus = !risk ? 'Unprotected' : risk.stopLoss && stock.currentPrice <= risk.stopLoss ? 'Exit Triggered' : risk.takeProfit && stock.currentPrice >= risk.takeProfit ? 'Target Hit' : 'Protected';
                                  const weightPct = (Number(portfolioStats.totalStockValue || 0) > 0)
                                    ? ((Number(currentValue || 0) / Number(portfolioStats.totalStockValue)) * 100).toFixed(1)
                                    : '0.0';

                                  return (
                                    <tr 
                                      key={stock.ticker} 
                                      className="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors group"
                                    >
                                      {/* Asset & Sector */}
                                      <td className="py-3.5 pl-3.5">
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={() => setAnalysisTicker(stock.ticker)}
                                            className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer text-left"
                                          >
                                            {stock.ticker}
                                          </button>
                                          <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-mono px-1.5 py-0.5 rounded font-semibold truncate max-w-[90px]">
                                            {STOCK_METADATA[stock.ticker]?.sector || 'IT / Equities'}
                                          </span>
                                        </div>
                                        <span className="block text-[10px] text-gray-400 truncate max-w-[150px] font-sans mt-0.5" title={stock.name}>
                                          {stock.name}
                                        </span>
                                      </td>

                                      {/* Live Price */}
                                      <td className="py-3.5 text-right">
                                        <span className="block font-bold text-gray-900 dark:text-gray-100">
                                          ₹{stock.currentPrice.toFixed(2)}
                                        </span>
                                        <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                          {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                        </span>
                                      </td>

                                      {/* Shares Owned */}
                                      <td className="py-3.5 text-center font-bold text-gray-800 dark:text-gray-200">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            value={editQty}
                                            onChange={(e) => setEditQty(e.target.value)}
                                            className="w-16 px-1.5 py-1 bg-white dark:bg-gray-800 border border-indigo-400 dark:border-indigo-600 rounded-lg text-center font-mono font-bold text-xs shadow-2xs"
                                          />
                                        ) : (
                                          <span>{holding.quantity}</span>
                                        )}
                                      </td>

                                      {/* Avg Buy Price */}
                                      <td className="py-3.5 text-right text-gray-700 dark:text-gray-300">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            step="0.05"
                                            value={editBuyPrice}
                                            onChange={(e) => setEditBuyPrice(e.target.value)}
                                            className="w-20 px-1.5 py-1 bg-white dark:bg-gray-800 border border-indigo-400 dark:border-indigo-600 rounded-lg text-right font-mono text-xs shadow-2xs"
                                          />
                                        ) : (
                                          `₹${holding.buyPrice.toFixed(2)}`
                                        )}
                                      </td>

                                      {/* Cost Basis */}
                                      <td className="py-3.5 text-right text-gray-500 dark:text-gray-400">
                                        ₹{Number(costBasis || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                      </td>

                                      {/* Portfolio Weight & Current Value */}
                                      <td className="py-3.5 text-right">
                                        <div className="flex flex-col items-end">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-bold text-gray-900 dark:text-gray-100">
                                              ₹{Number(currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold">
                                              {weightPct}%
                                            </span>
                                          </div>
                                          <div className="w-16 bg-gray-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden mt-1">
                                            <div 
                                              className="h-full bg-indigo-500 rounded-full"
                                              style={{ width: `${Math.min(100, Math.max(5, parseFloat(weightPct)))}%` }}
                                            />
                                          </div>
                                        </div>
                                      </td>

                                      {/* Capital Safeguard */}
                                      <td className="py-3.5 text-center font-sans">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                          planStatus === 'Exit Triggered' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                          planStatus === 'Target Hit' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                          planStatus === 'Protected' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                                          'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                                        }`}>
                                          <ShieldCheck className="h-2.5 w-2.5" />
                                          {planStatus}
                                        </span>
                                        {risk && (risk.stopLoss || risk.takeProfit) && (
                                          <div className="text-[9px] font-mono text-gray-400 mt-0.5">
                                            {risk.stopLoss && `SL: ₹${risk.stopLoss.toFixed(0)} `}
                                            {risk.takeProfit && `TP: ₹${risk.takeProfit.toFixed(0)}`}
                                          </div>
                                        )}
                                      </td>

                                      {/* P&L returns */}
                                      <td className="py-3.5 text-right font-mono">
                                        <div className="flex flex-col items-end">
                                          <span className={`font-bold ${isPLUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                            {isPLUp ? '+' : ''}₹{Number(profitLoss || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                          </span>
                                          <span className={`text-[10px] font-bold ${isPLUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {isPLUp ? '+' : ''}{Number(percentReturn || 0).toFixed(2)}%
                                          </span>
                                        </div>
                                      </td>

                                      {/* Action Buttons */}
                                      <td className="py-3.5 text-right pr-3.5 font-sans">
                                        <div className="flex items-center justify-end gap-1">
                                          {isEditing ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => saveManualEdit(stock.ticker)}
                                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-[10px] transition-all cursor-pointer inline-flex items-center gap-1 shadow-xs"
                                                title="Save changes"
                                              >
                                                <Check className="h-3 w-3" />
                                                Save
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setEditingTicker(null)}
                                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors cursor-pointer"
                                                title="Cancel edit"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setTradeTicker(stock.ticker);
                                                  setActiveSubTab('trade');
                                                }}
                                                className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/80 rounded-lg transition-colors cursor-pointer"
                                                title="Trade this stock"
                                              >
                                                <ArrowUpRight className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => startManualEditing(stock.ticker, holding.quantity, holding.buyPrice)}
                                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                                                title="Edit buy price & shares"
                                              >
                                                <Edit3 className="h-3.5 w-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setHoldingToDelete({
                                                  ticker: stock.ticker,
                                                  name: stock.name,
                                                  quantity: holding.quantity,
                                                  currentValue: stock.currentValue,
                                                  costBasis: stock.costBasis
                                                })}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/80 rounded-lg transition-colors cursor-pointer"
                                                title="Delete holding"
                                              >
                                                <Trash2 className="h-3.5 w-3.5" />
                                              </button>
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TRADING PORTAL SIMULATOR */}
          {activeSubTab === 'trade' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Order Ticket Panel */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md lg:col-span-2 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                      <Scale className="h-4 w-4 text-indigo-500" />
                      <span>Local Transaction Simulator</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Select a ticker, review estimated costs, and record a simulated transaction in this local ledger
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      Cash: ₹{Number(cashBalance || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {stocks.length === 0 && !Object.values(holdings).some(h => h.quantity > 0) ? (
                  <div className="text-center py-12 space-y-3">
                    <p className="text-xs text-gray-400">You must add stocks to your Watchlist first to populate the order router.</p>
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs"
                    >
                      <Compass className="h-4 w-4" />
                      <span>Explore Market Tickers</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={executeOrder} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Buy / Sell Toggle Action */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Order Action</label>
                        <div className="flex bg-gray-100/90 dark:bg-gray-800/90 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                          <button
                            type="button"
                            onClick={() => setTradeAction('BUY')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                              tradeAction === 'BUY'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-gray-400 hover:text-emerald-600'
                            }`}
                          >
                            <ArrowUpRight className="h-3.5 w-3.5" />
                            BUY (Long)
                          </button>
                          <button
                            type="button"
                            onClick={() => setTradeAction('SELL')}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer flex justify-center items-center gap-1.5 ${
                              tradeAction === 'SELL'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-gray-400 hover:text-rose-600'
                            }`}
                          >
                            <ArrowDownRight className="h-3.5 w-3.5" />
                            SELL (Exit)
                          </button>
                        </div>
                      </div>

                      {/* Select Ticker */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Select Stock Ticker</label>
                        <StockSelectorCombobox
                          value={tradeTicker}
                          onChange={(ticker) => setTradeTicker(ticker)}
                          options={allStockOptions}
                          placeholder="Search or select stock to trade..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Quantity Input with Presets */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Order Quantity</label>
                          <div className="flex gap-1 font-mono text-[9px]">
                            {['10', '25', '50', '100'].map(q => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setTradeQty(q)}
                                className={`px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${tradeQty === q ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                          <input
                            type="number"
                            min="1"
                            value={tradeQty}
                            onChange={(e) => setTradeQty(e.target.value)}
                            className="w-full bg-transparent border-none text-xs font-bold font-mono outline-none"
                            placeholder="Number of shares"
                          />
                          <span className="text-[10px] font-mono font-bold text-gray-400">Shares</span>
                        </div>
                      </div>

                      {/* Execution Price Override */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                          Simulation Price <span className="text-[9px] text-indigo-500 font-bold font-sans">(Uses the current quote when available)</span>
                        </label>
                        <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-indigo-500">
                          <input
                            type="number"
                            step="0.05"
                            value={tradePriceOverride}
                            onChange={(e) => setTradePriceOverride(e.target.value)}
                            className="w-full bg-transparent border-none text-xs font-bold font-mono outline-none"
                          placeholder={selectedTradeStock?.currentPrice && selectedTradeStock.currentPrice > 0
                            ? `Quote: ₹${selectedTradeStock.currentPrice.toFixed(2)}`
                            : 'Quote unavailable; enter price'}
                          />
                          <span className="text-[10px] font-mono font-bold text-gray-400">INR</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                      {/* Emotional Discipline Tag */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400 flex items-center gap-1">
                          <Flame className="h-3 w-3 text-indigo-500" />
                          <span>Discipline Reflection Tag</span>
                        </label>
                        <select
                          value={tradeEmotion}
                          onChange={(e) => setTradeEmotion(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer"
                        >
                          <option value="Disciplined">Disciplined (Backed by TA/FA Strategy)</option>
                          <option value="Impulsive">Impulsive (Saw rapid chart spike)</option>
                          <option value="Fear of Missing Out">FOMO (Wanted entry immediately)</option>
                          <option value="Panic Exit">Panic Exit (Drawdown protection)</option>
                          <option value="Value Accumulation">Strategic Long-Term Accumulation</option>
                        </select>
                      </div>

                      {/* Default risk bounds check */}
                      {tradeAction === 'BUY' && (
                        <div className="flex items-center gap-2 pt-4 pl-1">
                          <input
                            type="checkbox"
                            id="autoExitCheck"
                            checked={autoExitOnRisk}
                            onChange={(e) => setAutoExitOnRisk(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                          />
                          <label htmlFor="autoExitCheck" className="text-[11px] text-gray-600 dark:text-gray-300 font-bold select-none cursor-pointer">
                            Assign 10% Stop-Loss &amp; 25% Target safeguards
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Order estimate ticket */}
                    {tradeTicker && (
                      <div className="bg-gradient-to-br from-indigo-50/60 via-slate-50 to-purple-50/40 dark:from-indigo-950/30 dark:via-gray-800/40 dark:to-purple-950/20 border border-indigo-100/80 dark:border-indigo-900/40 p-4 rounded-2xl space-y-3">
                        <div className="flex justify-between text-[10px] font-mono text-gray-400 uppercase font-bold tracking-wider border-b border-indigo-100/60 dark:border-indigo-900/30 pb-2">
                          <span>Estimated Local Transaction Cost</span>
                          <span className="text-indigo-600 dark:text-indigo-400">Equity Delivery (CNC)</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-sans">Gross Consideration:</span>
                            <span className="font-bold text-gray-900 dark:text-white">
                              {tradePreview ? `₹${tradePreview.turnover.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Enter price to estimate'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-sans">STT + Stamp Duty + GST:</span>
                            <span className="font-bold text-gray-600 dark:text-gray-300">
                              {tradePreview ? `+₹${tradePreview.taxes.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                          </div>
                          <div>
                              <span className="text-[10px] text-gray-400 block font-sans">Estimated brokerage:</span>
                            <span className="font-bold text-gray-600 dark:text-gray-300">
                              {tradePreview ? `+₹${tradePreview.brokerage.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                          </div>
                          <div className="sm:border-l sm:border-indigo-200/60 sm:dark:border-indigo-800/40 sm:pl-3">
                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 block font-sans font-bold">Estimated Net Impact:</span>
                            <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                              {tradePreview ? `₹${tradePreview.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={`w-full py-3 rounded-xl font-bold font-mono text-white text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2 ${
                        tradeAction === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'
                      }`}
                    >
                      {tradeAction === 'BUY' ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      <span>Save Simulated {tradeAction} to Local Ledger</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Order Terminal Position Status */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-indigo-500" />
                      <span>Current Position Standings</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Current quote valuation of owned assets where available
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {portfolioStats.items.length} Owned
                  </span>
                </div>

                {portfolioStats.items.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <Briefcase className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                    <p className="text-xs text-gray-400">Your current active positions sheet is empty.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 font-mono">
                    {portfolioStats.items.map(item => (
                      <div key={item.ticker} className="flex justify-between items-center bg-gray-50/80 dark:bg-gray-800/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                        <div>
                          <span className="font-bold text-gray-900 dark:text-white text-xs">{item.ticker}</span>
                          <span className="block text-[10px] text-gray-400 font-sans">{item.quantity} Shares @ ₹{Number(item.buyPrice || 0).toFixed(1)}</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-xs font-bold text-gray-700 dark:text-gray-300">{item.percentReturn === null ? 'Value unavailable' : `₹${Number(item.currentValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}</span>
                          <span className={`text-[10px] font-bold ${item.percentReturn === null ? 'text-slate-500' : Number(item.profitLoss || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.percentReturn === null ? 'Quote unavailable' : `${Number(item.percentReturn) >= 0 ? '+' : ''}${Number(item.percentReturn).toFixed(1)}%`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-900/40 p-3.5 rounded-2xl space-y-1">
                  <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Regulatory Friction Accounting</span>
                  </span>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-sans">
                    Estimated transaction charges affect the simulated net result. Rates and rounding may differ from your broker statement.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSACTION AUDIT LEDGER */}
          {activeSubTab === 'ledger' && (
            <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-6">
              {/* Header & Institutional Action Dock */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                      <FileText className="h-4 w-4" />
                    </span>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
                      Audit Trail Transaction Ledger
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full font-mono font-semibold">
                      {transactions.length} Records
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-8">
                    Local transaction log · Estimated costs · Decision notes · Broker statement import
                  </p>
                </div>

                {/* Modern Action Dock */}
                <div className="flex flex-wrap items-center gap-2">
                  {transactions.length > 0 && (
                    <button
                      type="button"
                      onClick={restoreLedgerHoldings}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                      id="btn-restore-ledger-holdings"
                      title="Recalculate and restore current active holdings from this ledger"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Restore Holdings</span>
                    </button>
                  )}

                  <label className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/40 text-xs font-bold shadow-2xs transition-all cursor-pointer">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Import Excel / CSV</span>
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      className="sr-only"
                      onChange={importPortfolioCsv}
                    />
                  </label>

                  {importBatches.length > 0 && (
                    <button
                      type="button"
                      onClick={undoLastImport}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300/80 bg-amber-50 dark:bg-amber-950/40 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all cursor-pointer shadow-2xs"
                      title={`Revert last import batch (${importBatches[0].fileName})`}
                    >
                      <Undo2 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Undo Import ({importBatches[0].tradeCount})</span>
                    </button>
                  )}

                  {transactions.some(tx => tx.id.startsWith('csv-')) && (
                    <button
                      type="button"
                      onClick={removeImportedCsv}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 text-[11px] font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-all cursor-pointer"
                    >
                      Wipe CSV
                    </button>
                  )}

                  {transactions.length > 0 && (
                    <button
                      onClick={() => {
                        persistTransactions([]);
                        addToast('Cleared all local transaction history records.', 'info');
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer font-bold"
                      title="Clear all transaction records"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Financial Audit KPI Cards */}
              {transactions.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5">
                    <span className="text-[10px] font-mono uppercase text-gray-400 block font-semibold">Total Trade Orders</span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-lg font-bold font-mono text-gray-900 dark:text-white">{ledgerMetrics.totalTrades}</span>
                      <span className="text-[10px] font-mono text-gray-400">
                        ({ledgerMetrics.buyCount} Buy · {ledgerMetrics.sellCount} Sell)
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5">
                    <span className="text-[10px] font-mono uppercase text-gray-400 block font-semibold">Gross Traded Value</span>
                    <div className="mt-1">
                      <span className="text-lg font-bold font-mono text-gray-900 dark:text-white">
                        ₹{Number(ledgerMetrics.totalTurnover || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5">
                    <span className="text-[10px] font-mono uppercase text-gray-400 block font-semibold">Brokerage &amp; Levies</span>
                    <div className="mt-1">
                      <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
                        ₹{Number(ledgerMetrics.totalFrictions || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 rounded-2xl p-3.5">
                    <span className="text-[10px] font-mono uppercase text-gray-400 block font-semibold">Execution Discipline</span>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {ledgerMetrics.disciplinePct}%
                      </span>
                      <span className="text-[10px] font-sans font-semibold text-emerald-700/80 dark:text-emerald-400/80">
                        Controlled
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Transactions Content */}
              {transactions.length === 0 ? (
                <div className="bg-gray-50/50 dark:bg-gray-800/20 border border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-12 text-center max-w-xl mx-auto space-y-4">
                  <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-gray-950 text-sm dark:text-white">Audit Ledger is Clean</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
                      This local ledger records imported statement rows and simulated transactions. Nothing here places broker orders.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer">
                      <FileText className="h-4 w-4" />
                      <span>Import Statement (.xlsx / .csv)</span>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                        className="sr-only"
                        onChange={importPortfolioCsv}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('trade')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      <Scale className="h-4 w-4" />
                      <span>Open Local Simulator</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Search and Action Filter Strip */}
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    {/* Search Filter */}
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={ledgerSearch}
                        onChange={(e) => setLedgerSearch(e.target.value)}
                        placeholder="Filter by ticker, company, or emotion..."
                        className="pl-8 pr-7 py-1.5 bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-72 transition-all"
                      />
                      {ledgerSearch && (
                        <button
                          type="button"
                          onClick={() => setLedgerSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold cursor-pointer"
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    {/* Action Filter Tabs */}
                    <div className="flex bg-gray-100/90 dark:bg-gray-800/90 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-xs font-bold font-mono">
                      <button
                        type="button"
                        onClick={() => setLedgerFilter('all')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          ledgerFilter === 'all'
                            ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                            : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                      >
                        All ({transactions.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerFilter('BUY')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          ledgerFilter === 'BUY'
                            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 shadow-xs'
                            : 'text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Buys ({ledgerMetrics.buyCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setLedgerFilter('SELL')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                          ledgerFilter === 'SELL'
                            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 shadow-xs'
                            : 'text-gray-400 hover:text-rose-600 dark:hover:text-rose-400'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Sells ({ledgerMetrics.sellCount})
                      </button>
                    </div>
                  </div>

                  {/* Filtered Table */}
                  {(() => {
                    const filteredTransactions = transactions.filter(tx => {
                      if (ledgerFilter !== 'all' && tx.action !== ledgerFilter) return false;
                      if (ledgerSearch.trim()) {
                        const q = ledgerSearch.toLowerCase();
                        const matchTicker = tx.ticker.toLowerCase().includes(q);
                        const matchName = (tx.displayName || '').toLowerCase().includes(q);
                        const matchEmotion = (tx.emotionalTag || '').toLowerCase().includes(q);
                        if (!matchTicker && !matchName && !matchEmotion) return false;
                      }
                      return true;
                    });

                    if (filteredTransactions.length === 0) {
                      return (
                        <div className="py-12 text-center space-y-2 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                          <Search className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            No ledger entries match &quot;{ledgerSearch || ledgerFilter}&quot;
                          </p>
                          <button
                            type="button"
                            onClick={() => { setLedgerFilter('all'); setLedgerSearch(''); }}
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold underline cursor-pointer"
                          >
                            Reset filters
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800" id="transactions-ledger-table-wrapper">
                        <table className="w-full text-left border-collapse min-w-[850px]">
                          <thead>
                            <tr className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                              <th className="py-3 pl-4 font-bold">Timestamp</th>
                              <th className="py-3 font-bold">Ticker &amp; Asset</th>
                              <th className="py-3 text-center font-bold">Action</th>
                              <th className="py-3 text-right font-bold">Qty</th>
                              <th className="py-3 text-right font-bold">Execution Price</th>
                              <th className="py-3 text-right font-bold">Brokerage Fee</th>
                              <th className="py-3 text-right font-bold">Exchange Taxes</th>
                              <th className="py-3 text-right font-bold">Net Capital Value</th>
                              <th className="py-3 pr-4 text-right font-bold">Discipline Label</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50 text-[11px] font-mono">
                            {filteredTransactions.map((tx) => {
                              const isBuy = tx.action === 'BUY';
                              const emotion = tx.emotionalTag || 'Disciplined';
                              const emotionClass = 
                                emotion === 'Disciplined' || emotion === 'Value Accumulation'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/50'
                                  : emotion === 'FOMO' || emotion === 'Impulsive'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/50'
                                  : emotion === 'Panic'
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/50'
                                  : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/50';

                              return (
                                <tr key={tx.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-950/15 transition-colors">
                                  <td className="py-3.5 pl-4 text-gray-400 whitespace-nowrap text-[10px]">
                                    {tx.timestamp}
                                  </td>
                                  <td className="py-3.5">
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => setAnalysisTicker(tx.ticker)}
                                        className="font-bold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-left"
                                        title={`Open AI Analysis for ${tx.ticker}`}
                                      >
                                        {tx.ticker}
                                      </button>
                                      {tx.id.startsWith('csv-') && (
                                        <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
                                          CSV
                                        </span>
                                      )}
                                    </div>
                                    {tx.displayName && tx.displayName !== tx.ticker && (
                                      <span className="block text-[9px] font-sans text-gray-400 truncate max-w-[160px]" title={tx.displayName}>
                                        {tx.displayName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-black text-[9px] border ${
                                      isBuy 
                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' 
                                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/60'
                                    }`}>
                                      {isBuy ? <ArrowDownRight className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                                      {tx.action}
                                    </span>
                                  </td>
                                  <td className="py-3.5 text-right font-bold text-gray-900 dark:text-gray-100">
                                    {tx.quantity}
                                  </td>
                                  <td className="py-3.5 text-right font-mono">
                                    ₹{Number(tx.price || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 text-right text-gray-400 font-mono">
                                    ₹{Number(tx.brokerage || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 text-right text-gray-400 font-mono">
                                    ₹{Number(tx.taxes || 0).toFixed(2)}
                                  </td>
                                  <td className="py-3.5 text-right font-bold font-mono text-gray-900 dark:text-gray-100">
                                    ₹{Number(tx.netValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="py-3.5 pr-4 text-right">
                                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-sans font-semibold inline-block ${emotionClass}`}>
                                      {emotion}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADVANCED ANALYTICS */}
          {activeSubTab === 'analytics' && (
            <div className="space-y-6">
              {/* Performance / Allocation Charts Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-indigo-100/80 dark:border-indigo-900/50 rounded-3xl p-6 shadow-xl shadow-indigo-950/5 md:col-span-3 space-y-6 transition-all">
                  {/* Subtle ambient decorative gradient orbs */}
                  <div className="absolute -top-28 -right-28 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-28 -left-28 w-96 h-96 bg-emerald-500/10 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                  {/* Top Bar: Selector & Headline */}
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 shadow-2xs">
                          <Scale className="h-4 w-4" />
                        </span>
                        <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
                          Realized P&amp;L Performance Statement
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 rounded-full font-mono font-semibold">
                          Tax estimates unavailable
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 pl-8">
                        FIFO lot-matching estimate · Statement values are user-provided and unverified · No tax estimate
                      </p>
                    </div>

                    {/* Filter Period Dropdown & Custom Range Pickers */}
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={perfPeriod}
                        onChange={(e) => setPerfPeriod(e.target.value)}
                        className="bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs hover:bg-gray-100 dark:hover:bg-gray-700/80 transition-colors"
                      >
                        {availableFys.map(fy => (
                          <option key={fy.id} value={`fy-${fy.id}`}>{fy.label}</option>
                        ))}
                        <option value="cal-2026">Calendar Year 2026</option>
                        <option value="cal-2025">Calendar Year 2025</option>
                        <option value="all">All Time History</option>
                        <option value="custom">Custom Date Range</option>
                      </select>

                      {perfPeriod === 'custom' && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <input
                            type="date"
                            value={customPerfStartDate}
                            onChange={(e) => setCustomPerfStartDate(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300 shadow-2xs"
                            placeholder="Start date"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="date"
                            value={customPerfEndDate}
                            onChange={(e) => setCustomPerfEndDate(e.target.value)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-700 dark:text-gray-300 shadow-2xs"
                            placeholder="End date"
                          />
                        </div>
                      )}

                      {portfolioPerformance.closedTrades.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setShowReconciliationModal(true)}
                            className="px-3 py-1.5 bg-emerald-50/90 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:scale-[1.02] active:scale-95"
                            title="Compare with figures from your broker statement"
                          >
                            <Scale className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{portfolioPerformance.isReconciled ? 'Statement Compared' : 'Compare Statement'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRunPortfolioAiAudit}
                            disabled={loadingPortfolioAiAudit}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md hover:shadow-indigo-500/25 active:scale-95 disabled:opacity-50"
                          >
                            <Sparkles className={`h-3.5 w-3.5 text-amber-300 ${loadingPortfolioAiAudit ? 'animate-spin' : ''}`} />
                            <span>{loadingPortfolioAiAudit ? 'Analyzing with AI...' : portfolioAiAudit ? 'Re-run AI Audit' : 'AI Performance Audit'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowClosedTradesModal(true)}
                            className="px-3 py-1.5 bg-indigo-50/90 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs hover:scale-[1.02] active:scale-95"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>View {portfolioPerformance.closedTrades.length} Closed Trades</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Primary Figures Grid */}
                  <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1 font-mono">
                    {/* Card 1: Realised P&L */}
                    <div className="p-4.5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.05] via-emerald-500/[0.02] to-transparent dark:from-emerald-950/30 dark:via-emerald-950/10 dark:to-transparent border border-emerald-200/70 dark:border-emerald-800/50 shadow-xs hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-300 relative overflow-hidden group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="relative flex h-2 w-2">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${Number(portfolioPerformance.realized || 0) >= 0 ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${Number(portfolioPerformance.realized || 0) >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          </span>
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold tracking-wider">Realised P&amp;L</span>
                        </div>
                        {portfolioPerformance.isReconciled ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-sans font-bold bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            Statement Match
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full font-sans font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                            FIFO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-baseline gap-2 mt-2">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight font-mono ${Number(portfolioPerformance.realized || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {Number(portfolioPerformance.realized || 0) >= 0 ? '+' : '-'}₹{Math.abs(Number(portfolioPerformance.realized || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-full font-mono shadow-2xs border ${Number(portfolioPerformance.returnPercent || 0) >= 0 ? 'bg-emerald-100/90 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/80' : 'bg-rose-100/90 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/80'}`}>
                          {Number(portfolioPerformance.returnPercent || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <span>{Number(portfolioPerformance.returnPercent || 0) >= 0 ? '+' : ''}{Number(portfolioPerformance.returnPercent || 0).toFixed(2)}%</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block font-sans">
                        {portfolioPerformance.isReconciled ? (
                          <span>From {Number(portfolioPerformance.sells || 0)} sold shares · <button type="button" onClick={() => setShowReconciliationModal(true)} className="underline hover:text-indigo-500 cursor-pointer font-medium">FIFO ₹{Number(portfolioPerformance.rawRealized || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</button></span>
                        ) : (
                          <span>From {Number(portfolioPerformance.sells || 0)} sold shares · <button type="button" onClick={() => setShowReconciliationModal(true)} className="underline hover:text-indigo-500 cursor-pointer font-medium">Compare statement</button></span>
                        )}
                      </span>
                    </div>

                    {/* Card 2: Broker Charges & Taxes */}
                    <div className="p-4.5 rounded-2xl bg-gradient-to-br from-amber-500/[0.05] via-amber-500/[0.02] to-transparent dark:from-amber-950/30 dark:via-amber-950/10 dark:to-transparent border border-amber-200/70 dark:border-amber-800/50 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold tracking-wider">
                          {portfolioPerformance.chargesOverrideApplied ? 'Broker Charges & Taxes' : 'Est. Delivery Charges'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowReconciliationModal(true)}
                          className="px-2.5 py-0.5 text-[9px] font-sans font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 hover:bg-amber-200/80 dark:bg-amber-950/80 dark:hover:bg-amber-900/80 border border-amber-300/60 dark:border-amber-800/60 rounded-lg transition-colors cursor-pointer active:scale-95"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-800 dark:text-gray-200 font-mono">
                        ₹{Number(portfolioPerformance.totalCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block font-sans">
                        Separate broker debit · Not deducted from P&amp;L
                      </span>
                    </div>

                    {/* Card 3: Total Turnover */}
                    <div className="p-4.5 rounded-2xl bg-gradient-to-br from-sky-500/[0.05] via-sky-500/[0.02] to-transparent dark:from-sky-950/30 dark:via-sky-950/10 dark:to-transparent border border-sky-200/70 dark:border-sky-800/50 shadow-xs hover:shadow-md hover:border-sky-300 dark:hover:border-sky-700 transition-all duration-300 group">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold tracking-wider">Total Turnover</span>
                      <div className="mt-2 text-2xl sm:text-3xl font-black text-gray-900 dark:text-white font-mono">
                        ₹{Number(portfolioPerformance.totalTurnover || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block font-sans">
                        Across {portfolioPerformance.closedTrades.length} trade decisions
                      </span>
                    </div>

                    {/* Card 4: Trading Discipline */}
                    <div className="p-4.5 rounded-2xl bg-gradient-to-br from-indigo-500/[0.05] via-indigo-500/[0.02] to-transparent dark:from-indigo-950/30 dark:via-indigo-950/10 dark:to-transparent border border-indigo-200/70 dark:border-indigo-800/50 shadow-xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 group">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold tracking-wider">Trading Discipline</span>
                        <span className="text-[9px] font-mono text-gray-400 font-bold">{Number(portfolioPerformance.winningTrades || 0)}W / {Number(portfolioPerformance.losingTrades || 0)}L</span>
                      </div>
                      <div className="mt-2 text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                        {Number(portfolioPerformance.winRate || 0)}%
                      </div>
                      {/* Animated two-tone win-loss progress bar */}
                      <div className="w-full bg-rose-100 dark:bg-rose-950/60 h-2 rounded-full overflow-hidden mt-2.5 flex shadow-inner">
                        <div 
                          className="bg-emerald-500 h-full rounded-l-full transition-all duration-700 ease-out" 
                          style={{ width: `${Math.min(100, Math.max(0, Number(portfolioPerformance.winRate || 0)))}%` }} 
                        />
                        <div 
                          className="bg-rose-400 dark:bg-rose-500 h-full rounded-r-full transition-all duration-700 ease-out" 
                          style={{ width: `${Math.min(100, Math.max(0, 100 - Number(portfolioPerformance.winRate || 0)))}%` }} 
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block font-sans">
                        {Number(portfolioPerformance.winningTrades || 0)} wins · {Number(portfolioPerformance.losingTrades || 0)} losses
                      </span>
                    </div>
                  </div>

                  {/* Secondary Quant Edge & Discipline Metrics Row */}
                  <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-100 dark:border-gray-800 font-mono text-xs">
                    <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold">Profit Factor</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${Number(portfolioPerformance.profitFactor || 0) >= 1.5 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : Number(portfolioPerformance.profitFactor || 0) >= 1.0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                          {Number(portfolioPerformance.profitFactor || 0) >= 2.0 ? 'Super Edge' : Number(portfolioPerformance.profitFactor || 0) >= 1.5 ? 'Strong Edge' : Number(portfolioPerformance.profitFactor || 0) >= 1.0 ? 'Profitable' : 'Drawdown'}
                        </span>
                      </div>
                      <div className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                        {Number(portfolioPerformance.profitFactor || 0).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 block font-sans">
                        +₹{Number(portfolioPerformance.totalGains || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} / -₹{Number(portfolioPerformance.totalLosses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-400" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold">Payoff Ratio</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 font-bold">Win / Loss</span>
                      </div>
                      <div className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                        {Number(portfolioPerformance.payoffRatio || 0).toFixed(2)}x
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 block font-sans">
                        Avg Win: ₹{Number(portfolioPerformance.avgWin || 0).toFixed(0)} · Loss: ₹{Number(portfolioPerformance.avgLoss || 0).toFixed(0)}
                      </span>
                    </div>

                    <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${Number(portfolioPerformance.expectancyPerTrade || 0) >= 0 ? 'from-emerald-500 to-cyan-400' : 'from-rose-500 to-amber-400'}`} />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold">Expectancy / Trade</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">Net Edge</span>
                      </div>
                      <div className={`mt-2 text-xl font-black ${Number(portfolioPerformance.expectancyPerTrade || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {Number(portfolioPerformance.expectancyPerTrade || 0) >= 0 ? '+' : ''}₹{Number(portfolioPerformance.expectancyPerTrade || 0).toFixed(1)}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 block font-sans">
                        Across {portfolioPerformance.closedTrades.length} decisions
                      </span>
                    </div>

                    <div className="p-3.5 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 hover:-translate-y-1 hover:shadow-md transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-400" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-sans font-bold">Turnover &amp; Friction</span>
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">{Number(portfolioPerformance.chargesDragPct || 0)}% drag</span>
                      </div>
                      <div className="mt-2 text-xl font-black text-gray-900 dark:text-white">
                        ₹{Number(portfolioPerformance.totalTurnover || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5 block font-sans truncate">
                        ₹{Number(portfolioPerformance.totalCharges || 0).toFixed(0)} {portfolioPerformance.chargesOverrideApplied ? 'total broker charges & taxes' : 'est. delivery tax & fee'}
                      </span>
                    </div>
                  </div>

                  {/* Best / Worst Extremes & Duration Pill Strip */}
                  <div className="relative z-10 flex flex-wrap items-center gap-2.5 pt-1 font-mono text-[11px]">
                    {portfolioPerformance.largestWin && (
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 hover:scale-[1.02] active:scale-98 transition-all duration-200 shadow-2xs cursor-default">
                        <span className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/80 text-emerald-600 dark:text-emerald-300">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </span>
                        <span>Best Win: <strong>+{portfolioPerformance.largestWin.ticker}</strong> (+₹{Number(portfolioPerformance.largestWin.grossPnl || 0).toFixed(1)} · {Number(portfolioPerformance.largestWin.returnPercent || 0).toFixed(1)}% in {portfolioPerformance.largestWin.holdingDays}d)</span>
                      </div>
                    )}
                    {portfolioPerformance.largestLoss && (
                      <div className="flex items-center gap-2 px-3.5 py-2 bg-rose-50/90 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 rounded-xl border border-rose-200/80 dark:border-rose-900/60 hover:scale-[1.02] active:scale-98 transition-all duration-200 shadow-2xs cursor-default">
                        <span className="p-1 rounded-md bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                        </span>
                        <span>Max Drawdown: <strong>{portfolioPerformance.largestLoss.ticker}</strong> (-₹{Math.abs(Number(portfolioPerformance.largestLoss.grossPnl || 0)).toFixed(1)} · {Number(portfolioPerformance.largestLoss.returnPercent || 0).toFixed(1)}% in {portfolioPerformance.largestLoss.holdingDays}d)</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 px-3.5 py-2 bg-gray-50/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200/80 dark:border-gray-700/80 hover:scale-[1.02] active:scale-98 transition-all duration-200 shadow-2xs cursor-default">
                      <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        <Clock className="h-3.5 w-3.5" />
                      </span>
                      <span>Avg Holding Time: <strong>{portfolioPerformance.avgHoldingDays} days</strong></span>
                    </div>
                  </div>
                </div>

                {/* Institutional AI Quant Audit & Trading Diagnosis Card */}
                {portfolioAiAudit && (
                  <div className="relative overflow-hidden bg-gradient-to-b from-indigo-950/[0.04] via-slate-900/[0.02] to-transparent dark:from-indigo-950/40 dark:via-gray-900/60 dark:to-gray-900 border border-indigo-200/80 dark:border-indigo-900/60 rounded-3xl p-6 shadow-lg md:col-span-3 space-y-5 backdrop-blur-md">
                    {/* Audit Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-100/80 dark:border-indigo-900/40 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono">
                              Local Ledger Metrics Review
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold font-mono bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              {portfolioAiAudit.source === 'gemini' ? 'Gemini 2.5 Flash' : portfolioAiAudit.source === 'ollama' ? 'Local Ollama' : 'Axion Quant Core Engine'}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 font-sans mt-0.5">
                            Recorded figures only · no strategy validation, tax estimate, or trade recommendation
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] font-bold font-mono uppercase text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                          Unvalidated local records
                        </span>

                        <button
                          type="button"
                          onClick={() => setIsAiAuditOpen(!isAiAuditOpen)}
                          className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-gray-100/80 dark:hover:bg-gray-800 cursor-pointer transition-colors shadow-2xs"
                          title={isAiAuditOpen ? 'Collapse audit details' : 'Expand audit details'}
                        >
                          {isAiAuditOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    {/* Executive Summary Box */}
                    <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-sans shadow-2xs">
                      <div className="flex items-start gap-2.5">
                        <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold block text-indigo-950 dark:text-indigo-200 text-[11px] uppercase tracking-wider font-mono">
                            Recorded Figures Summary
                          </strong>
                          <p className="mt-1">{portfolioAiAudit.executiveSummary}</p>
                        </div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isAiAuditOpen && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="space-y-4 pt-1 overflow-hidden"
                        >
                          {/* 4-Pillar Deep Audit Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
                            {/* Pillar 1: Recorded metrics */}
                            <div className="p-4.5 bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800/60 transition-all duration-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono text-[11px] uppercase">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                  <span>Recorded Outcomes</span>
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono ${
                                  portfolioAiAudit.disciplineAudit.status === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  portfolioAiAudit.disciplineAudit.status === 'STABLE' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' :
                                  'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}>
                                  {portfolioAiAudit.disciplineAudit.status}
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                {portfolioAiAudit.disciplineAudit.details}
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                                {portfolioAiAudit.disciplineAudit.metrics.map((m, idx) => (
                                  <div key={idx} className="p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-800">
                                    <span className="text-[10px] text-gray-400 block font-sans">{m.label}</span>
                                    <strong className="text-xs font-bold text-gray-900 dark:text-white block mt-0.5">{m.value}</strong>
                                    <span className={`text-[9px] block mt-0.5 font-sans ${m.status === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : m.status === 'warning' ? 'text-rose-600 dark:text-rose-400' : 'text-gray-500'}`}>
                                      {m.assessment}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Pillar 2: Friction Drag & Brokerage Analysis */}
                            <div className="p-4.5 bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800/60 transition-all duration-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono text-[11px] uppercase">
                                  <Percent className="h-3.5 w-3.5 text-amber-500" />
                                  <span>Statutory Charges &amp; Friction Drag</span>
                                </span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-mono ${
                                  portfolioAiAudit.frictionAudit.severity === 'LOW' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                  portfolioAiAudit.frictionAudit.severity === 'MODERATE' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                  'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {portfolioAiAudit.frictionAudit.severity} DRAG ({portfolioAiAudit.frictionAudit.dragPercentage}%)
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                {portfolioAiAudit.frictionAudit.details}
                              </p>
                              <div className="p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-200 leading-relaxed font-sans">
                                <strong className="block text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 font-mono">
                                  Cost Data Note:
                                </strong>
                                {portfolioAiAudit.frictionAudit.recommendation}
                              </div>
                            </div>

                            {/* Pillar 3: Tax review status */}
                            <div className="p-4.5 bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800/60 transition-all duration-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono text-[11px] uppercase">
                                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                  <span>Tax review status</span>
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  No tax estimate
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                Tax estimates and harvesting recommendations are unavailable from this local ledger because annual totals, transaction eligibility, and taxpayer-specific details are not verified.
                              </p>
                              <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 text-[11px] text-indigo-900 dark:text-indigo-200 leading-relaxed">
                                <strong className="block text-[10px] uppercase font-bold text-indigo-800 dark:text-indigo-300 font-mono">
                                  Tax outcome:
                                </strong>
                                No tax or exemption conclusion is provided.
                              </div>
                            </div>

                            {/* Pillar 4: Pareto Selection & Outliers */}
                            <div className="p-4.5 bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/60 transition-all duration-200 space-y-3">
                              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono text-[11px] uppercase">
                                  <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                                  <span>Pareto Return &amp; Loss Concentration</span>
                                </span>
                                <span className="text-[10px] font-mono text-gray-400">
                                  Outliers Audit
                                </span>
                              </div>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                {portfolioAiAudit.selectionAudit.winnerConcentration}
                              </p>
                              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                                {portfolioAiAudit.selectionAudit.drawdownDrain}
                              </p>
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                                {portfolioAiAudit.selectionAudit.sectorOrStockTakeaway}
                              </p>
                            </div>
                          </div>

                          {/* Action Directives */}
                          <div className="bg-white/90 dark:bg-gray-900/90 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-xs space-y-3">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span>Institutional Quant Action Directives</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {portfolioAiAudit.actionDirectives.map((directive) => (
                                <div key={directive.ruleNumber} className="p-3.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex flex-col justify-between space-y-2.5 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 group">
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold font-mono text-indigo-600 dark:text-indigo-400">
                                        Rule #{directive.ruleNumber}
                                      </span>
                                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono">
                                        {directive.category}
                                      </span>
                                    </div>
                                    <h5 className="text-xs font-bold text-gray-900 dark:text-white mt-1.5">
                                      {directive.title}
                                    </h5>
                                    <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                                      {directive.action}
                                    </p>
                                  </div>
                                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800 text-[10px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                                    <span className="group-hover:translate-x-1 transition-transform">&rarr;</span> {directive.impact}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100 md:col-span-3" role="note">
                  <p className="font-semibold">Tax estimates unavailable</p>
                  <p className="mt-1">This local tracker does not verify the financial-year total, transaction eligibility, tax-lot holding period, or your tax profile. Use verified broker records and current official guidance for tax decisions.</p>
                </div>

                {/* Monthly Realized P&L Timeline Bar Chart */}
                {portfolioPerformance.monthlyPnl.length > 0 && (
                  <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md md:col-span-3 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 font-mono uppercase tracking-wider">
                          <Calendar className="h-4 w-4 text-indigo-500" />
                          <span>Monthly Realized P&amp;L Velocity</span>
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Chronological month-by-month profit velocity across the active statement period
                        </p>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[10px]">
                        <span className="flex items-center gap-1.5 text-emerald-600"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Profit Month</span>
                        <span className="flex items-center gap-1.5 text-rose-600"><span className="h-2 w-2 rounded-full bg-rose-500" /> Loss Month</span>
                      </div>
                    </div>

                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={portfolioPerformance.monthlyPnl} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                          <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} tickFormatter={(val) => `₹${Number(val || 0).toLocaleString()}`} />
                          <Tooltip
                            formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Net Realized P&L']}
                            contentStyle={{
                              backgroundColor: 'rgba(15, 23, 42, 0.95)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}
                          />
                          <Bar dataKey="netPnl" radius={[6, 6, 0, 0]}>
                            {portfolioPerformance.monthlyPnl.map((entry, idx) => (
                              <Cell key={`bar-${idx}`} fill={entry.netPnl >= 0 ? '#10b981' : '#f43f5e'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Month Badges Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs font-mono">
                      {portfolioPerformance.monthlyPnl.map((m, idx) => (
                        <div key={idx} className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center hover:-translate-y-0.5 hover:shadow-xs transition-all duration-200">
                          <span className="text-[10px] text-gray-400 block font-sans font-bold">{m.month}</span>
                          <span className={`text-xs font-bold block mt-1 ${Number(m.netPnl || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {Number(m.netPnl || 0) >= 0 ? '+' : ''}₹{Number(m.netPnl || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-[9px] text-gray-400 block mt-0.5 font-sans">{m.tradesCount}t · {m.winRate}% W</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stock Performance Leaderboard (Top 5 Gainers vs Top 5 Drawdowns) */}
                {(portfolioPerformance.topGainers.length > 0 || portfolioPerformance.topLosers.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:col-span-3">
                    {/* Top Gainers */}
                    <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="p-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
                            <TrendingUp className="h-4 w-4" />
                          </span>
                          <span>Top Profit Contributors</span>
                        </h4>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          Alpha Drivers
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100/80 dark:divide-gray-800/80 text-xs font-mono">
                        {portfolioPerformance.topGainers.map((s, idx) => (
                          <div key={s.ticker || idx} className="py-3 px-2 rounded-2xl flex items-center justify-between hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all duration-200 group">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-lg text-[10px] font-bold font-mono flex items-center justify-center shrink-0 ${
                                idx === 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 ring-1 ring-amber-400/40' :
                                idx === 1 ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200' :
                                'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              }`}>
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setAnalysisTicker(s.ticker)}
                                    className="font-bold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors cursor-pointer text-left"
                                  >
                                    {s.ticker}
                                  </button>
                                  {idx === 0 && <span className="text-[9px] px-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded font-sans font-bold">MVP</span>}
                                </div>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[160px] font-sans">{s.displayName}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                +₹{Number(s.grossPnl || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold font-sans">
                                  {s.winRate}% win
                                </span>
                                <span className="text-[10px] text-gray-400 font-sans">
                                  {s.tradesCount}t
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Losers */}
                    <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                        <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                          <span className="p-1.5 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                            <TrendingDown className="h-4 w-4" />
                          </span>
                          <span>Top Drawdown Contributors</span>
                        </h4>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-mono font-bold">
                          Loss Audit
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100/80 dark:divide-gray-800/80 text-xs font-mono">
                        {portfolioPerformance.topLosers.map((s, idx) => (
                          <div key={s.ticker || idx} className="py-3 px-2 rounded-2xl flex items-center justify-between hover:bg-rose-50/40 dark:hover:bg-rose-950/20 transition-all duration-200 group">
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg text-[10px] font-bold font-mono flex items-center justify-center shrink-0 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setAnalysisTicker(s.ticker)}
                                    className="font-bold text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors cursor-pointer text-left"
                                  >
                                    {s.ticker}
                                  </button>
                                </div>
                                <span className="text-[10px] text-gray-400 block truncate max-w-[160px] font-sans">{s.displayName}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">
                                -₹{Math.abs(Number(s.grossPnl || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </span>
                              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 font-bold font-sans">
                                  {s.winRate}% win
                                </span>
                                <span className="text-[10px] text-gray-400 font-sans">
                                  {s.tradesCount}t
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Positions Analysed Stat Trio */}
                <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300/60 dark:hover:border-indigo-800/60 transition-all duration-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-indigo-500" />
                      Positions Monitored
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      Reconciled
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-gray-950 dark:text-white">
                    {portfolioAnalysis.positionCount}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800 font-sans">
                    <span>Verified Quote Coverage</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-gray-100">{portfolioAnalysis.quotedCount}/{portfolioAnalysis.positionCount}</span>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-purple-300/60 dark:hover:border-purple-800/60 transition-all duration-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-purple-500" />
                      Alpha Concentration
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      Top Holding
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-black font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-[140px]">{portfolioAnalysis.topName || 'N/A'}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg">{portfolioAnalysis.topWeight.toFixed(1)}%</span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${portfolioAnalysis.topWeight > 40 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, Math.max(5, portfolioAnalysis.topWeight))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 block font-sans">Share of quoted stock valuation</span>
                  </div>
                </div>

                <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300/60 dark:hover:border-emerald-800/60 transition-all duration-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                      Position Win / Loss Breadth
                    </span>
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      Realized Ratio
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 font-mono">
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{portfolioAnalysis.winners}W</span>
                    <span className="text-gray-400 font-bold">:</span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400">{portfolioAnalysis.losers}L</span>
                  </div>
                  <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${(portfolioAnalysis.winners / Math.max(1, portfolioAnalysis.winners + portfolioAnalysis.losers)) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${(portfolioAnalysis.losers / Math.max(1, portfolioAnalysis.winners + portfolioAnalysis.losers)) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 block font-sans">
                      {((portfolioAnalysis.winners / Math.max(1, portfolioAnalysis.winners + portfolioAnalysis.losers)) * 100).toFixed(0)}% profitable holdings
                    </span>
                  </div>
                </div>
              </div>

              {/* Historic Equity Curve Chart */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                      <TrendingUp className="h-4 w-4 text-indigo-500" />
                      <span>Historical Equity Valuation Trajectory</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Cumulative portfolio asset growth curve across chronological market trading sessions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
                      Current Value: ₹{Number(portfolioStats.totalStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityHistory} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorNav" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.08)" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} domain={['auto', 'auto']} tickFormatter={(val) => `₹${Number(val || 0).toLocaleString()}`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(15, 23, 42, 0.95)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          color: '#fff',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                        formatter={(val: any) => [`₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'Portfolio Valuation']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorNav)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Visual Breakdown of Assets */}
              {portfolioStats.hasHoldings && (
                <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-3">
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                        <PieChartIcon className="h-4 w-4 text-purple-500" />
                        <span>Asset Allocation &amp; Diversification Map</span>
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Categorical exposure weights dynamically re-indexed against current market value
                      </p>
                    </div>
                    <div className="flex bg-gray-100/90 dark:bg-gray-800/90 p-1 rounded-xl border border-gray-200/60 dark:border-gray-700/60">
                      <button
                        onClick={() => setAnalyticsChartType('sector')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          analyticsChartType === 'sector' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Sectors
                      </button>
                      <button
                        onClick={() => setAnalyticsChartType('mcap')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          analyticsChartType === 'mcap' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-xs' : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        Market Cap
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analyticsChartType === 'sector' ? sectorChartData : mcapChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {(analyticsChartType === 'sector' ? sectorChartData : mcapChartData).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [`₹${Number(value || 0).toLocaleString('en-IN')}`, 'Valuation Weight']}
                            contentStyle={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '12px',
                              color: '#fff',
                              fontSize: '11px',
                              fontFamily: 'monospace'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                      {(analyticsChartType === 'sector' ? sectorChartData : mcapChartData).map((data, index) => {
                        const pct = (Number(portfolioStats.totalStockValue || 0) > 0)
                          ? ((Number(data.value || 0) / Number(portfolioStats.totalStockValue)) * 100).toFixed(1)
                          : '0.0';
                        const numPct = parseFloat(pct);
                        return (
                          <div key={data.name} className="p-2.5 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors space-y-1.5">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-gray-900" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 truncate max-w-[180px]">{data.name}</span>
                              </div>
                              <span className="font-mono text-xs font-black text-gray-900 dark:text-gray-100">{pct}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700/60 h-1 rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  backgroundColor: COLORS[index % COLORS.length],
                                  width: `${Math.min(100, Math.max(3, numPct))}%`
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CAPITAL SAFEGUARDS (Stop Loss & Take Profit) */}
          {activeSubTab === 'risk' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Setup Safeguards Form */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md lg:col-span-1 space-y-5">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                    <ShieldCheck className="h-4 w-4 text-indigo-500" />
                    <span>Capital Safeguard Engine</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Assign downside circuit breakers and upside profit targets to defend capital allocations
                  </p>
                </div>

                {portfolioStats.items.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <ShieldCheck className="h-8 w-8 text-gray-300 dark:text-gray-700 mx-auto" />
                    <p className="text-xs text-gray-400">You must own stock assets first to assign risk boundaries.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveRiskRule} className="space-y-4">
                    {/* Select Stock */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold uppercase text-gray-400">Select Stock Position</label>
                      <select
                        value={selectedRiskTicker}
                        onChange={(e) => {
                          const ticker = e.target.value;
                          setSelectedRiskTicker(ticker);
                          const rule = riskRules[ticker];
                          if (rule) {
                            setInputStopLoss(rule.stopLoss ? rule.stopLoss.toString() : '');
                            setInputTakeProfit(rule.takeProfit ? rule.takeProfit.toString() : '');
                            setInputAutoExit(rule.autoExit);
                          } else {
                            setInputStopLoss('');
                            setInputTakeProfit('');
                            setInputAutoExit(true);
                          }
                        }}
                        className="w-full px-3 py-2 bg-gray-50/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-700/80 rounded-xl text-xs font-bold focus:border-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="">-- Choose Active Position --</option>
                        {portfolioStats.items.map(s => (
                          <option key={s.ticker} value={s.ticker}>
                            {s.ticker} ({s.quantity} shares @ ₹{s.buyPrice.toFixed(1)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick percentage shortcuts if stock is selected */}
                    {selectedRiskTicker && holdings[selectedRiskTicker] && (
                      <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-gray-500 dark:text-gray-400">Recorded Buy Price</span>
                          <strong className="text-indigo-600 dark:text-indigo-400">₹{holdings[selectedRiskTicker].buyPrice.toFixed(2)}</strong>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="text-gray-500 dark:text-gray-400">Current Market Price</span>
                          <strong className="text-gray-900 dark:text-white">
                            ₹{stocks.find(s => s.ticker === selectedRiskTicker)?.currentPrice.toFixed(2) || holdings[selectedRiskTicker].buyPrice.toFixed(2)}
                          </strong>
                        </div>
                      </div>
                    )}

                    {/* Stop Loss Price with Quick Presets */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                          Stop Loss Floor (Exit Low)
                        </label>
                        {selectedRiskTicker && holdings[selectedRiskTicker] && (
                          <div className="flex gap-1">
                            {[-5, -8, -10].map(pct => {
                              const calcPrice = (holdings[selectedRiskTicker].buyPrice * (1 + pct / 100)).toFixed(1);
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setInputStopLoss(calcPrice)}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold transition-colors cursor-pointer"
                                >
                                  {pct}%
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-rose-500">
                        <input
                          type="number"
                          step="0.1"
                          value={inputStopLoss}
                          onChange={(e) => setInputStopLoss(e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-bold font-mono outline-none text-rose-600 dark:text-rose-400"
                          placeholder={selectedRiskTicker ? `E.g. ₹${(holdings[selectedRiskTicker]?.buyPrice * 0.90).toFixed(1)}` : 'Specify Floor (₹)'}
                        />
                        <span className="text-[10px] font-mono font-bold text-gray-400">INR</span>
                      </div>
                    </div>

                    {/* Take Profit Price with Quick Presets */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono font-bold uppercase text-gray-400">
                          Take Profit Target (Exit High)
                        </label>
                        {selectedRiskTicker && holdings[selectedRiskTicker] && (
                          <div className="flex gap-1">
                            {[10, 15, 25].map(pct => {
                              const calcPrice = (holdings[selectedRiskTicker].buyPrice * (1 + pct / 100)).toFixed(1);
                              return (
                                <button
                                  key={pct}
                                  type="button"
                                  onClick={() => setInputTakeProfit(calcPrice)}
                                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold transition-colors cursor-pointer"
                                >
                                  +{pct}%
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-gray-50/90 dark:bg-gray-800/90 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-emerald-500">
                        <input
                          type="number"
                          step="0.1"
                          value={inputTakeProfit}
                          onChange={(e) => setInputTakeProfit(e.target.value)}
                          className="w-full bg-transparent border-none text-xs font-bold font-mono outline-none text-emerald-600 dark:text-emerald-400"
                          placeholder={selectedRiskTicker ? `E.g. ₹${(holdings[selectedRiskTicker]?.buyPrice * 1.20).toFixed(1)}` : 'Specify Ceiling (₹)'}
                        />
                        <span className="text-[10px] font-mono font-bold text-gray-400">INR</span>
                      </div>
                    </div>

                    {/* Risk/Reward Ratio Calculation Badge */}
                    {inputStopLoss && inputTakeProfit && selectedRiskTicker && holdings[selectedRiskTicker] && (() => {
                      const bp = holdings[selectedRiskTicker].buyPrice;
                      const sl = parseFloat(inputStopLoss);
                      const tp = parseFloat(inputTakeProfit);
                      const riskPerShare = bp - sl;
                      const rewardPerShare = tp - bp;
                      if (riskPerShare > 0 && rewardPerShare > 0) {
                        const rr = (rewardPerShare / riskPerShare).toFixed(2);
                        return (
                          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 flex justify-between items-center text-[10px] font-mono">
                            <span className="text-gray-500">Assigned Risk/Reward:</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${parseFloat(rr) >= 2 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'}`}>
                              1 : {rr} {parseFloat(rr) >= 2 ? '(Favorable)' : '(Tight)'}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <button
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Establish Risk Safeguards</span>
                    </button>
                  </form>
                )}
              </div>

              {/* Active Risk SafeGuard Status Sheets */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-indigo-500" />
                      <span>Active Safeguard Boundaries</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Quote-based distance to user-set thresholds; unavailable quotes do not trigger a status
                    </p>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                    {Object.keys(riskRules).length} Rules Active
                  </span>
                </div>

                {Object.keys(riskRules).length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <ShieldCheck className="h-12 w-12 text-gray-200 dark:text-gray-800 mx-auto" />
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold">No active stop-loss or take-profit rules registered yet.</p>
                    <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                      Select any owned position on the left to set custom downside stop-loss floors and upside profit targets.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100/80 dark:divide-gray-800/60 font-mono">
                    {Object.entries(riskRules).map(([ticker, rule]) => {
                      const stock = stocks.find(s => s.ticker === ticker);
                      const currentPrice = typeof stock?.currentPrice === 'number' && Number.isFinite(stock.currentPrice) && stock.currentPrice > 0
                        ? stock.currentPrice : null;
                      const isSLTriggered = currentPrice !== null && rule.stopLoss !== null && currentPrice <= rule.stopLoss;
                      const isTPTriggered = currentPrice !== null && rule.takeProfit !== null && currentPrice >= rule.takeProfit;

                      return (
                        <div key={ticker} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 p-3 rounded-2xl transition-colors">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-gray-900 dark:text-white text-sm">{ticker}</span>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-sans ${
                                currentPrice === null ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                isSLTriggered ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                isTPTriggered ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                              }`}>
                                {currentPrice === null ? 'QUOTE UNAVAILABLE' : isSLTriggered ? 'STOP-LOSS THRESHOLD REACHED' : isTPTriggered ? 'TARGET THRESHOLD REACHED' : 'WITHIN BOUNDARIES'}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-4 text-xs">
                              {rule.stopLoss && (
                                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  SL: ₹{rule.stopLoss.toFixed(2)}
                                  <span className="text-[10px] text-gray-400 font-normal">{currentPrice !== null ? `(${((rule.stopLoss - currentPrice) / currentPrice * 100).toFixed(1)}%)` : '(distance unavailable)'}</span>
                                </span>
                              )}
                              {rule.takeProfit && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  TP: ₹{rule.takeProfit.toFixed(2)}
                                  <span className="text-[10px] text-gray-400 font-normal">{currentPrice !== null ? `(+${((rule.takeProfit - currentPrice) / currentPrice * 100).toFixed(1)}%)` : '(distance unavailable)'}</span>
                                </span>
                              )}
                            </div>

                            {/* Range Visualizer Bar if both SL and TP are set */}
                            {rule.stopLoss && rule.takeProfit && currentPrice !== null && (
                              <div className="w-full max-w-md pt-1">
                                <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden relative">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full"
                                    style={{
                                      width: `${Math.min(100, Math.max(5, ((currentPrice - rule.stopLoss) / (rule.takeProfit - rule.stopLoss)) * 100))}%`
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <span className="block text-[10px] font-bold text-gray-400 font-sans">Current Quote</span>
                              <span className="text-sm font-extrabold text-gray-900 dark:text-gray-100">{currentPrice === null ? 'Unavailable' : `₹${currentPrice.toFixed(2)}`}</span>
                            </div>
                            <button
                              onClick={() => handleClearRiskRule(ticker)}
                              className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer"
                              title="Delete Risk Safeguard"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: MOCK CASH WALLET */}
          {activeSubTab === 'wallet' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deposit/Withdraw Cash portal */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-5">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-wider">
                    <Wallet className="h-4 w-4 text-indigo-500" />
                    <span>Trading Cash Vault Liquidity</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Deposit simulated INR cash reserves to expand position sizing or test leverage &amp; cash drag
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-5 bg-gradient-to-br from-indigo-50/80 via-slate-50 to-purple-50/40 dark:from-indigo-950/40 dark:via-gray-800/60 dark:to-purple-950/30 rounded-3xl border border-indigo-100/80 dark:border-indigo-900/40 text-center space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider block">Available Liquid Reserves</span>
                    <span className="text-3xl font-black font-mono block text-indigo-600 dark:text-indigo-400 tracking-tight">
                      ₹{Number(cashBalance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-sans">Local simulation only · no broker connection</span>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block">Quick Capital Injections</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => {
                          const nextCash = cashBalance + 10000;
                          persistCash(nextCash);
                          addToast('Simulated Deposit of ₹10,000 Cash successfully credited.', 'success');
                        }}
                        className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 transition-all cursor-pointer text-center"
                      >
                        + ₹10,000 Cash
                      </button>
                      <button
                        onClick={() => {
                          const nextCash = cashBalance + 25000;
                          persistCash(nextCash);
                          addToast('Simulated Deposit of ₹25,000 Cash successfully credited.', 'success');
                        }}
                        className="py-2.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 transition-all cursor-pointer text-center"
                      >
                        + ₹25,000 Cash
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 block">Reserve Management</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => {
                          if (cashBalance < 10000) {
                            addToast('Insufficient cash available in simulation vault.', 'warning');
                            return;
                          }
                          const nextCash = cashBalance - 10000;
                          persistCash(nextCash);
                          addToast('Simulated Withdrawal of ₹10,000 Cash successfully completed.', 'info');
                        }}
                        className="py-2.5 px-3 bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs font-mono font-bold rounded-xl border border-rose-200/40 dark:border-rose-900/40 transition-all cursor-pointer text-center"
                      >
                        - ₹10,000 Withdraw
                      </button>
                      <button
                        onClick={() => {
                          persistCash(100000);
                          addToast('Reset simulated cash reserves back to baseline ₹1,00,000 INR.', 'info');
                        }}
                        className="py-2.5 px-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-mono font-bold rounded-xl border border-gray-200 dark:border-gray-700 transition-all cursor-pointer text-center"
                      >
                        Reset to ₹1 Lakh
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cash Drag and Capital Efficiency Analysis */}
              <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-md space-y-5">
                <div className="border-b border-gray-100 dark:border-gray-800 pb-3">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider font-mono flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-500" />
                    <span>Capital Efficiency &amp; Drag Audit</span>
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Portfolio deployment distribution and cash drag compounding evaluation
                  </p>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  {/* Allocation Visual Split Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        Stock Assets: {Number(portfolioStats.netPortfolioNAV || 0) > 0 ? ((Number(portfolioStats.totalStockValue || 0) / Number(portfolioStats.netPortfolioNAV)) * 100).toFixed(1) : '0.0'}%
                      </span>
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Cash Reserves: {Number(portfolioStats.netPortfolioNAV || 0) > 0 ? ((Number(cashBalance || 0) / Number(portfolioStats.netPortfolioNAV)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-500"
                        style={{ width: `${Number(portfolioStats.netPortfolioNAV || 0) > 0 ? ((Number(portfolioStats.totalStockValue || 0) / Number(portfolioStats.netPortfolioNAV)) * 100) : 0}%` }}
                      />
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Number(portfolioStats.netPortfolioNAV || 0) > 0 ? ((Number(cashBalance || 0) / Number(portfolioStats.netPortfolioNAV)) * 100) : 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100 dark:divide-gray-800 pt-2">
                    <div className="flex justify-between py-2.5">
                      <span className="text-gray-400 font-sans">Cash Drag Proportion</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {Number(portfolioStats.netPortfolioNAV || 0) > 0 ? ((Number(cashBalance || 0) / Number(portfolioStats.netPortfolioNAV)) * 100).toFixed(1) : '0.0'}%
                      </span>
                    </div>

                    <div className="flex justify-between py-2.5">
                      <span className="text-gray-400 font-sans">Equity Exposure</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{Number(portfolioStats.totalStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </span>
                    </div>

                    <div className="flex justify-between py-2.5">
                      <span className="text-gray-400 font-sans">Simulated Turnover Velocity</span>
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        {transactions.length > 0 ? `${(transactions.length * 2.5).toFixed(0)}% annually` : '0.0%'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl space-y-1 font-sans">
                    <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span>Quantitative Capital Allocation Directive</span>
                    </h4>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300/90 leading-relaxed">
                      High cash buffers mitigate downside volatility during market corrections, but excess unallocated liquidity slows long-term capital compounding. Institutional equity desks typically target 70–85% active equity allocation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
    </fieldset>
    </>
  );
}
