'use client';


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useStockContext } from '../context/StockContext';
import { Stock } from '../lib/stock-data';
import { canUseQuoteForExecution } from '../lib/market-quote';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  Search, 
  Play, 
  AlertTriangle, 
  Plus, 
  Check, 
  Trash2, 
  Compass, 
  BookOpen, 
  BarChart4, 
  Calendar, 
  Users, 
  Globe, 
  BellRing, 
  FileSpreadsheet, 
  Volume2, 
  Briefcase, 
  Layers, 
  PenTool, 
  GitCommit, 
  Award,
  DollarSign,
  PieChart,
  Grid,
  CornerDownRight,
  Sparkles,
  Info
} from 'lucide-react';

// Color Mapping
const STOCK_COLORS: Record<string, string> = {
  RELIANCE: '#3b82f6',
  TCS: '#10b981',
  HDFCBANK: '#8b5cf6',
  INFY: '#f59e0b',
  ICICIBANK: '#ec4899',
  ITC: '#14b8a6',
  SBIN: '#ef4444',
  DEFAULT: '#6b7280'
};

function calculateSimpleRsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  const changes = closes.slice(-(period + 1)).slice(1).map((close, index) => close - closes[closes.length - period - 1 + index]);
  const gains = changes.reduce((sum, change) => sum + Math.max(0, change), 0) / period;
  const losses = changes.reduce((sum, change) => sum + Math.max(0, -change), 0) / period;
  if (losses === 0) return gains === 0 ? 50 : 100;
  return 100 - 100 / (1 + gains / losses);
}

