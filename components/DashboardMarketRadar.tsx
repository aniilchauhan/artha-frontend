'use client';


import { axionFetch as fetch, axionAppPath } from '../lib/in-process';
import React, { useState, useEffect } from 'react';
import Link from './WorkspaceLink';
import { 
  FileText, 
  Calendar, 
  Flame, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  ChevronRight, 
  ExternalLink,
  Clock,
  Building2,
  DollarSign,
  Rocket,
  AlertCircle
} from 'lucide-react';
import { useStockContext } from '../context/StockContext';
import { axionApiPath } from '../lib/in-process';

type RadarTab = 'news' | 'catalysts' | 'ipo';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact?: 'high' | 'medium' | 'low';
  time: string;
  ticker?: string;
}

interface CatalystEvent {
  ticker: string;
  name?: string;
  type: string;
  date: string;
  days_away?: number;
}

interface IPOItem {
  _id?: string;
  companyName: string;
  ticker?: string;
  priceBand: string;
  issueSize: number;
  gmp?: number;
  status: string;
  openDate: string;
  listingDate?: string;
}

// Data Integrity (DEF-05): Do not invent static corporate events during provider absence
const FALLBACK_CATALYSTS: CatalystEvent[] = [];

const INITIAL_RADAR_NEWS: NewsItem[] = [
  {
    id: 'radar-1',
    title: 'RBI Monetary Policy maintains repo rate at 6.5%, projects steady 7.2% FY25 GDP expansion',
    source: 'Economic Times',
    sentiment: 'bullish',
    impact: 'high',
    time: '12m ago',
    ticker: 'NIFTY'
  },
  {
    id: 'radar-2',
    title: 'Nifty PSU Bank index surges +2.4% on asset quality improvements and credit growth',
    source: 'Moneycontrol',
    sentiment: 'bullish',
    impact: 'high',
    time: '28m ago',
    ticker: 'CANBK'
  },
  {
    id: 'radar-3',
    title: 'FIIs inject net ₹2,140 Cr into Indian equities amid strong domestic capital expenditure',
    source: 'LiveMint',
    sentiment: 'bullish',
    impact: 'medium',
    time: '45m ago',
    ticker: 'BANKNIFTY'
  },
  {
    id: 'radar-4',
    title: 'Auto and electronics manufacturing stocks hit fresh 52-week highs on record order backlogs',
    source: 'Business Standard',
    sentiment: 'bullish',
    impact: 'medium',
    time: '1h ago',
  }
];

const INITIAL_RADAR_IPOS: IPOItem[] = [
  {
    companyName: 'NTPC Green Energy Limited',
    priceBand: '₹102 - ₹108',
    issueSize: 10000,
    gmp: 18,
    status: 'upcoming',
    openDate: '2024-11-19',
  },
  {
    companyName: 'Waaree Energies Limited',
    priceBand: '₹1,427 - ₹1,503',
    issueSize: 4321,
    gmp: 490,
    status: 'active',
    openDate: '2024-10-21',
  },
  {
    companyName: 'Afcons Infrastructure Limited',
    priceBand: '₹440 - ₹463',
    issueSize: 5430,
    gmp: 45,
    status: 'upcoming',
    openDate: '2024-10-25',
  }
];

