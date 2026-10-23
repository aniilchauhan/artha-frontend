'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Scale,
  TrendingUp,
  ShieldCheck,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calculator,
  Sliders,
  DollarSign,
  Layers,
  Flame,
  Target
} from 'lucide-react';
import {
  calculateGrahamNumber,
  calculateNetCurrentAssetValue,
  calculateGrahamRevisedFormula,
  calculateLynchValuation,
  evaluateLynchInventoryForensics,
  calculatePiotroskiFScore,
  calculateAltmanZScore,
  calculateGreenblattMagicFormula,
  evaluateCanSlim,
  evaluateWeinsteinStage,
  type LynchCategory,
  type WeinsteinStage
} from '../lib/book-master-engine';

type MasterTab = 'graham' | 'lynch' | 'piotroski-altman' | 'greenblatt' | 'oneil-weinstein';

export default function BookMastersPanel() {
  const [activeTab, setActiveTab] = useState<MasterTab>('graham');

  // ---------------------------------------------------------------------------
  // 1. BENJAMIN GRAHAM STATE
  // ---------------------------------------------------------------------------
  const [grahamMode, setGrahamMode] = useState<'number' | 'ncav' | 'revised'>('number');
  const [eps, setEps] = useState<number>(45);
  const [bvps, setBvps] = useState<number>(220);
  const [currentPrice, setCurrentPrice] = useState<number>(380);

  // NCAV inputs
  const [currentAssets, setCurrentAssets] = useState<number>(2500);
  const [totalLiabilities, setTotalLiabilities] = useState<number>(1100);
  const [sharesOutstanding, setSharesOutstanding] = useState<number>(20);

  // Graham Revised Growth inputs
  const [growthRate, setGrowthRate] = useState<number>(12);
  const [bondYield, setBondYield] = useState<number>(7.1);

  const grahamNumberResult = useMemo(() => {
    return calculateGrahamNumber({ eps, bvps, currentPrice });
  }, [eps, bvps, currentPrice]);

  const ncavResult = useMemo(() => {
    return calculateNetCurrentAssetValue({
      currentAssets,
      totalLiabilities,
      sharesOutstanding,
      currentPrice,
    });
  }, [currentAssets, totalLiabilities, sharesOutstanding, currentPrice]);

  const grahamRevisedResult = useMemo(() => {
    return calculateGrahamRevisedFormula({
      eps,
      expectedGrowthRatePct: growthRate,
      aaaBondYieldPct: bondYield,
      currentPrice,
    });
  }, [eps, growthRate, bondYield, currentPrice]);

  // ---------------------------------------------------------------------------
  // 2. PETER LYNCH STATE
  // ---------------------------------------------------------------------------
  const [lynchEps, setLynchEps] = useState<number>(32);
  const [lynchPrice, setLynchPrice] = useState<number>(480);
  const [lynchPe, setLynchPe] = useState<number>(15);
  const [lynchGrowth, setLynchGrowth] = useState<number>(22);
  const [lynchDivYield, setLynchDivYield] = useState<number>(1.8);
  const [lynchNetCash, setLynchNetCash] = useState<number>(40);
  const [invGrowth, setInvGrowth] = useState<number>(18);
  const [salesGrowth, setSalesGrowth] = useState<number>(12);

  const lynchResult = useMemo(() => {
    return calculateLynchValuation({
      eps: lynchEps,
      currentPrice: lynchPrice,
      peRatio: lynchPe,
      epsGrowthRatePct: lynchGrowth,
      dividendYieldPct: lynchDivYield,
      netCashPerShare: lynchNetCash,
    });
  }, [lynchEps, lynchPrice, lynchPe, lynchGrowth, lynchDivYield, lynchNetCash]);

  const lynchInvResult = useMemo(() => {
    return evaluateLynchInventoryForensics({
      inventoryGrowthPct: invGrowth,
      salesGrowthPct: salesGrowth,
    });
  }, [invGrowth, salesGrowth]);

  // ---------------------------------------------------------------------------
  // 3. PIOTROSKI & ALTMAN STATE
  // ---------------------------------------------------------------------------
  const [pioNetIncome, setPioNetIncome] = useState<number>(450);
  const [pioCfo, setPioCfo] = useState<number>(520);
  const [pioRoa, setPioRoa] = useState<number>(9.2);
  const [pioPriorRoa, setPioPriorRoa] = useState<number>(7.8);
  const [pioDebt, setPioDebt] = useState<number>(200);
  const [pioPriorDebt, setPioPriorDebt] = useState<number>(260);
  const [pioCr, setPioCr] = useState<number>(1.8);
  const [pioPriorCr, setPioPriorCr] = useState<number>(1.5);
  const [pioDiluted, setPioDiluted] = useState<boolean>(false);
  const [pioGm, setPioGm] = useState<number>(34);
  const [pioPriorGm, setPioPriorGm] = useState<number>(31);
  const [pioAt, setPioAt] = useState<number>(1.3);
  const [pioPriorAt, setPioPriorAt] = useState<number>(1.1);

  const piotroskiResult = useMemo(() => {
    return calculatePiotroskiFScore({
      netIncome: pioNetIncome,
      cfo: pioCfo,
      roa: pioRoa,
      priorRoa: pioPriorRoa,
      longTermDebt: pioDebt,
      priorLongTermDebt: pioPriorDebt,
      currentRatio: pioCr,
      priorCurrentRatio: pioPriorCr,
      sharesDiluted: pioDiluted,
      grossMarginPct: pioGm,
      priorGrossMarginPct: pioPriorGm,
      assetTurnover: pioAt,
      priorAssetTurnover: pioPriorAt,
    });
  }, [pioNetIncome, pioCfo, pioRoa, pioPriorRoa, pioDebt, pioPriorDebt, pioCr, pioPriorCr, pioDiluted, pioGm, pioPriorGm, pioAt, pioPriorAt]);

  // Altman Z-Score inputs
  const [altWorkingCap, setAltWorkingCap] = useState<number>(600);
  const [altTotalAssets, setAltTotalAssets] = useState<number>(2400);
  const [altRetainedEarn, setAltRetainedEarn] = useState<number>(850);
  const [altEbit, setAltEbit] = useState<number>(480);
  const [altMcap, setAltMcap] = useState<number>(3200);
  const [altTotalLiab, setAltTotalLiab] = useState<number>(950);
  const [altSales, setAltSales] = useState<number>(2800);

  const altmanResult = useMemo(() => {
    return calculateAltmanZScore({
      workingCapital: altWorkingCap,
      totalAssets: altTotalAssets,
      retainedEarnings: altRetainedEarn,
      ebit: altEbit,
      marketValueOfEquity: altMcap,
      totalLiabilities: altTotalLiab,
      sales: altSales,
    });
  }, [altWorkingCap, altTotalAssets, altRetainedEarn, altEbit, altMcap, altTotalLiab, altSales]);

  // ---------------------------------------------------------------------------
  // 4. GREENBLATT MAGIC FORMULA STATE
  // ---------------------------------------------------------------------------
  const [mfEbit, setMfEbit] = useState<number>(350);
  const [mfEv, setMfEv] = useState<number>(2800);
  const [mfNwc, setMfNwc] = useState<number>(400);
  const [mfNfa, setMfNfa] = useState<number>(600);

  const magicFormulaResult = useMemo(() => {
    return calculateGreenblattMagicFormula({
      ebit: mfEbit,
      enterpriseValue: mfEv,
      netWorkingCapital: mfNwc,
      netFixedAssets: mfNfa,
    });
  }, [mfEbit, mfEv, mfNwc, mfNfa]);

  // ---------------------------------------------------------------------------
  // 5. CAN SLIM & WEINSTEIN STATE
  // ---------------------------------------------------------------------------
  const [csQtrGrowth, setCsQtrGrowth] = useState<number>(32);
  const [csAnnGrowth, setCsAnnGrowth] = useState<number>(28);
  const [csFrom52High, setCsFrom52High] = useState<number>(8);
  const [csVolRatio, setCsVolRatio] = useState<number>(2.4);
  const [csRs, setCsRs] = useState<number>(86);
  const [csInst, setCsInst] = useState<number>(24);
  const [csUptrend, setCsUptrend] = useState<boolean>(true);
  const [csEntry, setCsEntry] = useState<number>(650);

  const canSlimResult = useMemo(() => {
    return evaluateCanSlim({
      quarterlyEpsGrowthYoYPct: csQtrGrowth,
      annualEpsGrowth3YrPct: csAnnGrowth,
      pctWithin52WeekHigh: csFrom52High,
      breakoutVolumeRatio: csVolRatio,
      relativeStrengthRating: csRs,
      institutionalHoldingPct: csInst,
      isMarketInConfirmedUptrend: csUptrend,
      entryPrice: csEntry,
    });
  }, [csQtrGrowth, csAnnGrowth, csFrom52High, csVolRatio, csRs, csInst, csUptrend, csEntry]);

  // Weinstein inputs
  const [wsPrice, setWsPrice] = useState<number>(650);
  const [wsMa30, setWsMa30] = useState<number>(580);
  const [wsSlope, setWsSlope] = useState<'RISING' | 'FLAT' | 'FALLING'>('RISING');

  const weinsteinResult = useMemo(() => {
    return evaluateWeinsteinStage({
      currentPrice: wsPrice,
      ma30Week: wsMa30,
      ma30WeekSlope: wsSlope,
      relativeStrengthRs: csRs,
      breakoutVolumeRatio: csVolRatio,
    });
  }, [wsPrice, wsMa30, wsSlope, csRs, csVolRatio]);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 lg:p-8 space-y-6 shadow-2xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen className="w-5 h-5" />
            </span>
            <h2 className="text-xl lg:text-2xl font-black text-slate-100 tracking-tight">
              Book Masters Quantitative Lab
            </h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Pure mathematical formulas, forensic ratios, and lifecycle models from legendary stock market literature.
          </p>
        </div>

        {/* Master Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'graham', label: 'Benjamin Graham', desc: 'Margin of Safety', icon: Scale },
            { id: 'lynch', label: 'Peter Lynch', desc: 'GARP & PEG', icon: TrendingUp },
            { id: 'piotroski-altman', label: 'Piotroski & Altman', desc: 'Solvency & Audit', icon: ShieldCheck },
            { id: 'greenblatt', label: 'Joel Greenblatt', desc: 'Magic Formula', icon: Award },
            { id: 'oneil-weinstein', label: 'O\'Neil & Weinstein', desc: 'CAN SLIM & Stages', icon: Target },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as MasterTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-700/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* 1. BENJAMIN GRAHAM */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'graham' && (
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-slate-800 pb-3">
            {[
              { id: 'number', label: 'Graham Number √(22.5 × EPS × BVPS)' },
              { id: 'ncav', label: 'Net-Net Working Capital (NCAV)' },
              { id: 'revised', label: 'Growth Intrinsic Value (Bond Yield)' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setGrahamMode(m.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  grahamMode === m.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {grahamMode === 'number' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" /> Graham Number Parameters
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Earnings Per Share (EPS)</label>
                    <input
                      type="number"
                      value={eps}
                      onChange={e => setEps(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Book Value Per Share (BVPS)</label>
                    <input
                      type="number"
                      value={bvps}
                      onChange={e => setBvps(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Current Share Price (₹)</label>
                    <input
                      type="number"
                      value={currentPrice}
                      onChange={e => setCurrentPrice(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                    The Intelligent Investor (Ch. 14 Benchmark)
                  </span>
                  <div className="mt-4 flex items-baseline gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Graham Fair Number</div>
                      <div className="text-4xl font-black text-amber-400 font-mono">
                        ₹{grahamNumberResult.grahamNumber}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Margin of Safety</div>
                      <div className={`text-2xl font-bold font-mono ${grahamNumberResult.marginOfSafetyPct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {grahamNumberResult.marginOfSafetyPct}%
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                    {grahamNumberResult.verdict}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 space-y-1">
                  <div className="font-semibold text-slate-300">Why 22.5 multiplier?</div>
                  <div>Graham set a hard ceiling of P/E ≤ 15.0 and P/B ≤ 1.5 for defensive investors. 15 × 1.5 = 22.5.</div>
                </div>
              </div>
            </div>
          )}

          {grahamMode === 'ncav' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" /> Net-Net Working Capital Balance Sheet
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Current Assets (₹ Cr)</label>
                    <input
                      type="number"
                      value={currentAssets}
                      onChange={e => setCurrentAssets(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Total Liabilities (₹ Cr)</label>
                    <input
                      type="number"
                      value={totalLiabilities}
                      onChange={e => setTotalLiabilities(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Shares Outstanding (Cr)</label>
                    <input
                      type="number"
                      value={sharesOutstanding}
                      onChange={e => setSharesOutstanding(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                    Security Analysis (Graham &quot;Cigar Butt&quot; Net-Net)
                  </span>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">NCAV Per Share</div>
                      <div className="text-2xl font-bold font-mono text-slate-100">
                        ₹{ncavResult.ncavPerShare}
                      </div>
                    </div>
                    <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      <div className="text-xs text-slate-400">2/3 NCAV Buy Ceiling</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400">
                        ₹{ncavResult.twoThirdsNcavPerShare}
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                    {ncavResult.verdict}
                  </p>
                </div>
              </div>
            </div>
          )}

          {grahamMode === 'revised' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-amber-400" /> Graham Growth Formula Inputs
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400">Expected 7-10Y Growth Rate (%)</label>
                    <input
                      type="number"
                      value={growthRate}
                      onChange={e => setGrowthRate(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">AAA / Sovereign Bond Yield (%)</label>
                    <input
                      type="number"
                      step={0.1}
                      value={bondYield}
                      onChange={e => setBondYield(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-mono uppercase tracking-wider text-amber-400">
                    V = [EPS × (8.5 + 2g) × 4.4] / Y
                  </span>
                  <div className="mt-4 flex items-baseline gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Graham Intrinsic Value</div>
                      <div className="text-4xl font-black text-amber-400 font-mono">
                        ₹{grahamRevisedResult.intrinsicValue}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-400">Margin of Safety</div>
                      <div className={`text-2xl font-bold font-mono ${grahamRevisedResult.marginOfSafetyPct > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {grahamRevisedResult.marginOfSafetyPct}%
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                    {grahamRevisedResult.verdict}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* 2. PETER LYNCH */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'lynch' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" /> Lynch GARP Parameters
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">P/E Ratio</label>
                  <input
                    type="number"
                    value={lynchPe}
                    onChange={e => setLynchPe(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">EPS Growth Rate (%)</label>
                  <input
                    type="number"
                    value={lynchGrowth}
                    onChange={e => setLynchGrowth(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Dividend Yield (%)</label>
                  <input
                    type="number"
                    step={0.1}
                    value={lynchDivYield}
                    onChange={e => setLynchDivYield(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Net Cash Per Share (₹)</label>
                  <input
                    type="number"
                    value={lynchNetCash}
                    onChange={e => setLynchNetCash(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>

              {/* Lynch Inventory Warning */}
              <div className="pt-3 border-t border-slate-800/80">
                <div className="text-xs font-bold text-slate-300 mb-2">Lynch Inventory Forensic Check</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400">Inventory Growth (%)</label>
                    <input
                      type="number"
                      value={invGrowth}
                      onChange={e => setInvGrowth(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Sales Growth (%)</label>
                    <input
                      type="number"
                      value={salesGrowth}
                      onChange={e => setSalesGrowth(Number(e.target.value))}
                      className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
                  One Up On Wall Street Classification
                </span>
                <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  {lynchResult.category}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Dividend-Adjusted PEG</div>
                  <div className={`text-3xl font-black font-mono mt-1 ${lynchResult.dividendAdjustedPeg <= 1.0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {lynchResult.dividendAdjustedPeg}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">PE / (Growth + Yield)</div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Lynch Fair Value Line</div>
                  <div className="text-3xl font-black font-mono text-slate-100 mt-1">
                    ₹{lynchResult.lynchFairValue}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">EPS × Growth + Net Cash</div>
                </div>
              </div>

              <p className="mt-4 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                {lynchResult.verdict}
              </p>

              <div className={`mt-3 text-xs p-3 rounded-xl border flex items-center gap-2 ${lynchInvResult.hasDivergenceWarning ? 'bg-rose-950/30 border-rose-800/50 text-rose-300' : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'}`}>
                {lynchInvResult.hasDivergenceWarning ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                <span>{lynchInvResult.verdict}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* 3. PIOTROSKI & ALTMAN */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'piotroski-altman' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Piotroski Card */}
          <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-200">Piotroski 9-Point F-Score</h3>
                <p className="text-xs text-slate-400">Stanford fundamental health & turnaround engine</p>
              </div>
              <div className={`text-2xl font-black font-mono px-3 py-1 rounded-xl ${piotroskiResult.score >= 8 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : piotroskiResult.score >= 5 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                {piotroskiResult.score}/10
              </div>
            </div>

            <div className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              {piotroskiResult.verdict}
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {piotroskiResult.details.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    {d.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    <span className={d.passed ? 'text-slate-200' : 'text-slate-500'}>{d.criterion}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{d.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Altman Card */}
          <div className="lg:col-span-6 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Altman Z-Score Solvency</h3>
                  <p className="text-xs text-slate-400">2-Year corporate bankruptcy prediction model</p>
                </div>
                <div className={`text-2xl font-black font-mono px-3 py-1 rounded-xl ${altmanResult.zone === 'SAFE_ZONE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : altmanResult.zone === 'GREY_ZONE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                  Z: {altmanResult.zScore}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className={`p-2 rounded-lg border ${altmanResult.zScore >= 2.99 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                  Safe Zone (&gt;2.99)
                </div>
                <div className={`p-2 rounded-lg border ${altmanResult.zScore >= 1.81 && altmanResult.zScore < 2.99 ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                  Grey Zone (1.81-2.99)
                </div>
                <div className={`p-2 rounded-lg border ${altmanResult.zScore < 1.81 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                  Distress (&lt;1.81)
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                {altmanResult.verdict}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-4 border-t border-slate-800/80">
              <div>
                <label className="text-slate-400">Total Assets (₹ Cr)</label>
                <input
                  type="number"
                  value={altTotalAssets}
                  onChange={e => setAltTotalAssets(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="text-slate-400">Total Liabilities (₹ Cr)</label>
                <input
                  type="number"
                  value={altTotalLiab}
                  onChange={e => setAltTotalLiab(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* 4. JOEL GREENBLATT */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'greenblatt' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" /> Magic Formula Inputs
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400">EBIT / Operating Profit (₹ Cr)</label>
                <input
                  type="number"
                  value={mfEbit}
                  onChange={e => setMfEbit(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">Enterprise Value (EV) (₹ Cr)</label>
                <input
                  type="number"
                  value={mfEv}
                  onChange={e => setMfEv(Number(e.target.value))}
                  className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Net Working Capital</label>
                  <input
                    type="number"
                    value={mfNwc}
                    onChange={e => setMfNwc(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Net Fixed Assets</label>
                  <input
                    type="number"
                    value={mfNfa}
                    onChange={e => setMfNfa(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">
                The Little Book That Still Beats the Market
              </span>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Return on Capital (ROC)</div>
                  <div className={`text-3xl font-black font-mono mt-1 ${magicFormulaResult.returnOnCapitalPct >= 20 ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {magicFormulaResult.returnOnCapitalPct}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">EBIT / (NWC + Fixed Assets)</div>
                </div>
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-400">Earnings Yield</div>
                  <div className={`text-3xl font-black font-mono mt-1 ${magicFormulaResult.earningsYieldPct >= 8 ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {magicFormulaResult.earningsYieldPct}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">EBIT / Enterprise Value</div>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                {magicFormulaResult.verdict}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {/* 5. CAN SLIM & WEINSTEIN */}
      {/* ─────────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'oneil-weinstein' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* CAN SLIM */}
          <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-200">William O&apos;Neil CAN SLIM</h3>
                <p className="text-xs text-slate-400">7-Pillar growth & 8% stop discipline</p>
              </div>
              <div className={`text-2xl font-black font-mono px-3 py-1 rounded-xl ${canSlimResult.isLeader ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                {canSlimResult.score}/7
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
                <div className="text-[11px] text-slate-400">Entry Price</div>
                <div className="text-base font-bold text-slate-100 font-mono">₹{csEntry}</div>
              </div>
              <div className="bg-rose-950/30 p-2.5 rounded-xl border border-rose-800/40 text-center">
                <div className="text-[11px] text-rose-300">8% Hard Cut</div>
                <div className="text-base font-bold text-rose-400 font-mono">₹{canSlimResult.hardStopLossPrice}</div>
              </div>
              <div className="bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/40 text-center">
                <div className="text-[11px] text-emerald-300">20% Target</div>
                <div className="text-base font-bold text-emerald-400 font-mono">₹{canSlimResult.profitTargetPrice20Pct}</div>
              </div>
            </div>

            <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
              {canSlimResult.breakdown.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-900/40 border border-slate-800/50">
                  <div className="flex items-center gap-2">
                    {b.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-slate-600" />}
                    <span className={b.passed ? 'text-slate-200' : 'text-slate-500'}>{b.pillar}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{b.note}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stan Weinstein */}
          <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-200">Stan Weinstein 4-Stage</h3>
                  <p className="text-xs text-slate-400">30-Week (150-Day) Moving Average cycle</p>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Detected Stage</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {weinsteinResult.stage.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Action Signal</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${weinsteinResult.action === 'STRONG_BUY' ? 'bg-emerald-500/20 text-emerald-400' : weinsteinResult.action === 'AVOID_OR_EXIT' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {weinsteinResult.action.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <p className="mt-4 text-xs text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
                {weinsteinResult.verdict}
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">30-Week MA Slope:</span>
                <div className="flex gap-1">
                  {(['RISING', 'FLAT', 'FALLING'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setWsSlope(s)}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${wsSlope === s ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
