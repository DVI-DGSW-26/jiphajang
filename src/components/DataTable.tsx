import type { ReactNode } from 'react';
import { type Source, SourceTag } from './SourceTag.tsx';

export type Column<Row> = {
  key: string;
  header: string;
  /** 숫자 열은 Mono 글꼴, 오른쪽 정렬. 통화는 머리줄에 한 번만 — `Amount (USD)` */
  numeric?: boolean;
  /** 자동으로 채운 열이면 출처. 머리줄에 출처 표시, 칸은 미색 */
  source?: Source;
  cell: (row: Row) => ReactNode;
  /** 합계줄 값. 하나라도 있으면 합계줄을 그려요 */
  total?: (rows: Row[]) => ReactNode;
};

type Props<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** 확인이 필요한 행은 `alert-soft`로 강조해요 */
  rowNeedsCheck?: (row: Row) => boolean;
  /** 표 이름. 읽기 프로그램용으로 표 위에 숨겨 둬요 */
  caption: string;
  /** 합계줄 첫 칸 글자 */
  totalLabel?: string;
};

/**
 * 표 — 디자인 매뉴얼 7장. 숫자는 오른쪽 정렬, 합계줄 위에 진한 선.
 * 넓으면 표 안에서만 가로로 스크롤하고, 머리줄과 첫 열은 고정해요.
 *
 * 빈 표는 그리지 말고 `EmptyState`를 써요.
 */
export function DataTable<Row>({
  columns,
  rows,
  rowKey,
  rowNeedsCheck,
  caption,
  totalLabel = '합계',
}: Props<Row>) {
  const hasTotal = columns.some((column) => column.total);

  const cellClass = (column: Column<Row>) =>
    [column.numeric && 'jh-table__num', column.source && 'jh-table__auto']
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: 가로로 넓은 표를 키보드로도 스크롤할 수 있게 해요
    <section className="jh-table-wrap" tabIndex={0} aria-label={caption}>
      <table className="jh-table">
        <caption className="jh-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={column.numeric ? 'jh-table__num' : undefined}
              >
                {column.header}
                {column.source && <SourceTag source={column.source} />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={rowNeedsCheck?.(row) ? 'jh-table__row--bad' : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={cellClass(column)}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotal && (
          <tfoot>
            <tr>
              {columns.map((column, index) => (
                <td key={column.key} className={column.numeric ? 'jh-table__num' : undefined}>
                  {column.total ? column.total(rows) : index === 0 ? totalLabel : null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </section>
  );
}