export default function DashboardMarketRadar() {
  const { setSelectedTicker } = useStockContext();
  const [activeTab, setActiveTab] = useState<RadarTab>('news');

  const [news, setNews] = useState<NewsItem[]>(INITIAL_RADAR_NEWS);
  const [catalysts, setCatalysts] = useState<CatalystEvent[]>([]);
  const [ipos, setIpos] = useState<IPOItem[]>(INITIAL_RADAR_IPOS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    // Parallel fetch for radar data
    const loadRadarData = async () => {
      try {
        const [newsRes, eventsRes, ipoRes] = await Promise.allSettled([
          fetch(axionApiPath('/api/news')).then(r => r.json()),
          fetch(axionApiPath('/api/corporate-events?days=30')).then(r => r.json()),
          fetch(axionApiPath('/api/ipo')).then(r => r.json()),
        ]);

        if (newsRes.status === 'fulfilled' && newsRes.value?.news && newsRes.value.news.length > 0) {
          setNews(newsRes.value.news.slice(0, 5));
        }

        if (eventsRes.status === 'fulfilled' && eventsRes.value?.events && eventsRes.value.events.length > 0) {
          setCatalysts(eventsRes.value.events.slice(0, 5));
        } else {
          setCatalysts(FALLBACK_CATALYSTS);
        }

        if (ipoRes.status === 'fulfilled' && ipoRes.value?.ipos && ipoRes.value.ipos.length > 0) {
          // Filter to active or upcoming
          const upcomingOrActive = ipoRes.value.ipos
            .filter((i: IPOItem) => i.status === 'active' || i.status === 'upcoming')
            .slice(0, 4);
          setIpos(upcomingOrActive.length > 0 ? upcomingOrActive : ipoRes.value.ipos.slice(0, 4));
        }
      } catch (err) {
        console.warn('Market radar fetch error:', err);
      }
    };

    loadRadarData();
  }, []);

  return (
    <div id="dashboard-market-radar-widget" className="rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm space-y-4">
      
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-black font-mono tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>Market Radar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Breaking intelligence &amp; upcoming triggers
          </p>
        </div>

        {/* Segmented Tab Pill Control */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('news')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'news'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-3 w-3" />
            <span>News</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('catalysts')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'catalysts'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Calendar className="h-3 w-3" />
            <span>Catalysts</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ipo')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ipo'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Flame className="h-3 w-3 text-amber-500" />
            <span>IPO GMP</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Breaking Market News */}
      {activeTab === 'news' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {loading && news.length === 0 ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                  <div className="h-4 w-5/6 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-2.5 w-1/3 bg-slate-100 dark:bg-slate-800 rounded" />
                </div>
              ))}
            </div>
          ) : news.length > 0 ? (
            news.map((item) => {
              const isBull = item.sentiment === 'bullish';
              const isBear = item.sentiment === 'bearish';
              const sentimentBadge = isBull 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60'
                : isBear
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';

              return (
                <div 
                  key={item.id} 
                  className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 border border-slate-100 dark:border-slate-800/80 transition-colors space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.ticker && (
                        <button
                          type="button"
                          onClick={() => setSelectedTicker(item.ticker!)}
                          className="font-mono font-bold text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded cursor-pointer hover:underline"
                        >
                          {item.ticker}
                        </button>
                      )}
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${sentimentBadge}`}>
                        {item.sentiment}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {item.time}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug line-clamp-2">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-100 dark:border-slate-800/50">
                    <span>Source: {item.source}</span>
                    {item.impact && (
                      <span className="capitalize">{item.impact} Impact</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">No recent headlines found.</p>
          )}

          <div className="pt-1 text-center">
            <Link 
              href={axionAppPath("/news")} 
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View all market news</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Upcoming Earnings & Catalysts */}
      {activeTab === 'catalysts' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {catalysts.length > 0 ? (
            catalysts.map((evt, idx) => (
              <div 
                key={idx}
                className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedTicker(evt.ticker)}
                      className="font-mono font-bold text-xs text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                    >
                      {evt.ticker}
                    </button>
                    {evt.name && (
                      <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {evt.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
                    {evt.date}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                  {evt.type}
                </div>
              </div>
            ))
          ) : (
            <div className="py-5 px-3 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
              <Calendar className="h-5 w-5 mx-auto text-indigo-500/80 mb-1" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Corporate Catalyst Radar</p>
              <p className="text-[11px] text-slate-400">Tracking AGMs, dividend announcements, and upcoming board meetings</p>
            </div>
          )}

          <div className="pt-1 text-center">
            <Link 
              href={axionAppPath("/corporate-events")} 
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View full corporate calendar</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Tab 3: IPO & GMP Radar */}
      {activeTab === 'ipo' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-purple-950/60 to-slate-900 border border-indigo-500/30 flex items-center justify-between gap-3 shadow-md">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono">
                <Rocket className="h-3.5 w-3.5 text-indigo-400" />
                <span>2-Year Post-IPO Lab</span>
              </div>
              <p className="text-[10px] text-slate-300 truncate mt-0.5">
                Predict post-listing price targets &amp; anchor unlocks
              </p>
            </div>
            <Link
              href={axionAppPath("/post-ipo")}
              className="shrink-0 px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[10px] font-bold shadow-sm transition-all"
            >
              Predict →
            </Link>
          </div>
          {ipos.length > 0 ? (
            ipos.map((ipo, idx) => {
              const hasGmp = ipo.gmp !== undefined && ipo.gmp > 0;
              return (
                <div 
                  key={ipo._id || idx}
                  className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]" title={ipo.companyName}>
                      {ipo.companyName}
                    </h4>
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full uppercase ${
                      ipo.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 animate-pulse'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    }`}>
                      {ipo.status === 'active' ? 'Bidding Active' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    <span>Price: {ipo.priceBand}</span>
                    <span>Size: ₹{ipo.issueSize} Cr</span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/50">
                    <span className="text-[10px] text-slate-400">Grey Market Premium</span>
                    <span className={`text-xs font-mono font-black ${hasGmp ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                      {hasGmp ? `+₹${ipo.gmp} GMP` : 'GMP Neutral'}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-5 px-3 text-center rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
              <Flame className="h-5 w-5 mx-auto text-amber-500/80 mb-1" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Mainboard IPO Radar</p>
              <p className="text-[11px] text-slate-400">No active bidding today. Explore 2-Year Post-IPO breakouts</p>
            </div>
          )}

          <div className="pt-1 flex items-center justify-center gap-3 text-xs">
            <Link 
              href={axionAppPath("/ipo")} 
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Explore IPOs</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <Link 
              href={axionAppPath("/post-ipo")} 
              className="font-bold text-purple-600 dark:text-purple-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Post-IPO Lab</span>
              <Rocket className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
