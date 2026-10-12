/**
 * 수출신고취합 한 줄 — `docs/source-analysis.md` 3.3의 열을 추린 것이에요.
 *
 * **잠정이에요.** 서버 API가 아직 없어서 가짜 서버(`mock/api.ts`)와만 맞췄어요.
 * 물류팀 답(10장 4번: Year·Month 기준, 확정마감 금액)을 받으면 열이 늘거나 바뀌어요.
 */
export type ExportDeclarationRow = {
  id: string;
  /** 출하 순번 (계산) */
  no: number;
  /** Invoice 날짜 (판독) */
  shipDate: string;
  /** Origin·B.Ship·날짜·차수로 만든 번호 (계산) */
  invoiceNo: string;
  /** 고정값 표 (마스터) */
  customer: string;
  /** 수출신고번호 (직접 입력) */
  declarationNo: string | null;
  /** 직접 입력 */
  blNo: string | null;
  /** 회계부 기준 선적일자 (직접 입력) */
  shippedOn: string | null;
  /** 원장 표기로 바꾼 품명 (판독 + 매핑) */
  itemName: string;
  /** USD (판독) */
  unitPrice: string;
  /** 팔레트당 수량 (마스터) */
  setQty: number;
  /** 팔레트 수 (판독) */
  boxQty: number;
  /** Set × Box (계산) */
  totalQty: number;
  /** 단가 × Total QTY (계산) */
  amountUsd: string;
  /** 직접 입력 */
  exchangeRate: string | null;
  /** 금액(USD) × 환율 (계산). 환율이 없으면 비어요 */
  amountKrw: string | null;
};

/** 직접 입력 칸 — 고칠 수 있는 것은 이것뿐이에요 */
export const EXPORT_DECLARATION_INPUTS = [
  'declarationNo',
  'blNo',
  'shippedOn',
  'exchangeRate',
] as const satisfies readonly (keyof ExportDeclarationRow)[];

export type ExportDeclarationInput = (typeof EXPORT_DECLARATION_INPUTS)[number];

export const EXPORT_DECLARATIONS_PATH = '/results/export-declarations';
