'use client';
import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';
const LiveDecisionDashboard = dynamic(() => import('../../components/LiveDecisionDashboard'), { loading: () => <PageSkeleton /> });
export default function LiveDecisionsPage() { return <LiveDecisionDashboard />; }
