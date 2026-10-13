import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { Grid } from './Grid.tsx';
import type { GridColumn } from './gridModel.ts';
import { parseDecimal, parseText } from './parsers.ts';

type Row = { id: string; customer: string; blNo: string | null; rate: string | null };

const rows: Row[] = [
  { id: '1', customer: '고객사 A', blNo: 'BL1', rate: '1385.50' },
  { id: '2', customer: '고객사 B', blNo: null, rate: null },
  { id: '3', customer: '고객사 A', blNo: 'BL3', rate: '1390.00' },
];

const columns: GridColumn<Row>[] = [
  { key: 'customer', header: '고객사', source: 'master', value: (r) => r.customer },
  { key: 'blNo', header: 'BL#', value: (r) => r.blNo, edit: { parse: parseText } },
  {
    key: 'rate',
    header: '환율',
    numeric: true,
    value: (r) => r.rate,
    edit: { parse: parseDecimal },
  },
];

function renderGrid(props: Partial<Parameters<typeof Grid<Row>>[0]> = {}) {
  const onEdit = vi.fn(() => Promise.resolve());
  render(
    <Grid
      caption="시험 표"
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      canEdit
      onEdit={onEdit}
      {...props}
    />,
  );
  return { onEdit, grid: screen.getByRole('grid', { name: '시험 표' }) };
}

const cell = (row: number, col: number) =>
  document.querySelector(`td[data-row="${row}"][data-col="${col}"]`) as HTMLElement;

test('열 필터에서 값을 빼면 그 행이 숨고, 몇 행 중 몇 행인지 알려줘요', () => {
  renderGrid();
  fireEvent.click(screen.getByRole('button', { name: '고객사 필터와 정렬' }));
  const menu = screen.getByRole('dialog', { name: '고객사 필터' });
  fireEvent.click(within(menu).getByRole('checkbox', { name: '고객사 B' }));
  fireEvent.click(within(menu).getByRole('button', { name: '확인' }));

  expect(screen.queryByText('고객사 B')).not.toBeInTheDocument();
  expect(screen.getByText(/3행 중/)).toHaveTextContent('3행 중 2행');
  expect(
    screen.getByRole('button', { name: '고객사 필터와 정렬 (거르는 중)' }),
  ).toBeInTheDocument();

  fireEvent.click(screen.getAllByRole('button', { name: '필터 모두 지우기' })[0] as HTMLElement);
  expect(screen.getByText('고객사 B')).toBeInTheDocument();
});

test('필터 메뉴에서 내림차순으로 정렬해요', () => {
  renderGrid();
  fireEvent.click(screen.getByRole('button', { name: '환율 필터와 정렬' }));
  fireEvent.click(screen.getByRole('button', { name: '내림차순 정렬' }));
  expect(cell(0, 2)).toHaveTextContent('1390.00');
  expect(cell(2, 2)).toHaveTextContent('');
});

test('끌어서 고른 범위를 탭으로 나눠 복사해요', () => {
  const { grid } = renderGrid();
  fireEvent.mouseDown(cell(0, 0), { button: 0 });
  fireEvent.mouseMove(cell(1, 2));
  fireEvent.mouseUp(document);
  expect(screen.getByText(/칸 선택/)).toHaveTextContent('6칸 선택 · 합계 1,385.50');

  const setData = vi.fn();
  fireEvent.copy(grid, { clipboardData: { setData } });
  expect(setData).toHaveBeenCalledWith('text/plain', '고객사 A\tBL1\t1385.50\r\n고객사 B\t\t');
});

test('Shift+방향키로 범위를 넓히고 Ctrl+A로 전체를 골라요', () => {
  const { grid } = renderGrid();
  fireEvent.mouseDown(cell(0, 1), { button: 0 });
  fireEvent.keyDown(grid, { key: 'ArrowDown', shiftKey: true });
  expect(cell(1, 1)).toHaveAttribute('aria-selected', 'true');
  expect(cell(2, 1)).toHaveAttribute('aria-selected', 'false');
  fireEvent.keyDown(grid, { key: 'a', ctrlKey: true });
  expect(cell(2, 2)).toHaveAttribute('aria-selected', 'true');
});

test('직접 입력 칸은 글자를 치면 고치기 시작하고, Enter로 저장한 뒤 아래 칸으로 가요', () => {
  const { grid, onEdit } = renderGrid();
  fireEvent.mouseDown(cell(1, 2), { button: 0 });
  fireEvent.keyDown(grid, { key: '1' });
  const input = screen.getByRole('textbox', { name: '환율' });
  fireEvent.change(input, { target: { value: '1,400.5' } });
  fireEvent.keyDown(input, { key: 'Enter' });

  expect(onEdit).toHaveBeenCalledWith(rows[1], columns[2], '1400.5');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(grid).toHaveAttribute('aria-activedescendant', cell(2, 2).id);
});

test('읽을 수 없는 값이면 저장하지 않고 이유를 보여줘요. Esc는 취소예요', () => {
  const { grid, onEdit } = renderGrid();
  fireEvent.doubleClick(cell(0, 2));
  const input = screen.getByRole('textbox', { name: '환율' });
  fireEvent.change(input, { target: { value: '많이' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(screen.getByRole('alert')).toHaveTextContent('숫자로 넣어 주세요');
  expect(onEdit).not.toHaveBeenCalled();

  fireEvent.keyDown(input, { key: 'Escape' });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(onEdit).not.toHaveBeenCalled();
  expect(grid).toHaveFocus();
});

test('자동 칸은 고칠 수 없고, Delete는 직접 입력 칸을 비워요', () => {
  const { grid, onEdit } = renderGrid();
  fireEvent.doubleClick(cell(0, 0));
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

  fireEvent.mouseDown(cell(0, 1), { button: 0 });
  fireEvent.keyDown(grid, { key: 'Delete' });
  expect(onEdit).toHaveBeenCalledWith(rows[0], columns[1], null);
});

test('열람자는 고르고 복사만 해요', () => {
  const { grid, onEdit } = renderGrid({ canEdit: false });
  fireEvent.doubleClick(cell(0, 1));
  fireEvent.keyDown(grid, { key: 'x' });
  fireEvent.keyDown(grid, { key: 'Delete' });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  expect(onEdit).not.toHaveBeenCalled();
});
