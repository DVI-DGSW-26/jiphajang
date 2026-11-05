import type { ColumnDef } from './types.ts';

/** 출고 확정 (`/shipments`) — 마지막 열만 동작이고 나머지는 자동 칸이에요 */

export const shipmentColumns: ColumnDef[] = [
  { key: 'invoiceNo', label: '인보이스', type: 'text' },
  { key: 'invoiceDate', label: '일자', type: 'date', short: true },
  { key: 'customerName', label: '고객사', type: 'text', source: 'master' },
  { key: 'warehouseName', label: '창고', type: 'text', source: 'master' },
  { key: 'partNos', label: '품번', type: 'text' },
  { key: 'totalQty', label: 'Total QTY', type: 'number', source: 'calc' },
  { key: 'totalAmount', label: 'Amount', type: 'money', source: 'calc' },
  { key: 'status', label: '상태', type: 'text' },
  { key: 'actions', label: '출고', type: 'text' },
];
