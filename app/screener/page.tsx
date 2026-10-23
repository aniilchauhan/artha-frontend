'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const ScreenerScreen = dynamic(() => import('../../components/ScreenerScreen'), {
  loading: () => <PageSkeleton />,
});

export default function ScreenerPage() {
  return <ScreenerScreen />;
}
