'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const LearningLabScreen = dynamic(() => import('../../components/LearningLabScreen'), {
  loading: () => <PageSkeleton />,
});

export default function FrameworksPage() {
  return <LearningLabScreen />;
}
