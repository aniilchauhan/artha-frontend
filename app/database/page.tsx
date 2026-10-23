'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const DatabaseStocksScreen = dynamic(() => import('../../components/DatabaseStocksScreen'), {
  loading: () => <PageSkeleton />,
});

export default function DatabasePage() {
  return <DatabaseStocksScreen />;
}
