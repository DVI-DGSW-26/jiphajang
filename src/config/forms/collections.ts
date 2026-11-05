import type { ColumnDef } from './types.ts';

/** 수금 관리 (`/collections`) */

export const collectionColumns: ColumnDef[] = [
  { key: 'invoiceNo', label: '인보이스', type: 'text' },
  { key: 'customerName', label: '고객사', type: 'text', source: 'master' },
  { key: 'containers', label: '출고 컨테이너', type: 'text', source: 'rule' },
  { key: 'plannedAmount', label: '계획 금액', type: 'money', source: 'calc' },
  { key: 'plannedDate', label: '계획일', type: 'date', source: 'calc' },
  { key: 'paidDate', label: '수금일', type: 'date', editable: true },
  { key: 'paidAmount', label: '실적 금액', type: 'money', editable: true },
  // TODO(확인 필요): 부분 수금이면 지연일을 무엇으로 셀지. 지금은 미수가 남았으니 오늘 기준이에요 (Q15)
  { key: 'delayDays', label: '지연', type: 'number', source: 'calc', provisional: true },
  // TODO(확인 필요): 초과 입금과 조기 지급 할인을 어떻게 보여줄지 (Q14, Q15)
  { key: 'outstanding', label: '미수', type: 'money', source: 'calc', provisional: true },
  { key: 'status', label: '상태', type: 'text', source: 'calc' },
];

export const COLLECTION_NOTE = '계획일 = 인보이스 일자 + 결제 조건, 지연 = 수금일 − 계획일';
