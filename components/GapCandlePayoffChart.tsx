'use client';

import React, { useState, useMemo } from 'react';
import { Target, ShieldAlert, TrendingUp, TrendingDown, Layers, Activity, Eye, EyeOff } from 'lucide-react';
import { calculateOptionEnvelope, type OptionEnvelopeResult } from '../lib/option-chain';

interface GapCandlePayoffChartProps {
  openPrice: number;
  currentPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  targetPrice: number;
  stopLossPrice: number;
  gapPercent: number;
  symbol: string;
}

const formatINR = (val: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(val);

export default function GapCandlePayoffChart({
  openPrice,
  currentPrice,
  highPrice,
  lowPrice,
  previousClose,
  targetPrice,
  stopLossPrice,
  gapPercent,
  symbol,
}: GapCandlePayoffChartProps) {
  const [showOptionEnvelope, setShowOptionEnvelope] = useState<boolean>(true);

  // Compute option volatility envelope
  const optionEnvelope: OptionEnvelopeResult | null = useMemo(() => {
    try {
      if (currentPrice > 0 && previousClose > 0) {
        return calculateOptionEnvelope(symbol, currentPrice, previousClose);
      }
    } catch {
      // Fallback if price is anomalous
    }
    return null;
  }, [symbol, currentPrice, previousClose]);

  // SVG Canvas dimensions
  const width = 640;
  const height = 200;
  const padTop = 22;
  const padBottom = 25;
  const padLeft = 70;
  const padRight = 110;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Scale domain
  const allPrices = [
    openPrice,
    currentPrice,
    highPrice,
    lowPrice,
    previousClose,
    targetPrice,
    stopLossPrice,
    ...(showOptionEnvelope && optionEnvelope ? [optionEnvelope.upperBreakeven, optionEnvelope.lowerBreakeven] : []),
  ].filter(p => typeof p === 'number' && Number.isFinite(p) && p > 0);

  const rawMin = Math.min(...allPrices);
  const rawMax = Math.max(...allPrices);
  const buffer = Math.max(1, (rawMax - rawMin) * 0.08);
  const minPrice = rawMin - buffer;
  const maxPrice = rawMax + buffer;
  const priceRange = Math.max(0.1, maxPrice - minPrice);

  const getY = (val: number) => padTop + chartH - ((val - minPrice) / priceRange) * chartH;

  const yPrevClose = getY(previousClose);
  const yOpen = getY(openPrice);
  const yCurrent = getY(currentPrice);
  const yHigh = getY(highPrice);
  const yLow = getY(lowPrice);
  const yTarget = getY(targetPrice);
  const yStop = getY(stopLossPrice);

  const isBullishSession = currentPrice >= openPrice;
  const isGapUp = gapPercent >= 0;

  // Candle body dimensions
  const candleX = padLeft + chartW * 0.44;
  const candleW = 32;
  const candleTop = Math.min(yOpen, yCurrent);
  const candleHeight = Math.max(4, Math.abs(yCurrent - yOpen));

  // Shaded gap zone between PrevClose and Open
  const gapZoneTop = Math.min(yPrevClose, yOpen);
  const gapZoneHeight = Math.max(3, Math.abs(yOpen - yPrevClose));

  // Option Envelope coordinates
  const yUpperBE = optionEnvelope ? getY(optionEnvelope.upperBreakeven) : null;
  const yLowerBE = optionEnvelope ? getY(optionEnvelope.lowerBreakeven) : null;
  const yAtmStrike = optionEnvelope ? getY(optionEnvelope.atmStrike) : null;

  return (
    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 select-none space-y-3">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
          <Layers size={14} className="text-indigo-500" />
          Intraday Gap Candle & Execution Payoff Map
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowOptionEnvelope(prev => !prev)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer ${
              showOptionEnvelope
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30'
                : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-500 border-transparent'
            }`}
            title="Toggle Option Straddle & Implied Volatility Envelope"
          >
            {showOptionEnvelope ? <Eye size={12} /> : <EyeOff size={12} />}
            IV Envelope
          </button>
          <span className="font-mono text-[11px] text-slate-400">
            Range: {formatINR(lowPrice)} – {formatINR(highPrice)}
          </span>
        </div>
      </div>

      {/* SVG Payoff Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label={`Intraday gap chart for ${symbol}`}
        >
          {/* Shaded Gap Zone */}
          <rect
            x={padLeft}
            y={gapZoneTop}
            width={chartW}
            height={gapZoneHeight}
            fill={isGapUp ? '#10b981' : '#f43f5e'}
            opacity="0.08"
          />

          {/* Option IV Expected Move Envelope (if active) */}
          {showOptionEnvelope && yUpperBE !== null && yLowerBE !== null && (
            <>
              <rect
                x={padLeft}
                y={Math.min(yUpperBE, yLowerBE)}
                width={chartW}
                height={Math.abs(yLowerBE - yUpperBE)}
                fill="#06b6d4"
                opacity="0.04"
              />
              {/* Upper Breakeven */}
              <line
                x1={padLeft}
                y1={yUpperBE}
                x2={padLeft + chartW}
                y2={yUpperBE}
                stroke="#06b6d4"
                strokeDasharray="2 3"
                strokeWidth="1.2"
              />
              <text
                x={padLeft - 6}
                y={yUpperBE + 3}
                textAnchor="end"
                className="text-[8px] font-mono font-bold fill-cyan-500"
              >
                Opt BE+
              </text>
              <text
                x={padLeft + chartW + 8}
                y={yUpperBE + 3}
                className="text-[9px] font-mono font-bold fill-cyan-500"
              >
                {formatINR(optionEnvelope!.upperBreakeven)}
              </text>

              {/* Lower Breakeven */}
              <line
                x1={padLeft}
                y1={yLowerBE}
                x2={padLeft + chartW}
                y2={yLowerBE}
                stroke="#06b6d4"
                strokeDasharray="2 3"
                strokeWidth="1.2"
              />
              <text
                x={padLeft - 6}
                y={yLowerBE + 3}
                textAnchor="end"
                className="text-[8px] font-mono font-bold fill-cyan-500"
              >
                Opt BE-
              </text>
              <text
                x={padLeft + chartW + 8}
                y={yLowerBE + 3}
                className="text-[9px] font-mono font-bold fill-cyan-500"
              >
                {formatINR(optionEnvelope!.lowerBreakeven)}
              </text>

              {/* ATM Strike Reference Dot */}
              {yAtmStrike !== null && (
                <line
                  x1={padLeft}
                  y1={yAtmStrike}
                  x2={padLeft + 15}
                  y2={yAtmStrike}
                  stroke="#a855f7"
                  strokeWidth="1.5"
                />
              )}
            </>
          )}

          {/* Reference Line: Previous Close */}
          <line
            x1={padLeft}
            y1={yPrevClose}
            x2={padLeft + chartW}
            y2={yPrevClose}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />
          <text
            x={padLeft - 6}
            y={yPrevClose + 3}
            textAnchor="end"
            className="text-[9px] font-mono fill-slate-400"
          >
            Prev Cl
          </text>
          <text
            x={padLeft + chartW + 8}
            y={yPrevClose + 3}
            className="text-[10px] font-mono font-bold fill-slate-400"
          >
            {formatINR(previousClose)}
          </text>

          {/* Target Line */}
          <line
            x1={padLeft}
            y1={yTarget}
            x2={padLeft + chartW}
            y2={yTarget}
            stroke="#10b981"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
          <text
            x={padLeft - 6}
            y={yTarget + 3}
            textAnchor="end"
            className="text-[9px] font-mono font-bold fill-emerald-500"
          >
            Target
          </text>
          <text
            x={padLeft + chartW + 8}
            y={yTarget + 3}
            className="text-[10px] font-mono font-bold fill-emerald-500"
          >
            {formatINR(targetPrice)} (+2.5%)
          </text>

          {/* Stop Loss Line */}
          <line
            x1={padLeft}
            y1={yStop}
            x2={padLeft + chartW}
            y2={yStop}
            stroke="#f43f5e"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
          <text
            x={padLeft - 6}
            y={yStop + 3}
            textAnchor="end"
            className="text-[9px] font-mono font-bold fill-rose-500"
          >
            Stop Loss
          </text>
          <text
            x={padLeft + chartW + 8}
            y={yStop + 3}
            className="text-[10px] font-mono font-bold fill-rose-500"
          >
            {formatINR(stopLossPrice)}
          </text>

          {/* Wick: High to Low */}
          <line
            x1={candleX + candleW / 2}
            y1={yHigh}
            x2={candleX + candleW / 2}
            y2={yLow}
            stroke={isBullishSession ? '#10b981' : '#f43f5e'}
            strokeWidth="2"
          />

          {/* Candle Body: Open to Current */}
          <rect
            x={candleX}
            y={candleTop}
            width={candleW}
            height={candleHeight}
            rx="3"
            fill={isBullishSession ? '#10b981' : '#f43f5e'}
            opacity="0.9"
            stroke={isBullishSession ? '#059669' : '#e11d48'}
            strokeWidth="1"
          />

          {/* Current Price Marker */}
          <circle
            cx={candleX + candleW / 2}
            cy={yCurrent}
            r="4.5"
            fill="#6366f1"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={candleX + candleW + 8}
            y={yCurrent + 3}
            className="text-[10px] font-mono font-black fill-indigo-600 dark:fill-indigo-400"
          >
            Live {formatINR(currentPrice)}
          </text>

          {/* Open Level Tick */}
          <line
            x1={candleX - 10}
            y1={yOpen}
            x2={candleX}
            y2={yOpen}
            stroke="#6366f1"
            strokeWidth="1.5"
          />
          <text
            x={candleX - 14}
            y={yOpen + 3}
            textAnchor="end"
            className="text-[9px] font-mono fill-indigo-500 font-bold"
          >
            Open {formatINR(openPrice)}
          </text>
        </svg>
      </div>

      {/* Option Strategy & IV Envelope Breakdown Card */}
      {showOptionEnvelope && optionEnvelope && (
        <div className="p-3 rounded-xl bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 text-xs space-y-2 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <Activity size={12} /> Option Chain IV Envelope
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                optionEnvelope.envelopeStatus === 'INSIDE_ENVELOPE'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : optionEnvelope.envelopeStatus === 'BREAKOUT_EXPANSION'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'
              }`}>
                {optionEnvelope.envelopeStatus === 'INSIDE_ENVELOPE'
                  ? 'Inside IV Envelope (Mean Reversion Favored)'
                  : optionEnvelope.envelopeStatus === 'BREAKOUT_EXPANSION'
                  ? 'IV Breakout Expansion (Trend Momentum Favored)'
                  : 'At Envelope Edge'}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 dark:text-slate-400">
              <span>ATM Strike: <strong>₹{optionEnvelope.atmStrike}</strong></span>
              <span>•</span>
              <span>1D Exp Move: <strong>±{optionEnvelope.dailyExpectedMovePercent}%</strong></span>
              <span>•</span>
              <span>Straddle: <strong>₹{optionEnvelope.straddlePremiumINR}</strong></span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            <span className="font-bold text-slate-900 dark:text-white">Suggested Strategy:</span>{' '}
            <span className="text-cyan-700 dark:text-cyan-300 font-semibold">{optionEnvelope.suggestedOptionStrategy}</span>
            <span className="text-slate-400 block mt-0.5">{optionEnvelope.strategyRATIONALE}</span>
          </div>
        </div>
      )}

      {/* Bottom Metric Ribbon */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <span className="flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              isGapUp ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
          Opening Gap: {gapPercent >= 0 ? `+${gapPercent}%` : `${gapPercent}%`} (
          {formatINR(openPrice - previousClose)})
        </span>
        <span className="text-slate-400">
          Target Distance: +{formatINR(targetPrice - currentPrice)} | Stop Distance: -
          {formatINR(currentPrice - stopLossPrice)}
        </span>
      </div>
    </div>
  );
}
