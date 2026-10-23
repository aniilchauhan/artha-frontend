'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect, useCallback } from 'react';
import { useStockContext } from '../context/StockContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  MessageSquare, 
  Newspaper, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Info, 
  AlertCircle,
  Activity,
  Heart
} from 'lucide-react';
import { SentimentAnalysisResponse } from '../app/api/sentiment/route';

export default function SentimentGauge() {
  const { selectedTicker, stocks, customApiKey } = useStockContext();
  const [data, setData] = useState<SentimentAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stock = stocks.find(s => s.ticker === selectedTicker);

  const fetchSentiment = useCallback(async () => {
    if (!selectedTicker || !stock) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(customApiKey ? { 'x-gemini-api-key': customApiKey } : {})
        },
        body: JSON.stringify({
          ticker: selectedTicker,
          name: stock.name
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const resData = await response.json();
      if (resData.error) {
        throw new Error(resData.error);
      }

      setData(resData);
    } catch (err: any) {
      console.error('Sentiment Fetch Error:', err);
      setError(err.message || 'Failed to load AI sentiment metrics.');
    } finally {
      setLoading(false);
    }
  }, [selectedTicker, stock, customApiKey]);

  useEffect(() => {
    fetchSentiment();
  }, [fetchSentiment]);

  if (!selectedTicker || !stock) return null;

  // Semicircular SVG math
  const radius = 50;
  const strokeWidth = 10;
  const circumference = Math.PI * radius; // Half circle
  const score = data?.score ?? 50;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Custom colors based on indicators
  const getIndicatorColor = (ind?: 'Bullish' | 'Bearish' | 'Neutral') => {
    if (ind === 'Bullish') return 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10';
    if (ind === 'Bearish') return 'text-rose-500 border-rose-500/20 bg-rose-500/5 dark:bg-rose-500/10';
    return 'text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-800';
  };

  const getGaugeStrokeColor = (scoreVal: number) => {
    if (scoreVal >= 60) return '#10b981'; // Emerald
    if (scoreVal <= 40) return '#f43f5e'; // Rose
    return '#94a3b8'; // Slate
  };

  const totalSocial = data ? data.socialMetrics.positiveMentions + data.socialMetrics.negativeMentions : 100;
  const positivePct = data ? (data.socialMetrics.positiveMentions / totalSocial) * 100 : 50;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-xs space-y-4" id="ai-sentiment-gauge-card">
      
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg text-white shrink-0 shadow-xs">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 font-sans">
              Quantum Sentiment Gauge
              <span className="text-[8px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded font-black font-sans uppercase">AI SENTINEL</span>
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Headlines & social media buzz analyzed on-the-fly by Gemini</p>
          </div>
        </div>

        <button
          onClick={fetchSentiment}
          disabled={loading}
          className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
          title="Refresh sentiment data"
          id="btn-refresh-sentiment"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          /* Loading State skeleton */
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 animate-pulse"
          >
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="h-28 w-28 rounded-full border-4 border-gray-200 dark:border-gray-800 border-t-transparent animate-spin" />
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-5/6" />
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            </div>
          </motion.div>
        ) : error ? (
          /* Error State */
          <motion.div 
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/40 rounded-xl text-xs text-rose-700 dark:text-rose-400 font-medium flex items-start gap-2.5"
          >
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Sentiment Pulse Failed</p>
              <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">{error}</p>
            </div>
          </motion.div>
        ) : data ? (
          /* Content State */
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Left Side: Semicircular SVG Gauge Dial */}
              <div className="flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-950/10 border border-gray-100/50 dark:border-gray-800/50 p-4 rounded-xl">
                <div className="relative w-40 h-24 flex items-center justify-center overflow-hidden">
                  <svg className="w-full h-full transform translate-y-2" viewBox="0 0 120 70">
                    {/* Background gauge arc */}
                    <path
                      d="M 10 60 A 50 50 0 0 1 110 60"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={strokeWidth}
                      className="dark:stroke-gray-800"
                      strokeLinecap="round"
                    />
                    
                    {/* Foreground colored gauge arc */}
                    <path
                      d="M 10 60 A 50 50 0 0 1 110 60"
                      fill="none"
                      stroke={getGaugeStrokeColor(score)}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.8s ease' }}
                    />
                  </svg>
                  
                  {/* Floating Needle Indicator or Glowing Dial Hub */}
                  <div className="absolute bottom-1 text-center">
                    <span className="text-3xl font-black font-mono tracking-tight text-gray-950 dark:text-white block leading-none">
                      {score}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full mt-1.5 inline-block ${getIndicatorColor(data.indicator)}`}>
                      {data.indicator}
                    </span>
                  </div>
                </div>

                {/* Score Scale labels */}
                <div className="w-full flex items-center justify-between text-[9px] font-mono text-gray-400 px-4 mt-2">
                  <span className="text-rose-500 font-bold uppercase">BEARISH</span>
                  <span>NEUTRAL</span>
                  <span className="text-emerald-500 font-bold uppercase">BULLISH</span>
                </div>
              </div>

              {/* Right Side: Dual-Channel Telemetry (News vs Social) */}
              <div className="space-y-3.5 flex flex-col justify-center">
                
                {/* News Sentiment Channel */}
                <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-lg border border-sky-100 dark:border-sky-900/20 shrink-0">
                      <Newspaper className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wide">NEWS SENTIMENT</span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        From {data.headlinesAnalyzedCount} Aggregated Headlines
                      </span>
                    </div>
                  </div>
                  
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 border rounded ${getIndicatorColor(data.newsSentiment)}`}>
                    {data.newsSentiment}
                  </span>
                </div>

                {/* Social Media Buzz Channel */}
                <div className="bg-gray-50/50 dark:bg-gray-950/20 border border-gray-200/40 dark:border-gray-800 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 rounded-lg border border-pink-100 dark:border-pink-900/20 shrink-0">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block font-bold uppercase tracking-wide font-sans">SOCIAL CONVERSATION</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {data.socialMetrics.volume24h} Mentions / 24h
                        </span>
                      </div>
                    </div>
                    
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 border rounded ${getIndicatorColor(data.socialSentiment)}`}>
                      {data.socialSentiment}
                    </span>
                  </div>

                  {/* Positive/Negative Split Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] font-mono font-bold text-gray-400">
                      <span className="text-emerald-500 flex items-center gap-0.5">
                        <Heart className="h-2.5 w-2.5 fill-current" /> {data.socialMetrics.positiveMentions} Pos
                      </span>
                      <span>Ratio Balance</span>
                      <span className="text-rose-500">
                        {data.socialMetrics.negativeMentions} Neg
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-emerald-500 h-full" 
                        style={{ width: `${positivePct}%` }}
                      />
                      <div 
                        className="bg-rose-500 h-full" 
                        style={{ width: `${100 - positivePct}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom: AI Context Summary */}
            <div className="bg-indigo-50/5 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/20 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-mono">
                <Activity className="h-3.5 w-3.5 text-indigo-500 animate-pulse shrink-0" />
                <span>AI SENTINEL INTERPRETATION PROTOCOL</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-sans font-medium">
                {data.summary}
              </p>
            </div>

          </motion.div>
        ) : null}
      </AnimatePresence>

    </div>
  );
}
