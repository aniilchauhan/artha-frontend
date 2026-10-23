'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect } from 'react';
import { useStockContext } from '../context/StockContext';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Line, ReferenceLine, BarChart, Bar, Cell } from 'recharts';
import { ArrowLeft, Star, Bell, TrendingUp, HelpCircle, X, Sparkles, Edit3, Trash2, Eye, EyeOff, Plus, Crosshair, TrendingDown, Check, Building2, Loader2, BarChart2, CalendarDays, Clock, Zap, Award, AlertTriangle, Cpu, Newspaper, ArrowUpRight, ArrowDownRight, AlertCircle, RefreshCw } from 'lucide-react';
import NewsFeed from './NewsFeed';
import TradeAdvisorTab from './TradeAdvisorTab';
import SentimentGauge from './SentimentGauge';
import PositionCalculator from './PositionCalculator';
import TradingJournal from './TradingJournal';
import D3LineChart from './D3LineChart';
import StrategyBacktester from './StrategyBacktester';
import CompanyProfileTab from './CompanyProfileTab';
import StockAiDetailTab from './StockAiDetailTab';
import CompanyResearchPanel from './CompanyResearchPanel';
import { useRouter } from '../lib/workspace-router';
import SmallCapStockDetail from './SmallCapStockDetail';
import LocalOllamaCatalystWidget from './LocalOllamaCatalystWidget';
import QuickTradeModal from './QuickTradeModal';
import { playTargetChime } from '../lib/sound-notifications';
import { quoteStatusLabel, withCurrentStatus } from '../lib/market-quote';

