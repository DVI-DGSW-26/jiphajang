import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { handleMock, MOCK_TOKEN_PREFIX, type MockOptions } from '../../mock/api.ts';
import { App } from '../App.tsx';
import { ToastProvider } from '../components/Toast.tsx';
import type { AuthMe } from '../lib/api.ts';
import { withSubtotals } from '../stock/subtotals.ts';

/**
 * 화면과 가짜 서버를 이어 붙여 흐름을 확인해요:
 * 입고 → 인보이스 → 확정 → 재고 차감 → 수금 생성.
 * 가짜 서버의 상태가 남아서 시험은 차례대로 이어져요.
 */

const options: MockOptions = {
  role: 'REPORTER',
  scenario: 'ok',
  name: '홍길동',
  scale: 1,
  tokenTtl: 0,
};
const reporter: AuthMe = { name: '홍길동', role: 'REPORTER' };

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init?: RequestInit) => {
      const response = handleMock(
        {
          method: init?.method ?? 'GET',
          url: input.replace(/^\/api/, ''),
          authorization: `Bearer ${MOCK_TOKEN_PREFIX}.1`,
          body: init?.body ? JSON.parse(init.body as string) : undefined,
        },
        options,
      );
      return new Response(JSON.stringify(response.json ?? null), { status: response.status });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string, me = reporter) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <App me={me} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

const pick = async (label: string, value: string) => {
  const select = await screen.findByLabelText(label);
  await within(select).findByRole('option', { name: value });
  const option = within(select).getByRole<HTMLOptionElement>('option', { name: value });
  fireEvent.change(select, { target: { value: option.value } });
};

/** 표 칸을 글자로 찾아요. 고르기 칸의 선택지 등 표 밖의 같은 글자는 건너뛰어요 */
const findCell = (name: string) =>
  waitFor(() => {
    const cell = screen
      .getAllByText(name)
      .map((element) => element.closest('td'))
      .find((item) => item !== null);
    if (!cell) throw new Error(`표 칸을 찾지 못했어요: ${name}`);
    return cell;
  });

const cellTexts = (row: Element) => [...row.querySelectorAll('td')].map((cell) => cell.textContent);

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

test('입고: 빠진 칸을 알려주고, 등록하면 목록과 재고에 나와요', async () => {
  renderAt('/inbound');
  await screen.findByRole('heading', { name: '컨테이너 입고', level: 1 });
  await screen.findByText('VX260807A');

  fireEvent.click(screen.getByRole('button', { name: '입고 등록' }));
  expect(screen.getByText('컨테이너 번호를 넣어 주세요.')).toBeInTheDocument();
  expect(screen.getByText('도착 창고를 골라 주세요.')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('표시한 칸을 확인해 주세요.');

  type('컨테이너 번호', 'abc');
  expect(screen.getByText(/보통 VX260915A 같은 형식이에요/)).toBeInTheDocument();
  type('컨테이너 번호', 'VZ261101A');
  expect(screen.queryByText(/보통 VX260915A 같은 형식이에요/)).not.toBeInTheDocument();
  await pick('도착 창고', '창고 1');
  await pick('관세', '50%');
  type('입고일', '');
  fireEvent.click(screen.getByRole('button', { name: '입고 등록' }));
  expect(screen.getByText('입고일을 넣어 주세요.')).toBeInTheDocument();
  type('입고일', '2026-11-01');

  await pick('1번째 줄 품번', 'P1');
  type('1번째 줄 팔레트 수', '4');
  // 품번 마스터와 계산으로 채워요
  expect(screen.getByText('$500.00')).toBeInTheDocument();
  expect(screen.getByText('400')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '입고 등록' }));
  expect(await screen.findByText('VZ261101A')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('컨테이너 번호')).toHaveValue(''));
});

test('입고: 선적 중 컨테이너를 입고 처리해요', async () => {
  renderAt('/inbound');
  fireEvent.click(await screen.findByRole('button', { name: 'VX261019A 입고 처리' }));
  const dialog = within(screen.getByRole('dialog', { name: 'VX261019A 입고 처리' }));
  fireEvent.change(dialog.getByLabelText('입고일'), { target: { value: '2026-11-03' } });
  fireEvent.click(dialog.getByRole('button', { name: '입고 완료로 바꾸기' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'VX261019A 입고 처리' })).not.toBeInTheDocument(),
  );
});

