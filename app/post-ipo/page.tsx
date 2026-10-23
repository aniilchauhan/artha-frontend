'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const PostIpoPredictionScreen = dynamic(
  () => import('../../components/PostIpoPredictionScreen'),
  {
    loading: () => <PageSkeleton />,
  }
);

export default function PostIpoPage() {
  return <PostIpoPredictionScreen />;
}
