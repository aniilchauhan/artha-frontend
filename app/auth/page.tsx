'use client';


import { axionAppPath } from '../../lib/in-process';
import React, { useEffect } from 'react';
import AuthScreen from '../../components/AuthScreen';
import { useSession } from 'next-auth/react';
import { useRouter } from '../../lib/workspace-router';
import Link from '../../components/WorkspaceLink';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      router.push('/portfolio');
    }
  }, [status, session, router]);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between px-2">
          <Link
            href={axionAppPath("/")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Terminal</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
            <Sparkles className="h-3 w-3" />
            <span>Cloud Account</span>
          </div>
        </div>

        <AuthScreen onSuccess={() => router.push('/portfolio')} />
      </div>
    </div>
  );
}

