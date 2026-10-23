'use client';
import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';
const GreeksMonitor = dynamic(() => import('../../components/GreeksMonitor'), { loading: () => <PageSkeleton /> });
export default function GreeksPage() { return <GreeksMonitor />; }
