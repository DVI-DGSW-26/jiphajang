import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { LIST_PAGE_SIZE, useList } from './useList.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

const period = { from: '2026-01-01', to: '2026-12-31' };
const TOTAL = LIST_PAGE_SIZE * 5 + 7; // 6쪽

/** 쪽마다 늦게 답해요 — 뒤쪽이 먼저 오게 */
function stubPages(failPage?: number) {
  const fetchMock = vi.fn(async (input: string) => {
    const page = Number(new URL(input, 'http://x').searchParams.get('page'));
    await new Promise((resolve) => setTimeout(resolve, (6 - page) * 5));
    if (page === failPage) {
      return new Response(JSON.stringify({ message: '잠시 뒤 다시 해 주세요.' }), { status: 500 });
    }
    const start = page * LIST_PAGE_SIZE;
    const items = Array.from(
      { length: Math.max(0, Math.min(LIST_PAGE_SIZE, TOTAL - start)) },
      (_, i) => start + i,
    );
    return new Response(JSON.stringify({ items, total: TOTAL }), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

test('첫 쪽 뒤 나머지 쪽은 동시에 받고, 늦게 와도 행 순서는 쪽 순서예요', async () => {
  const fetchMock = stubPages();
  const { result } = renderHook(() => useList<number>('/ledger', period));

  await waitFor(() => expect(result.current.state.status).toBe('done'));
  expect(result.current.rows).toHaveLength(TOTAL);
  expect(result.current.rows.every((value, index) => value === index)).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(6);
});

test('한 쪽이라도 못 받으면 오류로 멈춰요', async () => {
  stubPages(3);
  const { result } = renderHook(() => useList<number>('/ledger', period));

  await waitFor(() => expect(result.current.state.status).toBe('error'));
  const { state } = result.current;
  expect(state.status === 'error' && (state.error as Error).message).toBe(
    '잠시 뒤 다시 해 주세요.',
  );
});
