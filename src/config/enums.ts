/** 상태값과 화면에 보일 이름. 값은 영어, 라벨은 한국어예요 */

export const CONTAINER_STATUS = {
  IN_TRANSIT: '선적 중',
  RECEIVED: '입고 완료',
} as const;
export type ContainerStatus = keyof typeof CONTAINER_STATUS;

export const INVOICE_STATUS = {
  DRAFT: '임시 저장',
  PENDING: '출고 대기',
  SHIPPED: '출고 완료',
  CANCELED: '취소',
} as const;
export type InvoiceStatus = keyof typeof INVOICE_STATUS;

export const COLLECTION_STATUS = {
  UNPAID: '미수',
  PARTIAL: '부분 수금',
  PAID: '수금 완료',
} as const;
export type CollectionStatus = keyof typeof COLLECTION_STATUS;

// TODO(확인 필요): 관세가 켜고 끄는 값인지 비율인지, 입력하면 어떤 금액이 달라지는지 (Q16)
export const TARIFF_RATE = {
  '0': '없음',
  '50': '50%',
} as const;

// TODO(확인 필요): 고객사별 양식을 받기 전의 임시 목록이에요 (Q18)
export const INVOICE_TEMPLATE = {
  'template-1': '양식 1',
  'template-2': '양식 2',
  'template-3': '양식 3',
} as const;

export type EnumOption = { value: string; label: string };

/** 상태표를 고르기 칸의 선택지로 바꿔요 */
export function enumOptions(labels: Readonly<Record<string, string>>): EnumOption[] {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}
