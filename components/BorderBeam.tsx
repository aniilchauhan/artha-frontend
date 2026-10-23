'use client';

import React from 'react';

export interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  borderWidth?: number;
  colorFrom?: string;
  colorTo?: string;
}

/**
 * Aceternity / Magic UI signature BorderBeam component.
 * Creates an ultra-smooth traveling laser edge around cards and panels.
 */
export default function BorderBeam({
  className = '',
  size = 180,
  duration = 6,
  borderWidth = 1.5,
  colorFrom = '#10b981',
  colorTo = '#6366f1',
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] z-0 ${className}`}
    >
      {/* Spinning Conic Laser Beam */}
      <div
        className="absolute inset-[-150%] animate-spin-slow opacity-80"
        style={{
          background: `conic-gradient(from 0deg, transparent 0 310deg, ${colorFrom} 335deg, ${colorTo} 360deg)`,
          animationDuration: `${duration}s`,
        }}
      />
      {/* Inner Mask to preserve card content surface */}
      <div
        className="absolute rounded-[inherit] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
        style={{
          inset: `${borderWidth}px`,
        }}
      />
    </div>
  );
}
