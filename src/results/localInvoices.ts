/**
 * 현지 출하 Invoice List 한 줄 — `docs/source-analysis.md` 5.3의 열을 추린 것이에요.
 *
 * **열은 잠정이에요.** 물류팀의 정확한 자료를 받으면 열이 늘거나 바뀌어요.
 * 받기·고치기 모양은 서버와 맞춘 공통 약속이에요(`src/lib/useList.ts`).
 */
export type LocalInvoiceRow = {
  id: string;
  /** 순번 (계산) */
  no: number;
  /** Invoice date (판독) */
  invoiceDate: string;
  /** Invoice # (판독) */
  invoiceNo: string;
  /** 코드표 (마스터) */
  shipTo: string;
  /** 원장 표기로 바꾼 품번 (판독 + 매핑) */
  partNumber: string;
  /** USD (판독) */
  unitPrice: string;
  /** 마스터 */
  setQty: number;
  /** 판독 */
  boxQty: number;
  /** Set × Box (계산) */
  totalQty: number;
  /** 단가 × Total QTY (계산) */
  totalAmount: string;
  /** Ship Via (판독) */
  carrier: string;
  /** 직접 입력 */
  trackingNo: string | null;
};

/** 직접 입력 칸 — 고칠 수 있는 것은 이것뿐이에요 */
export const LOCAL_INVOICE_INPUTS = [
  'trackingNo',
] as const satisfies readonly (keyof LocalInvoiceRow)[];

export const LOCAL_INVOICES_PATH = '/results/local-invoice-list';
