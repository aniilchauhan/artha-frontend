'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const AboutScreen = dynamic(() => import('../../components/AboutScreen'), {
  loading: () => <PageSkeleton />,
});

export default function AboutPage() {
  return <AboutScreen />;
}
