'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const SwingOpportunitiesScreen = dynamic(() => import('../../components/SwingOpportunitiesScreen'), {
  loading: () => <PageSkeleton />,
});

export default function SwingOpportunitiesPage() {
  return <SwingOpportunitiesScreen />;
}
