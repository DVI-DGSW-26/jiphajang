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

let scale = 1;

/**
 * 행 수를 몇 배로 늘릴지 — `.env.mock.local`의 `MOCK_SCALE`. 많은 행에서 화면이 느려지지
 * 않는지 볼 때 써요. 1이면 평소 예시 그대로예요. 첫 요청 전에 정해야 해요(행은 한 번만 만들어요).
 */
export function setMockScale(next: number): void {
  scale = Math.min(Math.max(Math.floor(next) || 1, 1), 100);
}

/**
 * 출하가 있는 날마다, `MOCK_SCALE`만큼 Invoice를 돌려줘요. 차수 글자는 A, B, C …
 * 첫 Invoice는 배수와 상관없이 늘 같아요.
 */
export function* eachShipment(
  salt: string,
  isShipDay: (day: Date, seed: number) => boolean,
): Generator<{ day: Date; date: string; seed: number; round: string }> {
  for (const day of eachDay()) {
    const date = iso(day);
    const seed = hash(`${salt}${date}`);
    if (!isShipDay(day, seed)) continue;
    for (let copy = 0; copy < scale; copy++) {
      yield {
        day,
        date,
        seed: copy === 0 ? seed : hash(`${salt}${date}#${copy}`),
        round: copy < 26 ? String.fromCharCode(65 + copy) : String(copy),
      };
    }
  }
}
