import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from './api.ts';

export type QueryState<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'done'; data: T }
  | { status: 'error'; data: T | null; error: unknown };

/** 한 번 받는 조회 — 요약, 상세, 쿼리가 붙는 재고 목록처럼 `useList`의 쪽 나누기가 필요 없을 때 */
export function useQuery<T>(url: string | null) {
  const [state, setState] = useState<QueryState<T>>({ status: 'loading', data: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void attempt;
    if (url === null) return;
    const controller = new AbortController();
    // 다시 받는 동안 이전 값을 보여줘요. 화면이 깜빡이지 않아요
    setState((current) => ({ status: 'loading', data: current.data }));
    apiFetch<T>(url, { signal: controller.signal })
      .then((data) => setState({ status: 'done', data }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((current) => ({ status: 'error', data: current.data, error }));
      });
    return () => controller.abort();
  }, [url, attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);
  return { state, reload };
}

/** JSON을 보내요. POST·PUT은 자동으로 다시 보내지 않아요 */
export function sendJson<T>(path: string, method: 'POST' | 'PUT', body: unknown = {}): Promise<T> {
  return apiFetch<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
