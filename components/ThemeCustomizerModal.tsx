'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useStockContext } from '../context/StockContext';
import { THEMES, ThemeDefinition, ThemeId } from '../lib/themes';
import { 
  Palette, 
  Check, 
  X, 
  Sparkles, 
  Sun, 
  Moon, 
  TrendingUp, 
  Zap, 
  Activity,
  Sliders
} from 'lucide-react';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ThemeCustomizerModal({ isOpen, onClose }: ThemeCustomizerModalProps) {
  const { theme, setTheme } = useStockContext();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  React.useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const categories = ['All', 'Classic', 'Cyber', 'Financial', 'Vibrant', 'Minimal'];

  const filteredThemes = selectedCategory === 'All'
    ? THEMES
    : THEMES.filter(t => t.category === selectedCategory);

  const activeThemeObj = THEMES.find(t => t.id === theme) || THEMES[0];

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto backdrop-blur-md bg-slate-950/80 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div 
        className="axion-workspace relative w-full max-w-4xl rounded-2xl md:rounded-3xl border shadow-2xl overflow-hidden animate-fade-up max-h-[90dvh] flex flex-col my-auto"
        style={{
          backgroundColor: 'var(--ds-surface, #18181b)',
          borderColor: 'var(--ds-border, #27272a)',
          color: 'var(--ds-text, #f4f4f5)',
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between px-5 py-4 sm:px-6 sm:py-5 border-b shrink-0"
          style={{ borderColor: 'var(--ds-border)' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl border flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.12)',
                borderColor: 'var(--ds-border)',
                color: 'var(--theme-accent, #6366f1)',
              }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="theme-modal-title" className="text-base sm:text-lg font-bold tracking-tight">
                  Theme Customization Studio
                </h3>
                <span 
                  className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold tracking-wide border"
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    borderColor: 'var(--ds-border)',
                    color: 'var(--theme-accent, #6366f1)',
                  }}
                >
                  10 Professional Themes
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Personalize Axion’s entire interface with specialized trading desk aesthetics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            style={{
              backgroundColor: 'var(--ds-raised)',
              borderColor: 'var(--ds-border)',
            }}
            aria-label="Close Theme Studio"
            id="btn-close-theme-studio"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Live Active Theme Preview Banner */}
        <div 
          className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shrink-0"
          style={{
            backgroundColor: 'var(--ds-raised)',
            borderColor: 'var(--ds-border)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0"
              style={{
                background: `linear-gradient(135deg, ${activeThemeObj.colors.primary}, ${activeThemeObj.colors.secondary})`,
              }}
            >
              {activeThemeObj.isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold truncate">Active: {activeThemeObj.name}</span>
                <span 
                  className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium"
                  style={{
                    backgroundColor: `${activeThemeObj.colors.primary}20`,
                    color: activeThemeObj.colors.primary,
                  }}
                >
                  {activeThemeObj.accentName}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                {activeThemeObj.tagline}
              </p>
            </div>
          </div>

          {/* Mini Live Interface Demo */}
          <div className="flex items-center gap-2 shrink-0">
            <div 
              className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-sm"
              style={{
                backgroundColor: 'var(--ds-surface)',
                borderColor: 'var(--ds-border)',
              }}
            >
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <span>NIFTY 50</span>
              <span className="text-emerald-500 font-mono font-bold">+1.24%</span>
            </div>

            <div 
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-white shadow-sm flex items-center gap-1"
              style={{
                backgroundColor: activeThemeObj.colors.primary,
              }}
            >
              <Zap className="h-3 w-3" />
              <span>AI ACCENT</span>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-4 pb-2 overflow-x-auto shrink-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === cat
                  ? 'shadow-sm font-bold scale-[1.02]'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
              style={selectedCategory === cat ? {
                backgroundColor: 'var(--theme-accent, #6366f1)',
                borderColor: 'transparent',
                color: '#ffffff',
              } : {
                backgroundColor: 'var(--ds-surface)',
                borderColor: 'var(--ds-border)',
              }}
              id={`btn-theme-filter-${cat.toLowerCase()}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Theme Grid */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3.5 pb-4">
            {filteredThemes.map((th) => {
              const isSelected = theme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id)}
                  id={`theme-card-${th.id}`}
                  className={`group relative text-left p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'shadow-xl scale-[1.01]'
                      : 'hover:scale-[1.008] hover:border-gray-400/50 dark:hover:border-gray-600/50'
                  }`}
                  style={{
                    backgroundColor: th.colors.surface,
                    borderColor: isSelected ? th.colors.primary : th.colors.border,
                    color: th.colors.text,
                    boxShadow: isSelected ? `0 12px 30px -10px ${th.colors.primary}35` : undefined,
                  }}
                  aria-pressed={isSelected}
                >
                  {/* Active Indicator Badge */}
                  {isSelected && (
                    <div 
                      className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md animate-fade-in"
                      style={{ backgroundColor: th.colors.primary }}
                    >
                      <Check className="h-3 w-3 stroke-[3]" />
                      <span>Active</span>
                    </div>
                  )}

                  <div>
                    {/* Theme Header with Accent Dot & Category */}
                    <div className="flex items-center gap-2 mb-2">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shadow-sm ring-2 ring-white/20"
                        style={{ backgroundColor: th.colors.primary }}
                      />
                      <h4 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                        {th.name}
                      </h4>
                      <span 
                        className="text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold opacity-75 border"
                        style={{
                          borderColor: th.colors.border,
                          backgroundColor: th.colors.canvas,
                        }}
                      >
                        {th.category}
                      </span>
                    </div>

                    <p className="text-xs opacity-75 line-clamp-2 leading-relaxed mb-3">
                      {th.tagline}
                    </p>
                  </div>

                  {/* Visual Color Palette Swatches & Mock Preview */}
                  <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: th.colors.border }}>
                    {/* Swatches */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-mono opacity-60">Palette</span>
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: th.colors.primary, borderColor: th.colors.border }}
                          title={`Accent: ${th.colors.primary}`}
                        />
                        <span 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: th.colors.secondary, borderColor: th.colors.border }}
                          title={`Secondary: ${th.colors.secondary}`}
                        />
                        <span 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: th.colors.surface, borderColor: th.colors.border }}
                          title={`Surface: ${th.colors.surface}`}
                        />
                        <span 
                          className="w-4 h-4 rounded-full border shadow-sm"
                          style={{ backgroundColor: th.colors.canvas, borderColor: th.colors.border }}
                          title={`Canvas: ${th.colors.canvas}`}
                        />
                      </div>
                    </div>

                    {/* Mini Card Preview */}
                    <div 
                      className="p-2 rounded-xl border flex items-center justify-between text-[10px] font-mono"
                      style={{
                        backgroundColor: th.colors.canvas,
                        borderColor: th.colors.border,
                      }}
                    >
                      <span className="font-bold" style={{ color: th.colors.text }}>HDFCBANK.NS</span>
                      <span className="font-bold" style={{ color: th.colors.primary }}>₹1,745.20</span>
                      <span 
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                        style={{ backgroundColor: th.colors.primary }}
                      >
                        98% AI
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between px-5 py-3.5 border-t shrink-0 text-xs"
          style={{
            backgroundColor: 'var(--ds-raised)',
            borderColor: 'var(--ds-border)',
          }}
        >
          <div className="text-gray-500 dark:text-gray-400 text-[11px] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            <span>Theme preferences automatically persist across browser reloads.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme('dark')}
              className="px-3 py-1.5 rounded-xl border font-semibold text-xs transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              style={{
                backgroundColor: 'var(--ds-surface)',
                borderColor: 'var(--ds-border)',
              }}
              id="btn-reset-default-theme"
            >
              Reset Default
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl font-bold text-xs text-white transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
              style={{
                backgroundColor: 'var(--theme-accent, #6366f1)',
              }}
              id="btn-confirm-theme"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
