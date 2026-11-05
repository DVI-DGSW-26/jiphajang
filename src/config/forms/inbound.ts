import { CONTAINER_STATUS, enumOptions, TARIFF_RATE } from '../enums.ts';
import type { ColumnDef, FieldDef } from './types.ts';

/** 컨테이너 입고 (`/inbound`) */

// TODO(확인 필요): 컨테이너 번호 형식. 지금은 맞지 않아도 경고만 하고 저장해요
export const CONTAINER_NO_PATTERN = /^[A-Z]{2}\d{6}[A-Z]$/;
export const CONTAINER_NO_WARNING =
  '보통 VX260915A 같은 형식이에요. 맞다면 그대로 등록할 수 있어요.';

export const containerFields: FieldDef[] = [
  {
    key: 'containerNo',
    label: '컨테이너 번호',
    type: 'text',
    mode: 'input',
    required: true,
    provisional: true,
  },
  { key: 'warehouseId', label: '도착 창고', type: 'select', mode: 'input', required: true },
  {
    key: 'status',
    label: '상태',
    type: 'select',
    mode: 'input',
    required: true,
    options: enumOptions(CONTAINER_STATUS),
    initial: 'RECEIVED',
  },
  {
    key: 'receivedDate',
    label: '입고일',
    type: 'date',
    mode: 'input',
    requiredWhen: { key: 'status', equals: 'RECEIVED' },
    hint: '선적 중이면 비워도 돼요.',
  },
  // TODO(확인 필요): 없음 / 50% 말고 다른 값이 있는지, 입력하면 어떤 금액이 달라지는지 (Q16)
  {
    key: 'tariffRate',
    label: '관세',
    type: 'select',
    mode: 'input',
    required: true,
    options: enumOptions(TARIFF_RATE),
    provisional: true,
  },
];

export const containerLineFields: FieldDef[] = [
  { key: 'partId', label: '품번', type: 'select', mode: 'input', required: true },
  { key: 'pallets', label: '팔레트 수', type: 'number', mode: 'input', required: true, min: 1 },
  // TODO(확인 필요): 품번 마스터의 박스당 수량과 같은 값인지 (Q3)
  {
    key: 'qtyPerPallet',
    label: '팔레트당 수량',
    type: 'number',
    mode: 'auto',
    source: 'master',
    provisional: true,
  },
  { key: 'totalQty', label: '총수량', type: 'number', mode: 'auto', source: 'calc' },
  // TODO(확인 필요): 단가가 컨테이너별인지 품번별인지 (Q2)
  {
    key: 'unitPrice',
    label: '단가',
    type: 'price',
    mode: 'auto',
    source: 'master',
    provisional: true,
  },
  { key: 'amount', label: '금액', type: 'money', mode: 'auto', source: 'calc' },
];

export const recentContainerColumns: ColumnDef[] = [
  { key: 'containerNo', label: '컨테이너', type: 'text' },
  { key: 'warehouseName', label: '창고', type: 'text', source: 'master' },
  { key: 'receivedDate', label: '입고일', type: 'date' },
  { key: 'partNo', label: '품번', type: 'text', source: 'master' },
  { key: 'initialPallets', label: '최초 팔레트', type: 'number' },
  { key: 'remainingPallets', label: '남은 팔레트', type: 'number', source: 'calc' },
  { key: 'status', label: '상태', type: 'text' },
];

/** 선적 중 컨테이너가 도착했을 때 */
export const receiveFields: FieldDef[] = [
  { key: 'receivedDate', label: '입고일', type: 'date', mode: 'input', required: true },
];
