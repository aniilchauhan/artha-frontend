'use client';

import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5 ${className}`}>
      {children}
    </div>
  );
}

export interface BentoCardProps {
  name: string;
  className?: string;
  background?: React.ReactNode;
  Icon?: React.ComponentType<{ className?: string }>;
  description: string;
  href?: string;
  cta?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function BentoCard({
  name,
  className = '',
  background,
  Icon,
  description,
  href,
  cta = 'Explore setup',
  badge,
  children,
}: BentoCardProps) {
  return (
    <div
      className={`group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 ${className}`}
    >
      {/* Background Graphic or Glow */}
      {background && <div className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">{background}</div>}

      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs">
                <Icon className="h-4 w-4" />
              </span>
            )}
            <h3 className="text-base font-black font-mono tracking-tight text-slate-900 dark:text-white">
              {name}
            </h3>
          </div>
          {badge && (
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
          {description}
        </p>
      </div>

      {/* Main Card Child Content */}
      {children && <div className="relative z-10 my-4">{children}</div>}

      {/* Footer CTA */}
      {href && (
        <div className="relative z-10 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <a
            href={href}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 group-hover:translate-x-0.5 transition-transform"
          >
            <span>{cta}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
