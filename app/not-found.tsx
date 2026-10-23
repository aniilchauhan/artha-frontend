'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center bg-slate-50 dark:bg-gray-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <span className="text-xl font-bold font-mono">404</span>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Page Not Found
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The market screen or document you are looking for does not exist or was moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-50 hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload App
          </button>
        </div>
      </div>
    </div>
  );
}
