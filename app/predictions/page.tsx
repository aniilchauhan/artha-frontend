'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const DailyPredictionsScreen = dynamic(
  () => import('../../components/DailyPredictionsScreen'),
  { loading: () => <PageSkeleton /> }
);

export default function PredictionsPage() {
  return <DailyPredictionsScreen />;
}
