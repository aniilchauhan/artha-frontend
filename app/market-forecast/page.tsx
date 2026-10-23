import WholeMarketForecast from '../../components/WholeMarketForecast';

export default function MarketForecastPage() {
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Whole-market forecast</h1><p className="mt-2 text-sm text-slate-500">Indian benchmark direction, historical move scenarios, and transparent crash-risk monitoring.</p></div><WholeMarketForecast expanded /></div>;
}
