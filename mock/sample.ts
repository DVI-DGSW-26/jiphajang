/** 가짜 목록 데이터를 만들 때 함께 쓰는 것 */

/** 같은 글자면 늘 같은 수 */
export function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** 소수 문자열 × 정수 → 소수 문자열 (자릿수 유지) */
export function multiply(decimal: string, factor: string, digits: number): string {
  const [aWhole = '0', aFrac = ''] = decimal.split('.');
  const [bWhole = '0', bFrac = ''] = factor.split('.');
  const scale = aFrac.length + bFrac.length;
  const product = BigInt(aWhole + aFrac) * BigInt(bWhole + bFrac);
  // 사사오입으로 digits 자리까지
  const drop = scale - digits;
  const rounded =
    drop > 0 ? (product + 5n * 10n ** BigInt(drop - 1)) / 10n ** BigInt(drop) : product;
  const text = rounded.toString().padStart(digits + 1, '0');
  return digits > 0 ? `${text.slice(0, -digits)}.${text.slice(-digits)}` : text;
}

export function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

/** 2025-01-01부터 오늘까지 하루씩 */
export function* eachDay(): Generator<Date> {
  const today = Date.now();
  for (let day = Date.UTC(2025, 0, 1); day <= today; day += DAY_MS) yield new Date(day);
}

/** 이 날짜가 최근 2주 안인가요 — 아직 채우지 않은 칸을 보여주려고 써요 */
export function isRecent(date: string): boolean {
  return date >= iso(new Date(Date.now() - 14 * DAY_MS));
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export const DATE = /^\d{4}-\d{2}-\d{2}$/;
export const DECIMAL = /^\d+(\.\d+)?$/;
