import { expect, test } from 'vitest';
import { rowWindow } from './useRowWindow.ts';

test('보이는 행과 위아래 조금만 그려요', () => {
  // 행 높이 33px, 상자 높이 660px(20행), 100행째에 스크롤
  expect(rowWindow(3300, 660, 33, 10_000, 5)).toEqual({ start: 95, end: 125 });
});

test('처음과 끝에서는 범위를 넘지 않아요', () => {
  expect(rowWindow(0, 660, 33, 10_000, 5)).toEqual({ start: 0, end: 25 });
  expect(rowWindow(0, 660, 33, 8, 5)).toEqual({ start: 0, end: 8 });
  expect(rowWindow(99_999, 660, 33, 10, 5)).toEqual({ start: 10, end: 10 });
});

test('아직 재지 못했으면 기본값으로 셈해요', () => {
  expect(rowWindow(0, 0, 0, 10_000, 0).end).toBeGreaterThan(20);
});
