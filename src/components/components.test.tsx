import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { formatQty, formatUsd } from '../lib/format.ts';
import { Badge } from './Badge.tsx';
import { Button } from './Button.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { type Column, DataTable } from './DataTable.tsx';
import { Field } from './Field.tsx';
import { TOAST_MS, ToastProvider, useToast } from './Toast.tsx';

afterEach(() => {
  vi.useRealTimers();
});

test('처리 중인 버튼은 누를 수 없고 “저장 중…”을 보여줘요', () => {
  const onClick = vi.fn();
  render(
    <Button variant="primary" busy onClick={onClick}>
      저장
    </Button>,
  );
  const button = screen.getByRole('button', { name: '저장 중…' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});

test('내려받기 버튼은 파일 형식 꼬리표를 붙이지만 읽기 이름에는 넣지 않아요', () => {
  render(<Button fileType="XLSX">엑셀 다운로드</Button>);
  expect(screen.getByRole('button', { name: '엑셀 다운로드' })).toHaveTextContent('XLSX');
});

test('입력칸 오류는 칸과 이어져 있어요', () => {
  render(
    <Field
      label="품번"
      defaultValue="P-999"
      error="‘P-999’는 마스터에 없어요. 먼저 등록해 주세요."
    />,
  );
  const input = screen.getByLabelText('품번');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('‘P-999’는 마스터에 없어요. 먼저 등록해 주세요.');
});

test('자동으로 채운 칸에는 출처를 붙여요', () => {
  render(<Field label="Set QTY" source="master" numeric readOnly value="4,000" />);
  expect(screen.getByLabelText('Set QTY')).toHaveClass('jh-input--auto', 'jh-input--number');
  expect(screen.getByText('마스터')).toBeInTheDocument();
});

test('배지는 색과 함께 글자를 보여줘요', () => {
  render(<Badge tone="bad">미수</Badge>);
  expect(screen.getByText('미수')).toHaveClass('jh-badge--bad');
});

type Line = { invoice: string; qty: number; amount: string; check?: boolean };

const columns: Column<Line>[] = [
  { key: 'invoice', header: 'Invoice #', cell: (row) => row.invoice },
  {
    key: 'qty',
    header: 'Total QTY',
    numeric: true,
    source: 'calc',
    cell: (row) => formatQty(row.qty),
    total: (rows) => formatQty(rows.reduce((sum, row) => sum + row.qty, 0)),
  },
  { key: 'amount', header: 'Amount (USD)', numeric: true, cell: (row) => formatUsd(row.amount) },
];

test('표는 출처를 머리줄에, 합계를 맨 아래에, 확인할 행을 강조해서 보여줘요', () => {
  render(
    <DataTable
      caption="현지 출하 Invoice List"
      columns={columns}
      rows={[
        { invoice: 'MC261005A', qty: 60000, amount: '30720' },
        { invoice: 'MT261006A', qty: 5000, amount: '11000', check: true },
      ]}
      rowKey={(row) => row.invoice}
      rowNeedsCheck={(row) => row.check === true}
    />,
  );

  const table = screen.getByRole('table', { name: '현지 출하 Invoice List' });
  expect(table).toHaveTextContent('계산');
  const rows = screen.getAllByRole('row');
  expect(rows[2]).toHaveClass('jh-table__row--bad');
  expect(rows[3]).toHaveTextContent('합계');
  expect(rows[3]).toHaveTextContent('65,000');
});

test('확인창은 “닫기”에 먼저 초점을 두고, Esc로 닫혀요', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <ConfirmDialog
      open
      title="Invoice를 삭제할까요?"
      confirmLabel="삭제하기"
      onClose={onClose}
      onConfirm={onConfirm}
    >
      MC261005A가 출하 원장에서 사라지고 되돌릴 수 없어요.
    </ConfirmDialog>,
  );

  expect(screen.getByRole('alertdialog', { name: 'Invoice를 삭제할까요?' })).toBeInTheDocument();
  const [close, confirm] = screen.getAllByRole('button');
  expect(close).toHaveTextContent('닫기');
  expect(close).toHaveFocus();

  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledTimes(1);
  fireEvent.click(confirm as HTMLElement);
  expect(onConfirm).toHaveBeenCalledTimes(1);
});

function ToastButtons() {
  const toast = useToast();
  return (
    <>
      <button type="button" onClick={() => toast('엑셀 파일을 저장했어요.')}>
        첫째
      </button>
      <button
        type="button"
        onClick={() => toast('저장하지 못했어요. 잠시 후 다시 눌러 주세요.', 'bad')}
      >
        둘째
      </button>
    </>
  );
}

test('알림은 한 번에 하나만 보이고 잠시 뒤 사라져요', () => {
  vi.useFakeTimers();
  render(
    <ToastProvider>
      <ToastButtons />
    </ToastProvider>,
  );

  fireEvent.click(screen.getByText('첫째'));
  fireEvent.click(screen.getByText('둘째'));
  const region = screen.getByRole('status');
  expect(region).toHaveTextContent('저장하지 못했어요.');
  expect(region).not.toHaveTextContent('엑셀 파일을 저장했어요.');

  act(() => vi.advanceTimersByTime(TOAST_MS));
  expect(region).toBeEmptyDOMElement();
});
