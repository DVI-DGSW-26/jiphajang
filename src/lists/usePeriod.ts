import { useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { isPeriod, monthPeriod, type Period } from '../components/PeriodFilter.tsx';

/** 주소창의 `?from=&to=`. 없거나 틀리면 `fallback`(기본 이번 달) */
export function usePeriod(today: Date, fallback?: Period): [Period, (period: Period) => void] {
  const [params, setParams] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const period = from && to && isPeriod(from, to) ? { from, to } : (fallback ?? monthPeriod(today));
  const setPeriod = useCallback(
    (next: Period) => setParams({ from: next.from, to: next.to }, { replace: true }),
    [setParams],
  );
  return [period, setPeriod];
}