test('인보이스: 고객사의 품번만 고르고, 번호·금액·FIFO를 미리 보여주고, 재고를 넘으면 막아요', async () => {
  renderAt('/invoices/new');
  await pick('고객사', '고객사 A');
  await pick('출고 창고', '창고 1');
  type('인보이스 일자', '2026-11-06');

  const partSelect = screen.getByLabelText('1번째 줄 품번');
  await within(partSelect).findByRole('option', { name: 'P1' });
  expect(within(partSelect).queryByRole('option', { name: 'P4' })).not.toBeInTheDocument();

  await pick('1번째 줄 품번', 'P1');
  type('1번째 줄 Box QTY', '6');
  expect(await screen.findByText('VX260807A 1 → VX260915A 5')).toBeInTheDocument();
  expect(screen.getByLabelText('인보이스 번호')).toHaveValue('MT261106A');
  expect(screen.getByLabelText('납품처')).toHaveValue('납품처 A');
  expect(screen.getByLabelText('결제 조건')).toHaveValue('Net30');
  expect(screen.getByLabelText('수금 예정일')).toHaveValue('2026-12-06');
  expect(screen.getByText('P1 가용 55팔레트 중 6팔레트 배정')).toBeInTheDocument();
  expect(screen.getAllByText('$750.00').length).toBeGreaterThan(0);

  type('1번째 줄 Box QTY', '56');
  expect(await screen.findByText('가용 재고보다 1팔레트 많아요.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '작성하고 창고에 보내기' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('가용 재고를 넘은 품목이 있어요');

  // 출력은 양식을 받기 전이라 눌리지 않아요
  expect(screen.getByRole('button', { name: /PDF 다운로드/ })).toBeDisabled();
});

test('인보이스: 임시 저장은 예약 없이 고칠 수 있고, 보내면 읽기 전용이에요', async () => {
  renderAt('/invoices/new');
  await pick('고객사', '고객사 A');
  await pick('출고 창고', '창고 1');
  type('인보이스 일자', '2026-11-06');
  await pick('1번째 줄 품번', 'P1');
  type('1번째 줄 Box QTY', '2');
  fireEvent.click(screen.getByRole('button', { name: '임시 저장' }));

  expect(await screen.findByRole('heading', { name: '인보이스 수정' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByLabelText('1번째 줄 Box QTY')).toHaveValue('2'));
  // 저장한 고객사·품번이 고르기 칸에 다시 들어와요
  await waitFor(() => expect(screen.getByLabelText('고객사')).toHaveValue('c1'));
  await waitFor(() => expect(screen.getByLabelText('1번째 줄 품번')).toHaveValue('p1'));
  // Enter로는 보내지 않아요
  fireEvent.submit(screen.getByLabelText('1번째 줄 Box QTY').closest('form') as HTMLFormElement);
  expect(screen.getByRole('heading', { name: '인보이스 수정' })).toBeInTheDocument();
  type('1번째 줄 Box QTY', '6');
  await screen.findByText('VX260807A 1 → VX260915A 5');
  fireEvent.click(screen.getByRole('button', { name: '작성하고 창고에 보내기' }));

  expect(await screen.findByRole('heading', { name: '인보이스 MT261106A' })).toBeInTheDocument();
  expect(screen.getByText('출고 대기')).toBeInTheDocument();
  expect(screen.queryByLabelText('1번째 줄 Box QTY')).not.toBeInTheDocument();
  expect(screen.getByText('VX260807A 1 → VX260915A 5')).toBeInTheDocument();
});

test('출고 확정: 출고 대기를 보여주고, BOL을 첨부해 확정하면 수금이 생겨요', async () => {
  renderAt('/shipments');
  expect(await screen.findByRole('link', { name: 'MT261106A' })).toBeInTheDocument();
  // 이미 출고한 건은 기본 조건(출고 대기)에서 빠져요
  expect(screen.queryByRole('link', { name: 'MT261006A' })).not.toBeInTheDocument();

  const file = new File(['x'], 'bol.pdf', { type: 'application/pdf' });
  fireEvent.change(screen.getByLabelText('MT261106A BOL 첨부'), { target: { files: [file] } });
  expect(await screen.findByText('BOL 1건')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'MT261106A 출고 확정' }));
  fireEvent.click(await screen.findByRole('button', { name: '출고 확정하기' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());

  // 상태 조건이 출고 대기라 목록에서 빠지고, 출고 완료로 바꾸면 보여요
  await waitFor(() =>
    expect(screen.queryByRole('link', { name: 'MT261106A' })).not.toBeInTheDocument(),
  );
  fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'SHIPPED' } });
  expect(await screen.findByRole('link', { name: 'MT261006A' })).toBeInTheDocument();
  expect(await screen.findByText(/확정 · BOL 1건/)).toBeInTheDocument();
});

