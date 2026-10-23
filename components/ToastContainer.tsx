'use client';

import React from 'react';
import { useStockContext } from '../context/StockContext';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X, Bell, TrendingUp, AlertTriangle } from 'lucide-react';

export default function ToastContainer() {
  const { toasts, dismissToast } = useStockContext();
  const reduceMotion = useReducedMotion();

  return (
    <div 
      id="toast-notifications-container"
      aria-live="polite"
      aria-relevant="additions"
      className="fixed bottom-24 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex flex-col gap-3 sm:w-full sm:max-w-sm pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 20, scale: reduceMotion ? 1 : 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : 100, scale: reduceMotion ? 1 : 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="pointer-events-auto bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden flex items-stretch"
            >
              {/* Vertical Color Accent bar */}
              <div 
                className={`w-1.5 shrink-0 ${
                  isSuccess 
                    ? 'bg-emerald-500' 
                    : isWarning 
                    ? 'bg-amber-500' 
                    : 'bg-indigo-500'
                }`} 
              />

              {/* Toast content */}
              <div className="p-4 flex-1 flex gap-3 items-start">
                {/* Icon based on status */}
                <div className="mt-0.5 shrink-0">
                  {isSuccess ? (
                    <div className="p-1 bg-emerald-50 text-emerald-600 rounded-lg">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  ) : isWarning ? (
                    <div className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="p-1 bg-indigo-50 text-indigo-600 rounded-lg">
                      <Bell className="h-4 w-4" />
                    </div>
                  )}
                </div>

                {/* Message body */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                      {isSuccess ? 'Success' : isWarning ? 'Please review' : 'Notification'}
                    </span>
                    <button
                      onClick={() => dismissToast(toast.id)}
                      aria-label="Dismiss notification"
                      className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-slate-200 leading-relaxed font-sans font-medium">
                    {toast.message}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
