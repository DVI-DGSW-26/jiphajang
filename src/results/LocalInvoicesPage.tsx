import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { parseText } from '../components/grid/parsers.ts';
import type { AuthMe } from '../lib/api.ts';
import { sumDecimal } from '../lib/decimal.ts';
import { formatDate, formatQty, formatUnitPrice, formatUsd } from '../lib/format.ts';
import { ListScreen } from '../lists/ListScreen.tsx';
import { LOCAL_INVOICES_PATH, type LocalInvoiceRow } from './localInvoices.ts';

type Row = LocalInvoiceRow;

const sumOf = (rows: Row[], pick: (row: Row) => string | number | null) =>
  sumDecimal(rows.map(pick));

/** 열 — `docs/source-analysis.md` 5.3 (잠정). 출처가 있는 열은 자동 칸이라 고칠 수 없어요 */
const COLUMNS: GridColumn<Row>[] = [
  { key: 'no', header: 'No', numeric: true, source: 'calc', value: (r) => r.no, width: 64 },
  {
    key: 'invoiceDate',
    header: 'Invoice date',
    source: 'read',
    value: (r) => r.invoiceDate,
    format: (v) => formatDate(v as string),
  },
  { key: 'invoiceNo', header: 'Invoice #', source: 'read', value: (r) => r.invoiceNo },
  { key: 'shipTo', header: 'Ship to', source: 'master', value: (r) => r.shipTo },
  { key: 'partNumber', header: 'Part Number', source: 'read', value: (r) => r.partNumber },
  {
    key: 'unitPrice',
    header: 'Unit Price',
    numeric: true,
    source: 'read',
    value: (r) => r.unitPrice,
    format: formatUnitPrice,
  },
  {
    key: 'setQty',
    header: 'Set QTY',
    numeric: true,
    source: 'master',
    value: (r) => r.setQty,
    format: formatQty,
  },
  {
    key: 'boxQty',
    header: 'Box QTY',
    numeric: true,
    source: 'read',
    value: (r) => r.boxQty,
    format: formatQty,
    total: (rows) => formatQty(sumOf(rows, (r) => r.boxQty)),
  },
  {
    key: 'totalQty',
    header: 'Total QTY',
    numeric: true,
    source: 'calc',
    value: (r) => r.totalQty,
    format: formatQty,
    total: (rows) => formatQty(sumOf(rows, (r) => r.totalQty)),
  },
  {
    key: 'totalAmount',
    header: 'Total Amount',
    numeric: true,
    source: 'calc',
    value: (r) => r.totalAmount,
    format: formatUsd,
    total: (rows) => formatUsd(sumOf(rows, (r) => r.totalAmount)),
  },
  { key: 'carrier', header: 'Carrier', source: 'read', value: (r) => r.carrier },
  {
    key: 'trackingNo',
    header: 'Tracking#',
    value: (r) => r.trackingNo,
    edit: { parse: parseText },
    width: 140,
  },
];

const rowKey = (row: Row) => row.id;
const rowLabel = (row: Row) => row.invoiceNo;

/** 현지 출하 Invoice List — 현지 창고에서 고객사로 보낸 Invoice를 품번별로 모아 보고, Tracking#을 넣어요 */
export function LocalInvoicesPage({ me, eyebrow }: { me: AuthMe; eyebrow: ReactNode }) {
  return (
    <ListScreen
      me={me}
      title="현지 출하 Invoice List"
      eyebrow={eyebrow}
      path={LOCAL_INVOICES_PATH}
      columns={COLUMNS}
      rowKey={rowKey}
      rowLabel={rowLabel}
      basis="Invoice date"
      empty={{
        title: '이 기간에는 현지 출하가 없어요',
        description: '위에서 기간을 바꿔 보세요. 현지 출하 Invoice를 올리면 여기에 쌓여요.',
        actions: (
          <Link className="jh-button" to="/invoices">
            Invoice로 가기
          </Link>
        ),
      }}
    />
  );
}