export default function StockDetailView() {
  const router = useRouter();
  const {
    stocks,
    selectedTicker,
    setSelectedTicker,
    selectedSmallCapStock,
    watchlist,
    toggleWatchlist,
    thresholds,
    setThreshold,
    theme,
    isUsingFallback,
    customApiKey,
    addToast
  } = useStockContext();

  const [smallCapViewMode, setSmallCapViewMode] = useState<'point-to-point' | 'full'>('point-to-point');

  // Reset to point-to-point default mode whenever the active stock changes
  useEffect(() => {
    setSmallCapViewMode('point-to-point');
  }, [selectedTicker]);

  const [chartEngine, setChartEngine] = useState<'recharts' | 'd3'>('recharts');
  const [chartStyle, setChartStyle] = useState<'line' | 'candlestick'>('line');
  const [showSma5, setShowSma5] = useState(true);
  const [showSma15, setShowSma15] = useState(true);
  const [showSma50, setShowSma50] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRsi, setShowRsi] = useState(false);
  const [showPatterns, setShowPatterns] = useState(true);
  const [period, setPeriod] = useState<'1d' | '7d' | '30d' | '90d' | '1y' | 'custom'>('30d');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showLegendOverlay, setShowLegendOverlay] = useState<boolean>(true);
  const [hoveredPointData, setHoveredPointData] = useState<any | null>(null);

  // Manual Support and Resistance Drawing States
  const [activeDrawingMode, setActiveDrawingMode] = useState<'none' | 'support' | 'resistance'>('none');
  const [hoveredPrice, setHoveredPrice] = useState<number | null>(null);
  const [manualPrice, setManualPrice] = useState<string>('');
  const [manualLabel, setManualLabel] = useState<string>('');
  const [manualType, setManualType] = useState<'support' | 'resistance'>('support');
  
  const [drawings, setDrawings] = useState<{
    id: string;
    ticker: string;
    type: 'support' | 'resistance';
    price: number;
    label?: string;
    style: 'solid' | 'dashed' | 'dotted';
    visible: boolean;
  }[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('friday_chart_drawings');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const saveDrawings = (updated: any[]) => {
    setDrawings(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('friday_chart_drawings', JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save drawings", e);
      }
    }
  };

  // Gemini AI Trend Report States
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAiSandbox, setIsAiSandbox] = useState(false);
  const [showQuickTrade, setShowQuickTrade] = useState(false);

  // FRIDAY Trade Advisor Sub-Tab States
  const [detailTab, setDetailTab] = useState<'analysis' | 'advisor' | 'backtest' | 'profile' | 'stock-ai' | 'news' | 'research'>('analysis');
  const [advisorRiskLevel, setAdvisorRiskLevel] = useState<'Conservative' | 'Moderate' | 'Aggressive'>('Moderate');
  const [advisorSummary, setAdvisorSummary] = useState<string | null>(null);
  const [loadingAdvisor, setLoadingAdvisor] = useState(false);
  const [advisorError, setAdvisorError] = useState<string | null>(null);
  const [isAdvisorSandbox, setIsAdvisorSandbox] = useState(false);
  const [advisorNotes, setAdvisorNotes] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('friday_advisor_notes');
        return saved ? JSON.parse(saved) : {};
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const saveNote = (ticker: string, note: string) => {
    const updated = { ...advisorNotes, [ticker]: note };
    setAdvisorNotes(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('friday_advisor_notes', JSON.stringify(updated));
      } catch (e) {
        console.error("Localstorage save failed:", e);
      }
    }
  };

  const contextStock = stocks.find(s => s.ticker === selectedTicker);
  const [fetchedStock, setFetchedStock] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingCompetitors, setLoadingCompetitors] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);

  useEffect(() => {
    if (!selectedTicker) {
      setFetchedStock(null);
      setDetailError(null);
      return;
    }

    let active = true;
    setFetchedStock(null);
    setDetailError(null);

    async function loadStockDetail() {
      // If stock is already in context, show it immediately — no loading spinner
      // Then fetch enriched data (competitors, history) in background
      const isInContext = stocks.some(s => s.ticker === selectedTicker);
      if (!isInContext) {
        setLoadingDetail(true);
      } else {
        setLoadingCompetitors(true);
      }

      try {
        const res = await fetch(`/api/stocks/detail?ticker=${encodeURIComponent(selectedTicker as string)}`);
        if (!res.ok) throw new Error('Failed to load stock details from API');
        const data = await res.json();
        if (data.success && active) {
          setFetchedStock(data.stock);
        } else if (active) {
          throw new Error(data.error || 'Stock not found');
        }
      } catch (err: any) {
        if (active && !isInContext) {
          setDetailError(err.message || 'Failed to fetch stock information');
        }
      } finally {
        if (active) {
          setLoadingDetail(false);
          setLoadingCompetitors(false);
        }
      }
    }

    loadStockDetail();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTicker, reloadAttempt]);

  // Show contextStock immediately for instant display; switch to fetchedStock once enrichment arrives
  const stock = fetchedStock || contextStock;


  // Reset AI summary state whenever selected ticker changes to maintain a clean transition
  React.useEffect(() => {
    setAiSummary(null);
    setAiError(null);
    setLoadingAi(false);
    setIsAiSandbox(false);

    // Reset advisor states
    setAdvisorSummary(null);
    setAdvisorError(null);
    setLoadingAdvisor(false);
    setIsAdvisorSandbox(false);
    setAdvisorRiskLevel('Moderate');
    setDetailTab('analysis');

    // Reset period and default custom date bounds
    setPeriod('30d');
  }, [selectedTicker]);

  React.useEffect(() => {
    if (stock && stock.history && stock.history.length > 0) {
      setCustomStartDate(stock.history[0].date);
      setCustomEndDate(stock.history[stock.history.length - 1].date);
    }
  }, [stock]);

  const generateAdvisorReport = async (
    risk: 'Conservative' | 'Moderate' | 'Aggressive',
    bMin: number,
    bMax: number,
    sMin: number,
    sMax: number,
    sl: number,
    profit: string,
    rr: string
  ) => {
    if (!stock) return;
    setLoadingAdvisor(true);
    setAdvisorError(null);
    setAdvisorSummary(null);
    try {
      const response = await fetch('/api/trade-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-gemini-api-key': customApiKey } : {})
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          name: stock.name,
          currentPrice: stock.currentPrice,
          riskLevel: risk,
          buyRangeMin: bMin.toFixed(2),
          buyRangeMax: bMax.toFixed(2),
          sellRangeMin: sMin.toFixed(2),
          sellRangeMax: sMax.toFixed(2),
          stopLoss: sl.toFixed(2),
          profitPotential: profit,
          riskRewardRatio: rr
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAdvisorSummary(data.text);
      setIsAdvisorSandbox(!!data.isMock);
    } catch (err: any) {
      console.error("Advisor Generation Error:", err);
      setAdvisorError(err.message || 'An unexpected error occurred during trade advisor generation.');
    } finally {
      setLoadingAdvisor(false);
    }
  };

  const generateReport = async () => {
    if (!stock) return;
    setLoadingAi(true);
    setAiError(null);
    setAiSummary(null);
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-gemini-api-key': customApiKey } : {})
        },
        body: JSON.stringify({
          ticker: stock.ticker,
          name: stock.name,
          price: stock.currentPrice,
          history: stock.history
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setAiSummary(data.text);
      setIsAiSandbox(!!data.isMock);
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setAiError(err.message || 'An unexpected error occurred during AI trend generation.');
    } finally {
      setLoadingAi(false);
    }
  };

  if (loadingDetail) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-16 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 space-y-4">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        <span className="text-xs font-mono font-bold uppercase tracking-widest">Loading Stock Details...</span>
      </div>
    );
  }

  if (detailError) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-rose-200 dark:border-rose-800/30 rounded-2xl p-16 flex flex-col items-center justify-center text-center space-y-3">
        <div className="h-10 w-10 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-full flex items-center justify-center mb-2">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm font-bold text-gray-900 dark:text-white">Failed to load stock data</p>
        <p className="text-xs text-gray-500">{detailError}</p>
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500 dark:text-gray-400">
        No stock selected. Select a stock to view details.
      </div>
    );
  }

  const isWatchlisted = watchlist.includes(stock.ticker);
  const isUp = stock.change >= 0;
  const thresholdValue = thresholds[stock.ticker];

  // Simple Moving Average (SMA) calculation function
  const calculateSMA = (data: { price: number }[], periodVal: number): (number | null)[] => {
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.map((_, idx) => {
      if (idx < periodVal - 1) return null;
      const slice = data.slice(idx - periodVal + 1, idx + 1);
      const sum = slice.reduce((acc, curr) => acc + curr.price, 0);
      return Number((sum / periodVal).toFixed(2));
    });
  };

  // Relative Strength Index (RSI) calculation function
  const calculateRSI = (data: { price: number }[], periodVal = 14): (number | null)[] => {
    if (!Array.isArray(data) || data.length === 0) return [];
    const rsiValues: (number | null)[] = new Array(data.length).fill(null);
    if (data.length <= periodVal) return rsiValues;

    let gains = 0;
    let losses = 0;

    // First change calculations
    for (let i = 1; i <= periodVal; i++) {
      const difference = data[i].price - data[i - 1].price;
      if (difference > 0) {
        gains += difference;
      } else {
        losses -= difference;
      }
    }

    let avgGain = gains / periodVal;
    let avgLoss = losses / periodVal;
    
    if (avgLoss === 0) {
      rsiValues[periodVal] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsiValues[periodVal] = Number((100 - 100 / (1 + rs)).toFixed(2));
    }

    for (let i = periodVal + 1; i < data.length; i++) {
      const difference = data[i].price - data[i - 1].price;
      const currentGain = difference > 0 ? difference : 0;
      const currentLoss = difference < 0 ? -difference : 0;

      avgGain = (avgGain * (periodVal - 1) + currentGain) / periodVal;
      avgLoss = (avgLoss * (periodVal - 1) + currentLoss) / periodVal;

      if (avgLoss === 0) {
        rsiValues[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsiValues[i] = Number((100 - 100 / (1 + rs)).toFixed(2));
      }
    }

    return rsiValues;
  };

  // Bollinger Bands calculation function
  const calculateBollingerBands = (data: { price: number }[], periodVal = 20, multiplier = 2) => {
    if (!Array.isArray(data) || data.length === 0) return { upper: [], middle: [], lower: [] };
    const upper: (number | null)[] = new Array(data.length).fill(null);
    const middle: (number | null)[] = new Array(data.length).fill(null);
    const lower: (number | null)[] = new Array(data.length).fill(null);

    if (data.length < periodVal) return { upper, middle, lower };

    for (let i = periodVal - 1; i < data.length; i++) {
      const slice = data.slice(i - periodVal + 1, i + 1);
      const sum = slice.reduce((acc, curr) => acc + curr.price, 0);
      const mean = sum / periodVal;
      middle[i] = Number(mean.toFixed(2));

      const variance = slice.reduce((acc, curr) => acc + Math.pow(curr.price - mean, 2), 0) / periodVal;
      const stdDev = Math.sqrt(variance);

      upper[i] = Number((mean + multiplier * stdDev).toFixed(2));
      lower[i] = Number((mean - multiplier * stdDev).toFixed(2));
    }

    return { upper, middle, lower };
  };

  interface DetectedPattern {
    type: 'bullish_engulfing' | 'bearish_engulfing' | 'doji' | 'hammer' | 'inverted_hammer';
    name: string;
    abbreviation: string;
    color: string;
    description: string;
    isBullish: boolean;
  }

  const detectCandlestickPatterns = (history: any[]): (DetectedPattern | null)[] => {
    if (!Array.isArray(history) || history.length === 0) return [];
    const patterns: (DetectedPattern | null)[] = new Array(history.length).fill(null);
    if (history.length < 2) return patterns;

    for (let i = 0; i < history.length; i++) {
      const current = history[i];
      const open = current.open ?? current.price;
      const close = current.close ?? current.price;
      const high = current.high ?? current.price;
      const low = current.low ?? current.price;
      
      const body = Math.abs(close - open);
      const range = high - low;
      
      if (range === 0) continue;

      // 1. Doji
      if (body / range <= 0.1) {
        patterns[i] = {
          type: 'doji',
          name: 'Doji',
          abbreviation: 'DOJI',
          color: '#f59e0b',
          description: 'Indicates complete market indecision where open and close are virtually identical. Watch for potential reversals.',
          isBullish: false
        };
        continue;
      }

      // 2. Hammer / Inverted Hammer
      const upperShadow = high - Math.max(open, close);
      const lowerShadow = Math.min(open, close) - low;
      
      if (lowerShadow >= 2 * body && upperShadow <= 0.1 * range && body > 0) {
        patterns[i] = {
          type: 'hammer',
          name: 'Hammer',
          abbreviation: 'HAM',
          color: '#10b981',
          description: 'A bullish reversal pattern. Indicates strong buying pressure driving the price up after deep intraday selloffs.',
          isBullish: true
        };
        continue;
      }

      if (upperShadow >= 2 * body && lowerShadow <= 0.1 * range && body > 0) {
        patterns[i] = {
          type: 'inverted_hammer',
          name: 'Inverted Hammer',
          abbreviation: 'INV-H',
          color: '#3b82f6',
          description: 'A potential bullish reversal pattern. Shows that buyers drove prices up, and even with a pullback, bulls remain active.',
          isBullish: true
        };
        continue;
      }

      // 3. Engulfing patterns
      if (i > 0) {
        const prev = history[i - 1];
        const prevOpen = prev.open ?? prev.price;
        const prevClose = prev.close ?? prev.price;

        if (prevClose < prevOpen && close > open) {
          if (open <= prevClose && close >= prevOpen && (open < prevClose || close > prevOpen)) {
            patterns[i] = {
              type: 'bullish_engulfing',
              name: 'Bullish Engulfing',
              abbreviation: 'B-ENG',
              color: '#10b981',
              description: 'A powerful bullish reversal signal. The current green body completely swallows the previous session\'s red body.',
              isBullish: true
            };
            continue;
          }
        }

        if (prevClose > prevOpen && close < open) {
          if (open >= prevClose && close <= prevOpen && (open > prevClose || close < prevOpen)) {
            patterns[i] = {
              type: 'bearish_engulfing',
              name: 'Bearish Engulfing',
              abbreviation: 'S-ENG',
              color: '#ef4444',
              description: 'A strong bearish reversal signal. The current red body completely swallows the previous session\'s green body.',
              isBullish: false
            };
            continue;
          }
        }
      }
    }

    return patterns;
  };

  // Calculate technical indicators on full 90-day history so indicators are accurate even for shorter display ranges
  const rawHistory = Array.isArray(stock?.history) ? stock.history : [];
  const sma5Data = calculateSMA(rawHistory, 5);
  const sma15Data = calculateSMA(rawHistory, 15);
  const sma50Data = calculateSMA(rawHistory, 50);
  const rsiData = calculateRSI(rawHistory, 14);
  const { upper: bbUpper, lower: bbLower } = calculateBollingerBands(rawHistory, 20, 2);
  const patternsData = detectCandlestickPatterns(rawHistory);

  const fullChartData = rawHistory.map((d: any, index: number) => ({
    ...d,
    sma5: sma5Data[index],
    sma15: sma15Data[index],
    sma50: sma50Data[index],
    rsi: rsiData[index],
    bbUpper: bbUpper[index],
    bbLower: bbLower[index],
    detectedPattern: patternsData[index]
  }));

  // Sliced chart data based on selected timeframe period
  const chartData = period === '1d'
    ? fullChartData.slice(-2)
    : period === '7d'
      ? fullChartData.slice(-7)
      : period === '30d'
        ? fullChartData.slice(-30)
          : period === '90d'
            ? fullChartData.slice(-90)
            : period === '1y'
              ? fullChartData
              : fullChartData.filter((d: any) => {
                  const start = customStartDate || (stock?.history[0]?.date || '');
                  const end = customEndDate || (stock?.history[stock.history.length - 1]?.date || '');
                  return d.date >= start && d.date <= end;
                });

  const activeDataPoint = hoveredPointData || chartData[chartData.length - 1];
  const visiblePatterns = chartData.filter((d: any) => d.detectedPattern !== null);

  // Custom tooltip for historical chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const priceItem = payload.find((p: any) => p.dataKey === 'price');
      const sma5Item = payload.find((p: any) => p.dataKey === 'sma5');
      const sma15Item = payload.find((p: any) => p.dataKey === 'sma15');
      const sma50Item = payload.find((p: any) => p.dataKey === 'sma50');
      const bbUpperItem = payload.find((p: any) => p.dataKey === 'bbUpper');
      const bbLowerItem = payload.find((p: any) => p.dataKey === 'bbLower');
      const rsiItem = payload.find((p: any) => p.dataKey === 'rsi');

      return (
        <div className="bg-slate-950 text-white p-3.5 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono min-w-[170px] space-y-1.5 z-50">
          <p className="font-sans font-bold text-gray-400 border-b border-slate-800 pb-1 mb-1">
            {payload[0].payload.date}
          </p>
          
          {priceItem && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-gray-400 flex items-center gap-1.5 font-sans">
                <span className={`h-1.5 w-1.5 rounded-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                Price:
              </span>
              <span className="font-semibold text-white">₹{priceItem.value.toFixed(2)}</span>
            </div>
          )}

          {sma5Item && sma5Item.value !== undefined && sma5Item.value !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-amber-400 flex items-center gap-1.5 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                SMA 5:
              </span>
              <span className="font-semibold text-amber-300">₹{sma5Item.value.toFixed(2)}</span>
            </div>
          )}

          {sma15Item && sma15Item.value !== undefined && sma15Item.value !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-purple-400 flex items-center gap-1.5 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                SMA 15:
              </span>
              <span className="font-semibold text-purple-300">₹{sma15Item.value.toFixed(2)}</span>
            </div>
          )}

          {sma50Item && sma50Item.value !== undefined && sma50Item.value !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-blue-400 flex items-center gap-1.5 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                SMA 50:
              </span>
              <span className="font-semibold text-blue-300 font-mono">₹{sma50Item.value.toFixed(2)}</span>
            </div>
          )}

          {bbUpperItem && bbUpperItem.value !== undefined && bbUpperItem.value !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-rose-400 flex items-center gap-1.5 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                BB Upper:
              </span>
              <span className="font-semibold text-rose-300 font-mono">₹{bbUpperItem.value.toFixed(2)}</span>
            </div>
          )}

          {bbLowerItem && bbLowerItem.value !== undefined && bbLowerItem.value !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-teal-400 flex items-center gap-1.5 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                BB Lower:
              </span>
              <span className="font-semibold text-teal-300 font-mono">₹{bbLowerItem.value.toFixed(2)}</span>
            </div>
          )}

          {rsiItem && rsiItem.value !== undefined && rsiItem.value !== null && (
            <div className="flex items-center justify-between gap-4 border-t border-slate-800 pt-1.5 mt-1.5">
              <span className="text-pink-400 flex items-center gap-1.5 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-pink-500" />
                RSI (14):
              </span>
              <span className="font-semibold text-pink-300 font-mono">{rsiItem.value.toFixed(2)}</span>
            </div>
          )}

          {payload[0].payload.detectedPattern && (
            <div className="border-t border-slate-800 pt-1.5 mt-1.5 space-y-1">
              <span className="flex items-center gap-1 text-[10px] font-sans font-bold" style={{ color: payload[0].payload.detectedPattern.color }}>
                ↨ {payload[0].payload.detectedPattern.name} ({payload[0].payload.detectedPattern.abbreviation})
              </span>
              <p className="text-[9px] text-gray-400 dark:text-gray-400 leading-normal font-sans normal-case">
                {payload[0].payload.detectedPattern.description}
              </p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const renderPatternDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.detectedPattern) return <g />;
    const pattern = payload.detectedPattern;
    const isPatternBullish = pattern.isBullish;
    
    return (
      <g key={`pattern-dot-${payload.date}`} className="cursor-pointer select-none">
        <circle 
          cx={cx} 
          cy={cy} 
          r={7} 
          fill={pattern.color} 
          fillOpacity={0.2} 
          stroke={pattern.color} 
          strokeWidth={1.5}
          className="animate-pulse"
        />
        <circle 
          cx={cx} 
          cy={cy} 
          r={2.5} 
          fill={pattern.color} 
        />
        <g transform={`translate(${cx}, ${isPatternBullish ? cy - 16 : cy + 16})`}>
          <rect
            x={-18}
            y={-7}
            width={36}
            height={13}
            rx={3.5}
            fill={theme === 'dark' ? '#0f172a' : '#ffffff'}
            stroke={pattern.color}
            strokeWidth={1}
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}
          />
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={pattern.color}
            fontSize={7}
            fontWeight="bold"
            fontFamily="monospace"
          >
            {pattern.abbreviation}
          </text>
        </g>
      </g>
    );
  };

  const latestSma5 = sma5Data[sma5Data.length - 1];
  const latestSma15 = sma15Data[sma15Data.length - 1];
  
  let trendSignal: 'BUY' | 'SELL' | 'NEUTRAL' = 'NEUTRAL';
  if (latestSma5 !== null && latestSma15 !== null) {
    trendSignal = latestSma5 > latestSma15 ? 'BUY' : 'SELL';
  }

  const handleTabKeyDown = (e: React.KeyboardEvent, currentTab: typeof detailTab) => {
    const tabs: (typeof detailTab)[] = ['analysis', 'advisor', 'backtest', 'profile', 'stock-ai', 'research', 'news'];
    const currentIndex = tabs.indexOf(currentTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % tabs.length;
      setDetailTab(tabs[nextIndex]);
      document.getElementById(`detail-tab-${tabs[nextIndex]}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      setDetailTab(tabs[prevIndex]);
      document.getElementById(`detail-tab-${tabs[prevIndex]}`)?.focus();
    }
  };

  if (loadingDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-800/50 rounded-[2.5rem] p-8 shadow-2xl">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
        <span className="text-xs font-mono font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest animate-pulse">
          Querying stock record...
        </span>
      </div>
    );
  }

  if (detailError || !stock) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center py-24 text-center bg-white/60 dark:bg-gray-900/60 backdrop-blur-2xl border border-gray-200/50 dark:border-gray-800/50 rounded-[2.5rem] p-8 shadow-2xl space-y-4">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <p className="text-sm font-semibold text-rose-500">{detailError || 'Stock not found.'}</p>
        <p className="text-xs text-slate-400 max-w-sm">
          We encountered an issue loading data for {selectedTicker || 'the requested ticker'}. Please verify your network and retry.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setReloadAttempt(c => c + 1)}
            aria-label="Retry loading stock detail"
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md shadow-indigo-600/25"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Retry</span>
          </button>
          <button
            onClick={() => setSelectedTicker(null)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200/60 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  const isSmallCap = Boolean(
    (selectedSmallCapStock && selectedSmallCapStock.ticker === stock.ticker) ||
    (typeof stock.marketCap === 'number' && stock.marketCap > 0 && stock.marketCap < 20000)
  );

  if (isSmallCap && smallCapViewMode === 'point-to-point') {
    return (
      <SmallCapStockDetail
        stock={stock}
        smallCapData={selectedSmallCapStock?.ticker === stock.ticker ? selectedSmallCapStock : null}
        onBack={() => {
          setSelectedTicker(null);
          if (selectedSmallCapStock) {
            router.push('/small-cap-predictions');
          }
        }}
        isWatchlisted={isWatchlisted}
        onToggleWatchlist={() => toggleWatchlist(stock.ticker)}
        onSwitchToFullView={() => setSmallCapViewMode('full')}
      />
    );
  }

  const filteredDrawings = drawings.filter(d => d.ticker === stock.ticker);

  return (
    <div id="stock-detail-view-container" className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 md:bg-white/60 md:dark:bg-gray-900/60 md:backdrop-blur-2xl md:border md:border-gray-200/50 md:dark:border-gray-800/50 md:rounded-[2.5rem] p-0 sm:p-4 md:p-8 md:shadow-2xl md:shadow-indigo-500/5 relative overflow-hidden">
      
      {/* Decorative Background Orbs */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 rounded-full bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />

      {/* Small Cap Quick Switch to Point-to-Point Banner */}
      {isSmallCap && (
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl mb-4 text-xs">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
            <Zap className="h-4 w-4 text-emerald-600" /> Small Cap Stock ({stock.ticker}) — Viewing Full Pro Technical View
          </div>
          <button
            type="button"
            onClick={() => setSmallCapViewMode('point-to-point')}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="h-3.5 w-3.5" /> Switch to Point-to-Point View
          </button>
        </div>
      )}

      {/* Header action bar */}
      <div className="flex justify-between items-center pb-2 relative z-10">
        <button
          onClick={() => setSelectedTicker(null)}
          className="group flex items-center gap-2 px-4 py-2 border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/50 text-xs font-bold rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-sm"
          id="btn-back-to-dashboard"
        >
          <div className="p-1 rounded-md bg-gray-100 dark:bg-gray-800 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/50 transition-colors">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </div>
          <span>Back to Dashboard</span>
        </button>

        <div className="flex gap-3">
          {/* Watchlist toggle */}
          <button
            onClick={() => toggleWatchlist(stock.ticker)}
            className={`group flex items-center gap-2 px-4 py-2 rounded-xl border text-xs font-bold transition-all duration-300 cursor-pointer backdrop-blur-sm ${
              isWatchlisted
                ? 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-950/60 dark:to-amber-900/20 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400 shadow-md shadow-amber-500/10 hover:shadow-amber-500/20'
                : 'bg-white/50 dark:bg-gray-800/50 border-gray-200/50 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-800/50'
            }`}
            id={`btn-detail-toggle-watchlist-${stock.ticker}`}
          >
            <Star className={`h-4 w-4 ${isWatchlisted ? 'fill-current text-amber-500' : 'group-hover:scale-110'} transition-all`} />
            <span>{isWatchlisted ? 'Watchlisted' : 'Add to Watchlist'}</span>
          </button>
        </div>
      </div>

      {/* Stock Headline Metrics */}
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 sm:p-8 md:p-10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-2xl border border-gray-200/60 dark:border-gray-700/50 rounded-3xl shadow-xl shadow-indigo-500/5 overflow-hidden group z-10 animate-in zoom-in-95 duration-500">
        
        {/* Dynamic Price Glow Background */}
        <div className={`absolute -right-32 -bottom-32 w-96 h-96 rounded-full blur-[80px] opacity-20 transition-colors duration-1000 pointer-events-none ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} />
        <div className={`absolute top-0 right-1/4 w-64 h-64 rounded-full blur-[60px] opacity-10 transition-colors duration-1000 pointer-events-none ${isUp ? 'bg-teal-400' : 'bg-pink-400'}`} />

        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-4xl sm:text-5xl font-black font-sans tracking-tight bg-gradient-to-br from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent drop-shadow-sm">
              {stock.ticker}
            </span>
            <span className="text-[10px] sm:text-xs bg-gray-100/80 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-1.5 rounded-xl font-black uppercase tracking-wider backdrop-blur-md shadow-sm border border-gray-200/50 dark:border-gray-700/50">
              NSE EQUITY
            </span>
          </div>
          <h1 className="text-sm sm:text-base font-bold text-gray-500 dark:text-gray-400 mt-2 truncate max-w-xl">{stock.name}</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6 relative z-10">
          {/* Price Block */}
          <div className="flex flex-col items-end">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter text-gray-900 dark:text-white font-mono drop-shadow-md">
              ₹{stock.currentPrice.toFixed(2)}
            </span>
            {(() => {
              const currentStatus = withCurrentStatus(stock).quoteStatus;
              const isSimulated = stock.dataSource === 'simulated' || currentStatus === 'simulated';
              const sourceLabel = isSimulated ? 'Simulated' : (stock.dataSource || 'NSE / Yahoo Finance');
              const statusLabel = quoteStatusLabel(currentStatus);
              const timeLabel = stock.quoteAsOf
                ? `${new Date(stock.quoteAsOf).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST`
                : 'Quote time unavailable';
              return (
                <div data-testid="stock-detail-provenance" className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${isSimulated ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">{sourceLabel}</span>
                  <span>·</span>
                  <span>{statusLabel}</span>
                  <span>·</span>
                  <span>{timeLabel}</span>
                </div>
              );
            })()}
            <span className={`text-sm sm:text-base font-bold font-mono flex items-center gap-1 mt-1.5 px-3 py-1 rounded-lg border ${
              isUp 
                ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40' 
                : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/40'
            }`}>
              {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
              {Math.abs(stock.change).toFixed(2)} ({stock.changePercent.toFixed(2)}%)
            </span>
          </div>

          {/* Vertical Divider (desktop) */}
          <div className="hidden md:block h-16 w-px bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

          {/* Buy/Sell Trend Signal Indicator */}
          <div className="flex flex-col items-start sm:items-end gap-2" id="technical-trend-signal-indicator">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Technical Trend
            </span>
            {trendSignal === 'BUY' ? (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm" title="Short term 5-day SMA is above 15-day SMA (Bullish Trend)">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>BULLISH</span>
              </div>
            ) : trendSignal === 'SELL' ? (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/40 dark:to-pink-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/40 shadow-sm" title="Short term 5-day SMA is below 15-day SMA (Bearish Trend)">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
                <span>BEARISH</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm" title="Moving averages are equivalent or insufficient data">
                <span className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-500 shrink-0" />
                <span>NEUTRAL</span>
              </div>
            )}

            {/* Quick Order (Paper & Angel One) Button */}
            <button
              onClick={() => {
                playTargetChime();
                setShowQuickTrade(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20 hover:opacity-95 cursor-pointer transition-all shrink-0 active:scale-98"
              id="btn-stock-detail-quick-order"
              title="One-click trade with auto-calculated +2% / +10% target and stop loss"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span>Price Scenario</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Institutional Price Range & Key Stats Dock ─────────── */}
      {stock.history && stock.history.length > 0 && (() => {
        const dayLow = stock.low || stock.currentPrice * 0.98;
        const dayHigh = stock.high || stock.currentPrice * 1.02;
        const dayRangeSpan = Math.max(dayHigh - dayLow, 0.01);
        const dayPosPct = Math.min(100, Math.max(0, ((stock.currentPrice - dayLow) / dayRangeSpan) * 100));

        // 52-Week Low/High approximation from history
        const allCloses = stock.history.map((h: any) => h.close || h.price).filter(Boolean);
        const yearLow = allCloses.length > 0 ? Math.min(...allCloses) : dayLow * 0.8;
        const yearHigh = allCloses.length > 0 ? Math.max(...allCloses) : dayHigh * 1.2;
        const yearRangeSpan = Math.max(yearHigh - yearLow, 0.01);
        const yearPosPct = Math.min(100, Math.max(0, ((stock.currentPrice - yearLow) / yearRangeSpan) * 100));

        return (
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-5 sm:p-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/70 dark:border-slate-800/80 rounded-3xl shadow-sm">
            {/* Day's Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
                <span>Day&apos;s Range</span>
                <span className="text-indigo-600 dark:text-indigo-400">{dayPosPct.toFixed(0)}% of range</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-700"
                  style={{ width: '100%' }}
                />
              </div>
              {/* Needle Indicator */}
              <div className="relative w-full h-2">
                <div
                  className="absolute -top-3 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400 border-2 border-white dark:border-slate-900 shadow-md"
                  style={{ left: `${dayPosPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                <span>L: ₹{dayLow.toFixed(2)}</span>
                <span>H: ₹{dayHigh.toFixed(2)}</span>
              </div>
            </div>

            {/* 52-Week Range Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
                <span>52-Week Range</span>
                <span className="text-indigo-600 dark:text-indigo-400">{yearPosPct.toFixed(0)}% of range</span>
              </div>
              <div className="relative h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 transition-all duration-700"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="relative w-full h-2">
                <div
                  className="absolute -top-3 -translate-x-1/2 w-3 h-3 rounded-full bg-indigo-600 dark:bg-indigo-400 border-2 border-white dark:border-slate-900 shadow-md"
                  style={{ left: `${yearPosPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs font-mono font-black text-slate-800 dark:text-slate-200">
                <span>52W L: ₹{yearLow.toFixed(2)}</span>
                <span>52W H: ₹{yearHigh.toFixed(2)}</span>
              </div>
            </div>

            {/* Volume Stat */}
            <div className="flex flex-col justify-center px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Trading Volume
              </span>
              <span className="text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                {stock.volume > 1e6 ? `${(stock.volume / 1e6).toFixed(2)}M` : stock.volume > 1e3 ? `${(stock.volume / 1e3).toFixed(0)}K` : stock.volume} shares
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                NSE Real-time execution
              </span>
            </div>

            {/* Sector / Industry */}
            <div className="flex flex-col justify-center px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                Sector Classification
              </span>
              <span className="text-base font-black text-indigo-600 dark:text-indigo-400 truncate mt-0.5">
                {stock.sector || 'Nifty General'}
              </span>
              <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                Benchmark: NIFTY 50
              </span>
            </div>
          </div>
        );
      })()}

      {/* Penny Stock & Liquidity Warning Guard Banner */}
      {stock.currentPrice > 0 && stock.currentPrice < 20 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-300/70 bg-rose-50/90 p-4 text-xs leading-5 text-rose-950 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200 relative z-10">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div>
            <span className="font-black uppercase tracking-wider text-rose-700 dark:text-rose-300">
              ⚠️ HIGH RISK / PENNY STOCK ALERT (₹{stock.currentPrice.toFixed(2)} &lt; ₹20):
            </span>{' '}
            This share trades under ₹20 with elevated volatility, wider bid-ask spreads, and potential circuit freeze vulnerability.
            <strong className="block mt-1 text-rose-800 dark:text-rose-300">
              Execution Caution: Avoid intraday MIS margin leverage. Stop loss market orders cannot execute if the share is locked in a lower circuit.
            </strong>
          </div>
        </div>
      )}

      {/* Sub-Tab Navigator Block (Pill Segmented Control) */}
      <div className="flex justify-start relative z-10 w-full overflow-x-auto no-scrollbar pb-2 pt-2" id="detail-sub-tab-navigator">
        <div
          role="tablist"
          aria-label="Stock detail views"
          className="inline-flex flex-nowrap bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-sm gap-1.5"
        >
          <button
            role="tab"
            id="detail-tab-analysis"
            aria-selected={detailTab === 'analysis'}
            aria-controls="detail-panel-analysis"
            tabIndex={detailTab === 'analysis' ? 0 : -1}
            onClick={() => setDetailTab('analysis')}
            onKeyDown={(e) => handleTabKeyDown(e, 'analysis')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider relative cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-2 ${
              detailTab === 'analysis'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
            }`}
          >
            <BarChart2 className={`h-4 w-4 ${detailTab === 'analysis' ? 'text-indigo-200' : 'text-gray-400'}`} />
            Technical Analysis
          </button>
          <button
            role="tab"
            id="detail-tab-advisor"
            aria-selected={detailTab === 'advisor'}
            aria-controls="detail-panel-advisor"
            tabIndex={detailTab === 'advisor' ? 0 : -1}
            onClick={() => setDetailTab('advisor')}
            onKeyDown={(e) => handleTabKeyDown(e, 'advisor')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider relative cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-2 ${
              detailTab === 'advisor'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
            }`}
          >
            <Sparkles className={`h-4 w-4 ${detailTab === 'advisor' ? 'text-amber-300 animate-pulse' : 'text-gray-400'} shrink-0`} />
            <span className="whitespace-nowrap">FRIDAY Trade Advisor</span>
          </button>
          <button
            role="tab"
            id="detail-tab-backtest"
            aria-selected={detailTab === 'backtest'}
            aria-controls="detail-panel-backtest"
            tabIndex={detailTab === 'backtest' ? 0 : -1}
            onClick={() => setDetailTab('backtest')}
            onKeyDown={(e) => handleTabKeyDown(e, 'backtest')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider relative cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-2 ${
              detailTab === 'backtest'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
            }`}
          >
            <TrendingUp className={`h-4 w-4 ${detailTab === 'backtest' ? 'text-indigo-200' : 'text-gray-400'} shrink-0`} />
            <span className="whitespace-nowrap">Strategy Backtester</span>
          </button>
          <button
            role="tab"
            id="detail-tab-profile"
            aria-selected={detailTab === 'profile'}
            aria-controls="detail-panel-profile"
            tabIndex={detailTab === 'profile' ? 0 : -1}
            onClick={() => setDetailTab('profile')}
            onKeyDown={(e) => handleTabKeyDown(e, 'profile')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider relative cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-2 ${
              detailTab === 'profile'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100/80 dark:hover:bg-gray-800/80'
            }`}
          >
            <Building2 className={`h-4 w-4 ${detailTab === 'profile' ? 'text-indigo-200' : 'text-gray-400'} shrink-0`} />
            <span className="whitespace-nowrap">Company Profile</span>
          </button>
          <button
            role="tab"
            id="detail-tab-stock-ai"
            aria-selected={detailTab === 'stock-ai'}
            aria-controls="detail-panel-stock-ai"
            tabIndex={detailTab === 'stock-ai' ? 0 : -1}
            onClick={() => setDetailTab('stock-ai')}
            onKeyDown={(e) => handleTabKeyDown(e, 'stock-ai')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider relative cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-2 ${
              detailTab === 'stock-ai'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50/80 dark:hover:bg-emerald-950/40 border border-transparent hover:border-emerald-200/50 dark:hover:border-emerald-800/50'
            }`}
          >
            <Cpu className={`h-4 w-4 ${detailTab === 'stock-ai' ? 'text-white animate-spin' : 'text-emerald-500'} shrink-0`} />
            <span className="whitespace-nowrap">Stock AI (+2% Model)</span>
          </button>
          <button
            role="tab"
            id="detail-tab-research"
            aria-selected={detailTab === 'research'}
            aria-controls="detail-panel-research"
            tabIndex={detailTab === 'research' ? 0 : -1}
            onClick={() => setDetailTab('research')}
            onKeyDown={(e) => handleTabKeyDown(e, 'research')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider cursor-pointer rounded-xl transition-colors flex items-center gap-2 ${detailTab === 'research' ? 'bg-indigo-600 text-white' : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'}`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Research Team</span>
          </button>
          <button
            role="tab"
            id="detail-tab-news"
            aria-selected={detailTab === 'news'}
            aria-controls="detail-panel-news"
            tabIndex={detailTab === 'news' ? 0 : -1}
            onClick={() => setDetailTab('news')}
            onKeyDown={(e) => handleTabKeyDown(e, 'news')}
            className={`px-6 py-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider relative cursor-pointer rounded-xl transition-all duration-300 flex items-center gap-2 ${
              detailTab === 'news'
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/25'
                : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 border border-transparent hover:border-blue-200/50 dark:hover:border-blue-800/50'
            }`}
          >
            <Newspaper className={`h-4 w-4 ${detailTab === 'news' ? 'text-white' : 'text-blue-500'} shrink-0`} />
            <span className="whitespace-nowrap">News & Catalysts</span>
          </button>
        </div>
      </div>

      {detailTab === 'analysis' && (
        <div role="tabpanel" id="detail-panel-analysis" aria-labelledby="detail-tab-analysis" className="animate-in slide-in-from-bottom-2 fade-in duration-500 space-y-6">
          {/* Recharts Area Chart with Moving Averages */}
          <div className="bg-white/40 dark:bg-gray-900/40 backdrop-blur-md border border-gray-200/60 dark:border-gray-700/50 rounded-2xl md:rounded-[2rem] p-3.5 sm:p-5 md:p-6 shadow-xl shadow-indigo-900/5 space-y-4 sm:space-y-5 relative z-10">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-gray-200/50 dark:border-gray-800/80 pb-4">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {period === '1d' ? '1-Day' : period === '7d' ? '1-Week' : period === '30d' ? '30-Day' : period === '90d' ? '90-Day' : 'Custom Range'} Simulated Trading History
            </h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Overlaid with technical Simple Moving Averages (SMA)</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
            {/* Chart Engine Selector */}
            <div className="flex bg-gray-100/85 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200/40 dark:border-gray-700" id="chart-engine-selector-group">
              <button
                onClick={() => {
                  setChartEngine('recharts');
                  setChartStyle('line');
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  chartEngine === 'recharts'
                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-extrabold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                id="btn-engine-recharts"
                title="Use interactive Recharts area chart"
              >
                Recharts
              </button>
              <button
                onClick={() => setChartEngine('d3')}
                className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  chartEngine === 'd3'
                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-extrabold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                id="btn-engine-d3"
                title="Use custom high-fidelity D3.js line chart"
              >
                D3.js
              </button>
            </div>

            <span className="h-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

            {/* Chart Style Toggle */}
            <div className="flex bg-gray-100/85 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200/40 dark:border-gray-700" id="chart-style-selector-group">
              <button
                onClick={() => setChartStyle('line')}
                className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  chartStyle === 'line'
                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-extrabold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                id="btn-style-line"
                title="Use standard Line chart representation"
              >
                Line
              </button>
              <button
                onClick={() => {
                  setChartStyle('candlestick');
                  setChartEngine('d3');
                }}
                className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  chartStyle === 'candlestick'
                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-extrabold'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                id="btn-style-candlestick"
                title="Use Candlestick chart representation (forces D3.js)"
              >
                Candles
              </button>
            </div>

            <span className="h-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

            {/* Timeframe Selector Segment Control */}
            <div className="flex bg-gray-100/85 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200/40 dark:border-gray-700 relative overflow-hidden" id="timeframe-segment-control">
              {(['1d', '7d', '30d', '90d', '1y', 'custom'] as const).map((p) => {
                const isActive = period === p;
                return (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-md text-[10px] sm:text-[11px] font-bold uppercase transition-all duration-200 cursor-pointer relative z-10 ${
                      isActive
                        ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-extrabold scale-[1.02]'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    id={`btn-period-${p}`}
                    title={`Switch to ${
                      p === '1d' ? '1 Day' : 
                      p === '7d' ? '1 Week' : 
                      p === '30d' ? '1 Month' : 
                      p === '90d' ? '3 Months' : 
                      p === '1y' ? '1 Year' : 'Custom date range'
                    }`}
                  >
                    {p === '1d' ? '1D' : p === '7d' ? '1W' : p === '30d' ? '1M' : p === '90d' ? '3M' : p === '1y' ? '1Y' : 'Custom'}
                  </button>
                );
              })}
            </div>

            <span className="h-4 w-px bg-gray-200 dark:bg-gray-800 hidden sm:block" />

            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-gray-400 dark:text-gray-500 font-mono text-[9px] uppercase mr-1">Toggles:</span>
              
              {/* SMA 5 Toggle */}
              <button
                onClick={() => setShowSma5(!showSma5)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showSma5 
                    ? 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 shadow-sm shadow-amber-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-sma5"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showSma5 ? 'bg-amber-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>SMA 5</span>
              </button>

              {/* SMA 15 Toggle */}
              <button
                onClick={() => setShowSma15(!showSma15)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showSma15 
                    ? 'bg-purple-50 dark:bg-purple-950/25 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 shadow-sm shadow-purple-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-sma15"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showSma15 ? 'bg-purple-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>SMA 15</span>
              </button>

              {/* SMA 50 Toggle */}
              <button
                onClick={() => setShowSma50(!showSma50)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showSma50 
                    ? 'bg-blue-50 dark:bg-blue-950/25 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 shadow-sm shadow-blue-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-sma50"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showSma50 ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>SMA 50</span>
              </button>

              {/* Bollinger Bands Toggle */}
              <button
                onClick={() => setShowBollinger(!showBollinger)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showBollinger 
                    ? 'bg-teal-50 dark:bg-teal-950/25 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 shadow-sm shadow-teal-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-bollinger"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showBollinger ? 'bg-teal-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>Bollinger Bands</span>
              </button>

              {/* RSI Toggle */}
              <button
                onClick={() => setShowRsi(!showRsi)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showRsi 
                    ? 'bg-pink-50 dark:bg-pink-950/25 border-pink-200 dark:border-pink-800 text-pink-700 dark:text-pink-400 shadow-sm shadow-pink-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-rsi"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showRsi ? 'bg-pink-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>RSI (14)</span>
              </button>

              {/* Candlestick Patterns Toggle */}
              <button
                onClick={() => setShowPatterns(!showPatterns)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showPatterns 
                    ? 'bg-emerald-50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm shadow-emerald-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-patterns"
                title="Toggle candlestick pattern scanner"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${showPatterns ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                <span>Patterns Scanner</span>
              </button>

              {/* Interactive Legend Toggle */}
              <button
                onClick={() => setShowLegendOverlay(!showLegendOverlay)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all cursor-pointer ${
                  showLegendOverlay 
                    ? 'bg-indigo-50 dark:bg-indigo-950/25 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-500/5' 
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                id="btn-toggle-legend"
                title="Toggle chart interactive legend overlay"
              >
                {showLegendOverlay ? (
                  <Eye className="h-3.5 w-3.5 text-indigo-500" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                <span>Legend</span>
              </button>
            </div>
          </div>
        </div>

        {/* Custom Date Range Picker Block */}
        {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/60 dark:border-indigo-900/20 p-3 rounded-xl animate-in slide-in-from-top-1 duration-200" id="custom-date-range-panel">
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse shrink-0" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-bold">Custom Timeframe Selector:</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-bold uppercase">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  min={stock.history[0]?.date}
                  max={customEndDate || stock.history[stock.history.length - 1]?.date}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
                  id="custom-date-start"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-bold uppercase">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || stock.history[0]?.date}
                  max={stock.history[stock.history.length - 1]?.date}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono cursor-pointer"
                  id="custom-date-end"
                />
              </div>

              <button
                onClick={() => {
                  if (stock && stock.history.length > 0) {
                    setCustomStartDate(stock.history[0].date);
                    setCustomEndDate(stock.history[stock.history.length - 1].date);
                  }
                }}
                className="text-[9px] font-mono font-bold uppercase bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-md cursor-pointer transition-colors text-indigo-600 dark:text-indigo-400"
                id="btn-reset-custom-dates"
              >
                Full Range
              </button>
            </div>

            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-semibold ml-auto flex items-center gap-1.5">
              <span>Selected Scope:</span>
              <span className="bg-indigo-100/50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold">
                {chartData.length} Days
              </span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-1" id="technical-analysis-workstation">
          {/* Left Column: Charting Canvas (xl:col-span-9) */}
          <div className="xl:col-span-9 space-y-4" id="charting-canvas-panel">
            {showLegendOverlay && (
              <div 
                className="mb-2 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md border border-gray-200/50 dark:border-gray-800/60 rounded-xl p-2 sm:p-2.5 shadow-md flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[9px] sm:text-[11px] font-mono animate-in fade-in duration-200"
                id="chart-legend-overlay-card"
              >
                  {/* Price Series */}
                  <div 
                    className="flex items-center gap-1 select-none"
                    title="Active Price"
                  >
                    <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${isUp ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'}`} />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Price:</span>
                    <span className="font-extrabold text-gray-800 dark:text-gray-100">
                      ₹{activeDataPoint?.price?.toFixed(2) || 'N/A'}
                    </span>
                  </div>

                  {/* SMA 5 Series */}
                  <div 
                    onClick={() => setShowSma5(!showSma5)}
                    className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showSma5 ? 'opacity-100' : 'opacity-40'}`}
                    title="Click to toggle SMA 5"
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500" />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">SMA 5:</span>
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">
                      ₹{activeDataPoint?.sma5?.toFixed(2) || 'N/A'}
                    </span>
                    {showSma5 && <Check className="h-2.5 w-2.5 text-amber-500 stroke-[3]" />}
                  </div>

                  {/* SMA 15 Series */}
                  <div 
                    onClick={() => setShowSma15(!showSma15)}
                    className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showSma15 ? 'opacity-100' : 'opacity-40'}`}
                    title="Click to toggle SMA 15"
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-purple-500" />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">SMA 15:</span>
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">
                      ₹{activeDataPoint?.sma15?.toFixed(2) || 'N/A'}
                    </span>
                    {showSma15 && <Check className="h-2.5 w-2.5 text-purple-500 stroke-[3]" />}
                  </div>

                  {/* SMA 50 Series */}
                  <div 
                    onClick={() => setShowSma50(!showSma50)}
                    className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showSma50 ? 'opacity-100' : 'opacity-40'}`}
                    title="Click to toggle SMA 50"
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-blue-500" />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">SMA 50:</span>
                    <span className="font-extrabold text-blue-600 dark:text-blue-400">
                      ₹{activeDataPoint?.sma50?.toFixed(2) || 'N/A'}
                    </span>
                    {showSma50 && <Check className="h-2.5 w-2.5 text-blue-500 stroke-[3]" />}
                  </div>

                  {/* Bollinger Bands Series */}
                  <div 
                    onClick={() => setShowBollinger(!showBollinger)}
                    className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showBollinger ? 'opacity-100' : 'opacity-40'}`}
                    title="Click to toggle Bollinger Bands"
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-teal-500" />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Bands:</span>
                    <span className="font-extrabold text-teal-600 dark:text-teal-400">
                      {activeDataPoint?.bbUpper ? `₹${activeDataPoint.bbLower.toFixed(0)}-${activeDataPoint.bbUpper.toFixed(0)}` : 'N/A'}
                    </span>
                    {showBollinger && <Check className="h-2.5 w-2.5 text-teal-500 stroke-[3]" />}
                  </div>

                  {/* RSI Indicator Status */}
                  <div 
                    onClick={() => setShowRsi(!showRsi)}
                    className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showRsi ? 'opacity-100' : 'opacity-40'}`}
                    title="Click to toggle RSI"
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-pink-500" />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">RSI:</span>
                    <span className="font-extrabold text-pink-600 dark:text-pink-400">
                      {activeDataPoint?.rsi?.toFixed(1) || 'N/A'}
                    </span>
                    {showRsi && <Check className="h-2.5 w-2.5 text-pink-500 stroke-[3]" />}
                  </div>

                  {/* Candlestick Pattern Scanner Status */}
                  <div 
                    onClick={() => setShowPatterns(!showPatterns)}
                    className={`flex items-center gap-1 cursor-pointer select-none px-1.5 py-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${showPatterns ? 'opacity-100' : 'opacity-40'}`}
                    title="Click to toggle Patterns Scanner"
                  >
                    <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500" />
                    <span className="font-sans font-bold text-gray-500 dark:text-gray-400">Pattern:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                      {activeDataPoint?.detectedPattern ? activeDataPoint.detectedPattern.name : 'None'}
                    </span>
                    {showPatterns && <Check className="h-2.5 w-2.5 text-emerald-500 stroke-[3]" />}
                  </div>

                  {/* Date Badge */}
                  <div className="text-[8px] sm:text-[9px] bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 font-mono px-1.5 py-0.5 rounded-md ml-1 select-none">
                    {activeDataPoint?.date || 'N/A'}
                  </div>
                </div>
              )}
            <div className={`h-64 sm:h-72 w-full relative transition-all ${activeDrawingMode !== 'none' ? 'cursor-crosshair animate-pulse border border-indigo-500/10 dark:border-indigo-500/20 rounded-xl bg-indigo-500/2' : ''}`} id="stock-recharts-container">
              {chartEngine === 'd3' ? (
                <D3LineChart
                  data={chartData}
                  isUp={isUp}
                  showSma5={showSma5}
                  showSma15={showSma15}
                  showSma20={false}
                  showSma50={showSma50}
                  showBollinger={showBollinger}
                  showPatterns={showPatterns}
                  theme={theme}
                  onHoverPoint={setHoveredPointData}
                  hoveredPointData={hoveredPointData}
                  chartStyle={chartStyle}
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart 
                    syncId="stock-charts" 
                    data={chartData} 
                    margin={{ top: 10, right: 5, left: -20, bottom: 0 }}
                    onClick={(data) => {
                      if (activeDrawingMode === 'none' || !data) return;
                      if (data.activePayload && data.activePayload.length > 0) {
                        const price = data.activePayload[0].payload.price;
                        const date = data.activePayload[0].payload.date;
                        
                        const newLine = {
                          id: Math.random().toString(36).substring(2, 9),
                          ticker: stock.ticker,
                          type: activeDrawingMode,
                          price: Number(price.toFixed(2)),
                          label: `${activeDrawingMode === 'support' ? 'Support' : 'Resistance'} Level (${date})`,
                          style: 'dashed' as const,
                          visible: true
                        };
                        
                        const updated = [...drawings, newLine];
                        saveDrawings(updated);
                        
                        addToast(
                          `Placed ${activeDrawingMode === 'support' ? 'Support' : 'Resistance'} line at ₹${price.toFixed(2)} (Snapped to ${date})`,
                          'success',
                          stock.ticker
                        );
                      }
                    }}
                    onMouseMove={(data) => {
                      if (data && data.activePayload && data.activePayload.length > 0) {
                        setHoveredPointData(data.activePayload[0].payload);
                      } else {
                        setHoveredPointData(null);
                      }
                      if (activeDrawingMode === 'none' || !data) {
                        if (hoveredPrice !== null) setHoveredPrice(null);
                        return;
                      }
                      if (data.activePayload && data.activePayload.length > 0) {
                        const price = data.activePayload[0].payload.price;
                        setHoveredPrice(price);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredPointData(null);
                      setHoveredPrice(null);
                    }}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={isUp ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#1e293b" : "#f1f5f9"} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} 
                      stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} 
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} 
                      stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke={isUp ? "#10b981" : "#ef4444"} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      activeDot={{ r: 5 }}
                    />
                    {showSma5 && (
                      <Line
                        type="monotone"
                        dataKey="sma5"
                        stroke="#f59e0b"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                        id="line-sma5"
                      />
                    )}
                    {showSma15 && (
                      <Line
                        type="monotone"
                        dataKey="sma15"
                        stroke="#8b5cf6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                        id="line-sma15"
                      />
                    )}
                    {showSma50 && (
                      <Line
                        type="monotone"
                        dataKey="sma50"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 4 }}
                        id="line-sma50"
                      />
                    )}
                    {showBollinger && (
                      <Line
                        type="monotone"
                        dataKey="bbUpper"
                        stroke="#f43f5e"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 3 }}
                        id="line-bb-upper"
                      />
                    )}
                    {showBollinger && (
                      <Line
                        type="monotone"
                        dataKey="bbLower"
                        stroke="#14b8a6"
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        dot={false}
                        activeDot={{ r: 3 }}
                        id="line-bb-lower"
                      />
                    )}

                    {showPatterns && (
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="transparent"
                        strokeWidth={0}
                        dot={renderPatternDot}
                        activeDot={false}
                        id="line-candlestick-patterns"
                      />
                    )}

                    {/* Manual Charting Drawings (Drawn Levels) */}
                    {drawings
                      .filter(d => d.ticker === stock.ticker && d.visible)
                      .map(d => (
                        <ReferenceLine
                          key={d.id}
                          y={d.price}
                          stroke={d.type === 'support' ? '#10b981' : '#ef4444'}
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          label={{
                            value: `${d.label || (d.type === 'support' ? 'Support' : 'Resistance')}: ₹${d.price.toFixed(2)}`,
                            position: 'top',
                            fill: d.type === 'support' ? '#10b981' : '#ef4444',
                            fontSize: 9,
                            fontFamily: 'monospace',
                            fontWeight: 'bold'
                          }}
                        />
                      ))}

                    {/* Hover Drawing Preview Line */}
                    {hoveredPrice !== null && (
                      <ReferenceLine
                        y={hoveredPrice}
                        stroke={activeDrawingMode === 'support' ? '#10b981' : '#ef4444'}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        opacity={0.7}
                        label={{
                          value: `Place ${activeDrawingMode === 'support' ? 'Support' : 'Resistance'} @ ₹${hoveredPrice.toFixed(2)}`,
                          position: 'top',
                          fill: activeDrawingMode === 'support' ? '#10b981' : '#ef4444',
                          fontSize: 9,
                          fontFamily: 'monospace',
                          fontWeight: 'bold'
                        }}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* RSI Sub-Chart Panel when toggled */}
            {showRsi && (
              <div className="h-32 w-full border-t border-gray-200 dark:border-gray-800 pt-4 mt-2 animate-in fade-in duration-200" id="rsi-sub-chart-container">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    RSI (14) Relative Strength Index
                  </h4>
                  <span className="text-[9px] bg-pink-50 dark:bg-pink-950/20 text-pink-600 dark:text-pink-400 font-bold px-2 py-0.5 rounded-full border border-pink-100 dark:border-pink-900/30">
                    Oscillator (0 - 100)
                  </span>
                </div>
                <div className="h-24 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart syncId="stock-charts" data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? "#1e293b" : "#f1f5f9"} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} 
                        stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} 
                        hide={true}
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        ticks={[30, 50, 70]}
                        tick={{ fontSize: 8, fill: '#94a3b8', fontFamily: 'monospace' }} 
                        stroke={theme === 'dark' ? "#334155" : "#e2e8f0"} 
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="rsi"
                        stroke="#ec4899"
                        strokeWidth={2}
                        fill="#ec4899"
                        fillOpacity={0.06}
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Technical Indicators</strong> help analyze trading behavior:
                  {showSma5 && <span> <strong>SMA 5</strong> reacts quickly to rapid short-term changes.</span>}
                  {showSma15 && <span> <strong>SMA 15</strong> offers medium-term perspectives.</span>}
                  {showSma50 && <span> <strong>SMA 50</strong> tracks major long-term structural trends.</span>}
                  {showBollinger && <span> <strong>Bollinger Bands (20, 2)</strong> visualize volatility bounds (Upper and Lower levels around average price).</span>}
                  {showRsi && <span> <strong>RSI (14)</strong> measures momentum; values above 70 flag overbought territory while values below 30 flag oversold territory.</span>}
                  {!showSma5 && !showSma15 && !showSma50 && !showBollinger && !showRsi && <span> Toggle moving averages, volatility bands, or oscillators above to overlay indicators.</span>}
                </span>
              </div>
            </div>

            {/* Candlestick Pattern Scan Summary details block */}
            {showPatterns && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800/60 rounded-2xl p-4 space-y-3 mt-4" id="candlestick-patterns-summary-panel">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <h4 className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Scan Summary</h4>
                      <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">Candlestick Patterns Detected</h3>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                    Live Scanner Active
                  </span>
                </div>

                {visiblePatterns.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* List of detected setups */}
                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/40 dark:bg-gray-950/20">
                      <h5 className="text-[10px] font-mono font-bold uppercase text-gray-400 dark:text-gray-500 mb-2 flex items-center justify-between">
                        <span>📋 Recent Scanned Setups</span>
                        <span className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-[8px] px-1.5 py-0.5 rounded-full font-mono font-bold">
                          {visiblePatterns.length} Found
                        </span>
                      </h5>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                        {visiblePatterns.slice().reverse().map((p: any, idx: number) => (
                          <div 
                            key={`list-pattern-${idx}`} 
                            onClick={() => {
                              setHoveredPointData(p);
                              const detailElement = document.getElementById('stock-recharts-container');
                              if (detailElement) {
                                detailElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500/50 cursor-pointer transition-all"
                            title="Click to highlight on chart"
                          >
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: p.detectedPattern!.color }} />
                              <div>
                                <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                                  <span>{p.detectedPattern!.name}</span>
                                  <span className="text-[8px] px-1 bg-gray-100 dark:bg-gray-800 rounded-sm text-gray-400 font-mono font-normal">
                                    {p.detectedPattern!.abbreviation}
                                  </span>
                                </div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                  {p.date}
                                </div>
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <div className="font-bold text-gray-700 dark:text-gray-300 text-xs">
                                ₹{p.price.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-gray-400 dark:text-gray-500">
                                O: {p.open.toFixed(0)} C: {p.close.toFixed(0)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pattern Guide / Glossary */}
                    <div className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-gray-50/40 dark:bg-gray-950/20 space-y-2 text-xs">
                      <h5 className="text-[10px] font-mono font-bold uppercase text-gray-400 dark:text-gray-500 mb-1">
                        📊 Scanned Setups Legend &amp; Guide
                      </h5>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        <div>
                          <h6 className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Bullish Engulfing / Hammer (HAM, B-ENG)
                          </h6>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                            Hammers show deep sellers rejected by strong buyers. Bullish Engulfings occur when a large green body swallows the previous red session, alerting a major buying surge.
                          </p>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5">
                          <h6 className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                            Bearish Engulfing (S-ENG)
                          </h6>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                            A large red body engulfs the body of the previous green candle, indicating intense selling distribution that has overcome buying efforts.
                          </p>
                        </div>
                        <div className="border-t border-gray-100 dark:border-gray-800 pt-1.5">
                          <h6 className="font-bold text-amber-500 flex items-center gap-1 text-[11px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Doji (DOJI)
                          </h6>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                            Indicates absolute equilibrium or indecision between buyers and sellers. Often warns that the current trend is exhausted and ready to turn.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/20 dark:bg-gray-950/10 text-center space-y-1.5">
                    <HelpCircle className="h-5 w-5 text-gray-300 dark:text-gray-700 animate-pulse" />
                    <h6 className="text-xs font-bold text-gray-700 dark:text-gray-300">No Candlestick Patterns Detected</h6>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 max-w-sm leading-normal">
                      Try extending the timeframe period (e.g. to 90 Days) or select a custom date range with higher volatility to find valid configurations.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Manual Drawings Toolkit Panel */}
          <div className="xl:col-span-3 bg-white/60 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/50 shadow-lg shadow-gray-200/20 dark:shadow-none rounded-2xl md:rounded-3xl p-4 sm:p-5 flex flex-col justify-between" id="manual-drawings-workspace">
            <div className="space-y-5">
              <div className="flex items-center gap-3 border-b border-gray-200/50 dark:border-gray-700/50 pb-3">
                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                  <Crosshair className="h-4 w-4 animate-spin-slow text-indigo-500" />
                </div>
                <div>
                  <h4 className="text-[9px] font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">Manual Charting</h4>
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">Drawing Board</h3>
                </div>
              </div>

              {/* Toggle drawing mode buttons */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 block font-bold">Select Active Tool:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      if (activeDrawingMode === 'support') {
                        setActiveDrawingMode('none');
                        addToast("Support drawing tool deactivated", "info", stock.ticker);
                      } else {
                        setActiveDrawingMode('support');
                        addToast("Support tool activated. Click on the chart to place support.", "info", stock.ticker);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 border text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeDrawingMode === 'support'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-extrabold ring-1 ring-emerald-500/20'
                        : 'bg-white dark:bg-gray-800 border-gray-205 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    id="btn-draw-support-tool"
                    title="Click on price chart to snap horizontal Support line"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>+ Support</span>
                  </button>

                  <button
                    onClick={() => {
                      if (activeDrawingMode === 'resistance') {
                        setActiveDrawingMode('none');
                        addToast("Resistance drawing tool deactivated", "info", stock.ticker);
                      } else {
                        setActiveDrawingMode('resistance');
                        addToast("Resistance tool activated. Click on the chart to place resistance.", "info", stock.ticker);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 border text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                      activeDrawingMode === 'resistance'
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-500 text-rose-700 dark:text-rose-400 font-extrabold ring-1 ring-rose-500/20'
                        : 'bg-white dark:bg-gray-800 border-gray-205 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    id="btn-draw-resistance-tool"
                    title="Click on price chart to snap horizontal Resistance line"
                  >
                    <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    <span>+ Resistance</span>
                  </button>
                </div>

                {activeDrawingMode !== 'none' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mt-2">
                    <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 leading-tight">
                      🏯 Drawing Mode Active: Click on the price chart to snap your <strong>{activeDrawingMode}</strong> level to the closing price.
                    </p>
                    <button
                      onClick={() => setActiveDrawingMode('none')}
                      className="text-[9px] font-bold uppercase text-gray-500 hover:text-gray-700 dark:hover:text-white mt-1 border border-gray-300 dark:border-gray-600 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                    >
                      Cancel Tool
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Input Numeric Form */}
              <div className="space-y-2 border-t border-gray-200/50 dark:border-gray-800 pt-3">
                <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 block font-bold">Numeric Level Entry:</span>
                <div className="space-y-2">
                  <div className="flex flex-col xl:flex-row gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="Price (e.g. 1420.50)"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      className="flex-1 min-w-0 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-gray-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                      id="input-manual-price-level"
                    />
                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value as 'support' | 'resistance')}
                      className="shrink-0 w-full xl:w-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-2 pr-6 py-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-300 focus:outline-hidden cursor-pointer"
                    >
                      <option value="support">Sup</option>
                      <option value="resistance">Res</option>
                    </select>
                  </div>

                  <input
                    type="text"
                    placeholder="Label / note (e.g. Pivot support)"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    id="input-manual-label"
                  />

                  <button
                    onClick={() => {
                      const priceNum = parseFloat(manualPrice);
                      if (isNaN(priceNum) || priceNum <= 0) {
                        addToast("Please enter a valid positive price level", "warning", stock.ticker);
                        return;
                      }
                      
                      const newLine = {
                        id: Math.random().toString(36).substring(2, 9),
                        ticker: stock.ticker,
                        type: manualType,
                        price: Number(priceNum.toFixed(2)),
                        label: manualLabel.trim() || `${manualType === 'support' ? 'Support' : 'Resistance'} Level`,
                        style: 'dashed' as const,
                        visible: true
                      };
                      
                      const updated = [...drawings, newLine];
                      saveDrawings(updated);
                      setManualPrice('');
                      setManualLabel('');
                      addToast(`Added manual ${manualType} at ₹${priceNum.toFixed(2)}`, 'success', stock.ticker);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm shadow-indigo-600/15 hover:shadow-indigo-600/30"
                    id="btn-add-manual-drawing"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Custom Level</span>
                  </button>
                </div>
              </div>

              {/* Drawing Layers List */}
              <div className="space-y-2 border-t border-gray-200/50 dark:border-gray-800 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold">Manual Chart Layers ({filteredDrawings.length}):</span>
                  {filteredDrawings.length > 0 && (
                    <button
                      onClick={() => {
                        if (confirm("Delete all drawings on this stock?")) {
                          const updated = drawings.filter(d => d.ticker !== stock.ticker);
                          saveDrawings(updated);
                          addToast("All manual drawings cleared for this stock", "info", stock.ticker);
                        }
                      }}
                      className="text-[9px] font-mono uppercase text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                      title="Delete all drawings on this stock"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>

                {filteredDrawings.length === 0 ? (
                  <div className="text-center p-4 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-400 dark:text-gray-500 text-[10px] leading-relaxed">
                    <Crosshair className="h-5 w-5 mx-auto mb-1.5 opacity-40 text-gray-400" />
                    <span>No manual levels. Use Support/Resistance tools above and click on the chart to start charting.</span>
                  </div>
                ) : (
                  <div className="max-h-[160px] overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-800">
                    {filteredDrawings.map((drawing) => (
                      <div
                        key={drawing.id}
                        className={`flex items-center justify-between p-2 rounded-lg border border-gray-200/50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-[11px] group transition-all hover:bg-gray-100/30 dark:hover:bg-gray-800/40`}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${drawing.type === 'support' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <div className="truncate flex-1">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 truncate font-sans" title={drawing.label}>
                              {drawing.label}
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono font-semibold">
                              ₹{drawing.price.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          {/* Toggle visibility */}
                          <button
                            onClick={() => {
                              const updated = drawings.map(d => d.id === drawing.id ? { ...d, visible: !d.visible } : d);
                              saveDrawings(updated);
                            }}
                            className="p-1 border border-gray-200/50 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400 cursor-pointer transition-colors"
                            title={drawing.visible ? "Hide on chart" : "Show on chart"}
                          >
                            {drawing.visible ? (
                              <Eye className="h-3 w-3 text-indigo-500" />
                            ) : (
                              <EyeOff className="h-3 w-3" />
                            )}
                          </button>

                          {/* Delete drawing */}
                          <button
                            onClick={() => {
                              const updated = drawings.filter(d => d.id !== drawing.id);
                              saveDrawings(updated);
                              addToast(`Deleted ${drawing.type} line at ₹${drawing.price.toFixed(2)}`, 'info', stock.ticker);
                            }}
                            className="p-1 border border-gray-200/50 dark:border-gray-800 hover:border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/20 bg-white dark:bg-gray-800 rounded-md text-gray-400 hover:text-rose-500 cursor-pointer transition-colors"
                            title="Remove drawing"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-gray-200/40 dark:border-gray-800/40 text-[9px] text-gray-400 dark:text-gray-500 leading-relaxed font-sans">
              ℹ️ Levels drawn are strictly anchored to the price data index. They stay perfectly positioned and scaled when resizing or swapping chart timeframes!
            </div>
          </div>
        </div>
      </div>

      {/* Local Ollama AI Catalyst & Risk Review (100% Free / Offline) */}
      <LocalOllamaCatalystWidget
        ticker={stock.ticker}
        name={stock.name}
        currentPrice={stock.currentPrice}
        history={stock.history}
      />

      {/* Gemini AI Market Analysis */}
      <div className="bg-gradient-to-br from-indigo-500/5 via-violet-500/5 to-transparent dark:from-indigo-950/20 dark:via-violet-950/10 border border-indigo-100/30 dark:border-indigo-900/30 rounded-2xl p-4 sm:p-5 space-y-4" id="gemini-ai-summary-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400 border border-indigo-100/30 dark:border-indigo-900/40 shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                FRIDAY AI Market Summary
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium font-sans">Generate a comprehensive, quantitative multi-indicator market trend briefing</p>
            </div>
          </div>

          <button
            onClick={generateReport}
            disabled={loadingAi}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-800 dark:disabled:to-gray-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm shadow-indigo-600/10 hover:shadow-indigo-600/20 shrink-0 ${loadingAi ? 'animate-pulse' : ''}`}
            id="btn-generate-gemini-summary"
          >
            {loadingAi ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Analysing Indicators...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 fill-current shrink-0 animate-bounce" />
                <span>Ask FRIDAY AI</span>
              </>
            )}
          </button>
        </div>

        {/* Error State */}
        {aiError && (
          <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/40 rounded-xl p-3.5 text-xs text-rose-700 dark:text-rose-400 font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="p-1 bg-rose-100 dark:bg-rose-950/50 rounded-lg text-rose-600 dark:text-rose-400 font-black shrink-0">!</span>
            <div>
              <p className="font-bold font-sans">Execution Interrupted</p>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5 font-sans">{aiError}</p>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loadingAi && (
          <div className="space-y-4 animate-pulse pt-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-1/4" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-5/6" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-md w-4/5" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
              <div className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
            </div>
          </div>
        )}

        {/* Generated Report Output */}
        {aiSummary && !loadingAi && (
          <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 space-y-4 font-sans text-xs sm:text-sm leading-relaxed text-gray-700 dark:text-gray-300 shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-300 animate-out duration-200">
            <div className="prose prose-sm prose-indigo dark:prose-invert max-w-none text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed space-y-4 font-sans">
              {(() => {
                const summaryText = typeof aiSummary === 'string'
                  ? aiSummary
                  : typeof aiSummary === 'object' && aiSummary !== null
                    ? Object.entries(aiSummary).map(([key, val]) => `### ${key}\n${val}`).join('\n\n')
                    : String(aiSummary || '');
                return summaryText.split('\n\n').map((paragraph, pIdx) => {
                  if (paragraph.startsWith('###') || paragraph.startsWith('##')) {
                    const title = paragraph.replace(/^###|^##/, '').trim();
                    return (
                      <h4 key={pIdx} className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-400 uppercase tracking-wider pt-3 border-b border-gray-100 dark:border-gray-800 pb-1 font-mono">
                        {title}
                      </h4>
                    );
                  }
                  
                  // Parse bullet points or numbering starting with 1. 2. 3. 4.
                  if (/^\d\./.test(paragraph)) {
                    const items = paragraph.split('\n').filter(Boolean);
                    return (
                      <div key={pIdx} className="space-y-3.5 my-4 animate-in fade-in-20 duration-300">
                        {items.map((item, iIdx) => {
                          const firstDot = item.indexOf('.');
                          const number = item.substring(0, firstDot + 1);
                          const rest = item.substring(firstDot + 1).trim();
                          
                          let title = "";
                          let content = rest;
                          if (rest.startsWith('**')) {
                            const secondBold = rest.indexOf('**', 2);
                            if (secondBold !== -1) {
                              title = rest.substring(2, secondBold);
                              content = rest.substring(secondBold + 2).trim();
                            }
                          }
                          
                          return (
                            <div key={iIdx} className="bg-gray-50/40 dark:bg-gray-950/40 border border-gray-100/60 dark:border-gray-800/40 rounded-xl p-4 shadow-xs">
                              <span className="inline-block text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md">
                                {number} {title}
                              </span>
                              <p className="text-xs sm:text-[13px] text-gray-700 dark:text-gray-300 font-medium leading-relaxed">
                                {content.replace(/^:\s*/, '')}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  if (paragraph.startsWith('*') || paragraph.startsWith('-')) {
                    const items = paragraph.split('\n').filter(Boolean);
                    return (
                      <ul key={pIdx} className="list-disc pl-5 space-y-1.5 my-3">
                        {items.map((item, iIdx) => (
                          <li key={iIdx}>
                            {item.replace(/^\*|^\-\s|\*\*|^\d\.\s/g, '').trim()}
                          </li>
                        ))}
                      </ul>
                    );
                  }

                  return (
                    <p key={pIdx} className="text-xs sm:text-[13px] font-medium leading-relaxed">
                      {paragraph}
                    </p>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Sentiment Gauge utilizing Gemini API analysis */}
      <SentimentGauge />

      {/* Position Sizing and Risk-Reward Calculator */}
      <PositionCalculator />

      {/* Trading Journal Panel for logging reasoning and analysis */}
      <TradingJournal />

      {/* Grid: Alert Threshold settings & Fundamental Metrics */}
      {/* Grid: Alert Threshold settings, Competitors & Fundamental Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Custom Price Alert threshold */}
        <div className="bg-indigo-50/10 dark:bg-indigo-950/10 border border-indigo-100 dark:border-indigo-950/40 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Custom Price Alert</span>
            </div>
            <p className="text-xs text-indigo-900/80 dark:text-indigo-300/80 leading-relaxed">
              Trigger a real-time toast alert notification immediately when the simulated stock price rises above your target.
            </p>

            <div id={`detail-threshold-container-${stock.ticker}`} className="pt-2">
              {thresholdValue !== undefined && thresholdValue !== null ? (
                <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-indigo-100 dark:border-indigo-900/40 px-4 py-2.5 rounded-xl">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-indigo-400 dark:text-indigo-500 block uppercase tracking-wide">ACTIVE TARGET</span>
                    <span className="font-mono text-sm font-black text-indigo-700 dark:text-indigo-300">₹{thresholdValue.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => setThreshold(stock.ticker, null)}
                    className="p-1 text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                    title="Delete price threshold"
                    id={`btn-detail-remove-threshold-${stock.ticker}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-2.5 text-xs font-mono font-bold text-gray-400 dark:text-gray-500">₹</span>
                    <input
                      type="number"
                      placeholder={`Alert target (Current: ${stock.currentPrice.toFixed(0)})`}
                      className="w-full pl-7 pr-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-right"
                      id={`input-detail-threshold-${stock.ticker}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = parseFloat((e.currentTarget as HTMLInputElement).value);
                          if (!isNaN(val) && val > 0) {
                            setThreshold(stock.ticker, val);
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const input = document.getElementById(`input-detail-threshold-${stock.ticker}`) as HTMLInputElement;
                      if (input) {
                        const val = parseFloat(input.value);
                        if (!isNaN(val) && val > 0) {
                          setThreshold(stock.ticker, val);
                          input.value = '';
                        }
                      }
                    }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm shadow-indigo-600/10"
                    id={`btn-detail-set-threshold-${stock.ticker}`}
                  >
                    Set Alert
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Competitor & Peer Comparison — full width, all peers */}
        <div className="col-span-full bg-white/60 dark:bg-gray-800/40 backdrop-blur-xl border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-4 sm:p-5 space-y-3" id="competitor-comparison-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Peers &amp; Competitors</span>
              {loadingCompetitors ? (
                <span className="flex items-center gap-1 text-[10px] text-indigo-400 dark:text-indigo-500 font-medium animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" /> Loading...
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                  {stock.competitors?.length ?? 0} companies
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-sans">
              Sector: <strong className="text-gray-600 dark:text-gray-300">{stock.sector || 'Other'}</strong>
            </span>
          </div>


          {/* Table header */}
          {stock.competitors && stock.competitors.length > 0 && (
            <div className="grid grid-cols-12 gap-2 px-2 text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 pb-1">
              <span className="col-span-1">#</span>
              <span className="col-span-3">Ticker</span>
              <span className="col-span-4">Company</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Change</span>
            </div>
          )}

          <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
            {stock.competitors && stock.competitors.length > 0 ? (
              stock.competitors.map((peer: any, idx: number) => {
                const peerIsUp = (peer.change ?? 0) >= 0;
                return (
                  <div
                    key={peer.ticker}
                    onClick={() => setSelectedTicker(peer.ticker)}
                    className="cursor-pointer grid grid-cols-12 gap-2 items-center p-2 rounded-xl border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-all duration-150 group"
                    title={`View ${peer.name}`}
                    id={`competitor-item-${peer.ticker}`}
                  >
                    <span className="col-span-1 text-[10px] font-mono text-gray-300 dark:text-gray-600">{idx + 1}</span>
                    <div className="col-span-3">
                      <span className="block font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 group-hover:underline">
                        {peer.ticker}
                      </span>
                      {peer.marketCap > 0 && (
                        <span className="block text-[9px] text-gray-400 dark:text-gray-600 font-mono">
                          ₹{peer.marketCap >= 100000 ? `${(peer.marketCap / 100000).toFixed(1)}L Cr` : `${peer.marketCap.toLocaleString('en-IN')} Cr`}
                        </span>
                      )}
                    </div>
                    <span className="col-span-4 text-[10px] text-gray-500 dark:text-gray-400 truncate">
                      {peer.name}
                    </span>
                    <span className="col-span-2 text-right font-mono font-bold text-xs text-gray-800 dark:text-gray-200">
                      ₹{(peer.currentPrice ?? 0).toFixed(2)}
                    </span>
                    <span className={`col-span-2 text-right font-mono text-[10px] font-extrabold ${peerIsUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {peerIsUp ? '+' : ''}{(peer.changePercent ?? 0).toFixed(2)}%
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-gray-400 dark:text-gray-500 text-xs">
                No sector competitors found for this stock.
              </div>
            )}
          </div>
          <div className="text-[9px] text-gray-400 dark:text-gray-500 font-sans pt-1 border-t border-gray-100 dark:border-gray-800/80">
            ℹ️ Click any company to instantly switch to its detail view. Peers share the same sector classification.
          </div>
        </div>

        {/* Statistics board */}
        <div className="bg-gray-55/10 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Simulated Key Metrics</span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-1 font-mono text-xs">
              <div className="bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-800/60 p-2.5 rounded-xl">
                <span className="block text-gray-400 dark:text-gray-500 text-[10px]">TODAY&apos;S HIGH</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">₹{Number(stock.high ?? stock.currentPrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-800/60 p-2.5 rounded-xl">
                <span className="block text-gray-400 dark:text-gray-500 text-[10px]">TODAY&apos;S LOW</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">₹{Number(stock.low ?? stock.currentPrice ?? 0).toFixed(2)}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-800/60 p-2.5 rounded-xl">
                <span className="block text-gray-400 dark:text-gray-500 text-[10px]">VOLUME</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">{Number(stock.volume || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-50 dark:border-gray-800/60 p-2.5 rounded-xl">
                <span className="block text-gray-400 dark:text-gray-500 text-[10px]">52W HIGH / LOW</span>
                <span className="font-bold text-gray-800 dark:text-gray-200 font-mono">
                  ₹{(stock.currentPrice * 1.25).toFixed(0)} / ₹{(stock.currentPrice * 0.75).toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div> {/* end of 3-col grid */}

      {/* BUSINESS INTELLIGENCE & SEASONAL PERFORMANCE PANEL */}
      {(() => {
        const history = stock.history || [];
        if (history.length < 10) return null;

        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const QUARTERS = ['Q1 (Jan–Mar)','Q2 (Apr–Jun)','Q3 (Jul–Sep)','Q4 (Oct–Dec)'];

        // Use `price` field (fallback history only has price, not close)
        const getPrice = (h: any) => h.price ?? h.close ?? 0;

        // Distribute data points across months by index (since date strings may not be ISO parseable)
        // Assign each data point to a simulated month based on its position in the array
        const monthlyReturns: Record<number, number[]> = {};
        for (let i = 1; i < history.length; i++) {
          const prev = getPrice(history[i - 1]);
          const curr = getPrice(history[i]);
          if (!prev || !curr) continue;
          const ret = ((curr - prev) / prev) * 100;
          // Try ISO date first, fall back to index-based bucketing
          let month = -1;
          try {
            const d = new Date(history[i].date);
            if (!isNaN(d.getTime())) month = d.getMonth();
          } catch {}
          if (month === -1) {
            // Spread 90 data points across 12 months proportionally
            month = Math.floor((i / history.length) * 12) % 12;
          }
          if (!monthlyReturns[month]) monthlyReturns[month] = [];
          monthlyReturns[month].push(ret);
        }

        const monthlyAvg = MONTHS.map((m, idx) => ({
          month: m,
          avg: monthlyReturns[idx]?.length
            ? monthlyReturns[idx].reduce((a, b) => a + b, 0) / monthlyReturns[idx].length
            : 0,
          samples: monthlyReturns[idx]?.length || 0
        }));

        const bestMonth = [...monthlyAvg].sort((a, b) => b.avg - a.avg)[0];
        const worstMonth = [...monthlyAvg].sort((a, b) => a.avg - b.avg)[0];

        // Quarter performance
        const quarterAvg = [0,1,2,3].map(q => {
          const months = [q*3, q*3+1, q*3+2];
          const vals = months.flatMap(m => monthlyReturns[m] || []);
          return {
            quarter: QUARTERS[q],
            short: `Q${q+1}`,
            avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
          };
        });
        const bestQuarter = [...quarterAvg].sort((a, b) => b.avg - a.avg)[0];

        // Peak profit window — rolling window
        const windowSize = Math.min(20, Math.floor(history.length / 4));
        let bestWindowReturn = -Infinity, bestWindowStart = '', bestWindowEnd = '';
        let worstWindowReturn = Infinity, worstWindowStart = '', worstWindowEnd = '';
        for (let i = 0; i <= history.length - windowSize; i++) {
          const sp = getPrice(history[i]);
          const ep = getPrice(history[i + windowSize - 1]);
          if (!sp) continue;
          const ret = ((ep - sp) / sp) * 100;
          if (ret > bestWindowReturn) {
            bestWindowReturn = ret;
            bestWindowStart = history[i].date;
            bestWindowEnd = history[i + windowSize - 1].date;
          }
          if (ret < worstWindowReturn) {
            worstWindowReturn = ret;
            worstWindowStart = history[i].date;
            worstWindowEnd = history[i + windowSize - 1].date;
          }
        }

        // Overall trend
        const firstPrice = getPrice(history[0]);
        const lastPrice = getPrice(history[history.length - 1]);
        const overallReturn = firstPrice ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

        // Volatility (std dev of daily returns)
        const dailyRets: number[] = [];
        for (let i = 1; i < history.length; i++) {
          const p = getPrice(history[i - 1]);
          const c = getPrice(history[i]);
          if (p) dailyRets.push(((c - p) / p) * 100);
        }
        const avgRet = dailyRets.length ? dailyRets.reduce((a, b) => a + b, 0) / dailyRets.length : 0;
        const variance = dailyRets.length
          ? dailyRets.reduce((a, b) => a + Math.pow(b - avgRet, 2), 0) / dailyRets.length
          : 0;
        const volatility = Math.sqrt(variance);

        return (
          <div className="mt-6 space-y-4">
            {/* Header */}
            <div className="flex flex-wrap items-center gap-2">
              <BarChart2 className="h-5 w-5 text-violet-500 shrink-0" />
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Business Intelligence</h3>
              <span className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-0.5 rounded-full font-bold">Seasonal Analysis</span>
            </div>

            {/* KPI Row — 2 cols on mobile, 4 on md+ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-3 md:p-4">
                <div className="flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1.5">
                  <Award className="h-3 w-3 shrink-0" /> Best Month
                </div>
                <div className="font-black text-xl md:text-2xl text-emerald-600 dark:text-emerald-400">{bestMonth.month}</div>
                <div className="text-xs font-mono font-bold text-emerald-500">+{bestMonth.avg.toFixed(2)}% avg</div>
                <div className="text-[9px] text-emerald-700/60 dark:text-emerald-500/60 mt-1">{bestMonth.samples} data pts</div>
              </div>

              <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-3 md:p-4">
                <div className="flex items-center gap-1 text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-1.5">
                  <TrendingDown className="h-3 w-3 shrink-0" /> Worst Month
                </div>
                <div className="font-black text-xl md:text-2xl text-rose-600 dark:text-rose-400">{worstMonth.month}</div>
                <div className="text-xs font-mono font-bold text-rose-500">{worstMonth.avg.toFixed(2)}% avg</div>
                <div className="text-[9px] text-rose-700/60 dark:text-rose-500/60 mt-1">{worstMonth.samples} data pts</div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3 md:p-4">
                <div className="flex items-center gap-1 text-[9px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-1.5">
                  <CalendarDays className="h-3 w-3 shrink-0" /> Best Quarter
                </div>
                <div className="font-black text-xl md:text-2xl text-indigo-600 dark:text-indigo-400">{bestQuarter.short}</div>
                <div className="text-xs font-mono font-bold text-indigo-500">+{bestQuarter.avg.toFixed(2)}% avg</div>
                <div className="text-[9px] text-indigo-700/60 dark:text-indigo-500/60 mt-1 truncate">{bestQuarter.quarter}</div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-900/40 rounded-2xl p-3 md:p-4">
                <div className="flex items-center gap-1 text-[9px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-1.5">
                  <Zap className="h-3 w-3 shrink-0" /> Volatility
                </div>
                <div className="font-black text-xl md:text-2xl text-amber-600 dark:text-amber-400">{isNaN(volatility) ? '—' : `${volatility.toFixed(2)}%`}</div>
                <div className="text-xs font-mono font-bold text-amber-500">daily std dev</div>
                <div className="text-[9px] text-amber-700/60 dark:text-amber-500/60 mt-1">{volatility < 1.5 ? 'Low risk' : volatility < 3 ? 'Med risk' : 'High risk'}</div>
              </div>
            </div>

            {/* Monthly Chart + Peak Windows */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-white/60 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Monthly Avg Return</span>
                  <span className="text-[9px] text-gray-400">based on historical data</span>
                </div>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={monthlyAvg} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v.toFixed(1)}%`} />
                    <Tooltip
                      formatter={(v: any) => [`${Number(v).toFixed(2)}%`, 'Avg Return']}
                      contentStyle={{ background: 'rgba(17,24,39,0.9)', border: 'none', borderRadius: 8, fontSize: 11, color: '#f9fafb' }}
                    />
                    <ReferenceLine y={0} stroke="#374151" strokeDasharray="3 3" strokeWidth={1} />
                    <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                      {monthlyAvg.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.avg >= 0 ? '#10b981' : '#f43f5e'}
                          opacity={entry.month === bestMonth.month ? 1 : 0.55}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-[9px] text-gray-400">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 inline-block"></span> Positive</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-500 inline-block"></span> Negative</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500 ring-2 ring-emerald-400 inline-block"></span> Best month</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/80 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-2">
                    <Clock className="h-3 w-3" /> Peak Profit Window
                  </div>
                  <div className="font-black text-xl text-emerald-600 dark:text-emerald-400 mb-1">
                    {isFinite(bestWindowReturn) ? `+${bestWindowReturn.toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono break-words">
                    {bestWindowStart} → {bestWindowEnd}
                  </div>
                  <div className="text-[9px] text-emerald-700/60 dark:text-emerald-500/60 mt-1">Best {windowSize}-day run</div>
                </div>

                <div className="bg-gradient-to-br from-rose-50/80 to-pink-50/80 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-100 dark:border-rose-900/40 rounded-2xl p-4">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider mb-2">
                    <TrendingDown className="h-3 w-3" /> Worst Drawdown
                  </div>
                  <div className="font-black text-xl text-rose-600 dark:text-rose-400 mb-1">
                    {isFinite(worstWindowReturn) ? `${worstWindowReturn.toFixed(1)}%` : '—'}
                  </div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono break-words">
                    {worstWindowStart} → {worstWindowEnd}
                  </div>
                  <div className="text-[9px] text-rose-700/60 dark:text-rose-500/60 mt-1">Worst {windowSize}-day run</div>
                </div>
              </div>
            </div>

            {/* Quarterly Breakdown */}
            <div className="bg-white/60 dark:bg-gray-800/40 border border-gray-200/60 dark:border-gray-700/50 rounded-2xl p-4">
              <div className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Quarterly Breakdown</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {quarterAvg.map((q) => {
                  const isPos = q.avg >= 0;
                  const isBest = q.short === bestQuarter.short;
                  return (
                    <div key={q.short} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                      isBest
                        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20'
                        : 'border-gray-100 dark:border-gray-800'
                    }`}>
                      <span className={`text-sm font-black ${isPos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {isPos ? '+' : ''}{q.avg.toFixed(2)}%
                      </span>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isPos ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, Math.abs(q.avg) * 15)}%` }}
                        />
                      </div>
                      <span className="font-bold text-xs text-gray-700 dark:text-gray-300">{q.short}</span>
                      {isBest && <span className="text-[8px] text-indigo-500 font-bold uppercase">Best ✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insight Summary */}
            <div className="bg-gradient-to-r from-violet-50/80 to-indigo-50/80 dark:from-violet-950/20 dark:to-indigo-950/20 border border-violet-100 dark:border-violet-900/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">Performance Insight</span>
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                <strong>{stock.name || stock.ticker}</strong> historically peaks in{' '}
                <strong className="text-emerald-600 dark:text-emerald-400">{bestMonth.month}</strong> (avg +{bestMonth.avg.toFixed(2)}%) and is typically weakest in{' '}
                <strong className="text-rose-500">{worstMonth.month}</strong> (avg {worstMonth.avg.toFixed(2)}%). The{' '}
                <strong className="text-indigo-500">{bestQuarter.quarter}</strong> is the strongest calendar quarter.
                Daily volatility is <strong>{isNaN(volatility) ? '—' : `${volatility.toFixed(2)}%`}</strong> —{' '}
                classified as <strong>{volatility < 1.5 ? 'low' : volatility < 3 ? 'moderate' : 'high'}</strong> risk.
                Overall tracked-period return:{' '}
                <strong className={overallReturn >= 0 ? 'text-emerald-600' : 'text-rose-500'}>
                  {overallReturn >= 0 ? '+' : ''}{overallReturn.toFixed(2)}%
                </strong>.
              </p>
            </div>
          </div>
        );
      })()}
      </div>
      )}

      {detailTab === 'advisor' && (
        <div role="tabpanel" id="detail-panel-advisor" aria-labelledby="detail-tab-advisor">
          <TradeAdvisorTab stock={stock} theme={theme} />
        </div>
      )}

      {detailTab === 'backtest' && (
        <div role="tabpanel" id="detail-panel-backtest" aria-labelledby="detail-tab-backtest">
          <StrategyBacktester />
        </div>
      )}

      {detailTab === 'profile' && (
        <div role="tabpanel" id="detail-panel-profile" aria-labelledby="detail-tab-profile">
          <CompanyProfileTab ticker={stock.ticker} theme={theme} />
        </div>
      )}

      {detailTab === 'stock-ai' && (
        <div role="tabpanel" id="detail-panel-stock-ai" aria-labelledby="detail-tab-stock-ai">
          <StockAiDetailTab ticker={stock.ticker} theme={theme} />
        </div>
      )}

      {detailTab === 'news' && (
        <div role="tabpanel" id="detail-panel-news" aria-labelledby="detail-tab-news" className="animate-in slide-in-from-bottom-2 fade-in duration-500">
          <NewsFeed ticker={stock.ticker} sector={stock.sector} />
        </div>
      )}

      {detailTab === 'research' && (
        <div role="tabpanel" id="detail-panel-research" aria-labelledby="detail-tab-research">
          <CompanyResearchPanel key={stock.ticker} ticker={stock.ticker} />
        </div>
      )}

      {/* Quick Trade Modal */}
      {showQuickTrade && stock && (
        <QuickTradeModal
          isOpen={true}
          onClose={() => setShowQuickTrade(false)}
          ticker={stock.ticker}
          name={stock.name}
          currentPrice={stock.currentPrice}
          initialTargetPct={2.0}
        />
      )}
    </div>
  );
}
