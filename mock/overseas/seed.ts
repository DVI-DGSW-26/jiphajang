import type { Customer, Part, PartPrice, Warehouse } from '../../src/master/master.ts';

/**
 * 해외 출고 가짜 데이터의 시작값 — 샘플의 구조만 따라요.
 * **실제 고객사·창고·품번·단가가 아니에요.** 공개 저장소라 실제 값은 넣지 않아요.
 */

export const seedWarehouses = (): Warehouse[] => [
  { id: 'w1', name: '창고 1', region: '미국' },
  { id: 'w2', name: '창고 2', region: '멕시코' },
  { id: 'w3', name: '창고 3', region: '멕시코' },
];

export const seedCustomers = (): Customer[] => [
  { id: 'c1', name: '고객사 A', shipToName: '납품처 A', paymentTermDays: 30 },
  { id: 'c2', name: '고객사 B', shipToName: '납품처 B', paymentTermDays: 30 },
];

/** 고객사 이름과 현재 단가는 `master.ts`가 채워요 */
export const seedParts = (): Part[] =>
  [
    { id: 'p1', partNo: 'P1', customerId: 'c1', productCode: 'MT', project: '모델 1', setQty: 100 },
    { id: 'p2', partNo: 'P2', customerId: 'c1', productCode: 'MC', project: '모델 2', setQty: 500 },
    { id: 'p3', partNo: 'P3', customerId: 'c2', productCode: 'R1', project: null, setQty: 600 },
  ].map((part) => ({ ...part, customerName: '', unitPrice: null, priceEffectiveFrom: null }));

export type StoredPrice = Omit<PartPrice, 'current'> & { partId: string };

export const seedPrices = (): StoredPrice[] =>
  [
    { id: 'pr1', partId: 'p1', unitPrice: '1.2500' },
    { id: 'pr2', partId: 'p2', unitPrice: '0.5000' },
    { id: 'pr3', partId: 'p3', unitPrice: '0.4000' },
  ].map((price) => ({ ...price, effectiveFrom: '2026-01-01', createdAt: '2026-01-01' }));
