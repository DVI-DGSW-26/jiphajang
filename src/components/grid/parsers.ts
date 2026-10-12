import type { ParseResult } from './gridModel.ts';

/**
 * 직접 입력 칸에 친 글자를 서버에 보낼 값으로 바꿔요. 빈 칸은 `null`(지우기).
 * 실패 문구는 고치는 방법까지 써요(디자인 매뉴얼 5장).
 */

export function parseText(text: string): ParseResult {
  const value = text.trim();
  return { value: value === '' ? null : value };
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
