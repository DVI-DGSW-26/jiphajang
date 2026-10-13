import { LEDGER_PATH, type LedgerRow } from '../src/ledger/ledger.ts';
import { exportDeclarationRows } from './exportDeclarations.ts';
import { mockList } from './list.ts';
import { localInvoiceRows } from './localInvoices.ts';

/** 가짜 출하 원장 — 가짜 수출신고취합(한국)과 현지 출하를 날짜순으로 합쳐요 */
function ledgerRows(): LedgerRow[] {
  const korea = exportDeclarationRows().map<LedgerRow>((row) => ({
    id: `K-${row.id}`,
    kind: '한국 출하',
    date: row.shipDate,
    invoiceNo: row.invoiceNo,
    customer: row.customer,
    itemName: row.itemName,
    unitPrice: row.unitPrice,
    totalQty: row.totalQty,
    amount: row.amountUsd,
  }));
  const local = localInvoiceRows().map<LedgerRow>((row) => ({
    id: `L-${row.id}`,
    kind: '현지 출하',
    date: row.invoiceDate,
    invoiceNo: row.invoiceNo,
    customer: row.shipTo,
    itemName: row.partNumber,
    unitPrice: row.unitPrice,
    totalQty: row.totalQty,
    amount: row.totalAmount,
  }));
  // sort는 같은 날짜끼리 원래 순서를 지켜요 — 한국 출하가 먼저
  return [...korea, ...local].sort((a, b) => a.date.localeCompare(b.date));
}

export const ledger = mockList({
  path: LEDGER_PATH,
  rows: ledgerRows,
  date: (row) => row.date,
  inputs: [],
});
