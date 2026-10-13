import { afterEach, expect, test } from 'vitest';
import { EMPTY_VIEW, parseGridView, readGridView, writeGridView } from './gridView.ts';

const keys = ['no', 'customer', 'amount'];

afterEach(() => localStorage.clear());

test('저장한 정렬·너비·숨김을 읽어요', () => {
  const view = {
    sort: { key: 'amount', direction: 'desc' as const },
    widths: { customer: 180 },
    hidden: ['no'],
  };
  writeGridView('/ledger', view);
  expect(readGridView('/ledger', keys)).toEqual(view);
});

test('없어진 열의 설정은 버려요 — 열은 물류팀 자료가 오면 바뀌어요', () => {
  const text = JSON.stringify({
    sort: { key: 'gone', direction: 'asc' },
    widths: { gone: 100, customer: 5000 },
    hidden: ['gone', 'no', 'no'],
  });
  expect(parseGridView(text, keys)).toEqual({
    sort: null,
    widths: { customer: 800 },
    hidden: ['no'],
  });
});

test('모든 열을 숨긴 값, 숨긴 열로 정렬한 값, 깨진 글자는 받지 않아요', () => {
  expect(parseGridView(JSON.stringify({ hidden: keys }), keys).hidden).toEqual([]);
  expect(
    parseGridView(JSON.stringify({ sort: { key: 'no', direction: 'asc' }, hidden: ['no'] }), keys)
      .sort,
  ).toBeNull();
  expect(parseGridView('{깨짐', keys)).toEqual(EMPTY_VIEW);
  expect(parseGridView(null, keys)).toEqual(EMPTY_VIEW);
});

test('처음 보기로 돌아가면 저장한 것을 지워요', () => {
  writeGridView('/ledger', { ...EMPTY_VIEW, hidden: ['no'] });
  writeGridView('/ledger', EMPTY_VIEW);
  expect(localStorage.length).toBe(0);
});
