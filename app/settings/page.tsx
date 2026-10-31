'use client';

import { useStockContext } from '../../context/StockContext';
import { 
  Settings, 
  ShieldAlert, 
  Sparkles, 
  Key, 
  RefreshCw, 
  Palette,
  Compass,
  Layers,
  Info
} from 'lucide-react';
import { THEMES } from '../../lib/themes';
import { SETTINGS_TOOLS_SECTIONS } from '../../lib/navigation-items';
import Link from '../../components/WorkspaceLink';
import { axionAppPath } from '../../lib/in-process';

export default function SettingsPage() {
  const {
    livePolling,
    setLivePolling,
    pollingInterval,
    updatePollingInterval,
    simulatedErrorType,
    toggleSimulatedError,
    resetBackendLimits,
    pollingError,
    theme,
    setTheme,
    customApiKey,
    setCustomApiKey,
  } = useStockContext();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      {/* Header */}
      <div className="sticky top-16 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-slate-200 dark:border-slate-800 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">Settings & Tools</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configure platform behavior and access extended workspace tools
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Live Data Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-500" />
            Live Data Configuration
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Polling Interval */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Polling Interval
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Configure live quote refresh frequency. Polling pauses while this tab is hidden.
              </p>
              <div className="flex gap-1.5">
                {[30000, 60000, 120000].map((interval) => (
                  <button
                    key={interval}
                    onClick={() => updatePollingInterval(interval)}
                    className={`px-3 py-1.5 text-xs rounded-xl font-bold font-mono transition-all cursor-pointer ${
                      pollingInterval === interval
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                        : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {interval / 1000}s
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Error Toggles */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                Chaos Testing
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Inject connection issues to test application resilience.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => toggleSimulatedError('network')}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-xl font-semibold transition-all border cursor-pointer ${
                    simulatedErrorType === 'network'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-100 dark:hover:border-amber-800'
                  }`}
                >
                  Network Loss
                </button>
                <button
                  onClick={() => toggleSimulatedError('rateLimit')}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-xl font-semibold transition-all border cursor-pointer ${
                    simulatedErrorType === 'rateLimit'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 shadow-md shadow-amber-500/10'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 hover:border-amber-100 dark:hover:border-amber-800'
                  }`}
                >
                  Rate Limit
                </button>
              </div>
            </div>

            {/* Live Feed Toggle */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Live Feed Toggle
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Pause or resume background price simulation on demand.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLivePolling(!livePolling)}
                  className={`flex-1 py-1.5 px-3 text-xs rounded-xl font-semibold transition-all border cursor-pointer ${
                    livePolling
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {livePolling ? 'Pause Feed' : 'Resume Feed'}
                </button>
                {(simulatedErrorType || pollingError) && (
                  <button
                    onClick={() => resetBackendLimits()}
                    className="py-1.5 px-3 text-xs font-semibold bg-rose-500 hover:bg-rose-400 text-white rounded-xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
                  >
                    Clear Errors
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* API Key Section */}
          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Key className="h-4 w-4 text-indigo-500 shrink-0" />
                Gemini API Key
              </h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                Configure custom credentials to activate live AI analysis.
              </p>
              <div className="flex gap-2 max-w-2xl">
                <input
                  type="password"
                  placeholder="Enter API key..."
                  value={customApiKey || ''}
                  onChange={(e) => setCustomApiKey(e.target.value || null)}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950/50 text-gray-900 dark:text-white rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
                {customApiKey && (
                  <button
                    onClick={() => setCustomApiKey(null)}
                    className="px-4 py-2 text-xs font-semibold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Theme Customization */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Palette className="h-5 w-5 text-purple-500" />
            Theme Customization ({THEMES.length} Trading Desk Themes)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {THEMES.map((th) => {
              const isSelected = theme === th.id;
              return (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id)}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 dark:border-indigo-400 shadow-md bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20'
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-sm'
                  }`}
                  style={{
                    backgroundColor: isSelected ? undefined : th.colors.surface,
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border shadow-xs"
                    style={{ backgroundColor: th.colors.primary, borderColor: th.colors.border }}
                  />
                  <span className="truncate">{th.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Extended Platform Tools */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Extended Workspace Tools & Radars
            </h2>
          </div>

          {SETTINGS_TOOLS_SECTIONS.map((section) => (
            <div
              key={section.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm"
            >
              <div className="mb-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                  {section.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {section.description}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {section.items.map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={axionAppPath(item.href)}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200/60 dark:border-slate-700/60 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                    >
                      <div className={`p-2 rounded-lg ${item.color || 'text-slate-500'} bg-white dark:bg-slate-900/50`}>
                        <ItemIcon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {item.name}
                          </span>
                          {item.badge && (
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                              item.badgeType === 'live' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                              item.badgeType === 'hot' ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' :
                              item.badgeType === 'ai' ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30' :
                              item.badgeType === 'pro' ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30' :
                              'bg-slate-200/70 text-slate-700 dark:bg-slate-800/80 dark:text-slate-300'
                            } shrink-0`}>
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
