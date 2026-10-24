'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '../lib/workspace-router';
import {
  Compass,
  CheckCircle2,
  Circle,
  ArrowRight,
  ArrowLeft,
  X,
  UserCheck,
  Bookmark,
  Radar,
  Bell,
  Briefcase,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  badge: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  tips: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'account',
    title: 'Account & Pilot Session',
    badge: 'Step 1 of 5',
    description: 'Connect your trader profile to retain watchlists, custom alerts, screener filters, and paper execution records securely across web and mobile.',
    actionLabel: 'Open Account Center',
    actionUrl: '/auth',
    tips: [
      'Cross-platform Bearer tokens sync watchlists between mobile and web.',
      'Guest pilot sessions retain local state until authenticated.',
    ],
  },
  {
    id: 'watchlist',
    title: 'Custom Watchlist & Tagging',
    badge: 'Step 2 of 5',
    description: 'Monitor Indian equities across NSE/BSE with live quote freshness, RSI-14 indicators, and organized multi-list custom tags.',
    actionLabel: 'View Watchlist',
    actionUrl: '/watchlist',
    tips: [
      'Organize symbols into custom groups (e.g., Core Holdings, Breakouts).',
      'All prices reflect verifiable provider observations; zero demo numbers.',
    ],
  },
  {
    id: 'scanner',
    title: 'Quantitative Opportunity Screener',
    badge: 'Step 3 of 5',
    description: 'Scan the market for high relative volume (RVOL), post-IPO momentum, gap breakaway candidates, and quantitative probability models.',
    actionLabel: 'Explore Screener',
    actionUrl: '/opportunities',
    tips: [
      'Save custom multi-factor filters (e.g., Score > 75, RVOL > 2.0x).',
      'Indicator scores are rule-based readings, not calibrated probabilities or guaranteed outcomes.',
    ],
  },
  {
    id: 'alerts',
    title: 'Gap Scanner Alerts',
    badge: 'Step 4 of 5',
    description: 'Review current gap candidates and the alert controls available for each setup.',
    actionLabel: 'Open Gap Scanner',
    actionUrl: '/gap-analysis',
    tips: [
      'Confirm alert delivery and worker status before relying on notifications.',
      'An alert identifies a configured threshold; it does not imply a trade recommendation.',
    ],
  },
  {
    id: 'portfolio',
    title: 'Paper Portfolio & Realism Engine',
    badge: 'Step 5 of 5',
    description: 'Test strategies with simulated ₹1,00,000 cash balance, conservative stop-first priority fills, and realistic statutory friction (STT, brokerage, slippage).',
    actionLabel: 'Open Paper Portfolio',
    actionUrl: '/paper-predictions',
    tips: [
      'All paper fills include realistic 15 bps round-trip fees and slippage.',
      'Check reconciled ledger history for idempotent session performance.',
    ],
  },
];

interface TaskOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (url: string) => void;
}

export default function TaskOnboardingModal({
  isOpen,
  onClose,
  onNavigate,
}: TaskOnboardingModalProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const router = useRouter();
  const dismiss = useCallback(() => {
    try { localStorage.setItem('axion_onboarding_dismissed', 'true'); } catch { /* Optional storage. */ }
    closeRef.current();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('axion_onboarding_completed_steps');
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setCompletedSteps(Object.fromEntries(ONBOARDING_STEPS.map(step =>
            [step.id, (parsed as Record<string, unknown>)[step.id] === true])));
        }
      }
    } catch {
      // LocalStorage unavailable in SSR
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); dismiss(); return; }
      if (e.key === 'Tab') {
        const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]') ?? []);
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        return;
      }
      if (e.target instanceof HTMLElement && e.target.matches('input, textarea, select, [contenteditable="true"]')) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.min(ONBOARDING_STEPS.length - 1, prev + 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentStepIndex((prev) => Math.max(0, prev - 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  const currentStep = ONBOARDING_STEPS[currentStepIndex];
  const stepIcons = [UserCheck, Bookmark, Radar, Bell, Briefcase];
  const CurrentIcon = stepIcons[currentStepIndex] || Compass;

  const toggleStepCompleted = (stepId: string) => {
    const updated = { ...completedSteps, [stepId]: !completedSteps[stepId] };
    setCompletedSteps(updated);
    try {
      localStorage.setItem('axion_onboarding_completed_steps', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const handleFinish = dismiss;

  const handleActionClick = (url: string) => {
    // Opening a page does not complete the task.
    dismiss();
    if (onNavigate) {
      onNavigate(url);
    } else {
      router.push(url);
    }
  };

  const completedCount = ONBOARDING_STEPS.filter(step => completedSteps[step.id]).length;
  const progressPercent = Math.round((completedCount / ONBOARDING_STEPS.length) * 100);

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-modal-title"
      onClick={event => { if (event.target === event.currentTarget) dismiss(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[90dvh]">
        {/* Header */}
        <div className="shrink-0 px-4 sm:px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 id="onboarding-modal-title" className="text-lg font-bold text-white tracking-tight flex flex-wrap items-center gap-2">
                Axion quick tour
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  {completedCount}/{ONBOARDING_STEPS.length} Completed
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Explore the tools and track your setup progress.
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            className="shrink-0 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close onboarding guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div role="progressbar" aria-label="Tour tasks completed" aria-valuemin={0} aria-valuemax={ONBOARDING_STEPS.length} aria-valuenow={completedCount} className="shrink-0 w-full bg-slate-800 h-1.5 overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Step Indicator Tabs */}
        <div className="shrink-0 px-4 sm:px-6 py-3 bg-slate-950/50 border-b border-slate-800/80 flex items-center overflow-x-auto gap-2">
          {ONBOARDING_STEPS.map((step, idx) => {
            const isCurrent = idx === currentStepIndex;
            const isDone = Boolean(completedSteps[step.id]);
            return (
              <button
                key={step.id}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => setCurrentStepIndex(idx)}
                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isCurrent
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : isDone
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 opacity-60 shrink-0" />
                )}
                <span>{['Account', 'Watchlist', 'Screener', 'Alerts', 'Paper trading'][idx]}</span>
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-0 p-4 sm:p-6 overflow-y-auto overscroll-contain space-y-5 flex-1">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-inner">
              <CurrentIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                {currentStep.badge}
              </span>
              <h3 className="text-xl font-bold text-white">
                {currentStep.title}
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed pt-1">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Useful tips
            </div>
            <ul className="space-y-1.5 pl-5 list-disc text-xs text-slate-400 leading-normal">
              {currentStep.tips.map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* Step Completion Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800">
            <span className="text-xs text-slate-400">Mark this task as finished:</span>
            <button
              onClick={() => toggleStepCompleted(currentStep.id)}
              aria-pressed={Boolean(completedSteps[currentStep.id])}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                completedSteps[currentStep.id]
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
              }`}
            >
              {completedSteps[currentStep.id] ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Completed
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5" />
                  Mark as Done
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="shrink-0 px-4 sm:px-6 py-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <button
              disabled={currentStepIndex === ONBOARDING_STEPS.length - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(ONBOARDING_STEPS.length - 1, prev + 1))}
              className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
            >
              Next
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleActionClick(currentStep.actionUrl)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
            >
              <span>{currentStep.actionLabel}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleFinish}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Close tour
            </button>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}
