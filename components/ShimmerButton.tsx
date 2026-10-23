'use client';

import React from 'react';

export interface ShimmerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  children: React.ReactNode;
}

/**
 * Magic UI Signature ShimmerButton component.
 * Features an internal fluid light reflection sweep that highlights high-conversion CTAs.
 */
export default function ShimmerButton({
  shimmerColor = 'rgba(255, 255, 255, 0.4)',
  borderRadius = '16px',
  shimmerDuration = '2.8s',
  background = 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
  className = '',
  children,
  onClick,
  ...props
}: ShimmerButtonProps) {
  return (
    <button
      className={`group relative inline-flex items-center justify-center overflow-hidden font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-600/20 cursor-pointer ${className}`}
      style={{
        borderRadius,
        background,
      }}
      onClick={onClick}
      {...props}
    >
      {/* Moving Shimmer Ribbon */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -translate-x-full animate-[shimmer-sweep_3s_infinite_linear] bg-gradient-to-r from-transparent via-white/25 to-transparent"
      />

      {/* Subtle Glow Backdrop */}
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Button Content */}
      <span className="relative z-10 flex items-center gap-1.5 text-white">
        {children}
      </span>
    </button>
  );
}
