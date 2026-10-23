'use client';

import React, { useState, useMemo } from 'react';
import { useStockContext } from '../context/StockContext';
import { Sparkles, Search, TrendingUp, HelpCircle, Activity, Bell, FileText, CheckCircle2, Building2 } from 'lucide-react';
import TradeAdvisorTab from './TradeAdvisorTab';
import WallStreetResearchSuite from './WallStreetResearchSuite';

export default function TradeAdvisorScreen() {
  const { stocks, theme } = useStockContext();
  const [activeAdvisorMode, setActiveAdvisorMode] = useState<'tactical' | 'wall_street'>('tactical');
  const [selectedTicker, setSelectedTicker] = useState<string>(stocks[0]?.ticker || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [gridRiskProfile, setGridRiskProfile] = useState<'Conservative' | 'Moderate' | 'Aggressive' | 'Intraday'>('Moderate');

  const currentStock = useMemo(() => {
    return stocks.find(s => s.ticker === selectedTicker) || stocks[0];
  }, [stocks, selectedTicker]);

  const filteredStocks = useMemo(() => {
    return stocks.filter(s => 
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [stocks, searchQuery]);

  // Generate a tactical bird's-eye summary for all stocks
  const allStrategiesOverview = useMemo(() => {
    return stocks.map(stock => {
      let buyMin = stock.currentPrice * 0.965;
      let buyMax = stock.currentPrice * 0.99;
      let sellMin = stock.currentPrice * 1.07;
      let sellMax = stock.currentPrice * 1.13;
      let stopLoss = stock.currentPrice * 0.935;

      if (gridRiskProfile === 'Conservative') {
        buyMin = stock.currentPrice * 0.945;
        buyMax = stock.currentPrice * 0.975;
        sellMin = stock.currentPrice * 1.04;
        sellMax = stock.currentPrice * 1.075;
        stopLoss = stock.currentPrice * 0.925;
      } else if (gridRiskProfile === 'Aggressive') {
        buyMin = stock.currentPrice * 0.975;
        buyMax = stock.currentPrice * 1.02;
        sellMin = stock.currentPrice * 1.14;
        sellMax = stock.currentPrice * 1.25;
        stopLoss = stock.currentPrice * 0.905;
      } else if (gridRiskProfile === 'Intraday') {
        buyMin = stock.currentPrice * 0.985;
        buyMax = stock.currentPrice * 0.995;
        sellMin = buyMin * 1.03;
        sellMax = buyMax * 1.03;
        stopLoss = buyMin * 0.985;
      }
      
      let status: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (stock.currentPrice >= buyMin && stock.currentPrice <= buyMax) {
        status = 'BUY';
      } else if (stock.currentPrice >= sellMin && stock.currentPrice <= sellMax) {
        status = 'SELL';
      }

      return {
        ticker: stock.ticker,
        name: stock.name,
        price: stock.currentPrice,
        changePercent: stock.changePercent,
        buyRange: `₹${buyMin.toFixed(1)} - ₹${buyMax.toFixed(1)}`,
        sellRange: `₹${sellMin.toFixed(1)} - ₹${sellMax.toFixed(1)}`,
        stopLoss: `₹${stopLoss.toFixed(1)}`,
        status
      };
    });
  }, [stocks, gridRiskProfile]);

  return (
    <div className="space-y-6" id="friday-advisor-screen-root">
      
      {/* Sci-Fi Glassmorphism Header */}
      <div className="relative bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-purple-950/80 p-6 sm:p-8 rounded-3xl border border-indigo-500/30 shadow-2xl backdrop-blur-2xl overflow-hidden text-white">
        {/* Animated ambient mesh & glowing dual orbs */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.18),transparent_50%)] animate-pulse" />
        <div className="absolute -right-16 -top-16 h-64 w-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 h-64 w-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest font-mono shadow-sm">
                System Interface: F.R.I.D.A.Y. v4.2
              </span>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black uppercase tracking-tight flex items-center gap-3 font-sans">
              <span className="p-2 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 shadow-lg shadow-indigo-500/10">
                <Sparkles className="h-6 w-6 text-indigo-400 fill-indigo-400/20 animate-spin-slow" />
              </span>
              <span>FRIDAY Tactical Trade Advisor</span>
            </h1>
            <p className="text-xs text-indigo-200/90 max-w-2xl font-medium font-sans leading-relaxed">
              Welcome, Boss. Here is your proactive trade advisory suite. Our algorithms map real-time support/resistance brackets, calibrate risk metrics, and compile custom structural briefings on-demand.
            </p>
          </div>

          {/* Quick HUD Metrics */}
          <div className="flex gap-4 border-t border-indigo-500/20 pt-4 md:pt-0 md:border-t-0 font-mono text-right shrink-0">
            <div className="bg-slate-900/60 rounded-2xl px-3.5 py-2 border border-indigo-500/20 backdrop-blur-sm space-y-0.5">
              <span className="text-[10px] text-indigo-300 uppercase font-bold">Active Assets</span>
              <p className="text-lg font-black text-white">{stocks.length}</p>
            </div>
            <div className="bg-slate-900/60 rounded-2xl px-3.5 py-2 border border-emerald-500/20 backdrop-blur-sm space-y-0.5">
              <span className="text-[10px] text-emerald-300 uppercase font-bold">Buy Triggers</span>
              <p className="text-lg font-black text-emerald-400">
                {allStrategiesOverview.filter(s => s.status === 'BUY').length}
              </p>
            </div>
            <div className="bg-slate-900/60 rounded-2xl px-3.5 py-2 border border-indigo-500/20 backdrop-blur-sm space-y-0.5">
              <span className="text-[10px] text-indigo-300 uppercase font-bold">Target Reached</span>
              <p className="text-lg font-black text-indigo-400">
                {allStrategiesOverview.filter(s => s.status === 'SELL').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Advisor Mode Switcher Tabs */}
      <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 max-w-lg shadow-inner">
        <button
          type="button"
          onClick={() => setActiveAdvisorMode('tactical')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeAdvisorMode === 'tactical'
              ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>F.R.I.D.A.Y. Tactical Brackets</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveAdvisorMode('wall_street')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeAdvisorMode === 'wall_street'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Wall Street Suite (10 Frameworks)</span>
        </button>
      </div>

      {activeAdvisorMode === 'wall_street' ? (
        <WallStreetResearchSuite />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="advisor-split-layout">
        
        {/* Left Side: Asset Selector list & Quick Overview HUD */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* Quick Selection search block */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-4 shadow-xl flex-1">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <span>Asset Selector Console</span>
            </h2>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticker or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/80 text-slate-900 dark:text-white rounded-2xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
              />
            </div>

            {/* Quick list selectors */}
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-1" id="advisor-ticker-scrollable-list">
              {filteredStocks.map((stock) => {
                const isSelected = stock.ticker === selectedTicker;
                const isUp = stock.change >= 0;
                return (
                  <button
                    key={stock.ticker}
                    onClick={() => setSelectedTicker(stock.ticker)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 border-indigo-500 text-white shadow-lg shadow-indigo-600/25 scale-[1.01]'
                        : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-indigo-50/50 dark:hover:bg-slate-800/80 hover:border-indigo-300 dark:hover:border-slate-700 hover:translate-x-0.5'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-300 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                          </span>
                        )}
                        <span className="font-mono font-extrabold text-xs tracking-tight">{stock.ticker}</span>
                      </div>
                      <p className={`text-[10px] truncate font-medium mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                        {stock.name}
                      </p>
                    </div>

                    <div className="text-right font-mono shrink-0">
                      <p className="text-xs font-bold">₹{stock.currentPrice.toFixed(2)}</p>
                      <p className={`text-[10px] font-semibold ${isSelected ? 'text-indigo-200 font-bold' : isUp ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {isUp ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </p>
                    </div>
                  </button>
                );
              })}

              {filteredStocks.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500">
                  No matching assets discovered.
                </div>
              )}
            </div>
          </div>

          {/* System Briefing Overview Box */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-5 space-y-3 shadow-xl">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span>Calibrator Protocol</span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              Calculations are computed instantly on load. Choose a strategy risk profile (Conservative, Moderate, Aggressive) to realign parameters dynamically.
            </p>
            <div className="space-y-2 text-[10px] text-slate-400 dark:text-slate-400 font-mono bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Model Engine:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold uppercase">Gemini 3.5 Flash</span>
              </div>
              <div className="flex justify-between">
                <span>Gateway Status:</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ONLINE (SECURE)
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Risk Mode:</span>
                <span className="text-slate-800 dark:text-slate-200 font-bold">Dynamic Bracket</span>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side: Active Strategic Advisor view for current selected ticker */}
        <div className="lg:col-span-8">
          {currentStock ? (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 shadow-xl space-y-6">
              
              {/* Active Asset Title Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-slate-900 dark:text-white">
                      {currentStock.ticker}
                    </span>
                    <span className="text-[10px] bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      ACTIVE STRATEGY
                    </span>
                  </div>
                  <h2 className="text-xs font-bold text-slate-400 dark:text-slate-400 mt-1">
                    {currentStock.name} — Live Analysis Mapping
                  </h2>
                </div>

                <div className="text-right font-mono shrink-0">
                  <p className="text-base font-extrabold text-slate-900 dark:text-white">₹{currentStock.currentPrice.toFixed(2)}</p>
                  <p className={`text-[11px] font-bold ${currentStock.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {currentStock.change >= 0 ? '+' : ''}{currentStock.changePercent.toFixed(2)}%
                  </p>
                </div>
              </div>

              {/* Core advisory tab */}
              <TradeAdvisorTab stock={currentStock} theme={theme} />

            </div>
          ) : (
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-12 text-center text-slate-500 dark:text-slate-400 shadow-xl">
              Please select a valid stock ticker from the console to initialize the trade advisory calculation.
            </div>
          )}
        </div>

      </div>

      {/* Bird's-Eye Grid Overview across all securities */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4" id="birds-eye-strategies-matrix">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Strategic Range Matrix (Bird&apos;s-Eye Grid)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              {gridRiskProfile === 'Intraday' 
                ? "Active Intraday 3% profit targets mapped across all watchlisted Indian equities"
                : `${gridRiskProfile}-risk parameters mapped across the complete exchange watch list`
              }
            </p>
          </div>

          {/* Grid Profile Selectors */}
          <div className="flex bg-slate-100/90 dark:bg-slate-800/90 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 self-start md:self-auto shadow-inner">
            {(['Conservative', 'Moderate', 'Aggressive', 'Intraday'] as const).map((profile) => (
              <button
                key={profile}
                onClick={() => setGridRiskProfile(profile)}
                className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all duration-200 cursor-pointer ${
                  gridRiskProfile === profile
                    ? profile === 'Conservative'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-[1.02]'
                      : profile === 'Moderate'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.02]'
                        : profile === 'Aggressive'
                          ? 'bg-rose-600 text-white shadow-md shadow-rose-600/25 scale-[1.02]'
                          : 'bg-amber-600 text-white shadow-md shadow-amber-600/25 scale-[1.02]'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {profile}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase font-black">
                <th className="py-3 px-3">Asset Ticker</th>
                <th className="py-3 px-3">Current Price</th>
                <th className="py-3 px-3 text-emerald-600 dark:text-emerald-400">Buy Zone</th>
                <th className="py-3 px-3 text-indigo-600 dark:text-indigo-400">Sell Target</th>
                <th className="py-3 px-3 text-rose-500 dark:text-rose-400">Stop Loss</th>
                <th className="py-3 px-3 text-center">HUD Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allStrategiesOverview.map((item) => (
                <tr key={item.ticker} className="hover:bg-indigo-50/40 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="py-3.5 px-3 font-mono font-black text-slate-900 dark:text-white">
                    <div className="flex items-center gap-1.5">
                      {item.status === 'BUY' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      )}
                      <span>{item.ticker}</span>
                    </div>
                    <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-sans font-normal mt-0.5">{item.name}</span>
                  </td>
                  <td className="py-3.5 px-3 font-mono font-bold">₹{item.price.toFixed(2)}</td>
                  <td className="py-3.5 px-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{item.buyRange}</td>
                  <td className="py-3.5 px-3 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">{item.sellRange}</td>
                  <td className="py-3.5 px-3 font-mono text-rose-500 dark:text-rose-400 font-semibold">{item.stopLoss}</td>
                  <td className="py-3.5 px-3 text-center">
                    {item.status === 'BUY' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Optimal Buy Zone
                      </span>
                    ) : item.status === 'SELL' ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-full shadow-xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        Target Met
                      </span>
                    ) : (
                      <span className="inline-block text-[9px] font-mono font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                        Consolidating
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

    </div>
  );
}
