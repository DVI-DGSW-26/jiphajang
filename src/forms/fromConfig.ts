import type { GridColumn, ParseResult } from '../components/grid/gridModel.ts';
import {
  parseDate,
  parseDecimal,
  parseProductCode,
  parseText,
  parseWholeNumber,
} from '../components/grid/parsers.ts';
import type { CellType, ColumnDef, FieldDef } from '../config/forms/types.ts';
import { formatDate, formatMoney, formatPrice, formatQty, formatShortDate } from '../lib/format.ts';

/** 칸·열 정의(`src/config/forms/`)를 입력 읽기와 표 열로 바꿔요 */

/** 받침이 있으면 `을`, 없으면 `를`. 한글이 아닌 끝글자는 `를`로 읽어요 */
function objectParticle(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0 ? '을' : '를';
}

export function requiredMessage(def: { label: string; type: CellType }): string {
  const verb = def.type === 'select' ? '골라' : '넣어';
  return `${def.label}${objectParticle(def.label)} ${verb} 주세요.`;
}

function parseByType(type: CellType, text: string, min: number): ParseResult {
  switch (type) {
    case 'number': {
      const result = parseWholeNumber(text);
      if ('error' in result) return { error: `${min} 이상의 정수로 넣어 주세요.` };
      return result.value !== null && Number(result.value) < min
        ? { error: `${min} 이상으로 넣어 주세요.` }
        : result;
    }
    case 'price': {
      const result = parseDecimal(text);
      if ('error' in result) return { error: '숫자로 넣어 주세요. 예: 1.2500' };
      return result.value !== null && Number(result.value) <= 0
        ? { error: '0보다 크게 넣어 주세요.' }
        : result;
    }
    case 'money': {
      const result = parseDecimal(text);
      return 'error' in result ? { error: '0 이상의 숫자로 넣어 주세요. 예: 750.00' } : result;
    }
    case 'date':
      return parseDate(text);
    case 'code':
      return parseProductCode(text);
    default:
      return parseText(text);
  }
}

/** 칸 하나를 읽어요. 빈 칸이면 필수일 때만 오류예요 */
export function parseCell(
  def: { label: string; type: CellType; min?: number },
  text: string,
  isRequired: boolean,
): ParseResult {
  const result = parseByType(def.type, text, def.min ?? 0);
  return isRequired && 'value' in result && result.value === null
    ? { error: requiredMessage(def) }
    : result;
}

export function isFieldRequired(def: FieldDef, texts: Record<string, string>): boolean {
  if (def.required) return true;
  return !!def.requiredWhen && texts[def.requiredWhen.key] === def.requiredWhen.equals;
}

export type FieldValues = Record<string, string | null>;

/** 입력 칸들을 읽어요. 자동 칸은 건너뛰어요. `errors`가 비어 있으면 보낼 수 있어요 */
export function readFields(
  defs: readonly FieldDef[],
  texts: Record<string, string>,
): { values: FieldValues; errors: Record<string, string> } {
  const values: FieldValues = {};
  const errors: Record<string, string> = {};
  for (const def of defs) {
    if (def.mode === 'auto') continue;
    const result = parseCell(def, texts[def.key] ?? '', isFieldRequired(def, texts));
    if ('error' in result) errors[def.key] = result.error;
    else values[def.key] = result.value;
  }
  return { values, errors };
}

/** 첫 값들. 정의의 `initial` 위에 화면이 준 값을 얹어요 */
export function initialTexts(
  defs: readonly FieldDef[],
  given: Record<string, string> = {},
): Record<string, string> {
  return Object.fromEntries(defs.map((def) => [def.key, given[def.key] ?? def.initial ?? '']));
}

export function isNumericType(type: CellType): boolean {
  return type === 'number' || type === 'price' || type === 'money';
}

/** 칸 값을 정해진 형식의 글자로 — 단가 `$1.2500`, 금액 `$750.00` */
export function formatCell(type: CellType, value: unknown, short = false): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  switch (type) {
    case 'number':
      return formatQty(text);
    case 'price':
      return formatPrice(text);
    case 'money':
      return formatMoney(text);
    case 'date':
      return short ? formatShortDate(text) : formatDate(text);
    default:
      return text;
  }
}

/** 열 정의를 공통 표의 열로. 화면에서만 정할 것(배지, 단추 등)은 `overrides`로 줘요 */
export function gridColumns<Row>(
  defs: readonly ColumnDef[],
  overrides: Record<string, Partial<GridColumn<Row>>> = {},
): GridColumn<Row>[] {
  return defs.map((def) => {
    const column: GridColumn<Row> = {
      key: def.key,
      header: def.label,
      value: (row) => (row as Record<string, string | number | null>)[def.key],
      format: (value) => formatCell(def.type, value, def.short),
      ...(isNumericType(def.type) ? { numeric: true } : {}),
      ...(def.source ? { source: def.source } : {}),
      ...(def.editable
        ? { edit: { parse: (text: string) => parseCell(def, text, !!def.required) } }
        : {}),
    };
    return { ...column, ...overrides[def.key] };
  });
}
