'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const OpportunitiesScreen = dynamic(() => import('../../components/OpportunitiesScreen'), {
  loading: () => <PageSkeleton />,
});

export default function OpportunitiesPage() {
  return <OpportunitiesScreen />;
}
