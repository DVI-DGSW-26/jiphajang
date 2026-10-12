/**
 * 십진수 문자열 덧셈 — 금액·단가는 서버가 문자열(decimal)로 보내요(`format.ts`).
 * `Number`로 더하면 `0.1 + 0.2`처럼 끝자리가 틀어져요. 소수 자릿수를 맞춰 정수(BigInt)로 더해요.
 */

const DECIMAL = /^\s*([-+]?)(\d*)(?:\.(\d*))?\s*$/;

type Parsed = { negative: boolean; digits: string; scale: number };

function parse(value: string | number): Parsed | null {
  const text = typeof value === 'number' ? (Number.isFinite(value) ? String(value) : '') : value;
  if (/e/i.test(text)) return null;
  const match = DECIMAL.exec(text);
  if (!match) return null;
  const [, sign = '', whole = '', fraction = ''] = match;
  if (whole === '' && fraction === '') return null;
  return { negative: sign === '-', digits: `${whole}${fraction}` || '0', scale: fraction.length };
}

/** 숫자로 읽을 수 있는 문자열인가요 — 쉼표는 받지 않아요 */
export function isDecimal(value: string): boolean {
  return parse(value) !== null;
}

/** 값들을 더해요. 숫자로 읽을 수 없는 값은 건너뛰어요. 하나도 없으면 `null` */
export function sumDecimal(values: Iterable<string | number | null | undefined>): string | null {
  const parsed: Parsed[] = [];
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const item = parse(value);
    if (item) parsed.push(item);
  }
  if (parsed.length === 0) return null;

  const scale = Math.max(...parsed.map((item) => item.scale));
  let total = 0n;
  for (const item of parsed) {
    const scaled = BigInt(item.digits) * 10n ** BigInt(scale - item.scale);
    total += item.negative ? -scaled : scaled;
  }

  const negative = total < 0n;
  const digits = (negative ? -total : total).toString().padStart(scale + 1, '0');
  const whole = digits.slice(0, digits.length - scale);
  const fraction = scale > 0 ? `.${digits.slice(digits.length - scale)}` : '';
  return `${negative ? '-' : ''}${whole}${fraction}`;
}
