'use client';

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info, BookOpen, ExternalLink, X } from 'lucide-react';

export interface HelpTopic {
  term: string;
  category: 'Risk & Execution' | 'Quantitative Model' | 'Market Screener';
  shortDef: string;
  formula?: string;
  implication: string;
}

export const HELP_TOPICS: Record<string, HelpTopic> = {
  rvol: {
    term: 'RVOL (Relative Volume)',
    category: 'Market Screener',
    shortDef: 'Current intraday trading volume divided by the 20-day average volume for the same time window.',
    formula: 'RVOL = Volume_Today / 20_Day_Average_Volume',
    implication: 'Values above 1.5x indicate strong institutional participation. Avoid breakouts with RVOL < 1.0x due to false expansion risks.',
  },
  ece: {
    term: 'ECE (Expected Calibration Error)',
    category: 'Quantitative Model',
    shortDef: 'The weighted difference between forecast model confidence probabilities and empirical realized win rates.',
    formula: 'ECE = Σ (|acc(B_m) - conf(B_m)| * |B_m| / N)',
    implication: 'An ECE below 5% represents well-calibrated probabilities. High ECE signals model overconfidence or concept drift.',
  },
  brierScore: {
    term: 'Brier Score',
    category: 'Quantitative Model',
    shortDef: 'Mean squared error assessing the accuracy and calibration of probabilistic binary forecasts.',
    formula: 'Brier = (1/N) * Σ (p_i - o_i)²',
    implication: 'Scores close to 0 denote superior probabilistic skill; 0.25 represents an uninformative 50/50 baseline coin flip.',
  },
  stopFirst: {
    term: 'Stop-First Invariant',
    category: 'Risk & Execution',
    shortDef: 'Reconciliation rule prioritizing stop-loss fills whenever both target and stop levels are touched on the same candle.',
    implication: 'Prevents retroactive hindsight bias by strictly assuming the trade stopped out first on ambiguous single-bar data.',
  },
  executionFriction: {
    term: 'Execution Friction (15 bps)',
    category: 'Risk & Execution',
    shortDef: 'Realistic statutory and liquidity friction deducted from every paper execution.',
    formula: 'Friction = Brokerage (3 bps) + STT/Stamp/Turnover (7 bps) + Slippage (5 bps) = 15 bps',
    implication: 'Ensures paper trading returns represent net realizable profits rather than unachievable gross theory.',
  },
  gapEnvelope: {
    term: 'Gap Envelope & 3% Cap',
    category: 'Market Screener',
    shortDef: 'Standard deviation boundary restricting gap setups from opening more than 3% beyond previous close.',
    implication: 'Extended gaps above 3% suffer higher intraday exhaustion and reversal rates in Indian large and mid caps.',
  },
  psi: {
    term: 'PSI (Population Stability Index)',
    category: 'Quantitative Model',
    shortDef: 'Statistical metric measuring divergence between training feature distributions and live forward observation data.',
    formula: 'PSI = Σ (Actual% - Expected%) * ln(Actual% / Expected%)',
    implication: 'PSI < 0.10 indicates stable features; values > 0.20 trigger automatic model recalibration.',
  },
};

interface ContextualHelpProps {
  topicKey: keyof typeof HELP_TOPICS;
  title?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export default function ContextualHelp({
  topicKey,
  title,
  size = 'sm',
  className = '',
}: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const topic = HELP_TOPICS[topicKey];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!topic) return null;

  const iconSize = size === 'sm' ? 14 : 16;

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Contextual help for ${topic.term}`}
        aria-expanded={isOpen}
        className="text-slate-400 hover:text-indigo-400 p-0.5 rounded transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500"
      >
        <HelpCircle size={iconSize} />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-2 w-72 sm:w-80 p-4 rounded-xl bg-slate-900 border border-slate-700/80 shadow-2xl text-left animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {topic.category}
              </span>
              <h4 className="text-xs font-bold text-white pt-1">
                {title || topic.term}
              </h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-0.5"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Definition */}
          <p className="text-xs text-slate-300 py-2 leading-relaxed">
            {topic.shortDef}
          </p>

          {/* Formula */}
          {topic.formula && (
            <div className="p-2 my-1 rounded bg-slate-950 border border-slate-800 font-mono text-[11px] text-amber-300/90 break-words">
              {topic.formula}
            </div>
          )}

          {/* Implication */}
          <div className="pt-2 text-[11px] text-slate-400 leading-normal border-t border-slate-800/80">
            <span className="font-semibold text-slate-200">Execution Tip: </span>
            {topic.implication}
          </div>
        </div>
      )}
    </div>
  );
}
