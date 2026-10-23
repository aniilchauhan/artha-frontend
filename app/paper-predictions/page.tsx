import React from 'react';
import type { Metadata } from 'next';
import PaperPredictionsScreen from '../../components/PaperPredictionsScreen';

export const metadata: Metadata = {
  title: 'Archived Cohort Records | Axion Research',
  description: 'Read-only legacy cohort archive. Historical sandbox values are unverified and do not establish model accuracy or executable performance.',
};

export default function PaperPredictionsPage() {
  return <PaperPredictionsScreen />;
}
