import { expect, test } from 'vitest';
import { formatQty, formatUnitPrice, formatUsd } from '../../lib/format.ts';
import { XLSX_STYLE } from '../../lib/xlsx.ts';
import { gridToSheet } from './gridExcel.ts';
import type { GridColumn } from './gridModel.ts';

type Row = { date: string; name: string; price: string; qty: number; amount: string | null };

const columns: GridColumn<Row>[] = [
  { key: 'date', header: '날짜', value: (r) => r.date },
  { key: 'name', header: '품명', value: (r) => r.name },
  { key: 'price', header: '단가', numeric: true, value: (r) => r.price, format: formatUnitPrice },
  {
    key: 'qty',
    header: '수량',
    numeric: true,
    value: (r) => r.qty,
    format: formatQty,
    total: () => '',
  },
  {
    key: 'amount',
    header: '금액',
    numeric: true,
    value: (r) => r.amount,
    format: formatUsd,
    total: () => '',
  },
];

const rows: Row[] = [
  { date: '2026-10-05', name: '품목 P1', price: '0.5120', qty: 60000, amount: '30720.00' },
  { date: '2026-10-06', name: '품목 P2', price: '1.2850', qty: 1200, amount: null },
];

test('제목·설명·머리줄 아래에 행을 숫자·날짜 서식으로 넣고, 합계는 SUBTOTAL로 내요', () => {
  const sheet = gridToSheet(columns, rows, { title: '수출신고취합', description: '기간 …' });

  expect(sheet.rows[0]?.[0]).toMatchObject({ value: '수출신고취합', style: XLSX_STYLE.title });
  expect(sheet.rows[1]?.[0]).toMatchObject({ value: '기간 …' });
  expect(sheet.rows[3]?.map((cell) => cell?.value)).toEqual([
    '날짜',
    '품명',
    '단가',
    '수량',
    '금액',
  ]);

  expect(sheet.rows[4]).toEqual([
    { kind: 'date', value: '2026-10-05', style: XLSX_STYLE.date },
    { kind: 'text', value: '품목 P1', style: XLSX_STYLE.general },
    { kind: 'number', value: '0.5120', style: XLSX_STYLE.unitPrice },
    { kind: 'number', value: '60000', style: XLSX_STYLE.qty },
    { kind: 'number', value: '30720.00', style: XLSX_STYLE.money },
  ]);
  expect(sheet.rows[5]?.[4]).toBeNull(); // 빈 칸은 비워 둬요

  const total = sheet.rows[6];
  expect(total?.[0]).toMatchObject({ value: '합계', style: XLSX_STYLE.totalLabel });
  expect(total?.[3]).toMatchObject({ kind: 'formula', value: 'SUBTOTAL(109,D5:D6)' });
  expect(total?.[4]).toMatchObject({ value: 'SUBTOTAL(109,E5:E6)', style: XLSX_STYLE.totalMoney });

  expect(sheet.headerRow).toBe(3);
  expect(sheet.filter).toEqual({ firstRow: 3, lastRow: 5, lastCol: 4 });
});
