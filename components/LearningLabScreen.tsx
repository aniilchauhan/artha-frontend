'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useStockContext } from '../context/StockContext';
import FrameworkResearchPanel from './FrameworkResearchPanel';
import FrameworkScreenPanel from './FrameworkScreenPanel';
import BookMastersPanel from './BookMastersPanel';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Search,
  Activity,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  Calculator,
  Layers,
  Sparkles,
  Percent,
  Sliders,
  ChevronRight
} from 'lucide-react';
import {
  calculateRiskFirstPositionSize,
  evaluateSOICForensics,
  evaluateRsiRangeShift,
  evaluate44SmaSwing,
  calculateDamodaranDCF,
  evaluateBankingHealth,
  evaluateCyclicalValuation,
} from '../lib/learning-framework-engine';

type FrameworkTab = 
  | 'position-sizing' 
  | 'soic-forensics' 
  | 'rsi-range-shift' 
  | 'sma-swing' 
  | 'damodaran-dcf' 
  | 'bank-nifty'
  | 'banking-audit'
  | 'cyclical-valuation';

export default function LearningLabScreen() {
  const { stocks, selectedTicker, setSelectedTicker } = useStockContext();
  const [activeTab, setActiveTab] = useState<FrameworkTab>('position-sizing');

  // Currently active stock or default
  const activeStock = useMemo(() => {
    return stocks.find(s => s.ticker === selectedTicker) || stocks[0] || null;
  }, [stocks, selectedTicker]);

  // ---------------------------------------------------------------------------
  // 1. POSITION SIZING STATE
  // ---------------------------------------------------------------------------
  const [portfolioCapital, setPortfolioCapital] = useState<number>(500000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [entryPrice, setEntryPrice] = useState<number>(500);
  const [stopLossPrice, setStopLossPrice] = useState<number>(475);
  const [atr14, setAtr14] = useState<number>(12);

  // Calculator values are examples; stock-backed observations have a separate report.
  useEffect(() => {
    setEntryPrice(500);
    setStopLossPrice(475);
  }, [selectedTicker]);

  const positionSizeResult = useMemo(() => {
    try {
      if (entryPrice <= 0 || stopLossPrice <= 0 || stopLossPrice >= entryPrice) return null;
      return calculateRiskFirstPositionSize({
        portfolioCapital,
        riskPct: riskPercent / 100,
        entryPrice,
        stopLossPrice,
        maxPortfolioAllocationPct: 0.25,
        atr14,
      });
    } catch {
      return null;
    }
  }, [portfolioCapital, riskPercent, entryPrice, stopLossPrice, atr14]);

  // ---------------------------------------------------------------------------
  // 2. SOIC FORENSICS STATE
  // ---------------------------------------------------------------------------
  const [cumulativeCFO, setCumulativeCFO] = useState<number>(1200);
  const [cumulativePAT, setCumulativePAT] = useState<number>(1000);
  const [promoterPledge, setPromoterPledge] = useState<number>(2);
  const [rptPercent, setRptPercent] = useState<number>(3);
  const [cwipYears, setCwipYears] = useState<number>(1);
  const [contingentLiabPercent, setContingentLiabPercent] = useState<number>(8);
  const [auditorRemarks, setAuditorRemarks] = useState<'CLEAN' | 'QUALIFIED' | 'ADVERSE' | 'RESIGNED'>('CLEAN');

  const forensicReport = useMemo(() => {
    return evaluateSOICForensics({
      cumulativeCFO5Y: cumulativeCFO,
      cumulativePAT5Y: cumulativePAT,
      promoterPledgePct: promoterPledge,
      rptToSalesPct: rptPercent,
      cwipYears: cwipYears,
      contingentLiabilitiesPctNetWorth: contingentLiabPercent,
      auditorRemarks: auditorRemarks,
    });
  }, [cumulativeCFO, cumulativePAT, promoterPledge, rptPercent, cwipYears, contingentLiabPercent, auditorRemarks]);

  // ---------------------------------------------------------------------------
  // 3. RSI 60-40 RANGE SHIFT STATE
  // ---------------------------------------------------------------------------
  const [monthlyRSI, setMonthlyRSI] = useState<number>(64);
  const [weeklyRSI, setWeeklyRSI] = useState<number>(61);
  const [dailyRSI, setDailyRSI] = useState<number>(43);

  const rsiResult = useMemo(() => {
    return evaluateRsiRangeShift({
      monthlyRSI,
      weeklyRSI,
      dailyRSI,
    });
  }, [monthlyRSI, weeklyRSI, dailyRSI]);

  // ---------------------------------------------------------------------------
  // 4. 44 SMA SWING STATE
  // ---------------------------------------------------------------------------
  const [smaCurrentPrice, setSmaCurrentPrice] = useState<number>(504);
  const [daily44Sma, setDaily44Sma] = useState<number>(500);
  const [daily44SmaPrev, setDaily44SmaPrev] = useState<number>(492);
  const [weekly44Sma, setWeekly44Sma] = useState<number>(480);
  const [weekly44SmaPrev, setWeekly44SmaPrev] = useState<number>(470);
  const [isBullishCandle, setIsBullishCandle] = useState<boolean>(true);

  const smaResult = useMemo(() => {
    return evaluate44SmaSwing({
      currentPrice: smaCurrentPrice,
      daily44Sma,
      daily44SmaPrev,
      weekly44Sma,
      weekly44SmaPrev,
      isBullishRejectionCandle: isBullishCandle,
    });
  }, [smaCurrentPrice, daily44Sma, daily44SmaPrev, weekly44Sma, weekly44SmaPrev, isBullishCandle]);

  // ---------------------------------------------------------------------------
  // 5. DAMODARAN DCF STATE
  // ---------------------------------------------------------------------------
  const [dcfEbit, setDcfEbit] = useState<number>(8500);
  const [dcfTaxRate, setDcfTaxRate] = useState<number>(25);
  const [dcfDepreciation, setDcfDepreciation] = useState<number>(1500);
  const [dcfCapEx, setDcfCapEx] = useState<number>(2200);
  const [dcfDeltaNWC, setDcfDeltaNWC] = useState<number>(400);
  const [dcfGrowth5Y, setDcfGrowth5Y] = useState<number>(14);
  const [dcfTerminalGrowth, setDcfTerminalGrowth] = useState<number>(5.5);
  const [dcfWacc, setDcfWacc] = useState<number>(10.5);
  const [dcfCash, setDcfCash] = useState<number>(4000);
  const [dcfDebt, setDcfDebt] = useState<number>(6000);
  const [dcfShares, setDcfShares] = useState<number>(100);
  const [dcfMarketPrice, setDcfMarketPrice] = useState<number>(680);

  const dcfResult = useMemo(() => {
    try {
      return calculateDamodaranDCF({
        ebit: dcfEbit,
        taxRate: dcfTaxRate / 100,
        depreciation: dcfDepreciation,
        capEx: dcfCapEx,
        deltaWorkingCapital: dcfDeltaNWC,
        forecastGrowthRate5Y: dcfGrowth5Y / 100,
        terminalGrowthRate: dcfTerminalGrowth / 100,
        wacc: dcfWacc / 100,
        cashAndLiquidAssets: dcfCash,
        totalDebt: dcfDebt,
        sharesOutstanding: dcfShares,
        currentMarketPrice: dcfMarketPrice,
      });
    } catch {
      return null;
    }
  }, [dcfEbit, dcfTaxRate, dcfDepreciation, dcfCapEx, dcfDeltaNWC, dcfGrowth5Y, dcfTerminalGrowth, dcfWacc, dcfCash, dcfDebt, dcfShares, dcfMarketPrice]);

  // ---------------------------------------------------------------------------
  // 6. BANKING HEALTH STATE (Yadnya Investment Academy)
  // ---------------------------------------------------------------------------
  const [bankNim, setBankNim] = useState<number>(4.1);
  const [bankGnpa, setBankGnpa] = useState<number>(1.8);
  const [bankNnpa, setBankNnpa] = useState<number>(0.4);
  const [bankCasa, setBankCasa] = useState<number>(44);
  const [bankPcr, setBankPcr] = useState<number>(75);
  const [bankCar, setBankCar] = useState<number>(17.2);

  const bankReport = useMemo(() => {
    return evaluateBankingHealth({
      nim: bankNim,
      gnpa: bankGnpa,
      nnpa: bankNnpa,
      casaRatio: bankCasa,
      pcr: bankPcr,
      car: bankCar,
    });
  }, [bankNim, bankGnpa, bankNnpa, bankCasa, bankPcr, bankCar]);

  // ---------------------------------------------------------------------------
  // 7. CYCLICAL VALUATION STATE (Dr. Sven Carlin)
  // ---------------------------------------------------------------------------
  const [cyclicalPrice, setCyclicalPrice] = useState<number>(120);
  const [cyclicalCurrentPE, setCyclicalCurrentPE] = useState<number>(5.2);
  const [cyclicalMarketCap, setCyclicalMarketCap] = useState<number>(45000);
  const [cyclicalAvgFCF, setCyclicalAvgFCF] = useState<number>(2500);
  const [cyclicalNetCash, setCyclicalNetCash] = useState<number>(18);

  const cyclicalResult = useMemo(() => {
    return evaluateCyclicalValuation({
      currentPrice: cyclicalPrice,
      currentYearPE: cyclicalCurrentPE,
      marketCapCr: cyclicalMarketCap,
      average10YearFCFCr: cyclicalAvgFCF,
      netCashPerShare: cyclicalNetCash,
    });
  }, [cyclicalPrice, cyclicalCurrentPE, cyclicalMarketCap, cyclicalAvgFCF, cyclicalNetCash]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900 border border-indigo-500/20 p-6 md:p-8 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Quantitative Learning Laboratory
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
              Stock Research & Learning Lab
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              Source-backed technical checklists and manual learning calculators. Framework thresholds are research assumptions; strategy effectiveness has not been tested.
            </p>
          </div>

          {/* Quick Stock Selector */}
          <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-2 px-3 shadow-inner">
            <Search className="w-4 h-4 text-slate-400" />
            <select
              value={selectedTicker || ''}
              onChange={(e) => setSelectedTicker(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              {selectedTicker && !stocks.slice(0, 50).some(stock => stock.ticker === selectedTicker) && (
                <option value={selectedTicker} className="bg-slate-900 text-slate-100">{selectedTicker}</option>
              )}
              {stocks.slice(0, 50).map((s) => (
                <option key={s.ticker} value={s.ticker} className="bg-slate-900 text-slate-100">
                  {s.ticker} (₹{s.currentPrice.toFixed(0)})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6"><FrameworkScreenPanel initialTickers={stocks.slice(0, 5).map(stock => stock.ticker)} onSelect={setSelectedTicker} /></div>
        <div className="mt-6"><FrameworkResearchPanel ticker={selectedTicker || activeStock?.ticker || 'RELIANCE'} /></div>
        <div className="mt-6 rounded-xl border border-amber-700/40 bg-amber-950/20 p-4 text-sm text-amber-200">
          Example calculators below use manual inputs, not verified financial or technical data for {selectedTicker || activeStock?.ticker || 'a selected stock'}.
          Their thresholds and strategy effectiveness have not been validated. Use the stock report above for source-backed checks.
        </div>

        {/* Book Masters Quantitative & Forensic Hub */}
        <div className="mt-8">
          <BookMastersPanel />
        </div>

        {/* Tab Navigation */}
        <div className="mt-8 flex flex-wrap gap-2 border-b border-slate-800/80 pb-3">
          {[
            { id: 'position-sizing', label: '1%-2% Risk & ATR Stops', icon: ShieldAlert, mentor: 'Zerodha / Ranade' },
            { id: 'soic-forensics', label: 'SOIC Forensic Auditor', icon: Search, mentor: 'Ishmohit Arora' },
            { id: 'rsi-range-shift', label: 'RSI 60-40 Range Shift', icon: Activity, mentor: 'Vishal Malkan' },
            { id: 'sma-swing', label: '44 SMA Trend System', icon: TrendingUp, mentor: 'S. Bhanushali' },
            { id: 'damodaran-dcf', label: 'DCF Intrinsic Valuation', icon: DollarSign, mentor: 'Prof. Damodaran' },
            { id: 'banking-audit', label: 'Banking & NBFC Audit', icon: Layers, mentor: 'Yadnya Academy' },
            { id: 'cyclical-valuation', label: 'Cyclical Peak/Trough', icon: Sliders, mentor: 'Dr. Sven Carlin' },
            { id: 'bank-nifty', label: '9:20 Intraday Scalping', icon: Clock, mentor: 'Ghanshyam Tech' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as FrameworkTab)}
                className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${isActive ? 'bg-indigo-700 text-indigo-100' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.mentor}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Framework Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: POSITION SIZING */}
          {activeTab === 'position-sizing' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inputs */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-indigo-400" /> Capital & Risk Parameters
                    </h2>
                    <p className="text-xs text-slate-400">Strictly reverse-calculates shares based on stop loss distance.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Total Portfolio Equity (INR)</span>
                      <span className="text-indigo-400 font-mono">₹{portfolioCapital.toLocaleString()}</span>
                    </label>
                    <input
                      type="number"
                      step={50000}
                      value={portfolioCapital}
                      onChange={(e) => setPortfolioCapital(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Risk Capital Per Trade (%)</span>
                      <span className="text-amber-400 font-mono">{riskPercent}% (₹{(portfolioCapital * (riskPercent / 100)).toLocaleString()})</span>
                    </label>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.25}
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(Number(e.target.value))}
                      className="mt-2 w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.5% (Conservative)</span>
                      <span>1.0% (Varsity Standard)</span>
                      <span>2.0% (Aggressive)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Entry Price (₹)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Stop Loss (₹)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={stopLossPrice}
                        onChange={(e) => setStopLossPrice(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-rose-300 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>14-Day ATR (Volatility Trailing Buffer)</span>
                      <span className="text-indigo-400 font-mono">₹{atr14}</span>
                    </label>
                    <input
                      type="number"
                      step={1}
                      value={atr14}
                      onChange={(e) => setAtr14(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Output Display */}
              <div className="lg:col-span-7 space-y-6">
                {positionSizeResult ? (
                  <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Trade Execution Sizing</h3>
                        <p className="text-xs text-slate-400">Mathematical quantity determined by technical invalidation.</p>
                      </div>
                      <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-mono font-bold">
                        1:3 R:R Cap Compliant
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
                        <div className="text-xs text-slate-400 font-medium">Scenario Quantity</div>
                        <div className="text-2xl font-black text-indigo-400 font-mono mt-1">
                          {positionSizeResult.sharesToBuy}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Shares</div>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
                        <div className="text-xs text-slate-400 font-medium">Capital Deployed</div>
                        <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                          ₹{positionSizeResult.totalInvestment.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{positionSizeResult.allocationPct.toFixed(1)}% of Portfolio</div>
                      </div>

                      <div className="bg-slate-950/80 border border-rose-500/20 rounded-2xl p-4 text-center">
                        <div className="text-xs text-rose-400 font-medium">Planned Loss at Stop</div>
                        <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                          ₹{positionSizeResult.maxCapitalAtRisk.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-rose-500/70 mt-0.5">Before costs; gaps can exceed this</div>
                      </div>

                      <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-center">
                        <div className="text-xs text-slate-400 font-medium">ATR Initial Stop Estimate</div>
                        <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                          ₹{positionSizeResult.atrTrailingStop?.toFixed(2) || 'N/A'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">2.0 × ATR Buffer</div>
                      </div>
                    </div>

                    {/* Mathematical Formula Explanation */}
                    <div className="p-4 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-2">
                      <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-indigo-400" /> Sizing Formula Breakdown
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        Shares = (Capital × Risk%) / (Entry - StopLoss) = (₹{portfolioCapital.toLocaleString()} × {riskPercent}%) / (₹{entryPrice} - ₹{stopLossPrice}) = ₹{(portfolioCapital * (riskPercent / 100)).toLocaleString()} / ₹{positionSizeResult.riskPerShare} = {positionSizeResult.sharesToBuy} Shares
                      </div>
                      {positionSizeResult.isCappedByAllocation && (
                        <div className="text-xs text-amber-400 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                          ⚠️ Position size was clipped to 25% max portfolio allocation limit to prevent excessive single-stock exposure.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-3xl text-slate-400">
                    Please ensure Stop Loss Price is positive and strictly below Entry Price.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SOIC FORENSIC AUDITOR */}
          {activeTab === 'soic-forensics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Inputs */}
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Search className="w-5 h-5 text-indigo-400" /> SOIC 6-Point Forensic Inputs
                  </h2>
                  <p className="text-xs text-slate-400">Audit metrics taught by Ishmohit Arora to detect financial manipulation.</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">5-Yr Cumul. CFO (₹ Cr)</label>
                      <input
                        type="number"
                        value={cumulativeCFO}
                        onChange={(e) => setCumulativeCFO(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">5-Yr Cumul. PAT (₹ Cr)</label>
                      <input
                        type="number"
                        value={cumulativePAT}
                        onChange={(e) => setCumulativePAT(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Promoter Pledged Shares (%)</span>
                      <span className={`font-mono font-bold ${promoterPledge > 20 ? 'text-rose-400' : 'text-slate-300'}`}>{promoterPledge}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={promoterPledge}
                      onChange={(e) => setPromoterPledge(Number(e.target.value))}
                      className="mt-1 w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Related Party Transactions (% of Sales)</span>
                      <span className="text-slate-300 font-mono">{rptPercent}%</span>
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={rptPercent}
                      onChange={(e) => setRptPercent(Number(e.target.value))}
                      className="mt-1 w-full accent-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">CWIP Aging (Years)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={cwipYears}
                        onChange={(e) => setCwipYears(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Auditor Report</label>
                      <select
                        value={auditorRemarks}
                        onChange={(e) => setAuditorRemarks(e.target.value as any)}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="CLEAN">Clean / Unqualified</option>
                        <option value="QUALIFIED">Qualified Notes</option>
                        <option value="ADVERSE">Adverse Opinion</option>
                        <option value="RESIGNED">Auditor Resigned</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit Output */}
              <div className="lg:col-span-7 space-y-4">
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-100">SOIC Forensic Audit Report</h3>
                      <p className="text-xs text-slate-400">Composite score based on accounting integrity.</p>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono flex items-center gap-1.5 ${
                      forensicReport.passed
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {forensicReport.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {forensicReport.passed ? 'PASSED SOIC AUDIT' : 'FAILED / RED FLAGS'}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center p-4 bg-slate-950 rounded-2xl border border-slate-800 w-32 shrink-0">
                      <div className="text-xs text-slate-400">Integrity Score</div>
                      <div className={`text-3xl font-black font-mono mt-1 ${
                        forensicReport.score >= 80 ? 'text-emerald-400' : forensicReport.score >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {forensicReport.score}/100
                      </div>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-slate-400">5-Yr Cash Conversion (CFO / PAT)</span>
                        <span className={`font-mono font-bold ${forensicReport.cfoToPatRatio >= 0.85 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {forensicReport.cfoToPatRatio.toFixed(2)}x (Benchmark ≥ 0.85)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${forensicReport.cfoToPatRatio >= 0.85 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(100, (forensicReport.cfoToPatRatio / 1.2) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Flag Warnings */}
                  <div className="space-y-2">
                    {forensicReport.criticalFlags.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> Critical Disqualifications
                        </div>
                        {forensicReport.criticalFlags.map((flag, idx) => (
                          <div key={idx} className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                            {flag}
                          </div>
                        ))}
                      </div>
                    )}

                    {forensicReport.warnings.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4" /> Noteworthy Concerns
                        </div>
                        {forensicReport.warnings.map((warn, idx) => (
                          <div key={idx} className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-xl">
                            {warn}
                          </div>
                        ))}
                      </div>
                    )}

                    {forensicReport.criticalFlags.length === 0 && forensicReport.warnings.length === 0 && (
                      <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl">
                        Clean Bill of Health: Zero promoter pledge, strong cash conversion, normal CWIP aging, and no auditor disputes.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RSI 60-40 RANGE SHIFT (VISHAL MALKAN) */}
          {activeTab === 'rsi-range-shift' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-indigo-400" /> Grandfather-Father-Son (GFS)
                  </h2>
                  <p className="text-xs text-slate-400">Triple-timeframe RSI Range Shift system by Vishal Malkan.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Monthly RSI (Grandfather - Macro Trend)</span>
                      <span className="font-mono font-bold text-indigo-400">{monthlyRSI}</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={85}
                      value={monthlyRSI}
                      onChange={(e) => setMonthlyRSI(Number(e.target.value))}
                      className="mt-1 w-full accent-indigo-500"
                    />
                    <div className="text-[10px] text-slate-500 flex justify-between">
                      <span>&lt;40 (Bear Regime)</span>
                      <span>40-60 (Neutral)</span>
                      <span>&gt;60 (Bull Regime)</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Weekly RSI (Father - Primary Trend)</span>
                      <span className="font-mono font-bold text-indigo-400">{weeklyRSI}</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={85}
                      value={weeklyRSI}
                      onChange={(e) => setWeeklyRSI(Number(e.target.value))}
                      className="mt-1 w-full accent-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 flex justify-between">
                      <span>Daily RSI (Son - Precision Entry)</span>
                      <span className="font-mono font-bold text-amber-400">{dailyRSI}</span>
                    </label>
                    <input
                      type="range"
                      min={20}
                      max={85}
                      value={dailyRSI}
                      onChange={(e) => setDailyRSI(Number(e.target.value))}
                      className="mt-1 w-full accent-amber-500"
                    />
                    <div className="text-[10px] text-amber-400/80 mt-1">
                      *Ideal Dip Entry: When Monthly & Weekly &gt; 60, wait for Daily to touch 40–45 and turn up!
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">GFS Signal & Regime Output</h3>
                    <p className="text-xs text-slate-400">Evaluates whether higher timeframes support current momentum.</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono ${
                    rsiResult.signal === 'BULLISH_GFS_PULLBACK'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : rsiResult.signal === 'BULLISH_SUPER_MOMENTUM'
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : rsiResult.signal === 'BEARISH_GFS_RALLY'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {rsiResult.signal.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="text-xs text-slate-400 font-semibold">Analytical Assessment:</div>
                  <div className="text-sm text-slate-200 leading-relaxed font-medium">
                    {rsiResult.description}
                  </div>
                </div>

                {/* Range Shift Visualizer */}
                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-3">
                  <div className="text-xs font-bold text-slate-300">RSI Range Shift Zones (Andrew Cardwell Model):</div>
                  <div className="relative h-6 bg-slate-900 rounded-lg overflow-hidden flex text-[10px] font-mono font-bold text-center leading-6">
                    <div className="w-[40%] bg-rose-950/40 text-rose-400 border-r border-slate-800">0 - 40 Bear Support</div>
                    <div className="w-[20%] bg-slate-800/60 text-slate-400 border-r border-slate-800">40 - 60 Shift</div>
                    <div className="w-[40%] bg-emerald-950/40 text-emerald-400">60 - 100 Bull Zone</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: 44 SMA SWING SYSTEM */}
          {activeTab === 'sma-swing' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-indigo-400" /> 44 SMA Dual-Timeframe Setup
                  </h2>
                  <p className="text-xs text-slate-400">Trend following rules by Siddharth Bhanushali.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Current Price (₹)</label>
                      <input
                        type="number"
                        value={smaCurrentPrice}
                        onChange={(e) => setSmaCurrentPrice(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Daily 44 SMA (₹)</label>
                      <input
                        type="number"
                        value={daily44Sma}
                        onChange={(e) => setDaily44Sma(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-300 font-semibold">Weekly 44 SMA Trending Up?</span>
                    <button
                      onClick={() => setWeekly44Sma(weekly44SmaPrev > weekly44Sma ? weekly44SmaPrev + 10 : weekly44SmaPrev - 10)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        weekly44Sma > weekly44SmaPrev ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}
                    >
                      {weekly44Sma > weekly44SmaPrev ? 'YES (Rising)' : 'NO (Falling)'}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-300 font-semibold">Bullish Reversal Candle at 44 SMA?</span>
                    <button
                      onClick={() => setIsBullishCandle(!isBullishCandle)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold ${
                        isBullishCandle ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isBullishCandle ? 'YES (Hammer / Engulfing)' : 'NO'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">44 SMA Rule Verification</h3>
                    <p className="text-xs text-slate-400">Status of the dynamic support pullback setup.</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono ${
                    smaResult.hasValidSetup
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {smaResult.hasValidSetup ? 'VALID 44 SMA ENTRY' : 'SETUP PENDING'}
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="text-xs text-slate-400 font-semibold">Strategy Output:</div>
                  <div className="text-sm text-slate-200 font-medium">{smaResult.verdict}</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Recommended Stop Loss</div>
                    <div className="text-xl font-bold font-mono text-rose-400 mt-1">₹{smaResult.initialStopLoss}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">1.5% below 44 SMA floor</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Trailing Rule</div>
                    <div className="text-sm font-bold text-indigo-400 mt-2">Daily Close &lt; 44 SMA</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Ride until broken</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DAMODARAN DCF MODEL */}
          {activeTab === 'damodaran-dcf' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-indigo-400" /> Damodaran FCFF Parameters
                  </h2>
                  <p className="text-xs text-slate-400">Intrinsic valuation inputs based on Free Cash Flow to Firm.</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">EBIT (₹ Cr)</label>
                      <input
                        type="number"
                        value={dcfEbit}
                        onChange={(e) => setDcfEbit(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">CapEx (₹ Cr)</label>
                      <input
                        type="number"
                        value={dcfCapEx}
                        onChange={(e) => setDcfCapEx(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">5-Yr Growth Rate (%)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={dcfGrowth5Y}
                        onChange={(e) => setDcfGrowth5Y(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">WACC Discount Rate (%)</label>
                      <input
                        type="number"
                        step={0.25}
                        value={dcfWacc}
                        onChange={(e) => setDcfWacc(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Terminal Growth (%)</label>
                      <input
                        type="number"
                        step={0.25}
                        max={6.5}
                        value={dcfTerminalGrowth}
                        onChange={(e) => setDcfTerminalGrowth(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Current Share Price (₹)</label>
                      <input
                        type="number"
                        value={dcfMarketPrice}
                        onChange={(e) => setDcfMarketPrice(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                {dcfResult ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                      <div>
                        <h3 className="text-base font-bold text-slate-100">Intrinsic Value Valuation</h3>
                        <p className="text-xs text-slate-400">Present value of future enterprise cash flows.</p>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono ${
                        dcfResult.recommendation === 'STRONG_BUY'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : dcfResult.recommendation === 'FAIR_VALUE'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {dcfResult.recommendation.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                        <div className="text-xs text-slate-400">Intrinsic Value / Share</div>
                        <div className="text-2xl font-black font-mono text-emerald-400 mt-1">₹{dcfResult.intrinsicValuePerShare}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Estimated Fair Value</div>
                      </div>
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                        <div className="text-xs text-slate-400">Current Market Price</div>
                        <div className="text-2xl font-bold font-mono text-slate-200 mt-1">₹{dcfResult.currentMarketPrice}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Live Market Quote</div>
                      </div>
                      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                        <div className="text-xs text-slate-400">Margin of Safety</div>
                        <div className={`text-2xl font-black font-mono mt-1 ${dcfResult.marginOfSafetyPct >= 20 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {dcfResult.marginOfSafetyPct > 0 ? `+${dcfResult.marginOfSafetyPct}%` : `${dcfResult.marginOfSafetyPct}%`}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Target ≥ 25%</div>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-xs">
                      <div className="text-slate-400 font-semibold">Forecasted FCFF Path (Years 1 to 5):</div>
                      <div className="flex gap-2">
                        {dcfResult.projectedFCFFs.map((cf, i) => (
                          <div key={i} className="flex-1 p-2 bg-slate-900/80 rounded-lg text-center font-mono">
                            <div className="text-[10px] text-slate-500">Yr {i + 1}</div>
                            <div className="text-xs text-indigo-300 font-bold">₹{cf} Cr</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-slate-500">Invalid parameters: Ensure WACC is greater than Terminal Growth Rate.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB: BANKING AUDIT (YADNYA) */}
          {activeTab === 'banking-audit' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" /> Banking & NBFC Audit Parameters
                  </h2>
                  <p className="text-xs text-slate-400">Underwriting, profitability, and solvency ratios (Yadnya Academy).</p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Net Interest Margin (%)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={bankNim}
                        onChange={(e) => setBankNim(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">CASA Ratio (%)</label>
                      <input
                        type="number"
                        step={1}
                        value={bankCasa}
                        onChange={(e) => setBankCasa(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Gross NPA (%)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={bankGnpa}
                        onChange={(e) => setBankGnpa(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Net NPA (%)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={bankNnpa}
                        onChange={(e) => setBankNnpa(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-rose-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Provision Coverage (%)</label>
                      <input
                        type="number"
                        step={1}
                        value={bankPcr}
                        onChange={(e) => setBankPcr(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400">Capital Adequacy (%)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={bankCar}
                        onChange={(e) => setBankCar(Number(e.target.value))}
                        className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Bank Financial Health Scorecard</h3>
                    <p className="text-xs text-slate-400">Credit underwriting rating and solvency check.</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono ${
                    bankReport.passed
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}>
                    {bankReport.assetQualityRating} ASSET QUALITY
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Bank Score</div>
                    <div className="text-3xl font-black font-mono text-indigo-400 mt-1">{bankReport.score}/100</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Solvency Benchmark ≥ 65</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Net NPA Ratio</div>
                    <div className={`text-2xl font-bold font-mono mt-1 ${bankNnpa <= 0.6 ? 'text-emerald-400' : 'text-rose-400'}`}>{bankNnpa}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Benchmark ≤ 0.5%</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">PCR Protection</div>
                    <div className={`text-2xl font-bold font-mono mt-1 ${bankPcr >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{bankPcr}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Benchmark ≥ 70%</div>
                  </div>
                </div>

                {bankReport.criticalFlags.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-rose-400 uppercase">Audit Red Flags:</div>
                    {bankReport.criticalFlags.map((flag, idx) => (
                      <div key={idx} className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl">
                        {flag}
                      </div>
                    ))}
                  </div>
                )}

                {bankReport.strengths.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-bold text-emerald-400 uppercase">Competitive Strengths:</div>
                    {bankReport.strengths.map((str, idx) => (
                      <div key={idx} className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl">
                        ✓ {str}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CYCLICAL VALUATION (DR. SVEN CARLIN) */}
          {activeTab === 'cyclical-valuation' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-400" /> Normalized Cyclical Parameters
                  </h2>
                  <p className="text-xs text-slate-400">Avoid the single-digit P/E trap in metals, chemicals & shipping.</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Current Share Price (₹)</label>
                    <input
                      type="number"
                      value={cyclicalPrice}
                      onChange={(e) => setCyclicalPrice(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Current Year P/E Ratio</label>
                    <input
                      type="number"
                      step={0.5}
                      value={cyclicalCurrentPE}
                      onChange={(e) => setCyclicalCurrentPE(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Total Market Cap (₹ Cr)</label>
                    <input
                      type="number"
                      value={cyclicalMarketCap}
                      onChange={(e) => setCyclicalMarketCap(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">10-Year Average Free Cash Flow (₹ Cr)</label>
                    <input
                      type="number"
                      value={cyclicalAvgFCF}
                      onChange={(e) => setCyclicalAvgFCF(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400">Net Cash Per Share (₹)</label>
                    <input
                      type="number"
                      value={cyclicalNetCash}
                      onChange={(e) => setCyclicalNetCash(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-sm text-emerald-300"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-100">Cyclical Valuation Verdict</h3>
                    <p className="text-xs text-slate-400">Assesses mid-cycle normalized cash generation vs current optics.</p>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold font-mono ${
                    cyclicalResult.cycleRegime === 'CYCLE_TROUGH_OPPORTUNITY'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : cyclicalResult.cycleRegime === 'CYCLE_PEAK_TRAP'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                  }`}>
                    {cyclicalResult.cycleRegime.replace(/_/g, ' ')}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Normalized 10-Yr P/E</div>
                    <div className="text-2xl font-black font-mono text-indigo-400 mt-1">{cyclicalResult.normalizedPE}x</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Vs {cyclicalCurrentPE}x Trailing P/E</div>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400">Cash Safety Buffer</div>
                    <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{cyclicalResult.cashSafetyBufferPct}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Net Cash of Share Price</div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-300">Dr. Sven Carlin Analysis:</div>
                  <div className="text-xs text-slate-300 leading-relaxed">{cyclicalResult.verdict}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: BANK NIFTY & SCALPING */}
          {activeTab === 'bank-nifty' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-indigo-400" /> Ghanshyam Tech 9:20 AM Rulebook
                  </h3>
                  <p className="text-xs text-slate-400">First 5-minute range breakout mechanism.</p>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-indigo-400">Step 1:</strong> Between 9:15 AM and 9:20 AM, mark the High and Low of Bank Nifty index.
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-indigo-400">Step 2:</strong> At 9:20 AM, enter in the direction of whichever side breaks first. Buy ATM Call on high break, or ATM Put on low break.
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-indigo-400">Step 3:</strong> Place a strict 40–50 Bank Nifty point stop loss. Target a fast 1:2 to 1:3 scalping return.
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-400" /> Theta Gainers 9:20 Straddle
                  </h3>
                  <p className="text-xs text-slate-400">Non-directional time decay strategy.</p>
                </div>
                <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400">Execution:</strong> At exactly 9:20 AM, sell 1 Lot ATM Call (CE) + 1 Lot ATM Put (PE).
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400">Protection:</strong> Place a +25% stop-loss on each individual leg.
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                    <strong className="text-emerald-400">Payoff:</strong> On 70% of days, sideways volatility crush generates steady theta decay profits without directional risk.
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
