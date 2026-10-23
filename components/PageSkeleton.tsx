import React from 'react';

export default function PageSkeleton() {
  return (
    <div role="status" aria-label="Loading page" className="w-full animate-pulse space-y-4 py-2">
      <span className="sr-only">Loading your workspace…</span>
      {/* Header bar */}
      <div className="h-8 w-48 rounded-xl bg-gray-200 dark:bg-gray-800" />
      {/* Card rows */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
        >
          <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-32 max-w-full rounded-md bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-48 max-w-full rounded-md bg-gray-100 dark:bg-gray-800" />
          </div>
          <div className="h-6 w-20 rounded-md bg-gray-200 dark:bg-gray-700" />
        </div>
      ))}
    </div>
  );
}
