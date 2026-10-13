import {
  type ClipboardEvent,
  type KeyboardEvent,
  type MouseEvent,
  memo,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { sumDecimal } from '../../lib/decimal.ts';
import { downloadFile, safeFileName } from '../../lib/download.ts';
import { formatDate } from '../../lib/format.ts';
import { buildXlsx, XLSX_TYPE } from '../../lib/xlsx.ts';
import { Button } from '../Button.tsx';
import { SourceTag } from '../SourceTag.tsx';
import { FilterMenu } from './FilterMenu.tsx';
import { gridToSheet } from './gridExcel.ts';
import {
  applyFilters,
  type CellPos,
  clampPos,
  displayText,
  distinctLabels,
  type Filters,
  type GridColumn,
  type Range,
  rangeToTsv,
  type Sort,
  sortRows,
  toRange,
} from './gridModel.ts';
import { useRowWindow } from './useRowWindow.ts';

type Props<Row> = {
  columns: GridColumn<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
  /** 표 이름. 읽기 프로그램이 읽어요 */
  caption: string;
  /** 보고자만 `true`. 열람자는 고르고 복사만 해요 */
  canEdit?: boolean;
  /**
   * 직접 입력 칸을 고쳤어요. 저장이 끝나면 풀리는 Promise를 돌려줘요.
   * **실패 안내는 부르는 쪽이 해요** — 표는 저장 중 표시만 지워요.
   */
  onEdit?: (row: Row, column: GridColumn<Row>, value: string | null) => Promise<unknown>;
  /** 확인이 필요한 행은 `alert-soft`로 강조해요 */
  rowNeedsCheck?: (row: Row) => boolean;
  totalLabel?: string;
  /**
   * 엑셀 다운로드 단추를 둬요. 화면에서 거르고 정렬한 행 그대로 내려받아요(열람자도 써요).
   * `fileName`은 확장자 없이 — `수출신고취합_20261001-20261031`
   */
  download?: { fileName: string; title: string; description: string } | null;
  /** 표 위 오른쪽에 둘 것 */
  toolbar?: ReactNode;
};

type Editing = { row: number; col: number; text: string; error?: string };
type Menu = { key: string; anchor: HTMLElement };

const PAGE_ROWS = 20;
const ORIGIN: CellPos = { row: 0, col: 0 };

/**
 * 엑셀처럼 쓰는 표 — 열마다 필터·정렬, 칸 범위 고르기와 복사(Ctrl+C), 직접 입력 칸 고치기.
 *
 * - 마우스로 끌거나 Shift+방향키로 범위를 골라요. Ctrl+A는 전체.
 * - Enter·F2·두 번 누르기·글자 치기로 고쳐요. Enter는 저장하고 아래로, Esc는 취소.
 * - 자동으로 채운 칸(판독·계산·마스터)은 고칠 수 없어요(`docs/design-manual.md` 8장, 고칠지 미정).
 * - 행은 한 화면에 길게 보여요. 머리줄·첫 열·합계줄은 고정이에요.
 */
export function Grid<Row>({
  columns,
  rows,
  rowKey,
  caption,
  canEdit = false,
  onEdit,
  rowNeedsCheck,
  totalLabel = '합계',
  toolbar,
  download,
}: Props<Row>) {
  const gridId = useId();
  const tableRef = useRef<HTMLTableElement>(null);
  const draggingRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTableSectionElement>(null);

  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<Sort>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [anchor, setAnchor] = useState<CellPos>(ORIGIN);
  const [focus, setFocus] = useState<CellPos>(ORIGIN);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [saving, setSaving] = useState<ReadonlySet<string>>(() => new Set());
  // Enter로 저장한 뒤 칸이 사라지며 blur가 한 번 더 와도 두 번 저장하지 않게, 지금 값을 따로 들고 있어요
  const editingRef = useRef<Editing | null>(null);
  editingRef.current = editing;

  const view = useMemo(
    () => sortRows(applyFilters(rows, columns, filters), columns, sort),
    [rows, columns, filters, sort],
  );

  // 필터로 행이 줄면 선택이 밖으로 나가지 않게 당겨요
  const safeFocus = clampPos(focus, view.length, columns.length);
  const safeAnchor = clampPos(anchor, view.length, columns.length);
  const range = toRange(safeAnchor, safeFocus);

  const isEditable = useCallback(
    (column: GridColumn<Row> | undefined) =>
      !!(canEdit && onEdit && column?.edit && !column.source),
    [canEdit, onEdit],
  );

  const cellId = (pos: CellPos) => `${gridId}-${pos.row}-${pos.col}`;

  const { visible, rowHeight, scrollToRow } = useRowWindow(wrapRef, bodyRef, view.length);
  const focusRendered = safeFocus.row >= visible.start && safeFocus.row < visible.end;

  // 고른 칸이 화면 밖이면 보이게 스크롤해요. 행은 그려져 있지 않을 수 있어 위아래는 계산으로,
  // 좌우는 그려진 뒤 칸으로 맞춰요
  useEffect(() => {
    scrollToRow(focus.row);
    const frame = requestAnimationFrame(() => {
      const cell = document.getElementById(`${gridId}-${focus.row}-${focus.col}`);
      cell?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
    return () => cancelAnimationFrame(frame);
  }, [gridId, focus, scrollToRow]);

  // 고치던 칸이 스크롤로 사라지면 그 자리에서 저장해요(엑셀에서 다른 곳을 누른 것처럼)
  const editingOut =
    editing !== null && (editing.row < visible.start || editing.row >= visible.end);
  useEffect(() => {
    // 읽을 수 없는 값이면 저장하지 않고 그 칸으로 돌아가 이유를 보여줘요
    const current = editingRef.current;
    if (editingOut && current && !commitRef.current(null)) scrollToRow(current.row);
  }, [editingOut, scrollToRow]);

  useEffect(() => {
    const stop = () => {
      draggingRef.current = false;
    };
    document.addEventListener('mouseup', stop);
    return () => document.removeEventListener('mouseup', stop);
  }, []);

  const select = (pos: CellPos, extend: boolean) => {
    const next = clampPos(pos, view.length, columns.length);
    setFocus(next);
    if (!extend) setAnchor(next);
  };

  const rawText = (row: Row, column: GridColumn<Row>) => {
    const value = column.value(row);
    if (column.numeric) return value === null || value === undefined ? '' : String(value);
    return displayText(column, row);
  };

  const startEdit = (pos: CellPos, text?: string) => {
    const row = view[pos.row];
    const column = columns[pos.col];
    if (row === undefined || !column || !isEditable(column)) return false;
    setEditing({ ...pos, text: text ?? rawText(row, column) });
    return true;
  };

  const save = (row: Row, column: GridColumn<Row>, value: string | null) => {
    if (!onEdit) return;
    const key = `${rowKey(row)}\u0000${column.key}`;
    setSaving((current) => new Set(current).add(key));
    onEdit(row, column, value)
      .catch(() => {
        // 안내는 부르는 쪽이 했어요
      })
      .finally(() =>
        setSaving((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        }),
      );
  };

  /** 고친 값을 저장해요. 읽을 수 없는 값이면 칸을 닫지 않고 이유를 보여줘요 */
  const commit = (move: CellPos | null): boolean => {
    const current = editingRef.current;
    if (!current) return true;
    const row = view[current.row];
    const column = columns[current.col];
    if (row === undefined || !column?.edit) {
      editingRef.current = null;
      setEditing(null);
      return true;
    }
    const parsed = column.edit.parse(current.text);
    if ('error' in parsed) {
      setEditing({ ...current, error: parsed.error });
      return false;
    }
    editingRef.current = null;
    setEditing(null);
    const before = column.value(row);
    const unchanged =
      (before === null || before === undefined ? null : String(before)) === parsed.value;
    if (!unchanged) save(row, column, parsed.value);
    if (move) {
      select(move, false);
      tableRef.current?.focus();
    }
    return true;
  };

  const commitRef = useRef(commit);
  commitRef.current = commit;

  const cancelEdit = () => {
    editingRef.current = null;
    setEditing(null);
    tableRef.current?.focus();
  };

  const clearRange = () => {
    for (let r = range.top; r <= range.bottom; r++) {
      const row = view[r];
      if (row === undefined) continue;
      for (let c = range.left; c <= range.right; c++) {
        const column = columns[c];
        if (!column || !isEditable(column)) continue;
        const value = column.value(row);
        if (value !== null && value !== undefined && value !== '') save(row, column, null);
      }
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (editing || event.target !== tableRef.current) return;
    const ctrl = event.ctrlKey || event.metaKey;
    const lastRow = view.length - 1;
    const lastCol = columns.length - 1;
    const { row, col } = safeFocus;

    const moves: Record<string, CellPos> = {
      ArrowUp: { row: ctrl ? 0 : row - 1, col },
      ArrowDown: { row: ctrl ? lastRow : row + 1, col },
      ArrowLeft: { row, col: ctrl ? 0 : col - 1 },
      ArrowRight: { row, col: ctrl ? lastCol : col + 1 },
      PageUp: { row: row - PAGE_ROWS, col },
      PageDown: { row: row + PAGE_ROWS, col },
      Home: ctrl ? ORIGIN : { row, col: 0 },
      End: ctrl ? { row: lastRow, col: lastCol } : { row, col: lastCol },
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      select(move, event.shiftKey);
      return;
    }

    // 클립보드 API가 있으면 바로 써요. 없으면 아래 copy 이벤트가 받아요
    if (ctrl && event.key.toLowerCase() === 'c' && navigator.clipboard && view.length > 0) {
      event.preventDefault();
      void navigator.clipboard.writeText(rangeToTsv(view, columns, range));
      return;
    }
    if (ctrl && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      setAnchor(ORIGIN);
      setFocus({ row: lastRow, col: lastCol });
      return;
    }
    if (event.key === 'Enter' || event.key === 'F2') {
      event.preventDefault();
      if (!startEdit(safeFocus) && event.key === 'Enter') {
        select({ row: row + (event.shiftKey ? -1 : 1), col }, false);
      }
      return;
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      clearRange();
      return;
    }
    // 글자를 치면 엑셀처럼 그 글자로 새로 써요
    if (event.key.length === 1 && !ctrl && !event.altKey) {
      if (startEdit(safeFocus, event.key)) event.preventDefault();
    }
  };

  const onCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    if (editing || view.length === 0) return;
    event.preventDefault();
    event.clipboardData.setData('text/plain', rangeToTsv(view, columns, range));
  };

  const posFromEvent = (event: MouseEvent): CellPos | null => {
    const cell = (event.target as HTMLElement).closest<HTMLElement>('td[data-col]');
    if (!cell?.dataset.row || !cell.dataset.col) return null;
    return { row: Number(cell.dataset.row), col: Number(cell.dataset.col) };
  };

  const onMouseDown = (event: MouseEvent<HTMLTableSectionElement>) => {
    if (event.button !== 0) return;
    const pos = posFromEvent(event);
    if (!pos) return;
    if (editing && editing.row === pos.row && editing.col === pos.col) return;
    // 글자가 파랗게 잡히지 않게 막고, 키보드가 표로 오게 해요
    event.preventDefault();
    // 고치던 값을 읽을 수 없으면 그 칸에 머물러요
    if (editing && !commit(null)) return;
    select(pos, event.shiftKey);
    draggingRef.current = true;
    tableRef.current?.focus({ preventScroll: true });
  };

  const onMouseMove = (event: MouseEvent<HTMLTableSectionElement>) => {
    if (!draggingRef.current) return;
    const pos = posFromEvent(event);
    if (!pos) return;
    // 같은 칸 안에서 움직일 때는 다시 그리지 않아요
    setFocus((current) => (current.row === pos.row && current.col === pos.col ? current : pos));
  };

  const onDoubleClick = (event: MouseEvent<HTMLTableSectionElement>) => {
    const pos = posFromEvent(event);
    if (pos) startEdit(pos);
  };

  const closeMenu = useCallback(() => setMenu(null), []);
  const menuColumn = menu && columns.find((column) => column.key === menu.key);
  const hasFilter = Object.keys(filters).length > 0;
  const hasTotal = columns.some((column) => column.total);

  // 합계와 고른 칸 합계는 행이 많으면 오래 걸려요. 바뀔 때만 다시 구해요
  const totals = useMemo(
    () => columns.map((column) => (column.total ? column.total(view) : null)),
    [columns, view],
  );
  const { top, bottom, left, right } = range;
  const selection = useMemo(
    () => selectionSummary(view, columns, { top, bottom, left, right }),
    [view, columns, top, bottom, left, right],
  );

  const onDownload = () => {
    if (!download) return;
    const filtered = hasFilter
      ? ` · 필터 적용 (${rows.length.toLocaleString('en-US')}행 중 ${view.length.toLocaleString('en-US')}행)`
      : '';
    const sheet = gridToSheet(
      columns,
      view,
      {
        title: download.title,
        description: `${download.description} · 출력 ${printedAt()}${filtered}`,
      },
      totalLabel,
    );
    downloadFile(buildXlsx(sheet), `${safeFileName(download.fileName)}.xlsx`, XLSX_TYPE);
  };

  return (
    <div className="jh-grid">
      <GridStatus
        total={rows.length}
        shown={view.length}
        hasFilter={hasFilter}
        onClearFilters={() => setFilters({})}
        selection={selection}
        toolbar={
          toolbar || download ? (
            <>
              {toolbar}
              {download && (
                <Button fileType="XLSX" onClick={onDownload} disabled={view.length === 0}>
                  엑셀 다운로드
                </Button>
              )}
            </>
          ) : null
        }
      />
      <div className="jh-grid__wrap" ref={wrapRef}>
        {/* role="grid"이면 칸(td)은 저절로 gridcell이에요. 키보드는 표가 받고 고른 칸은 activedescendant로 알려요 */}
        <table
          ref={tableRef}
          className="jh-table jh-grid__table"
          // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: WAI-ARIA 격자 예시처럼 table에 grid를 붙여요
          role="grid"
          aria-label={caption}
          aria-multiselectable="true"
          aria-rowcount={view.length + 1}
          aria-activedescendant={
            view.length > 0 && !editing && focusRendered ? cellId(safeFocus) : undefined
          }
          tabIndex={0}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={column.width ? { width: column.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {columns.map((column) => {
                const filtered = !!filters[column.key];
                const sorted = sort?.key === column.key ? sort.direction : null;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={column.numeric ? 'jh-table__num' : undefined}
                    aria-sort={
                      sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined
                    }
                  >
                    <span className="jh-grid__head">
                      <span className="jh-grid__head-label">
                        {column.header}
                        {column.source && <SourceTag source={column.source} />}
                      </span>
                      <button
                        type="button"
                        className="jh-grid__filter-button"
                        data-active={filtered || sorted ? 'true' : undefined}
                        aria-label={`${column.header} 필터와 정렬${filtered ? ' (거르는 중)' : ''}`}
                        aria-expanded={menu?.key === column.key}
                        aria-haspopup="dialog"
                        onClick={(event) => {
                          const target = event.currentTarget;
                          setMenu((current) =>
                            current?.key === column.key
                              ? null
                              : { key: column.key, anchor: target },
                          );
                        }}
                      >
                        <FilterIcon filtered={filtered} sorted={sorted} />
                      </button>
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            ref={bodyRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onDoubleClick={onDoubleClick}
          >
            {view.length === 0 ? (
              <tr>
                <td className="jh-grid__no-match" colSpan={columns.length}>
                  필터에 맞는 행이 없어요.{' '}
                  <button type="button" className="jh-link-button" onClick={() => setFilters({})}>
                    필터 모두 지우기
                  </button>
                </td>
              </tr>
            ) : (
              <>
                {/* 보이는 행 위아래는 빈 줄로 자리만 잡아요 (`useRowWindow`) */}
                {visible.start > 0 && <Spacer height={visible.start * rowHeight} />}
                {view.slice(visible.start, visible.end).map((row, offset) => {
                  const index = visible.start + offset;
                  return (
                    <GridRow
                      key={rowKey(row)}
                      gridId={gridId}
                      row={row}
                      rowIndex={index}
                      rowKeyValue={rowKey(row)}
                      columns={columns}
                      selected={index >= range.top && index <= range.bottom ? range : null}
                      focusCol={index === safeFocus.row ? safeFocus.col : null}
                      editing={editing?.row === index ? editing : null}
                      saving={saving}
                      needsCheck={rowNeedsCheck?.(row) ?? false}
                      isEditable={isEditable}
                      onEditText={(text) =>
                        setEditing((current) => current && { ...current, text })
                      }
                      onCommit={commit}
                      onCancel={cancelEdit}
                      lastRow={view.length - 1}
                      lastCol={columns.length - 1}
                    />
                  );
                })}
                {visible.end < view.length && (
                  <Spacer height={(view.length - visible.end) * rowHeight} />
                )}
              </>
            )}
          </tbody>
          {hasTotal && view.length > 0 && (
            <tfoot>
              <tr>
                {columns.map((column, index) => (
                  <td key={column.key} className={column.numeric ? 'jh-table__num' : undefined}>
                    {totals[index] ?? (index === 0 ? totalLabel : null)}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {menu && menuColumn && (
        <FilterMenu
          key={menu.key}
          header={menuColumn.header}
          labels={distinctLabels(applyFilters(rows, columns, filters, menu.key), menuColumn)}
          selected={filters[menu.key] ?? null}
          sortDirection={sort?.key === menu.key ? sort.direction : null}
          anchor={menu.anchor}
          onSort={(direction) => {
            setSort({ key: menu.key, direction });
            setMenu(null);
          }}
          onApply={(selected) => {
            setFilters((current) => {
              const next = { ...current };
              if (selected) next[menu.key] = selected;
              else delete next[menu.key];
              return next;
            });
            setMenu(null);
          }}
          onClose={closeMenu}
        />
      )}
    </div>
  );
}

type RowProps<Row> = {
  gridId: string;
  row: Row;
  rowIndex: number;
  rowKeyValue: string;
  columns: GridColumn<Row>[];
  /** 이 행이 선택 범위 안이면 범위, 아니면 `null` — 범위 밖 행은 다시 그리지 않아요 */
  selected: Range | null;
  focusCol: number | null;
  editing: Editing | null;
  saving: ReadonlySet<string>;
  needsCheck: boolean;
  isEditable: (column: GridColumn<Row> | undefined) => boolean;
  onEditText: (text: string) => void;
  onCommit: (move: CellPos | null) => boolean;
  onCancel: () => void;
  lastRow: number;
  lastCol: number;
};

function GridRowInner<Row>({
  gridId,
  row,
  rowIndex,
  rowKeyValue,
  columns,
  selected,
  focusCol,
  editing,
  saving,
  needsCheck,
  isEditable,
  onEditText,
  onCommit,
  onCancel,
  lastRow,
  lastCol,
}: RowProps<Row>) {
  return (
    <tr className={needsCheck ? 'jh-table__row--bad' : undefined} aria-rowindex={rowIndex + 2}>
      {columns.map((column, colIndex) => {
        const inRange = !!selected && colIndex >= selected.left && colIndex <= selected.right;
        const isFocus = focusCol === colIndex;
        const isEditing = editing?.col === colIndex;
        const editable = isEditable(column);
        const isSaving = saving.has(`${rowKeyValue}\u0000${column.key}`);
        const className = [
          column.numeric && 'jh-table__num',
          column.source && 'jh-table__auto',
          editable && 'jh-grid__cell--editable',
          inRange && 'jh-grid__cell--selected',
          isFocus && 'jh-grid__cell--focus',
          isSaving && 'jh-grid__cell--saving',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          // biome-ignore lint/a11y/useAriaPropsSupportedByRole: grid 안의 td는 gridcell이라 aria-selected를 받아요
          <td
            key={column.key}
            id={`${gridId}-${rowIndex}-${colIndex}`}
            aria-selected={inRange}
            aria-readonly={!editable || undefined}
            aria-busy={isSaving || undefined}
            data-row={rowIndex}
            data-col={colIndex}
            className={className || undefined}
          >
            {isEditing && editing ? (
              <CellEditor
                label={column.header}
                text={editing.text}
                error={editing.error}
                numeric={!!column.numeric}
                onChange={onEditText}
                onCommit={(direction) => {
                  const moves = {
                    down: { row: Math.min(rowIndex + 1, lastRow), col: colIndex },
                    up: { row: Math.max(rowIndex - 1, 0), col: colIndex },
                    right: { row: rowIndex, col: Math.min(colIndex + 1, lastCol) },
                    left: { row: rowIndex, col: Math.max(colIndex - 1, 0) },
                  };
                  onCommit(direction ? moves[direction] : null);
                }}
                onCancel={onCancel}
              />
            ) : column.render ? (
              column.render(row)
            ) : (
              displayText(column, row)
            )}
          </td>
        );
      })}
    </tr>
  );
}

const GridRow = memo(GridRowInner, (prev, next) => {
  // 선택 범위 객체는 매번 새로 만들어져요. 값으로 비교해요
  const sameRange =
    prev.selected === next.selected ||
    (!!prev.selected &&
      !!next.selected &&
      prev.selected.left === next.selected.left &&
      prev.selected.right === next.selected.right);
  return (
    sameRange &&
    prev.row === next.row &&
    prev.rowIndex === next.rowIndex &&
    prev.columns === next.columns &&
    prev.focusCol === next.focusCol &&
    prev.editing === next.editing &&
    prev.saving === next.saving &&
    prev.needsCheck === next.needsCheck &&
    prev.isEditable === next.isEditable &&
    prev.lastRow === next.lastRow &&
    prev.lastCol === next.lastCol &&
    // 고치는 중인 행만 아래 함수들이 바뀐 상태를 봐야 해요
    (next.editing === null || prev.onCommit === next.onCommit)
  );
}) as typeof GridRowInner;

type Direction = 'down' | 'up' | 'right' | 'left';

function CellEditor({
  label,
  text,
  error,
  numeric,
  onChange,
  onCommit,
  onCancel,
}: {
  label: string;
  text: string;
  error: string | undefined;
  numeric: boolean;
  onChange: (text: string) => void;
  onCommit: (direction: Direction | null) => void;
  onCancel: () => void;
}) {
  const errorId = useId();
  return (
    <span className="jh-grid__editor">
      <input
        className={`jh-grid__input${numeric ? ' jh-grid__input--number' : ''}`}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={text}
        inputMode={numeric ? 'decimal' : undefined}
        // biome-ignore lint/a11y/noAutofocus: 칸을 고치기 시작하면 바로 칠 수 있어야 해요
        autoFocus
        onFocus={(event) => {
          // 글자 하나로 시작했으면 끝에, 아니면 엑셀처럼 끝에 커서
          const length = event.currentTarget.value.length;
          event.currentTarget.setSelectionRange(length, length);
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onCommit(event.shiftKey ? 'up' : 'down');
          } else if (event.key === 'Tab') {
            event.preventDefault();
            onCommit(event.shiftKey ? 'left' : 'right');
          } else if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => onCommit(null)}
      />
      {error && (
        <span id={errorId} className="jh-grid__error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

type Selection = { cells: number; sum: string | null };

/** 엑셀 아래 상태줄처럼 고른 칸 수와 숫자 합계 */
function selectionSummary<Row>(
  rows: readonly Row[],
  columns: readonly GridColumn<Row>[],
  range: Range,
): Selection {
  if (rows.length === 0) return { cells: 0, sum: null };
  const cells = (range.bottom - range.top + 1) * (range.right - range.left + 1);
  if (cells < 2) return { cells, sum: null };
  const values: string[] = [];
  for (let c = range.left; c <= range.right; c++) {
    const column = columns[c];
    if (!column?.numeric) continue;
    for (let r = range.top; r <= range.bottom; r++) {
      const row = rows[r];
      const value = row === undefined ? null : column.value(row);
      if (value !== null && value !== undefined && value !== '') values.push(String(value));
    }
  }
  const sum = sumDecimal(values);
  return { cells, sum: sum === null ? null : groupDigits(sum) };
}

/** 천 단위 쉼표. 소수 자리는 그대로 둬요 */
function groupDigits(value: string): string {
  const [whole = '', fraction] = value.replace(/^-/, '').split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${value.startsWith('-') ? '−' : ''}${grouped}${fraction ? `.${fraction}` : ''}`;
}

function GridStatus({
  total,
  shown,
  hasFilter,
  onClearFilters,
  selection,
  toolbar,
}: {
  total: number;
  shown: number;
  hasFilter: boolean;
  onClearFilters: () => void;
  selection: Selection;
  toolbar: ReactNode;
}) {
  return (
    <div className="jh-grid__status">
      <p className="jh-grid__count" aria-live="polite">
        {hasFilter ? (
          <>
            {total.toLocaleString('en-US')}행 중 <strong>{shown.toLocaleString('en-US')}행</strong>
            {' · '}
            <button type="button" className="jh-link-button" onClick={onClearFilters}>
              필터 모두 지우기
            </button>
          </>
        ) : (
          <>{total.toLocaleString('en-US')}행</>
        )}
        {selection.cells > 1 && (
          <span className="jh-grid__selection">
            {' · '}
            {selection.cells.toLocaleString('en-US')}칸 선택
            {selection.sum !== null && (
              <>
                {' · '}합계 <span className="jh-grid__sum">{selection.sum}</span>
              </>
            )}
          </span>
        )}
      </p>
      {toolbar && <div className="jh-grid__toolbar">{toolbar}</div>}
    </div>
  );
}

function FilterIcon({ filtered, sorted }: { filtered: boolean; sorted: 'asc' | 'desc' | null }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      {filtered ? (
        <path d="M2 3h12l-4.5 5.5V13l-3 1.5V8.5z" fill="currentColor" />
      ) : (
        <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
      )}
      {sorted && (
        <path
          d={sorted === 'asc' ? 'M13 14V9m-2 2 2-2 2 2' : 'M13 9v5m-2-2 2 2 2-2'}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
        />
      )}
    </svg>
  );
}

/** 엑셀에 적는 출력 시각 `2026-10-13 10:05` */
function printedAt(now = new Date()): string {
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return `${formatDate(now)} ${time}`;
}

/** 그리지 않은 행 자리 */
function Spacer({ height }: { height: number }) {
  return (
    // biome-ignore lint/a11y/noAriaHiddenOnFocusable: 빈 자리 줄은 초점을 받지 않아요(tabIndex 없음)
    <tr aria-hidden="true" className="jh-grid__spacer">
      <td style={{ height }} />
    </tr>
  );
}
