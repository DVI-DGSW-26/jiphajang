import type { CollectionStatus, ContainerStatus, InvoiceStatus } from '../config/enums.ts';

/**
 * 입고 → 인보이스 → 확정 → 수금 → 재고로 이어지는 데이터의 임시 모양.
 * 화면과 가짜 서버가 같이 읽어요. 금액·단가는 문자열(decimal)이에요.
 */

/** 최근 입고 목록의 한 줄. 컨테이너 안의 품번 하나예요 */
export type ContainerRow = {
  id: string;
  containerId: string;
  containerNo: string;
  warehouseId: string;
  warehouseName: string;
  status: ContainerStatus;
  receivedDate: string | null;
  tariffRate: string;
  partId: string;
  partNo: string;
  initialPallets: number;
  remainingPallets: number;
  reservedPallets: number;
};

export type InvoiceAllocation = {
  /** 이전 출고 이력이면 `null` — 재고를 다시 빼지 않아요 */
  lotId: string | null;
  containerNo: string;
  pallets: number;
};

export type InvoiceLine = {
  partId: string;
  partNo: string;
  boxQty: number;
  setQty: number;
  totalQty: number;
  unitPrice: string;
  amount: string;
  /** `VX260807A 1 → VX260915A 5` */
  allocation: string;
  allocations: InvoiceAllocation[];
};

export type Invoice = {
  id: string;
  /** 임시 저장이면 아직 번호가 없어요 */
  invoiceNo: string | null;
  customerId: string;
  customerName: string;
  shipFromWarehouseId: string;
  warehouseName: string;
  invoiceDate: string;
  poNo: string | null;
  shipTo: string;
  paymentTerms: string;
  dueDate: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  /** `P1 외 1` */
  partNos: string;
  totalPallets: number;
  totalQty: number;
  totalAmount: string;
  shippedDate: string | null;
  bolFiles: string[];
};

export type PreviewLine = {
  partId: string;
  partNo: string;
  boxQty: number | null;
  setQty: number | null;
  totalQty: number | null;
  unitPrice: string | null;
  amount: string | null;
  allocation: string;
  /** 가용 재고로 모자란 팔레트 */
  shortage: number;
};

/** 저장하지 않고 번호·금액·배정만 계산한 결과. 번호는 예상값이에요 */
export type InvoicePreview = {
  invoiceNo: string | null;
  shipTo: string | null;
  paymentTerms: string | null;
  dueDate: string | null;
  lines: PreviewLine[];
  totalPallets: number;
  totalQty: number;
  totalAmount: string;
  availability: {
    partId: string;
    partNo: string;
    availablePallets: number;
    allocatedPallets: number;
  }[];
};

export type CollectionRow = {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  /** `VX260624A (6)` */
  containers: string;
  plannedAmount: string;
  plannedDate: string;
  paidDate: string | null;
  paidAmount: string | null;
  delayDays: number | null;
  outstanding: string;
  status: CollectionStatus;
  isOverdue: boolean;
};

export type CollectionSummary = {
  outstandingTotal: string;
  dueThisMonth: string;
  overdueCount: number;
};

export type StockRow = {
  id: string;
  warehouseId: string;
  warehouseName: string;
  customerName: string;
  partId: string;
  partNo: string;
  onHandQty: number;
  reservedQty: number;
  inTransitQty: number;
  unitPrice: string | null;
  stockAmount: string;
};

export type StockLotRow = {
  id: string;
  /** 선적 중이면 아직 순서가 없어요 */
  fifoOrder: number | null;
  containerNo: string;
  /** 선적 중이면 `null` */
  receivedDate: string | null;
  initialPallets: number;
  remainingPallets: number;
  reservedPallets: number;
  unitPrice: string;
  tariffRate: string;
};
