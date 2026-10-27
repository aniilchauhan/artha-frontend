import { quoteStatus } from './market-quote';

export type DataQualityStatus = 'live' | 'mixed' | 'cached' | 'simulated' | 'unavailable';

export function deriveDataQualityStatus(
  apiSource: string | null,
  stocks: Array<{
    isFallback?: boolean;
    dataSource?: string;
    quoteAsOf?: string;
    sessionStart?: string | null;
    sessionEnd?: string | null;
    quoteStatus?: string;
  }>,
  now = Date.now(),
): DataQualityStatus {
  if (apiSource === 'simulated') return 'simulated';
  if (apiSource === 'cached-snapshot') return 'cached';
  if (!apiSource) return 'unavailable';
  if (stocks.length === 0) return 'unavailable';
  if (apiSource === 'unavailable') return 'mixed';

  const hasNonProviderData = stocks.some(stock => stock.isFallback || stock.dataSource !== 'provider');
  const hasProviderData = stocks.some(stock => !stock.isFallback && stock.dataSource === 'provider');
  if (hasNonProviderData) return hasProviderData ? 'mixed' : 'simulated';

  const delayedCount = stocks.filter(stock => {
    const currentStatus = stock.quoteAsOf
      ? quoteStatus({
          quoteAsOf: stock.quoteAsOf,
          sessionStart: stock.sessionStart ?? null,
          sessionEnd: stock.sessionEnd ?? null,
          dataSource: 'provider',
        }, now)
      : stock.quoteStatus;
    return currentStatus ? currentStatus !== 'recent' : false;
  }).length;

  // If >20% of quotes are delayed, flag as mixed. If >=80% are live, report live provider quotes.
  const isPredominantlyLive = delayedCount === 0 || (delayedCount / stocks.length) <= 0.20;
  return isPredominantlyLive ? 'live' : 'mixed';
}
