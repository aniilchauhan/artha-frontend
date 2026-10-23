'use client';

import React, { useState } from 'react';
import { useStockContext } from '../context/StockContext';
import {
  INSTITUTIONAL_FRAMEWORKS,
  type InstitutionalFramework,
  type FrameworkContext,
} from '../lib/institutional-frameworks';
import {
  Sparkles,
  Copy,
  Check,
  Play,
  Loader2,
  Building2,
  Calculator,
  Shield,
  TrendingUp,
  Briefcase,
  BarChart2,
  GraduationCap,
  Trophy,
  Binary,
  Globe,
  Filter,
} from 'lucide-react';
import { canUseQuoteForExecution } from '../lib/market-quote';

export default function WallStreetResearchSuite() {
  const { stocks, selectedTicker, customApiKey, addToast } = useStockContext();
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<InstitutionalFramework['id']>('goldman-sachs-screener');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);

  const activeStock = stocks.find(s => s.ticker === selectedTicker) || stocks[0];
  const hasRecentProviderQuote = activeStock ? canUseQuoteForExecution(activeStock) : false;
  const activeFramework = INSTITUTIONAL_FRAMEWORKS[selectedFrameworkId];

  const frameworkContext: FrameworkContext = {
    ticker: activeStock?.ticker,
    companyName: activeStock?.name,
    currentPrice: hasRecentProviderQuote ? activeStock.currentPrice : undefined,
    sector: activeStock?.sector,
  };

  const compiledPrompt = activeFramework.generatePrompt(frameworkContext);

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(compiledPrompt);
      setCopied(true);
      addToast(`${activeFramework.institution} prompt copied to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      addToast('Failed to copy to clipboard', 'warning');
    }
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    setGeneratedReport(null);
    try {
      const response = await fetch('/api/institutional-frameworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameworkId: selectedFrameworkId,
          context: frameworkContext,
          overrideApiKey: customApiKey,
        }),
      });
      const data = await response.json();
      if (data.report) {
        setGeneratedReport(data.report);
        addToast(`${activeFramework.institution} report generated!`, 'success');
      } else {
        addToast(data.error || 'Failed to generate report', 'warning');
      }
    } catch (err) {
      addToast('Network error while generating research', 'warning');
    } finally {
      setLoading(false);
    }
  };

  const getFrameworkIcon = (id: InstitutionalFramework['id']) => {
    switch (id) {
      case 'goldman-sachs-screener':
        return <Building2 className="h-4 w-4" />;
      case 'morgan-stanley-dcf':
        return <Calculator className="h-4 w-4" />;
      case 'bridgewater-risk':
        return <Shield className="h-4 w-4" />;
      case 'jpmorgan-earnings':
        return <TrendingUp className="h-4 w-4" />;
      case 'blackrock-portfolio':
        return <Briefcase className="h-4 w-4" />;
      case 'citadel-technical':
        return <BarChart2 className="h-4 w-4" />;
      case 'harvard-dividend':
        return <GraduationCap className="h-4 w-4" />;
      case 'bain-advantage':
        return <Trophy className="h-4 w-4" />;
      case 'renaissance-patterns':
        return <Binary className="h-4 w-4" />;
      case 'mckinsey-macro':
        return <Globe className="h-4 w-4" />;
    }
  };

  const allCategories = [
    'All',
    'Valuation & Moat',
    'Quant & Technical',
    'Risk & Macro',
    'Portfolio & Yield',
  ];

  const filteredFrameworkIds = (Object.keys(INSTITUTIONAL_FRAMEWORKS) as Array<InstitutionalFramework['id']>).filter((id) => {
    if (selectedCategoryFilter === 'All') return true;
    if (selectedCategoryFilter === 'Valuation & Moat') {
      return id === 'goldman-sachs-screener' || id === 'morgan-stanley-dcf' || id === 'bain-advantage';
    }
    if (selectedCategoryFilter === 'Quant & Technical') {
      return id === 'citadel-technical' || id === 'renaissance-patterns';
    }
    if (selectedCategoryFilter === 'Risk & Macro') {
      return id === 'bridgewater-risk' || id === 'mckinsey-macro';
    }
    if (selectedCategoryFilter === 'Portfolio & Yield') {
      return id === 'blackrock-portfolio' || id === 'harvard-dividend' || id === 'jpmorgan-earnings';
    }
    return true;
  });

  return (
    <div className="space-y-6" id="wall-street-research-suite">
      {/* Header Banner */}
      <div className="rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-3 py-1 text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-widest">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              Research framework templates
            </div>
            <h1 className="mt-3 text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Guided Equity and Portfolio Analysis
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-indigo-200/90 max-w-2xl leading-relaxed">
              Structured prompts inspired by common research disciplines. Axion is not affiliated with the named institutions, and outputs are not their models. Prices are included only when a recent provider quote is available.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <span className="rounded-xl border border-indigo-500/30 bg-slate-900/60 px-3 py-1.5 font-mono text-xs font-bold text-indigo-300">
              {activeStock ? `Active focus: ${activeStock.ticker} · ${hasRecentProviderQuote ? `₹${activeStock.currentPrice.toFixed(2)} provider quote` : 'price unavailable'}` : 'No stock selected'}
            </span>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-mono font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mr-1">
          <Filter className="h-3.5 w-3.5 text-indigo-500" />
          Filter:
        </span>
        {allCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedCategoryFilter === cat
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                : 'bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Framework Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {filteredFrameworkIds.map((id) => {
          const item = INSTITUTIONAL_FRAMEWORKS[id];
          const isSelected = selectedFrameworkId === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSelectedFrameworkId(id);
                setGeneratedReport(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 scale-[1.02]'
                  : 'border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-slate-800 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`p-2 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400'}`}>
                  {getFrameworkIcon(id)}
                </span>
                <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                  {item.category}
                </span>
              </div>
              <div>
                <h2 className="text-xs font-black leading-snug">{item.institution}</h2>
                <p className={`text-[11px] mt-0.5 line-clamp-1 ${isSelected ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {item.title}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Framework Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Prompt & Execution Controls */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                  {activeFramework.institution} Framework
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {activeFramework.title}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  title="Copy ready-to-run prompt for Claude, ChatGPT or Gemini"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? 'Copied!' : 'Copy Prompt'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  <span>Run AI Model</span>
                </button>
              </div>
            </div>

            {/* Persona Definition */}
            <div className="rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-4">
              <span className="text-[10px] font-mono font-bold uppercase text-indigo-800 dark:text-indigo-300">
                Institutional Role Persona
              </span>
              <p className="mt-1 text-xs text-indigo-950 dark:text-indigo-200 font-medium leading-relaxed">
                &ldquo;{activeFramework.roleDescription}&rdquo;
              </p>
            </div>

            {/* Key Deliverables Checklist */}
            <div>
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">
                Audit Deliverables & Output Specifications
              </span>
              <ul className="mt-2.5 grid gap-2 sm:grid-cols-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                {activeFramework.keyDeliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Raw Prompt Code Block */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400 dark:text-slate-500">
                  Live Compiled Prompt (With Real Data Injected)
                </span>
              </div>
              <pre className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 font-mono text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed shadow-inner">
                {compiledPrompt}
              </pre>
            </div>
          </div>
        </div>

        {/* Right Col: Generated Memo / Executive Synthesis */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-mono font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                <span>Executive Research Synthesis</span>
              </h4>
              {generatedReport && (
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                  Report Ready
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400">
                <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-xs font-mono font-semibold">
                  Synthesizing {activeFramework.institution} analysis memo...
                </p>
              </div>
            ) : generatedReport ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed overflow-y-auto max-h-[500px] pr-2">
                <div className="whitespace-pre-wrap font-sans text-slate-800 dark:text-slate-200 space-y-2">
                  {generatedReport}
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-3">
                <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ready to Run {activeFramework.title}
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Click <strong>&ldquo;Run AI Model&rdquo;</strong> to generate the institutional briefing inside Axion, or <strong>&ldquo;Copy Prompt&rdquo;</strong> to paste directly into Claude 3.5 Sonnet / ChatGPT.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
