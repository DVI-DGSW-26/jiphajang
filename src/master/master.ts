/**
 * 마스터 — 서버와 맞출 모양은 `docs/overseas-plan.md` 5장(초안)이에요.
 *
 * 현재 단가와 적용일은 계산 칸이에요. **단가를 고치는 API는 없고, 이력에 새 행을 더해요.**
 * 금액·단가는 문자열(decimal)로 받아요.
 */

export const CUSTOMERS_PATH = '/master/customers';
export const WAREHOUSES_PATH = '/master/warehouses';
export const PARTS_PATH = '/master/parts';

export const partPricesPath = (partId: string) =>
  `${PARTS_PATH}/${encodeURIComponent(partId)}/prices`;

export type Customer = {
  id: string;
  name: string;
  /** 납품처 */
  shipToName: string;
  /** 결제조건 일수 — Net30이면 30 */
  paymentTermDays: number;
};

export type Warehouse = {
  id: string;
  name: string;
  region: string | null;
};

export type Part = {
  id: string;
  partNo: string;
  customerId: string;
  customerName: string;
  /** 인보이스 번호 앞자리 — `MT` */
  productCode: string;
  project: string | null;
  /** 박스당 수량 */
  setQty: number;
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
