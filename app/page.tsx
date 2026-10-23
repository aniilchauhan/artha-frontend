import dynamic from 'next/dynamic';
import PageSkeleton from '../components/PageSkeleton';

const DashboardMain = dynamic(() => import('../components/DashboardMain'), {
  loading: () => <PageSkeleton />,
});

export default function Home() {
  return <DashboardMain />;
}

