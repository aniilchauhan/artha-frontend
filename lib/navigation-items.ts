import React from 'react';
import {
  Home,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Star,
  Briefcase,
  BarChart3,
  ShieldCheck,
  Activity,
  BookOpen,
  FlaskConical,
  Target,
  SlidersHorizontal,
  Gauge,
  Maximize2,
  Rocket,
  Flame,
  Zap,
  Search,
  Newspaper,
  Award,
  Calendar,
  Filter,
  Layers,
  Info,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  badge?: string;
  badgeType?: 'live' | 'hot' | 'ai' | 'pro' | 'gmp' | 'greek' | 'neutral';
  color?: string;
  description?: string;
}

export interface NavGroup {
  id: string;
  name: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  items: NavItem[];
}

/**
 * Primary Focus Tools - Displayed in the Sidebar's First Accordion
 */
export const FOCUS_NAV_GROUP: NavGroup = {
  id: 'focus-radars',
  name: 'Core Focus',
  icon: Flame,
  accentColor: 'text-indigo-500 dark:text-indigo-400',
  items: [
    {
      name: 'Dashboard',
      href: '/',
      icon: Home,
      badge: 'CORE',
      badgeType: 'live',
      color: 'text-indigo-500',
      description: 'Terminal dashboard & live market pulse',
    },
    {
      name: '2% Small Cap Picks',
      href: '/small-cap-predictions',
      icon: TrendingUp,
      badge: '2%',
      badgeType: 'live',
      color: 'text-emerald-500',
      description: 'Daily algorithmic small-cap momentum targets',
    },
    {
      name: '10% Move Radar',
      href: '/rapid-moves',
      icon: Rocket,
      badge: '10%',
      badgeType: 'live',
      color: 'text-cyan-500',
      description: 'Rapid explosive move detection model (1–5D)',
    },
    {
      name: '2–5% Fall Predictions',
      href: '/fall-predictions',
      icon: TrendingDown,
      badge: 'SHORT',
      badgeType: 'hot',
      color: 'text-rose-500',
      description: 'Downside breakdown & shorting radar',
    },
    {
      name: 'Market News',
      href: '/news',
      icon: Newspaper,
      badge: 'LIVE',
      badgeType: 'live',
      color: 'text-sky-500',
      description: 'Real-time financial headlines and company filings',
    },
  ],
};

/**
 * Post-IPO Section - Dedicated Sidebar Accordion
 */
export const POST_IPO_NAV_GROUP: NavGroup = {
  id: 'post-ipo-group',
  name: 'Post-IPO Radar',
  icon: Rocket,
  accentColor: 'text-purple-500 dark:text-purple-400',
  items: [
    {
      name: 'Post-IPO Predictions',
      href: '/post-ipo',
      icon: Rocket,
      badge: '2YR',
      badgeType: 'ai',
      color: 'text-purple-500',
      description: 'Stage-1 base accumulation & breakout tracker',
    },
    {
      name: 'IPOs & GMP Tracker',
      href: '/ipo',
      icon: Award,
      badge: 'GMP',
      badgeType: 'gmp',
      color: 'text-amber-500',
      description: 'Mainboard & SME pipeline, grey market premiums',
    },
  ],
};

/**
 * Extended Tools moved to Settings Panel
 */
