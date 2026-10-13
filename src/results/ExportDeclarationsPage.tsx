import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { parseDate, parseDecimal, parseText } from '../components/grid/parsers.ts';
import type { AuthMe } from '../lib/api.ts';
import { sumDecimal } from '../lib/decimal.ts';
import {
  formatDate,
  formatKrw,
  formatQty,
  formatRate,
  formatUnitPrice,
  formatUsd,
} from '../lib/format.ts';
import { ListScreen } from '../lists/ListScreen.tsx';
import { EXPORT_DECLARATIONS_PATH, type ExportDeclarationRow } from './exportDeclarations.ts';

type Row = ExportDeclarationRow;

const sumOf = (rows: Row[], pick: (row: Row) => string | number | null) =>
  sumDecimal(rows.map(pick));

/** 열 — `docs/source-analysis.md` 3.3. 출처가 있는 열은 자동 칸이라 고칠 수 없어요 */
const COLUMNS: GridColumn<Row>[] = [
  { key: 'no', header: 'No', numeric: true, source: 'calc', value: (r) => r.no, width: 64 },
  {
    key: 'shipDate',
    header: 'Ship date',
    source: 'read',
    value: (r) => r.shipDate,
    format: (v) => formatDate(v as string),
  },
  { key: 'invoiceNo', header: 'Invoice', source: 'calc', value: (r) => r.invoiceNo },
  { key: 'customer', header: '고객사', source: 'master', value: (r) => r.customer },
  {
    key: 'declarationNo',
    header: '필증#',
    value: (r) => r.declarationNo,
    edit: { parse: parseText },
    width: 150,
  },
  { key: 'blNo', header: 'BL#', value: (r) => r.blNo, edit: { parse: parseText }, width: 120 },
  {
    key: 'shippedOn',
    header: '선적일자',
    value: (r) => r.shippedOn,
    format: (v) => formatDate(v as string | null),
    edit: { parse: parseDate },
    width: 120,
  },
  { key: 'itemName', header: '품명', source: 'read', value: (r) => r.itemName },
  {
    key: 'unitPrice',
    header: '단가 (USD)',
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
    key: 'amountUsd',
    header: '금액 (USD)',
    numeric: true,
    source: 'calc',
    value: (r) => r.amountUsd,
    format: formatUsd,
    total: (rows) => formatUsd(sumOf(rows, (r) => r.amountUsd)),
  },
  {
    key: 'exchangeRate',
    header: '환율',
    numeric: true,
    value: (r) => r.exchangeRate,
    format: formatRate,
    edit: { parse: parseDecimal },
    width: 110,
  },
  {
    key: 'amountKrw',
    header: '금액 (KRW)',
    numeric: true,
    source: 'calc',
    value: (r) => r.amountKrw,
    format: formatKrw,
    total: (rows) => formatKrw(sumOf(rows, (r) => r.amountKrw)),
  },
];

const rowKey = (row: Row) => row.id;
const rowLabel = (row: Row) => row.invoiceNo;

/** 수출신고취합 — 한국 출하를 기간으로 모아 보고, 필증#·BL#·선적일자·환율을 표에서 바로 넣어요 */
export function ExportDeclarationsPage({ me, eyebrow }: { me: AuthMe; eyebrow: ReactNode }) {
  return (
    <ListScreen
      me={me}
      title="수출신고취합"
      eyebrow={eyebrow}
      path={EXPORT_DECLARATIONS_PATH}
      columns={COLUMNS}
      rowKey={rowKey}
      rowLabel={rowLabel}
      basis="Ship date"
      empty={{
        title: '이 기간에는 한국 출하가 없어요',
        description: '위에서 기간을 바꿔 보세요. Invoice를 올리면 여기에 쌓여요.',
        actions: (
          <Link className="jh-button" to="/invoices">
            Invoice로 가기
          </Link>
        ),
      }}
    />
  );
}
