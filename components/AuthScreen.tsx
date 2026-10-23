'use client';

import React, { useState } from 'react';
import { useStockContext } from '../context/StockContext';
import { Mail, Lock, LogIn, Sparkles, X } from 'lucide-react';
import { signIn } from 'next-auth/react';

interface AuthScreenProps {
  onSuccess?: () => void;
  onClose?: () => void;
  isModal?: boolean;
}

export default function AuthScreen({ onSuccess, onClose, isModal = false }: AuthScreenProps) {
  const { setActiveTab, addToast } = useStockContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError('');

    try {
      // Login flow
      const res = await signIn('credentials', {
        redirect: false,
        email: email.trim().toLowerCase(),
        password,
      });

      if (!res || res.error || !res.ok) {
        setError(res?.error === 'CredentialsSignin' ? 'Email or password is incorrect.' : res?.error || 'Sign-in failed. Please try again.');
      } else {
        addToast('Successfully authenticated!', 'success');
        if (onSuccess) {
          onSuccess();
        } else {
          setActiveTab('portfolio');
        }
      }
    } catch (err) {
      setError('Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="auth-screen-container" className={`max-w-md w-full mx-auto ${isModal ? 'py-2' : 'py-10'} animate-in fade-in slide-in-from-bottom-3 duration-300`}>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
        
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
            title="Close"
            id="btn-close-auth-modal"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner border border-indigo-100 dark:border-indigo-900/50">
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Sign in to your workspace
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal max-w-xs mx-auto">
            Personal access to your portfolio, research and alerts.
          </p>
        </div>

        {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        {/* Input fields */}
        <form onSubmit={handleSubmit} className="space-y-4" id="login-form">
          <div className="space-y-1.5">
            <label htmlFor="login-email-input" className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="email"
                autoComplete="username"
                required
                placeholder="Email address (e.g. you@domain.com)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                id="login-email-input"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password-input" className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-white placeholder-slate-400 transition-all"
                id="login-password-input"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-indigo-400 disabled:to-purple-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-500/20 cursor-pointer transition-all mt-6"
            id="btn-login-submit"
          >
            {loading ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
