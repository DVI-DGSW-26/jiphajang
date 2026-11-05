import type { CollectionStatus } from '../config/enums.ts';
import { sumDecimal } from '../lib/decimal.ts';

/**
 * 계산 규칙 — 화면과 가짜 서버가 같이 써요.
 * FIFO 배정과 번호 발급은 서버 몫이라 여기에 두지 않아요(`mock/overseas/flow.ts`).
 */

/** 브라우저 시간대의 오늘 `YYYY-MM-DD`. TODO(확인 필요): “오늘”의 기준 시간대 (Q26) */
export function today(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

const utc = (date: string) => {
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
};

export function addDays(date: string, days: number): string {
  return new Date(utc(date) + days * 86_400_000).toISOString().slice(0, 10);
}

/** `to − from` 일수 */
export function daysBetween(from: string, to: string): number {
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

/** 금액을 소수 2자리로 맞춰요. 반올림은 사사오입. TODO(확인 필요): 반올림 기준 (Q23) */
function toCents(digits: bigint, scale: number): bigint {
  if (scale <= 2) return digits * 10n ** BigInt(2 - scale);
  const drop = 10n ** BigInt(scale - 2);
  return (digits + drop / 2n) / drop;
}

function fromCents(cents: bigint): string {
  const negative = cents < 0n;
  const text = (negative ? -cents : cents).toString().padStart(3, '0');
  return `${negative ? '-' : ''}${text.slice(0, -2)}.${text.slice(-2)}`;
}

/** Amount = Total QTY × Unit Price */
export function lineAmount(totalQty: number, unitPrice: string): string {
  const [whole = '0', fraction = ''] = unitPrice.split('.');
  return fromCents(toCents(BigInt(totalQty) * BigInt(`${whole}${fraction}`), fraction.length));
}

/** 금액을 더해요. 하나도 없으면 `0.00` */
export function sumMoney(values: Iterable<string | null | undefined>): string {
  const sum = sumDecimal(values) ?? '0';
  const negative = sum.startsWith('-');
  const [whole = '0', fraction = ''] = sum.replace('-', '').split('.');
  const cents = toCents(BigInt(`${whole}${fraction}`), fraction.length);
  return fromCents(negative ? -cents : cents);
}

/** 인보이스 번호 끝의 순번. 0 → A, 25 → Z, 26 → AA */
export function sequenceLetter(index: number): string {
  const letter = String.fromCharCode(65 + (index % 26));
  return index < 26 ? letter : `${sequenceLetter(Math.floor(index / 26) - 1)}${letter}`;
}

type CollectionInput = {
  plannedAmount: string;
  plannedDate: string;
  paidAmount: string | null;
  paidDate: string | null;
};

export type CollectionFigures = {
  outstanding: string;
  status: CollectionStatus;
  delayDays: number | null;
  isOverdue: boolean;
};

/** 미수 = 계획 − 실적. 지연은 수금일 − 계획일(음수면 0), 미수가 남았으면 오늘 − 계획일 */
export function collectionFigures(row: CollectionInput, on: string): CollectionFigures {
  const paid = row.paidAmount ?? '0';
  const outstanding = sumMoney([row.plannedAmount, `-${paid}`]);
  const status: CollectionStatus =
    Number(paid) === 0
      ? 'UNPAID'
      : outstanding.startsWith('-') || Number(outstanding) === 0
        ? 'PAID'
        : 'PARTIAL';
  const late = on > row.plannedDate;
  const delayDays =
    status === 'PAID' && row.paidDate
      ? Math.max(0, daysBetween(row.plannedDate, row.paidDate))
      : late
        ? daysBetween(row.plannedDate, on)
        : null;
  return { outstanding, status, delayDays, isOverdue: status !== 'PAID' && late };
}
