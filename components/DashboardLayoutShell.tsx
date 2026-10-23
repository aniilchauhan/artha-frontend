'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Header from './Header';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';
import { useStockContext } from '../context/StockContext';
import WorkspaceToolbar from './WorkspaceToolbar';
import PWAInstallBanner from './PWAInstallBanner';

// Lazy-load StockDetailView (140KB) — only needed when user clicks a stock
const StockDetailView = dynamic(() => import('./StockDetailView'), {
  loading: () => (
    <div className="w-full animate-pulse space-y-4 py-6">
      <div className="h-10 w-64 rounded-xl bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-40 rounded-md bg-gray-100 dark:bg-gray-800" />
      <div className="mt-6 h-48 w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
    </div>
  ),
});

export default function DashboardLayoutShell({ children }: { children: React.ReactNode }) {
  const { selectedTicker } = useStockContext();
  
  return (
    <div className="axion-workspace flex flex-col min-h-screen bg-transparent text-slate-900 dark:text-slate-100 transition-colors duration-300">
      <a href="#workspace-main" className="workspace-skip-link">Skip to content</a>
      {/* Brand & navigation header */}
      <Header />

      {/* Main layout with sidebar and main interactive section */}
      <div className="workspace-frame flex flex-1 flex-row w-full px-3 sm:px-6 lg:px-8">
        <Sidebar />

        <main id="workspace-main" tabIndex={-1} className="workspace-main flex-1 min-w-0 py-5 pb-24 md:pb-6">
          <WorkspaceToolbar />
          {/* If a stock ticker is selected, override general sub-pages and show details view */}
          {selectedTicker ? <StockDetailView /> : children}
        </main>
      </div>

      {/* Toast alert system overlay */}
      <ToastContainer />
      <PWAInstallBanner />
    </div>
  );
}
