import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, expect, test, vi } from 'vitest';
import { ToastProvider } from '../components/Toast.tsx';
import { LedgerPage } from './LedgerPage.tsx';
import type { LedgerRow } from './ledger.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

const rows: LedgerRow[] = [
  {
    id: 'K-1',
    kind: '한국 출하',
    date: '2026-10-05',
    invoiceNo: 'VC261005A',
    customer: '고객사 A',
    itemName: '품목 P1',
    unitPrice: '0.5120',
    totalQty: 60000,
    amount: '30720.00',
  },
  {
    id: 'L-1',
    kind: '현지 출하',
    date: '2026-10-06',
    invoiceNo: 'MT261006A',
    customer: '고객사 E',
    itemName: '품번 P1',
    unitPrice: '0.5530',
    totalQty: 2400,
    amount: '1327.20',
  },
];

test('출하 원장은 기간의 한국·현지 출하를 같이 보여주고, 고칠 칸이 없어 열람자 안내도 없어요', async () => {
  const fetchMock = vi.fn(
    async () => new Response(JSON.stringify({ items: rows, total: 2 }), { status: 200 }),
  );
  vi.stubGlobal('fetch', fetchMock);
  render(
    <MemoryRouter initialEntries={['/ledger?from=2026-10-01&to=2026-10-31']}>
      <ToastProvider>
        <LedgerPage me={{ name: '홍길동', role: 'VIEWER' }} />
      </ToastProvider>
    </MemoryRouter>,
  );

  expect(await screen.findByText('MT261006A')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/ledger?from=2026-10-01&to=2026-10-31&page=0&size=500',
    expect.anything(),
  );
  expect(screen.getByText('32,047.20')).toBeInTheDocument(); // 금액 합계
  expect(screen.queryByText('열람자는 고를 수 있고 복사만 할 수 있어요.')).not.toBeInTheDocument();
});
