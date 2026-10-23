'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const QuantSuiteScreen = dynamic(() => import('../../components/QuantSuiteScreen'), {
  loading: () => <PageSkeleton />,
});

export default function QuantPage() {
  return <QuantSuiteScreen />;
}
