'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const IpoScreen = dynamic(() => import('../../components/IpoScreen'), {
  loading: () => <PageSkeleton />,
});

export default function IpoPage() {
  return <IpoScreen />;
}
