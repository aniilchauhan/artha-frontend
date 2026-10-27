import { DetailedSuggestionResult, calculateRSI, calculateATR, calculateRVOL } from './stock-data';

export interface PredictionModelOptions {
  horizon?: 'intraday' | 'swing' | 'positional';
  minRiskReward?: number;
  capital?: number;
}

export interface StockReturnMetrics {
  targetPrice: number;
  targetPrice2: number;
  projectedReturnPercent: number; // e.g. 7.5 (meaning +7.5%)
  projectedReturnPercent2: number; // e.g. 13.8 (meaning +13.8%)
  stopLossPrice: number;
  downsideRiskPercent: number;    // e.g. 2.5 (meaning -2.5%)
  riskRewardRatio: number;        // e.g. 3.0 (meaning 3.0:1)
  confidenceScore: number;        // e.g. 84 (meaning 84% model confidence)
  rsi14: number;                  // e.g. 58.2
  atrPercent: number;             // e.g. 3.2%
  rvol: number;                   // e.g. 2.1x
  bandwidth: number;              // Bollinger Bandwidth %
  isBreakout: boolean;
  isSqueezeCoiled: boolean;
  isHighAlpha: boolean;
  expectedGainRupees: number;     // e.g. ₹3,750 for configured capital
  setupType: 'Breakout Surge' | 'Momentum Swing' | 'Value Reversal' | 'Growth Trend' | 'VCP Coil' | 'High-RVOL Breakout';
  technicalCatalyst: string;
}

