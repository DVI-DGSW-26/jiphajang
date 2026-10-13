import {
  EXPORT_DECLARATION_INPUTS,
  EXPORT_DECLARATIONS_PATH,
  type ExportDeclarationRow,
} from '../src/results/exportDeclarations.ts';
import { mockList } from './list.ts';
import { addDays, DATE, DECIMAL, eachShipment, iso, isRecent, multiply } from './sample.ts';

/**
 * 가짜 수출신고취합 — 화면을 만들 때 볼 예시예요. **실제 고객사·품번·금액이 아니에요.**
 * 2025-01-01부터 오늘까지 날짜마다 정해진 규칙으로 만들어서, 새로고침해도 같은 행이 나와요.
 */

const CUSTOMERS = [
  { code: 'C', name: '고객사 A' },
  { code: 'R', name: '고객사 B' },
  { code: 'E', name: '고객사 C' },
  { code: 'M', name: '고객사 D' },
];

const ITEMS = [
  { name: '품목 P1', unitPrice: '0.5120', setQty: 2400 },
  { name: '품목 P2', unitPrice: '1.2850', setQty: 1200 },
  { name: '품목 P3', unitPrice: '0.0875', setQty: 9600 },
  { name: '품목 P4', unitPrice: '3.4000', setQty: 600 },
  { name: '품목 P5', unitPrice: '0.7310', setQty: 3000 },
];

function withDerived(row: ExportDeclarationRow): ExportDeclarationRow {
  const totalQty = row.setQty * row.boxQty;
  const amountUsd = multiply(row.unitPrice, String(totalQty), 2);
  return {
    ...row,
    totalQty,
    amountUsd,
    amountKrw: row.exchangeRate ? multiply(amountUsd, row.exchangeRate, 0) : null,
  };
}

function generate(): ExportDeclarationRow[] {
  const rows: ExportDeclarationRow[] = [];
  let no = 0;
  const isShipDay = (day: Date, seed: number) => seed % 3 === 0 && day.getUTCDay() !== 0;
  for (const { day, date, seed, round } of eachShipment('', isShipDay)) {
    no++;
    const customer = CUSTOMERS[seed % CUSTOMERS.length] ?? CUSTOMERS[0];
    const invoiceNo = `V${customer?.code}${date.slice(2).replaceAll('-', '')}${round}`;
    // 최근 2주는 아직 필증·BL·환율을 안 넣은 것으로 둬요(채울 칸을 보여주려고)
    const filled = !isRecent(date);
    const rate = (1300 + (seed % 12000) / 100).toFixed(2);
    const lines = 1 + ((seed >>> 3) % 3);
    for (let line = 0; line < lines; line++) {
      const item = ITEMS[((seed >>> 2) + line) % ITEMS.length] ?? ITEMS[0];
      if (!item) continue;
      rows.push(
        withDerived({
          id: `${invoiceNo}-${line + 1}`,
          no,
          shipDate: date,
          invoiceNo,
          customer: customer?.name ?? '',
          declarationNo: filled ? `1234-${String(seed % 100000).padStart(5, '0')}-X` : null,
          blNo: filled ? `BL${String(seed % 1000000).padStart(6, '0')}` : null,
          shippedOn: filled ? iso(addDays(day, 2)) : null,
          itemName: item.name,
          unitPrice: item.unitPrice,
          setQty: item.setQty,
          boxQty: 1 + ((seed >>> (line + 5)) % 20),
          totalQty: 0,
          amountUsd: '0',
          exchangeRate: filled ? rate : null,
          amountKrw: null,
        }),
      );
    }
  }
  return rows;
}

let store: ExportDeclarationRow[] | null = null;

/** 가짜 수출신고취합 전체. 출하 원장도 여기서 한국 출하를 가져가요 */
export function exportDeclarationRows(): ExportDeclarationRow[] {
  store ??= generate();
  return store;
}

export const exportDeclarations = mockList({
  path: EXPORT_DECLARATIONS_PATH,
  rows: exportDeclarationRows,
  date: (row) => row.shipDate,
  inputs: EXPORT_DECLARATION_INPUTS,
  check: (key, value) => {
    if (key === 'shippedOn' && !DATE.test(value)) return '선적일자는 YYYY-MM-DD로 넣어 주세요.';
    if (key === 'exchangeRate' && !DECIMAL.test(value)) return '환율은 숫자로 넣어 주세요.';
    return null;
  },
  derive: withDerived,
});
