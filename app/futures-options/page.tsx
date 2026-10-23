'use client';
import dynamic from 'next/dynamic';
import PageSkeleton from '../../components/PageSkeleton';
const FuturesOptionsScreen = dynamic(() => import('../../components/FuturesOptionsScreen'), { loading: () => <PageSkeleton /> });
export default function FuturesOptionsPage() { return <FuturesOptionsScreen />; }
