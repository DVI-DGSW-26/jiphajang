/**
 * 마스터의 임시 모양. 칸 정의는 `src/config/forms/master.ts`, 경로는 `src/config/api.ts`예요.
 *
 * 현재 단가와 적용일은 계산 칸이에요. **단가를 고치는 API는 없고, 이력에 새 행을 더해요.**
 * 금액·단가는 문자열(decimal)로 받아요.
 */

export type Customer = {
  id: string;
  name: string;
  shipTo: string;
  /** 결제 조건 일수 — Net30이면 30 */
  paymentTermDays: number;
  /** TODO(확인 필요): 양식을 받기 전의 임시 값이에요 (Q18) */
  invoiceTemplate: string | null;
};

export type Warehouse = {
  id: string;
  name: string;
  location: string;
  contactEmail: string | null;
};

export type Part = {
  id: string;
  partNo: string;
  customerId: string;
  customerName: string;
  /** 인보이스 번호 앞자리 — `MT` */
  productCode: string;
  project: string | null;
  setQtyPerBox: number;
  /** 오늘 적용되는 단가. 아직 적용된 단가가 없으면 `null` */
  unitPrice: string | null;
  priceEffectiveFrom: string | null;
};

export type PartPrice = {
  id: string;
  unitPrice: string;
  effectiveFrom: string;
  createdAt: string;
  /** 오늘 적용되는 단가인가요 */
  current: boolean;
};
