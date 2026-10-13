import {
  LOCAL_INVOICE_INPUTS,
  LOCAL_INVOICES_PATH,
  type LocalInvoiceRow,
} from '../src/results/localInvoices.ts';
import { mockList } from './list.ts';
import { eachDay, hash, iso, isRecent, multiply } from './sample.ts';

/**
 * 가짜 현지 출하 Invoice List — 화면을 만들 때 볼 예시예요. **실제 고객사·품번·금액이 아니에요.**
 * 2025-01-01부터 오늘까지 날짜마다 정해진 규칙으로 만들어서, 새로고침해도 같은 행이 나와요.
 */

const SHIP_TO = ['고객사 E', '고객사 F', '고객사 G'];
const CARRIERS = ['운송사 1', '운송사 2'];

const PARTS = [
  { name: '품번 P1', unitPrice: '0.5530', setQty: 2400 },
  { name: '품번 P2', unitPrice: '1.3900', setQty: 1200 },
  { name: '품번 P3', unitPrice: '0.0950', setQty: 9600 },
  { name: '품번 P6', unitPrice: '2.1500', setQty: 800 },
];

function generate(): LocalInvoiceRow[] {
  const rows: LocalInvoiceRow[] = [];
  let no = 0;
  for (const day of eachDay()) {
    const date = iso(day);
    const seed = hash(`L${date}`);
    if (seed % 2 !== 0 || day.getUTCDay() === 0 || day.getUTCDay() === 6) continue;
    no++;
    const invoiceNo = `MT${date.slice(2).replaceAll('-', '')}A`;
    const lines = 1 + ((seed >>> 4) % 2);
    for (let line = 0; line < lines; line++) {
      const part = PARTS[((seed >>> 1) + line) % PARTS.length] ?? PARTS[0];
      if (!part) continue;
      const boxQty = 1 + ((seed >>> (line + 6)) % 8);
      const totalQty = part.setQty * boxQty;
      rows.push({
        id: `${invoiceNo}-${line + 1}`,
        no,
        invoiceDate: date,
        invoiceNo,
        shipTo: SHIP_TO[seed % SHIP_TO.length] ?? '',
        partNumber: part.name,
        unitPrice: part.unitPrice,
        setQty: part.setQty,
        boxQty,
        totalQty,
        totalAmount: multiply(part.unitPrice, String(totalQty), 2),
        carrier: CARRIERS[(seed >>> 2) % CARRIERS.length] ?? '',
        // 최근 2주는 아직 Tracking#을 안 넣은 것으로 둬요
        trackingNo: isRecent(date) ? null : `TRK${String(seed % 10_000_000).padStart(7, '0')}`,
      });
    }
  }
  return rows;
}

let store: LocalInvoiceRow[] | null = null;

/** 가짜 현지 출하 전체. 출하 원장도 여기서 현지 출하를 가져가요 */
export function localInvoiceRows(): LocalInvoiceRow[] {
  store ??= generate();
  return store;
}

export const localInvoices = mockList({
  path: LOCAL_INVOICES_PATH,
  rows: localInvoiceRows,
  date: (row) => row.invoiceDate,
  inputs: LOCAL_INVOICE_INPUTS,
});
