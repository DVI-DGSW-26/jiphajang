import { expect, test } from 'vitest';
import {
  addDays,
  collectionFigures,
  daysBetween,
  lineAmount,
  sequenceLetter,
  sumMoney,
} from './calc.ts';

test('금액은 소수 오차 없이 계산해요', () => {
  expect(lineAmount(600, '1.2500')).toBe('750.00');
  expect(lineAmount(3, '0.1')).toBe('0.30');
  expect(lineAmount(1, '0.1250')).toBe('0.13');
  expect(sumMoney(['0.10', '0.20'])).toBe('0.30');
  expect(sumMoney(['750.00', '-300'])).toBe('450.00');
  expect(sumMoney(['100', '-300.5'])).toBe('-200.50');
  expect(sumMoney([])).toBe('0.00');
});

test('날짜 계산은 월말과 해를 넘어가요', () => {
  expect(addDays('2026-11-06', 30)).toBe('2026-12-06');
  expect(addDays('2026-12-20', 30)).toBe('2027-01-19');
  expect(daysBetween('2026-10-29', '2026-11-05')).toBe(7);
});

test('순번은 A부터 Z 다음 AA예요', () => {
  expect(sequenceLetter(0)).toBe('A');
  expect(sequenceLetter(25)).toBe('Z');
  expect(sequenceLetter(26)).toBe('AA');
});

const base = {
  plannedAmount: '750.00',
  plannedDate: '2026-11-05',
  paidAmount: null,
  paidDate: null,
};

test('수금 전에는 계획일이 지나야 지연을 보여줘요', () => {
  expect(collectionFigures(base, '2026-11-05')).toEqual({
    outstanding: '750.00',
    status: 'UNPAID',
    delayDays: null,
    isOverdue: false,
  });
  expect(collectionFigures(base, '2026-11-08')).toMatchObject({ delayDays: 3, isOverdue: true });
});

test('부분 수금은 미수가 남고, 전액이면 수금일로 지연을 세요', () => {
  const partial = { ...base, paidAmount: '300', paidDate: '2026-11-01' };
  expect(collectionFigures(partial, '2026-11-02')).toMatchObject({
    outstanding: '450.00',
    status: 'PARTIAL',
  });
  const early = { ...base, paidAmount: '750.00', paidDate: '2026-11-01' };
  expect(collectionFigures(early, '2026-12-01')).toMatchObject({
    outstanding: '0.00',
    status: 'PAID',
    delayDays: 0,
    isOverdue: false,
  });
  const late = { ...base, paidAmount: '750.00', paidDate: '2026-11-09' };
  expect(collectionFigures(late, '2026-12-01')).toMatchObject({ delayDays: 4 });
});
