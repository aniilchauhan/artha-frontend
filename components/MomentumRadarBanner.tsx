'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Flame,
  Zap,
  Target,
  ShieldAlert,
  Clock,
  Volume2,
  VolumeX,
  Bell,
  BellRing,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type { MomentumRadarSnapshot, MomentumCandidate, ImmediateSpikeAlert } from '../lib/momentum-radar-engine';
import {
  isNotificationSupported,
  requestNotificationPermission,
  sendMomentumNotification,
  playMomentumAlertChime,
  isAudioSupported,
} from '../lib/sound-notifications';
import { isNSEMarketOpen, getMarketSessionInfo } from '../lib/market-hours';
import { useStockContext } from '../context/StockContext';
import QuickTradeModal from './QuickTradeModal';

export default function MomentumRadarBanner() {
  const { setSelectedTicker, setActiveTab, addToast } = useStockContext();
  const [snapshot, setSnapshot] = useState<MomentumRadarSnapshot | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);
  const [loading, setLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [desktopAlerts, setDesktopAlerts] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState(false);
  const [tradeModalStock, setTradeModalStock] = useState<any | null>(null);
  const lastSeenPickRef = useRef<string | null>(null);
  const lastSeenSpikeRef = useRef<string | null>(null);

  // Check desktop notification permission on mount
  useEffect(() => {
    if (isNotificationSupported() && typeof Notification !== 'undefined') {
      setDesktopAlerts(Notification.permission === 'granted');
    }
  }, []);

  // Fetch latest radar snapshot
  const fetchRadar = async (isManual = false) => {
    if (isManual) setLoading(true);
    try {
      const res = await fetch('/api/stock-ai/momentum-radar', {
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (json?.success && json?.data) {
        const snap: MomentumRadarSnapshot = json.data;
        setSnapshot(snap);

        // Check if top pick changed (strictly guarded against weekend & off-hours alert spam)
        const marketOpen = isNSEMarketOpen();
        if (snap.topPick) {
          if (lastSeenPickRef.current === null) {
            // First load: only toast during active market hours
            if (marketOpen) {
              addToast(
                `Live 5-Min Pick: ${snap.topPick.ticker} @ ₹${snap.topPick.currentPrice.toFixed(2)} (Target: ₹${snap.topPick.targetPrice.toFixed(2)} +${snap.topPick.targetPct}%)`,
                'info',
                snap.topPick.ticker
              );
            }
          } else if (snap.topPick.ticker !== lastSeenPickRef.current) {
            // New 5-minute pick arrived!
            if (marketOpen) {
              onNewPickDiscovered(snap.topPick);
            }
          }
          lastSeenPickRef.current = snap.topPick.ticker;
        }

        // Check if new immediate spike arrived (guarded by active market hours)
        if (snap.activeSpikes && snap.activeSpikes.length > 0) {
          const newestSpike = snap.activeSpikes[0];
          if (newestSpike.id !== lastSeenSpikeRef.current) {
            if (lastSeenSpikeRef.current !== null && marketOpen) {
              onImmediateSpikeDiscovered(newestSpike);
            }
            lastSeenSpikeRef.current = newestSpike.id;
          }
        }
      }
    } catch {
      // Offline / silent retry
    } finally {
      if (isManual) setLoading(false);
    }
  };

  const testNotificationAndAudio = async () => {
    // 1. Play sound chime (force = true for intentional manual test)
    playMomentumAlertChime(true);

    // 2. Request permission if not already granted
    let hasPerm = desktopAlerts;
    if (!hasPerm && isNotificationSupported()) {
      const perm = await requestNotificationPermission();
      hasPerm = perm === 'granted';
      setDesktopAlerts(hasPerm);
    }

    // 3. Dispatch desktop notification
    const top = snapshot?.topPick;
    const title = top
      ? `🚀 [RADAR ALERT] +10% Runner: ${top.ticker}`
      : '⚡ [RADAR ALERT] 5-Min Scanner Active';
    const body = top
      ? `Price: ₹${top.currentPrice.toFixed(2)} | Target: ₹${top.targetPrice.toFixed(2)} (+${top.targetPct}%) | Conviction: ${top.convictionScore}%`
      : 'Axion is scanning every 5 minutes for +2% intraday and +10% circuit moves.';

    if (hasPerm) {
      sendMomentumNotification(title, body, 'radar-test', true);
    }

    addToast(
      hasPerm
        ? '🔊 Alert Chime Played & Desktop Notification Dispatched!'
        : '🔊 Alert Chime Played! (Click "Allow" in browser to see desktop banners)',
      hasPerm ? 'success' : 'info'
    );
  };

  const onNewPickDiscovered = (pick: MomentumCandidate) => {
    if (!isNSEMarketOpen()) return; // Never fire automated alerts outside NSE market session
    const isTenPct = pick.targetType === '10_PERCENT_SURGE';
    const title = isTenPct ? `🚀 +10% Circuit Runner: ${pick.ticker}` : `🎯 +2% Intraday Target: ${pick.ticker}`;
    const body = `Price: ₹${pick.currentPrice.toFixed(2)} | Target: ₹${pick.targetPrice.toFixed(2)} (+${pick.targetPct}%) | Conviction: ${pick.convictionScore}%`;

    if (audioEnabled) {
      playMomentumAlertChime();
    }
    if (desktopAlerts) {
      sendMomentumNotification(title, body, `radar-pick-${pick.ticker}`);
    }
    addToast(body, 'success', pick.ticker);
  };

  const onImmediateSpikeDiscovered = (spike: ImmediateSpikeAlert) => {
    if (!isNSEMarketOpen()) return; // Never fire automated alerts outside NSE market session
    const title = `⚡ IMMEDIATE MOMENTUM SPIKE: ${spike.ticker}`;
    const body = `${spike.headline} · Price: ₹${spike.currentPrice.toFixed(2)} (+${spike.surgePct.toFixed(1)}%)`;

    if (audioEnabled) {
      playMomentumAlertChime();
    }
    if (desktopAlerts) {
      sendMomentumNotification(title, body, `radar-spike-${spike.ticker}`);
    }
    addToast(body, 'warning', spike.ticker);
  };

  const toggleDesktopNotifications = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      setDesktopAlerts(true);
      addToast('Desktop momentum notifications enabled!', 'success');
      sendMomentumNotification('Axion Momentum Radar', 'Desktop push notifications are active for 5-minute stock picks.', 'momentum-radar-alert', true);
    } else {
      setDesktopAlerts(false);
      addToast('Desktop notifications permission denied in browser.', 'info');
    }
  };

  // Initial fetch and dynamic polling: 15s during active market hours, 5m idle when closed/weekend
  useEffect(() => {
    fetchRadar();
    const marketOpen = isNSEMarketOpen();
    if (!marketOpen) {
      // Off-hours/Weekend: idle heartbeat, resume rapid polling when market opens
      const idleInterval = setInterval(() => {
        if (isNSEMarketOpen()) {
          fetchRadar();
        }
      }, 5 * 60 * 1000);
      return () => clearInterval(idleInterval);
    }
    const pollInterval = setInterval(() => {
      fetchRadar();
    }, 15_000);
    return () => clearInterval(pollInterval);
  }, [audioEnabled, desktopAlerts]);

  // Dynamic 1-second countdown to the next 5-minute cycle
  useEffect(() => {
    const timer = setInterval(() => {
      if (snapshot?.nextCycleAt) {
        const diffMs = new Date(snapshot.nextCycleAt).getTime() - Date.now();
        const secs = Math.max(0, Math.floor(diffMs / 1000));
        setSecondsRemaining(secs % 300);
        if (secs <= 0) {
          fetchRadar();
        }
      } else {
        const now = Date.now();
        const nextBound = Math.ceil(now / (5 * 60 * 1000)) * (5 * 60 * 1000);
        const secs = Math.max(0, Math.floor((nextBound - now) / 1000));
        setSecondsRemaining(secs);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [snapshot]);

  const formatCountdown = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const pick = snapshot?.topPick;
  const twoPercentCandidate = snapshot?.twoPercentCandidate;
  const isTenPct = pick?.targetType === '10_PERCENT_SURGE';
  const activeSpikes = snapshot?.activeSpikes || [];

  return (
    <div
      aria-label="5-Minute Momentum Radar"
      id="momentum-radar-dock"
      className="relative overflow-hidden rounded-2xl border border-indigo-200/90 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 text-white shadow-xl dark:border-indigo-800/60"
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-20 -bottom-20 h-56 w-56 rounded-full bg-teal-500/15 blur-3xl" />

      {/* Top Header / Meta Row */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-slate-950 shadow-md">
            <Flame className="h-4 w-4 fill-current animate-pulse text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black uppercase tracking-wider text-amber-300">
                🎯 2% Small-Cap AI Prediction Radar
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">(5-Min Momentum Radar)</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-teal-500/40 bg-teal-500/20 px-2 py-0.5 text-[10px] font-bold text-teal-300">
                <span className="h-1.5 w-1.5 rounded-full animate-ping bg-teal-400" />
                Live Market Scanner
              </span>
              <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                Priority #1 • Evaluated Every 5m
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Evaluates every 5 minutes for +2% Day Returns or +10% Circuit Surges · Instant alerts on early spikes
            </p>
          </div>
        </div>

        {/* Controls: Audio, Push Notification, Countdown & Refresh */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`cursor-pointer rounded-lg border p-1.5 transition-colors ${
              audioEnabled
                ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            title={audioEnabled ? 'Audio chime alert active' : 'Audio chime muted'}
          >
            {audioEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>

          {/* Desktop Push Notifications Toggle */}
          <button
            onClick={toggleDesktopNotifications}
            className={`cursor-pointer rounded-lg border p-1.5 transition-colors ${
              desktopAlerts
                ? 'border-indigo-500/40 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
            title={desktopAlerts ? 'Desktop push notifications enabled' : 'Click to enable desktop notifications'}
          >
            {desktopAlerts ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          </button>

          {/* Test Sound & Alert Button */}
          <button
            onClick={testNotificationAndAudio}
            className="flex items-center gap-1.5 rounded-lg border border-teal-500/40 bg-teal-500/20 px-2.5 py-1 text-xs font-bold text-teal-200 transition-colors hover:bg-teal-500/30 cursor-pointer"
            title="Click to test alert chime and desktop notification"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Test Alert 🔔</span>
          </button>

          {/* Un-permitted notification prompt pill */}
          {!desktopAlerts && (
            <button
              onClick={toggleDesktopNotifications}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-amber-500/60 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-200 animate-pulse hover:bg-amber-500/30 cursor-pointer"
              title="Browser notifications are currently inactive. Click to enable."
            >
              <Bell className="h-3 w-3" />
              <span>Enable Browser Alerts</span>
            </button>
          )}

          {/* 5-Minute Countdown Pill */}
          <div className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/15 px-2.5 py-1 font-mono text-xs font-bold text-amber-200">
            <Clock className="h-3.5 w-3.5 text-amber-300" />
            <span>
              Next 5-min update in: {formatCountdown(secondsRemaining || 300)}
            </span>
          </div>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchRadar(true)}
            disabled={loading}
            className="cursor-pointer rounded-lg border border-white/15 bg-white/10 p-1.5 text-slate-300 transition-colors hover:bg-white/20 disabled:opacity-50"
            title="Scan market now"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Immediate Momentum Spike Anomaly Banner (Shown if triggered earlier than 5 minutes) */}
      {activeSpikes.length > 0 && (
        <div className="relative z-10 mt-3 animate-pulse rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-950/80 to-rose-950/80 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                {activeSpikes[0].headline}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-white">
                ₹{activeSpikes[0].currentPrice.toFixed(2)} (+{activeSpikes[0].surgePct.toFixed(1)}%)
              </span>
              <button
                onClick={() => {
                  setSelectedTicker(activeSpikes[0].ticker);
                  setActiveTab('dashboard');
                }}
                className="cursor-pointer rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-400"
              >
                Inspect Spike →
              </button>
            </div>
          </div>
          <p className="mt-1 text-[11px] text-amber-200/90">{activeSpikes[0].reason}</p>
        </div>
      )}

      {/* Current Top Pick of the 5-Minute Window & 2% Small Cap Setups */}
      {pick || twoPercentCandidate ? (
        <div className="relative z-10 mt-3.5 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {twoPercentCandidate && (
              <div className="relative flex-1 rounded-2xl border border-teal-500/40 bg-teal-950/20 p-4 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-white font-mono">
                      {twoPercentCandidate.ticker}
                    </span>
                    <span className="text-xs text-slate-300">({twoPercentCandidate.name})</span>
                    <span className="rounded-full border border-teal-400/50 bg-teal-400/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-teal-300">
                      🎯 +2% Small-Cap Target
                    </span>
                    <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                      {twoPercentCandidate.convictionScore}% Conviction
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{twoPercentCandidate.setupSummary}</p>
                {twoPercentCandidate.breakoutTrigger && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-300/90">
                    <Zap className="h-3 w-3 shrink-0" />
                    <span>{twoPercentCandidate.breakoutTrigger}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 font-mono">
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400">Current Price</span>
                      <span className="text-xs sm:text-sm font-black text-white">₹{twoPercentCandidate.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono">
                      <span className="block text-[8px] uppercase tracking-wider text-emerald-400">Target (+{twoPercentCandidate.targetPct}%)</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-300">₹{twoPercentCandidate.targetPrice.toFixed(2)}</span>
                    </div>
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono">
                      <span className="block text-[8px] uppercase tracking-wider text-rose-400">Stop Loss</span>
                      <span className="text-xs sm:text-sm font-black text-rose-300">₹{twoPercentCandidate.stopLossPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTicker(twoPercentCandidate.ticker);
                        setActiveTab('dashboard');
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
                    >
                      <span>Inspect Stock</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setTradeModalStock(twoPercentCandidate)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:opacity-95"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Price Scenario</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {pick && (!twoPercentCandidate || pick.ticker !== twoPercentCandidate.ticker) && (
              <div className="relative flex-1 rounded-2xl border border-white/10 bg-white/5 p-4 transition-all duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-white font-mono">
                      {pick.ticker}
                    </span>
                    <span className="text-xs text-slate-300">({pick.name})</span>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                        isTenPct
                          ? 'border-amber-400/50 bg-amber-400/20 text-amber-300'
                          : 'border-teal-400/50 bg-teal-400/20 text-teal-300'
                      }`}
                    >
                      {isTenPct ? '🚀 +10% Circuit Runner' : '🎯 +2% Intraday Target'}
                    </span>
                    {pick.marketCapTier && (
                      <span className="rounded-full border border-amber-400/60 bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                        💎 {pick.marketCapTier.replace('_', ' ')}
                      </span>
                    )}
                    <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-2.5 py-0.5 text-[10px] font-bold text-indigo-300">
                      {pick.convictionScore}% Conviction
                    </span>
                  </div>
                </div>

                <p className="mt-2 text-xs text-slate-300 leading-relaxed">{pick.setupSummary}</p>
                {pick.breakoutTrigger && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-300/90">
                    <Zap className="h-3 w-3 shrink-0" />
                    <span>{pick.breakoutTrigger}</span>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 font-mono">
                      <span className="block text-[8px] uppercase tracking-wider text-slate-400">Current Price</span>
                      <span className="text-xs sm:text-sm font-black text-white">₹{pick.currentPrice.toFixed(2)}</span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono">
                      <span className="block text-[8px] uppercase tracking-wider text-emerald-400">Target (+{pick.targetPct}%)</span>
                      <span className="text-xs sm:text-sm font-black text-emerald-300">₹{pick.targetPrice.toFixed(2)}</span>
                    </div>
                    <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 font-mono">
                      <span className="block text-[8px] uppercase tracking-wider text-rose-400">Stop Loss</span>
                      <span className="text-xs sm:text-sm font-black text-rose-300">₹{pick.stopLossPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTicker(pick.ticker);
                        setActiveTab('dashboard');
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-teal-500 px-3 py-1.5 text-xs font-bold text-white shadow-md transition-all hover:opacity-95"
                    >
                      <span>Inspect Stock</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setTradeModalStock(pick)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:opacity-95"
                    >
                      <Zap className="h-3.5 w-3.5 fill-current" />
                      <span>Price Scenario</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-300 transition-colors hover:bg-white/20"
              title="View recent 5-min picks"
            >
              {showHistory ? 'Hide History' : 'Picks History'}
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/post-ipo';
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 text-xs font-bold text-amber-200 transition-all hover:bg-amber-500/30"
              title="View Fresh Post-IPO Breakout Runners (+50% to +100%)"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>IPO 15D Surges (+50% to +100%) ⚡</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="relative z-10 mt-3 text-xs text-slate-400">
          Scanning market universe for the next high-conviction breakout setup...
        </div>
      )}

      {/* Expanded Session Picks History Drawer */}
      {showHistory && snapshot?.recentHistory && snapshot.recentHistory.length > 0 && (
        <div className="relative z-10 mt-4 border-t border-white/10 pt-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Recent 5-Minute Cycle Discoveries ({snapshot.recentHistory.length})
          </span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {snapshot.recentHistory.map((item, idx) => (
              <button
                key={`${item.ticker}-${idx}`}
                onClick={() => {
                  setSelectedTicker(item.ticker);
                  setActiveTab('dashboard');
                }}
                className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-2 text-left transition-colors hover:border-indigo-400/50 hover:bg-white/10"
              >
                <div className="flex items-center justify-between font-mono text-xs font-black text-white">
                  <span>{item.ticker}</span>
                  <span
                    className={`text-[9px] ${
                      item.targetType === '10_PERCENT_SURGE' ? 'text-amber-400' : 'text-teal-400'
                    }`}
                  >
                    {item.targetType === '10_PERCENT_SURGE' ? '+10%' : '+2%'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>₹{item.entryPrice.toFixed(0)}</span>
                  <span>Target: ₹{item.targetPrice.toFixed(0)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Trade Modal */}
      {tradeModalStock && (
        <QuickTradeModal
          isOpen={true}
          onClose={() => setTradeModalStock(null)}
          ticker={tradeModalStock.ticker}
          name={tradeModalStock.name}
          currentPrice={tradeModalStock.currentPrice}
          initialTargetPct={tradeModalStock.targetPct || 2.0}
        />
      )}
    </div>
  );
}
