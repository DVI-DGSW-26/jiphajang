import { enumOptions, INVOICE_TEMPLATE } from '../enums.ts';
import type { ColumnDef, FieldDef } from './types.ts';

/** 마스터 — 품번 · 고객사 · 창고 탭 */

export const partFields: FieldDef[] = [
  { key: 'partNo', label: '품번', type: 'text', mode: 'input', required: true },
  { key: 'customerId', label: '고객사', type: 'select', mode: 'input', required: true },
  {
    key: 'productCode',
    label: '제품코드',
    type: 'code',
    mode: 'input',
    required: true,
    hint: '인보이스 번호 앞자리예요.',
  },
  { key: 'project', label: '프로젝트', type: 'text', mode: 'input' },
  {
    key: 'setQtyPerBox',
    label: '박스당 수량',
    type: 'number',
    mode: 'input',
    required: true,
    min: 1,
  },
  { key: 'unitPrice', label: '현재 단가', type: 'price', mode: 'input', required: true },
  { key: 'priceEffectiveFrom', label: '단가 적용일', type: 'date', mode: 'input', required: true },
];

export const partColumns: ColumnDef[] = [
  { key: 'partNo', label: '품번', type: 'text', editable: true, required: true },
  { key: 'customerName', label: '고객사', type: 'text', source: 'master' },
  { key: 'productCode', label: '제품코드', type: 'code', editable: true, required: true },
  { key: 'project', label: '프로젝트', type: 'text', editable: true },
  {
    key: 'setQtyPerBox',
    label: '박스당 수량',
    type: 'number',
    editable: true,
    required: true,
    min: 1,
  },
  { key: 'unitPrice', label: '현재 단가', type: 'price', source: 'calc' },
  { key: 'priceEffectiveFrom', label: '단가 적용일', type: 'date', source: 'calc' },
];

/** 단가 변경 — 덮어쓰지 않고 적용일과 함께 이력에 더해요 */
export const priceChangeFields: FieldDef[] = [
  { key: 'unitPrice', label: '새 단가', type: 'price', mode: 'input', required: true },
  { key: 'effectiveFrom', label: '적용일', type: 'date', mode: 'input', required: true },
];

export const customerFields: FieldDef[] = [
  { key: 'name', label: '고객사명', type: 'text', mode: 'input', required: true },
  { key: 'shipTo', label: '납품처', type: 'text', mode: 'input', required: true },
  {
    key: 'paymentTermDays',
    label: '결제 조건(일)',
    type: 'number',
    mode: 'input',
    required: true,
    min: 0,
    initial: '30',
    hint: 'Net30이면 30이에요.',
  },
  // TODO(확인 필요): 양식을 받기 전의 임시 칸이에요 (Q18)
  {
    key: 'invoiceTemplate',
    label: '인보이스 양식',
    type: 'select',
    mode: 'input',
    options: enumOptions(INVOICE_TEMPLATE),
    provisional: true,
  },
];

export const customerColumns: ColumnDef[] = [
  { key: 'name', label: '고객사명', type: 'text', editable: true, required: true },
  { key: 'shipTo', label: '납품처', type: 'text', editable: true, required: true },
  {
    key: 'paymentTermDays',
    label: '결제 조건(일)',
    type: 'number',
    editable: true,
    required: true,
    min: 0,
  },
  { key: 'invoiceTemplate', label: '인보이스 양식', type: 'select', provisional: true },
];

export const warehouseFields: FieldDef[] = [
  { key: 'name', label: '창고명', type: 'text', mode: 'input', required: true },
  { key: 'location', label: '위치', type: 'text', mode: 'input', required: true },
  { key: 'contactEmail', label: '담당자 메일', type: 'text', mode: 'input' },
];

export const warehouseColumns: ColumnDef[] = [
  { key: 'name', label: '창고명', type: 'text', editable: true, required: true },
  { key: 'location', label: '위치', type: 'text', editable: true, required: true },
  { key: 'contactEmail', label: '담당자 메일', type: 'text', editable: true },
];
