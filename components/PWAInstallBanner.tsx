'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Smartphone, Zap, Bell, Wifi, ChevronRight, Shield } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAInstallBannerProps {
  /** Delay before showing the banner (ms). Default: 5000 (5 seconds) */
  showDelay?: number;
}

export default function PWAInstallBanner({ showDelay = 5000 }: PWAInstallBannerProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Check if already installed
  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NEXT_PUBLIC_AXION_BASE_PATH) return;

    // Check if running as standalone PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const dismissedAt = localStorage.getItem('axion-pwa-dismissed');
    if (dismissedAt) {
      const dismissedMs = Date.parse(dismissedAt);
      // Re-show after 7 days
      if (Date.now() - dismissedMs < 7 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show banner after delay
      setTimeout(() => {
        setShowBanner(true);
      }, showDelay);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [showDelay]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      }
    } catch {
      // User cancelled or prompt failed
    } finally {
      setInstalling(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('axion-pwa-dismissed', new Date().toISOString());
  }, []);

  // Don't render if already installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !showBanner || !deferredPrompt) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/30 backdrop-blur-sm transition-opacity duration-500"
        onClick={handleDismiss}
        aria-hidden
      />

      {/* Banner */}
      <div className="pwa-install-banner fixed bottom-0 left-0 right-0 z-[9999] animate-slide-up">
        <div className="mx-auto max-w-2xl px-4 pb-4">
          <div className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 shadow-2xl shadow-indigo-500/10">
            {/* Decorative glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl" />

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
              aria-label="Dismiss install banner"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <Download size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-white">
                  Install Artha AI
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Get instant access with offline support & push alerts
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { icon: Zap, text: 'Instant Launch', color: 'text-amber-400' },
                { icon: Bell, text: 'Push Alerts', color: 'text-indigo-400' },
                { icon: Wifi, text: 'Offline Ready', color: 'text-emerald-400' },
                { icon: Shield, text: 'Full Screen Mode', color: 'text-purple-400' },
              ].map(({ icon: Icon, text, color }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2"
                >
                  <Icon size={14} className={color} />
                  <span className="text-xs font-medium text-slate-300">{text}</span>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] disabled:opacity-60"
              >
                {installing ? (
                  <span className="animate-pulse">Installing…</span>
                ) : (
                  <>
                    <Smartphone size={16} />
                    Install App
                    <ChevronRight size={14} className="opacity-60" />
                  </>
                )}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl border border-slate-700 px-4 py-3 text-xs font-semibold text-slate-400 transition-all hover:border-slate-600 hover:text-slate-300"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </>
  );
}
