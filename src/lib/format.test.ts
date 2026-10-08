import { expect, test } from 'vitest';
import {
  formatDate,
  formatFileDate,
  formatKrw,
  formatQty,
  formatRate,
  formatShortDate,
  formatUnitPrice,
  formatUsd,
} from './format.ts';

test('매뉴얼 9장의 자릿수대로 보여줘요', () => {
  expect(formatQty(60000)).toBe('60,000');
  expect(formatUnitPrice('0.512')).toBe('0.5120');
  expect(formatUsd('30720')).toBe('30,720.00');
  expect(formatRate('1385.5')).toBe('1,385.50');
  expect(formatKrw('42562560')).toBe('42,562,560');
});

test('문자열 금액은 소수 오차 없이 반올림해요', () => {
  // 0.1 + 0.2 같은 부동소수 오차가 끼지 않아요
  expect(formatUsd('1.005')).toBe('1.01');
  expect(formatUsd('12345678901234.565')).toBe('12,345,678,901,234.57');
  expect(formatUnitPrice('2.43645')).toBe('2.4365');
  expect(formatKrw('1499.5')).toBe('1,500');
});

test('음수는 앞에 −를 붙이고, −0은 0으로 보여요', () => {
  expect(formatQty(-1875)).toBe('−1,875');
  expect(formatUsd('-0.001')).toBe('0.00');
});

test('값이 없거나 숫자가 아니면 빈 칸이에요', () => {
  for (const value of [null, undefined, '', '  ', 'abc', '1,000', Number.NaN, Infinity]) {
    expect(formatUsd(value)).toBe('');
  }
});

test('날짜는 YYYY-MM-DD, 문자열 날짜는 시간대 때문에 하루 밀리지 않아요', () => {
  expect(formatDate('2026-10-07')).toBe('2026-10-07');
  expect(formatDate('2026-10-07T23:59:00-05:00')).toBe('2026-10-07');
  expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  expect(formatShortDate('2026-10-07')).toBe('10-07');
  expect(formatFileDate('2026-10-07')).toBe('20261007');
});

test('읽을 수 없는 날짜는 빈 칸이에요', () => {
  expect(formatDate('10/07/2026')).toBe('');
  expect(formatDate(new Date('nope'))).toBe('');
  expect(formatDate(null)).toBe('');
});
