'use client';

import { useCallback, useState } from 'react';
import PredictionAiPanel from './PredictionAiPanel';
import PredictionJournal from './PredictionJournal';

export default function PredictionWorkbench() {
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = useCallback(() => setRefreshToken(value => value + 1), []);
  return <div className="space-y-6">
    <PredictionAiPanel onAnalysisSaved={refresh} />
    <PredictionJournal refreshToken={refreshToken} />
  </div>;
}
