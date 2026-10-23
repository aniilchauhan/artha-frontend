'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { 
  Calculator, 
  Coins, 
  Target, 
  ShieldAlert, 
  TrendingUp, 
  Percent, 
  AlertTriangle,
  Info,
  ArrowRightLeft,
  ChevronRight
} from 'lucide-react';
import { motion } from 'motion/react';

export default function PositionCalculator() {
  const { selectedTicker, stocks } = useStockContext();
  const stock = stocks.find(s => s.ticker === selectedTicker);

  // User input states
  const [capital, setCapital] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0); // Default 1% risk per trade
  const [entryPrice, setEntryPrice] = useState<number>(0);
  const [stopLossPrice, setStopLossPrice] = useState<number>(0);

  // Sync entry and stop loss when selected stock changes
  useEffect(() => {
    if (stock) {
      const current = stock.currentPrice;
      setEntryPrice(Number(current.toFixed(2)));
      // Default stop loss to 1.5% below entry
      setStopLossPrice(Number((current * 0.985).toFixed(2)));
    }
  }, [selectedTicker, stock]);

  // Handle preset stop losses
  const applyStopLossPreset = (percentage: number) => {
    if (entryPrice > 0) {
      const sl = entryPrice * (1 - percentage / 100);
      setStopLossPrice(Number(sl.toFixed(2)));
    }
  };

  // Fixed 3% profit target as requested
  const profitTargetPercent = 3.0;
  
  const calculations = useMemo(() => {
    if (entryPrice <= 0 || stopLossPrice <= 0 || capital <= 0) {
      return null;
    }

    const targetPrice = Number((entryPrice * (1 + profitTargetPercent / 100)).toFixed(2));
    const riskAmount = Number((capital * (riskPercent / 100)).toFixed(2));
    
    // Stop loss must be strictly below Entry Price for long positions
    const isInvalidStopLoss = stopLossPrice >= entryPrice;
    
    if (isInvalidStopLoss) {
      return {
        isInvalidStopLoss: true,
        targetPrice,
        riskAmount,
        sharesToBuy: 0,
        totalCost: 0,
        rewardAmount: 0,
        riskRewardRatio: 0,
        exceedsCapital: false,
        cappedShares: 0,
        cappedCost: 0,
        cappedRisk: 0,
        cappedReward: 0
      };
    }

    const riskPerShare = entryPrice - stopLossPrice;
    const sharesToBuy = Math.floor(riskAmount / riskPerShare);
    const totalCost = Number((sharesToBuy * entryPrice).toFixed(2));
    const rewardPerShare = targetPrice - entryPrice;
    const rewardAmount = Number((sharesToBuy * rewardPerShare).toFixed(2));
    
    // Risk Reward ratio
    const riskRewardRatio = Number((rewardPerShare / riskPerShare).toFixed(2));
    
    // Warning if position cost exceeds total capital
    const exceedsCapital = totalCost > capital;

    // Adjusted shares if it exceeds capital (cash limit)
    const maxSharesByCapital = Math.floor(capital / entryPrice);
    const cappedShares = exceedsCapital ? maxSharesByCapital : sharesToBuy;
    const cappedCost = Number((cappedShares * entryPrice).toFixed(2));
    const cappedRisk = Number((cappedShares * riskPerShare).toFixed(2));
    const cappedReward = Number((cappedShares * rewardPerShare).toFixed(2));

    return {
      isInvalidStopLoss: false,
      targetPrice,
      riskAmount,
      sharesToBuy,
      totalCost,
      rewardAmount,
      riskRewardRatio,
      exceedsCapital,
      cappedShares,
      cappedCost,
      cappedRisk,
      cappedReward
    };
  }, [capital, riskPercent, entryPrice, stopLossPrice]);

  if (!stock) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4" id="position-sizing-calculator-card">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-500/10 shrink-0">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              Tactical Risk & Sizing Engine
              <span className="text-[8px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-black font-sans">3% TARGET</span>
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Configure capital parameters to plan your leverage and protection floors</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Side: Inputs Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Capital Allocation & Risk Percentage */}
          <div className="space-y-3 p-3.5 bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 rounded-xl">
            <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <Coins className="h-3 w-3" /> Account Limits
            </span>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Trading Capital</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono font-bold text-gray-400 dark:text-gray-500">₹</span>
                <input
                  type="number"
                  value={capital || ''}
                  onChange={(e) => setCapital(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-right"
                  id="calc-input-capital"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                <span>Risk Per Trade</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{riskPercent}% (₹{((capital * riskPercent) / 100).toLocaleString('en-IN')})</span>
              </div>
              <input
                type="range"
                min="0.25"
                max="5.0"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                id="calc-range-risk"
              />
              <div className="flex justify-between text-[8px] font-mono text-gray-400">
                <span>0.25% (Conservative)</span>
                <span>5.0% (Aggressive)</span>
              </div>
            </div>
          </div>

          {/* Trade Parameters (Entry & Stop Loss) */}
          <div className="space-y-3.5 p-3.5 bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 rounded-xl">
            <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" /> Position Pricing
            </span>

            {/* Entry Price Input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Entry Buy Price</label>
                <button
                  onClick={() => setEntryPrice(Number(stock.currentPrice.toFixed(2)))}
                  className="text-[9px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Reset to Current (₹{stock.currentPrice.toFixed(2)})
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono font-bold text-gray-400 dark:text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.05"
                  value={entryPrice || ''}
                  onChange={(e) => setEntryPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-right"
                  id="calc-input-entry"
                />
              </div>
            </div>

            {/* Stop Loss Input & Presets */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Stop-Loss Price</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-mono font-bold text-gray-400 dark:text-gray-500">₹</span>
                <input
                  type="number"
                  step="0.05"
                  value={stopLossPrice || ''}
                  onChange={(e) => setStopLossPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-right"
                  id="calc-input-stoploss"
                />
              </div>

              {/* Presets Buttons */}
              <div className="grid grid-cols-4 gap-1.5">
                {[1.0, 1.5, 2.0, 3.0].map((pct) => {
                  const slValue = entryPrice * (1 - pct / 100);
                  const isActive = Math.abs(stopLossPrice - slValue) < 0.1;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyStopLossPreset(pct)}
                      className={`py-1 text-[10px] font-mono font-bold rounded border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      -{pct}%
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* Right Side: Analytical Output Dashboard (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          
          {calculations ? (
            calculations.isInvalidStopLoss ? (
              
              /* Invalid stop loss message */
              <div className="flex-1 flex flex-col items-center justify-center p-8 bg-rose-50/20 border border-rose-100 dark:border-rose-950/40 rounded-2xl text-center space-y-2">
                <ShieldAlert className="h-8 w-8 text-rose-500" />
                <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider font-mono">Invalid Risk Parameters</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm">
                  Stop-Loss price must be strictly lower than your Entry buy price to define risk vectors on a standard long position.
                </p>
              </div>

            ) : (
              
              /* Active Calculations layout */
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Visual Target & Stop-loss Map */}
                <div className="bg-gray-50/50 dark:bg-gray-950/10 border border-gray-200/40 dark:border-gray-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                  <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Target className="h-3 w-3 text-emerald-500" /> Position Targets
                  </span>

                  {/* Flow Map Visualizer */}
                  <div className="space-y-3 relative font-mono text-xs">
                    {/* Fixed 3% profit target */}
                    <div className="flex items-center justify-between border-b border-dashed border-emerald-500/30 pb-1.5">
                      <div>
                        <span className="text-[9px] text-emerald-500 font-bold block uppercase">PROFIT TARGET (+3%)</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{calculations.targetPrice}</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded font-bold">🎯 Target</span>
                    </div>

                    {/* Entry Price */}
                    <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-1.5">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase">ENTRY LEVEL</span>
                        <span className="font-bold text-gray-800 dark:text-gray-200">₹{entryPrice}</span>
                      </div>
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold">🛒 Buy</span>
                    </div>

                    {/* Stop Loss */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[9px] text-rose-500 font-bold block uppercase">STOP LOSS (-{(((entryPrice - stopLossPrice) / entryPrice) * 100).toFixed(1)}%)</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{stopLossPrice}</span>
                      </div>
                      <span className="text-[10px] bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 px-1.5 py-0.5 rounded font-bold">🛡️ Protect</span>
                    </div>
                  </div>

                  {/* Risk-Reward Ratio Badge */}
                  <div className="pt-2 border-t border-gray-200/40 dark:border-gray-800 flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400 text-[10px]">RISK-TO-REWARD:</span>
                    <span className={`font-black text-sm px-2.5 py-0.5 rounded-md ${
                      calculations.riskRewardRatio >= 2.0 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}>
                      1 : {calculations.riskRewardRatio}
                    </span>
                  </div>

                </div>

                {/* Sizing Engine Allocation Metrics */}
                <div className="bg-gray-50/50 dark:bg-gray-950/10 border border-gray-200/40 dark:border-gray-800 p-4 rounded-xl flex flex-col justify-between space-y-4">
                  <span className="text-[10px] font-mono font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-indigo-500" /> Sizing Strategy
                  </span>

                  {/* Quantum Metrics */}
                  <div className="space-y-3 font-mono text-xs">
                    
                    {/* Share Quantity */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-[11px]">SUGGESTED QTY:</span>
                      <span className="font-black text-sm text-indigo-700 dark:text-indigo-400">
                        {calculations.exceedsCapital ? calculations.cappedShares : calculations.sharesToBuy} Shares
                      </span>
                    </div>

                    {/* Capital Required */}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-[11px]">CAPITAL NEEDED:</span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        ₹{(calculations.exceedsCapital ? calculations.cappedCost : calculations.totalCost).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Potential Loss / Risk */}
                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-200/50 dark:border-gray-800">
                      <span className="text-rose-500 text-[10px] font-bold">MAX LOSS (RISK):</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        ₹{(calculations.exceedsCapital ? calculations.cappedRisk : calculations.riskAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Potential Profit / Reward */}
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-500 text-[10px] font-bold">MAX GAIN (REWARD):</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(calculations.exceedsCapital ? calculations.cappedReward : calculations.rewardAmount).toLocaleString('en-IN')}
                      </span>
                    </div>

                  </div>

                  {/* Alerts / Capital limitations */}
                  <div className="pt-2 border-t border-gray-200/40 dark:border-gray-800">
                    {calculations.exceedsCapital ? (
                      <div className="text-[9px] text-amber-600 dark:text-amber-500 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 shrink-0" />
                        <span>Capital Cap Met! Quantity adjusted to cash limit.</span>
                      </div>
                    ) : (
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-500 font-bold flex items-center gap-1">
                        <Info className="h-3 w-3 shrink-0" />
                        <span>Position sizing respects your fixed {riskPercent}% risk rules.</span>
                      </div>
                    )}
                  </div>

                </div>

              </div>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
              Enter valid pricing variables to calculate optimal size.
            </div>
          )}

          {/* Sizing Strategy Insights HUD box */}
          {calculations && !calculations.isInvalidStopLoss && (
            <div className="bg-indigo-50/5 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/20 rounded-xl p-3.5 space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
                <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                <span>Strategic Advisory</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed font-sans font-medium">
                {calculations.riskRewardRatio >= 2.0 ? (
                  `This setup offers an asymmetrical advantage with an outstanding risk-reward profile (1 : ${calculations.riskRewardRatio}). Entering a long trade on ${stock.ticker} here allows a comfortable protection buffer while pursuing the mandatory ${profitTargetPercent}% profit milestone.`
                ) : (
                  `The current configuration has a tight reward-to-risk spread (1 : ${calculations.riskRewardRatio}) due to a wide Stop-Loss. Consider narrowing the Stop-Loss protection boundary or waiting for a support level retrenchment to improve structural expectancy.`
                )}
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
