'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an analytics service or console
    console.error('Application runtime error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center bg-slate-50 dark:bg-gray-950">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <AlertTriangle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            System Error Encountered
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The application experienced an unexpected runtime exception. We apologize for the interruption.
          </p>
          {error.message && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg text-[11px] font-mono text-rose-500 text-left overflow-auto max-h-32 border border-slate-100 dark:border-slate-800">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex justify-center pt-2">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer w-full sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Terminal State
          </button>
        </div>
      </div>
    </div>
  );
}
