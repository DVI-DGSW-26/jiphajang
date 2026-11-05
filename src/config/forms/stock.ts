import type { ColumnDef } from './types.ts';

/** 재고 현황 (`/stock`) — 조회 전용이에요 */

export const stockColumns: ColumnDef[] = [
  { key: 'warehouseName', label: '창고', type: 'text', source: 'master' },
  { key: 'customerName', label: '고객사', type: 'text', source: 'master' },
  { key: 'partNo', label: '품번', type: 'text', source: 'master' },
  { key: 'onHandQty', label: '현지 재고', type: 'number', source: 'calc' },
  { key: 'reservedQty', label: '출고 대기', type: 'number', source: 'calc' },
  { key: 'inTransitQty', label: '선적 중', type: 'number', source: 'calc' },
  { key: 'unitPrice', label: '단가', type: 'price', source: 'master' },
  // TODO(확인 필요): 컨테이너별 단가를 합산하는지, 판가인지 원가인지, 선적 중도 포함하는지 (Q17)
  { key: 'stockAmount', label: '재고 금액', type: 'money', source: 'calc', provisional: true },
];

export const stockLotColumns: ColumnDef[] = [
  { key: 'fifoOrder', label: '순서', type: 'number', source: 'rule' },
  { key: 'containerNo', label: '컨테이너', type: 'text' },
  { key: 'receivedDate', label: '입고일', type: 'date' },
  { key: 'initialPallets', label: '최초 팔레트', type: 'number' },
  { key: 'remainingPallets', label: '남은 팔레트', type: 'number', source: 'calc' },
  { key: 'reservedPallets', label: '출고 대기', type: 'number', source: 'calc' },
  { key: 'unitPrice', label: '단가', type: 'price', source: 'master', provisional: true },
  { key: 'tariffRate', label: '관세', type: 'text', provisional: true },
];

export const FIFO_NOTE = '출고는 1번부터 차례대로 빠집니다.';
