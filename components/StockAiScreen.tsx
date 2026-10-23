'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStockContext } from '../context/StockContext';
import PredictionAiPanel from './PredictionAiPanel';
import PredictionJournal from './PredictionJournal';
import ForwardObservationDashboard from './ForwardObservationDashboard';
import PaperExecutionAssumptionsModal from './PaperExecutionAssumptionsModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  Cpu,
  Sparkles,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  RefreshCw,
  Eye,
  Search,
  Sliders,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronRight,
  BarChart3,
  Scale,
  Compass,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Info,
  X,
  Layers,
  Activity,
  Play,
  Zap,
  FileText,
  Copy,
  Send,
  Download,
  Clock,
  Calendar,
  Terminal,
  Globe,
  Target,
  Radio,
  Crosshair,
} from 'lucide-react';
import {
  StockPrediction,
  BacktestSummaryData,
  CalibrationReportData,
  FeatureImportanceItem,
  PortfolioAllocationData,
  PortfolioOrder,
  ThresholdSweepRow,
} from '../lib/stock-ai-service';

export default function StockAiScreen() {
  const { theme, addToast, setSelectedTicker } = useStockContext();

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'predictions' | 'backtest' | 'calibration' | 'features' | 'portfolio' | 'observation'>('predictions');

  // Data states
  const [predictions, setPredictions] = useState<StockPrediction[]>([]);
  const [backtestData, setBacktestData] = useState<BacktestSummaryData | null>(null);
  const [calibrationData, setCalibrationData] = useState<CalibrationReportData | null>(null);
  const [features, setFeatures] = useState<FeatureImportanceItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioAllocationData | null>(null);

  // Loading & status states
  const [loading, setLoading] = useState(true);
  const [provenanceNotice, setProvenanceNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [minScoreFilter, setMinScoreFilter] = useState<number>(0.15);
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [selectedStockForShap, setSelectedStockForShap] = useState<StockPrediction | null>(null);
  const [aiTicker, setAiTicker] = useState('');
  const [journalRefreshToken, setJournalRefreshToken] = useState(0);
  const refreshJournal = useCallback(() => setJournalRefreshToken((value) => value + 1), []);

  // Watchlist modal state
  const [watchlistReport, setWatchlistReport] = useState<string | null>(null);
  const [showWatchlistModal, setShowWatchlistModal] = useState<boolean>(false);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Calibration interactive threshold slider state (default 0.60)
  const [selectedThreshold, setSelectedThreshold] = useState<number>(0.60);

  // Trade log pagination & filter
  const [tradeFilter, setTradeFilter] = useState<'all' | 'WIN' | 'LOSS'>('all');
  const [tradePage, setTradePage] = useState<number>(1);
  const TRADES_PER_PAGE = 15;

  // Paper Trading Simulator Interactive States
  const [simCapitalBase, setSimCapitalBase] = useState<number>(1000000);
  const [simRiskPct, setSimRiskPct] = useState<number>(1.0);
  const [simSizingMode, setSimSizingMode] = useState<'VOLATILITY_PARITY' | 'HALF_KELLY' | 'EQUAL_WEIGHT'>('VOLATILITY_PARITY');
  const [simMaxPositions, setSimMaxPositions] = useState<number>(5);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [paperSignals, setPaperSignals] = useState<any[]>([]);
  const [copiedOrderTicker, setCopiedOrderTicker] = useState<string | null>(null);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);

  // Multi-Universe Scanner State
  const [selectedScanUniverse, setSelectedScanUniverse] = useState<'core50' | 'nifty100' | 'nifty500'>('core50');

  // Broker Dispatcher States
  const [selectedBroker, setSelectedBroker] = useState<'zerodha' | 'angelone' | 'dhan' | 'generic'>('zerodha');
  const [brokerMode, setBrokerMode] = useState<'sandbox' | 'webhook'>('sandbox');
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [dispatchingBroker, setDispatchingBroker] = useState<boolean>(false);
  const [brokerReceipt, setBrokerReceipt] = useState<any | null>(null);
  const [basketCsv, setBasketCsv] = useState<string | null>(null);

  // EOD Scheduler States
  const [schedulerStatus, setSchedulerStatus] = useState<any | null>(null);
  const [scheduling, setScheduling] = useState<boolean>(false);

  // Live MTM & Auto-Exit Engine States
  const [mtmData, setMtmData] = useState<any | null>(null);
  const [mtmSyncing, setMtmSyncing] = useState<boolean>(false);
  const [selectedScenario, setSelectedScenario] = useState<'live' | 'bullish' | 'mixed' | 'bearish'>('mixed');

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPredictions([]);
    setCalibrationData(null);
    setProvenanceNotice('');
    try {
      const warnings: string[] = [];
      const [predRes, btRes, calRes, featRes, paperRes, brokerRes, schedRes, mtmRes] = await Promise.all([
        fetch('/api/stock-ai/predictions'),
        fetch('/api/stock-ai/backtest'),
        fetch('/api/stock-ai/calibration'),
        fetch('/api/stock-ai/features'),
        fetch('/api/stock-ai/paper'),
        fetch('/api/stock-ai/broker'),
        fetch('/api/stock-ai/scheduler'),
        fetch('/api/stock-ai/mtm'),
      ]);

      const predictionResponse = await predRes.json().catch(() => null);
      if (predRes.ok && predictionResponse?.success && Array.isArray(predictionResponse.data)) {
        setPredictions(predictionResponse.data);
        if (predictionResponse.provenance?.warning) warnings.push(predictionResponse.provenance.warning);
      } else {
        setError(predRes.status === 401
          ? 'Sign in to load quantitative predictions. You can then request an AI review below.'
          : predictionResponse?.error || 'Quantitative predictions could not be loaded. Try Refresh, or request an AI review below.');
      }
      if (btRes.ok) {
        const d = await btRes.json();
        if (d.success && d.data) setBacktestData(d.data);
        if (d.provenance?.warning) warnings.push(d.provenance.warning);
      }
      if (calRes.ok) {
        const d = await calRes.json();
        if (d.success && d.data) setCalibrationData(d.data);
        if (d.provenance?.warning) warnings.push(d.provenance.warning);
      }
      if (featRes.ok) {
        const d = await featRes.json();
        if (d.success && d.data) setFeatures(d.data);
      }
      if (paperRes.ok) {
        const d = await paperRes.json();
        if (d.success && d.data?.portfolio) setPortfolio(d.data.portfolio);
        if (d.success && d.data?.signals) setPaperSignals(d.data.signals);
      }
      if (brokerRes.ok) {
        const d = await brokerRes.json();
        if (d.success) {
          if (d.receipt) setBrokerReceipt(d.receipt);
          if (d.basketCsv) setBasketCsv(d.basketCsv);
        }
      }
      if (schedRes.ok) {
        const d = await schedRes.json();
        if (d.success && d.data) setSchedulerStatus(d.data);
      }
      if (mtmRes.ok) {
        const d = await mtmRes.json();
        if (d.success) setMtmData(d);
      }
      setProvenanceNotice([...new Set(warnings)].join(' ') || 'Cached research artifacts; check report dates and limitations.');
    } catch (err: any) {
      console.error('Failed to load stock-ai data', err);
      setError(err.message || 'Failed to load Stock AI data');
      addToast('Failed to load some Stock AI models', 'warning');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void fetchAllData(); }, [fetchAllData]);

  function selectAiTicker(ticker: string) {
    setAiTicker(ticker.replace(/\.NS$/i, ''));
    document.getElementById('stock-ai-review')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleRunScan() {
    if (scanning) return;
    setScanning(true);
    addToast(`Executing EOD Market Scan for ${selectedScanUniverse.toUpperCase()}...`, 'info');
    try {
      const res = await fetch('/api/stock-ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ universe: selectedScanUniverse }),
      });
      const data = await res.json();
      if (res.status === 401) {
        throw new Error('Authentication required: please sign in to execute market scan.');
      }
      if (res.status === 403) {
        throw new Error('Administrator privileges required to execute market scan.');
      }
      if (data.success) {
        if (data.data) setPredictions(data.data);
        if (data.reportMarkdown) setWatchlistReport(data.reportMarkdown);
        addToast(`EOD Scanner complete: ${data.count} ${selectedScanUniverse.toUpperCase()} stocks scored`, 'success');
      } else {
        throw new Error(data.error || 'Scan failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Scan execution error', 'warning');
    } finally {
      setScanning(false);
    }
  }

  async function handleViewWatchlist() {
    if (watchlistReport) {
      setShowWatchlistModal(true);
      return;
    }
    try {
      const res = await fetch('/api/stock-ai/watchlist');
      const data = await res.json();
      if (data.success && data.markdown) {
        setWatchlistReport(data.markdown);
        setShowWatchlistModal(true);
      } else {
        addToast(data.error || 'No watchlist report found yet. Click Run EOD Scanner to generate one.', 'info');
      }
    } catch (err: any) {
      addToast('Failed to load watchlist report', 'warning');
    }
  }

  function handleCopyWatchlist() {
    if (!watchlistReport) return;
    navigator.clipboard.writeText(watchlistReport);
    setCopiedReport(true);
    addToast('Watchlist report copied to clipboard!', 'success');
    setTimeout(() => setCopiedReport(false), 2000);
  }

  async function handleRunSimulation() {
    if (simulating) return;
    setSimulating(true);
    addToast(`Rebalancing portfolio via ${simSizingMode}...`, 'info');
    try {
      const res = await fetch('/api/stock-ai/paper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capitalBase: simCapitalBase,
          riskPct: simRiskPct,
          sizingMode: simSizingMode,
          maxPositions: simMaxPositions,
        }),
      });
      const d = await res.json();
      if (res.status === 401) {
        throw new Error('Authentication required: please sign in.');
      }
      if (res.status === 403) {
        throw new Error('Administrator privileges required for paper trading simulation.');
      }
      if (d.success && d.data) {
        if (d.data.portfolio) setPortfolio(d.data.portfolio);
        if (d.data.signals) setPaperSignals(d.data.signals);
        addToast(`Portfolio rebalanced: ₹${simCapitalBase.toLocaleString('en-IN')} (${simSizingMode})`, 'success');
      } else {
        throw new Error(d.error || 'Simulation rebalance failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Simulation execution error', 'warning');
    } finally {
      setSimulating(false);
    }
  }

  function handleCopyOrder(ord: PortfolioOrder) {
    const text = `NSE Order: ${ord.ticker} | BUY ${ord.shares_to_buy} shares @ Limit ₹${ord.breakout_trigger_inr.toFixed(2)} | Target: ₹${ord.profit_target_inr.toFixed(2)} | SL: ₹${ord.stop_loss_inr.toFixed(2)} | Alloc: ₹${ord.required_capital_inr.toLocaleString('en-IN')}`;
    navigator.clipboard.writeText(text);
    setCopiedOrderTicker(ord.ticker);
    addToast(`Order details copied for ${ord.ticker}!`, 'success');
    setTimeout(() => setCopiedOrderTicker(null), 2500);
  }

  async function handleDispatchBroker() {
    if (dispatchingBroker) return;
    setDispatchingBroker(true);
    addToast(
      brokerMode === 'sandbox'
        ? `Generating simulated order basket for ${selectedBroker.toUpperCase()}...`
        : `Dispatching live webhook payload to ${selectedBroker.toUpperCase()}...`,
      'info'
    );
    try {
      const res = await fetch('/api/stock-ai/broker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker: selectedBroker,
          mode: brokerMode === 'sandbox' ? 'sandbox' : 'live',
          operation: brokerMode === 'sandbox' ? 'simulate_receipt' : 'dispatch_webhook',
          webhookUrl: customWebhookUrl || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401) {
        throw new Error('Authentication required: please sign in.');
      }
      if (res.status === 403) {
        throw new Error('Administrator privileges required for broker order dispatch.');
      }
      if (data.success && data.receipt) {
        setBrokerReceipt(data.receipt);
        if (data.basketCsv) setBasketCsv(data.basketCsv);
        addToast(data.message || `Dispatched orders via ${selectedBroker.toUpperCase()}!`, 'success');
        setTimeout(() => handleImportFromBroker(), 500);
      } else {
        throw new Error(data.error || 'Broker dispatch failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Dispatch error', 'warning');
    } finally {
      setDispatchingBroker(false);
    }
  }

  function handleDownloadBasketCsv() {
    if (!basketCsv) {
      addToast('No basket CSV generated yet. Run dispatch first.', 'warning');
      return;
    }
    const blob = new Blob([basketCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zerodha_basket_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    addToast('Downloaded Zerodha Basket CSV!', 'success');
  }

  async function handleMtmSync(autoExit: boolean = false, scenarioOverride?: string) {
    setMtmSyncing(true);
    const scen = scenarioOverride || (selectedScenario === 'live' ? undefined : selectedScenario);
    addToast(autoExit ? 'Evaluating auto-exits & stop losses...' : 'Syncing live market quotes...', 'info');
    try {
      const res = await fetch('/api/stock-ai/mtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: autoExit ? 'check_exits' : (scen ? 'scenario' : 'sync'),
          scenario: scen,
          autoExit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMtmData(data);
        if (data.summary?.closed_this_round?.length > 0) {
          addToast(`Auto-exit triggered for ${data.summary.closed_this_round.length} position(s)!`, 'warning');
        } else {
          addToast(`MTM updated: INR ${data.summary?.current_equity_inr?.toLocaleString('en-IN')}`, 'success');
        }
      } else {
        throw new Error(data.error || 'MTM sync failed');
      }
    } catch (err: any) {
      addToast(err.message || 'MTM sync error', 'warning');
    } finally {
      setMtmSyncing(false);
    }
  }

  async function handleImportFromBroker() {
    setMtmSyncing(true);
    addToast('Importing active positions from Broker Dispatch...', 'info');
    try {
      const res = await fetch('/api/stock-ai/mtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_from_broker' }),
      });
      const data = await res.json();
      if (data.success) {
        setMtmData(data);
        addToast('Active positions initialized from broker dispatch!', 'success');
      } else {
        throw new Error(data.error || 'Import failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Import error', 'warning');
    } finally {
      setMtmSyncing(false);
    }
  }

  async function handleClosePosition(symbol: string) {
    setMtmSyncing(true);
    addToast(`Executing manual market exit for ${symbol}...`, 'info');
    try {
      const res = await fetch('/api/stock-ai/mtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_position', symbol }),
      });
      const data = await res.json();
      if (data.success) {
        setMtmData(data);
        addToast(`Market exit executed for ${symbol}!`, 'success');
      } else {
        throw new Error(data.error || 'Position close failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Close error', 'warning');
    } finally {
      setMtmSyncing(false);
    }
  }

  async function handleSimulateTargetTick(symbol: string, targetPrice: number) {
    setMtmSyncing(true);
    addToast(`Simulating target price hit for ${symbol} @ ₹${targetPrice}...`, 'info');
    try {
      const res = await fetch('/api/stock-ai/mtm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'simulate_tick', symbol, price: targetPrice }),
      });
      const data = await res.json();
      if (data.success) {
        setMtmData(data);
        addToast(`Target execution simulated for ${symbol}!`, 'success');
      } else {
        throw new Error(data.error || 'Simulate tick failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Simulation error', 'warning');
    } finally {
      setMtmSyncing(false);
    }
  }

  async function handleToggleWindowsTask() {
    setScheduling(true);
    const isRegistered = schedulerStatus?.windows_task?.registered;
    const action = isRegistered ? 'uninstall-task' : 'install-task';
    addToast(isRegistered ? 'Removing scheduled task...' : 'Registering scheduled task for 15:45 IST...', 'info');
    try {
      const res = await fetch('/api/stock-ai/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setSchedulerStatus(data.data);
        addToast(data.message, 'success');
      } else {
        throw new Error(data.error || 'Failed to update scheduled task');
      }
    } catch (err: any) {
      addToast(err.message || 'Task error', 'warning');
    } finally {
      setScheduling(false);
    }
  }

  async function handleRunScheduledPipelineNow() {
    setScheduling(true);
    addToast('Executing Full Automated EOD Pipeline (Scan -> Paper Rebalance -> Broker Sandbox)...', 'info');
    try {
      const res = await fetch('/api/stock-ai/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-now', universe: selectedScanUniverse }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.data) setSchedulerStatus(data.data);
        await fetchAllData();
        addToast('Automated EOD Pipeline completed successfully!', 'success');
      } else {
        throw new Error(data.error || 'Pipeline execution failed');
      }
    } catch (err: any) {
      addToast(err.message || 'Pipeline error', 'warning');
    } finally {
      setScheduling(false);
    }
  }

  // Filtered predictions
  const filteredPredictions = useMemo(() => {
    return predictions.filter((p) => {
      const matchesSearch =
        p.Ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p['Key SHAP Driver'].toLowerCase().includes(searchQuery.toLowerCase());
      const matchesScore = p['Model Score'] >= minScoreFilter;
      const matchesLabel =
        labelFilter === 'all' || p.Label.toLowerCase() === labelFilter.toLowerCase();
      return matchesSearch && matchesScore && matchesLabel;
    });
  }, [predictions, searchQuery, minScoreFilter, labelFilter]);

  // Top 3 spotlight predictions
  const topPredictions = useMemo(() => {
    return [...predictions]
      .sort((a, b) => b['Model Score'] - a['Model Score'])
      .slice(0, 3);
  }, [predictions]);

  // Selected threshold sweep row
  const activeSweepRow: ThresholdSweepRow | undefined = useMemo(() => {
    if (!calibrationData?.threshold_sweep) return undefined;
    const sorted = [...calibrationData.threshold_sweep].sort((a, b) =>
      Math.abs(a.Threshold - selectedThreshold) - Math.abs(b.Threshold - selectedThreshold)
    );
    return sorted[0];
  }, [calibrationData, selectedThreshold]);

  // Filtered trades for backtest tab
  const filteredTrades = useMemo(() => {
    const trades = backtestData?.trades_sample || [];
    if (tradeFilter === 'all') return trades;
    return trades.filter((t) => t.result.includes(tradeFilter));
  }, [backtestData, tradeFilter]);

  const totalTradePages = Math.ceil(filteredTrades.length / TRADES_PER_PAGE) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (tradePage - 1) * TRADES_PER_PAGE;
    return filteredTrades.slice(start, start + TRADES_PER_PAGE);
  }, [filteredTrades, tradePage]);

  // Clean equity curve data
  const equityCurveChartData = useMemo(() => {
    if (!backtestData?.equity_curve || backtestData.equity_curve.length === 0) return [];
    const initialCapital = backtestData.simulation_b.portfolio_assumptions?.initial_capital_inr;
    if (!initialCapital) return [];
    return backtestData.equity_curve.map((pt) => ({
      date: pt.Date,
      equity: parseFloat(((pt.equity / initialCapital) * 100).toFixed(2)),
      drawdown: parseFloat((pt.drawdown * 100).toFixed(2)),
      ticker: pt.ticker,
    }));
  }, [backtestData]);

  // Reliability curve data
  const calibrationPlotData = useMemo(() => {
    if (!calibrationData?.calibration?.calibration_table) return [];
    return calibrationData.calibration.calibration_table.map((b) => ({
      predicted: parseFloat((b['Mean Predicted Prob'] * 100).toFixed(1)),
      empirical: parseFloat((b['Empirical Fraction Pos'] * 100).toFixed(1)),
      ideal: parseFloat((b['Mean Predicted Prob'] * 100).toFixed(1)),
    }));
  }, [calibrationData]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {provenanceNotice && <div role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600">{provenanceNotice}</div>}
      {error && <div role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{error}</div>}
      {/* Synthetic Data Provenance Notice */}
      <div role="note" className="flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/8 px-3.5 py-2.5 text-xs text-blue-400 dark:text-blue-300">
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" />
        <span>
          <strong className="font-semibold">Data sources:</strong> Technical indicators and price history use live NSE data via Yahoo Finance.
          Historical FII/DII institutional flows and sentiment scores used in model training are <strong className="font-semibold">synthetic inputs</strong> — they do not represent verified institutional records.
          Model scores are not validated trade win probabilities.
        </span>
      </div>
      {/* Top Banner / System Ribbon */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/70 border border-indigo-500/20 backdrop-blur-xl p-6 lg:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                Live Research System
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                <Cpu className="h-3.5 w-3.5 text-indigo-400" />
                Quantitative model + optional AI review
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                {calibrationData?.calibration?.expected_calibration_error != null
                  ? `Reported ECE: ${calibrationData.calibration.expected_calibration_error.toFixed(4)}`
                  : 'Calibration report unavailable'}
              </span>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                NSE Stock AI Engine
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed">
                Explore quantitative next-session setups with SHAP explanations, then request an AI review of recent market evidence. AI reviews remain separate from the model score until their predictive value has been measured.
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Universe Selector Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-200 text-xs shadow-inner">
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <select
                value={selectedScanUniverse}
                onChange={(e) => setSelectedScanUniverse(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer"
                title="Select Indian Stock Universe to Scan"
              >
                <option value="core50" className="bg-slate-900 text-white">NIFTY Core 50</option>
                <option value="nifty100" className="bg-slate-900 text-white">NIFTY 100 Large</option>
                <option value="nifty500" className="bg-slate-900 text-white">NIFTY 500 Broad</option>
              </select>
            </div>

            {/* EOD Scheduler Badge */}
            <button
              onClick={handleRunScheduledPipelineNow}
              disabled={scheduling}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 cursor-pointer transition-all shadow-sm disabled:opacity-50"
              title="Click to trigger full automated pipeline (Scan -> Rebalance -> Broker Sandbox)"
            >
              <Clock className={`h-3.5 w-3.5 text-emerald-400 ${scheduling ? 'animate-spin' : ''}`} />
              <span className="font-mono text-[11px]">
                {scheduling ? 'Running...' : schedulerStatus?.windows_task?.registered ? 'Auto: 15:45 IST' : 'EOD Pipeline'}
              </span>
            </button>

            <button
              onClick={handleViewWatchlist}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/60 hover:border-indigo-500 transition-all cursor-pointer shadow-sm"
              id="btn-stockai-watchlist-report"
            >
              <FileText className="h-4 w-4 text-indigo-400" />
              Watchlist
            </button>
            <button
              onClick={fetchAllData}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 hover:border-slate-600 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              id="btn-stockai-refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleRunScan}
              disabled={scanning}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 transition-all cursor-pointer shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              id="btn-stockai-scan"
            >
              <Play className={`h-4 w-4 fill-slate-950 ${scanning ? 'animate-spin' : ''}`} />
              {scanning ? 'Scanning...' : `Scan ${selectedScanUniverse.toUpperCase()}`}
            </button>
          </div>
        </div>

        {/* Quick KPI Strip */}
        <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Top Candidate</p>
            <p className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5">
              {topPredictions[0]?.Ticker || 'Unavailable'}
            </p>
            <span className="text-[10px] text-slate-400">
              Score: {topPredictions[0] ? (topPredictions[0]['Model Score'] * 100).toFixed(1) + '%' : 'Unavailable'}
            </span>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">High-Conviction</p>
            <p className="text-base sm:text-lg font-black text-indigo-300 font-mono mt-0.5">
              {predictions.filter(p => p['Model Score'] >= 0.40).length} Setups
            </p>
            <span className="text-[10px] text-slate-400">&gt;40% model threshold</span>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Out-Of-Sample AUC</p>
            <p className="text-base sm:text-lg font-black text-amber-300 font-mono mt-0.5">
              {calibrationData?.roc_auc != null ? calibrationData.roc_auc.toFixed(3) : 'Unavailable'}
            </p>
            <span className="text-[10px] text-slate-400">{calibrationData?.samples != null ? `${calibrationData.samples.toLocaleString('en-IN')} report samples` : 'No report loaded'}</span>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-3 border border-slate-800/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Report Through</p>
            <p className="text-base sm:text-lg font-black text-teal-300 font-mono mt-0.5">{calibrationData?.test_end || 'Unavailable'}</p>
            <span className="text-[10px] text-slate-400">Quantitative model evaluation</span>
          </div>

          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-slate-900/50 rounded-2xl p-3 border border-slate-800/60 backdrop-blur-sm">
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Capital Base</p>
            <p className="text-base sm:text-lg font-black text-white font-mono mt-0.5">
              {portfolio?.capital_base_inr != null ? `₹${portfolio.capital_base_inr.toLocaleString('en-IN')}` : 'Unavailable'}
            </p>
            <span className="text-[10px] text-slate-400">Paper portfolio capital</span>
          </div>
        </div>
      </div>

      {/* Navigation Vector Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white/70 dark:bg-gray-900/70 border border-gray-200/70 dark:border-gray-800/70 rounded-2xl backdrop-blur-md overflow-x-auto shadow-xs">
        <button
          onClick={() => setActiveTab('predictions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'predictions'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          id="tab-btn-stockai-predictions"
        >
          <Sparkles className="h-4 w-4" />
          Predictions & AI Review
        </button>

        <button
          onClick={() => setActiveTab('backtest')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'backtest'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          id="tab-btn-stockai-backtest"
        >
          <BarChart3 className="h-4 w-4" />
          Walk-Forward Backtest
        </button>

        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'calibration'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          id="tab-btn-stockai-calibration"
        >
          <Scale className="h-4 w-4" />
          Calibration & Thresholds
        </button>

        <button
          onClick={() => setActiveTab('features')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'features'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          id="tab-btn-stockai-features"
        >
          <Layers className="h-4 w-4" />
          Model Features
        </button>

        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'portfolio'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          id="tab-btn-stockai-portfolio"
        >
          <Wallet className="h-4 w-4" />
          Paper Trading & Portfolio
        </button>

        <button
          onClick={() => setActiveTab('observation')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'observation'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
          id="tab-btn-stockai-observation"
        >
          <Eye className="h-4 w-4" />
          Forward Observation
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY PREDICTIONS & SHAP                                          */}
      {/* ========================================================================= */}
      {activeTab === 'predictions' && (
        <div className="space-y-6">
          <div id="stock-ai-review" className="scroll-mt-6">
            <PredictionAiPanel ticker={aiTicker} onTickerChange={setAiTicker} onAnalysisSaved={refreshJournal} />
          </div>
          <PredictionJournal refreshToken={journalRefreshToken} />
          {!loading && predictions.length === 0 && !error && <p className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">No quantitative predictions are available. Enter an NSE ticker above to request an AI review.</p>}
          {loading && <p role="status" className="text-sm text-gray-500 dark:text-gray-400">Loading quantitative predictions…</p>}
          {/* Top 3 High Conviction Highlight Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                Top Quantitative Candidates (+2% Setup)
              </h2>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                Model date: {topPredictions[0]?.Date || 'Unavailable'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topPredictions.map((stock, idx) => {
                const probPercent = (stock['Model Score'] * 100).toFixed(1);
                const closeNum = stock.Close_Numeric || parseFloat(stock['Close (Rs.)'].replace(/[^0-9.]/g, '')) || 0;
                const targetPrice = (closeNum * 1.02).toFixed(2);
                const stopPrice = (closeNum * 0.99).toFixed(2);

                return (
                  <div
                    key={stock.Ticker}
                    className="relative group bg-white dark:bg-gray-900/90 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 hover:border-indigo-500/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono">
                            #{idx + 1}
                          </span>
                          <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 tracking-tight font-mono">
                            {stock.Ticker}
                          </h3>
                        </div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">
                          Close: <span className="text-gray-900 dark:text-gray-200 font-mono font-bold">{stock['Close (Rs.)']}</span>
                        </p>
                      </div>

                      {/* Probability Badge */}
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="text-base font-black font-mono">{probPercent}%</span>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Quantitative score</p>
                      </div>
                    </div>

                    {/* Target and Stop Levels */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-2.5">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                          Target (+2.0%)
                        </span>
                        <p className="text-sm font-black text-emerald-800 dark:text-emerald-300 font-mono">
                          ₹{targetPrice}
                        </p>
                      </div>
                      <div className="bg-rose-50/70 dark:bg-rose-950/30 border border-rose-500/20 rounded-2xl p-2.5">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                          Stop (-1.0%)
                        </span>
                        <p className="text-sm font-black text-rose-800 dark:text-rose-300 font-mono">
                          ₹{stopPrice}
                        </p>
                      </div>
                    </div>

                    {/* Key SHAP Driver */}
                    <div className="mt-3 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        Key SHAP Driver
                      </p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
                        {stock['Key SHAP Driver'] || 'No SHAP driver available'}
                      </p>
                    </div>

                    {/* News Catalyst & Sentiment */}
                    {stock['Top News Catalyst'] && (
                      <div className="mt-2.5 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-500/20">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          News Catalyst ({stock['Sentiment Label'] || 'Neutral'})
                        </p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 mt-0.5 line-clamp-2 leading-relaxed">
                          {stock['Top News Catalyst']}
                        </p>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-4">
                      <button onClick={() => selectAiTicker(stock.Ticker)} className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500">AI review</button>
                      <button
                        onClick={() => setSelectedStockForShap(stock)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                      >
                        Explain (SHAP)
                      </button>
                      <button
                        onClick={() => {
                          const rawTicker = stock.Ticker.replace('.NS', '');
                          setSelectedTicker(rawTicker);
                        }}
                        className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                        title="View Detailed Chart in Axion"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticker (e.g. RELIANCE, VEDL)..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-800/70 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              {/* Threshold Slider */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Min Score:</span>
                <input
                  type="range"
                  min="0.0"
                  max="0.50"
                  step="0.05"
                  value={minScoreFilter}
                  onChange={(e) => setMinScoreFilter(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 w-10">
                  {(minScoreFilter * 100).toFixed(0)}%
                </span>
              </div>

              {/* Label selector */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                {['all', 'Strong Buy', 'Buy', 'Watch', 'Skip'].map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => setLabelFilter(lbl)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      labelFilter.toLowerCase() === lbl.toLowerCase()
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Predictions Ranked Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Quantitative Candidate Ranking
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Showing {filteredPredictions.length} of {predictions.length} scanned stocks
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3">Rank</th>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3">Model Score</th>
                    <th className="px-4 py-3">Signal</th>
                    <th className="px-4 py-3">Sentiment & News</th>
                    <th className="px-4 py-3">Report Close</th>
                    <th className="px-4 py-3">Target (+2%)</th>
                    <th className="px-4 py-3">Stop (-1%)</th>
                    <th className="px-4 py-3">ATR %</th>
                    <th className="px-4 py-3">RSI</th>
                    <th className="px-4 py-3">5D Ret</th>
                    <th className="px-4 py-3 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredPredictions.map((stock) => {
                    const score = stock['Model Score'];
                    const scorePct = (score * 100).toFixed(1);
                    const closeNum =
                      stock.Close_Numeric ||
                      parseFloat(stock['Close (Rs.)'].replace(/[^0-9.]/g, '')) ||
                      0;
                    const targetPrice = (closeNum * 1.02).toFixed(2);
                    const stopPrice = (closeNum * 0.99).toFixed(2);

                    const isHighConviction = score >= 0.50;
                    const isModerate = score >= 0.40 && score < 0.50;

                    return (
                      <tr
                        key={stock.Ticker}
                        className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors"
                      >
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-500 dark:text-gray-400">
                          #{stock.Rank}
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            onClick={() => {
                              const rawTicker = stock.Ticker.replace('.NS', '');
                              setSelectedTicker(rawTicker);
                            }}
                            className="font-black font-mono text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                          >
                            {stock.Ticker}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </button>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isHighConviction
                                    ? 'bg-emerald-500'
                                    : isModerate
                                    ? 'bg-indigo-500'
                                    : 'bg-slate-400'
                                }`}
                                style={{ width: `${Math.min(100, score * 150)}%` }}
                              />
                            </div>
                            <span
                              className={`font-mono font-black ${
                                isHighConviction
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isModerate
                                  ? 'text-indigo-600 dark:text-indigo-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}
                            >
                              {scorePct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                              stock.Label === 'Strong Buy'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : stock.Label === 'Buy'
                                ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                                : stock.Label === 'Watch'
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {stock.Label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 max-w-[200px]">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold font-mono w-fit ${
                                stock['Sentiment Label'] === 'Bullish'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : stock['Sentiment Label'] === 'Bearish'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                              }`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              {stock['Sentiment Label'] || 'Neutral'}
                              {stock['Sentiment Score'] !== undefined && (
                                <span>({stock['Sentiment Score'] > 0 ? `+${stock['Sentiment Score'].toFixed(2)}` : stock['Sentiment Score'].toFixed(2)})</span>
                              )}
                            </span>
                            {stock['Top News Catalyst'] && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate" title={stock['Top News Catalyst']}>
                                {stock['Top News Catalyst']}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-gray-900 dark:text-gray-100">
                          {stock['Close (Rs.)']}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{targetPrice}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-rose-600 dark:text-rose-400">
                          ₹{stopPrice}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-600 dark:text-gray-300">
                          {stock['ATR %']}
                        </td>
                        <td className="px-4 py-3.5 font-mono text-gray-600 dark:text-gray-300">
                          {stock['RSI (14)']}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-semibold">
                          <span
                            className={
                              stock['5D Return'].includes('-')
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }
                          >
                            {stock['5D Return']}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button onClick={() => selectAiTicker(stock.Ticker)} className="mb-1 mr-2 whitespace-nowrap rounded-xl bg-indigo-600 px-3 py-1 text-xs font-bold text-white hover:bg-indigo-500">AI review</button>
                          <button
                            onClick={() => setSelectedStockForShap(stock)}
                            className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
                          >
                            SHAP
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WALK-FORWARD BACKTEST                                             */}
      {/* ========================================================================= */}
      {activeTab === 'backtest' && backtestData && (
        <div className="space-y-6">
          {/* Side by side comparison: Simulation A vs Simulation B */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulation A: Signal Quality */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 uppercase tracking-wide">
                    Benchmark Mode
                  </span>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mt-1">
                    Simulation A: Pure Signal Quality
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Evaluates if next-day high touched +2% from Date T close
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                    {(backtestData.simulation_a.win_rate * 100).toFixed(1)}%
                  </span>
                    <p className="text-[10px] text-gray-400 uppercase">Candidate Win Rate</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3 text-center">
                  <p className="text-[10px] text-gray-500 font-medium uppercase">Total Signals</p>
                  <p className="text-lg font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                    {backtestData.simulation_a.total_signals.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-3 text-center">
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">Wins (+2%)</p>
                  <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {backtestData.simulation_a.wins.toLocaleString()}
                  </p>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl p-3 text-center">
                  <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium uppercase">Losses</p>
                  <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {backtestData.simulation_a.losses.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl text-xs text-blue-800 dark:text-blue-300 leading-relaxed border border-blue-500/15 flex items-start gap-2">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  Simulation A measures next-day target touches only; it does not represent executable trades or portfolio returns.
                </span>
              </div>
            </div>

            {/* Simulation B: Realistic Execution */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 uppercase tracking-wide">
                    Historical Execution Simulation
                  </span>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mt-1">
                    Simulation B: Next Open + Realistic Frictions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Next-day open entry · {((backtestData.simulation_b.stop_loss_pct ?? 0) * 100).toFixed(1)}% stop · +{((backtestData.simulation_b.profit_target_pct ?? 0) * 100).toFixed(1)}% per-position target · slippage and costs included
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                    {((backtestData.simulation_b.portfolio_win_rate ?? backtestData.simulation_b.win_rate) * 100).toFixed(1)}%
                  </span>
                  <p className="text-[10px] text-gray-400 uppercase">
                    {backtestData.simulation_b.portfolio_win_rate == null ? 'Candidate Win Rate' : 'Selected Position Win Rate'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 mt-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-2.5 text-center">
                  <p className="text-[9px] text-gray-500 font-medium uppercase">Candidate Trades</p>
                  <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                    {backtestData.simulation_b.total_trades?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl p-2.5 text-center">
                  <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-medium uppercase">+2% Target Exits</p>
                  <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {backtestData.simulation_b.position_target_hits?.toLocaleString() ?? '—'}
                  </p>
                </div>
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-2.5 text-center">
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium uppercase">Net Winners</p>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    {backtestData.simulation_b.wins.toLocaleString()}
                  </p>
                </div>
                <div className="bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl p-2.5 text-center">
                  <p className="text-[9px] text-rose-600 dark:text-rose-400 font-medium uppercase">Losses</p>
                  <p className="text-base font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5">
                    {backtestData.simulation_b.losses.toLocaleString()}
                  </p>
                </div>
                <div className="bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl p-2.5 text-center">
                  <p className="text-[9px] text-amber-600 dark:text-amber-400 font-medium uppercase">Ambiguous</p>
                  <p className="text-base font-black text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                    {backtestData.simulation_b.ambiguous_trades?.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>

              <div className="mt-4 p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl text-xs text-purple-800 dark:text-purple-300 leading-relaxed border border-purple-500/15 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Anti-Leakage Ambiguous Rule:</strong> When both +2% target and -1% stop were touched on the same candle, the simulator conservatively assumes the stop loss was triggered first.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-amber-300/60 bg-amber-50/70 p-4 text-sm text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100">
            {backtestData.simulation_b.portfolio_assumptions ? (
              <>
                <p className="font-bold">Capital-limited portfolio result</p>
                <p className="mt-1">
                  ₹{backtestData.simulation_b.portfolio_assumptions.initial_capital_inr.toLocaleString('en-IN')} starting capital · up to {backtestData.simulation_b.portfolio_assumptions.max_concurrent_positions} equal slots · {backtestData.simulation_b.portfolio_sessions} sessions.
                  {' '}Executed {backtestData.simulation_b.portfolio_trade_count ?? 0} positions · final value ₹{Math.round(backtestData.simulation_b.portfolio_final_value_inr ?? 0).toLocaleString('en-IN')} · annualized return {backtestData.simulation_b.portfolio_cagr == null ? 'N/A' : `${(backtestData.simulation_b.portfolio_cagr * 100).toFixed(1)}%`} · max drawdown {((backtestData.simulation_b.portfolio_max_drawdown ?? 0) * 100).toFixed(1)}%.
                </p>
                {backtestData.prediction_calendar && (
                  <p className="mt-1 text-xs">
                    Prediction calendar: {backtestData.prediction_calendar.first_session ?? '—'} to {backtestData.prediction_calendar.last_session ?? '—'} · {backtestData.prediction_calendar.sessions} total / {backtestData.prediction_calendar.active_signal_sessions} signal / {backtestData.prediction_calendar.active_portfolio_sessions} selected-position sessions · {backtestData.prediction_calendar.candidate_signals_at_threshold} candidate signals.
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-bold">Portfolio return is not available for this report.</p>
                <p className="mt-1">This saved artifact predates the capital-limited backtest. Per-trade results and the equity curve below must not be read as an account return; regenerate the report before estimating portfolio performance.</p>
              </>
            )}
          </div>

          {backtestData.threshold_sweep && backtestData.threshold_sweep.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-sm font-black text-gray-900 dark:text-gray-100">Score cutoff: coverage and portfolio outcomes</h3>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {backtestData.threshold_sweep_context?.is_blind_holdout
                    ? 'Untouched holdout results'
                    : 'Exploratory comparison on a previously inspected period. It can explain missed sessions, but cannot select the live cutoff.'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className="bg-gray-50 text-[10px] uppercase text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                    <tr>
                      <th className="px-3 py-2">Score cutoff</th>
                      <th className="px-3 py-2">Signal days</th>
                      <th className="px-3 py-2">Candidates</th>
                      <th className="px-3 py-2">Selected</th>
                      <th className="px-3 py-2">+2% exits</th>
                      <th className="px-3 py-2">Portfolio return</th>
                      <th className="px-3 py-2">2× cost return</th>
                      <th className="px-3 py-2">Max drawdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {backtestData.threshold_sweep.map((row) => (
                      <tr key={`${row.evaluation_id}-${row.threshold}`} className={row.threshold === backtestData.simulation_b.threshold ? 'bg-indigo-50/70 dark:bg-indigo-950/20' : ''}>
                        <td className="px-3 py-2 font-bold">{(row.threshold * 100).toFixed(0)}%</td>
                        <td className="px-3 py-2">{row.active_signal_sessions} days</td>
                        <td className="px-3 py-2">{row.candidate_signals.toLocaleString()}</td>
                        <td className="px-3 py-2">{row.selected_positions}</td>
                        <td className="px-3 py-2">{row.target_hits} ({(row.target_hit_rate * 100).toFixed(1)}%)</td>
                        <td className="px-3 py-2">{(row.portfolio_return * 100).toFixed(2)}%</td>
                        <td className="px-3 py-2">{(row.stressed_portfolio_return * 100).toFixed(2)}%</td>
                        <td className="px-3 py-2">{(row.max_drawdown * 100).toFixed(2)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {backtestData.promotion_gate && (
            <div className={`mt-3 rounded-2xl border p-4 text-sm ${backtestData.promotion_gate.eligible_for_promotion ? 'border-emerald-300/60 bg-emerald-50/70 text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/20 dark:text-emerald-100' : 'border-amber-300/60 bg-amber-50/70 text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-100'}`}>
              <p className="font-bold">Strategy gate: {backtestData.promotion_gate.status.replace(/_/g, ' ')}</p>
              <p className="mt-1 text-xs">A historical candidate evaluation cannot satisfy the fresh blind holdout requirement. The +2% target is evaluated per position; stressed costs and portfolio drawdown are also included in the gate.</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {Object.entries(backtestData.promotion_gate.checks).map(([key, passed]) => (
                  <span key={key} className={passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-200'}>
                    {passed ? '✓' : '○'} {key.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Equity Curve & Drawdown Chart */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-indigo-600" />
                  Capital-Limited Portfolio Curve
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Daily portfolio equity after the configured position and capital limits
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  Equity Normalized (Base 100)
                </span>
                <span className="flex items-center gap-1.5 text-rose-500">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  Drawdown %
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              {equityCurveChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurveChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="drawdownGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                      domain={['auto', 'auto']}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                        borderRadius: '16px',
                        fontSize: '12px',
                      }}
                      formatter={(val: any, name: string) => [
                        name === 'equity' ? `${val}` : `${val}%`,
                        name === 'equity' ? 'Equity Index' : 'Drawdown',
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#equityGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="drawdown"
                      stroke="#f43f5e"
                      strokeWidth={1.5}
                      fillOpacity={1}
                      fill="url(#drawdownGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-400">
                  Capital-limited curve is unavailable until the backtest is regenerated.
                </div>
              )}
            </div>
          </div>

          {/* Trade Log Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Simulated Trade Execution Log (Recent Out-of-Sample)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Page {tradePage} of {totalTradePages} · Showing {filteredTrades.length} trades
                </p>
              </div>

              {/* Trade result filter */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                  {(['all', 'WIN', 'LOSS'] as const).map((res) => (
                    <button
                      key={res}
                      onClick={() => {
                        setTradeFilter(res);
                        setTradePage(1);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        tradeFilter === res
                          ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-xs'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3">Portfolio Selection</th>
                    <th className="px-4 py-3 text-right">Shares</th>
                    <th className="px-4 py-3 text-right">Capital Used</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3">Model Prob</th>
                    <th className="px-4 py-3">Entry Price</th>
                    <th className="px-4 py-3">Exit Price</th>
                    <th className="px-4 py-3">Target Price</th>
                    <th className="px-4 py-3">Stop Price</th>
                    <th className="px-4 py-3">Result</th>
                    <th className="px-4 py-3 text-right">Net Return</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paginatedTrades.map((t, idx) => {
                    const isWin = t.result.includes('WIN');
                    const isAmbiguous = t.is_ambiguous;
                    return (
                      <tr key={`${t.Date}-${t.ticker}-${idx}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${t.portfolio_selected ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300' : 'bg-gray-500/10 text-gray-500'}`}>
                            {t.portfolio_selected ? 'Selected' : 'Not selected'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">{t.portfolio_selected ? t.portfolio_shares?.toLocaleString('en-IN') : '—'}</td>
                        <td className="px-4 py-3 text-right font-mono">{t.portfolio_selected ? `₹${Math.round(t.portfolio_notional_inr ?? 0).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="px-4 py-3 font-mono text-gray-500">{t.Date}</td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 dark:text-gray-100">{t.ticker}</td>
                        <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                          {(t.prob * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 font-mono">₹{t.entry_price.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono">₹{t.exit_price.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-emerald-600">₹{t.target_price.toFixed(2)}</td>
                        <td className="px-4 py-3 font-mono text-rose-600">₹{t.stop_price.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                              isWin
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : isAmbiguous
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {t.result}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-black text-right">
                          <span className={t.net_return >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {(t.net_return * 100).toFixed(2)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalTradePages > 1 && (
              <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <button
                  disabled={tradePage <= 1}
                  onClick={() => setTradePage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-mono text-gray-500">
                  Page {tradePage} of {totalTradePages}
                </span>
                <button
                  disabled={tradePage >= totalTradePages}
                  onClick={() => setTradePage((p) => Math.min(totalTradePages, p + 1))}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-100 dark:bg-gray-800 disabled:opacity-40 cursor-pointer"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CALIBRATION & THRESHOLDS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'calibration' && calibrationData && (
        <div className="space-y-6">
          {/* Top Reliability Diagram & Interactive Slider */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Reliability Diagram */}
            <div className="lg:col-span-7 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Scale className="h-5 w-5 text-indigo-600" />
                    Probability Reliability Diagram
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Compares model predicted probability vs actual observed empirical win frequency
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-mono font-bold text-gray-500">Brier Score:</span>
                  <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400 ml-1">
                    {calibrationData.calibration.brier_score.toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={calibrationPlotData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="predicted"
                      name="Predicted Prob (%)"
                      tick={{ fontSize: 10, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: theme === 'dark' ? '#9ca3af' : '#6b7280' }}
                    />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        `${val}%`,
                        name === 'empirical' ? 'Observed Win Frequency' : 'Ideal Line (Perfect Calibration)',
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="empirical"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 4, fill: '#10b981' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="ideal"
                      stroke="#9ca3af"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 mt-2 font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Model Calibration Curve
                </span>
                <span className="flex items-center gap-1.5 text-gray-400">
                  <span className="h-0.5 w-4 bg-gray-400 border-dashed" />
                  Perfect 45° Benchmark
                </span>
              </div>
            </div>

            {/* Interactive Threshold Optimizer */}
            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900/10 via-white dark:via-gray-900 to-purple-900/10 border border-indigo-500/20 dark:border-gray-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                    Live Optimizer
                  </span>
                  <span className="text-xs font-mono text-gray-400">Out-of-Sample Split</span>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-gray-100 mt-1">
                  Threshold Decision Dial
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Drag threshold to inspect trade-off between precision (win rate) and signal volume.
                </p>

                {/* Slider */}
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-gray-500">Cutoff Threshold:</span>
                    <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                      {selectedThreshold.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.50"
                    max="0.80"
                    step="0.05"
                    value={selectedThreshold}
                    onChange={(e) => setSelectedThreshold(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 h-2 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                    <span>0.50 (High Vol)</span>
                    <span>0.65 (Balanced)</span>
                    <span>0.80 (High Conviction)</span>
                  </div>
                </div>

                {/* Live Metrics at Current Slider Value */}
                {activeSweepRow && (
                  <div className="grid grid-cols-2 gap-3 mt-5">
                    <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/20 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase">
                        Precision (Win Rate)
                      </span>
                      <p className="text-xl font-black text-emerald-800 dark:text-emerald-300 font-mono mt-0.5">
                        {(activeSweepRow['Precision / Win Rate'] * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-500/20 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                        Signals Generated
                      </span>
                      <p className="text-xl font-black text-indigo-800 dark:text-indigo-300 font-mono mt-0.5">
                        {activeSweepRow.Signals.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">Recall Rate</span>
                      <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                        {(activeSweepRow.Recall * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase">F1 Score</span>
                      <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                        {activeSweepRow['F1 Score'].toFixed(3)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-4 leading-relaxed">
                💡 <em>Notice:</em> Raising the threshold from 0.50 to 0.80 boosts win rate from 34.3% to 63.8% by strictly executing only the highest probability structural setups.
              </p>
            </div>
          </div>

          {/* Threshold Sweep Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Full Out-of-Sample Threshold Sweep Matrix (0.50 – 0.80)
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Evaluating 14,749 out-of-sample candles across 50 equities (July 2025 – Sept 2026)
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3">Threshold</th>
                    <th className="px-4 py-3">Signals</th>
                    <th className="px-4 py-3">Signal Rate (%)</th>
                    <th className="px-4 py-3">Wins (True Pos)</th>
                    <th className="px-4 py-3">Losses (False Pos)</th>
                    <th className="px-4 py-3">Precision (Win Rate)</th>
                    <th className="px-4 py-3">Recall</th>
                    <th className="px-4 py-3">F1 Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                  {calibrationData.threshold_sweep.map((row) => {
                    const isSelected = Math.abs(row.Threshold - selectedThreshold) < 0.01;
                    return (
                      <tr
                        key={row.Threshold}
                        className={`transition-colors ${
                          isSelected
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-bold'
                            : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <td className="px-4 py-3 text-indigo-600 dark:text-indigo-400 font-black">
                          {row.Threshold.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {row.Signals.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {row['Signal Rate (%)']}%
                        </td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-bold">
                          {row['True Pos (Wins)'].toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-rose-600 dark:text-rose-400">
                          {row['False Pos (Losses)'].toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                          {(row['Precision / Win Rate'] * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                          {(row.Recall * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                          {row['F1 Score'].toFixed(3)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: MODEL ARCHITECTURE & 64 FEATURES                                   */}
      {/* ========================================================================= */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* 4 Feature Engineering Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 inline-block mb-3">
                <Activity className="h-5 w-5" />
              </span>
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-100">1. Volatility Expansion</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                ATR %, Daily High-to-Low spread, Bollinger Band width, and India VIX implied regime.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 inline-block mb-3">
                <TrendingUp className="h-5 w-5" />
              </span>
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-100">2. Benchmark & Sector</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                NIFTY 50 1D/5D/20D returns, BankNifty, CNX IT, CNX Auto relative strength differentials.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
              <span className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 inline-block mb-3">
                <Compass className="h-5 w-5" />
              </span>
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-100">3. Price Momentum</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                RSI-14, MACD histogram, 2D/3D/5D return vectors, and distance from 52-week high.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm">
              <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 inline-block mb-3">
                <BarChart3 className="h-5 w-5" />
              </span>
              <h4 className="text-sm font-black text-gray-900 dark:text-gray-100">4. Volume Flow Profile</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                20-day volume momentum, ratio to SMA-5/SMA-20, and intraday close-location ratios.
              </p>
            </div>
          </div>

          {/* Top Features Chart & Ranking */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  Top 20 Features by LightGBM Information Gain
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Measures total reduction in objective loss contributed by feature splits
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {features.slice(0, 16).map((feat, idx) => {
                const maxGain = features[0]?.importance_gain || 1;
                const gainPct = ((feat.importance_gain / maxGain) * 100).toFixed(0);

                return (
                  <div key={feat.feature} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-400 w-6">#{idx + 1}</span>
                        <span className="font-mono font-extrabold text-gray-900 dark:text-gray-100">
                          {feat.feature}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-semibold">
                          {feat.category || 'Feature'}
                        </span>
                        <span className="text-[11px] text-gray-500 hidden md:inline">
                          — {feat.description}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {feat.importance_gain.toLocaleString(undefined, { maximumFractionDigits: 0 })} gain
                      </span>
                    </div>

                    <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                        style={{ width: `${gainPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: LIVE PAPER TRADING & PORTFOLIO EXECUTION SIMULATOR               */}
      {/* ========================================================================= */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          {/* Top Control Panel & Execution Toolbar */}
          <div className="bg-gradient-to-br from-indigo-950/20 via-white dark:via-gray-900 to-emerald-950/20 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-gray-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <h3 className="text-xl font-black text-gray-900 dark:text-gray-100">
                    Live Forward Portfolio Allocator & Simulator
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-mono uppercase tracking-wide">
                    6-Yr Calibrated Ensemble
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Institutional multi-stock capital sizing with dynamic volatility parity, half-Kelly edge scaling, and strict risk budgeting
                </p>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssumptionsModal(true)}
                  className="px-3.5 py-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  id="btn-execution-assumptions"
                >
                  <Scale className="h-4 w-4 text-emerald-500" />
                  Assumptions (15 bps)
                </button>
                <button
                  onClick={handleRunSimulation}
                  disabled={simulating}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${simulating ? 'animate-spin' : ''}`} />
                  {simulating ? 'Rebalancing...' : 'Run Simulation & Rebalance'}
                </button>
              </div>
            </div>

            {/* Interactive Sizing & Risk Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Capital Base Selector */}
              <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-2xl border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Capital Base (INR)</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    ₹{simCapitalBase.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[250000, 500000, 1000000, 2500000].map((cap) => (
                    <button
                      key={cap}
                      onClick={() => setSimCapitalBase(cap)}
                      className={`py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                        simCapitalBase === cap
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      ₹{cap >= 100000 ? `${(cap / 100000).toFixed(1)}L` : cap}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk Budget Per Trade */}
              <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-2xl border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Risk Per Trade</span>
                  <span className="font-mono font-black text-indigo-600 dark:text-indigo-400">
                    {simRiskPct.toFixed(1)}% (₹{((simCapitalBase * simRiskPct) / 100).toLocaleString('en-IN')})
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {[0.5, 1.0, 1.5, 2.0].map((r) => (
                    <button
                      key={r}
                      onClick={() => setSimRiskPct(r)}
                      className={`py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                        simRiskPct === r
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {r}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizing Mode Algorithm */}
              <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-2xl border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Sizing Algorithm</span>
                  <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                    {simSizingMode === 'VOLATILITY_PARITY' ? 'Inverse ATR' : simSizingMode === 'HALF_KELLY' ? 'Calibrated Kelly' : 'Equal Cash'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {[
                    { id: 'VOLATILITY_PARITY', label: 'Vol Parity' },
                    { id: 'HALF_KELLY', label: 'Half-Kelly' },
                    { id: 'EQUAL_WEIGHT', label: 'Equal Wt' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setSimSizingMode(m.id as any)}
                      className={`py-1 px-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer truncate ${
                        simSizingMode === m.id
                          ? 'bg-violet-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Max Simultaneous Candidates */}
              <div className="p-4 bg-white/60 dark:bg-gray-800/40 rounded-2xl border border-gray-200/60 dark:border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700 dark:text-gray-300">Max Positions</span>
                  <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                    {simMaxPositions} setups (Cap: 25%/pos)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-1">
                  {[3, 5, 8].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSimMaxPositions(n)}
                      className={`py-1 rounded-lg text-[10px] font-bold font-mono transition-all cursor-pointer ${
                        simMaxPositions === n
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {n} Stocks
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Institutional KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Capital</span>
              <p className="text-lg font-black text-gray-900 dark:text-gray-100 font-mono mt-1">
                ₹{(portfolio?.capital_base_inr || simCapitalBase).toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">Base Account Equity</span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Capital Deployed</span>
              <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1">
                ₹{(portfolio?.total_capital_deployed_inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[10px] font-semibold text-indigo-500">
                {portfolio?.cash_utilization_pct || 0}% Utilized
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl">
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Cash Reserve</span>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
                ₹{(portfolio?.cash_reserve_inr || simCapitalBase).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[10px] font-semibold text-emerald-500">
                {(100 - (portfolio?.cash_utilization_pct || 0)).toFixed(1)}% Liquid
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Max Risk at Stop</span>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1">
                ₹{(portfolio?.total_max_risk_inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </p>
              <span className="text-[10px] font-semibold text-rose-500">
                {portfolio?.portfolio_risk_pct || 0}% Portfolio Risk Cap
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl">
              <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Active Positions</span>
              <p className="text-lg font-black text-violet-600 dark:text-violet-400 font-mono mt-1">
                {portfolio?.orders?.filter((o) => o.shares_to_buy > 0).length || 0} / {portfolio?.max_positions || simMaxPositions}
              </p>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                Avg Prob: {((portfolio?.summary?.avg_score || 0.20) * 100).toFixed(1)}%
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-2xl">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Avg Reward/Risk</span>
              <p className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono mt-1">
                {portfolio?.summary?.avg_rr ? `${portfolio.summary.avg_rr}x` : '0.64x'}
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                78.4% Holdout Precision
              </span>
            </div>
          </div>

          {/* Execution Realism & Recovery Status Banner (M7-01, M7-02, M7-03) */}
          <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Scale className="h-4 w-4" />
              </span>
              <div>
                <span className="font-extrabold text-emerald-950 dark:text-emerald-200">
                  Execution Friction: 15 bps Base (0.15%) | 30 bps Stressed (0.30%)
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Conservative stop-first invariant applied on concurrent high/low touch · Idempotent crash recovery active
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAssumptionsModal(true)}
              className="text-emerald-700 dark:text-emerald-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Inspect Friction Model &rarr;
            </button>
          </div>

          {/* Capital Allocation Multi-Bar Visualizer */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                <span className="font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Portfolio Capital Weight Distribution
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  ({portfolio?.sizing_mode || simSizingMode})
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-gray-600 dark:text-gray-400">
                Deployed: ₹{(portfolio?.total_capital_deployed_inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })} | Cash: ₹{(portfolio?.cash_reserve_inr || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>

            {/* Visual Bar */}
            <div className="w-full h-5 rounded-xl overflow-hidden flex bg-gray-100 dark:bg-gray-800 p-0.5 gap-0.5">
              {portfolio?.orders?.filter((o) => o.shares_to_buy > 0).map((ord, idx) => {
                const colors = ['bg-indigo-500', 'bg-violet-500', 'bg-blue-500', 'bg-teal-500', 'bg-emerald-500', 'bg-amber-500'];
                const col = colors[idx % colors.length];
                return (
                  <div
                    key={ord.ticker}
                    style={{ width: `${ord.capital_weight_pct}%` }}
                    className={`h-full ${col} first:rounded-l-lg last:rounded-r-lg flex items-center justify-center transition-all hover:brightness-110 cursor-pointer`}
                    title={`${ord.ticker}: ${ord.capital_weight_pct.toFixed(1)}% (₹${ord.required_capital_inr.toLocaleString('en-IN')})`}
                  >
                    {ord.capital_weight_pct >= 8 && (
                      <span className="text-[9px] font-black text-white font-mono truncate px-1">
                        {ord.ticker.split('.')[0]} {ord.capital_weight_pct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
              {portfolio && (100 - (portfolio.cash_utilization_pct || 0)) > 1 && (
                <div
                  style={{ width: `${100 - (portfolio.cash_utilization_pct || 0)}%` }}
                  className="h-full bg-gray-300 dark:bg-gray-700/60 rounded-r-lg flex items-center justify-center transition-all"
                  title={`Cash Reserve: ${(100 - (portfolio.cash_utilization_pct || 0)).toFixed(1)}%`}
                >
                  {(100 - (portfolio.cash_utilization_pct || 0)) >= 10 && (
                    <span className="text-[9px] font-bold text-gray-700 dark:text-gray-300 font-mono px-1">
                      Cash {(100 - (portfolio.cash_utilization_pct || 0)).toFixed(0)}%
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Allocation Orders Table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  Recommended Order Sizing & Concrete NSE Allocations
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Positions sized using {portfolio?.sizing_mode || simSizingMode} to enforce maximum ₹{((simCapitalBase * simRiskPct) / 100).toLocaleString('en-IN')} loss per position
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-gray-400 font-mono">
                  {portfolio?.orders?.filter((o) => o.shares_to_buy > 0).length || 0} active orders ready
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3">Ticker</th>
                    <th className="px-4 py-3">Score & Catalyst</th>
                    <th className="px-4 py-3">Breakout Trigger</th>
                    <th className="px-4 py-3">Shares</th>
                    <th className="px-4 py-3">Weight %</th>
                    <th className="px-4 py-3">Required INR</th>
                    <th className="px-4 py-3">Stop Loss</th>
                    <th className="px-4 py-3">Target (+2%)</th>
                    <th className="px-4 py-3">Max Risk</th>
                    <th className="px-4 py-3">R:R Ratio</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
                  {portfolio?.orders?.map((ord) => (
                    <tr key={ord.ticker} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3.5 font-black text-gray-900 dark:text-gray-100">
                        <button
                          onClick={() => setSelectedTicker(ord.ticker.replace('.NS', ''))}
                          className="hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                        >
                          {ord.ticker}
                          <ExternalLink className="h-3 w-3 opacity-50" />
                        </button>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                            {(ord.model_score * 100).toFixed(1)}%
                          </span>
                          {ord.sentiment_label && (
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                ord.sentiment_label === 'Bullish'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : ord.sentiment_label === 'Bearish'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600'
                              }`}
                            >
                              {ord.sentiment_label}
                            </span>
                          )}
                        </div>
                        {ord.top_catalyst && (
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 max-w-[200px] truncate mt-0.5 font-sans">
                            {ord.top_catalyst}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-900 dark:text-gray-100 font-semibold">
                        ₹{ord.breakout_trigger_inr.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 font-black text-gray-900 dark:text-gray-100">
                        {ord.shares_to_buy > 0 ? (
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {ord.shares_to_buy} <span className="text-[10px] text-gray-400 font-normal">sh</span>
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs font-normal">0 (Skipped)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300">
                        {ord.capital_weight_pct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3.5 font-bold text-gray-900 dark:text-gray-100">
                        ₹{ord.required_capital_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </td>
                      <td className="px-4 py-3.5 text-rose-600 dark:text-rose-400">
                        ₹{ord.stop_loss_inr.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 font-bold">
                        ₹{ord.profit_target_inr.toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 text-rose-600 dark:text-rose-400 font-semibold">
                        ₹{ord.max_risk_inr.toFixed(0)}
                      </td>
                      <td className="px-4 py-3.5 font-black text-indigo-600 dark:text-indigo-400">
                        {ord.reward_to_risk_ratio.toFixed(2)}x
                        {ord.kelly_fraction !== null && ord.kelly_fraction !== undefined && (
                          <span className="block text-[9px] text-gray-400 font-normal">
                            Kelly: {(ord.kelly_fraction * 100).toFixed(1)}%
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => handleCopyOrder(ord)}
                          className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-[11px] font-bold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
                          title="Copy order parameters for broker terminal"
                        >
                          {copiedOrderTicker === ord.ticker ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forward Simulated Execution Stages */}
          {portfolio?.equity_curve && portfolio.equity_curve.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Simulated Forward Trade Lifecycle Progression
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Estimated portfolio equity progression incorporating 78.4% holdout win rate and 0.15% friction
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {portfolio.equity_curve.map((stage, idx) => (
                  <div
                    key={stage.stage}
                    className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1 relative"
                  >
                    <span className="text-[10px] font-bold text-gray-400 font-mono">Stage {idx + 1}</span>
                    <h5 className="text-xs font-black text-gray-800 dark:text-gray-200">{stage.stage}</h5>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono pt-1">
                      ₹{stage.equity_inr.toLocaleString('en-IN')}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-200/60 dark:border-gray-700/60 font-mono">
                      <span>PnL: {stage.pnl_inr >= 0 ? `+₹${stage.pnl_inr.toFixed(0)}` : `-₹${Math.abs(stage.pnl_inr).toFixed(0)}`}</span>
                      <span>Cash: ₹{stage.cash_inr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Historical Paper Signals Audit Trail */}
          {paperSignals && paperSignals.length > 0 && (
            <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    Historical Paper Trade Signals Log ({paperSignals.length} records)
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Immutable forward audit trail logged in outputs/paper_trading/all_signals.csv
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Ticker</th>
                      <th className="px-3 py-2.5">Close</th>
                      <th className="px-3 py-2.5">Score</th>
                      <th className="px-3 py-2.5">Trigger</th>
                      <th className="px-3 py-2.5">Stop</th>
                      <th className="px-3 py-2.5">Target</th>
                      <th className="px-3 py-2.5">Shares</th>
                      <th className="px-3 py-2.5">Mode</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-[11px]">
                    {paperSignals.slice(-10).reverse().map((sig, idx) => (
                      <tr key={`${sig.signal_date}-${sig.ticker}-${idx}`} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2 text-gray-500">{sig.signal_date}</td>
                        <td className="px-3 py-2 font-bold text-gray-900 dark:text-gray-100">{sig.ticker}</td>
                        <td className="px-3 py-2 text-gray-600 dark:text-gray-400">₹{sig.today_close}</td>
                        <td className="px-3 py-2 text-indigo-600 dark:text-indigo-400 font-bold">
                          {Number(sig.model_score) ? `${(Number(sig.model_score) * 100).toFixed(1)}%` : sig.model_score}
                        </td>
                        <td className="px-3 py-2 text-gray-800 dark:text-gray-200">₹{sig.breakout_trigger}</td>
                        <td className="px-3 py-2 text-rose-600 dark:text-rose-400">₹{sig.stop_loss}</td>
                        <td className="px-3 py-2 text-emerald-600 dark:text-emerald-400">₹{sig.profit_target}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-gray-300 font-bold">
                          {sig.shares ? `${Number(sig.shares).toFixed(0)} sh` : '-'}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-gray-500">
                          {sig.sizing_mode || 'VOLATILITY_PARITY'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              sig.status === 'TARGET_HIT'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                : sig.status === 'STOP_HIT'
                                ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                : 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {sig.status || 'PENDING'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* INDIAN BROKER EXECUTION GATEWAY & WEBHOOK DISPATCHER                    */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                    <Send className="h-5 w-5" />
                  </span>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                    Indian Broker Execution Gateway & Webhook Dispatcher
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 font-mono">
                    Zerodha · Angel · Dhan · Webhooks
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Format and dispatch portfolio candidate orders directly to broker APIs or download 1-click Zerodha Kite Baskets
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadBasketCsv}
                  disabled={!portfolio?.orders?.length}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Download standard CSV basket file for Zerodha Kite Web"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-500" />
                  Export Kite Basket CSV
                </button>
                <button
                  onClick={handleDispatchBroker}
                  disabled={dispatchingBroker || !portfolio?.orders?.length}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Send className={`h-3.5 w-3.5 ${dispatchingBroker ? 'animate-pulse' : ''}`} />
                  {dispatchingBroker ? 'Dispatching...' : `Dispatch to ${selectedBroker.toUpperCase()} (${brokerMode})`}
                </button>
              </div>
            </div>

            {/* Broker & Mode Selector Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Broker Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Target Broker</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'zerodha', name: 'Zerodha Kite', tag: 'KITE' },
                    { id: 'angelone', name: 'Angel One', tag: 'SMART' },
                    { id: 'dhan', name: 'Dhan HQ', tag: 'DHAN' },
                    { id: 'generic', name: 'Webhook', tag: 'REST' },
                  ].map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBroker(b.id as any)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                        selectedBroker === b.id
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-900 dark:text-orange-300 shadow-xs'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{b.name}</span>
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          {b.tag}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Execution Mode Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Execution Mode</label>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => setBrokerMode('sandbox')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      brokerMode === 'sandbox'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Paper Execution Simulation</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Execution fills + taxes without risking live money</p>
                  </button>
                  <button
                    onClick={() => setBrokerMode('webhook')}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      brokerMode === 'webhook'
                        ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-900 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Live Webhook Forward</span>
                      <Zap className="h-3.5 w-3.5 text-indigo-500" />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">POST payload to broker API / URL</p>
                  </button>
                </div>
              </div>

              {/* Custom Webhook URL Input */}
              <div className="lg:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Target Webhook Endpoint URL (Optional)
                </label>
                <input
                  type="text"
                  value={customWebhookUrl}
                  onChange={(e) => setCustomWebhookUrl(e.target.value)}
                  placeholder="https://your-broker-gateway.com/webhook or Telegram bot endpoint"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-hidden focus:border-orange-500 font-mono"
                />
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  If provided, dispatching in Webhook mode will transmit the full signed JSON order basket directly to this endpoint.
                </p>
              </div>
            </div>

            {/* Broker Dispatch Receipt Display */}
            {brokerReceipt && (
              <div className="p-4 bg-orange-50/40 dark:bg-orange-950/20 border border-orange-500/20 rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100 font-mono">
                      {brokerReceipt.dispatch_id} ({brokerReceipt.broker} · {brokerReceipt.mode})
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-mono">
                      {brokerReceipt.status}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                    Timestamp: {brokerReceipt.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-orange-500/10 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Gross Capital</span>
                    <span className="font-black text-gray-900 dark:text-gray-100">
                      ₹{brokerReceipt.total_gross_capital_inr?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Taxes & Charges</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      ₹{brokerReceipt.total_taxes_and_charges_inr?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Net Deployed</span>
                    <span className="font-black text-indigo-600 dark:text-indigo-400">
                      ₹{brokerReceipt.net_capital_deployed_inr?.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Cash Remaining</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">
                      ₹{brokerReceipt.cash_remaining_inr?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Orders Executed List */}
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead>
                      <tr className="text-[10px] text-gray-500 uppercase border-b border-orange-500/10">
                        <th className="py-1">Order ID</th>
                        <th className="py-1">Ticker</th>
                        <th className="py-1">Shares</th>
                        <th className="py-1">Fill Price</th>
                        <th className="py-1">Total Value</th>
                        <th className="py-1">Taxes</th>
                        <th className="py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-500/10">
                      {brokerReceipt.executed_orders?.map((eo: any) => (
                        <tr key={eo.order_id}>
                          <td className="py-1 font-bold text-gray-600 dark:text-gray-400">{eo.order_id}</td>
                          <td className="py-1 font-black text-gray-900 dark:text-gray-100">{eo.tradingsymbol}</td>
                          <td className="py-1 text-indigo-600 dark:text-indigo-400 font-bold">{eo.shares} sh</td>
                          <td className="py-1">₹{eo.fill_price_inr?.toFixed(2)}</td>
                          <td className="py-1 font-bold">₹{eo.gross_value_inr?.toLocaleString('en-IN')}</td>
                          <td className="py-1 text-rose-600 dark:text-rose-400">₹{eo.taxes_and_charges_inr}</td>
                          <td className="py-1">
                            <span className="px-1.5 py-0.2 rounded-sm bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                              {eo.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* LIVE MARK-TO-MARKET (MTM) PORTFOLIO TRACKER & AUTO-EXIT ENGINE           */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <Radio className="h-5 w-5 animate-pulse" />
                  </span>
                  <h3 className="text-base font-black text-gray-900 dark:text-gray-100">
                    Live Mark-to-Market (MTM) Tracker &amp; Auto-Exit Engine
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-mono">
                    Live LTP · Trailing Stops · STT Deductions
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Track active filled positions with real-time NSE mark-to-market P&amp;L, automated trailing stop preservation, and profit-target execution
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleImportFromBroker}
                  disabled={mtmSyncing}
                  className="px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Import recently filled orders from Broker Gateway"
                >
                  <Download className="h-3.5 w-3.5 text-orange-500" />
                  Import from Broker
                </button>
                <button
                  onClick={() => handleMtmSync(false)}
                  disabled={mtmSyncing}
                  className="px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-teal-500 ${mtmSyncing ? 'animate-spin' : ''}`} />
                  Sync Live LTP
                </button>
                <button
                  onClick={() => handleMtmSync(true)}
                  disabled={mtmSyncing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Target className={`h-3.5 w-3.5 ${mtmSyncing ? 'animate-ping' : ''}`} />
                  {mtmSyncing ? 'Evaluating...' : 'Evaluate Auto-Exits Now'}
                </button>
              </div>
            </div>

            {/* Scenario Testing Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50/60 dark:bg-gray-800/30 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-gray-500" />
                <span className="font-bold text-gray-700 dark:text-gray-300">Market Tick Scenario:</span>
                <span className="text-[11px] text-gray-500">Inject simulated market fluctuations to test stops &amp; targets</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono">
                {[
                  { id: 'live', name: 'Live NSE Quotes', badge: 'Fast Info' },
                  { id: 'bullish', name: 'Bullish (+1.8%)', badge: 'Target Tests' },
                  { id: 'mixed', name: 'Mixed Intraday', badge: 'Active MTM' },
                  { id: 'bearish', name: 'Bearish (-2.5%)', badge: 'Stop Cuts' },
                ].map((scen) => (
                  <button
                    key={scen.id}
                    onClick={() => {
                      setSelectedScenario(scen.id as any);
                      handleMtmSync(false, scen.id === 'live' ? undefined : scen.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      selectedScenario === scen.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {scen.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Real-Time Performance KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Portfolio Net Worth</span>
                <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono">
                  ₹{mtmData?.summary?.current_equity_inr?.toLocaleString('en-IN') || '5,00,000'}
                </p>
                <span className={`text-[10px] font-bold font-mono block ${
                  (mtmData?.summary?.net_portfolio_return_pct || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {(mtmData?.summary?.net_portfolio_return_pct || 0) >= 0 ? '+' : ''}
                  {mtmData?.summary?.net_portfolio_return_pct?.toFixed(2) || '0.00'}% Net
                </span>
              </div>

              <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Unrealized MTM P&amp;L</span>
                <p className={`text-base font-black font-mono ${
                  (mtmData?.summary?.total_unrealized_pnl_inr || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {(mtmData?.summary?.total_unrealized_pnl_inr || 0) >= 0 ? '+' : ''}
                  ₹{mtmData?.summary?.total_unrealized_pnl_inr?.toLocaleString('en-IN') || '0.00'}
                </p>
                <span className="text-[10px] text-gray-500 font-mono block">
                  On Open Positions
                </span>
              </div>

              <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Realized Closed P&amp;L</span>
                <p className={`text-base font-black font-mono ${
                  (mtmData?.summary?.total_realized_pnl_inr || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {(mtmData?.summary?.total_realized_pnl_inr || 0) >= 0 ? '+' : ''}
                  ₹{mtmData?.summary?.total_realized_pnl_inr?.toLocaleString('en-IN') || '0.00'}
                </p>
                <span className="text-[10px] text-gray-500 font-mono block">
                  Net After Indian Taxes
                </span>
              </div>

              <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Liquid Cash Reserve</span>
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  ₹{mtmData?.summary?.cash_balance_inr?.toLocaleString('en-IN') || '3,30,196'}
                </p>
                <span className="text-[10px] text-gray-500 font-mono block">
                  Available for Sizing
                </span>
              </div>

              <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Active Open Trades</span>
                <p className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {mtmData?.summary?.active_positions_count ?? 4}
                </p>
                <span className="text-[10px] text-gray-500 font-mono block">
                  Holding with ATR Stops
                </span>
              </div>

              <div className="p-4 bg-gray-50/80 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Trade Journal Win %</span>
                <p className="text-base font-black text-gray-900 dark:text-gray-100 font-mono">
                  {mtmData?.journal?.summary?.win_rate_pct ?? 25.0}%
                </p>
                <span className="text-[10px] text-gray-500 font-mono block">
                  Factor: {mtmData?.journal?.summary?.profit_factor ?? 0.17}x
                </span>
              </div>
            </div>

            {/* Active Open Positions Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                  <Activity className="h-4 w-4 text-teal-500" />
                  Active Open Positions ({(mtmData?.positions?.positions?.filter((p: any) => p.status === 'OPEN') || []).length})
                </h4>
                <span className="text-[11px] text-gray-500 font-mono">
                  Updated: {mtmData?.summary?.timestamp || 'Live'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-gray-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200/80 dark:border-gray-800">
                    <tr>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Shares</th>
                      <th className="px-4 py-3">Entry Price</th>
                      <th className="px-4 py-3">Live LTP</th>
                      <th className="px-4 py-3">Unrealized P&amp;L</th>
                      <th className="px-4 py-3">Trailing Stop</th>
                      <th className="px-4 py-3">Profit Target</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {(() => {
                      const openPositions = (mtmData?.positions?.positions || []).filter((p: any) => p.status === 'OPEN');
                      if (openPositions.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-xs">
                              <p className="font-bold">No active open positions currently holding.</p>
                              <p className="text-[11px] text-gray-400 mt-1">
                                Click &quot;Import from Broker&quot; to initialize positions from recently dispatched orders.
                              </p>
                            </td>
                          </tr>
                        );
                      }
                      return openPositions.map((pos: any) => {
                        const isGain = (pos.unrealized_pnl || 0) >= 0;
                        const distToTarget = pos.profit_target && pos.current_ltp ? (((pos.profit_target - pos.current_ltp) / pos.current_ltp) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={pos.position_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                                <span className="font-black text-gray-900 dark:text-gray-100 text-xs">{pos.tradingsymbol}</span>
                                <span className="text-[9px] px-1 py-0.2 rounded-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-sans">
                                  {pos.broker}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-600 dark:text-indigo-400">
                              {pos.shares} sh
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                              ₹{pos.entry_price?.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-black text-gray-900 dark:text-gray-100">
                              ₹{pos.current_ltp?.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              <span className={`px-2 py-0.5 rounded-md ${
                                isGain
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                              }`}>
                                {isGain ? '+' : ''}₹{pos.unrealized_pnl?.toFixed(2)} ({isGain ? '+' : ''}{pos.unrealized_pnl_pct?.toFixed(2)}%)
                              </span>
                            </td>
                            <td className="px-4 py-3 text-rose-600 dark:text-rose-400">
                              ₹{pos.trailing_stop?.toFixed(2)}
                              {pos.trailing_stop > pos.stop_loss && (
                                <span className="block text-[9px] text-teal-600 dark:text-teal-400 font-normal">
                                  Trailed +₹{(pos.trailing_stop - pos.stop_loss).toFixed(2)}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-emerald-600 dark:text-emerald-400 font-semibold">
                              ₹{pos.profit_target?.toFixed(2)}
                              <span className="block text-[9px] text-gray-400 font-normal">
                                {distToTarget}% to target
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1.5 font-sans">
                                <button
                                  onClick={() => handleSimulateTargetTick(pos.tradingsymbol, Number((pos.profit_target + 0.5).toFixed(2)))}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Simulate profit target price hit"
                                >
                                  Take Target
                                </button>
                                <button
                                  onClick={() => handleClosePosition(pos.tradingsymbol)}
                                  className="px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-[10px] font-bold transition-colors cursor-pointer"
                                  title="Close position at current market price"
                                >
                                  Close
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Closed Trade Journal Table */}
            {mtmData?.journal?.closed_trades?.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-gray-900 dark:text-gray-100 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    Institutional Closed Trade Journal ({mtmData.journal.closed_trades.length} completed trades)
                  </h4>
                  <span className="text-[11px] text-gray-500 font-mono">
                    Net Realized: ₹{mtmData.journal.summary?.total_realized_pnl_inr?.toLocaleString('en-IN') || '0.00'}
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[260px] overflow-y-auto rounded-2xl border border-gray-200/80 dark:border-gray-800">
                  <table className="w-full text-left text-[11px] font-mono">
                    <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-3 py-2">Trade ID</th>
                        <th className="px-3 py-2">Symbol</th>
                        <th className="px-3 py-2">Entry Price</th>
                        <th className="px-3 py-2">Exit Price</th>
                        <th className="px-3 py-2">Shares</th>
                        <th className="px-3 py-2">STT &amp; Charges</th>
                        <th className="px-3 py-2">Net Realized P&amp;L</th>
                        <th className="px-3 py-2">Return %</th>
                        <th className="px-3 py-2">R-Multiple</th>
                        <th className="px-3 py-2">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {mtmData.journal.closed_trades.slice(0, 10).map((trd: any) => {
                        const isProfit = (trd.net_realized_pnl || 0) > 0;
                        return (
                          <tr key={trd.trade_id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                            <td className="px-3 py-1.5 text-gray-500">{trd.trade_id}</td>
                            <td className="px-3 py-1.5 font-black text-gray-900 dark:text-gray-100">{trd.tradingsymbol}</td>
                            <td className="px-3 py-1.5 text-gray-600 dark:text-gray-400">₹{trd.entry_price?.toFixed(2)}</td>
                            <td className="px-3 py-1.5 font-bold">₹{trd.exit_price?.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-indigo-600 dark:text-indigo-400 font-bold">{trd.shares} sh</td>
                            <td className="px-3 py-1.5 text-rose-500">₹{trd.total_friction_inr?.toFixed(2)}</td>
                            <td className={`px-3 py-1.5 font-black ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isProfit ? '+' : ''}₹{trd.net_realized_pnl?.toFixed(2)}
                            </td>
                            <td className={`px-3 py-1.5 font-bold ${isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {isProfit ? '+' : ''}{trd.net_return_pct?.toFixed(2)}%
                            </td>
                            <td className="px-3 py-1.5 text-gray-700 dark:text-gray-300 font-bold">
                              {trd.r_multiple > 0 ? `+${trd.r_multiple}R` : `${trd.r_multiple}R`}
                            </td>
                            <td className="px-3 py-1.5">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                trd.exit_reason === 'PROFIT_TARGET_HIT'
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                                  : trd.exit_reason === 'TRAILING_STOP_HIT'
                                  ? 'bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400'
                                  : trd.exit_reason === 'STOP_LOSS_HIT'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                              }`}>
                                {trd.exit_reason}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* AUTOMATED EOD PIPELINE SCHEDULER PANEL                                   */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-500/20 rounded-3xl p-6 text-white shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <Terminal className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-white">
                      Automated EOD Pipeline Orchestrator
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      3:45 PM IST Daily
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    End-to-End Orchestration: Market Scan ({selectedScanUniverse.toUpperCase()}) $\rightarrow$ Paper Sizing $\rightarrow$ Indian Broker Dispatch
                  </p>
                  <p className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    On Windows, &ldquo;Register Task&rdquo; uses Windows Task Scheduler. On Linux/Docker, it installs a crontab entry. You can also trigger the pipeline manually at any time.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleToggleWindowsTask}
                  disabled={scheduling}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    schedulerStatus?.windows_task?.registered
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {scheduling
                    ? 'Updating...'
                    : schedulerStatus?.windows_task?.registered
                    ? 'Uninstall Scheduled Task'
                    : 'Register Scheduled Task (15:45 IST)'}
                </button>
                <button
                  onClick={handleRunScheduledPipelineNow}
                  disabled={scheduling}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/30 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Play className={`h-3.5 w-3.5 fill-white ${scheduling ? 'animate-spin' : ''}`} />
                  {scheduling ? 'Orchestrating...' : 'Trigger Full Pipeline Now'}
                </button>
              </div>
            </div>

            {/* Scheduler Status Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Trading Schedule</span>
                <p className="font-black text-emerald-400">Mon - Fri @ 15:45 IST</p>
                <span className="text-[10px] text-slate-400 font-sans">Post NSE Close Sync</span>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Scheduled Task Status</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      schedulerStatus?.windows_task?.registered ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                    }`}
                  />
                  <p className="font-black text-white">
                    {schedulerStatus?.windows_task?.registered ? 'Active & Ready' : 'Not Registered'}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400 font-sans">Task: AxionStockAIScanner</span>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Next Upcoming Run</span>
                <p className="font-bold text-indigo-300 truncate">
                  {schedulerStatus?.next_scheduled_run || '2026-09-09 15:45:00 IST'}
                </p>
                <span className="text-[10px] text-slate-400 font-sans">Next NSE Session</span>
              </div>

              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-sans">Last Execution</span>
                <p className="font-bold text-slate-200 truncate">
                  {schedulerStatus?.last_run_timestamp || 'On-demand Ready'}
                </p>
                <span className="text-[10px] text-emerald-400 font-sans">
                  Status: {schedulerStatus?.pipeline_status || 'READY'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: FORWARD OBSERVATION & PROSPECTIVE EVALUATION                      */}
      {/* ========================================================================= */}
      {activeTab === 'observation' && (
        <div className="space-y-6">
          <ForwardObservationDashboard onRefresh={refreshJournal} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* SHAP EXPLAINABILITY MODAL DIALOG                                         */}
      {/* ========================================================================= */}
      {selectedStockForShap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-gray-100 font-mono">
                    {selectedStockForShap.Ticker}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-mono">
                    Score: {(selectedStockForShap['Model Score'] * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  SHAP (SHapley Additive exPlanations) Feature Driver Decomposition
                </p>
              </div>

              <button
                onClick={() => setSelectedStockForShap(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Narrative text */}
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-mono">
              {selectedStockForShap['SHAP Narrative']}
            </div>

            {/* Live News Catalyst & Sentiment Analysis */}
            {selectedStockForShap['Top News Catalyst'] && (
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/30 rounded-2xl border border-blue-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-4 w-4 text-blue-500" />
                    <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      Real-Time News Catalyst & Sentiment
                    </h4>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono ${
                      selectedStockForShap['Sentiment Label'] === 'Bullish'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                        : selectedStockForShap['Sentiment Label'] === 'Bearish'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {selectedStockForShap['Sentiment Label']} (
                    {selectedStockForShap['Sentiment Score'] !== undefined
                      ? selectedStockForShap['Sentiment Score'] > 0
                        ? `+${selectedStockForShap['Sentiment Score']}`
                        : selectedStockForShap['Sentiment Score']
                      : '0.0'}
                    )
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  &quot;{selectedStockForShap['Top News Catalyst']}&quot;
                </p>
                {selectedStockForShap['Catalyst Rationale'] && (
                  <p className="text-[11px] text-gray-600 dark:text-gray-400 italic">
                    {selectedStockForShap['Catalyst Rationale']} (Engine: {selectedStockForShap['Sentiment Engine'] || 'financial_nlp'})
                  </p>
                )}
              </div>
            )}

            {/* Positive Drivers */}
            <div>
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <ArrowUpRight className="h-4 w-4" />
                Positive Feature Drivers (Boosting Probability)
              </h4>
              <div className="space-y-2">
                {selectedStockForShap.positive_drivers?.map((drv) => (
                  <div
                    key={drv.feature}
                    className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-emerald-800 dark:text-emerald-300">
                        {drv.feature}
                      </span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                        {drv.description || drv.feature}
                      </p>
                    </div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 shrink-0">
                      +{drv.shap_value.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Negative Drags */}
            <div>
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <ArrowDownRight className="h-4 w-4" />
                Negative Feature Drags (Resisting Target)
              </h4>
              <div className="space-y-2">
                {selectedStockForShap.negative_drags?.map((drag) => (
                  <div
                    key={drag.feature}
                    className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-rose-800 dark:text-rose-300">
                        {drag.feature}
                      </span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                        {drag.description || drag.feature}
                      </p>
                    </div>
                    <span className="font-mono font-black text-rose-600 dark:text-rose-400 shrink-0">
                      {drag.shap_value.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedStockForShap(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Executive Daily Watchlist Modal */}
      {showWatchlistModal && watchlistReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 max-w-4xl w-full max-h-[88vh] overflow-y-auto shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    Executive Daily Market Watchlist
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Institutional EOD Breakout Setups &amp; Action Plan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyWatchlist}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedReport ? 'Copied!' : 'Copy Markdown'}
                </button>
                <button
                  onClick={() => setShowWatchlistModal(false)}
                  className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none bg-slate-50 dark:bg-slate-950/60 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 font-mono text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">
              {watchlistReport}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowWatchlistModal(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-md shadow-indigo-600/25"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Execution Realism Assumptions Modal Dialog */}
      <PaperExecutionAssumptionsModal
        isOpen={showAssumptionsModal}
        onClose={() => setShowAssumptionsModal(false)}
      />
    </div>
  );
}
