'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const PortfolioScreen = dynamic(() => import('../../components/PortfolioScreen'), {
  loading: () => <PageSkeleton />,
});

export default function PortfolioTrackerPage() {
  return <PortfolioScreen />;
}