test('재고: 차감한 만큼 줄고, 소계와 합계가 나와요', async () => {
  renderAt('/stock');
  expect(await screen.findByRole('heading', { name: '고객사별 재고' })).toBeInTheDocument();
  // P1: 입고 1+20+30+4 = 55팔레트 − 출고 6 = 49팔레트 × 100
  const p1 = await findCell('P1');
  const texts = cellTexts(p1.closest('tr') as Element);
  expect(texts).toContain('4,900');
  expect(texts).toContain('$6,125.00');
  expect(screen.getAllByText('소계').length).toBeGreaterThan(0);
  expect(screen.getByText(FIFO_TEXT)).toBeInTheDocument();

  // 표 2: 오래된 컨테이너부터. 첫 컨테이너는 다 빠졌어요
  const first = await findCell('VX260807A');
  expect(cellTexts(first.closest('tr') as Element)).toEqual([
    '1',
    'VX260807A',
    '2026-09-05',
    '20',
    '0',
    '0',
    '$1.2500',
    '50%',
  ]);
});

const FIFO_TEXT = '출고는 1번부터 차례대로 빠집니다.';

test('소계는 창고·고객사가 바뀔 때마다 들어가요', () => {
  const row = (id: string, warehouseId: string, customerName: string) => ({
    id,
    warehouseId,
    warehouseName: warehouseId,
    customerName,
    partId: id,
    partNo: id,
    onHandQty: 10,
    reservedQty: 1,
    inTransitQty: 2,
    unitPrice: '1.0000',
    stockAmount: '10.00',
  });
  const rows = withSubtotals([row('a', 'w1', 'A'), row('b', 'w1', 'A'), row('c', 'w1', 'B')]);
  expect(rows.map((item) => item.partNo)).toEqual(['a', 'b', '소계', 'c', '소계']);
  expect(rows[2]).toMatchObject({ onHandQty: 20, stockAmount: '20.00', unitPrice: null });
});

test('수금: 확정한 건이 생겼고, 입금을 넣으면 미수와 요약이 바뀌어요', async () => {
  renderAt('/collections');
  const invoice = await findCell('MT261106A');
  const row = invoice.closest('tr') as HTMLElement;
  expect(cellTexts(row)).toContain('VX260807A (1), VX260915A (5)');
  expect(within(row).getByText('미수')).toBeInTheDocument();
  expect(screen.getByText(/계획일 = 인보이스 일자/)).toBeInTheDocument();
  // 시작 이력 875.00 + 새로 확정한 750.00
  expect(await screen.findByText('$1,625.00')).toBeInTheDocument();

  const cellAt = (label: string) => {
    const headers = within(screen.getByRole('grid')).getAllByRole('columnheader');
    const index = headers.findIndex((item) => item.textContent?.startsWith(label));
    return row.querySelectorAll('td')[index] as HTMLElement;
  };
  const edit = (label: string, value: string) => {
    fireEvent.doubleClick(cellAt(label));
    const input = within(row).getByRole('textbox', { name: label });
    fireEvent.change(input, { target: { value } });
    fireEvent.keyDown(input, { key: 'Enter' });
  };

  edit('수금일', '2026-12-01');
  await waitFor(() => expect(cellAt('수금일')).toHaveTextContent('2026-12-01'));
  edit('실적 금액', '300');
  await waitFor(() => expect(within(row).getByText('부분 수금')).toBeInTheDocument());
  expect(cellAt('미수')).toHaveTextContent('$450.00');
  // 시작 이력 875.00 + 남은 450.00
  expect(await screen.findByText('$1,325.00')).toBeInTheDocument();

  // 조회 조건으로 거를 수 있어요
  fireEvent.change(screen.getByLabelText('상태'), { target: { value: 'PAID' } });
  expect(await findCell('MT260929A')).toBeInTheDocument();
  expect(screen.queryByText('MT261106A')).not.toBeInTheDocument();
});

test('열람자는 입력 양식 없이 보기만 해요', async () => {
  const viewer: AuthMe = { name: '김열람', role: 'VIEWER' };
  renderAt('/inbound', viewer);
  await screen.findByText('VX260807A');
  expect(screen.queryByRole('button', { name: '입고 등록' })).not.toBeInTheDocument();

  renderAt('/invoices/new', viewer);
  expect(screen.getByText('보고자만 작성할 수 있어요')).toBeInTheDocument();
});