export const SETTINGS_TOOLS_SECTIONS: {
  id: string;
  title: string;
  description: string;
  items: NavItem[];
}[] = [
  {
    id: 'core-workspace',
    title: 'Core Workspace',
    description: 'Portfolio, watchlist and decision tools',
    items: [
      {
        name: 'Stock Research',
        href: '/stock-ai',
        icon: Sparkles,
        badge: 'AI',
        badgeType: 'ai',
        color: 'text-cyan-500',
        description: 'Comprehensive fundamental & technical AI engine',
      },
      {
        name: 'Watchlist',
        href: '/watchlist',
        icon: Star,
        color: 'text-amber-500',
        description: 'Tracked ticker monitoring and real-time triggers',
      },
      {
        name: 'Paper Portfolio',
        href: '/portfolio',
        icon: Briefcase,
        color: 'text-indigo-500',
        description: 'Virtual execution & risk-managed portfolio simulator',
      },
      {
        name: 'Results',
        href: '/results',
        icon: BarChart3,
        color: 'text-purple-500',
        description: 'Quarterly financial statements & performance history',
      },
      {
        name: 'Data Health',
        href: '/data-health',
        icon: ShieldCheck,
        badge: 'HEALTH',
        badgeType: 'neutral',
        color: 'text-blue-500',
        description: 'System connectivity, market feed latency & backend metrics',
      },
    ],
  },
  {
    id: 'research-radars',
    title: 'Research Labs & Radars',
    description: 'Algorithmic scanners, backtests and quant models',
    items: [
      {
        name: '10% Move Radar',
        href: '/rapid-moves',
        icon: TrendingUp,
        badge: '1–5D',
        badgeType: 'neutral',
        color: 'text-cyan-500',
        description: 'Rapid explosive move detection model',
      },
      {
        name: 'Market Forecast (Lab)',
        href: '/market-forecast',
        icon: Activity,
        badge: 'RESEARCH',
        badgeType: 'neutral',
        color: 'text-indigo-500',
        description: 'Index direction probability & swing outlook',
      },
      {
        name: 'Strategy Lab',
        href: '/frameworks',
        icon: FlaskConical,
        badge: 'LAB',
        badgeType: 'pro',
        color: 'text-pink-500',
        description: 'Custom quantitative strategy rules and backtester',
      },
      {
        name: 'Quant Suite',
        href: '/quant',
        icon: ShieldCheck,
        badge: 'PRO',
        badgeType: 'pro',
        color: 'text-indigo-500',
        description: 'Institutional-grade quantitative factor analysis',
      },
      {
        name: 'Futures & Options',
        href: '/futures-options',
        icon: SlidersHorizontal,
        color: 'text-violet-500',
        description: 'Derivatives open interest & chain analysis',
      },
      {
        name: 'Greeks Monitor',
        href: '/greeks',
        icon: Gauge,
        badge: 'Δ',
        badgeType: 'greek',
        color: 'text-teal-500',
        description: 'Delta, Gamma, Vega and Theta real-time risk monitor',
      },
      {
        name: 'Gap Screener',
        href: '/gap-analysis',
        icon: Maximize2,
        badge: 'GAP',
        badgeType: 'neutral',
        color: 'text-amber-500',
        description: 'Opening gap up/down fill probability scanner',
      },
      {
        name: 'Swing Setups',
        href: '/swing-opportunities',
        icon: Activity,
        color: 'text-cyan-500',
        description: 'Multi-day momentum and trend continuation setups',
      },
      {
        name: 'Multibagger Ideas',
        href: '/multibagger',
        icon: Rocket,
        color: 'text-fuchsia-500',
        description: 'Long-term high ROCE compounder screening model',
      },
      {
        name: 'Stock Opportunities',
        href: '/opportunities',
        icon: Flame,
        badge: 'HOT',
        badgeType: 'hot',
        color: 'text-rose-500',
        description: 'Live volume spike & breakout alerts',
      },
      {
        name: 'Live Decisions',
        href: '/live-decisions',
        icon: Zap,
        badge: 'LIVE',
        badgeType: 'live',
        color: 'text-emerald-500',
        description: 'Actionable real-time entry and exit recommendations',
      },
      {
        name: 'Radar Paper Portfolio',
        href: '/research-paper',
        icon: BookOpen,
        badge: 'PAPER',
        badgeType: 'neutral',
        color: 'text-blue-500',
        description: 'Automated paper trading tracking for radar signals',
      },
      {
        name: 'Portfolio Backtests',
        href: '/research-backtests',
        icon: FlaskConical,
        badge: 'RESEARCH',
        badgeType: 'neutral',
        color: 'text-indigo-500',
        description: 'Historical performance simulation & parameter sweeps',
      },
      {
        name: 'Manual Holdings Tracker',
        href: '/portfolio-tracker',
        icon: Briefcase,
        badge: 'LOCAL',
        badgeType: 'neutral',
        color: 'text-slate-500',
        description: 'Local portfolio manager with offline persistence',
      },
      {
        name: 'Prediction Tracker',
        href: '/predictions',
        icon: Target,
        badge: 'RESEARCH',
        badgeType: 'neutral',
        color: 'text-indigo-500',
        description: 'Historical hit rate audit for model calls',
      },
      {
        name: 'Legacy Cohort Archive',
        href: '/paper-predictions',
        icon: BookOpen,
        badge: 'ARCHIVE',
        badgeType: 'neutral',
        color: 'text-slate-500',
        description: 'Archived cohort trade records',
      },
    ],
  },
  {
    id: 'market-reference',
    title: 'Market Reference & Catalogs',
    description: 'Stock database, news, IPOs and market exploration',
    items: [
      {
        name: 'All Stocks Catalog',
        href: '/database',
        icon: Search,
        badge: '2.5K',
        badgeType: 'neutral',
        color: 'text-blue-500',
        description: 'Complete NSE/BSE listed equities master database',
      },
      {
        name: 'Market News',
        href: '/news',
        icon: Newspaper,
        color: 'text-sky-500',
        description: 'Real-time financial headlines and company filings',
      },
      {
        name: 'IPOs & GMP',
        href: '/ipo',
        icon: Award,
        badge: 'GMP',
        badgeType: 'gmp',
        color: 'text-amber-500',
        description: 'Primary market pipeline, grey market premiums & subscriptions',
      },
      {
        name: 'Post-IPO Predictions',
        href: '/post-ipo',
        icon: Rocket,
        badge: '2YR',
        badgeType: 'ai',
        color: 'text-indigo-500',
        description: 'Freshly listed stock stage-1 breakout tracker',
      },
      {
        name: 'Dividends Calendar',
        href: '/dividends',
        icon: Calendar,
        color: 'text-emerald-500',
        description: 'Corporate actions, dividend yields & record dates',
      },
      {
        name: 'Stock Screener',
        href: '/screener',
        icon: Filter,
        color: 'text-indigo-500',
        description: 'Multi-variable filtering on valuation & technicals',
      },
      {
        name: 'Market Categories',
        href: '/market-explorer',
        icon: Layers,
        color: 'text-sky-500',
        description: 'Sector classification, industry peer matrices & indices',
      },
      {
        name: 'About Platform',
        href: '/about',
        icon: Info,
        color: 'text-slate-500',
        description: 'System architecture, methodology and documentation',
      },
    ],
  },
];
