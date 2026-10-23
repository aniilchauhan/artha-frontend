'use client';


import { axionFetch as fetch } from '../lib/in-process';
import React, { useState, useEffect } from 'react';
import {
  Send,
  Check,
  X,
  AlertTriangle,
  Radio,
  Sliders,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { WebhookProvider } from '../lib/webhook-dispatcher';
import type { GapItem } from '../lib/gap-types';

export interface WebhookConfig {
  provider: WebhookProvider;
  webhookUrl: string;
  telegramBotToken: string;
  telegramChatId: string;
  minGapPercent: number;
  minRvol: number;
  enabled: boolean;
}

const STORAGE_KEY = 'axion_webhook_config';

const DEFAULT_CONFIG: WebhookConfig = {
  provider: 'discord',
  webhookUrl: '',
  telegramBotToken: '',
  telegramChatId: '',
  minGapPercent: 1.5,
  minRvol: 1.5,
  enabled: true,
};

interface WebhookConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigSaved?: (config: WebhookConfig) => void;
}

export default function WebhookConfigModal({
  isOpen,
  onClose,
  onConfigSaved,
}: WebhookConfigModalProps) {
  const [config, setConfig] = useState<WebhookConfig>(DEFAULT_CONFIG);
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
        }
      } catch {
        // Fallback to default
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      setSaveSuccess(true);
      if (onConfigSaved) onConfigSaved(config);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch {
      alert('Failed to save webhook settings to browser storage');
    }
  };

  const handleTestPing = async () => {
    setIsTesting(true);
    setTestStatus(null);

    // Mock representative sample gap
    const mockItem: GapItem = {
      ticker: 'RELIANCE.NS',
      symbol: 'RELIANCE',
      name: 'Reliance Industries Limited',
      sector: 'Energy',
      marketCap: 1980000,
      marketCapCategory: 'LARGE_CAP',
      previousClose: 1250,
      openPrice: 1285,
      currentPrice: 1290,
      highPrice: 1295,
      lowPrice: 1280,
      gapAmount: 35,
      gapPercent: 2.8,
      currentChangePercent: 3.2,
      dayChangeFromOpenPercent: 0.39,
      direction: 'GAP_UP',
      classification: 'STRONG_GAP_UP',
      setupType: 'GAP_AND_GO',
      fillStatus: 'UNFILLED',
      fillPercent: 0,
      volume: 4500000,
      relativeVolume: 2.1,
      tradeLevels: {
        entryPrice: 1290,
        targetPrice: 1322.25,
        stopLossPrice: 1272.5,
        rewardRiskRatio: 1.84,
        maxRiskPercent: 1.36,
        projectedProfitPercent: 2.5,
        gapSlippageWarning: false,
      },
      riskRating: 'MODERATE',
      analysisSummary: 'Test alert from Axion Gap Screener. Strong opening gap setup with 2.1x RVOL.',
      isExtendedGap: false,
    };

    try {
      const res = await fetch('/api/webhooks/gap-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gapItem: mockItem,
          options: {
            provider: config.provider,
            webhookUrl: config.webhookUrl,
            telegramBotToken: config.telegramBotToken,
            telegramChatId: config.telegramChatId,
            customMessage: '🔔 Axion Webhook Test Ping: Connection Verified!',
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({
          success: true,
          text: `Delivered test alert successfully to ${config.provider.toUpperCase()}!`,
        });
      } else {
        setTestStatus({
          success: false,
          text: data?.result?.error || data?.error || 'Webhook delivery failed. Verify endpoint URL.',
        });
      }
    } catch (err: any) {
      setTestStatus({
        success: false,
        text: err?.message || 'Network error attempting to dispatch webhook ping.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-7">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Radio size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Live Webhook Alert Dispatcher
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Real-time gap signals to Discord, Slack, or Telegram
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Platform Selection */}
        <div className="mb-4">
          <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-2">
            Target Platform
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['discord', 'slack', 'telegram'] as WebhookProvider[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setConfig({ ...config, provider: p })}
                className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer border ${
                  config.provider === p
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Connection Parameters */}
        {config.provider === 'telegram' ? (
          <div className="space-y-3 mb-5">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                Telegram Bot Token
              </label>
              <input
                type="password"
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                value={config.telegramBotToken}
                onChange={e => setConfig({ ...config, telegramBotToken: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
                Chat ID or Channel Username
              </label>
              <input
                type="text"
                placeholder="@mychannel or -10012345678"
                value={config.telegramChatId}
                onChange={e => setConfig({ ...config, telegramChatId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <label className="text-[10px] font-mono font-bold uppercase text-slate-400 block mb-1">
              {config.provider === 'discord' ? 'Discord Webhook URL' : 'Slack Incoming Webhook URL'}
            </label>
            <input
              type="url"
              placeholder={
                config.provider === 'discord'
                  ? 'https://discord.com/api/webhooks/...'
                  : 'https://hooks.slack.com/services/...'
              }
              value={config.webhookUrl}
              onChange={e => setConfig({ ...config, webhookUrl: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}

        {/* Filter Thresholds */}
        <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
          <div>
            <label className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
              Min Gap Size (%)
            </label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="5.0"
              value={config.minGapPercent}
              onChange={e =>
                setConfig({ ...config, minGapPercent: Number(e.target.value) || 1.0 })
              }
              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="text-[10px] font-mono text-slate-400 block uppercase mb-1">
              Min Relative Volume
            </label>
            <input
              type="number"
              step="0.5"
              min="1.0"
              max="10.0"
              value={config.minRvol}
              onChange={e => setConfig({ ...config, minRvol: Number(e.target.value) || 1.5 })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Test Result Feedback */}
        {testStatus && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-medium flex items-start gap-2 ${
              testStatus.success
                ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            {testStatus.success ? (
              <ShieldCheck size={16} className="shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-rose-500" />
            )}
            <span>{testStatus.text}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleTestPing}
            disabled={isTesting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={13} className={isTesting ? 'animate-bounce' : ''} />
            {isTesting ? 'Testing...' : 'Test Webhook Ping'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            {saveSuccess ? <Check size={14} /> : null}
            {saveSuccess ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