export function calculateReturnMetrics(
  stock: {
    ticker?: string;
    symbol?: string;
    currentPrice: number;
    changePercent?: number;
    volume?: number;
    high?: number;
    low?: number;
    open?: number;
    marketCap?: number;
    sector?: string;
    history?: { price: number; close?: number; volume?: number; high?: number; low?: number }[];
  },
  detailed?: DetailedSuggestionResult | null,
  capitalOrOptions: number | PredictionModelOptions = 50000
): StockReturnMetrics {
  const options: PredictionModelOptions =
    typeof capitalOrOptions === 'number'
      ? { capital: capitalOrOptions, horizon: 'swing' }
      : { capital: 50000, horizon: 'swing', ...capitalOrOptions };

  const currentPrice = Math.max(0.01, stock.currentPrice || 100);
  const changePercent = stock.changePercent ?? 0;
  const volume = stock.volume ?? 100000;
  const score = detailed?.score ?? 0;
  const suggestion = detailed?.suggestion ?? 'HOLD';
  const horizon = options.horizon || 'swing';
  const capital = options.capital || 50000;

  // 1. Stock-specific deterministic ticker variance based on symbol
  const sym = (stock.ticker || stock.symbol || 'STOCK').toUpperCase();
  const symHash = sym.split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx * 7 + 13), 0);
  const tickerVariance = ((symHash % 29) - 14) * 0.12; // -1.68% to +1.68% variance

  // 2. Volatility factor (ATR 14)
  const atrData = detailed?.atrPercent
    ? { atr: detailed.atr ?? 2.5, atrPercent: detailed.atrPercent }
    : calculateATR(stock.history || [], currentPrice, 14);
  const atrPercent = Math.max(1.2, Math.min(8.0, atrData.atrPercent));

  // 3. RSI (14-period momentum velocity)
  const rsi = detailed?.rsi ?? (stock.history && stock.history.length >= 15 ? calculateRSI(stock.history as any, 14) : 52.0);

  // 4. Relative Volume (RVOL institutional accumulation)
  const rvol = detailed?.rvol ?? (stock.history && stock.history.length >= 10 ? calculateRVOL(stock.history, volume, 20) : (volume >= 500000 ? 1.6 : 1.1));

  // 5. Bandwidth / Squeeze Coiling (VCP)
  const bb = detailed?.bollingerBands;
  const bandwidth = detailed?.bandwidth ?? (bb && bb.middleBand > 0 ? ((bb.upperBand - bb.lowerBand) / bb.middleBand) * 100 : 7.5);
  const isSqueezeCoiled = bandwidth < 6.8;

  // 6. Market Cap Beta Factor
  const mcap = stock.marketCap || 25000;
  let mcapMultiplier = 1.0;
  if (mcap >= 100000) mcapMultiplier = 0.85; // Large cap: lower beta, tighter targets
  else if (mcap <= 10000) mcapMultiplier = 1.18; // Small cap: wider expansion potential

  // 7. Base target derived from ATR and Horizon
  let horizonMultiplier = 2.4; // Swing default (1-3 weeks)
  if (horizon === 'intraday') horizonMultiplier = 1.4; // Quick scalp (1-3 days)
  else if (horizon === 'positional') horizonMultiplier = 4.2; // Positional trend (1-3 months)

  let baseTarget = atrPercent * horizonMultiplier * mcapMultiplier;

  // 8. Technical Signal Adjustment
  if (suggestion === 'BUY') {
    baseTarget += 1.6 + Math.max(0, (score / 100) * 2.0);
  } else if (suggestion === 'SELL') {
    baseTarget = Math.max(1.8, baseTarget * 0.65);
  } else {
    baseTarget += 0.6 + Math.max(0, (score / 100) * 1.0);
  }

  // 9. RSI Momentum Sweet Spot (Optimal Launch Runway)
  if (rsi >= 48 && rsi <= 68) {
    baseTarget += 1.4; // Ideal momentum sweet spot
  } else if (rsi < 36) {
    baseTarget += 1.1; // Oversold base reversal
  } else if (rsi > 74) {
    baseTarget -= 1.2; // Overbought exhaustion dampener
  }

  // 10. RVOL Institutional Demand Lift
  if (rvol >= 2.0) {
    baseTarget += 1.6;
  } else if (rvol >= 1.4) {
    baseTarget += 0.9;
  } else if (rvol < 0.7) {
    baseTarget -= 0.7;
  }

  // 11. Bollinger Band Channel Headroom
  if (bb?.upperBand && bb.upperBand > currentPrice * 1.01) {
    const rawHeadroom = ((bb.upperBand - currentPrice) / currentPrice) * 100;
    const bbExpansion = Math.min(6.5, Math.max(0.5, rawHeadroom * 0.45));
    baseTarget = (baseTarget * 0.6) + (bbExpansion * 0.85);
  }

  // 12. Intraday Momentum Tailwind
  const momentumLift = Math.max(-0.8, Math.min(2.0, changePercent * 0.38));
  baseTarget += momentumLift;

  // 13. Ticker-specific dispersion
  baseTarget += tickerVariance;

  // Bounds according to horizon
  const minTarget = horizon === 'intraday' ? 1.8 : horizon === 'positional' ? 5.0 : 2.4;
  const maxTarget = horizon === 'intraday' ? 7.5 : horizon === 'positional' ? 28.0 : 16.5;
  const projectedReturnPercent = Number(Math.min(maxTarget, Math.max(minTarget, baseTarget)).toFixed(1));
  const targetPrice = Number((currentPrice * (1 + projectedReturnPercent / 100)).toFixed(2));

  // Target 2 (Extended runner target)
  const projectedReturnPercent2 = Number((projectedReturnPercent * 1.65).toFixed(1));
  const targetPrice2 = Number((currentPrice * (1 + projectedReturnPercent2 / 100)).toFixed(2));

  // Risk / Stop Loss Floor derived from ATR
  const downsideRiskPercent = Number(Math.max(1.4, Math.min(4.8, atrPercent * 1.15)).toFixed(1));
  const stopLossPrice = Number((currentPrice * (1 - downsideRiskPercent / 100)).toFixed(2));

  const riskRewardRatio = Number((projectedReturnPercent / Math.max(0.5, downsideRiskPercent)).toFixed(1));

  // Multi-factor Confluence Confidence Score (48% - 94%)
  let conf = detailed?.confidence ?? 54;
  if (rsi >= 48 && rsi <= 68) conf += 8;
  if (rvol >= 1.4) conf += 8;
  if (isSqueezeCoiled) conf += 6;
  if (changePercent > 0.5 && changePercent <= 3.0) conf += 6;
  const confidenceScore = Math.min(94, Math.max(48, conf));

  const isBreakout = changePercent >= 1.8 || (volume >= 500000 && changePercent > 0.8) || rvol >= 1.8;
  const isHighAlpha = projectedReturnPercent >= 5.0 && riskRewardRatio >= 2.0 && confidenceScore >= 70;

  const expectedGainRupees = Math.round(capital * (projectedReturnPercent / 100));

  let setupType: 'Breakout Surge' | 'Momentum Swing' | 'Value Reversal' | 'Growth Trend' | 'VCP Coil' | 'High-RVOL Breakout' = 'Growth Trend';
  if (isSqueezeCoiled) {
    setupType = 'VCP Coil';
  } else if (isBreakout && rvol >= 1.8) {
    setupType = 'High-RVOL Breakout';
  } else if (isBreakout) {
    setupType = 'Breakout Surge';
  } else if (detailed?.macd?.signal === 'BULLISH' || changePercent > 1.2) {
    setupType = 'Momentum Swing';
  } else if (rsi < 38 || (detailed?.score ?? 0) > 40) {
    setupType = 'Value Reversal';
  }

  const technicalCatalyst = `${setupType} • RSI ${rsi} • RVOL ${rvol}x • ATR ${atrPercent}%`;

  return {
    targetPrice,
    targetPrice2,
    projectedReturnPercent,
    projectedReturnPercent2,
    stopLossPrice,
    downsideRiskPercent,
    riskRewardRatio,
    confidenceScore,
    rsi14: rsi,
    atrPercent,
    rvol,
    bandwidth: Number(bandwidth.toFixed(1)),
    isBreakout,
    isSqueezeCoiled,
    isHighAlpha,
    expectedGainRupees,
    setupType,
    technicalCatalyst,
  };
}
