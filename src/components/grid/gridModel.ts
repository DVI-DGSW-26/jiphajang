import type { ReactNode } from 'react';
import type { Source } from '../SourceTag.tsx';

/**
 * 엑셀처럼 쓰는 표의 계산 부분 — 필터·정렬·선택 범위·복사.
 * 화면과 떨어뜨려 두어 시험하기 쉽게 했어요 (`Grid.tsx`가 그려요).
 */

export type CellValue = string | number | null | undefined;

/** 직접 입력 칸의 고친 값 읽기. 실패하면 칸 아래에 보일 문구를 돌려줘요 */
export type ParseResult = { value: string | null } | { error: string };

export type GridColumn<Row> = {
  key: string;
  header: string;
  /** 숫자 열은 Mono 글꼴, 오른쪽 정렬. 정렬도 숫자로 해요 */
  numeric?: boolean;
  /** 자동으로 채운 열이면 출처. 머리줄에 출처 표시, 칸은 미색. 자동 칸은 고칠 수 없어요 */
  source?: Source;
  /** 정렬·필터·복사에 쓰는 값. 금액은 서버가 준 문자열 그대로 */
  value: (row: Row) => CellValue;
  /** 화면에 보이는 글자. 필터 목록도 이 글자로 보여줘요. 없으면 값 그대로 */
  format?: (value: CellValue) => string;
  /** 칸 안을 따로 그릴 때(배지 등). 없으면 `format` 글자 */
  render?: (row: Row) => ReactNode;
  /** 직접 입력 열이면 고칠 수 있어요. 고친 글자를 서버에 보낼 값으로 바꿔요 */
  edit?: { parse: (text: string) => ParseResult };
  /** 칸 폭(px). 없으면 내용에 맞춰요 */
  width?: number;
  /** 합계줄 값. 필터를 거친 행으로 구해요 */
  total?: (rows: Row[]) => string;
};

export const BLANK_LABEL = '(빈 칸)';

export function displayText<Row>(column: GridColumn<Row>, row: Row): string {
  const value = column.value(row);
  if (column.format) return column.format(value);
  return value === null || value === undefined ? '' : String(value);
}

/** 필터 목록의 글자. 빈 칸은 엑셀처럼 `(빈 칸)`으로 모아요 */
export function filterLabel<Row>(column: GridColumn<Row>, row: Row): string {
  return displayText(column, row) || BLANK_LABEL;
}

/** 열마다 보여줄 값(필터 목록 글자). 열이 없으면 거르지 않아요 */
export type Filters = Record<string, ReadonlySet<string>>;
export type Sort = { key: string; direction: 'asc' | 'desc' } | null;

export function applyFilters<Row>(
  rows: readonly Row[],
  columns: readonly GridColumn<Row>[],
  filters: Filters,
  /** 이 열의 필터는 빼고 걸러요 — 필터 목록에 다른 열로 걸러진 값만 보여줄 때 */
  except?: string,
): Row[] {
  const active = columns.filter((column) => column.key !== except && filters[column.key]);
  if (active.length === 0) return [...rows];
  return rows.filter((row) =>
    active.every((column) => filters[column.key]?.has(filterLabel(column, row))),
  );
}

const collator = new Intl.Collator('ko', { numeric: true });

function compareValues(a: CellValue, b: CellValue, numeric: boolean): number {
  const blankA = a === null || a === undefined || a === '';
  const blankB = b === null || b === undefined || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  if (numeric) {
    const diff = Number(a) - Number(b);
    if (!Number.isNaN(diff)) return diff;
  }
  return collator.compare(String(a), String(b));
}

/** 정렬해요. 빈 칸은 오름차순·내림차순 모두 맨 아래(엑셀과 같아요). 같은 값은 원래 순서 */
export function sortRows<Row>(
  rows: readonly Row[],
  columns: readonly GridColumn<Row>[],
  sort: Sort,
): Row[] {
  const column = sort && columns.find((item) => item.key === sort.key);
  if (!sort || !column) return [...rows];
  const sign = sort.direction === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: column.value(row) }))
    .sort((a, b) => {
      const blankA = a.value === null || a.value === undefined || a.value === '';
      const blankB = b.value === null || b.value === undefined || b.value === '';
      if (blankA !== blankB) return blankA ? 1 : -1;
      return sign * compareValues(a.value, b.value, !!column.numeric) || a.index - b.index;
    })
    .map((item) => item.row);
}

/** 필터 목록에 보여줄 값들. 숫자 열은 숫자 순, 빈 칸은 맨 끝 */
export function distinctLabels<Row>(rows: readonly Row[], column: GridColumn<Row>): string[] {
  const byLabel = new Map<string, CellValue>();
  for (const row of rows) {
    const label = filterLabel(column, row);
    if (!byLabel.has(label)) byLabel.set(label, column.value(row));
  }
  return [...byLabel.entries()]
    .sort(([labelA, a], [labelB, b]) => {
      if (labelA === BLANK_LABEL || labelB === BLANK_LABEL) {
        return labelA === labelB ? 0 : labelA === BLANK_LABEL ? 1 : -1;
      }
      return compareValues(a, b, !!column.numeric);
    })
    .map(([label]) => label);
}

export type CellPos = { row: number; col: number };
export type Range = { top: number; left: number; bottom: number; right: number };

export function toRange(anchor: CellPos, focus: CellPos): Range {
  return {
    top: Math.min(anchor.row, focus.row),
    bottom: Math.max(anchor.row, focus.row),
    left: Math.min(anchor.col, focus.col),
    right: Math.max(anchor.col, focus.col),
  };
}

export function clampPos(pos: CellPos, rowCount: number, colCount: number): CellPos {
  return {
    row: Math.min(Math.max(pos.row, 0), Math.max(rowCount - 1, 0)),
    col: Math.min(Math.max(pos.col, 0), Math.max(colCount - 1, 0)),
  };
}

/** 복사할 글자 한 칸. 숫자는 쉼표 없는 값 그대로 — 엑셀에 붙이면 숫자로 들어가요 */
function copyText<Row>(column: GridColumn<Row>, row: Row): string {
  const text = column.numeric
    ? (() => {
        const value = column.value(row);
        return value === null || value === undefined ? '' : String(value);
      })()
    : displayText(column, row);
  // 탭·줄바꿈이 섞이면 엑셀에서 칸이 밀려요
  return text.replace(/[\t\r\n]+/g, ' ');
}

/** 선택 범위를 탭으로 나눈 글자로 — 엑셀에 그대로 붙여 넣을 수 있어요 */
export function rangeToTsv<Row>(
  rows: readonly Row[],
  columns: readonly GridColumn<Row>[],
  range: Range,
): string {
  const lines: string[] = [];
  for (let r = range.top; r <= range.bottom; r++) {
    const row = rows[r];
    if (row === undefined) continue;
    const cells: string[] = [];
    for (let c = range.left; c <= range.right; c++) {
      const column = columns[c];
      if (column) cells.push(copyText(column, row));
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\r\n');
}
