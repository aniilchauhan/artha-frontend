import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import './workspace.css';
import { Providers } from '../components/Providers';

const outfit = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  icons: {
    icon: '/branding/axion-favicon.png',
    apple: '/branding/axion-apple-icon.png',
  },
  title: 'Artha AI | Real-Time NSE/BSE Intelligence & Research Terminal',
  description: 'Indian Equities algorithmic analytics, breakout radar, and real-time AI research terminal',
};

import DashboardLayoutShell from '../components/DashboardLayoutShell';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${outfit.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('stock_insight_theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d){document.documentElement.classList.add('dark')}else{document.documentElement.classList.remove('dark')}}catch(e){}`,
          }}
        />
      </head>
      <body className="bg-[var(--ds-canvas,#f3f5f8)] dark:bg-[var(--ds-canvas,#0c0c0e)] text-[var(--ds-text,#17243a)] dark:text-[var(--ds-text,#f5f5f7)] antialiased selection:bg-[var(--ds-accent,#075ccb)]/20 selection:text-[var(--ds-accent,#075ccb)] font-sans min-h-screen relative overflow-x-hidden">
        {/* Global Mesh Gradient Background */}
        <div className="fixed inset-0 z-[-1] pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-[120px]" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 dark:bg-purple-500/15 blur-[120px]" />
        </div>
        <Providers>
          <DashboardLayoutShell>
            {children}
          </DashboardLayoutShell>
        </Providers>
      </body>
    </html>
  );
}
