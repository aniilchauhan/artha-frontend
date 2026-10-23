'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useStockContext } from '../../context/StockContext';
import PageSkeleton from '../../components/PageSkeleton';

const MultiBaggerScreen = dynamic(() => import('../../components/MultiBaggerScreen'), {
  loading: () => <PageSkeleton />,
});

export default function MultiBaggerPage() {
  const { setActiveTab } = useStockContext();
  useEffect(() => {
    setActiveTab('multibagger');
  }, [setActiveTab]);

  return <MultiBaggerScreen />;
}
