import type { FieldDef } from './types.ts';

/** 인보이스 작성 (`/invoices/new`), 수정·상세 (`/invoices/:id`). 임시 저장 상태만 고칠 수 있어요 */

export const invoiceHeadFields: FieldDef[] = [
  { key: 'customerId', label: '고객사', type: 'select', mode: 'input', required: true },
  { key: 'shipFromWarehouseId', label: '출고 창고', type: 'select', mode: 'input', required: true },
  { key: 'invoiceDate', label: '인보이스 일자', type: 'date', mode: 'input', required: true },
  // TODO(확인 필요): 인보이스에 PO 번호를 적는지 (Q5)
  { key: 'poNo', label: 'PO 번호', type: 'text', mode: 'input', provisional: true },
  // TODO(확인 필요): 품목의 제품코드가 여러 개면 첫 품목 기준으로 번호를 만들어요 (Q11)
  {
    key: 'invoiceNo',
    label: '인보이스 번호',
    type: 'text',
    mode: 'auto',
    source: 'rule',
    provisional: true,
  },
  { key: 'shipTo', label: '납품처', type: 'text', mode: 'auto', source: 'master' },
  { key: 'paymentTerms', label: '결제 조건', type: 'text', mode: 'auto', source: 'master' },
  { key: 'dueDate', label: '수금 예정일', type: 'date', mode: 'auto', source: 'calc' },
];

export const invoiceLineFields: FieldDef[] = [
  { key: 'partId', label: '품번', type: 'select', mode: 'input', required: true },
  // TODO(확인 필요): Box가 곧 팔레트인지 (Q3)
  {
    key: 'boxQty',
    label: 'Box QTY',
    type: 'number',
    mode: 'input',
    required: true,
    min: 1,
    provisional: true,
  },
  // TODO(확인 필요): 출하마다 바뀌는지 (Q1)
  {
    key: 'setQty',
    label: 'Set QTY',
    type: 'number',
    mode: 'auto',
    source: 'master',
    provisional: true,
  },
  { key: 'totalQty', label: 'Total QTY', type: 'number', mode: 'auto', source: 'calc' },
  // TODO(확인 필요): 단가 기준 — 컨테이너별인지 품번별인지 (Q2)
  {
    key: 'unitPrice',
    label: 'Unit Price',
    type: 'price',
    mode: 'auto',
    source: 'master',
    provisional: true,
  },
  { key: 'amount', label: 'Amount', type: 'money', mode: 'auto', source: 'calc' },
  { key: 'allocation', label: 'FIFO 배정', type: 'text', mode: 'auto', source: 'rule' },
];
