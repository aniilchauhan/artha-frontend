'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { 
  Play, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Coins, 
  LineChart, 
  History, 
  HelpCircle,
  Activity,
  Award,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  Sliders,
  ChevronRight,
  RotateCcw,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

// Define Interface types for Trade Logs & Performance
interface SimulatedTrade {
  id: string;
  type: 'BUY' | 'SELL';
  date: string;
  price: number;
  shares: number;
  cashRemaining: number;
  portfolioValue: number;
  profitOrLoss?: number;
}

interface EquityPoint {
  date: string;
  value: number;
  buyAndHoldValue: number;
}

interface BacktestResults {
  equityHistory: EquityPoint[];
  trades: SimulatedTrade[];
  totalReturnPercent: number;
  buyAndHoldReturnPercent: number;
  finalPortfolioValue: number;
  finalBuyAndHoldValue: number;
  totalTradesCount: number;
  winRate: number;
  maxDrawdown: number;
  capitalInvested: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: { 
      type: 'spring', 
      stiffness: 300, 
      damping: 24 
    } 
  }
};



export default function StrategyBacktester() {
  const { selectedTicker, stocks, addToast } = useStockContext();
  const stock = stocks.find(s => s.ticker === selectedTicker);

  // Form Inputs State
  const [capital, setCapital] = useState<number>(100000);
  const [strategyType, setStrategyType] = useState<'MA_CROSSOVER' | 'RSI_OS' | 'BOLLINGER_REVERSION'>('MA_CROSSOVER');
  
  // Date range selectors (aligned with indices of history)
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');

  // Moving Average params
  const [fastPeriod, setFastPeriod] = useState<number>(5);
  const [slowPeriod, setSlowPeriod] = useState<number>(15);
  const [maType, setMaType] = useState<'SMA' | 'EMA'>('SMA');

  // RSI params
  const [rsiPeriod, setRsiPeriod] = useState<number>(14);
  const [rsiOversold, setRsiOversold] = useState<number>(30);
  const [rsiOverbought, setRsiOverbought] = useState<number>(70);

  // Bollinger Bands params
  const [bbPeriod, setBbPeriod] = useState<number>(20);
  const [bbStdDev, setBbStdDev] = useState<number>(2);

  // Simulation results
  const [results, setResults] = useState<BacktestResults | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Sync date ranges when stock or history loads
  useEffect(() => {
    if (stock && stock.history && stock.history.length > 20) {
      const history = stock.history;
      // Start backtest after 20 bars lookback warmup to prevent lack of indicator data
      setStartDateStr(history[20].date);
      setEndDateStr(history[history.length - 1].date);
      setResults(null);
    }
  }, [selectedTicker, stock]);

  // Extract date options for selectors
  const dateOptions = useMemo(() => {
    if (!stock || !stock.history) return [];
    return stock.history.map(h => h.date);
  }, [stock]);

  // Ensure start date cannot be after end date
  const handleStartDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = e.target.value;
    if (!stock) return;
    const newIdx = stock.history.findIndex(h => h.date === selectedDate);
    const endIdx = stock.history.findIndex(h => h.date === endDateStr);
    
    if (newIdx !== -1 && endIdx !== -1 && newIdx >= endIdx) {
      // Pull start date to at least 5 days before end date, or first possible
      const adjIdx = Math.max(0, endIdx - 5);
      setStartDateStr(stock.history[adjIdx].date);
    } else {
      setStartDateStr(selectedDate);
    }
    setResults(null);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedDate = e.target.value;
    if (!stock) return;
    const startIdx = stock.history.findIndex(h => h.date === startDateStr);
    const newIdx = stock.history.findIndex(h => h.date === selectedDate);

    if (startIdx !== -1 && newIdx !== -1 && newIdx <= startIdx) {
      // Pull end date to at least 5 days after start date, or last possible
      const adjIdx = Math.min(stock.history.length - 1, startIdx + 5);
      setEndDateStr(stock.history[adjIdx].date);
    } else {
      setEndDateStr(selectedDate);
    }
    setResults(null);
  };

  // Run the backtest logic
  const handleRunBacktest = async () => {
    if (!stock || !stock.history || !startDateStr || !endDateStr) return;

    setIsSimulating(true);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          history: stock.history,
          capital,
          strategyType,
          startDateStr,
          endDateStr,
          fastPeriod,
          slowPeriod,
          maType,
          rsiPeriod,
          rsiOversold,
          rsiOverbought,
          bbPeriod,
          bbStdDev,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data: BacktestResults = await response.json();
      setResults(data);
    } catch (error: any) {
      console.error('Failed to run backtest:', error);
      addToast(error?.message || 'Failed to run backtest on the server', 'warning');
      setResults(null);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!stock) return null;

  // Render Strategy Parameters Setup depending on selected strategy
  const renderStrategyControls = () => {
    switch (strategyType) {
      case 'MA_CROSSOVER':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="input-fast-period" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fast MA Period</label>
              <div className="relative flex items-center">
                <Activity className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="input-fast-period"
                  type="number"
                  min="2"
                  max="25"
                  value={fastPeriod}
                  onChange={(e) => setFastPeriod(Math.max(2, parseInt(e.target.value) || 2))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="input-slow-period" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Slow MA Period</label>
              <div className="relative flex items-center">
                <Activity className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="input-slow-period"
                  type="number"
                  min="10"
                  max="60"
                  value={slowPeriod}
                  onChange={(e) => setSlowPeriod(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="select-ma-type" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Average Type</label>
              <div className="relative flex items-center">
                <Settings className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <select
                  id="select-ma-type"
                  value={maType}
                  onChange={(e) => setMaType(e.target.value as 'SMA' | 'EMA')}
                  className="w-full pl-8 pr-8 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer appearance-none"
                >
                  <option value="SMA">SMA (Simple)</option>
                  <option value="EMA">EMA (Exponential)</option>
                </select>
                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        );
      case 'RSI_OS':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label htmlFor="input-rsi-period" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">RSI Period</label>
              <div className="relative flex items-center">
                <Activity className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="input-rsi-period"
                  type="number"
                  min="5"
                  max="30"
                  value={rsiPeriod}
                  onChange={(e) => setRsiPeriod(Math.max(5, parseInt(e.target.value) || 5))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="input-rsi-oversold" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Oversold (Buy)</label>
              <div className="relative flex items-center">
                <ArrowDownRight className="absolute left-2.5 h-3.5 w-3.5 text-emerald-500 pointer-events-none" />
                <input
                  id="input-rsi-oversold"
                  type="number"
                  min="10"
                  max="45"
                  value={rsiOversold}
                  onChange={(e) => setRsiOversold(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="input-rsi-overbought" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Overbought (Sell)</label>
              <div className="relative flex items-center">
                <ArrowUpRight className="absolute left-2.5 h-3.5 w-3.5 text-rose-500 pointer-events-none" />
                <input
                  id="input-rsi-overbought"
                  type="number"
                  min="55"
                  max="90"
                  value={rsiOverbought}
                  onChange={(e) => setRsiOverbought(Math.max(55, parseInt(e.target.value) || 55))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                />
              </div>
            </div>
          </div>
        );
      case 'BOLLINGER_REVERSION':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor="input-bb-period" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">BB SMA Period</label>
              <div className="relative flex items-center">
                <Activity className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="input-bb-period"
                  type="number"
                  min="10"
                  max="40"
                  value={bbPeriod}
                  onChange={(e) => setBbPeriod(Math.max(10, parseInt(e.target.value) || 10))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="input-bb-std" className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Standard Deviations</label>
              <div className="relative flex items-center">
                <Sliders className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <input
                  id="input-bb-std"
                  type="number"
                  min="1.0"
                  max="3.0"
                  step="0.1"
                  value={bbStdDev}
                  onChange={(e) => setBbStdDev(Math.max(1.0, parseFloat(e.target.value) || 1.0))}
                  className="w-full pl-8 pr-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-700"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  // Plain English summary explaining how the strategy is processed
  const getStrategyExplanation = () => {
    switch (strategyType) {
      case 'MA_CROSSOVER':
        return `BUY when Fast ${maType} (${fastPeriod}) crosses above Slow ${maType} (${slowPeriod}) triggering an uptrend shift. SELL when Fast crosses back below Slow, indicating momentum breakdown.`;
      case 'RSI_OS':
        return `BUY immediately when the 14-day RSI pulls back crossing back above the Oversold threshold (${rsiOversold}). SELL when RSI rises and peaks crossing below the Overbought boundary (${rsiOverbought}).`;
      case 'BOLLINGER_REVERSION':
        return `BUY when the daily closing price drops below or touches the Lower Bollinger Band (${bbPeriod}, ${bbStdDev} StdDev) reflecting an oversold extreme. SELL when the price reaches or exceeds the Upper Bollinger Band boundary.`;
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl hover:shadow-2xl transition-all duration-300 space-y-5 group" id="strategy-backtester-card-container">
      {/* Ambient background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-150/80 dark:border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl text-white shrink-0 shadow-md shadow-indigo-500/20">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 font-sans">
              Algorithmic Backtesting Suite
              <span className="text-[9px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full font-black font-mono">QUANT ENGINE</span>
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Select parameters and run an algorithmic simulation against historical exchange data</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Input parameters panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl space-y-4 shadow-inner">
            
            <span className="text-[10px] font-mono font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-indigo-500" /> Simulation Constraints
            </span>

            {/* Strategy Type selection */}
            <div className="space-y-1.5">
              <label htmlFor="select-strategy-type" className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Sliders className="h-3 w-3 text-indigo-500/80" /> Target Strategy
              </label>
              <div className="relative flex items-center">
                <Activity className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <select
                  id="select-strategy-type"
                  value={strategyType}
                  onChange={(e) => {
                    setStrategyType(e.target.value as any);
                    setResults(null);
                  }}
                  className="w-full pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer appearance-none shadow-xs"
                >
                  <option value="MA_CROSSOVER">Moving Average Crossover</option>
                  <option value="RSI_OS">RSI Overbought/Oversold Oscillator</option>
                  <option value="BOLLINGER_REVERSION">Bollinger Bands Mean Reversion</option>
                </select>
                <ChevronDown className="absolute right-3 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Backtest Parameters Controls */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-xs">
              {renderStrategyControls()}
            </div>

            {/* Date Range selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="select-start-date" className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-500/80" /> Start Date
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <select
                    id="select-start-date"
                    value={startDateStr}
                    onChange={handleStartDateChange}
                    className="w-full pl-8 pr-8 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer appearance-none"
                  >
                    {dateOptions.slice(0, -5).map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="select-end-date" className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-indigo-500/80" /> End Date
                </label>
                <div className="relative flex items-center">
                  <Calendar className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                  <select
                    id="select-end-date"
                    value={endDateStr}
                    onChange={handleEndDateChange}
                    className="w-full pl-8 pr-8 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer appearance-none"
                  >
                    {dateOptions.map((date) => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Starting Capital Allocation */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="input-capital" className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Coins className="h-3 w-3 text-indigo-500/80" /> Initial Test Capital
                </label>
                <span className="text-[10px] font-mono text-indigo-500 font-bold">₹{capital.toLocaleString('en-IN')}</span>
              </div>
              <div className="relative flex items-center">
                <Coins className="absolute left-2.5 h-3.5 w-3.5 text-gray-400 dark:text-gray-500 pointer-events-none" />
                <span className="absolute left-7 text-xs font-mono font-bold text-gray-400 dark:text-gray-500 pointer-events-none">₹</span>
                <input
                  id="input-capital"
                  type="number"
                  step="5000"
                  value={capital || ''}
                  onChange={(e) => {
                    setCapital(Math.max(1000, parseFloat(e.target.value) || 0));
                    setResults(null);
                  }}
                  className="w-full pl-11 pr-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 text-right shadow-xs"
                />
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={handleRunBacktest}
              disabled={isSimulating}
              className={`w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-98 disabled:opacity-50 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 ${isSimulating ? 'animate-pulse' : ''}`}
              id="btn-trigger-backtest"
            >
              {isSimulating ? (
                <>
                  <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Simulating Strategy Portfolio...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" />
                  <span>Run Backtest Engine</span>
                </>
              )}
            </button>

          </div>

          {/* Strategy rules hud note */}
          <div className="bg-gradient-to-br from-indigo-500/5 to-transparent dark:from-indigo-500/10 dark:to-transparent backdrop-blur-xl border border-indigo-500/20 dark:border-indigo-500/30 rounded-3xl p-5 space-y-2 shadow-sm transition-all duration-300 hover:border-indigo-500/40 relative overflow-hidden group">
            <div className="absolute -inset-x-20 -inset-y-20 bg-gradient-to-r from-indigo-500/10 to-transparent blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <span className="relative text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5 z-10">
              <Info className="h-4 w-4 shrink-0 text-indigo-500" /> Strategy Mechanics
            </span>
            <p className="relative text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans font-medium z-10">
              {getStrategyExplanation()}
            </p>
          </div>
        </div>

        {/* Right: Output Performance Dashboard (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          <AnimatePresence mode="wait">
            {isSimulating ? (
              
              /* Simulation Spinner skeleton overlay */
              <motion.div
                key="loading-backtest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col items-center justify-center py-20 space-y-4"
              >
                <div className="relative h-12 w-12">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider font-mono animate-pulse">Running Algorithmic Quant Loop</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-sans font-medium mt-0.5">Iterating step-by-step through available date series bars...</p>
                </div>
              </motion.div>

            ) : results ? (
              
              /* Content State */
              <motion.div
                key="backtest-results"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="space-y-4 flex-1 flex flex-col justify-between"
              >
                {/* 1. High level outcome grid summary */}
                <motion.div 
                  initial="hidden"
                  animate="show"
                  variants={containerVariants}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-3"
                >
                  
                  {/* Total Portfolio Value */}
                  <motion.div 
                    variants={cardVariants}
                    className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl hover:border-indigo-500/20 hover:shadow-xs transition-all duration-300"
                  >
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase block">Strategy Value</span>
                    <span className="text-sm font-black font-mono text-gray-950 dark:text-white block mt-0.5">
                      ₹{Number(results.finalPortfolioValue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] font-bold font-mono flex items-center gap-0.5 mt-1 ${
                      results.totalReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {results.totalReturnPercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {results.totalReturnPercent >= 0 ? '+' : ''}{results.totalReturnPercent}% ROI
                    </span>
                  </motion.div>

                  {/* Benchmark Buy & Hold Portfolio Value */}
                  <motion.div 
                    variants={cardVariants}
                    className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl hover:border-indigo-500/20 hover:shadow-xs transition-all duration-300"
                  >
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase block">Buy & Hold Bench</span>
                    <span className="text-sm font-black font-mono text-gray-950 dark:text-white block mt-0.5">
                      ₹{Number(results.finalBuyAndHoldValue || 0).toLocaleString('en-IN')}
                    </span>
                    <span className={`text-[10px] font-bold font-mono flex items-center gap-0.5 mt-1 ${
                      results.buyAndHoldReturnPercent >= 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {results.buyAndHoldReturnPercent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {results.buyAndHoldReturnPercent >= 0 ? '+' : ''}{results.buyAndHoldReturnPercent}% ROI
                    </span>
                  </motion.div>

                  {/* Trades Executed */}
                  <motion.div 
                    variants={cardVariants}
                    className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl hover:border-indigo-500/20 hover:shadow-xs transition-all duration-300"
                  >
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase block">Total Trades</span>
                    <span className="text-sm font-black font-mono text-gray-900 dark:text-white block mt-0.5">
                      {results.totalTradesCount}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-400 block font-medium mt-1 uppercase font-mono">
                      {results.trades.filter(t => t.type === 'SELL').length} Closed Positions
                    </span>
                  </motion.div>

                  {/* Win Rate */}
                  <motion.div 
                    variants={cardVariants}
                    className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl hover:border-indigo-500/20 hover:shadow-xs transition-all duration-300"
                  >
                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-400 uppercase block">Win Rate (Sells)</span>
                    <span className="text-sm font-black font-mono text-indigo-600 dark:text-indigo-400 block mt-0.5">
                      {results.winRate}%
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-gray-400 block font-medium mt-1 uppercase font-mono">
                      DD Max: {results.maxDrawdown}%
                    </span>
                  </motion.div>

                </motion.div>

                {/* Strategy vs Benchmark HUD Alert summary */}
                {results.totalReturnPercent > results.buyAndHoldReturnPercent ? (
                  <div className="p-3.5 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2 shadow-xs">
                    <Award className="h-4 w-4 shrink-0 text-emerald-500 animate-bounce" />
                    <span className="font-medium">
                      <strong>Alpha Unlocked!</strong> This customized strategy successfully outperformed the passive <strong>Buy & Hold</strong> benchmark by <strong>{(results.totalReturnPercent - results.buyAndHoldReturnPercent).toFixed(2)}%</strong>.
                    </span>
                  </div>
                ) : (
                  <div className="p-3.5 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 text-amber-800 dark:text-amber-400 rounded-xl text-xs flex items-center gap-2 shadow-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="font-medium">
                      The passive <strong>Buy & Hold</strong> benchmark beat this strategy by <strong>{(results.buyAndHoldReturnPercent - results.totalReturnPercent).toFixed(2)}%</strong>. Consider adjusting parameters or tightening indicators.
                    </span>
                  </div>
                )}

                {/* 2. Recharts Line Chart: Equity Curve comparison */}
                <div className="bg-gray-50/30 dark:bg-gray-950/10 border border-gray-200/40 dark:border-gray-800/50 p-4 rounded-xl space-y-2 hover:border-gray-200 dark:hover:border-gray-800 transition-all duration-300">
                  <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <LineChart className="h-3 w-3" /> Equity Curve Tracking (Capital Growth)
                  </span>

                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={results.equityHistory} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <defs>
                          <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15}/>
                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.01}/>
                          </linearGradient>
                          <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-800/60" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} 
                          stroke="#cbd5e1" 
                          className="dark:stroke-gray-800"
                        />
                        <YAxis 
                          tick={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'monospace' }} 
                          stroke="#cbd5e1" 
                          className="dark:stroke-gray-800"
                          domain={['auto', 'auto']}
                          tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                            borderRadius: '12px', 
                            border: '1px solid #334155',
                            color: '#fff',
                            fontSize: '11px',
                            fontFamily: 'sans-serif'
                          }}
                          formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, '']}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace' }} />
                        <Area 
                          name="Strategy Curve" 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#4f46e5" 
                          strokeWidth={2} 
                          fill="url(#colorStrategy)" 
                        />
                        <Area 
                          name="Buy & Hold Benchmark" 
                          type="monotone" 
                          dataKey="buyAndHoldValue" 
                          stroke="#94a3b8" 
                          strokeWidth={1.5} 
                          strokeDasharray="4 4"
                          fill="url(#colorBenchmark)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 3. Simulated Trade Execution Log */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <History className="h-3 w-3" /> Executed Trade Ledger ({results.trades.length})
                  </span>

                  <div className="overflow-y-auto max-h-[160px] border border-gray-200 dark:border-gray-800 rounded-xl divide-y divide-gray-100 dark:divide-gray-800 pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-800 relative font-sans" id="backtest-trades-log-timeline">
                    {results.trades.length > 0 ? (
                      <>
                        <div className="sticky top-0 bg-white dark:bg-gray-900 px-3 py-2 grid grid-cols-12 gap-2 text-[9px] font-bold text-gray-400 dark:text-gray-500 border-b border-gray-100 dark:border-gray-800 z-10 uppercase tracking-wider select-none font-mono">
                          <div className="col-span-2">Type</div>
                          <div className="col-span-3 sm:col-span-2">Date</div>
                          <div className="col-span-4 sm:col-span-4">Trade Detail</div>
                          <div className="col-span-3 sm:col-span-2 text-right">Portfolio Bal</div>
                          <div className="col-span-12 sm:col-span-2 text-right">Realized PnL</div>
                        </div>
                        {results.trades.map((trade) => (
                          <div 
                            key={trade.id} 
                            className="p-3 grid grid-cols-12 gap-2 items-center text-xs font-mono hover:bg-gray-100/50 dark:hover:bg-gray-800/30 hover:scale-[1.005] hover:-translate-y-0.5 transition-all duration-205 border-b border-gray-100 dark:border-gray-800 last:border-0"
                          >
                            <div className="col-span-2">
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase select-none ${
                                trade.type === 'BUY' 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}>
                                {trade.type === 'BUY' ? <TrendingUp className="h-2.5 w-2.5 shrink-0" /> : <TrendingDown className="h-2.5 w-2.5 shrink-0" />}
                                {trade.type}
                              </span>
                            </div>
                            
                            <div className="col-span-3 sm:col-span-2 text-[10px] font-bold text-gray-400 dark:text-gray-500">
                              {trade.date}
                            </div>
                            
                            <div className="col-span-4 sm:col-span-4 text-gray-700 dark:text-gray-300 font-sans font-semibold truncate">
                              {trade.shares} <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">shares @</span> ₹{Number(trade.price || 0).toLocaleString('en-IN')}
                            </div>

                            <div className="col-span-3 sm:col-span-2 text-right font-bold text-gray-800 dark:text-white">
                              ₹{Number(trade.portfolioValue || 0).toLocaleString('en-IN')}
                            </div>

                            <div className="col-span-12 sm:col-span-2 text-right flex justify-end">
                              {trade.type === 'SELL' && trade.profitOrLoss !== undefined ? (
                                <span className={`inline-flex items-center gap-0.5 text-[10px] font-black font-mono ${
                                  Number(trade.profitOrLoss || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                                }`}>
                                  {Number(trade.profitOrLoss || 0) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                  {Number(trade.profitOrLoss || 0) >= 0 ? '+' : ''}₹{Number(trade.profitOrLoss || 0).toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-gray-300 dark:text-gray-700 select-none font-semibold font-mono">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="p-8 text-center text-xs text-gray-400 dark:text-gray-500 font-mono">
                        No transactions executed. Adjust moving average parameters, thresholds, or widen the date range lookback block.
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>

            ) : (
              
              /* Initial state before first backtest run */
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl py-24 text-center px-6 space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-full text-gray-400 dark:text-gray-400">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider font-mono">Strategy Engine Ready</h4>
                  <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm">
                    Configure your algorithmic parameters on the left and click <strong>Run Backtest Engine</strong> to trace performance vectors.
                  </p>
                </div>
              </div>

            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
