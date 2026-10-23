'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const WatchlistScreen = dynamic(() => import('../../components/WatchlistScreen'), {
  loading: () => <PageSkeleton />,
});

export default function WatchlistPage() {
  return <WatchlistScreen />;
}
