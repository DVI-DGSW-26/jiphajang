import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { ToastProvider } from '../components/Toast.tsx';
import type { AuthMe } from '../lib/api.ts';
import { ExportDeclarationsPage } from './ExportDeclarationsPage.tsx';
import type { ExportDeclarationRow } from './exportDeclarations.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

const row: ExportDeclarationRow = {
  id: 'VC261005A-1',
  no: 1,
  shipDate: '2026-10-05',
  invoiceNo: 'VC261005A',
  customer: '고객사 A',
  declarationNo: null,
  blNo: null,
  shippedOn: null,
  itemName: '품목 P1',
  unitPrice: '0.5120',
  setQty: 2400,
  boxQty: 25,
  totalQty: 60000,
  amountUsd: '30720.00',
  exchangeRate: null,
  amountKrw: null,
};

function respond(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage(
  me: AuthMe,
  path = '/results/export-declarations?from=2026-10-01&to=2026-10-31',
) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <ExportDeclarationsPage me={me} eyebrow={null} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

test('주소창의 기간으로 목록을 받아 표로 보여주고 합계를 내요', async () => {
  const fetchMock = respond(200, { items: [row], total: 1 });
  renderPage({ name: '홍길동', role: 'REPORTER' });

  expect(await screen.findByText('VC261005A')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/results/export-declarations?from=2026-10-01&to=2026-10-31&page=0&size=500',
    expect.anything(),
  );
  expect(screen.getByText('1행')).toBeInTheDocument();
  expect(screen.getAllByText('30,720.00')).toHaveLength(2); // 칸과 합계줄
});

test('열람자에게는 고칠 수 없다고 알려줘요', async () => {
  respond(200, { items: [row], total: 1 });
  renderPage({ name: '홍길동', role: 'VIEWER' });
  expect(await screen.findByText('VC261005A')).toBeInTheDocument();
  expect(screen.getByText('열람자는 고를 수 있고 복사만 할 수 있어요.')).toBeInTheDocument();
});

test('서버에 아직 API가 없으면 그렇다고 말해요', async () => {
  respond(404, { message: 'Not Found' });
  renderPage({ name: '홍길동', role: 'REPORTER' });
  expect(await screen.findByText('서버에 아직 이 목록이 없어요')).toBeInTheDocument();
});

test('기간에 행이 없으면 빈 화면을 보여줘요', async () => {
  respond(200, { items: [], total: 0 });
  renderPage({ name: '홍길동', role: 'REPORTER' });
  expect(await screen.findByText('이 기간에는 한국 출하가 없어요')).toBeInTheDocument();
});

test('서버 오류는 문구와 다시 불러오기 버튼을 보여줘요', async () => {
  respond(500, { message: '잠시 뒤 다시 해 주세요.' });
  renderPage({ name: '홍길동', role: 'REPORTER' });
  expect(await screen.findByText('잠시 뒤 다시 해 주세요.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '다시 불러오기' })).toBeInTheDocument();
});
