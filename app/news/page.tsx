'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useStockContext } from '../../context/StockContext';
import PageSkeleton from '../../components/PageSkeleton';

const NewsScreen = dynamic(() => import('../../components/NewsScreen'), {
  loading: () => <PageSkeleton />,
});

export default function NewsPage() {
  const { setActiveTab } = useStockContext();
  useEffect(() => { setActiveTab('news'); }, [setActiveTab]);
  return <NewsScreen />;
}
