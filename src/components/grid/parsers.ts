import type { ParseResult } from './gridModel.ts';

/**
 * 직접 입력 칸에 친 글자를 서버에 보낼 값으로 바꿔요. 빈 칸은 `null`(지우기).
 * 실패 문구는 고치는 방법까지 써요.
 */

export function parseText(text: string): ParseResult {
  const value = text.trim();
  return { value: value === '' ? null : value };
}

/** 빈 칸을 받지 않는 칸. 빈 칸이면 `message`를 보여줘요 */
export function required(
  parse: (text: string) => ParseResult,
  message: string,
): (text: string) => ParseResult {
  return (text) => {
    const result = parse(text);
    return 'value' in result && result.value === null ? { error: message } : result;
  };
}

/** 0 이상의 정수. 쉼표는 빼고 읽어요 — 결제조건 일수 */
export function parseWholeNumber(text: string): ParseResult {
  const value = text.replaceAll(',', '').trim();
  if (value === '') return { value: null };
  if (/^\d+$/.test(value)) return { value: String(Number(value)) };
  return { error: '0 이상의 정수로 넣어 주세요. 예: 30' };
}

/** 1 이상의 정수. 쉼표는 빼고 읽어요 — 박스당 수량 */
export function parsePositiveWhole(text: string): ParseResult {
  const result = parseWholeNumber(text);
  if ('value' in result && result.value === '0') return { error: '1 이상으로 넣어 주세요.' };
  return 'error' in result ? { error: '1 이상의 정수로 넣어 주세요. 예: 100' } : result;
}

/** 제품코드는 인보이스 번호 앞자리예요. 소문자로 쳐도 대문자로 바꿔요 */
export function parseProductCode(text: string): ParseResult {
  const value = text.trim().toUpperCase();
  if (value === '') return { value: null };
  if (/^[A-Z0-9]+$/.test(value)) return { value };
  return { error: '영문과 숫자로만 넣어 주세요. 예: MT' };
}

/** `2026-10-12`, `2026.10.12`, `2026/10/12`, `2026-1-5` 모두 받아서 `YYYY-MM-DD`로 */
export function parseDate(text: string): ParseResult {
  const value = text.trim();
  if (value === '') return { value: null };
  const match = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/.exec(value);
  if (match) {
    const [, y = '', m = '', d = ''] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (date.getMonth() === Number(m) - 1 && date.getDate() === Number(d)) {
      return { value: `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
    }
  }
  return { error: '날짜는 2026-10-12처럼 넣어 주세요.' };
}

/** 쉼표는 빼고 읽어요. 음수는 받지 않아요(환율·금액에 음수가 없어요) */
export function parseDecimal(text: string): ParseResult {
  const value = text.replaceAll(',', '').trim();
  if (value === '') return { value: null };
  if (/^\d+(\.\d+)?$/.test(value)) return { value };
  return { error: '숫자로 넣어 주세요. 예: 1385.50' };
}
