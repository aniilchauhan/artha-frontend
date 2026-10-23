'use client';

import dynamic from 'next/dynamic';
import BackendSnapshotNotice from '../../components/BackendSnapshotNotice';
import PageSkeleton from '../../components/PageSkeleton';
const RapidMovesScreen = dynamic(() => import('../../components/RapidMovesScreen'), { loading: () => <PageSkeleton /> });
export default function RapidMovesPage() { return <><BackendSnapshotNotice job="rapid-moves"/><RapidMovesScreen /></>; }
