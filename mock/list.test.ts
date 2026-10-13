import { expect, test } from 'vitest';
import { MAX_PAGE_SIZE, mockList } from './list.ts';

const rows = Array.from({ length: 1500 }, (_, index) => ({
  id: String(index),
  date: '2026-10-01',
}));
const list = mockList({ path: '/test', rows: () => rows, date: (row) => row.date, inputs: [] });

test('목록은 size 상한 1000을 넘겨 주지 않아요', () => {
  const page = list.list(new URLSearchParams({ size: '5000' }));
  expect(MAX_PAGE_SIZE).toBe(1000);
  expect(page.items).toHaveLength(1000);
  expect(page.total).toBe(1500);
  expect(list.list(new URLSearchParams({ size: '5000', page: '1' })).items).toHaveLength(500);
});
