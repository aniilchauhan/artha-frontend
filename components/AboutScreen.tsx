'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  LineChart,
  Cpu,
  Sparkles,
  BellRing,
  Terminal,
  Layers,
  Activity,
  Database,
  TrendingUp,
  Lock,
  Scale,
  Server,
  Zap,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  BarChart3,
  SlidersHorizontal,
  Rocket,
  Target,
  FileCheck,
  ChevronRight,
  Info,
  Radio,
  Workflow,
  Glasses,
  Play,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkle,
  BookOpen,
  Code2,
  Binary,
  Compass,
  FileCode,
  Copy,
  ExternalLink,
  Flame,
  Award
} from 'lucide-react';

interface TabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

export default function AboutScreen() {
  const [activeTab, setActiveTab] = useState<'overview' | 'ingestion' | 'quant' | 'frameworks' | 'ai' | 'lifecycle' | 'governance' | 'api-reference'>('overview');

  // Live IST Clock
  const [istTime, setIstTime] = useState<string>('');
  const [currentSessionPhase, setCurrentSessionPhase] = useState<string>('MARKET_HOURS');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const istStr = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
      setIstTime(istStr);

      const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const hours = istDate.getHours();
      const minutes = istDate.getMinutes();
      const day = istDate.getDay();
      const timeNum = hours * 100 + minutes;

      if (day === 0 || day === 6) {
        setCurrentSessionPhase('WEEKEND_OFF_HOURS');
      } else if (timeNum >= 910 && timeNum < 915) {
        setCurrentSessionPhase('PRE_MARKET_WINDOW');
      } else if (timeNum >= 915 && timeNum <= 1530) {
        setCurrentSessionPhase('MARKET_HOURS');
      } else if (timeNum > 1530 && timeNum <= 1600) {
        setCurrentSessionPhase('POST_MARKET_RECONCILIATION');
      } else if (timeNum >= 1815 && timeNum <= 1900) {
        setCurrentSessionPhase('EOD_BHAVCOPY_INGESTION');
      } else {
        setCurrentSessionPhase('OFF_HOURS');
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // --- Interactive Pipeline Step Explorer (Tab 1) ---
  const [selectedPipelineStep, setSelectedPipelineStep] = useState<number>(0);
  const pipelineSteps = [
    {
      id: 'step1',
      num: '01',
      name: 'Exchange Ingestion',
      sub: 'NSE Bhavcopy & FII OI',
      icon: <Database className="h-4 w-4 text-indigo-400" />,
      code: `// lib/nse-smart-money.ts - Live EOD Bhavcopy Ingest\nconst url = "https://nsearchives.nseindia.com/products/content/sec_bhavdata_full_05102026.csv";\nconst records = await streamParseCSV(url);\nconst rel = records.find(r => r.SYMBOL === 'RELIANCE');\nconsole.log({ deliveryRatio: rel.DELIV_PERC, status: 'ACCUMULATION_CONFIRMED' });\n// Output: { deliveryRatio: 62.29%, status: 'ACCUMULATION_CONFIRMED' }`,
      highlight: 'Streams 2,400+ NSE equity records directly into indexed local cache in <150ms.'
    },
    {
      id: 'step2',
      num: '02',
      name: 'Microstructure Filter',
      sub: 'Circuit Headroom & Volume',
      icon: <Lock className="h-4 w-4 text-purple-400" />,
      code: `// lib/small-cap-scoring.ts - Bidirectional Circuit Guard\nconst upperHeadroom = ((upperCircuit - ltp) / ltp) * 100;\nconst lowerHeadroom = ((ltp - lowerCircuit) / ltp) * 100;\nif (lowerHeadroom < 1.0) {\n  return { approved: false, reason: 'LIQUIDITY_TRAP_LOWER_FREEZE_RISK' };\n}\nreturn { approved: true, headroom: upperHeadroom.toFixed(1) + '%' };`,
      highlight: 'Vetoes trades near lower freeze to eliminate un-exit-able pump-and-dump traps.'
    },
    {
      id: 'step3',
      num: '03',
      name: 'Quant Solvency',
      sub: 'Piotroski, Z-Score, DuPont',
      icon: <Scale className="h-4 w-4 text-amber-400" />,
      code: `// stock-ai/src/multibagger_scanner.py\npiotroski_f = score_profitability(df) + score_leverage(df) + score_efficiency(df)\naltman_z = 1.2*X1 + 1.4*X2 + 3.3*X3 + 0.6*X4 + 0.999*X5\nif piotroski_f >= 7 and altman_z > 2.99:\n  candidate.status = "PRISTINE_SOLVENT_COMPOUNDER"`,
      highlight: 'Dissects balance sheets across 9 accounting dimensions before algorithmic entry.'
    },
    {
      id: 'step4',
      num: '04',
      name: 'AI Advisory',
      sub: 'Gemini 2.5 Flash + Headroom',
      icon: <Sparkles className="h-4 w-4 text-emerald-400" />,
      code: `// app/api/gemini/route.ts -> Headroom Proxy :8787\nconst response = await ai.chat({\n  model: 'gemini-2.5-flash',\n  prompt: buildMacroHorizonContext(ticker, history, deliveryRatio),\n  proxy: 'http://127.0.0.1:8787/v1' // Local ONNX kompress\n});\n// Token reduction: 18,400 -> 5,210 tokens (-71.6% latency savings)`,
      highlight: 'Evaluates multi-year market structure with 1,000,000+ token context window.'
    },
    {
      id: 'step5',
      num: '05',
      name: 'Radar Paper Review',
      sub: 'Conditional plan · worker-observed sessions',
      icon: <FileCheck className="h-4 w-4 text-blue-400" />,
      code: `// Research flow: stored Radar signal → conditional paper plan\nconst result = await proposeResearchPaper(owner, signalId, reviewSessions);\n// A separate worker evaluates dated OHLC sessions and records events.\n// Simulated ledger values are research records, not broker fills.`,
      highlight: 'Plans require a stored, recent Radar signal. Observed session data can suggest fills, but daily OHLC cannot prove real execution.'
    },
  ];

  // --- Interactive FII Smart Money Simulator (Tab 2) ---
  const [fiiLongPercent, setFiiLongPercent] = useState<number>(12);
  const [sampleDeliveryRatio, setSampleDeliveryRatio] = useState<number>(64);

  const getFiiRegime = (val: number) => {
    if (val < 15) {
      return {
        label: '🚨 Extreme Short-Squeeze Zone',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        desc: 'FIIs are heavily net short on index futures. Historical asymmetry heavily favors an aggressive short-covering explosive rally.',
      };
    } else if (val < 40) {
      return {
        label: '⚠️ Cautious Accumulation',
        color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
        desc: 'FII positioning is below long-term median. Selective institutional bottom-fishing active in high delivery large-caps.',
      };
    } else if (val <= 65) {
      return {
        label: '⚖️ Balanced Two-Sided Market',
        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        desc: 'Institutional positioning is neutral. Stock-specific momentum drives alpha rather than index-level directional squeezes.',
      };
    } else {
      return {
        label: '⚠️ Overbought Distribution Risk',
        color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        desc: 'FII longs are saturated (>65%). Smart money historically uses this optimism to distribute inventory to retail clients.',
      };
    }
  };

  const fiiRegime = getFiiRegime(fiiLongPercent);

  // --- Interactive Circuit Headroom Simulator (Tab 3) ---
  const [simLtp, setSimLtp] = useState<number>(245);
  const [simUpperCircuit, setSimUpperCircuit] = useState<number>(257.25);
  const [simLowerCircuit, setSimLowerCircuit] = useState<number>(232.75);

  const simUpperHeadroom = Math.max(0, ((simUpperCircuit - simLtp) / simLtp) * 100);
  const simLowerHeadroom = Math.max(0, ((simLtp - simLowerCircuit) / simLtp) * 100);
  const isLowerTrap = simLowerHeadroom < 1.5;
  const isUpperLocked = simUpperHeadroom < 0.5;

  // --- Interactive Piotroski Checklist (Tab 3) ---
  const [piotroskiCriteria, setPiotroskiCriteria] = useState<boolean[]>([
    true, true, true, false, true, true, true, false, true
  ]);

  const piotroskiLabels = [
    'Positive Net Income (ROA > 0)',
    'Positive Operating Cash Flow (CFO > 0)',
    'Higher Return on Assets (ΔROA > 0)',
    'Quality of Earnings (CFO > Net Income)',
    'Decreased Long-Term Debt / Equity Ratio',
    'Higher Current Ratio (ΔLiquidity > 0)',
    'Zero Equity Dilution (No New Shares Issued)',
    'Higher Gross Margin (ΔGross Margin > 0)',
    'Higher Asset Turnover Ratio (ΔSales/Assets > 0)'
  ];

  const currentFScore = piotroskiCriteria.filter(Boolean).length;

  // --- Interactive Master Framework Selector (Tab 4) ---
  const [selectedFramework, setSelectedFramework] = useState<'minervini' | 'canslim' | 'weinstein' | 'darvas' | 'ryan'>('minervini');

  const frameworksData = {
    minervini: {
      name: "Mark Minervini — Trend Template & VCP",
      author: "US Investing Champion (1997, 2021)",
      ruleSummary: "Identifies superperformance stocks undergoing progressive Volatility Contraction Patterns (VCP) within a verified Stage 2 uptrend.",
      criteria: [
        "Current price is above both the 150-day and 200-day moving averages.",
        "The 150-day moving average is above the 200-day moving average.",
        "The 200-day moving average is in a verified upward slope for at least 1 month.",
        "The 50-day moving average is above both the 150-day and 200-day moving averages.",
        "Current price is trading within 25% of its 52-week high and at least 30% above 52-week low.",
        "Volatility Contraction: Successive consolidations contract from 20% -> 10% -> 3% with volume dry-up before breakout."
      ],
      codeSnippet: `// lib/institutional-frameworks.ts - Minervini Trend Template\nexport function checkMinerviniTemplate(candles) {\n  const sma50 = calculateSMA(candles, 50);\n  const sma150 = calculateSMA(candles, 150);\n  const sma200 = calculateSMA(candles, 200);\n  const ltp = candles[candles.length - 1].close;\n  const isStage2 = ltp > sma150 && sma150 > sma200 && isTrendingUp(sma200, 22);\n  const vcpPassed = detectVolumeDryUp(candles, 10);\n  return { approved: isStage2 && vcpPassed, pattern: 'VCP_PIVOT_READY' };\n}`
    },
    canslim: {
      name: "William O'Neil — CANSLIM Growth Engine",
      author: "Founder of Investor's Business Daily (IBD)",
      ruleSummary: "Combines explosive fundamental EPS acceleration with institutional sponsorship and high relative strength breakouts.",
      criteria: [
        "C = Current Quarterly EPS up 25%+ vs same quarter last year.",
        "A = Annual Earnings Growth compound annual rate > 25% over 3 years.",
        "N = New products, management, or new industry highs.",
        "S = Supply & Demand: low float, heavy institutional volume on up days.",
        "L = Leader or Laggard: Relative Strength (RS) rating > 80.",
        "I = Institutional Sponsorship: Increasing mutual fund / FII holdings.",
        "M = Market Direction: Trading in sync with Confirmed Uptrend."
      ],
      codeSnippet: `// lib/framework-evaluators.ts - CANSLIM Scorer\nexport function evaluateCANSLIM(stock, fundamentals) {\n  const epsGrowth = fundamentals.quarterlyEpsGrowth;\n  const rsRating = stock.relativeStrength80D;\n  const fiiAccumulation = stock.fiiStakeDelta > 0;\n  const score = (epsGrowth > 25 ? 2 : 0) + (rsRating > 80 ? 2 : 0) + (fiiAccumulation ? 2 : 0);\n  return { score, isLeader: score >= 5 };\n}`
    },
    weinstein: {
      name: "Stan Weinstein — 4-Stage Market Analysis",
      author: "Secrets for Profiting in Bull and Bear Markets",
      ruleSummary: "Classifies every equity into 4 distinct macro stages. Enforces buying ONLY at Stage 2 breakout from a Stage 1 base.",
      criteria: [
        "Stage 1 (Basing): Price moves sideways around a flattening 30-week (150-day) MA.",
        "Stage 2 (Advancing Breakout): Price penetrates resistance on 2x+ volume expansion.",
        "Stage 3 (Top Distribution): Upward momentum stalls, volatility widens, MA flattens.",
        "Stage 4 (Declining Bear Phase): Price drops below downward-sloping 30-week MA. Strictly forbidden for longs."
      ],
      codeSnippet: `// lib/book-master-engine.ts - Weinstein Stage Classifier\nexport function classifyWeinsteinStage(candles) {\n  const ma30w = calculateSMA(candles, 150);\n  const slope = getSlope(ma30w, 20);\n  const volumeRatio = currentVol / avgVol20;\n  if (ltp > ma30w && slope > 0.005 && volumeRatio > 2.0) {\n    return 'STAGE_2_EXPLOSIVE_BREAKOUT';\n  }\n  return 'STAGE_NEUTRAL_OR_DISTRIBUTION';\n}`
    },
    darvas: {
      name: "Nicolas Darvas — Box Theory Momentum",
      author: "How I Made $2,000,000 in the Stock Market",
      ruleSummary: "Pyramids into stocks creating fresh all-time-high consolidation boxes and cuts losers immediately upon box floor breach.",
      criteria: [
        "Stock creates a new 52-week high, establishing the Box Ceiling.",
        "Over the next 3 consecutive days, price fails to pierce that ceiling.",
        "The reaction low of the pullback sets the Box Floor.",
        "Trigger: A high-volume breakout through the Box Ceiling initiates buy entry.",
        "Stop-Loss: Set exactly 1 tick below the Box Floor with zero hesitation."
      ],
      codeSnippet: `// lib/institutional-frameworks.ts - Darvas Box Engine\nexport function computeDarvasBox(candles) {\n  const high = Math.max(...candles.slice(-10).map(c => c.high));\n  const low = Math.min(...candles.slice(-10).map(c => c.low));\n  const isBreakout = candles[candles.length - 1].close > high;\n  return { ceiling: high, floor: low, breakoutTrigger: isBreakout };\n}`
    },
    ryan: {
      name: "David Ryan — Triple-Digit EPS & Pocket Pivots",
      author: "3-Time US Investing Champion (1985, 1986, 1987)",
      ruleSummary: "Focuses on explosive small/mid-caps with accelerating earnings and low float pocket-pivot accumulation signatures.",
      criteria: [
        "Consecutive accelerating earnings: +30%, +50%, +100% sequential EPS growth.",
        "Pocket Pivot: Volume on up day exceeds the largest down-volume day in the prior 10 days while in base.",
        "High relative strength breakout occurring out of proper bases (cup, flat base, high-tight flag).",
        "Tight intraday closes indicating institutional absorption."
      ],
      codeSnippet: `// lib/institutional-frameworks.ts - Pocket Pivot Detector\nexport function detectPocketPivot(candles) {\n  const maxDownVol10D = Math.max(...candles.slice(-10).filter(c => c.close < c.open).map(c => c.volume));\n  const today = candles[candles.length - 1];\n  const isPocketPivot = today.close > today.open && today.volume > maxDownVol10D;\n  return { isPocketPivot, conviction: isPocketPivot ? 'INSTITUTIONAL_ABSORPTION' : 'NORMAL' };\n}`
    }
  };

  const currentFrameworkData = frameworksData[selectedFramework];

  // --- Interactive Headroom Token Savings Simulator (Tab 5) ---
  const [rawTokenCount, setRawTokenCount] = useState<number>(18500);
  const compressedTokenCount = Math.round(rawTokenCount * 0.285);
  const tokenSavingsPercent = (((rawTokenCount - compressedTokenCount) / rawTokenCount) * 100).toFixed(1);
  const latencyReduction = Math.round((1 - compressedTokenCount / rawTokenCount) * 1100);

  // --- Interactive Slippage & Fee Calculator (Tab 7) ---
  const [tradeCapital, setTradeCapital] = useState<number>(100000);
  const sttFee = tradeCapital * 0.001; // 0.1% on delivery
  const exchangeTurnover = tradeCapital * 0.0000345;
  const sebiCharges = tradeCapital * 0.000001;
  const brokerCommission = 20; // standard discount broker flat fee
  const spreadSlippage = tradeCapital * 0.0005; // 0.05% bid-ask spread
  const totalFriction = sttFee + exchangeTurnover + sebiCharges + brokerCommission + spreadSlippage;
  const frictionPercent = ((totalFriction / tradeCapital) * 100).toFixed(3);

  // --- Interactive API Hub (Tab 8) ---
  const [selectedApiEndpoint, setSelectedApiEndpoint] = useState<number>(0);
  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/nse/smart-money',
      name: 'NSE Smart Money & Bhavcopy API',
      params: '?ticker=RELIANCE (Optional)',
      desc: 'Returns daily Demat delivery accumulation percentages, volume expansion multipliers, and FII/DII participant open interest net long/short ratios.',
      response: `{\n  "asOf": "2026-10-05",\n  "marketRegime": "SHORT_SQUEEZE_ASYMMETRY",\n  "fiiLongRatio": 8.07,\n  "fiiNetContracts": -18420,\n  "ticker": "RELIANCE",\n  "deliveryVolume": 4821040,\n  "tradedVolume": 7739500,\n  "deliveryRatio": 62.29,\n  "status": "INSTITUTIONAL_ACCUMULATION"\n}`
    },
    {
      method: 'GET',
      path: '/api/small-cap-predictions',
      name: 'Small-Cap 2% Momentum Radar API',
      params: '?exchange=NSE&offset=0&limit=24',
      desc: 'Retrieves high-probability +2% intraday/swing setups with built-in bidirectional circuit lock guards, ATR normalization, and volume expansion filters.',
      response: `{\n  "total": 48,\n  "candidates": [\n    {\n      "symbol": "TATAELXSI",\n      "ltp": 7240.50,\n      "upperHeadroom": 8.4,\n      "lowerHeadroom": 11.6,\n      "breakoutScore": 92,\n      "deliverySurge": 2.14,\n      "approved": true\n    }\n  ]\n}`
    },
    {
      method: 'GET',
      path: '/api/forward-picks',
      name: 'Forward Paper Cohorts API',
      params: '?horizon=next',
      desc: 'Returns immutable pre-market forward cohorts recorded at 09:10 IST. Zero hindsight bias guaranteed.',
      response: `{\n  "recordedAt": "2026-10-05T09:12:00.000Z",\n  "cohort": "2026-10-05-PRE-MARKET",\n  "entries": [\n    {\n      "ticker": "INFY",\n      "entryTrigger": 1845.00,\n      "target1": 1882.00,\n      "stopLoss": 1826.00,\n      "riskReward": 2.05\n    }\n  ]\n}`
    },
    {
      method: 'GET',
      path: '/api/greeks',
      name: 'Black-Scholes Options Greeks API',
      params: '?symbol=NIFTY',
      desc: 'Real-time option chain analytics: Delta, Gamma, Theta, Vega, Implied Volatility skew, Put-Call Ratio (PCR), and Max Pain point.',
      response: `{\n  "underlying": "NIFTY",\n  "spot": 24850.25,\n  "maxPain": 24800,\n  "pcr": 1.18,\n  "atmStrike": 24850,\n  "iv": 13.45,\n  "delta": 0.512,\n  "gamma": 0.0024,\n  "theta": -14.20\n}`
    },
    {
      method: 'POST',
      path: '/api/gemini',
      name: 'Multi-Horizon AI Trade Advisory',
      params: 'Body: { ticker: "RELIANCE", horizon: "swing" }',
      desc: 'Synthesizes technical, fundamental, delivery, and institutional derivatives positioning into actionable trade advisory via Headroom proxy.',
      response: `{\n  "ticker": "RELIANCE",\n  "horizon": "swing",\n  "verdict": "STRONG_BUY_ON_DIP",\n  "entryZone": [2720, 2740],\n  "targetTier1": 2850,\n  "targetTier2": 2980,\n  "stopLoss": 2680,\n  "riskReward": 2.67,\n  "reasoning": "Demat delivery accumulation at 62.29% combined with FII short-squeeze asymmetry provides favorable swing support."\n}`
    }
  ];

  const tabs: TabItem[] = [
    { id: 'overview', label: 'Architecture & Pipeline', icon: <Layers className="h-4 w-4" /> },
    { id: 'ingestion', label: 'NSE Data & Smart Money', icon: <Database className="h-4 w-4" />, badge: 'LIVE DATA' },
    { id: 'quant', label: 'Microstructure & Solvency', icon: <Activity className="h-4 w-4" /> },
    { id: 'frameworks', label: 'Master Frameworks Lab', icon: <BookOpen className="h-4 w-4" />, badge: 'PRO STRATS' },
    { id: 'ai', label: 'Gemini AI & Headroom', icon: <Sparkles className="h-4 w-4" />, badge: '1M CTX' },
    { id: 'lifecycle', label: 'Market Lifecycle', icon: <Clock className="h-4 w-4" /> },
    { id: 'governance', label: 'Risk & Friction Sandbox', icon: <ShieldCheck className="h-4 w-4" /> },
    { id: 'api-reference', label: 'Quant & Developer API', icon: <Code2 className="h-4 w-4" />, badge: 'REST' },
  ];

  const quickStats = [
    { label: 'Markets Covered', value: 'NSE & BSE', detail: 'Cash Equities & F&O' },
    { label: 'AI Reasoning Engine', value: 'Gemini 2.5 Flash', detail: '1M+ Context Window' },
    { label: 'Context Proxy', value: 'Headroom AI :8787', detail: 'Local ONNX Cache & Dedupe' },
    { label: 'Exchange Ingestion', value: 'Bhavcopy + FII OI', detail: 'Official NSE Archives' },
    { label: 'Test Coverage', value: '100% Green (719/719)', detail: 'Vitest, Node & Python' },
    { label: 'Paper Model', value: 'Zero-Hindsight', detail: 'Real Slippage & STT' },
  ];

  const modules = [
    {
      title: 'Live Trade Decisions',
      path: '/live-decisions',
      badge: 'REAL-TIME',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: <Zap className="h-4 w-4 text-emerald-500" />,
      desc: 'Actionable multi-horizon buy/sell signals with quantified entry triggers, risk-reward ratios, stop-losses, and profit targets.'
    },
    {
      title: 'NSE Smart Money Radar',
      path: '/live-decisions',
      badge: 'INSTITUTIONAL',
      badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      icon: <Database className="h-4 w-4 text-indigo-500" />,
      desc: 'Real-time FII Index Long/Short sentiment gauge and Demat Delivery % accumulation rankings directly from official Bhavcopy files.'
    },
    {
      title: 'Small-Cap 2% Momentum',
      path: '/small-cap-predictions',
      badge: 'ALPHA',
      badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
      icon: <TrendingUp className="h-4 w-4 text-amber-500" />,
      desc: 'High-probability +2% intraday/swing setups with built-in bidirectional circuit-lock filters and delivery volume expansion guards.'
    },
    {
      title: 'Strategy Lab & Backtesting',
      path: '/frameworks',
      badge: 'STRATEGY',
      badgeColor: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
      icon: <BookOpen className="h-4 w-4 text-pink-500" />,
      desc: 'Minervini VCP, CANSLIM, Weinstein Stage Analysis, and Darvas Box models backtested on NSE historical daily candles.'
    },
    {
      title: 'Quantitative Suite & Multibaggers',
      path: '/multibagger',
      badge: 'FUNDAMENTAL',
      badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20',
      icon: <Rocket className="h-4 w-4 text-fuchsia-500" />,
      desc: 'Piotroski 9-point F-Score, Altman Z-Score distress metrics, DuPont ROE decomposition, and Post-IPO anchor lock-in momentum.'
    },
    {
      title: 'Conservative Paper Cohorts',
      path: '/paper-predictions',
      badge: 'AUDITED',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: <Target className="h-4 w-4 text-blue-500" />,
      desc: 'Forward paper execution simulated under strict real-world market rules: 09:10 pre-market snapshots and 15:31 settlement reconciliation.'
    },
    {
      title: 'Options & Greeks Monitor',
      path: '/greeks',
      badge: 'DERIVATIVES',
      badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
      icon: <SlidersHorizontal className="h-4 w-4 text-teal-500" />,
      desc: 'Black-Scholes Delta (Δ), Gamma (Γ), Theta (Θ), Vega (ν), Put-Call Ratio (PCR), and Max Pain analysis for NSE Nifty & BankNifty.'
    },
  ];

  return (
    <div id="about-screen-container" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-6xl mx-auto pb-20">
      
      {/* Hero Banner with Animated Ambient Glow */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 border border-indigo-500/30 p-6 sm:p-10 shadow-2xl text-white"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-indigo-500 blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-purple-500 blur-3xl pointer-events-none"
        />

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 backdrop-blur-md">
              <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
              Artha AI Terminal v0.1.0
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              Production Ready
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 backdrop-blur-md">
              <Sparkle className="h-3 w-3 text-purple-300" />
              Gemini 2.5 Flash + Headroom
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-slate-800/80 text-amber-300 border border-amber-500/30 backdrop-blur-md">
              <Clock className="h-3 w-3 text-amber-400" />
              {istTime || '15:30:00'} IST
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
            Autonomous Quantitative Intelligence & Microstructure Engine
          </h1>
          
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Artha AI is an institutional-grade algorithmic equity analytics and trade decision platform built specifically for Indian Equities (NSE & BSE). It bridges official exchange Bhavcopy Demat delivery volume, institutional FII/DII participant open interest, master trading frameworks (Minervini VCP, CANSLIM, Weinstein), multi-bagger quantitative scoring, and 1M-token multi-horizon AI advisory into a unified terminal.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/live-decisions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="h-4 w-4" />
              Launch Live Decisions
            </Link>
            <Link
              href="/frameworks"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pink-600/80 hover:bg-pink-500/80 text-white font-semibold text-xs transition-all shadow-lg shadow-pink-600/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <BookOpen className="h-4 w-4" />
              Explore Strategy Lab
            </Link>
            <Link
              href="/paper-predictions"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold text-xs border border-slate-700 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <FileCheck className="h-4 w-4 text-emerald-400" />
              View Paper Reconciler
            </Link>
            <a
              href="http://127.0.0.1:8787/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-purple-300 font-semibold text-xs border border-purple-800/50 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Cpu className="h-4 w-4" />
              Headroom Proxy :8787
              <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </a>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Grid with Staggered Hover */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {quickStats.map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -3, scale: 1.02 }}
            transition={{ duration: 0.2 }}
            className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-colors"
          >
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">{item.label}</span>
            <div className="my-1">
              <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight block">{item.value}</span>
            </div>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium truncate block">{item.detail}</span>
          </motion.div>
        ))}
      </div>

      {/* Animated Navigation Tabs Bar */}
      <div className="relative flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-indigo-600 rounded-xl shadow-md shadow-indigo-600/25"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                {tab.icon}
                {tab.label}
                {tab.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels with AnimatePresence */}
      <AnimatePresence mode="wait">
        
        {/* Tab 1: Architecture & Interactive Pipeline Simulator */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Tech Stack Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <motion.div
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Server className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Next.js 15 Web Terminal</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  App Router architecture built with React 19, Tailwind CSS, Lucide icons, and Recharts. Features dynamic sub-millisecond client state management, responsive dark/light theme tokens, and streaming API endpoints.
                </p>
                <div className="pt-2 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                  Next.js 15.5 • React 19 • App Router
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Workflow className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Shared TypeScript Core</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Unified algorithmic types, technical indicators, and scoring models in <code>packages/core</code>, shared seamlessly across the Next.js Web terminal, Expo React Native mobile client, and offline automation workers.
                </p>
                <div className="pt-2 text-[11px] font-mono text-purple-600 dark:text-purple-400">
                  packages/core • Expo React Native • TS 5.x
                </div>
              </motion.div>

              <motion.div
                whileHover={{ y: -4 }}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-3"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Python 3.12 ML Quant Core</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Dedicated quantitative scanning engine located in <code>stock-ai/</code> utilizing Pandas, NumPy, and SciPy for deep multibagger screening, balance sheet DuPont decomposition, and Altman Z-score solvency analysis.
                </p>
                <div className="pt-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                  Python 3.12 • Pandas • NumPy • SciPy
                </div>
              </motion.div>
            </div>

            {/* Interactive Pipeline Step Inspector */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                    Interactive Pipeline Simulator & Code Inspector
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full self-start sm:self-auto">
                  Click any step to inspect execution logic
                </span>
              </div>

              {/* Step Navigation Pill Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {pipelineSteps.map((step, idx) => {
                  const isSelected = selectedPipelineStep === idx;
                  return (
                    <button
                      key={step.id}
                      onClick={() => setSelectedPipelineStep(idx)}
                      className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 shadow-md shadow-indigo-500/20'
                          : 'bg-slate-800/60 border-slate-700/60 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono font-bold ${isSelected ? 'text-indigo-400' : 'text-slate-400'}`}>
                          STEP {step.num}
                        </span>
                        {step.icon}
                      </div>
                      <span className="text-xs font-bold block text-white truncate">{step.name}</span>
                      <span className="text-[10px] text-slate-400 block truncate">{step.sub}</span>
                    </button>
                  );
                })}
              </div>

              {/* Code & Logic Output Display */}
              <motion.div
                key={selectedPipelineStep}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs space-y-3"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                    <span className="ml-2 text-indigo-400 font-bold">{pipelineSteps[selectedPipelineStep].name} Engine</span>
                  </div>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Live Executable
                  </span>
                </div>
                
                <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed text-[11px]">
                  {pipelineSteps[selectedPipelineStep].code}
                </pre>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-indigo-300 font-sans">
                    💡 <strong>Insight:</strong> {pipelineSteps[selectedPipelineStep].highlight}
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">Node v20.x • TS 5.x</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Tab 2: NSE Ingestion & Interactive Smart Money Simulator */}
        {activeTab === 'ingestion' && (
          <motion.div
            key="ingestion"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Interactive FII Sentiment Simulator */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    <h3 className="text-base font-bold text-white">Interactive Institutional Smart Money Regime Simulator</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    Drag the slider to test how the FII Participant Index Long Ratio triggers institutional regime alerts.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border self-start sm:self-auto ${fiiRegime.color}`}>
                  {fiiRegime.label}
                </span>
              </div>

              {/* Slider & Meter */}
              <div className="space-y-3 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">FII Net Index Long Position:</span>
                  <span className="font-mono font-bold text-indigo-400 text-sm">{fiiLongPercent}%</span>
                </div>
                
                <input
                  type="range"
                  min="5"
                  max="85"
                  value={fiiLongPercent}
                  onChange={(e) => setFiiLongPercent(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>5% (Deep Squeeze Zone)</span>
                  <span>40% (Median)</span>
                  <span>85% (Extreme Bullish Saturation)</span>
                </div>

                {/* Regime Explanation */}
                <motion.div
                  key={fiiRegime.label}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed"
                >
                  <strong className="text-indigo-400 font-mono">Regime Logic:</strong> {fiiRegime.desc}
                </motion.div>
              </div>

              {/* Delivery % Accumulation Comparator */}
              <div className="space-y-3 bg-slate-950/80 p-5 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-medium">Demat Delivery Volume % (Bhavcopy):</span>
                  <span className={`font-mono font-bold text-sm ${sampleDeliveryRatio >= 50 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {sampleDeliveryRatio}% {sampleDeliveryRatio >= 50 ? '(INSTITUTIONAL ACCUMULATION)' : '(INTRADAY CHURNING)'}
                  </span>
                </div>

                <input
                  type="range"
                  min="10"
                  max="90"
                  value={sampleDeliveryRatio}
                  onChange={(e) => setSampleDeliveryRatio(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />

                <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                  <div className={`p-3 rounded-xl border ${sampleDeliveryRatio >= 50 ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    <span className="font-bold block mb-1">Demat Transfer &gt; 50%</span>
                    <span className="text-[11px] leading-relaxed">Genuine hand-off into long-term institutional custody. High-probability swing setup.</span>
                  </div>
                  <div className={`p-3 rounded-xl border ${sampleDeliveryRatio < 50 ? 'bg-amber-950/30 border-amber-500/40 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-500'}`}>
                    <span className="font-bold block mb-1">Demat Transfer &lt; 50%</span>
                    <span className="text-[11px] leading-relaxed">High volume is dominated by day traders squaring off before 15:30 IST. Elevated trap risk.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Database className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Official NSE Bhavcopy Delivery Ingestion</h3>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">sec_bhavdata_full_DDMMYYYY.csv</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Automated ingestion of the official end-of-day security bhavdata published directly by the National Stock Exchange of India. Unlike simple volume bars, delivery volume represents actual Demat account transfers—the hallmark of institutional accumulation rather than intraday churning.
                </p>
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Accumulation Benchmark:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Delivery % &gt; 50%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Volume Expansion Filter:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">1.5x - 3.0x 30-Day Moving Average</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Local Archive Cache:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">data/nse-archives/bhavcopy/</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Glasses className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">FII & DII Participant Open Interest Engine</h3>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">fao_participant_oi_DDMMYYYY.csv</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Analyzes open interest across four distinct market participant categories: Foreign Institutional Investors (FII), Domestic Institutional Investors (DII), Proprietary Desks (Pro), and Retail Clients across Index Futures, Index Calls, and Index Puts.
                </p>
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">FII Index Long Ratio:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">&lt; 15% (Oversold Squeeze Zone)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Contrarian Sentiment:</span>
                    <span className="font-semibold text-rose-600 dark:text-rose-400">Client Long &gt; 65% + FII Short = Distribution</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Open Interest Cache:</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">data/nse-archives/participant-oi/</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 3: Quantitative & Microstructure */}
        {activeTab === 'quant' && (
          <motion.div
            key="quant"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Interactive Circuit Headroom Simulator */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    Interactive Bidirectional Circuit Guard Simulator
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Test how Axion calculates upper runway and eliminates lower circuit freeze liquidity traps.
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border self-start sm:self-auto ${
                  isLowerTrap
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : isUpperLocked
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isLowerTrap
                    ? '⛔ REJECTED: LOWER CIRCUIT FREEZE TRAP'
                    : isUpperLocked
                    ? '⚠️ UPPER CIRCUIT LOCKED (NO HEADROOM)'
                    : '✅ APPROVED: ADEQUATE MOMENTUM HEADROOM'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Lower Circuit Freeze (₹):</label>
                  <input
                    type="number"
                    value={simLowerCircuit}
                    onChange={(e) => setSimLowerCircuit(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Current Traded Price LTP (₹):</label>
                  <input
                    type="number"
                    value={simLtp}
                    onChange={(e) => setSimLtp(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-indigo-500 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Upper Circuit Band (₹):</label>
                  <input
                    type="number"
                    value={simUpperCircuit}
                    onChange={(e) => setSimUpperCircuit(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Headroom Gauge Bars */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Upper Circuit Headroom (+Runway):</span>
                  <span className="font-mono font-bold text-indigo-400">+{simUpperHeadroom.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500"
                    style={{ width: `${Math.min(100, (simUpperHeadroom / 20) * 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-slate-400">Distance from Lower Circuit Freeze:</span>
                  <span className={`font-mono font-bold ${isLowerTrap ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {simLowerHeadroom.toFixed(2)}% {isLowerTrap ? '(FREEZE ZONE < 1.5%)' : '(SAFE)'}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${isLowerTrap ? 'bg-rose-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (simLowerHeadroom / 20) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Interactive Piotroski F-Score 9-Point Checklist */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    Interactive Piotroski 9-Point F-Score Evaluator
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Toggle accounting criteria below to see how fundamental solvency scores affect candidate status.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                    currentFScore >= 7
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                      : currentFScore >= 5
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                  }`}>
                    Score: {currentFScore} / 9 {currentFScore >= 7 ? '(MULTIBAGGER APPROVED)' : '(DISQUALIFIED)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                {piotroskiLabels.map((label, idx) => {
                  const isChecked = piotroskiCriteria[idx];
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        const next = [...piotroskiCriteria];
                        next[idx] = !next[idx];
                        setPiotroskiCriteria(next);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                        isChecked
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-slate-900 dark:text-slate-200'
                          : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 text-white text-[10px] ${
                        isChecked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                      }`}>
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs leading-snug">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mathematical Formulas Cheat Sheet */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Binary className="h-4 w-4 text-indigo-400" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
                  Mathematical Formulas & Quant Solvency Models
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-indigo-400 font-bold block text-[11px]">Altman Z-Score Solvency</span>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    Z = 1.2·X₁ + 1.4·X₂ + 3.3·X₃ + 0.6·X₄ + 0.999·X₅
                  </p>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Where X₁ = Working Capital / Assets, X₂ = Retained Earnings / Assets, X₃ = EBIT / Assets, X₄ = Equity / Total Liabilities, X₅ = Sales / Assets.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-purple-400 font-bold block text-[11px]">DuPont 3-Way ROE</span>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    ROE = (Net Margin) × (Asset Turnover) × (Leverage)
                  </p>
                  <p className="text-[10px] text-slate-500 font-sans">
                    ROE = (Net Income / Sales) × (Sales / Assets) × (Assets / Equity). Isolates operational efficiency from financial leverage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-emerald-400 font-bold block text-[11px]">Black-Scholes Delta & Gamma</span>
                  <p className="text-slate-300 text-[10px] leading-relaxed">
                    Δ_call = N(d₁),  Γ = N'(d₁) / (S · σ · √T)
                  </p>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Quantifies directional sensitivity (Delta) and acceleration of Delta per rupee move in the underlying (Gamma).
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 4: Master Frameworks Lab (NEW!) */}
        {activeTab === 'frameworks' && (
          <motion.div
            key="frameworks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-pink-400" />
                    Institutional Master Trading Frameworks Lab
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Algorithmic strategies from world-champion momentum and growth traders coded directly into Axion.
                  </p>
                </div>
                <Link
                  href="/frameworks"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold self-start sm:self-auto transition-colors"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Launch Strategy Lab
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Framework Selector Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'minervini', name: 'Minervini VCP' },
                  { id: 'canslim', name: "O'Neil CANSLIM" },
                  { id: 'weinstein', name: 'Weinstein Stage 2' },
                  { id: 'darvas', name: 'Darvas Box' },
                  { id: 'ryan', name: 'David Ryan Pocket Pivot' }
                ].map((fw) => {
                  const isSel = selectedFramework === fw.id;
                  return (
                    <button
                      key={fw.id}
                      onClick={() => setSelectedFramework(fw.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isSel
                          ? 'bg-pink-600 text-white shadow-md shadow-pink-600/30'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {fw.name}
                    </button>
                  );
                })}
              </div>

              {/* Active Framework Deep-Dive */}
              <motion.div
                key={selectedFramework}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Award className="h-4 w-4 text-pink-400" />
                      {currentFrameworkData.name}
                    </h4>
                    <span className="text-[11px] font-mono text-pink-400">{currentFrameworkData.author}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {currentFrameworkData.ruleSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Criteria Checklist */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Screening Rules & Trigger Criteria
                    </span>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {currentFrameworkData.criteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-pink-400 shrink-0 mt-0.5" />
                          <span className="leading-snug">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Coded Algorithmic Implementation */}
                  <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[11px] text-slate-400">
                      <span className="text-pink-400 font-bold">Algorithmic Implementation</span>
                      <span className="text-[10px] text-emerald-400">Live in packages/core</span>
                    </div>
                    <pre className="text-slate-300 overflow-x-auto p-2 leading-relaxed text-[11px]">
                      {currentFrameworkData.codeSnippet}
                    </pre>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Tab 5: AI & Headroom Proxy */}
        {activeTab === 'ai' && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Interactive Headroom Token Optimizer Simulator */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-purple-400" />
                    <h3 className="text-base font-bold text-white">Headroom AI Context Compression Simulator</h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    See how Headroom proxy (running locally on port 8787) compresses prompt payloads via ONNX embeddings.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 self-start sm:self-auto">
                  -{tokenSavingsPercent}% Tokens Saved
                </span>
              </div>

              {/* Slider for Prompt Size */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Raw Market Context Prompt Tokens:</span>
                  <span className="font-mono font-bold text-indigo-400">{rawTokenCount.toLocaleString()} tokens</span>
                </div>
                <input
                  type="range"
                  min="4000"
                  max="40000"
                  step="500"
                  value={rawTokenCount}
                  onChange={(e) => setRawTokenCount(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Side-by-side Visual Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Direct Cloud LLM Call</span>
                    <span className="font-mono text-rose-400 font-bold">{rawTokenCount.toLocaleString()} tokens</span>
                  </div>
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 w-full" />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Est. Latency: ~1,450ms</span>
                    <span>Cost: ${(rawTokenCount * 0.0000003).toFixed(4)}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-purple-800/40 space-y-2">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>Via Headroom Proxy :8787</span>
                    <span className="font-mono text-emerald-400 font-bold">{compressedTokenCount.toLocaleString()} tokens</span>
                  </div>
                  <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(compressedTokenCount / rawTokenCount) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span className="text-emerald-400">Est. Latency: ~{1450 - latencyReduction}ms (-{latencyReduction}ms)</span>
                    <span className="text-emerald-400">Cost: ${(compressedTokenCount * 0.0000003).toFixed(4)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Architecture Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Google Gemini 2.5 Flash Advisory</h3>
                    <span className="text-xs text-purple-600 dark:text-purple-400 font-mono">1,000,000+ Token Context</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Harnesses the massive context window of Gemini 2.5 Flash to synthesize multiple data streams simultaneously: multi-year price candles, quarterly earnings balance sheets, delivery bhavcopy accumulation, and sector rotation dynamics.
                </p>
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Reasoning Horizons:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">1D Day Trade • 1-3W Swing • 1-3M Momentum • 6-12M Core</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Key Output Format:</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">Entry Zone, Stop-Loss, Target 1/2/3, R:R Ratio</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Security Guard:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Deterministic Fallbacks & Timeout Resiliency</span>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Headroom Context Optimization Proxy</h3>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono">127.0.0.1:8787 (Daemon Active)</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Operating as a persistent local background proxy, Headroom applies local ONNX semantic compression (<code>kompress</code>) and exact cache matching to compress prompt tokens by 40-70% while slashing API response latency and token costs.
                </p>
                <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Compression Engine:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">ONNX Quantized Embeddings</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Global Environment:</span>
                    <span className="font-mono text-slate-700 dark:text-slate-300">OPENAI_BASE_URL=http://127.0.0.1:8787/v1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dashboard & Stats:</span>
                    <a href="http://127.0.0.1:8787/dashboard" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1 font-semibold">
                      View Headroom UI <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 6: Market Session Lifecycle */}
        {activeTab === 'lifecycle' && (
          <motion.div
            key="lifecycle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Indian Market Automation Lifecycle (Asia/Kolkata)</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Governed automatically by <code>scripts/market-session-daemon.mjs</code> adhering to strict exchange trading schedules.
                  </p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-xs">
                  <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5 font-bold">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    {istTime || '15:30:00'} IST
                  </span>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold">
                    {currentSessionPhase}
                  </span>
                </div>
              </div>

              <div className="relative pl-6 border-l-2 border-indigo-200 dark:border-indigo-900 space-y-8">
                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${
                    currentSessionPhase === 'PRE_MARKET_WINDOW' ? 'bg-amber-400 ring-4 ring-amber-400/20' : 'bg-amber-500'
                  }`} />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">09:10 - 09:14 IST • PRE-MARKET SNAPSHOT</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Pre-Open Order Book & Forward Cohort Freezing</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Axion snapshots pre-market equilibrium prices and locks in candidate trade cohorts before market open at 09:15. This mathematically guarantees zero hindsight bias in subsequent performance audits.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${
                    currentSessionPhase === 'MARKET_HOURS' ? 'bg-emerald-400 ring-4 ring-emerald-400/20' : 'bg-emerald-500'
                  }`} />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">09:15 - 15:30 IST • LIVE TRADING SESSION</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Continuous Alert Worker & Microstructure Polling</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Alert workers poll real-time price ticks, monitoring breakout trigger conditions, circuit lock proximity, and volume surges (&gt;1.5x 30D average). Push notifications are dispatched immediately upon threshold breach.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${
                    currentSessionPhase === 'POST_MARKET_RECONCILIATION' ? 'bg-indigo-400 ring-4 ring-indigo-400/20' : 'bg-indigo-500'
                  }`} />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">15:31 - 16:00 IST • POST-MARKET SETTLEMENT</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Conservative Reconciliation & Slippage Auditing</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Evaluates all open paper cohorts against official closing prices. Trades are settled with modeled slippage, STT, and exchange fees. Accurate win/loss hit-rates and profit factors are permanently logged.
                    </p>
                  </div>
                </div>

                <div className="relative">
                  <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white dark:border-slate-900 ${
                    currentSessionPhase === 'EOD_BHAVCOPY_INGESTION' ? 'bg-purple-400 ring-4 ring-purple-400/20' : 'bg-purple-500'
                  }`} />
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">18:15 IST • END-OF-DAY EXCHANGE INGESTION</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Daily Bhavcopy & FII Participant OI Archival</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Downloads and parses official daily Bhavcopy and derivatives participant open interest reports from the NSE archives. Re-indexes Demat delivery rankings and recalculates institutional sentiment regimes.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 7: Risk Governance & Interactive Friction Sandbox */}
        {activeTab === 'governance' && (
          <motion.div
            key="governance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Interactive Real-World Slippage & Fee Sandbox */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Scale className="h-4 w-4 text-emerald-400" />
                    Interactive Institutional Friction & Slippage Sandbox
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    See the real regulatory and market impact deducted from paper trades to ensure zero phantom profits.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start sm:self-auto">
                  Total Friction: ₹{totalFriction.toFixed(2)} ({frictionPercent}%)
                </span>
              </div>

              {/* Capital Input Slider */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Simulated Order Capital:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">₹{tradeCapital.toLocaleString('en-IN')}</span>
                </div>
                <input
                  type="range"
                  min="25000"
                  max="1000000"
                  step="25000"
                  value={tradeCapital}
                  onChange={(e) => setTradeCapital(Number(e.target.value))}
                  className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
              </div>

              {/* Deductions Breakdown Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Securities Tax (STT)</span>
                  <span className="text-xs font-bold text-white block my-1">₹{sttFee.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">0.1% on delivery</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">NSE Turnover Fee</span>
                  <span className="text-xs font-bold text-white block my-1">₹{exchangeTurnover.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">0.00345%</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">SEBI Charges</span>
                  <span className="text-xs font-bold text-white block my-1">₹{sebiCharges.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">₹10 / crore</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Brokerage Commission</span>
                  <span className="text-xs font-bold text-white block my-1">₹{brokerCommission.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">Flat execution</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-mono">Modeled Spread Slippage</span>
                  <span className="text-xs font-bold text-white block my-1">₹{spreadSlippage.toFixed(2)}</span>
                  <span className="text-[9px] text-slate-500 block">0.05% bid-ask</span>
                </div>
              </div>
            </div>

            {/* Governance Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Strict Zero-Hindsight Policy</h3>
                    <span className="text-xs text-rose-600 dark:text-rose-400 font-mono">Immutable Time-Stamping</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Many retail platforms suffer from look-ahead bias, backtesting strategies on data that was not knowable at entry time. Axion enforces immutable forward snapshot logging: predictions cannot be retroactively inserted or edited after market open.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Scale className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Institutional Friction Modeling</h3>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">Real-World Execution Cost</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Paper trade reconciliation models realistic bid-ask spread slippage, Securities Transaction Tax (STT), NSE turnover charges, SEBI turnover fees, and broker commissions to guarantee that reported returns represent real-world extractable edge.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Tab 8: Quant & Developer REST API Hub (NEW!) */}
        {activeTab === 'api-reference' && (
          <motion.div
            key="api-reference"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-emerald-400" />
                    Axion Internal REST API Explorer & Data Schemas
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official programmatic endpoints powering the Axion Web Terminal, Mobile app, and Python backtesters.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-1 rounded-full self-start sm:self-auto">
                  Local Endpoints • Port 3000
                </span>
              </div>

              {/* Endpoint Selector Tabs */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {apiEndpoints.map((ep, idx) => {
                  const isSel = selectedApiEndpoint === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedApiEndpoint(idx)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-500/10'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">
                        {ep.method}
                      </span>
                      <span className="text-xs font-bold block text-white mt-1 truncate">{ep.path}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Endpoint Details & Response Schema */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                        {apiEndpoints[selectedApiEndpoint].method}
                      </span>
                      <span className="font-mono text-xs font-bold text-white">
                        {apiEndpoints[selectedApiEndpoint].path}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-indigo-400 block pt-1">
                      {apiEndpoints[selectedApiEndpoint].params}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-sans">
                    {apiEndpoints[selectedApiEndpoint].name}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">
                  {apiEndpoints[selectedApiEndpoint].desc}
                </p>

                <div className="space-y-1.5 font-mono text-xs">
                  <span className="text-[11px] text-slate-400 font-bold block">Sample JSON Response:</span>
                  <pre className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-emerald-400 text-[11px] overflow-x-auto leading-relaxed">
                    {apiEndpoints[selectedApiEndpoint].response}
                  </pre>
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Platform Directory & Quick Launch Hub */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Platform Modules Directory</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Direct navigation across all Axion quantitative scanners, master strategy labs, and intelligence radars.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="features-about-grid">
          {modules.map((m, idx) => (
            <motion.div
              key={idx}
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
            >
              <Link
                href={m.path}
                className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 shadow-sm hover:shadow-md transition-all space-y-2.5 flex flex-col justify-between h-full"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl group-hover:scale-105 transition-transform">
                      {m.icon}
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                      {m.badge}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                    {m.title}
                    <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500" />
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {m.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-50 dark:border-slate-800/60 flex items-center justify-between text-[11px] font-medium text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <span>Explore Module</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
