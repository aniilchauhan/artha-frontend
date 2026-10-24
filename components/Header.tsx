'use client';


import { axionAppPath, axionAssetPath } from '../lib/in-process';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useStockContext } from '../context/StockContext';
import { useSession, signOut } from 'next-auth/react';
import Link from './WorkspaceLink';
import { 
  Settings, 
  ShieldAlert,
  Sparkles, 
  Sun, 
  Moon, 
  Key, 
  RefreshCw, 
  LogIn, 
  LogOut, 
  ChevronDown, 
  Briefcase, 
  Star,
  Compass,
  Palette
} from 'lucide-react';
import Image from 'next/image';
import SearchBar from './SearchBar';
import AuthScreen from './AuthScreen';
import TaskOnboardingModal from './TaskOnboardingModal';
import ThemeCustomizerModal from './ThemeCustomizerModal';
import CommandPaletteModal from './CommandPaletteModal';
import { THEMES } from '../lib/themes';
import { SETTINGS_TOOLS_SECTIONS } from '../lib/navigation-items';

export default function Header() {
  const {
    activeTab,
    setActiveTab,
    livePolling,
    setLivePolling,
    pollingInterval,
    updatePollingInterval,
    simulatedErrorType,
    toggleSimulatedError,
    resetBackendLimits,
    pollingError,
    theme,
    setTheme,
    toggleTheme,
    dataQualityStatus,
    setSelectedTicker,
    customApiKey,
    setCustomApiKey,
    syncLiveData,
  } = useStockContext();

  const { data: session, status: authStatus } = useSession();
  const dataModeLabel = {
    live: 'RECENT',
    mixed: 'MIXED',
    simulated: 'SIMULATED',
    unavailable: 'UNAVAILABLE',
  }[dataQualityStatus] ?? 'LIVE';

  const [showSettings, setShowSettings] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Auto-launch onboarding tour for first-time visitors if not previously dismissed
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('axion_onboarding_dismissed');
      if (!dismissed) {
        setShowOnboarding(true);
      }
    } catch {
      // LocalStorage unavailable in SSR
    }
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when auth modal is open
  useEffect(() => {
    if (showAuthModal) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [showAuthModal]);

  // Handle ESC key to close modal/menu
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setShowAuthModal(false);
        setShowProfileMenu(false);
        setShowSettings(false);
        setShowCommandPalette(false);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSyncLive = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncLiveData('all');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header id="app-main-header" className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border-b border-white/60 dark:border-slate-800/50 sticky top-0 z-40 shadow-[0_4px_30px_rgba(0,0,0,0.02)] transition-all duration-300">
      <div className="w-full px-3 sm:px-6 lg:px-8">
        <div className="header-row flex justify-between h-16 items-center gap-2">
          {/* Logo and Brand Name */}
          <Link href={axionAppPath("/")}
            onClick={() => {
              setActiveTab('dashboard');
              setSelectedTicker(null);
            }}
            className="flex items-center gap-1 sm:gap-2 cursor-pointer group min-w-0 shrink-0"
            id="brand-logo-container"
          >
            <div className="p-0.5 bg-gradient-to-br from-gray-900 to-gray-800 dark:from-indigo-900 dark:to-slate-900 rounded-xl group-hover:scale-105 transition-all duration-300 shadow-md group-hover:shadow-indigo-500/20 shrink-0 border border-gray-700/50">
              <Image src={axionAssetPath("/branding/axion-logo.png")} alt="Artha AI logo" width={32} height={32} priority className="drop-shadow-sm" />
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="font-sans font-extrabold tracking-tight text-sm lg:text-lg bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent flex items-center gap-1 sm:gap-1.5 transition-all">
                Artha AI
                <span className={`text-[8px] sm:text-[10px] border px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 hidden lg:inline-block shadow-sm ${
                  dataQualityStatus === 'live'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                    : dataQualityStatus === 'mixed'
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-500/20'
                    : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-500/20'
                }`}>
                  {dataModeLabel}
                </span>
              </span>
              <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wide hidden xl:block opacity-80 group-hover:opacity-100 transition-opacity">
                NSE/BSE Quotes & Research Terminal
              </p>
            </div>
          </Link>

          {/* Dynamic Global Stock Search & Terminal Palette Trigger */}
          <div className="flex items-center gap-2 flex-1 max-w-lg min-w-0">
            <SearchBar />
            <button
              type="button"
              onClick={() => setShowCommandPalette(true)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 to-teal-500/10 hover:border-indigo-500/60 hover:from-indigo-500/20 hover:to-teal-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold font-mono transition-all cursor-pointer shadow-xs shrink-0"
              title="Open Terminal Command Palette (Ctrl+K)"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>⌘K Palette</span>
            </button>
          </div>

          {/* Right actions: Live Sync, Theme, Login/Profile, Settings */}
          <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2.5 shrink-0" id="header-actions-container">
            {/* Status indicator */}
            <div className={`flex items-center gap-1.5 border px-2 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold shrink-0 shadow-sm backdrop-blur-md ${
              dataQualityStatus === 'live'
                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
                : dataQualityStatus === 'mixed'
                ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/40 text-amber-700 dark:text-amber-300'
                : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/50 dark:border-rose-800/40 text-rose-700 dark:text-rose-300'
            }`}>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                  dataQualityStatus === 'live' ? 'bg-emerald-400' : dataQualityStatus === 'mixed' ? 'bg-amber-400' : 'bg-rose-400'
                } opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  dataQualityStatus === 'live' ? 'bg-emerald-500' : dataQualityStatus === 'mixed' ? 'bg-amber-500' : 'bg-rose-500'
                }`}></span>
              </span>
              <span className="hidden xl:inline tracking-wide">{dataQualityStatus === 'live' ? 'Provider quotes' : dataQualityStatus === 'mixed' ? 'Mixed data feed' : dataQualityStatus === 'simulated' ? 'Simulated feed' : 'Data unavailable'}</span>
            </div>

            {/* On-Demand Live Data Sync Button */}
            <button
              onClick={handleSyncLive}
              disabled={isSyncing}
              id="btn-header-sync-live"
              aria-label={isSyncing ? 'Syncing market data' : 'Sync Live'}
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 shrink-0 shadow-sm ${
                isSyncing
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 cursor-wait'
                  : 'bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-indigo-500/10'
              }`}
              title="Sync live benchmarks and quotes from Indian exchange gateways on demand"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-gray-500 dark:text-gray-400'}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing…' : 'Sync Live'}</span>
            </button>

            {/* Pilot Tour & Task Onboarding Button */}
            <button
              onClick={() => setShowOnboarding(true)}
              id="btn-header-onboarding"
              aria-label="Platform Tour & Task Onboarding"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-indigo-500/30 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 shrink-0 shadow-sm hover:border-indigo-400 hover:shadow-indigo-500/10"
              title="Take the Interactive Platform Tour & Check Task Progress"
            >
              <Compass className="h-3.5 w-3.5 shrink-0 animate-pulse text-indigo-600 dark:text-indigo-400" />
              <span className="hidden md:inline">Tour</span>
            </button>

            {/* Theme Studio Button */}
            <button
              onClick={() => setShowThemeModal(true)}
              id="btn-header-theme-studio"
              aria-label="Theme Customization Studio"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-purple-500/30 bg-purple-50/60 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-semibold cursor-pointer transition-all duration-300 hover:-translate-y-0.5 shrink-0 shadow-sm hover:border-purple-400 hover:shadow-purple-500/10"
              title="Theme Customization Studio (10 Themes)"
            >
              <Palette className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
              <span className="hidden md:inline">Themes</span>
              <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-purple-500/20 font-bold">10</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => toggleTheme()}
              className="p-1.5 sm:p-2 rounded-xl border cursor-pointer transition-all duration-300 hover:-translate-y-0.5 shrink-0 bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 hover:border-amber-200 dark:hover:border-amber-800 hover:shadow-amber-500/10 shadow-sm"
              id="btn-toggle-theme"
              aria-label={theme !== 'light' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              title={theme !== 'light' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme !== 'light' ? (
                <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-amber-500/20 transition-transform hover:rotate-90" />
              ) : (
                <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Authentication / Profile Option */}
            {authStatus === 'loading' ? (
              <div className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse shrink-0" />
            ) : authStatus === 'authenticated' && session?.user ? (
              /* Authenticated User Menu Dropdown */
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  id="btn-header-profile"
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs font-semibold cursor-pointer transition-all duration-300 shadow-sm hover:-translate-y-0.5 shrink-0"
                  title="User Profile & Settings"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-[10px] sm:text-[11px] flex items-center justify-center uppercase shadow-sm shrink-0">
                    {session.user.email?.[0] || 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[80px] md:max-w-[120px] truncate text-slate-700 dark:text-slate-300">
                    {session.user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div 
                    id="profile-dropdown-menu"
                    className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  >
                    {/* User Info Header */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center uppercase shrink-0 shadow-sm">
                          {session.user.email?.[0] || 'U'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {session.user.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-indigo-600 dark:text-indigo-400">
                              {(session.user as any)?.role || 'Cloud Account'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nav Links */}
                    <div className="space-y-0.5">
                      <Link
                        href={axionAppPath("/portfolio")}
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Briefcase className="h-4 w-4 text-slate-400" />
                        <span>My Portfolio & Ledger</span>
                      </Link>
                      <Link
                        href={axionAppPath("/watchlist")}
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50/80 dark:hover:bg-indigo-950/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Star className="h-4 w-4 text-slate-400" />
                        <span>My Saved Watchlist</span>
                      </Link>
                    </div>

                    {/* Sign Out Action */}
                    <div className="pt-2 mt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          signOut({ callbackUrl: axionAppPath('/') });
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50/80 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        id="btn-header-signout"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Signed Out: Sign In Button */
              <button
                onClick={() => setShowAuthModal(true)}
                id="btn-header-signin"
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 hover:from-indigo-500/20 hover:via-purple-500/20 hover:to-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs cursor-pointer transition-all duration-300 shadow-sm hover:shadow-indigo-500/15 hover:-translate-y-0.5 shrink-0"
                title="Sign In / Register"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden xs:inline sm:inline">Sign In</span>
              </button>
            )}

            {/* Toggle settings panel */}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 sm:p-2 rounded-xl border cursor-pointer transition-all duration-300 hover:-translate-y-0.5 shrink-0 shadow-sm ${
                showSettings 
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shadow-indigo-500/10' 
                  : 'bg-white/80 dark:bg-gray-900/80 border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-indigo-500/10'
              }`}
              id="btn-toggle-settings-panel"
              aria-label="Settings"
              aria-expanded={showSettings}
              aria-controls="header-settings-panel"
              title="System Simulation Settings"
            >
              <Settings className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Dropdown settings panel */}
      {showSettings && (
        <div 
          id="header-settings-panel"
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl border-b border-gray-100 dark:border-gray-800 px-4 py-6 md:px-8 shadow-inner animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Polling Interval Controls */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Polling Interval
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Configure how frequently the simulated stock market ticks.
              </p>
              <div className="flex gap-1.5">
                {[1000, 3000, 5000, 10000].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => updatePollingInterval(interval)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold font-mono transition-all cursor-pointer ${
                      pollingInterval === interval
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {interval / 1000}s
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Error Toggles */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Chaos Testing
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Inject connection issues to test application resilience.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSimulatedError('network')}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-xl font-semibold transition-all border cursor-pointer ${
                    simulatedErrorType === 'network'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-100 dark:hover:border-amber-800'
                  }`}
                >
                  Network Loss
                </button>
                <button
                  onClick={() => toggleSimulatedError('rateLimit')}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-xl font-semibold transition-all border cursor-pointer ${
                    simulatedErrorType === 'rateLimit'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-100 dark:hover:border-amber-800'
                  }`}
                >
                  Rate Limit
                </button>
              </div>
            </div>

            {/* Live Feed Toggle */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Live Feed Toggle
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Pause or resume background price simulation on demand.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLivePolling(!livePolling)}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-xl font-semibold transition-all border cursor-pointer ${
                    livePolling
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {livePolling ? 'Pause Feed' : 'Resume Feed'}
                </button>
                {(simulatedErrorType || pollingError) && (
                  <button
                    onClick={() => resetBackendLimits()}
                    className="py-1.5 px-3 text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                  >
                    Clear Errors
                  </button>
                )}
              </div>
            </div>

            {/* Gemini API Key Secret Setup */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-indigo-500 shrink-0" />
                Gemini API Key
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Configure custom credentials to activate live AI analysis.
              </p>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter API key..."
                  value={customApiKey || ''}
                  onChange={(e) => setCustomApiKey(e.target.value || null)}
                  className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/50 text-gray-900 dark:text-white rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                {customApiKey && (
                  <button
                    onClick={() => setCustomApiKey(null)}
                    className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Theme Customization Section */}
            <div className="col-span-1 md:col-span-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-500" />
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Theme Customization ({THEMES.length} Trading Desk Themes)
                  </h4>
                </div>
                <button
                  onClick={() => setShowThemeModal(true)}
                  id="btn-open-theme-studio-from-settings"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Open Theme Studio &rarr;
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {THEMES.map((th) => {
                  const isSelected = theme === th.id;
                  return (
                    <button
                      key={th.id}
                      onClick={() => setTheme(th.id)}
                      id={`btn-quick-theme-${th.id}`}
                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 dark:border-indigo-400 shadow-sm bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                          : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                      style={{
                        backgroundColor: isSelected ? undefined : th.colors.surface,
                      }}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 border shadow-xs"
                        style={{ backgroundColor: th.colors.primary, borderColor: th.colors.border }}
                      />
                      <span className="truncate">{th.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Extended Platform Tools Section (Moved from Sidepanel) */}
            <div className="col-span-1 md:col-span-4 pt-5 border-t border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Compass className="h-4 w-4" />
                  </div>
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">
                    Extended Workspace Tools & Radars
                  </h4>
                </div>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  Access tools and research modules moved from the sidebar
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SETTINGS_TOOLS_SECTIONS.map((section) => (
                  <div key={section.id} className="space-y-2.5">
                    <div className="pb-1.5 border-b border-gray-100 dark:border-gray-800/80">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {section.title}
                      </h5>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">
                        {section.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => {
                              setShowSettings(false);
                              setSelectedTicker(null);
                            }}
                            className="group flex items-center justify-between p-2 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700/60 bg-white/50 dark:bg-gray-800/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:scale-105 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all shrink-0">
                                <ItemIcon size={14} className={item.color} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                                  {item.name}
                                </p>
                                {item.description && (
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            {item.badge && (
                              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0 ml-1">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Authentication Modal Dialog */}
      {showAuthModal && typeof document !== 'undefined' && createPortal(
        <div 
          id="auth-modal-overlay" 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAuthModal(false);
            }
          }}
        >
          <div className="w-full max-w-md relative my-auto animate-in zoom-in-95 duration-200">
            <AuthScreen 
              onSuccess={() => setShowAuthModal(false)} 
              onClose={() => setShowAuthModal(false)} 
              isModal 
            />
          </div>
        </div>,
        document.body
      )}

      {/* Task Onboarding Modal (M10-01) */}
      <TaskOnboardingModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Theme Customizer Modal Studio */}
      <ThemeCustomizerModal
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />

      {/* Institutional Terminal Command Palette (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
      />
    </header>
  );
}
