import { expect, test } from 'vitest';
import {
  applyFilters,
  BLANK_LABEL,
  distinctLabels,
  type GridColumn,
  rangeToTsv,
  sortRows,
} from './gridModel.ts';
import { parseDate, parseDecimal, parseText } from './parsers.ts';

type Row = { id: string; customer: string; amount: string | null; memo: string | null };

const rows: Row[] = [
  { id: '1', customer: '고객사 B', amount: '1200.50', memo: null },
  { id: '2', customer: '고객사 A', amount: '90.00', memo: '확인\t필요' },
  { id: '3', customer: '고객사 B', amount: null, memo: '' },
  { id: '4', customer: '고객사 A', amount: '1000.00', memo: 'ok' },
];

const columns: GridColumn<Row>[] = [
  { key: 'customer', header: '고객사', value: (r) => r.customer },
  {
    key: 'amount',
    header: '금액',
    numeric: true,
    value: (r) => r.amount,
    format: (v) => (v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : ''),
  },
  { key: 'memo', header: '메모', value: (r) => r.memo },
];

const ids = (list: Row[]) => list.map((row) => row.id);

test('열마다 고른 값만 남기고, 빈 칸은 (빈 칸)으로 걸러요', () => {
  expect(ids(applyFilters(rows, columns, { customer: new Set(['고객사 A']) }))).toEqual(['2', '4']);
  expect(ids(applyFilters(rows, columns, { amount: new Set([BLANK_LABEL]) }))).toEqual(['3']);
  // 여러 열이면 모두 맞아야 해요
  expect(
    ids(
      applyFilters(rows, columns, {
        customer: new Set(['고객사 B']),
        amount: new Set(['1,200.50']),
      }),
    ),
  ).toEqual(['1']);
});

test('필터 목록은 다른 열 필터로 걸러진 값만, 숫자 열은 숫자 순으로 보여줘요', () => {
  const others = applyFilters(rows, columns, { customer: new Set(['고객사 A']) }, 'customer');
  expect(distinctLabels(others, columns[0] as GridColumn<Row>)).toEqual(['고객사 A', '고객사 B']);
  expect(distinctLabels(rows, columns[1] as GridColumn<Row>)).toEqual([
    '90.00',
    '1,000.00',
    '1,200.50',
    BLANK_LABEL,
  ]);
});

test('정렬하면 숫자는 숫자로 비교하고, 빈 칸은 늘 맨 아래예요', () => {
  expect(ids(sortRows(rows, columns, { key: 'amount', direction: 'asc' }))).toEqual([
    '2',
    '4',
    '1',
    '3',
  ]);
  expect(ids(sortRows(rows, columns, { key: 'amount', direction: 'desc' }))).toEqual([
    '1',
    '4',
    '2',
    '3',
  ]);
  // 같은 값은 원래 순서를 지켜요
  expect(ids(sortRows(rows, columns, { key: 'customer', direction: 'asc' }))).toEqual([
    '2',
    '4',
    '1',
    '3',
  ]);
});

test('고른 범위를 엑셀에 붙일 글자로 바꿔요 — 숫자는 쉼표 없이, 탭은 빈칸으로', () => {
  const tsv = rangeToTsv(rows, columns, { top: 0, bottom: 1, left: 0, right: 2 });
  expect(tsv).toBe('고객사 B\t1200.50\t\r\n고객사 A\t90.00\t확인 필요');
});

test('직접 입력 값 읽기', () => {
  expect(parseText('  BL1 ')).toEqual({ value: 'BL1' });
  expect(parseText('   ')).toEqual({ value: null });
  expect(parseDate('2026.1.5')).toEqual({ value: '2026-01-05' });
  expect(parseDate('2026-02-30')).toHaveProperty('error');
  expect(parseDecimal('1,385.5')).toEqual({ value: '1385.5' });
  expect(parseDecimal('-3')).toHaveProperty('error');
  expect(parseDecimal('')).toEqual({ value: null });
});
