/**
 * Mobile-Optimized UI Components for Axion Dashboard
 * Provides touch-friendly, responsive components for mobile screens
 */

'use client';

import React, { ReactNode } from 'react';
import { ChevronDown, ChevronUp, Menu, X } from 'lucide-react';

interface MobileCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/**
 * Mobile-optimized card with proper touch targets (min 44x44px)
 */
export function MobileCard({ children, className = '', onClick }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        rounded-2xl p-4 min-h-[44px]
        bg-white dark:bg-slate-900
        border border-slate-200 dark:border-slate-800
        shadow-sm
        ${onClick ? 'active:scale-98 active:shadow-none transition-transform' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

interface MobileButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  fullWidth?: boolean;
  disabled?: boolean;
}

/**
 * Mobile-optimized button with large touch target
 */
export function MobileButton({
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
}: MobileButtonProps) {
  const baseClasses = 'min-h-[44px] px-4 py-2.5 rounded-xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white active:bg-indigo-700 shadow-md active:shadow-sm',
    secondary: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white active:bg-slate-200 dark:active:bg-slate-700',
    ghost: 'text-slate-700 dark:text-slate-300 active:bg-slate-100 dark:active:bg-slate-800',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
      `}
    >
      {children}
    </button>
  );
}

interface MobileTabsProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onChange: (tabId: string) => void;
}

/**
 * Mobile-optimized horizontal scrolling tabs
 */
export function MobileTabs({ tabs, activeTab, onChange }: MobileTabsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            flex items-center gap-1.5 px-4 py-2 rounded-lg
            text-sm font-medium whitespace-nowrap
            min-h-[44px] min-w-[80px]
            transition-all
            ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:bg-slate-200 dark:active:bg-slate-700'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`
              text-xs px-1.5 py-0.5 rounded-md font-bold
              ${activeTab === tab.id ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

interface MobileAccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

/**
 * Mobile-friendly accordion/collapsible section
 */
export function MobileAccordion({ title, children, defaultOpen = false }: MobileAccordionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-4 px-4 min-h-[44px] text-left active:bg-slate-50 dark:active:bg-slate-900"
      >
        <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-5 w-5 text-slate-500" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-500" />
        )}
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

/**
 * Mobile bottom sheet for overlays and modals
 */
export function MobileBottomSheet({ isOpen, onClose, title, children }: MobileBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
        <div className="bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
          
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 rounded-lg active:bg-slate-100 dark:active:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {/* Content */}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </>
  );
}

/**
 * Mobile-optimized grid with proper spacing
 */
export function MobileGrid({ children, columns = 1 }: { children: ReactNode; columns?: 1 | 2 }) {
  return (
    <div className={`grid gap-3 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {children}
    </div>
  );
}

/**
 * Mobile touch-friendly stock card
 */
interface MobileStockCardProps {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  onClick?: () => void;
}

export function MobileStockCard({
  ticker,
  name,
  price,
  change,
  changePercent,
  onClick,
}: MobileStockCardProps) {
  const isPositive = changePercent >= 0;
  
  return (
    <MobileCard onClick={onClick} className="active:scale-98">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="font-bold text-base text-slate-900 dark:text-white truncate">
            {ticker}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {name}
          </div>
        </div>
        
        <div className="text-right ml-3">
          <div className="font-bold text-base text-slate-900 dark:text-white">
            ₹{price.toFixed(2)}
          </div>
          <div className={`text-xs font-semibold ${
            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
          </div>
        </div>
      </div>
    </MobileCard>
  );
}

/**
 * Mobile-optimized section header
 */
export function MobileSectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
      {action}
    </div>
  );
}

/**
 * Mobile-friendly empty state
 */
export function MobileEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="text-slate-400 dark:text-slate-600 mb-3">
        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  );
}

/**
 * Mobile pull-to-refresh indicator
 */
export function MobilePullRefresh({ isPulling }: { isPulling: boolean }) {
  return (
    <div className={`
      text-center py-4 transition-all
      ${isPulling ? 'opacity-100' : 'opacity-0'}
    `}>
      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent" />
    </div>
  );
}
