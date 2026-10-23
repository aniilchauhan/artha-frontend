'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const MarketExplorerScreen = dynamic(() => import('../../components/MarketExplorerScreen'), {
  loading: () => <PageSkeleton />,
});

export default function MarketExplorerPage() {
  return <MarketExplorerScreen />;
}
