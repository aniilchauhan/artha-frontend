import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const SmallCapPredictionsScreen = dynamic(() => import('../../components/SmallCapPredictionsScreen'), {
  loading: () => <PageSkeleton />,
});

export default function SmallCapPredictionsPage() {
  return <SmallCapPredictionsScreen autoStart={true} />;
}
