/**
 * 출하 원장 한 줄 — 한국 선적과 현지 출하를 한 목록에 모아요(`docs/source-analysis.md` 8장).
 *
 * **열은 잠정이에요.** 물류팀의 정확한 자료를 받으면 원장 모델과 함께 다시 정해요.
 * 지금은 두 출하에 다 있는 열만 두고, 고칠 칸은 없어요(각 결과 화면에서 고쳐요).
 */
export type LedgerRow = {
  id: string;
  kind: '한국 출하' | '현지 출하';
  /** Ship date / Invoice date (판독) */
  date: string;
  /** 판독 또는 계산 */
  invoiceNo: string;
  /** 고객사 / Ship to (마스터) */
  customer: string;
  /** 원장 표기 (판독 + 매핑) */
  itemName: string;
  /** USD (판독) */
  unitPrice: string;
  /** 계산 */
  totalQty: number;
  /** USD (계산) */
  amount: string;
};

export const LEDGER_PATH = '/ledger';
