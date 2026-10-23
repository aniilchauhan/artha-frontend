'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const StockAiScreen = dynamic(() => import('../../components/StockAiScreen'), {
  loading: () => <PageSkeleton />,
});

export default function StockAiPage() {
  return <StockAiScreen />;
}
