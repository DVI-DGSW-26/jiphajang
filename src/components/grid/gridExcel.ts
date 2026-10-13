import {
  formatKrw,
  formatQty,
  formatRate,
  formatUnitPrice,
  formatUsd,
  type NumericInput,
} from '../../lib/format.ts';
import {
  cellRef,
  XLSX_STYLE,
  type XlsxCell,
  type XlsxSheet,
  type XlsxStyle,
} from '../../lib/xlsx.ts';
import { displayText, type GridColumn } from './gridModel.ts';

/**
 * 표를 엑셀 시트로 — 화면에서 거르고 정렬한 행 그대로예요.
 * 맨 위에 제목과 설명(기간·작성자·출력 시각), 그 아래 머리줄, 행, 합계줄.
 * 합계는 `SUBTOTAL`이라 엑셀에서 필터를 바꾸면 보이는 행만 다시 더해요.
 */

type Kind = 'text' | 'date' | 'qty' | 'unitPrice' | 'money' | 'general';

/** 숫자 열의 엑셀 서식은 화면에서 쓰는 형식 함수로 정해요 (`src/lib/format.ts`) */
const NUMBER_KINDS = new Map<(value: NumericInput) => string, Kind>([
  [formatQty, 'qty'],
  [formatKrw, 'qty'],
  [formatUnitPrice, 'unitPrice'],
  [formatUsd, 'money'],
  [formatRate, 'money'],
]);

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function columnKind<Row>(column: GridColumn<Row>, rows: readonly Row[]): Kind {
  if (column.numeric) {
    return NUMBER_KINDS.get(column.format as (value: NumericInput) => string) ?? 'general';
  }
  // 값이 모두 `YYYY-MM-DD`(또는 빈 칸)이면 날짜 열이에요
  const values = rows.map((row) => column.value(row)).filter((v) => v !== null && v !== '');
  return values.length > 0 && values.every((v) => typeof v === 'string' && DATE.test(v))
    ? 'date'
    : 'text';
}

const BODY_STYLE: Record<Kind, XlsxStyle> = {
  text: XLSX_STYLE.general,
  general: XLSX_STYLE.general,
  date: XLSX_STYLE.date,
  qty: XLSX_STYLE.qty,
  unitPrice: XLSX_STYLE.unitPrice,
  money: XLSX_STYLE.money,
};

const TOTAL_STYLE: Record<Kind, XlsxStyle> = {
  text: XLSX_STYLE.totalLabel,
  general: XLSX_STYLE.totalLabel,
  date: XLSX_STYLE.totalLabel,
  qty: XLSX_STYLE.totalQty,
  unitPrice: XLSX_STYLE.totalUnitPrice,
  money: XLSX_STYLE.totalMoney,
};

function bodyCell<Row>(column: GridColumn<Row>, row: Row, kind: Kind): XlsxCell {
  const value = column.value(row);
  const style = BODY_STYLE[kind];
  if (value === null || value === undefined || value === '') return null;
  if (kind === 'date') return { kind: 'date', value: String(value), style };
  if (column.numeric) return { kind: 'number', value: String(value), style };
  return { kind: 'text', value: displayText(column, row), style };
}

/** 글자 폭 — 한글은 두 칸으로 셈해요 */
function textWidth(text: string): number {
  let width = 0;
  for (const char of text) width += /[ᄀ-ᇿ㄰-㆏가-힯]/.test(char) ? 2 : 1;
  return width;
}

const HEADER_ROW = 3;

export function gridToSheet<Row>(
  columns: readonly GridColumn<Row>[],
  rows: readonly Row[],
  { title, description }: { title: string; description: string },
  totalLabel = '합계',
): XlsxSheet {
  const kinds = columns.map((column) => columnKind(column, rows));
  const firstRow = HEADER_ROW + 1;
  const lastRow = HEADER_ROW + rows.length;
  const hasTotal = columns.some((column) => column.total);

  const sheetRows: XlsxCell[][] = [
    [{ kind: 'text', value: title, style: XLSX_STYLE.title }],
    [{ kind: 'text', value: description }],
    [],
    columns.map((column) => ({ kind: 'text', value: column.header, style: XLSX_STYLE.header })),
    ...rows.map((row) => columns.map((column, c) => bodyCell(column, row, kinds[c] ?? 'text'))),
  ];

  if (hasTotal) {
    sheetRows.push(
      columns.map((column, c): XlsxCell => {
        const kind = kinds[c] ?? 'text';
        const style = TOTAL_STYLE[kind];
        if (column.total && rows.length > 0) {
          const range = `${cellRef(firstRow, c)}:${cellRef(lastRow, c)}`;
          return { kind: 'formula', value: `SUBTOTAL(109,${range})`, style };
        }
        return c === 0
          ? { kind: 'text', value: totalLabel, style }
          : { kind: 'text', value: '', style };
      }),
    );
  }

  const widths = columns.map((column, c) => {
    const kind = kinds[c] ?? 'text';
    const longest = rows.reduce((max, row) => {
      const text = kind === 'date' ? '2026-10-07' : displayText(column, row);
      return Math.max(max, textWidth(text));
    }, textWidth(column.header) + 3); // 필터 단추 자리
    return Math.min(Math.max(longest + 2, 8), 50);
  });

  return {
    name: title,
    rows: sheetRows,
    widths,
    headerRow: HEADER_ROW,
    filter: {
      firstRow: HEADER_ROW,
      lastRow: Math.max(lastRow, HEADER_ROW),
      lastCol: columns.length - 1,
    },
  };
}