export default function QuantSuiteScreen() {
  const { stocks, theme, addToast } = useStockContext();
  const [selectedStock, setSelectedStock] = useState<Stock | null>(stocks[0] ?? null);
  const hasRecentProviderQuote = selectedStock ? canUseQuoteForExecution(selectedStock) : false;
  const hasProviderHistory = selectedStock?.dataSource === 'provider' && !selectedStock.isFallback;
  const latestRsi = useMemo(() => {
    if (!selectedStock || !hasProviderHistory) return null;
    const closes = selectedStock.history.map(point => point.close).filter(price => Number.isFinite(price) && price > 0);
    const value = calculateSimpleRsi(closes);
    return value === null ? null : Number(value.toFixed(1));
  }, [selectedStock, hasProviderHistory]);
  
  // Selection States
  const [activeVector, setActiveVector] = useState<'technical' | 'strategies' | 'simulation' | 'fundamentals' | 'alerts'>('technical');

  // Synchronize stock selection if current selection becomes out-of-sync
  useEffect(() => {
    if (selectedStock && !stocks.some(s => s.ticker === selectedStock.ticker)) {
      setSelectedStock(stocks[0]);
    }
  }, [stocks, selectedStock]);

  // -------------------------------------------------------------------------
  // VECTOR 1: Advanced Technical Analysis & Visual Analytics States & Logics
  // -------------------------------------------------------------------------
  
  // 1. Multi-Timeframe interval values
  const mtfData: Array<{ interval: string; sma5: number; sma20: number; rsi: number; trend: string; signal: string }> = [];

  // 2. Volume Profile (VPVR) Calculations
  const vpvrData = useMemo(() => {
    if (!selectedStock || !hasProviderHistory) return [];
    const history = selectedStock.history.filter(h => Number.isFinite(h.close) && h.close > 0 && Number.isFinite(h.volume) && h.volume > 0);
    const prices = history.map(h => h.close);
    if (prices.length < 2) return [];
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice;
    if (!Number.isFinite(range) || range <= 0) return [];
    
    // Divide prices into 10 buckets
    const numBuckets = 10;
    const bucketSize = range / numBuckets;
    const buckets = Array.from({ length: numBuckets }, (_, i) => {
      const low = minPrice + i * bucketSize;
      const high = low + bucketSize;
      return {
        priceLevel: Number(((low + high) / 2).toFixed(2)),
        low,
        high,
        upCloseVolume: 0,
        downCloseVolume: 0,
        totalVolume: 0
      };
    });

    history.forEach((h, idx) => {
      const price = h.close;
      const volume = h.volume;
      const prevPrice = idx > 0 ? history[idx - 1].close : price;
      const isUp = price >= prevPrice;

      // Find fitting bucket
      const bucketIdx = Math.min(numBuckets - 1, Math.max(0, Math.floor((price - minPrice) / bucketSize)));
      if (buckets[bucketIdx]) {
        if (isUp) {
          buckets[bucketIdx].upCloseVolume += volume;
        } else {
          buckets[bucketIdx].downCloseVolume += volume;
        }
        buckets[bucketIdx].totalVolume += volume;
      }
    });

    return buckets;
  }, [selectedStock, hasProviderHistory]);
  const maxVpvrVolume = Math.max(0, ...vpvrData.map(bucket => bucket.totalVolume));

  // 3. Interactive Drawing Canvas Drawing Lines state
  const [drawings, setDrawings] = useState<{ id: number; type: 'line' | 'fib'; points: { x: number; y: number }[] }[]>([]);
  const [activeDrawingTool, setActiveDrawingTool] = useState<'none' | 'line' | 'fib'>('none');
  const canvasRef = useRef<SVGSVGElement | null>(null);
  const [clickCount, setClickCount] = useState<number>(0);
  const [tempLineStart, setTempLineStart] = useState<{ x: number; y: number } | null>(null);

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeDrawingTool === 'none' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeDrawingTool === 'line') {
      if (!tempLineStart) {
        setTempLineStart({ x, y });
        addToast('Selected start point. Click again to define support/resistance trendline.', 'info');
      } else {
        setDrawings(prev => [...prev, {
          id: Date.now(),
          type: 'line',
          points: [tempLineStart, { x, y }]
        }]);
        setTempLineStart(null);
        setActiveDrawingTool('none');
        addToast('Trendline successfully annotated.', 'success');
      }
    } else if (activeDrawingTool === 'fib') {
      // Draw standard fib grid from this Y point downwards
      setDrawings(prev => [...prev, {
        id: Date.now(),
        type: 'fib',
        points: [{ x: 50, y }, { x: 550, y }]
      }]);
      setActiveDrawingTool('none');
      addToast('Fibonacci levels plotted at selected pivot height.', 'success');
    }
  };

  const clearCanvasDrawings = () => {
    setDrawings([]);
    setTempLineStart(null);
    addToast('Aesthetic canvas cleared of all lines.', 'info');
  };

  // 4. Correlation Matrix calculated only from overlapping provider daily returns.
  const correlationMatrix = useMemo(() => {
    const series = stocks
      .filter(stock => stock.dataSource === 'provider' && !stock.isFallback)
      .map(stock => {
        const ordered = [...stock.history].filter(point => Number.isFinite(point.close) && point.close > 0 && Number.isFinite(Date.parse(point.date)))
          .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
        const returns = new Map<string, number>();
        for (let i = 1; i < ordered.length; i++) {
          returns.set(ordered[i].date, ordered[i].close / ordered[i - 1].close - 1);
        }
        return { ticker: stock.ticker, returns };
      });
    const tickers = series.map(item => item.ticker);
    const values: Record<string, Record<string, number | null>> = {};
    for (const left of series) {
      values[left.ticker] = {};
      for (const right of series) {
        const paired = [...left.returns.entries()]
          .flatMap(([date, leftReturn]) => right.returns.has(date) ? [[leftReturn, right.returns.get(date)!] as const] : []);
        if (paired.length < 20) {
          values[left.ticker][right.ticker] = null;
          continue;
        }
        const leftMean = paired.reduce((sum, pair) => sum + pair[0], 0) / paired.length;
        const rightMean = paired.reduce((sum, pair) => sum + pair[1], 0) / paired.length;
        const covariance = paired.reduce((sum, pair) => sum + (pair[0] - leftMean) * (pair[1] - rightMean), 0);
        const leftVariance = paired.reduce((sum, pair) => sum + Math.pow(pair[0] - leftMean, 2), 0);
        const rightVariance = paired.reduce((sum, pair) => sum + Math.pow(pair[1] - rightMean, 2), 0);
        const denominator = Math.sqrt(leftVariance * rightVariance);
        values[left.ticker][right.ticker] = denominator > 0 ? Number((covariance / denominator).toFixed(4)) : null;
      }
    }
    return { tickers, values };
  }, [stocks]);


  // -------------------------------------------------------------------------
  // VECTOR 2: Quantitative Strategies & Smart Screeners Logics
  // -------------------------------------------------------------------------

  // 5. Candlestick Pattern Recognizer Algorithmic Scanner
  const detectedPatterns = useMemo(() => {
    if (!selectedStock || !hasProviderHistory || selectedStock.history.length < 2) return [];
    const [previous, current] = selectedStock.history.slice(-2);
    const values = [previous.open, previous.close, current.open, current.high, current.low, current.close];
    if (!values.every(value => Number.isFinite(value) && value > 0)) return [];

    const patterns: { name: string; strength: string; direction: string; description: string }[] = [];
    const previousBodyLow = Math.min(previous.open, previous.close);
    const previousBodyHigh = Math.max(previous.open, previous.close);
    const currentBodyLow = Math.min(current.open, current.close);
    const currentBodyHigh = Math.max(current.open, current.close);
    if (previous.close < previous.open && current.close > current.open && currentBodyLow <= previousBodyLow && currentBodyHigh >= previousBodyHigh) {
      patterns.push({ name: 'Bullish Engulfing', strength: 'Pattern match', direction: 'Bullish candle pattern', description: 'The latest bullish candle body covers the prior bearish candle body.' });
    }
    const body = Math.abs(current.close - current.open);
    const range = current.high - current.low;
    const lowerWick = Math.min(current.open, current.close) - current.low;
    const upperWick = current.high - Math.max(current.open, current.close);
    if (range > 0 && lowerWick >= Math.max(body * 2, range * 0.45) && upperWick <= range * 0.2) {
      patterns.push({ name: 'Hammer-shaped candle', strength: 'Pattern match', direction: 'Potential reversal shape', description: 'The latest candle has a long lower wick and a small upper wick; this shape does not predict the next move.' });
    }
    if (range > 0 && body / range <= 0.1) {
      patterns.push({ name: 'Doji-shaped candle', strength: 'Pattern match', direction: 'Small real body', description: 'The latest candle open and close are close relative to its high-low range.' });
    }
    return patterns;
  }, [selectedStock, hasProviderHistory]);

  // 6. Quantitative Backtesting Engine
  const [backtestDateRange, setBacktestDateRange] = useState<string>('90D'); // '1D', '1W', '30D', '90D', '180D', '365D', 'ALL'
  const [backtestRiskLevel, setBacktestRiskLevel] = useState<string>('Moderate');
  const [backtestStrategyType, setBacktestStrategyType] = useState<'RSI' | 'SMA_CROSSOVER' | 'BREAKOUT' | 'DUAL_MOMENTUM'>('SMA_CROSSOVER');
  const [fastSmaPeriod, setFastSmaPeriod] = useState<number>(9);
  const [slowSmaPeriod, setSlowSmaPeriod] = useState<number>(21);
  const [rsiBuyMin, setRsiBuyMin] = useState<number>(20);
  const [rsiBuyMax, setRsiBuyMax] = useState<number>(35);
  const [rsiSellMin, setRsiSellMin] = useState<number>(65);
  const [rsiSellMax, setRsiSellMax] = useState<number>(80);
  const backtestMinimumBars =
    backtestStrategyType === 'SMA_CROSSOVER'
      ? Math.max(fastSmaPeriod, slowSmaPeriod) + 3
      : backtestStrategyType === 'BREAKOUT' || backtestStrategyType === 'DUAL_MOMENTUM'
      ? 24
      : 18;
  const [backtestRunning, setBacktestRunning] = useState<boolean>(false);
  const [backtestResults, setBacktestResults] = useState<{
    totalReturn: number;
    sharpe: number | null;
    maxDrawdown: number;
    tradesCount: number;
    equityCurve: { date: string; strategy: number; benchmark: number }[];
  } | null>(null);

  useEffect(() => {
    setBacktestResults(null);
  }, [selectedStock?.ticker, backtestDateRange, backtestRiskLevel, backtestStrategyType, fastSmaPeriod, slowSmaPeriod, rsiBuyMin, rsiBuyMax, rsiSellMin, rsiSellMax]);

  const runQuantBacktest = () => {
    if (!selectedStock || !hasProviderHistory) {
      addToast('Backtest needs provider-sourced historical prices for the selected stock.', 'warning');
      return;
    }
    setBacktestRunning(true);
    const allHistory = selectedStock.history
      .filter(point => Number.isFinite(point.close) && point.close > 0 && Number.isFinite(Date.parse(point.date)))
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const minimumBars = backtestStrategyType === 'SMA_CROSSOVER' ? Math.max(fastSmaPeriod, slowSmaPeriod) + 3 : 18;
    if (allHistory.length < minimumBars) {
      setBacktestResults(null);
      setBacktestRunning(false);
      addToast(`Need at least ${minimumBars} provider history rows to run this strategy.`, 'warning');
      return;
    }

    const prices = allHistory.map(point => point.close);
    const sma = (period: number) => prices.map((_, index) => index + 1 < period
      ? null
      : prices.slice(index - period + 1, index + 1).reduce((sum, price) => sum + price, 0) / period);
    const fastSma = sma(fastSmaPeriod);
    const slowSma = sma(slowSmaPeriod);
    const rsi = prices.map((_, index) => {
      if (index < 14) return null;
      let gains = 0;
      let losses = 0;
      for (let offset = index - 13; offset <= index; offset++) {
        const change = prices[offset] - prices[offset - 1];
        if (change > 0) gains += change;
        else losses -= change;
      }
      if (losses === 0) return gains === 0 ? 50 : 100;
      const rs = (gains / 14) / (losses / 14);
      return 100 - (100 / (1 + rs));
    });

    const rangeSize: Record<string, number> = { '1D': 2, '1W': 7, '30D': 30, '90D': 90, '180D': 180, '365D': 365 };
    const startIndex = backtestDateRange === 'ALL' ? 0 : Math.max(0, allHistory.length - (rangeSize[backtestDateRange] ?? 90));
    const history = allHistory.slice(startIndex).map((point, offset) => ({ ...point, index: startIndex + offset }));
    if (history.length < 2) {
      setBacktestResults(null);
      setBacktestRunning(false);
      addToast('Not enough provider history for the selected range.', 'warning');
      return;
    }

    const positionSize = backtestRiskLevel === 'Conservative' ? 0.5 : backtestRiskLevel === 'Aggressive' ? 1 : 0.75;
    const stopLoss = backtestRiskLevel === 'Conservative' ? 0.03 : backtestRiskLevel === 'Aggressive' ? 0.12 : 0.06;
    const takeProfit = backtestRiskLevel === 'Conservative' ? 0.1 : backtestRiskLevel === 'Aggressive' ? 0.4 : 0.2;
    const startingCapital = 100_000;
    const firstPrice = history[0].close;
    const benchmarkShares = startingCapital / firstPrice;
    let cash = startingCapital;
    let shares = 0;
    let entryPrice = 0;
    let completedTrades = 0;
    let priorEquity = startingCapital;
    const dailyReturns: number[] = [];
    let peak = startingCapital;
    let maxDrawdown = 0;

    const curve = history.map(point => {
      const index = point.index;
      const signalIndex = index - 1;
      let buySignal = false;
      let sellSignal = false;
      if (signalIndex >= 1 && backtestStrategyType === 'SMA_CROSSOVER') {
        buySignal = fastSma[signalIndex] !== null && slowSma[signalIndex] !== null && fastSma[signalIndex - 1] !== null && slowSma[signalIndex - 1] !== null &&
          fastSma[signalIndex]! > slowSma[signalIndex]! && fastSma[signalIndex - 1]! <= slowSma[signalIndex - 1]!;
        sellSignal = fastSma[signalIndex] !== null && slowSma[signalIndex] !== null && fastSma[signalIndex - 1] !== null && slowSma[signalIndex - 1] !== null &&
          fastSma[signalIndex]! < slowSma[signalIndex]! && fastSma[signalIndex - 1]! >= slowSma[signalIndex - 1]!;
      } else if (signalIndex >= 14 && backtestStrategyType === 'RSI' && rsi[signalIndex] !== null) {
        buySignal = rsi[signalIndex]! >= rsiBuyMin && rsi[signalIndex]! <= rsiBuyMax;
        sellSignal = rsi[signalIndex]! >= rsiSellMin && rsi[signalIndex]! <= rsiSellMax;
      } else if (signalIndex >= 20 && backtestStrategyType === 'BREAKOUT') {
        const lookback = prices.slice(Math.max(0, signalIndex - 20), signalIndex);
        const high20 = Math.max(...lookback);
        buySignal = prices[signalIndex] > high20;
        const low10 = Math.min(...prices.slice(Math.max(0, signalIndex - 10), signalIndex));
        sellSignal = prices[signalIndex] < low10;
      } else if (signalIndex >= 21 && backtestStrategyType === 'DUAL_MOMENTUM') {
        const trendUp =
          fastSma[signalIndex] !== null &&
          slowSma[signalIndex] !== null &&
          fastSma[signalIndex]! > slowSma[signalIndex]!;
        const rsiGood = rsi[signalIndex] !== null && rsi[signalIndex]! > 50 && rsi[signalIndex]! < 70;
        buySignal = trendUp && rsiGood;
        sellSignal =
          (fastSma[signalIndex] !== null && slowSma[signalIndex] !== null && fastSma[signalIndex]! < slowSma[signalIndex]!) ||
          (rsi[signalIndex] !== null && rsi[signalIndex]! >= 75);
      }

      const price = point.close;
      if (shares > 0) {
        const tradeReturn = (price - entryPrice) / entryPrice;
        if (sellSignal || tradeReturn <= -stopLoss || tradeReturn >= takeProfit) {
          cash += shares * price * (1 - 0.0015); // Deduct statutory friction
          shares = 0;
          completedTrades++;
        }
      } else if (buySignal) {
        const equityBeforeEntry = cash;
        const spend = equityBeforeEntry * positionSize;
        shares = (spend * (1 - 0.0015)) / price; // Deduct entry friction
        entryPrice = price;
        cash -= spend;
      }

      const strategyEquity = cash + shares * price;
      if (priorEquity > 0) dailyReturns.push(strategyEquity / priorEquity - 1);
      priorEquity = strategyEquity;
      peak = Math.max(peak, strategyEquity);
      maxDrawdown = Math.max(maxDrawdown, (peak - strategyEquity) / peak * 100);
      return { date: point.date, strategy: Math.round(strategyEquity), benchmark: Math.round(benchmarkShares * price) };
    });

    const returnMean = dailyReturns.reduce((sum, value) => sum + value, 0) / dailyReturns.length;
    const returnVariance = dailyReturns.reduce((sum, value) => sum + Math.pow(value - returnMean, 2), 0) / dailyReturns.length;
    const dailyDeviation = Math.sqrt(returnVariance);
    const finalEquity = curve[curve.length - 1].strategy;
    setBacktestResults({
      totalReturn: Number(((finalEquity / startingCapital - 1) * 100).toFixed(1)),
      sharpe: dailyDeviation > 0 ? Number((returnMean / dailyDeviation * Math.sqrt(252)).toFixed(2)) : null,
      maxDrawdown: Number(maxDrawdown.toFixed(1)),
      tradesCount: completedTrades,
      equityCurve: curve,
    });
    setBacktestRunning(false);
    addToast(`Quant backtest completed for ${backtestDateRange}. Net of 0.15% statutory friction.`, 'success');
  };

  // 7. Heatmap & Market Sector Treemaps
  const sectorHeatmap: Array<{ sector: string; weight: string; change: number; stocks: string[] }> = [];

  // 8. Strategy Rule Builder Custom Conditions State
  const [strategyRules, setStrategyRules] = useState<{ id: string; rule: string }[]>([]);
  const [newRuleInput, setNewRuleInput] = useState<string>('');

  const addStrategyRule = () => {
    if (!newRuleInput.trim()) return;
    setStrategyRules(prev => [...prev, { id: Date.now().toString(), rule: newRuleInput }]);
    setNewRuleInput('');
    addToast('Rule note added to this local draft.', 'info');
  };

  const removeRule = (id: string) => {
    setStrategyRules(prev => prev.filter(r => r.id !== id));
  };


  // -------------------------------------------------------------------------
  // VECTOR 3: Simulation & Risk Management Logics
  // -------------------------------------------------------------------------

  // 9. Paper Trading Sandbox & Portfolio State
  const [paperCash, setPaperCash] = useState<number>(1000000);
  const [paperPortfolio, setPaperPortfolio] = useState<Record<string, { qty: number; avgBuyPrice: number }>>({});
  const [tradeQtyInput, setTradeQtyInput] = useState<number>(10);

  const executePaperTrade = (type: 'BUY' | 'SELL') => {
    if (!selectedStock) return;
    if (!canUseQuoteForExecution(selectedStock)) {
      addToast('A recent provider quote is required. No paper transaction was recorded.', 'warning');
      return;
    }
    if (!Number.isInteger(tradeQtyInput) || tradeQtyInput < 1) {
      addToast('Enter a whole-share quantity greater than zero.', 'warning');
      return;
    }
    const ticker = selectedStock.ticker;
    const price = selectedStock.currentPrice;
    const cost = price * tradeQtyInput;

    if (type === 'BUY') {
      if (paperCash < cost) {
        addToast('Insufficient virtual cash to execute transaction!', 'warning');
        return;
      }
      setPaperCash(prev => prev - cost);
      setPaperPortfolio(prev => {
        const existing = prev[ticker] || { qty: 0, avgBuyPrice: 0 };
        const newQty = existing.qty + tradeQtyInput;
        const newAvg = ((existing.qty * existing.avgBuyPrice) + cost) / newQty;
        return {
          ...prev,
          [ticker]: { qty: newQty, avgBuyPrice: Number(newAvg.toFixed(2)) }
        };
      });
      // Add to Ledger list
      setTradeLedger(prev => [
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          type: 'BUY',
          qty: tradeQtyInput,
          price,
          total: Number(cost.toFixed(2)),
          tag: 'Local simulation'
        },
        ...prev
      ]);
      addToast(`Local paper BUY recorded at the provider quote: ${tradeQtyInput} ${ticker}. No broker order was sent.`, 'success');
    } else {
      const existing = paperPortfolio[ticker];
      if (!existing || existing.qty < tradeQtyInput) {
        addToast(`Insufficient shares of ${ticker} to execute sale!`, 'warning');
        return;
      }
      const revenue = price * tradeQtyInput;
      setPaperCash(prev => prev + revenue);
      setPaperPortfolio(prev => {
        const nextQty = existing.qty - tradeQtyInput;
        if (nextQty <= 0) {
          const updated = { ...prev };
          delete updated[ticker];
          return updated;
        }
        return {
          ...prev,
          [ticker]: { qty: nextQty, avgBuyPrice: existing.avgBuyPrice }
        };
      });
      // Add to Ledger list
      setTradeLedger(prev => [
        {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          ticker,
          type: 'SELL',
          qty: tradeQtyInput,
          price,
          total: Number(revenue.toFixed(2)),
          tag: 'Local simulation'
        },
        ...prev
      ]);
      addToast(`Local paper SELL recorded at the provider quote: ${tradeQtyInput} ${ticker}. No broker order was sent.`, 'success');
    }
  };

  // 10. Value at Risk (VaR) Analyzer Calculations
  const valueAtRiskStats = useMemo(() => {
    if (!selectedStock || !hasProviderHistory) return { var95: null, var99: null, dailyVolatility: null };
    const closes = selectedStock.history.map(h => h.close).filter(price => Number.isFinite(price) && price > 0);
    if (closes.length < 30) return { var95: null, var99: null, dailyVolatility: null };
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const dailyVolatility = Math.sqrt(variance);
    if (!Number.isFinite(dailyVolatility)) return { var95: null, var99: null, dailyVolatility: null };
    const var95 = 1.645 * dailyVolatility * 100;
    const var99 = 2.33 * dailyVolatility * 100;

    return {
      dailyVolatility: Number((dailyVolatility * 100).toFixed(2)),
      var95: Number(var95.toFixed(2)),
      var99: Number(var99.toFixed(2))
    };
  }, [selectedStock, hasProviderHistory]);

  // 11. Order Book & Market Depth (L2) Visualizer state
  const [orderBook, setOrderBook] = useState<{
    bids: { price: number; qty: number; total: number }[];
    asks: { price: number; qty: number; total: number }[];
  }>({ bids: [], asks: [] });

  useEffect(() => {
    if (!selectedStock) return;
    const midPrice = selectedStock.currentPrice;
    
    // Simulate active L2 orderbook
    const tickL2 = () => {
      const spread = midPrice * 0.001;
      const bids = Array.from({ length: 5 }, (_, i) => {
        const price = Number((midPrice - spread - (i * midPrice * 0.0005)).toFixed(2));
        const qty = Math.floor(Math.random() * 800) + 100;
        return { price, qty, total: qty * price };
      });
      const asks = Array.from({ length: 5 }, (_, i) => {
        const price = Number((midPrice + spread + (i * midPrice * 0.0005)).toFixed(2));
        const qty = Math.floor(Math.random() * 800) + 100;
        return { price, qty, total: qty * price };
      }).reverse(); // high prices first

      setOrderBook({ bids, asks });
    };

    tickL2();
    const interval = setInterval(tickL2, 2000);
    return () => clearInterval(interval);
  }, [selectedStock]);

  // 12. Trade Journal & Performance Ledger
  const [tradeLedger, setTradeLedger] = useState<{
    id: string;
    timestamp: string;
    ticker: string;
    type: 'BUY' | 'SELL';
    qty: number;
    price: number;
    total: number;
    tag: 'Local simulation';
  }[]>([]);


  // -------------------------------------------------------------------------
  // VECTOR 4: Fundamental Analytics & Corporate Events Logics
  // -------------------------------------------------------------------------

  // 13. Radar ratios dataset for selected stocks
  const fundamentalRatios: Array<{ ratio: string; RELIANCE: string; TCS: string; HDFCBANK: string; INFY: string }> = [];

  // 14. Corporate Calendar Timeline
  const corporateCalendar: Array<{ date: string; event: string; stock: string; impact: string }> = [];

  // 15. Institutional Deal Logs
  const institutionalDeals: Array<{ broker: string; action: string; ticker: string; qty: string; value: string; time: string }> = [];

  // 16. Global Macro-Economic Dashboard indicators
  const macroIndicators: Array<{ name: string; value: string; change: string; status: string }> = [];


  // -------------------------------------------------------------------------
  // VECTOR 5: Smart Alerts, NLP, & Integrations Logics
  // -------------------------------------------------------------------------

  // 17. Webhook Configuration States
  const [webhookUrl, setWebhookUrl] = useState<string>('https://hooks.slack.com/services/EXAMPLE');
  const [webhookTrigger, setWebhookTrigger] = useState<string>('RSI < 30 OR VOL_SURGE > 2.5');
  const dispatchTestWebhook = () => {
    addToast('Simulated alert dispatched to configured webhook endpoint.', 'success');
  };

  // 18. NLP Sentiment Analysis Data Curve
  const sentimentCurve: Array<{ date: string; price: number; sentiment: number }> = [];

  // 19. Exportable Auditing System
  const downloadAuditCsv = () => {
    const headers = ['Timestamp', 'Ticker', 'ActionType', 'Quantity', 'Price', 'TotalINR', 'EmotionalTag'];
    const rows = tradeLedger.map(t => [t.timestamp, t.ticker, t.type, t.qty, t.price, t.total, t.tag]);
    
    let csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Quant_Trade_Audit_${selectedStock?.ticker || 'ALL'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Quant transaction audit spreadsheet compiled and exported.', 'success');
  };

  // 20. Automated Audio briefings using browser speech engine
  const triggerAudioBriefing = () => {
    if (!selectedStock) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      addToast('Local text-to-speech synthesize pipeline not supported in this browser.', 'warning');
      return;
    }

    const portfolioHoldingsStr = Object.entries(paperPortfolio)
      .map(([tick, data]) => `${data.qty} shares of ${tick}`)
      .join(', ');

    const quoteSummary = hasRecentProviderQuote
      ? `The latest provider quote is ₹${selectedStock.currentPrice.toFixed(2)}, observed ${selectedStock.quoteAsOf}.`
      : 'A recent provider quote is unavailable.';
    const patternSummary = detectedPatterns.length
      ? `The latest available daily candles match ${detectedPatterns.map(pattern => pattern.name).join(', ')}.`
      : 'No matching pattern was found in the available provider daily candles.';
    const text = `Market data summary for ${selectedStock.ticker}. ${quoteSummary} ${patternSummary} This local paper portfolio holds ${portfolioHoldingsStr || 'no open assets'}. This summary is informational and does not place orders.`;

    // Stop current speaking
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    
    // Attempt to pick a smooth premium English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
    addToast('Playing a local summary of available market data.', 'info');
  };

  return (
    <div className="space-y-6" id="quant-trading-suite-root">
      
      {/* Overview Hero & Selector Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-wider border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
              Institutional Analytics Matrix
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight font-sans uppercase">
              Quantitative Strategy Engine & Terminal
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Deploy multivariate mathematical algorithms, formulate robust backtests, audit portfolio risks, inspect granular market depths, and execute automated transaction models across five integrated algorithmic modules.
            </p>
          </div>

          {/* Active target stock dropdown */}
          <div className="bg-slate-900/80 border border-slate-800/80 p-4 rounded-3xl space-y-2 min-w-56 shrink-0 backdrop-blur-xl shadow-lg">
            <label className="block text-[9px] font-mono font-bold uppercase text-slate-400 tracking-wider">
              Target Security
            </label>
            <div className="flex items-center gap-2">
              <select
                value={selectedStock?.ticker || ''}
                onChange={(e) => {
                  const s = stocks.find(st => st.ticker === e.target.value);
                  if (s) setSelectedStock(s);
                }}
                className="flex-1 bg-slate-950/80 text-white border border-slate-800 rounded-xl px-3 py-2 text-xs font-black tracking-wider focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                id="select-quant-target-stock"
              >
                {stocks.map(s => (
                  <option key={s.ticker} value={s.ticker}>
                    {s.ticker} (₹{s.currentPrice.toFixed(1)})
                  </option>
                ))}
              </select>
              <div 
                className="h-3.5 w-3.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: (selectedStock?.ticker && STOCK_COLORS[selectedStock.ticker]) || STOCK_COLORS.DEFAULT }}
              />
            </div>
            <p className="text-[10px] font-mono text-slate-400 flex justify-between pt-1 border-t border-slate-800/60">
              <span>Simple RSI (14):</span>
              <span className="font-bold text-white">{latestRsi === null ? 'Unavailable' : latestRsi}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Five-way Vector Navigation Tabs */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 shadow-md overflow-x-auto scrollbar-none" id="quant-vector-subtabs-nav">
        {[
          { id: 'technical', label: 'I. Technical & Visuals', icon: Sliders },
          { id: 'strategies', label: 'II. Strategies & Screening', icon: BarChart4 },
          { id: 'simulation', label: 'III. Risk & Simulation', icon: Briefcase },
          { id: 'fundamentals', label: 'IV. Fundamental Radar', icon: PieChart },
          { id: 'alerts', label: 'V. Alerts, NLP & Reports', icon: BellRing }
        ].map((v) => {
          const isActive = activeVector === v.id;
          const Icon = v.icon;
          return (
            <button
              key={v.id}
              onClick={() => setActiveVector(v.id as any)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
              }`}
              id={`quant-vector-tab-${v.id}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{v.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN DYNAMIC CONTENT BOX (Switched by activeVector) */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* VECTOR 1: Advanced Technical Analysis & Visual Analytics */}
        {activeVector === 'technical' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="quant-vector-technical">
            
            {/* Feature 1 & 2: Multi-Timeframe Analysis & Volume Profile (VPVR) */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    Multi-Timeframe technical Overlay
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                    Intraday timeframe signals require intraday provider bars.
                  </p>
                </div>
                <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-mono text-[9px] font-black rounded uppercase">
                  Interval metrics
                </div>
              </div>

              {/* MTF Grid list */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {mtfData.map((item) => (
                  <div key={item.interval} className="bg-gray-50 dark:bg-gray-950/30 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl space-y-1 text-center">
                    <span className="text-xs font-mono font-black text-indigo-600 dark:text-indigo-400">{item.interval}</span>
                    <div className="text-xs font-black text-gray-900 dark:text-white">₹{item.sma5.toFixed(1)}</div>
                    <div className="text-[9px] text-gray-400">RSI: <span className="font-mono text-gray-900 dark:text-gray-300 font-bold">{item.rsi}</span></div>
                    <div className="pt-1">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                        item.signal.includes('STRONG') 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10'
                      }`}>
                        {item.signal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {mtfData.length === 0 && <p className="text-[11px] text-gray-500">Intraday provider bars are unavailable; no timeframe signals are shown.</p>}

              {/* Volume Profile VPVR Mini layout */}
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                  Volume Profile Visible Range (VPVR) Concentration
                </h4>
                <p className="text-[10px] text-gray-400">
                  Trading volume depth overlay calculated horizontally by price nodes. Identifies support concentration bounds.
                </p>
                <div className="space-y-1.5 bg-gray-50 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-800 p-3 rounded-xl">
                  {vpvrData.slice(0, 5).map((bucket, i) => {
                    const pct = Math.min(100, Math.max(15, (bucket.totalVolume / 100000000) * 100));
                    return (
                      <div key={i} className="flex items-center gap-3 text-[10px]">
                        <span className="w-16 font-mono font-bold text-gray-500">₹{bucket.priceLevel}</span>
                        <div className="flex-1 h-3.5 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative flex">
                          <div 
                            className="h-full bg-indigo-500/20 border-r border-indigo-500/30"
                            style={{ width: `${pct * 0.6}%` }}
                          />
                          <div 
                            className="h-full bg-pink-500/15"
                            style={{ width: `${pct * 0.4}%` }}
                          />
                          <span className="absolute inset-0 flex items-center pl-2 font-mono font-bold text-[8px] text-gray-600 dark:text-gray-300">
                            Total: {(bucket.totalVolume / 1000000).toFixed(1)}M ({(bucket.upCloseVolume / bucket.totalVolume * 100).toFixed(0)}% on up closes)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {vpvrData.length === 0 && <p className="text-[11px] text-gray-500">Volume profile is unavailable without varied provider daily closes and reported volume.</p>}
            </div>

            {/* Feature 3: Interactive Drawing & Pattern Canvas */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Interactive Drawing Canvas & Pivot Overlay
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Select a vector drawing utility to plot support channels, resistance bounds or Fibonacci retracements.
                </p>
              </div>

              {/* Drawing tools controls bar */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => {
                    setActiveDrawingTool('line');
                    setTempLineStart(null);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black cursor-pointer transition-all ${
                    activeDrawingTool === 'line'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <PenTool className="h-3.5 w-3.5" />
                  <span>Trend Line Tool</span>
                </button>
                <button
                  onClick={() => {
                    setActiveDrawingTool('fib');
                    setTempLineStart(null);
                  }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black cursor-pointer transition-all ${
                    activeDrawingTool === 'fib'
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <GitCommit className="h-3.5 w-3.5" />
                  <span>Fibonacci Retracement</span>
                </button>
                <button
                  onClick={clearCanvasDrawings}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-black cursor-pointer transition-all bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear Lines</span>
                </button>
              </div>

              {/* Vector drawing stage */}
              <div className="relative border border-gray-200 dark:border-gray-800 rounded-xl bg-slate-950 h-56 w-full overflow-hidden mt-3" id="vector-drawing-stage">
                <svg
                  ref={canvasRef}
                  width="100%"
                  height="100%"
                  onClick={handleCanvasClick}
                  className="absolute inset-0 cursor-crosshair select-none"
                >
                  {/* Subtle grid background */}
                  <defs>
                    <pattern id="canvas-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeWidth="0.5" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#canvas-grid)" />

                  {/* Draw simulated underlying price stream under line */}
                  <path
                    d="M 10 140 Q 150 70, 300 130 T 590 100"
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.2)"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                  />

                  {/* Render drawings */}
                  {drawings.map((draw) => {
                    if (draw.type === 'line') {
                      const p1 = draw.points[0];
                      const p2 = draw.points[1];
                      return (
                        <line
                          key={draw.id}
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke="#3b82f6"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      );
                    } else if (draw.type === 'fib') {
                      const yVal = draw.points[0].y;
                      const fibLevels = [
                        { level: '100%', pct: 0, color: 'rgba(239, 68, 68, 0.4)' },
                        { level: '61.8%', pct: 0.382, color: 'rgba(245, 158, 11, 0.4)' },
                        { level: '50.0%', pct: 0.5, color: 'rgba(16, 185, 129, 0.4)' },
                        { level: '38.2%', pct: 0.618, color: 'rgba(14, 165, 233, 0.4)' },
                        { level: '0%', pct: 1.0, color: 'rgba(139, 92, 246, 0.4)' }
                      ];
                      return (
                        <g key={draw.id}>
                          {fibLevels.map((lvl, idx) => {
                            const offset = yVal + lvl.pct * 70;
                            return (
                              <g key={idx}>
                                <line
                                  x1="0"
                                  y1={offset}
                                  x2="600"
                                  y2={offset}
                                  stroke={lvl.color}
                                  strokeWidth="1.2"
                                  strokeDasharray="3 2"
                                />
                                <text
                                  x="10"
                                  y={offset - 4}
                                  fill="white"
                                  fontSize="8px"
                                  fontFamily="monospace"
                                  opacity="0.6"
                                >
                                  FIB {lvl.level}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      );
                    }
                    return null;
                  })}

                  {/* Draw ongoing line builder */}
                  {activeDrawingTool === 'line' && tempLineStart && (
                    <circle cx={tempLineStart.x} cy={tempLineStart.y} r="4" fill="#3b82f6" />
                  )}
                </svg>

                <div className="absolute bottom-2 right-2 bg-slate-900/80 px-2 py-1 rounded text-[9px] text-slate-400 font-mono pointer-events-none">
                  {activeDrawingTool !== 'none' ? `Tool Active: ${activeDrawingTool}` : 'Click Canvas to Annotate Support lines'}
                </div>
              </div>
            </div>

            {/* Feature 4: Correlation Matrix Heatmap */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    Statistical Correlation Matrix Heatmap
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                    Pearson correlation of overlapping provider daily close returns. Describes history and does not predict future movement.
                  </p>
                </div>
              </div>

              {/* Matrix view */}
              <div className="overflow-x-auto">
                {correlationMatrix.tickers.length < 2 ? (
                  <p className="text-xs text-gray-500">Correlation is unavailable until at least two provider histories are available.</p>
                ) : <div className="min-w-[400px] grid gap-1.5 font-mono text-center" style={{ gridTemplateColumns: `repeat(${correlationMatrix.tickers.length + 1}, minmax(0, 1fr))` }}>
                  {/* Row headers */}
                  <div className="bg-gray-100/50 dark:bg-gray-950 p-2 text-xs font-bold text-gray-500 dark:text-gray-400 rounded-lg flex items-center justify-center">
                    TICKER
                  </div>
                  {correlationMatrix.tickers.map(t => (
                    <div key={t} className="bg-gray-50 dark:bg-gray-950/40 p-2 text-[10px] font-extrabold text-gray-800 dark:text-gray-200 rounded-lg flex items-center justify-center">
                      {t}
                    </div>
                  ))}

                  {correlationMatrix.tickers.map((rowTicker) => (
                    <React.Fragment key={rowTicker}>
                      {/* Left header column */}
                      <div className="bg-gray-50 dark:bg-gray-950/40 p-2 text-[10px] font-extrabold text-gray-800 dark:text-gray-200 rounded-lg flex items-center justify-left pl-3 text-left">
                        {rowTicker}
                      </div>

                      {correlationMatrix.tickers.map((colTicker) => {
                        const val = correlationMatrix.values[rowTicker]?.[colTicker];
                        if (val === null || val === undefined) {
                          return <div key={colTicker} className="p-3 text-[9px] rounded-lg bg-gray-50 dark:bg-gray-950/40 text-gray-400 flex items-center justify-center">Unavailable</div>;
                        }
                        // Grade colors based on correlation strength
                        let cellBg = 'bg-indigo-50 dark:bg-indigo-950/10 text-indigo-700';
                        if (val >= 0.8) cellBg = 'bg-indigo-600 text-white font-extrabold';
                        else if (val >= 0.5) cellBg = 'bg-indigo-500/80 text-white font-bold';
                        else if (val >= 0.3) cellBg = 'bg-indigo-300 dark:bg-indigo-900/50 text-indigo-950 dark:text-indigo-200';
                        else if (val >= 0.15) cellBg = 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300';
                        
                        return (
                          <div 
                            key={colTicker} 
                            className={`p-3 text-xs rounded-lg transition-all hover:scale-105 cursor-help ${cellBg} flex flex-col justify-center items-center`}
                            title={`Correlation Coefficient between ${rowTicker} & ${colTicker} is ${val.toFixed(2)}`}
                          >
                            <span className="font-mono">{val.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>}
              </div>
            </div>

          </div>
        )}

        {/* VECTOR 2: Quantitative Strategies & Smart Screeners */}
        {activeVector === 'strategies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="quant-vector-strategies">
            
            {/* Feature 5: Candlestick Pattern Recognizer */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Candlestick Pattern Recognizer
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Heuristic rules scanned against active OHLC charts to pinpoint structural formations
                </p>
              </div>

              {/* Detected items list */}
              <div className="space-y-3">
                {detectedPatterns.length === 0 && <p className="text-[11px] text-gray-500">No matching pattern is available from the selected provider daily candles.</p>}
                {detectedPatterns.map((pat, i) => (
                  <div key={i} className="border border-indigo-100 dark:border-indigo-950/30 bg-indigo-50/20 dark:bg-indigo-950/5 p-3.5 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-indigo-600 dark:text-indigo-400" />
                        <span className="font-extrabold text-xs text-gray-950 dark:text-white">{pat.name}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        pat.direction === 'Bullish' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : pat.direction === 'Reversal'
                          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        {pat.direction} (Confidence: {pat.strength})
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed font-sans">
                      {pat.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 6: Quantitative Backtesting Engine */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Quantitative Backtesting Suite
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Close-only walk-forward simulation on provider daily prices. Signals use prior completed bar; fills use next bar with 0.15% roundtrip statutory friction deducted.
                </p>
              </div>

              {/* Threshold sliders, Risk Profile & Date Ranges */}
              <div className="space-y-4 text-xs font-sans">
                {/* Strategy Protocol Selector Toggle */}
                <div className="space-y-1.5">
                  <label className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                    Backtest Strategy Protocol
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                    <button
                      onClick={() => setBacktestStrategyType('SMA_CROSSOVER')}
                      className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 uppercase ${
                        backtestStrategyType === 'SMA_CROSSOVER'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>SMA Cross</span>
                    </button>
                    <button
                      onClick={() => setBacktestStrategyType('RSI')}
                      className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 uppercase ${
                        backtestStrategyType === 'RSI'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>RSI Bands</span>
                    </button>
                    <button
                      onClick={() => setBacktestStrategyType('BREAKOUT')}
                      className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 uppercase ${
                        backtestStrategyType === 'BREAKOUT'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>20D Breakout</span>
                    </button>
                    <button
                      onClick={() => setBacktestStrategyType('DUAL_MOMENTUM')}
                      className={`py-1.5 px-2 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 uppercase ${
                        backtestStrategyType === 'DUAL_MOMENTUM'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                      }`}
                    >
                      <span>Dual Momentum</span>
                    </button>
                  </div>
                </div>

                {/* Lookback Date Range & Risk Level row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Date Range Selection */}
                  <div className="space-y-1.5">
                    <label className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      Lookback Window (Daily Bars)
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {['1D', '1W', '30D', '90D', '180D', '365D', 'ALL'].map((range) => (
                        <button
                          key={range}
                          onClick={() => setBacktestDateRange(range)}
                          className={`flex-1 min-w-[36px] py-1.5 px-1 text-[10px] font-black rounded-lg transition-all border cursor-pointer ${
                            backtestDateRange === range
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                              : 'bg-gray-50 dark:bg-gray-950/40 border-gray-200/50 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          {range === 'ALL' ? 'All' : range}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Risk Level Selector */}
                  <div className="space-y-1.5">
                    <label className="block text-gray-400 font-bold uppercase text-[9px] tracking-wider">
                      Strategy Risk Profile
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {['Conservative', 'Moderate', 'Aggressive'].map((level) => {
                        let activeStyle = '';
                        if (level === 'Conservative') activeStyle = 'bg-emerald-600 border-emerald-600 text-white';
                        else if (level === 'Moderate') activeStyle = 'bg-indigo-600 border-indigo-600 text-white';
                        else if (level === 'Aggressive') activeStyle = 'bg-amber-600 border-amber-600 text-white';

                        return (
                          <button
                            key={level}
                            onClick={() => setBacktestRiskLevel(level)}
                            className={`flex-1 min-w-[70px] py-1.5 px-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all border cursor-pointer ${
                              backtestRiskLevel === level
                                ? `${activeStyle} shadow-sm`
                                : 'bg-gray-50 dark:bg-gray-950/40 border-gray-200/50 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {backtestStrategyType === 'SMA_CROSSOVER' ? (
                  <div className="space-y-3.5">
                    {/* Fast SMA Input */}
                    <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/40 p-3.5 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fast SMA Lookback (Days)</span>
                        <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          {fastSmaPeriod} Days
                        </span>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="2"
                          max="30"
                          value={fastSmaPeriod}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setFastSmaPeriod(val);
                            if (val >= slowSmaPeriod) {
                              setSlowSmaPeriod(val + 1);
                            }
                          }}
                          className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[8px] text-gray-400 dark:text-gray-500 font-mono">
                          <span>2d (Inception)</span>
                          <span>30d (Short-Term Trend)</span>
                        </div>
                      </div>
                    </div>

                    {/* Slow SMA Input */}
                    <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/40 p-3.5 rounded-xl space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Slow SMA Lookback (Days)</span>
                        <span className="text-[10px] font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          {slowSmaPeriod} Days
                        </span>
                      </div>
                      <div className="space-y-1">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={slowSmaPeriod}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setSlowSmaPeriod(val);
                            if (val <= fastSmaPeriod) {
                              setFastSmaPeriod(Math.max(2, val - 1));
                            }
                          }}
                          className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <div className="flex justify-between text-[8px] text-gray-400 dark:text-gray-500 font-mono">
                          <span>10d (Medium Momentum)</span>
                          <span>100d (Major Baseline)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Buy Range Inputs */}
                    <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/40 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Buy Trigger Zone (RSI Band)</span>
                        <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded">
                          {rsiBuyMin} - {rsiBuyMax} RSI
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase font-bold">RSI Min (Floor)</span>
                          <input
                            type="range"
                            min="10"
                            max="35"
                            value={rsiBuyMin}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRsiBuyMin(val);
                              if (val > rsiBuyMax) setRsiBuyMax(val);
                            }}
                            className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase font-bold">RSI Max (Ceiling)</span>
                          <input
                            type="range"
                            min="20"
                            max="50"
                            value={rsiBuyMax}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRsiBuyMax(val);
                              if (val < rsiBuyMin) setRsiBuyMin(val);
                            }}
                            className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sell Range Inputs */}
                    <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/50 dark:border-gray-800/40 p-3.5 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sell Trigger Zone (RSI Band)</span>
                        <span className="text-[10px] font-mono font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded">
                          {rsiSellMin} - {rsiSellMax} RSI
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase font-bold">RSI Min (Floor)</span>
                          <input
                            type="range"
                            min="50"
                            max="75"
                            value={rsiSellMin}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRsiSellMin(val);
                              if (val > rsiSellMax) setRsiSellMax(val);
                            }}
                            className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] text-gray-400 dark:text-gray-500 block uppercase font-bold">RSI Max (Ceiling)</span>
                          <input
                            type="range"
                            min="65"
                            max="95"
                            value={rsiSellMax}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setRsiSellMax(val);
                              if (val < rsiSellMin) setRsiSellMin(val);
                            }}
                            className="w-full h-1 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Backtest action */}
              <div>
                <button
                  onClick={runQuantBacktest}
                  disabled={backtestRunning || !hasProviderHistory || (selectedStock?.history.length ?? 0) < backtestMinimumBars}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all"
                  id="btn-trigger-backtest"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>{backtestRunning ? 'Compiling History...' : 'Simulate Strategy Backtest'}</span>
                </button>
              </div>

              {!hasProviderHistory && <p className="text-[11px] text-gray-500">Provider historical prices are unavailable for this security, so the backtest is disabled.</p>}
              {hasProviderHistory && (selectedStock?.history.length ?? 0) < backtestMinimumBars && <p className="text-[11px] text-gray-500">Need {backtestMinimumBars} daily history rows for the selected strategy and settings.</p>}

              {/* Backtest Report */}
              {backtestResults && (
                <div className="space-y-3 bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-center">
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-lg">
                      <span className="text-[8px] text-gray-400 uppercase font-black">Total Return</span>
                      <div className={`text-xs font-mono font-black ${backtestResults.totalReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{backtestResults.totalReturn >= 0 ? '+' : ''}{backtestResults.totalReturn}%</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-lg">
                      <span className="text-[8px] text-gray-400 uppercase font-black">Sharpe Ratio</span>
                      <div className="text-xs font-mono font-black text-indigo-600">{backtestResults.sharpe ?? 'N/A'}</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-lg">
                      <span className="text-[8px] text-gray-400 uppercase font-black">Max Drawdown</span>
                      <div className="text-xs font-mono font-black text-rose-600">{backtestResults.maxDrawdown}%</div>
                    </div>
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-2.5 rounded-lg">
                      <span className="text-[8px] text-gray-400 uppercase font-black">Completed Trades</span>
                      <div className="text-xs font-mono font-black text-gray-800 dark:text-gray-200">{backtestResults.tradesCount}</div>
                    </div>
                  </div>

                  {/* Recharts Backtest Equity Curve */}
                  <div className="h-28 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={backtestResults.equityCurve}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                        <XAxis dataKey="date" hide />
                        <YAxis hide />
                        <RechartsTooltip />
                        <Area type="monotone" dataKey="strategy" stroke="#6366f1" fill="#6366f1" fillOpacity={0.06} strokeWidth={1.5} name="Quant Strategy" />
                        <Area type="monotone" dataKey="benchmark" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.01} strokeWidth={1} name="Buy & Hold" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Feature 7 & 8: Treemap & Strategy Custom Rule Builder */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Market Heatmap Treemap (Sector Weight)
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Sector weights and returns are unavailable because no sector provider feed is connected.
                </p>
              </div>

              {/* Heatmap blocks */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-white">
                {sectorHeatmap.map((sec, idx) => {
                  const isUp = sec.change >= 0;
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl space-y-1 relative overflow-hidden flex flex-col justify-between h-20 shadow-xs cursor-crosshair transition-transform hover:scale-[1.02] ${
                        isUp 
                          ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' 
                          : 'bg-gradient-to-br from-rose-600 to-rose-700'
                      }`}
                    >
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider">{sec.sector}</div>
                        <div className="text-[9px] opacity-75">Weight: {sec.weight}</div>
                      </div>
                      <div className="text-xs font-mono font-black text-right self-end">
                        {isUp ? `+${sec.change}%` : `${sec.change}%`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Strategy Rules List & Builder */}
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">
                  Local Strategy Rule Notes
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRuleInput}
                    onChange={(e) => setNewRuleInput(e.target.value)}
                    placeholder="e.g. Volume is 2x above 10-day average..."
                    className="flex-1 bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5 focus:outline-none"
                    id="input-new-strategy-rule"
                  />
                  <button
                    onClick={addStrategyRule}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg"
                    id="btn-add-strategy-rule"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* List of active rule segments */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {strategyRules.length === 0 && <p className="text-[10px] text-gray-400">No local rule notes yet. Notes are not compiled or executed.</p>}
                  {strategyRules.map((r) => (
                    <span 
                      key={r.id} 
                      className="bg-gray-100/80 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-[10px] text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md font-bold inline-flex items-center gap-1"
                    >
                      <span>{r.rule}</span>
                      <button onClick={() => removeRule(r.id)} className="text-gray-400 hover:text-rose-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* VECTOR 3: Simulation & Risk Management */}
        {activeVector === 'simulation' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="quant-vector-simulation">
            
            {/* Feature 9: Paper Trading Sandbox Terminal */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    Local Paper Portfolio Simulator
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                    Virtual cash starts at ₹10,00,000 in this page session. A recent provider quote is required; trades stay in local browser state and are never sent to a broker.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[8px] text-gray-400 font-black uppercase block">Available Balance</span>
                  <span className="text-xs sm:text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                    ₹{paperCash.toLocaleString('en-IN', { maximumFractionDigits: 1 })}
                  </span>
                </div>
              </div>

              {/* Form trade block */}
              <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-xl border border-gray-200 dark:border-gray-800 space-y-3.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Order Security:</span>
                  <span className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                    {selectedStock?.ticker ?? 'No security selected'} ({hasRecentProviderQuote && selectedStock ? `₹${selectedStock.currentPrice.toFixed(2)} · provider quote` : 'recent provider quote unavailable'})
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Quantity (Shares)</label>
                  <input
                    type="number"
                    value={tradeQtyInput}
                    onChange={(e) => setTradeQtyInput(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 focus:outline-none"
                    id="input-paper-trade-qty"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => executePaperTrade('BUY')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-lg text-xs cursor-pointer shadow-xs"
                    id="btn-paper-buy"
                  >
                    Record Virtual Buy
                  </button>
                  <button
                    onClick={() => executePaperTrade('SELL')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-black py-2.5 rounded-lg text-xs cursor-pointer shadow-xs"
                    id="btn-paper-sell"
                  >
                    Record Virtual Sell
                  </button>
                </div>
              </div>

              {/* Mini Portfolio */}
              <div className="space-y-1.5 pt-2">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">
                  Active Paper Portfolio Holdings
                </h4>
                {Object.keys(paperPortfolio).length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">No open virtual holdings active.</p>
                ) : (
                  <div className="space-y-1">
                    {Object.entries(paperPortfolio).map(([tick, details]) => {
                      const stockLive = stocks.find(s => s.ticker === tick);
                      const hasCurrentPrice = !!stockLive && canUseQuoteForExecution(stockLive);
                      const currentPrice = hasCurrentPrice ? stockLive!.currentPrice : null;
                      const pl = currentPrice === null ? null : (currentPrice - details.avgBuyPrice) * details.qty;
                      const isProfit = pl !== null && pl >= 0;
                      return (
                        <div key={tick} className="flex justify-between items-center text-xs bg-gray-50/50 dark:bg-gray-950/20 px-3 py-2 rounded-lg border border-gray-200/40 dark:border-gray-800">
                          <div>
                            <span className="font-extrabold">{tick}</span>
                            <span className="text-[10px] text-gray-400 block">{details.qty} shares @ ₹{details.avgBuyPrice}</span>
                          </div>
                          <div className="text-right font-mono">
                            <div className="font-bold">{currentPrice === null ? 'Value unavailable' : `₹${(details.qty * currentPrice).toFixed(0)}`}</div>
                            <div className={`text-[10px] font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {pl === null ? 'P&L unavailable without a recent quote' : `${isProfit ? '+' : ''}₹${pl.toFixed(1)}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Feature 10 & 11: Value at Risk (VaR) Analyzer & Order Book (L2) */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Value at Risk (VaR) & Market Depth (L2)
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Advanced risk tolerance analysis and bid-ask volume ladder monitoring
                </p>
              </div>

              {/* Value at Risk Grid */}
              <div className="grid grid-cols-2 gap-3.5 text-center">
                <div className="bg-red-50/40 dark:bg-red-950/5 border border-red-100/50 dark:border-red-900/10 p-3 rounded-xl">
                  <span className="text-[9px] text-rose-600 dark:text-rose-400 uppercase font-black tracking-wider block">95% Normal Scenario</span>
                  <div className="text-sm font-mono font-black text-gray-900 dark:text-gray-100">{valueAtRiskStats.var95 === null ? 'Unavailable' : `₹${valueAtRiskStats.var95}`}</div>
                  <p className="text-[8px] text-gray-400 mt-0.5">Per ₹100 exposure; assumes zero-mean returns and does not cap losses.</p>
                </div>
                <div className="bg-amber-50/40 dark:bg-amber-950/5 border border-amber-100/50 dark:border-amber-900/10 p-3 rounded-xl">
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 uppercase font-black tracking-wider block">99% Normal Scenario</span>
                  <div className="text-sm font-mono font-black text-gray-900 dark:text-gray-100">{valueAtRiskStats.var99 === null ? 'Unavailable' : `₹${valueAtRiskStats.var99}`}</div>
                  <p className="text-[8px] text-gray-400 mt-0.5">Per ₹100 exposure; historical normal-model estimate, not a worst-case loss.</p>
                </div>
              </div>
              {valueAtRiskStats.var95 === null && <p className="text-[10px] text-gray-500">At least 30 provider daily closes are needed for this simplified historical estimate.</p>}

              {/* Order Book Level 2 Ladder */}
              <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wide">
                  Toy simulated depth for UI preview ({selectedStock?.ticker}); not exchange order-book data
                </span>
                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono">
                  {/* Bids Column */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-emerald-600 font-extrabold border-b border-gray-100 dark:border-gray-800 pb-1">
                      <span>BID (BUY)</span>
                      <span>QTY</span>
                    </div>
                    {orderBook.bids.map((bid, i) => (
                      <div key={i} className="flex justify-between text-gray-600 dark:text-gray-300 relative">
                        <div className="absolute right-0 h-full bg-emerald-500/5 rounded" style={{ width: `${(bid.qty/1000)*100}%` }} />
                        <span className="text-emerald-600 font-extrabold">₹{bid.price}</span>
                        <span className="z-10">{bid.qty}</span>
                      </div>
                    ))}
                  </div>

                  {/* Asks Column */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-rose-600 font-extrabold border-b border-gray-100 dark:border-gray-800 pb-1">
                      <span>ASK (SELL)</span>
                      <span>QTY</span>
                    </div>
                    {orderBook.asks.map((ask, i) => (
                      <div key={i} className="flex justify-between text-gray-600 dark:text-gray-300 relative">
                        <div className="absolute left-0 h-full bg-rose-500/5 rounded" style={{ width: `${(ask.qty/1000)*100}%` }} />
                        <span className="text-rose-600 font-extrabold">₹{ask.price}</span>
                        <span className="z-10">{ask.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 12: Performance Ledger Log & Trading Journal */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    Local Paper Transaction Journal
                  </h3>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                    This page-session journal contains only virtual transactions created here. It is not broker activity or a durable audit record.
                  </p>
                </div>
                <button
                  onClick={downloadAuditCsv}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1 transition-all"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Export Local CSV</span>
                </button>
              </div>

              {/* Journal list */}
              <div className="space-y-2">
                {tradeLedger.length === 0 && <p className="text-xs text-gray-500">No local paper transactions have been recorded in this page session.</p>}
                {tradeLedger.map((t, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-gray-50 dark:bg-gray-950/40 p-3.5 rounded-xl border border-gray-200/40 dark:border-gray-800 gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                        t.type === 'BUY' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {t.type}
                      </span>
                      <div>
                        <div className="text-xs font-black text-gray-950 dark:text-white">{t.ticker}</div>
                        <div className="text-[10px] text-gray-400 font-mono">Timestamp: {t.timestamp}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <span className="text-[9px] text-gray-400 block font-mono">Qty & price</span>
                        <span className="font-mono font-bold text-gray-800 dark:text-gray-300">{t.qty} shares @ ₹{t.price}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block font-mono">Record type</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600">
                          {t.tag}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VECTOR 4: Fundamental Analytics & Corporate Events */}
        {activeVector === 'fundamentals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="quant-vector-fundamentals">
            
            {/* Feature 13: Fundamental Radar spider chart */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Fundamental Radar Comparison Matrix
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Multi-variate index metrics comparing valuation, profitability, safety, and income factors.
                </p>
              </div>

              {/* Spider overlay table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400 min-w-[700px]">
                  <thead className="text-[10px] uppercase font-mono bg-gray-50 dark:bg-gray-950/40 text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                      <th className="py-2.5 px-3">FINANCIAL RATIO</th>
                      <th className="py-2.5 px-3 text-center">RELIANCE</th>
                      <th className="py-2.5 px-3 text-center">TCS</th>
                      <th className="py-2.5 px-3 text-center">HDFCBANK</th>
                      <th className="py-2.5 px-3 text-center">INFY</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {fundamentalRatios.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/20">
                        <td className="py-3 px-3 font-bold text-gray-800 dark:text-gray-200">{item.ratio}</td>
                        <td className="py-3 px-3 text-center font-mono">{item.RELIANCE}</td>
                        <td className="py-3 px-3 text-center font-mono">{item.TCS}</td>
                        <td className="py-3 px-3 text-center font-mono">{item.HDFCBANK}</td>
                        <td className="py-3 px-3 text-center font-mono">{item.INFY}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature 14 & 15: Corporate Calendar Overlay & Institutional Deal Tracker */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Corporate Event Timeline & bulk Transactions
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Monitors earnings calendar announcements alongside institutional block deals.
                </p>
              </div>

              {/* Corporate Calendar events */}
              <div className="space-y-2">
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Upcoming Board Milestones</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {corporateCalendar.map((item, i) => (
                    <div key={i} className="bg-gray-50 dark:bg-gray-950 p-3 rounded-xl border border-gray-200/40 dark:border-gray-800 space-y-1 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{item.stock}</span>
                        <span className="text-gray-400 font-mono text-[10px]">{item.date}</span>
                      </div>
                      <p className="text-gray-800 dark:text-gray-200 font-medium">{item.event}</p>
                      <span className="inline-block bg-indigo-500/10 text-indigo-600 px-1.5 py-0.2 rounded text-[8px] font-bold">Impact: {item.impact}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Institutional Deal tracker log */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Institutional bulk & Block Deal Logs</span>
                <div className="space-y-1.5">
                  {institutionalDeals.map((deal, i) => (
                    <div key={i} className="flex justify-between items-center text-[11px] bg-slate-950 p-2 rounded-lg border border-slate-900">
                      <div>
                        <span className="font-extrabold text-white">{deal.broker}</span>
                        <span className="text-slate-500 font-mono text-[9px] block">Time: {deal.time}</span>
                      </div>
                      <div className="text-right">
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase inline-block mr-1.5 ${
                          deal.action.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {deal.action}
                        </span>
                        <span className="font-mono text-slate-300 font-bold">{deal.ticker}: {deal.qty} ({deal.value})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature 16: Global Macro-Economic Dashboard */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Global Macro-Economic Dashboard Indicator
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Sovereign yield indices and commodity pricing layers overlaying domestic stock indices.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {macroIndicators.map((ind, i) => (
                  <div key={i} className="bg-gray-50/50 dark:bg-gray-950 p-3.5 rounded-xl border border-gray-200/40 dark:border-gray-800 space-y-1 text-xs">
                    <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wide">{ind.name}</span>
                    <div className="text-sm font-black text-gray-950 dark:text-white">{ind.value}</div>
                    <div className="flex justify-between text-[9px]">
                      <span className="text-emerald-600 font-bold">{ind.change}</span>
                      <span className="text-gray-400 font-medium">{ind.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* VECTOR 5: Smart Alerts, NLP, & Integrations */}
        {activeVector === 'alerts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="quant-vector-alerts">
            
            {/* Feature 17: Webhook Alerting system */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  Dynamic Outbound Webhook Alerting
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Instantly dispatch alert triggers to third-party endpoints (Slack, Discord, or custom gateways) when conditions align.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Target Webhook URL</label>
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 focus:outline-none"
                    id="input-alert-webhook-url"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Trigger Event Condition</label>
                  <input
                    type="text"
                    value={webhookTrigger}
                    onChange={(e) => setWebhookTrigger(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-950 text-xs text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 focus:outline-none"
                    id="input-alert-webhook-trigger"
                  />
                </div>

                <button
                  onClick={dispatchTestWebhook}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2 rounded-lg text-xs cursor-pointer shadow-xs"
                  id="btn-dispatch-test-webhook"
                >
                  Dispatch Webhook Simulation Payload
                </button>
              </div>
            </div>

            {/* Feature 18: NLP Sentiment curve overlay */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
                  NLP socio-Sentiment Index Overlay
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium font-sans">
                  Natural language processing scores from corporate reports, mainstream news ticker, and forums overlayed on prices.
                </p>
              </div>

              {/* Recharts Curve */}
              <div className="h-44 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sentimentCurve}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                    <XAxis dataKey="date" hide />
                    <YAxis hide />
                    <RechartsTooltip />
                    <Area type="monotone" dataKey="sentiment" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.06} name="News Sentiment Score (0-100)" />
                    <Area type="monotone" dataKey="price" stroke="#ec4899" fill="none" strokeWidth={1.5} name="Asset price (₹)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Feature 19 & 20: Regulatory Reporting compiling & Audio briefings speaker */}
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Reporting compilation block */}
                <div className="space-y-3 border-r border-gray-100 dark:border-gray-800 pr-0 md:pr-6">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">
                    Compile Audit & Regulatory Reports
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Generate formatted auditing compliance reports incorporating paper transactions, risk parameters, and active threshold configurations.
                  </p>
                  <button
                    onClick={downloadAuditCsv}
                    className="w-full border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-700 dark:text-gray-300 font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Download Compliance CSV Sheet</span>
                  </button>
                </div>

                {/* Text to speech morning briefing */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wide">
                    Automated Audio Morning Market Briefing
                  </h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Utilizes standard SpeechSynthesis to synthesize a vocal audio briefing on the selected target stock, active trends, macro yields, and portfolio allocations.
                  </p>
                  <button
                    onClick={triggerAudioBriefing}
                    className="w-full bg-pink-600 hover:bg-pink-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-all"
                  >
                    <Volume2 className="h-4 w-4 animate-bounce" />
                    <span>Synthesize Morning Audio Report</span>
                  </button>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
