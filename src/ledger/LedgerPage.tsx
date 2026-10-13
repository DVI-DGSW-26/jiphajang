import { Link } from 'react-router';
import { Badge } from '../components/Badge.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import type { AuthMe } from '../lib/api.ts';
import { sumDecimal } from '../lib/decimal.ts';
import { formatDate, formatQty, formatUnitPrice, formatUsd } from '../lib/format.ts';
import { ListScreen } from '../lists/ListScreen.tsx';
import { LEDGER_PATH, type LedgerRow } from './ledger.ts';

type Row = LedgerRow;

/** 열 — 한국 선적과 현지 출하에 다 있는 것만 (잠정). 원장은 고칠 칸이 없어요 */
const COLUMNS: GridColumn<Row>[] = [
  {
    key: 'kind',
    header: '구분',
    value: (r) => r.kind,
    render: (r) => <Badge tone="kind">{r.kind}</Badge>,
    width: 104,
  },
  {
    key: 'date',
    header: '날짜',
    source: 'read',
    value: (r) => r.date,
    format: (v) => formatDate(v as string),
  },
  { key: 'invoiceNo', header: 'Invoice', source: 'read', value: (r) => r.invoiceNo },
  { key: 'customer', header: '고객사', source: 'master', value: (r) => r.customer },
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
    key: 'totalQty',
    header: 'Total QTY',
    numeric: true,
    source: 'calc',
    value: (r) => r.totalQty,
    format: formatQty,
    total: (rows) => formatQty(sumDecimal(rows.map((r) => r.totalQty))),
  },
  {
    key: 'amount',
    header: '금액 (USD)',
    numeric: true,
    source: 'calc',
    value: (r) => r.amount,
    format: formatUsd,
    total: (rows) => formatUsd(sumDecimal(rows.map((r) => r.amount))),
  },
];

const rowKey = (row: Row) => row.id;
const rowLabel = (row: Row) => row.invoiceNo;

/** 출하 원장 — 한국 선적과 현지 출하를 기간으로 한 목록에 모아 봐요. 결과 화면은 여기서 뽑아요 */
export function LedgerPage({ me }: { me: AuthMe }) {
  return (
    <ListScreen
      me={me}
      title="출하 원장"
      path={LEDGER_PATH}
      columns={COLUMNS}
      rowKey={rowKey}
      rowLabel={rowLabel}
      basis="날짜"
      empty={{
        title: '이 기간에는 출하가 없어요',
        description:
          '위에서 기간을 바꿔 보세요. Invoice를 올리면 한국 선적과 현지 출하가 여기에 쌓여요.',
        actions: (
          <Link className="jh-button" to="/invoices">
            Invoice로 가기
          </Link>
        ),
      }}
    />
  );
}
