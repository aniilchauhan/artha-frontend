import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';

const FallPredictionsScreen = dynamic(() => import('../../components/FallPredictionsScreen'), {
  loading: () => <PageSkeleton />,
});

export const metadata = {
  title: '2–5% Fall Predictions & Short Breakdown Radar | Artha',
  description: 'Real-time quantitative screening detecting 2% to 5% bearish breakdowns, institutional distribution, and Put Option (PE) targets.',
};

export default function FallPredictionsPage() {
  return <FallPredictionsScreen />;
}
