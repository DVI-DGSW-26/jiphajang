import { useCallback, useEffect, useState } from 'react';
import type { Period } from '../components/PeriodFilter.tsx';
import { apiFetch } from './api.ts';

/**
 * 목록 받기·칸 고치기 — 서버와 맞춘 공통 약속(2026-10-13, `docs/requirements.md`).
 * 열과 상관없이 모든 목록이 같은 모양이에요.
 *
 * - 받기: `GET <경로>?from=YYYY-MM-DD&to=YYYY-MM-DD&page=0&size=500` → `{ items, total }`.
 *   `page`는 0부터, 서버의 `size` 상한은 1000이에요.
 * - 고치기: `PATCH <경로>/<id>`에 고친 칸만 `{ 칸: 값 }`(지우면 `null`) → 계산 칸까지 다시 구한 행 전체.
 */
export type ListPage<T> = { items: T[]; total: number };

export const LIST_PAGE_SIZE = 500;

/** 동시에 받을 쪽 수 — 서버에 한꺼번에 너무 많이 묻지 않게 */
const PARALLEL_PAGES = 4;

export type ListState =
  | { status: 'loading' }
  | { status: 'done' }
  | { status: 'error'; error: unknown };

/**
 * 기간 안의 행을 **전부** 받아요. 화면은 엑셀처럼 한 장에 길게 보여주고, 필터·정렬도
 * 화면에서 해요 — 그러려면 행이 다 있어야 해요. 받는 동안 받은 만큼 먼저 보여줘요.
 * 첫 쪽을 받은 뒤 나머지 쪽은 `PARALLEL_PAGES`개씩 동시에 받아요.
 */
export function useList<T>(path: string, period: Period) {
  const [rows, setRows] = useState<T[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // 다시 시도 버튼이 바꾸는 값이에요. 바뀌면 처음부터 다시 받아요
    void attempt;
    const controller = new AbortController();
    setRows([]);
    setTotal(null);
    setState({ status: 'loading' });

    const fetchPage = (page: number) => {
      const query = new URLSearchParams({
        from: period.from,
        to: period.to,
        page: String(page),
        size: String(LIST_PAGE_SIZE),
      });
      return apiFetch<ListPage<T>>(`${path}?${query}`, { signal: controller.signal });
    };

    (async () => {
      // 첫 쪽으로 전체 행 수를 알고, 나머지 쪽은 몇 개씩 동시에 받아요
      const first = await fetchPage(0);
      setRows(first.items);
      setTotal(first.total);
      const pageCount = Math.ceil(first.total / LIST_PAGE_SIZE);
      if (first.items.length < LIST_PAGE_SIZE || pageCount <= 1) {
        setState({ status: 'done' });
        return;
      }

      // 늦게 온 쪽이 있어도 행 순서는 쪽 순서 그대로예요. 앞에서부터 이어진 쪽까지만 보여줘요
      const pages: (T[] | undefined)[] = [first.items];
      let shown = 1;
      let next = 1;
      const worker = async () => {
        while (next < pageCount) {
          const page = next++;
          pages[page] = (await fetchPage(page)).items;
          if (page !== shown) continue;
          while (pages[shown]) shown++;
          setRows(pages.slice(0, shown).flat() as T[]);
        }
      };
      await Promise.all(Array.from({ length: PARALLEL_PAGES }, worker));
      setState({ status: 'done' });
    })().catch((error: unknown) => {
      if (controller.signal.aborted) return;
      // 한 쪽이라도 못 받으면 나머지도 멈춰요. 반쪽 목록을 다 받은 것처럼 보이지 않게요
      controller.abort();
      setState({ status: 'error', error });
    });

    return () => controller.abort();
  }, [path, period.from, period.to, attempt]);

  const reload = useCallback(() => setAttempt((current) => current + 1), []);

  /** 저장한 뒤 서버가 돌려준 행으로 바꿔요(계산 칸도 같이 바뀌어요) */
  const replaceRow = useCallback((same: (row: T) => boolean, next: T) => {
    setRows((current) => current.map((row) => (same(row) ? next : row)));
  }, []);

  return { rows, total, state, reload, replaceRow };
}

/** 고친 칸만 보내고, 서버가 계산 칸까지 다시 구한 행을 받아요 */
export function patchListRow<T>(
  path: string,
  id: string,
  changes: Record<string, string | null>,
): Promise<T> {
  return apiFetch<T>(`${path}/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(changes),
  });
}
