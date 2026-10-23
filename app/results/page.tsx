'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useStockContext } from '../../context/StockContext';
import PageSkeleton from '../../components/PageSkeleton';

const ResultsScreen = dynamic(() => import('../../components/ResultsScreen'), {
  loading: () => <PageSkeleton />,
});

export default function ResultsPage() {
  const { setActiveTab } = useStockContext();
  useEffect(() => { setActiveTab('results'); }, [setActiveTab]);
  return <ResultsScreen />;
}
