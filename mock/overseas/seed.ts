import type { Customer, Part, PartPrice, Warehouse } from '../../src/master/master.ts';

/**
 * 해외 출고 가짜 데이터의 시작값 — 샘플의 구조만 따라요.
 * **실제 고객사·창고·품번·단가·수량이 아니에요.** 공개 저장소라 실제 값은 넣지 않아요.
 */

export const seedWarehouses = (): Warehouse[] => [
  { id: 'w1', name: '창고 1', location: '미국', contactEmail: null },
  { id: 'w2', name: '창고 2', location: '멕시코', contactEmail: null },
  { id: 'w3', name: '창고 3', location: '멕시코', contactEmail: null },
];

export const seedCustomers = (): Customer[] => [
  {
    id: 'c1',
    name: '고객사 A',
    shipTo: '납품처 A',
    paymentTermDays: 30,
    invoiceTemplate: 'template-1',
  },
  { id: 'c2', name: '고객사 B', shipTo: '납품처 B', paymentTermDays: 30, invoiceTemplate: null },
];

/** 고객사 이름과 현재 단가는 `master.ts`가 채워요 */
export const seedParts = (): Part[] =>
  [
    {
      id: 'p1',
      partNo: 'P1',
      customerId: 'c1',
      productCode: 'MT',
      project: '모델 1',
      setQtyPerBox: 100,
    },
    {
      id: 'p2',
      partNo: 'P2',
      customerId: 'c1',
      productCode: 'MC',
      project: '모델 2',
      setQtyPerBox: 500,
    },
    {
      id: 'p3',
      partNo: 'P3',
      customerId: 'c1',
      productCode: 'MC',
      project: '모델 2',
      setQtyPerBox: 300,
    },
    {
      id: 'p4',
      partNo: 'P4',
      customerId: 'c2',
      productCode: 'R1',
      project: null,
      setQtyPerBox: 600,
    },
  ].map((part) => ({ ...part, customerName: '', unitPrice: null, priceEffectiveFrom: null }));

export type StoredPrice = Omit<PartPrice, 'current'> & { partId: string };

export const seedPrices = (): StoredPrice[] =>
  [
    { id: 'pr1', partId: 'p1', unitPrice: '1.2500' },
    { id: 'pr2', partId: 'p2', unitPrice: '0.5000' },
    { id: 'pr3', partId: 'p3', unitPrice: '0.7500' },
    { id: 'pr4', partId: 'p4', unitPrice: '0.4000' },
  ].map((price) => ({ ...price, effectiveFrom: '2026-01-01', createdAt: '2026-01-01' }));

export type StoredLot = {
  id: string;
  partId: string;
  pallets: number;
  /** 이관 기준의 남은 팔레트. 여기에 앞으로의 출고를 빼요 */
  openingRemaining: number;
  qtyPerPallet: number;
  unitPrice: string;
};

export type StoredContainer = {
  id: string;
  containerNo: string;
  warehouseId: string;
  status: 'IN_TRANSIT' | 'RECEIVED';
  receivedDate: string | null;
  tariffRate: string;
  lots: StoredLot[];
};

/** 품번 P1은 오래된 컨테이너에 1팔레트가 남아 있어요. 가용 21 중 6을 쓰면 1 → 5로 나뉘어요 */
export const seedContainers = (): StoredContainer[] => [
  {
    id: 'ct1',
    containerNo: 'VX260807A',
    warehouseId: 'w1',
    status: 'RECEIVED',
    receivedDate: '2026-09-05',
    tariffRate: '50',
    lots: [
      {
        id: 'l1',
        partId: 'p1',
        pallets: 20,
        openingRemaining: 1,
        qtyPerPallet: 100,
        unitPrice: '1.2500',
      },
    ],
  },
  {
    id: 'ct2',
    containerNo: 'VX260915A',
    warehouseId: 'w1',
    status: 'RECEIVED',
    receivedDate: '2026-10-15',
    tariffRate: '50',
    lots: [
      {
        id: 'l2',
        partId: 'p1',
        pallets: 20,
        openingRemaining: 20,
        qtyPerPallet: 100,
        unitPrice: '1.2500',
      },
    ],
  },
  {
    id: 'ct3',
    containerNo: 'VX261019A',
    warehouseId: 'w1',
    status: 'IN_TRANSIT',
    receivedDate: null,
    tariffRate: '50',
    lots: [
      {
        id: 'l3',
        partId: 'p1',
        pallets: 30,
        openingRemaining: 30,
        qtyPerPallet: 100,
        unitPrice: '1.2500',
      },
    ],
  },
  {
    id: 'ct4',
    containerNo: 'VY260904A',
    warehouseId: 'w2',
    status: 'RECEIVED',
    receivedDate: '2026-10-02',
    tariffRate: '0',
    lots: [
      {
        id: 'l4',
        partId: 'p2',
        pallets: 10,
        openingRemaining: 10,
        qtyPerPallet: 500,
        unitPrice: '0.5000',
      },
    ],
  },
];

/**
 * 출고를 마친 인보이스 이력. 컨테이너 잔량은 위 시작값에 이미 반영돼 있어요.
 * 그래서 배정의 `lotId`가 `null`이고, 재고를 다시 빼지 않아요.
 */
export const seedShippedInvoices = () => [
  {
    id: 'inv2',
    invoiceNo: 'MT261006A',
    invoiceDate: '2026-10-06',
    boxQty: 7,
    containerNo: 'VX260807A',
    paidDate: null,
    paidAmount: null,
  },
  {
    id: 'inv1',
    invoiceNo: 'MT260929A',
    invoiceDate: '2026-09-29',
    boxQty: 6,
    containerNo: 'VX260624A',
    paidDate: '2026-10-29',
    paidAmount: '750.00',
  },
];
