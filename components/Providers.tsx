'use client';

import { SessionProvider } from 'next-auth/react';
import { StockProvider } from '../context/StockContext';

export function Providers({ children, basePath }: { children: React.ReactNode; basePath?: string }) {
  return (
    <SessionProvider {...(basePath ? { basePath } : {})}>
      <StockProvider>
        {children}
      </StockProvider>
    </SessionProvider>
  );
}
