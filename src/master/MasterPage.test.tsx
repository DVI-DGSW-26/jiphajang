import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ToastProvider } from '../components/Toast.tsx';
import type { AuthMe } from '../lib/api.ts';
import { MasterPage } from './MasterPage.tsx';
import type { Part } from './master.ts';

const reporter: AuthMe = { name: '홍길동', role: 'REPORTER' };
const viewer: AuthMe = { name: '김열람', role: 'VIEWER' };

const part: Part = {
  id: 'p1',
  partNo: 'P1',
  customerId: 'c1',
  customerName: '고객사 A',
  productCode: 'MT',
  project: '모델 1',
  setQty: 100,
  unitPrice: '1.2500',
  priceEffectiveFrom: '2026-01-01',
};

const firstPrice = {
  id: 'pr1',
  unitPrice: '1.2500',
  effectiveFrom: '2026-01-01',
  createdAt: '2026-01-01',
  current: true,
};

type Handler = (method: string, url: URL, body: Record<string, unknown>) => Response | undefined;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

/** 경로별 답. 답하지 않은 요청은 빈 목록이에요 */
function stubApi(handler: Handler) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://x');
    const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : {};
    return handler(init?.method ?? 'GET', url, body) ?? json(200, { items: [], total: 0 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderTab(me: AuthMe, tab = 'parts') {
  render(
    <MemoryRouter initialEntries={[`/master/${tab}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/master/:tab" element={<MasterPage me={me} />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('기간 없이 목록을 받고, 탭으로 옮겨 다녀요', async () => {
  const fetchMock = stubApi((method, url) =>
    method === 'GET' && url.pathname === '/api/master/parts'
      ? json(200, { items: [part], total: 1 })
      : undefined,
  );
  renderTab(reporter);

  expect(await screen.findByText('P1')).toBeInTheDocument();
  const [first] = fetchMock.mock.calls[0] ?? [];
  const query = new URL(first as string, 'http://x').searchParams;
  expect(query.has('from')).toBe(false);
  expect(query.get('page')).toBe('0');

  fireEvent.click(screen.getByRole('link', { name: '창고' }));
  expect(await screen.findByText('등록한 창고가 없어요')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: '창고 추가' })).toBeInTheDocument();
});

test('품번을 추가하면 칸을 확인하고 보낸 뒤 목록에 더해요', async () => {
  const fetchMock = stubApi((method, url) => {
    if (url.pathname === '/api/master/customers') {
      return json(200, {
        items: [{ id: 'c1', name: '고객사 A', shipToName: '납품처 A', paymentTermDays: 30 }],
        total: 1,
      });
    }
    if (method === 'POST' && url.pathname === '/api/master/parts') return json(201, part);
    return undefined;
  });
  renderTab(reporter);

  fireEvent.click(await screen.findByRole('button', { name: '품번 추가' }));
  const dialog = within(await screen.findByRole('dialog', { name: '품번 추가' }));

  // 빈 칸으로 누르면 보내지 않고 칸마다 알려줘요
  fireEvent.click(await dialog.findByRole('button', { name: '품번 추가하기' }));
  expect(dialog.getByText('품번을 넣어 주세요.')).toBeInTheDocument();
  expect(dialog.getByText('고객사를 골라 주세요.')).toBeInTheDocument();
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST');
  expect(posts()).toHaveLength(0);

  fireEvent.change(dialog.getByLabelText('품번'), { target: { value: ' P1 ' } });
  fireEvent.change(dialog.getByLabelText('고객사'), { target: { value: 'c1' } });
  fireEvent.change(dialog.getByLabelText('제품코드'), { target: { value: 'mt' } });
  fireEvent.change(dialog.getByLabelText('박스당 수량'), { target: { value: '1,000' } });
  fireEvent.change(dialog.getByLabelText('단가 (USD)'), { target: { value: '1.25' } });
  fireEvent.change(dialog.getByLabelText('단가 적용일'), { target: { value: '2026.1.5' } });
  fireEvent.click(dialog.getByRole('button', { name: '품번 추가하기' }));

  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(JSON.parse(posts()[0]?.[1]?.body as string)).toEqual({
    partNo: 'P1',
    customerId: 'c1',
    productCode: 'MT',
    project: null,
    setQty: '1000',
    unitPrice: '1.25',
    effectiveFrom: '2026-01-05',
  });
  expect(await screen.findByText('P1')).toBeInTheDocument();
});

test('서버가 거절하면 창을 닫지 않고 이유를 보여줘요', async () => {
  stubApi((method, url) =>
    method === 'POST' && url.pathname === '/api/master/warehouses'
      ? json(409, { message: '같은 이름의 창고가 이미 있어요.' })
      : undefined,
  );
  renderTab(reporter, 'warehouses');

  fireEvent.click(await screen.findByRole('button', { name: '창고 추가' }));
  const dialog = within(screen.getByRole('dialog', { name: '창고 추가' }));
  fireEvent.change(dialog.getByLabelText('이름'), { target: { value: '창고 1' } });
  fireEvent.click(dialog.getByRole('button', { name: '창고 추가하기' }));

  expect(await dialog.findByRole('alert')).toHaveTextContent('같은 이름의 창고가 이미 있어요.');
  expect(dialog.getByLabelText('이름')).toHaveValue('창고 1');
});

test('Esc로 창을 닫아요', async () => {
  stubApi(() => undefined);
  renderTab(reporter, 'warehouses');
  fireEvent.click(await screen.findByRole('button', { name: '창고 추가' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('단가를 더하면 현재 단가가 바뀌고 이력을 다시 받아요', async () => {
  const history = [firstPrice];
  stubApi((method, url, body) => {
    if (url.pathname === '/api/master/parts') return json(200, { items: [part], total: 1 });
    if (url.pathname === '/api/master/parts/p1/prices') {
      if (method === 'POST') {
        history.unshift({
          id: 'pr2',
          unitPrice: body.unitPrice as string,
          effectiveFrom: body.effectiveFrom as string,
          createdAt: '2026-11-05',
          current: true,
        });
        return json(201, {
          ...part,
          unitPrice: body.unitPrice,
          priceEffectiveFrom: body.effectiveFrom,
        });
      }
      return json(200, { items: history, total: history.length });
    }
    return undefined;
  });
  renderTab(reporter);

  fireEvent.click(await screen.findByRole('button', { name: 'P1 단가 이력' }));
  const dialog = within(screen.getByRole('dialog', { name: 'P1 단가 이력' }));
  expect(await dialog.findByText('지금 적용')).toBeInTheDocument();

  fireEvent.change(dialog.getByLabelText('새 단가 (USD)'), { target: { value: '1.5' } });
  fireEvent.change(dialog.getByLabelText('적용일'), { target: { value: '2026-11-01' } });
  fireEvent.click(dialog.getByRole('button', { name: '단가 추가하기' }));

  expect(await dialog.findByText(/2026-11-01/)).toBeInTheDocument();
  // 저장 뒤에는 칸을 비워요
  await waitFor(() => expect(dialog.getByLabelText('새 단가 (USD)')).toHaveValue(''));
  // 표의 현재 단가도 바뀌어요
  expect(screen.getAllByText(/1\.5000/).length).toBeGreaterThan(1);
});

test('열람자는 추가할 수 없고 단가 이력은 볼 수 있어요', async () => {
  stubApi((_method, url) => {
    if (url.pathname === '/api/master/parts') return json(200, { items: [part], total: 1 });
    if (url.pathname === '/api/master/parts/p1/prices') {
      return json(200, { items: [firstPrice], total: 1 });
    }
    return undefined;
  });
  renderTab(viewer);

  fireEvent.click(await screen.findByRole('button', { name: 'P1 단가 이력' }));
  const dialog = within(screen.getByRole('dialog', { name: 'P1 단가 이력' }));
  expect(await dialog.findByText('지금 적용')).toBeInTheDocument();
  expect(dialog.queryByLabelText('새 단가 (USD)')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '품번 추가' })).not.toBeInTheDocument();

  fireEvent.click(dialog.getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
