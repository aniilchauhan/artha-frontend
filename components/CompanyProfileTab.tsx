'use client';

import { axionFetch as fetch } from '../lib/in-process';
import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Globe, 
  MapPin, 
  Users, 
  Briefcase, 
  ShieldCheck, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Award,
  Sparkles
} from 'lucide-react';

interface Officer {
  name: string;
  title: string;
}

interface Profile {
  ticker: string;
  name: string;
  providerSymbol: string;
  fetchedAt: string;
  description: string | null;
  sector: string | null;
  industry: string | null;
  website: string | null;
  headquarters: string | null;
  employees: number | null;
  officers: Officer[];
  limitation: string;
}

function getInitials(name: string): string {
  const parts = name.replace(/^(Mr\.|Ms\.|Dr\.|Prof\.)\s+/i, '').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.slice(0, 2) || 'EX').toUpperCase();
}

export default function CompanyProfileTab({ ticker }: { ticker: string; theme?: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setProfile(null);
    setError(null);
    setLoading(true);

    fetch('/api/stocks/profile?ticker=' + encodeURIComponent(ticker), { signal: controller.signal })
      .then(async response => {
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error || 'Company information unavailable.');
        if (!controller.signal.aborted) setProfile(json.profile);
      })
      .catch(err => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [ticker]);

  if (loading) {
    return (
      <div role="status" className="rounded-3xl border border-slate-200/80 bg-white/80 p-12 text-center backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 shadow-xl">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-xs font-mono text-slate-500">Retrieving institutional company profile for {ticker}…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div role="status" className="rounded-3xl border border-slate-200/80 bg-white/80 p-8 text-center backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 shadow-xl">
        <p className="text-xs font-bold text-slate-500">{error || 'Company information unavailable.'}</p>
      </div>
    );
  }

  const istDate = new Date(profile.fetchedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';
  const description = profile.description || 'Business description currently unavailable from market data sources.';
  const isLongDesc = description.length > 360;

  return (
    <section className="space-y-6 animate-in fade-in duration-300">
      {/* ─── CORPORATE DOSSIER HERO ─── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/60 to-indigo-50/30 p-6 sm:p-8 backdrop-blur-xl shadow-xl dark:border-slate-800/80 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/30">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-start justify-between gap-6 relative z-10">
          <div className="space-y-2 flex-1 min-w-[280px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-700 dark:text-indigo-300 shadow-2xs">
                <Building2 size={12} />
                Corporate Equity Profile
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-300">
                {profile.providerSymbol}
              </span>
              {profile.sector && (
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {profile.sector}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {profile.name}
            </h2>

            {profile.industry && (
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                Industry: <span className="text-slate-800 dark:text-slate-200">{profile.industry}</span>
              </p>
            )}
          </div>

          {/* Quick Corporate Stats Strip */}
          <div className="flex flex-wrap items-center gap-3">
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 text-xs font-black shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-98"
              >
                <Globe size={14} />
                <span>Visit Official Site</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>

        {/* Key Operational Footprint Bar */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <MapPin size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Headquarters</p>
              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{profile.headquarters || 'India'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Users size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Workforce</p>
              <p className="font-bold font-mono text-slate-800 dark:text-slate-200">
                {profile.employees ? profile.employees.toLocaleString('en-IN') : 'Large Cap Public'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <Briefcase size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Leadership</p>
              <p className="font-bold text-slate-800 dark:text-slate-200">{profile.officers.length} Key Officers</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              <ShieldCheck size={16} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Governance</p>
              <p className="font-bold text-emerald-600 dark:text-emerald-400">Listed · Regulated</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── BUSINESS SYNOPSIS & OPERATIONS ─── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-7 backdrop-blur-xl shadow-xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            <span>Business Operations & Corporate Overview</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Retrieved {istDate}
          </span>
        </div>

        <div className="relative">
          <p className={`text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-normal ${
            !descExpanded && isLongDesc ? 'line-clamp-4' : ''
          }`}>
            {description}
          </p>

          {isLongDesc && (
            <button
              onClick={() => setDescExpanded(!descExpanded)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 cursor-pointer"
            >
              <span>{descExpanded ? 'Collapse Overview' : 'Read Full Business Synopsis'}</span>
              {descExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* ─── EXECUTIVE LEADERSHIP & KEY OFFICERS ─── */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 sm:p-7 backdrop-blur-xl shadow-xl dark:border-slate-800/80 dark:bg-slate-900/80">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80 mb-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Award size={16} className="text-indigo-500" />
            <span>Key Leadership & Board of Management</span>
          </h3>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full">
            {profile.officers.length} Executive Profiles
          </span>
        </div>

        {profile.officers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {profile.officers.map((officer, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/60 dark:bg-slate-950/40 hover:border-indigo-400/50 transition-all shadow-xs"
              >
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-mono font-black text-xs shadow-sm shrink-0">
                  {getInitials(officer.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                    {officer.name}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {officer.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 p-4 text-center">Officer and leadership disclosures currently unavailable.</p>
        )}
      </div>

      {/* ─── INSTITUTIONAL DISCLAIMER ─── */}
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/80 p-4 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
        <span className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">Regulatory & Data Disclaimer: </span>
        {profile.limitation}
      </div>
    </section>
  );
}
