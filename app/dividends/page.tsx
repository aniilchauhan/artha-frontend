'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useStockContext } from '../../context/StockContext';
import PageSkeleton from '../../components/PageSkeleton';

const DividendsScreen = dynamic(() => import('../../components/DividendsScreen'), {
  loading: () => <PageSkeleton />,
});

export default function DividendsPage() {
  const { setActiveTab } = useStockContext();
  useEffect(() => { setActiveTab('dividends'); }, [setActiveTab]);
  return <DividendsScreen />;
}
