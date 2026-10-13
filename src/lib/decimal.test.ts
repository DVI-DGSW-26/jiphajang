import { expect, test } from 'vitest';
import { isDecimal, sumDecimal } from './decimal.ts';

test('소수 끝자리가 틀어지지 않게 더해요', () => {
  expect(sumDecimal(['0.1', '0.2'])).toBe('0.3');
  expect(sumDecimal(['30720.00', '1228.80', '0.5120'])).toBe('31949.3120');
  expect(sumDecimal([1, '2', 3])).toBe('6');
});

test('음수와 빈 값, 숫자가 아닌 값을 다뤄요', () => {
  expect(sumDecimal(['-1.5', '0.25'])).toBe('-1.25');
  expect(sumDecimal(['-0.5', '0.25'])).toBe('-0.25');
  expect(sumDecimal([null, undefined, '', 'abc', '2'])).toBe('2');
  expect(sumDecimal([null, 'abc'])).toBeNull();
});

test('쉼표가 있으면 숫자로 보지 않아요', () => {
  expect(isDecimal('1385.50')).toBe(true);
  expect(isDecimal('1,385.50')).toBe(false);
  expect(isDecimal('.5')).toBe(true);
  expect(isDecimal('1e3')).toBe(false);
});
