'use client';

import dynamic from 'next/dynamic';
import BackendSnapshotNotice from '../../components/BackendSnapshotNotice';
import PageSkeleton from '../../components/PageSkeleton';

const GapScreenerScreen = dynamic(() => import('../../components/GapScreenerScreen'), {
  loading: () => <PageSkeleton />,
});

export default function GapAnalysisPage() {
  return <><BackendSnapshotNotice job="gap-screener"/><GapScreenerScreen /></>;
}
