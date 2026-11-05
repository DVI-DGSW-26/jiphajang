import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { App } from './App.tsx';
import { ToastProvider } from './components/Toast.tsx';
import type { AuthMe } from './lib/api.ts';

const me: AuthMe = { name: '홍길동', role: 'REPORTER' };

// 마스터 같은 목록 화면은 들어가자마자 목록을 받아요. 여기서는 빈 목록으로 답해요
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ToastProvider>
        <App me={me} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

test('처음 주소로 들어오면 인보이스 작성을 보여줘요', () => {
  renderAt('/');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('인보이스 작성');
  expect(screen.getByRole('link', { name: '인보이스 작성' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  expect(document.title).toBe('인보이스 작성 · 집하장');
});

test('상단 바에 메뉴 여섯 개와 로그인한 사람을 보여줘요', () => {
  renderAt('/stock');
  const nav = screen.getByRole('navigation', { name: '주 메뉴' });
  expect(nav).toHaveTextContent('컨테이너 입고인보이스 작성출고 확정수금 관리재고 현황마스터');
  expect(screen.getByText('홍길동')).toHaveTextContent('보고자');
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
});

test('메뉴를 누르면 그 화면으로 가요', () => {
  renderAt('/stock');
  fireEvent.click(screen.getByRole('link', { name: '출고 확정' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('출고 확정');
  expect(screen.getByRole('link', { name: '출고 확정' })).toHaveAttribute('aria-current', 'page');
});

test('마스터 메뉴는 품번 탭으로 들어가고, 탭에 있어도 메뉴에 밑줄이에요', () => {
  renderAt('/master');
  expect(screen.getByRole('link', { name: '품번' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: '마스터' })).toHaveAttribute('aria-current', 'page');
});

test.each(['/ledger', '/results', '/results/export-declarations'])(
  '범위 밖 화면(%s)은 메뉴에서 빠졌어요',
  (path) => {
    renderAt(path);
    expect(screen.getByText('이 주소에는 화면이 없어요')).toBeInTheDocument();
  },
);

test('없는 주소는 길을 알려줘요', () => {
  renderAt('/nope');
  expect(screen.getByText('이 주소에는 화면이 없어요')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '인보이스 작성으로 가기' })).toHaveAttribute(
    'href',
    '/invoices/new',
  );

  renderAt('/master/nope');
  expect(screen.getAllByText('이 주소에는 화면이 없어요')).toHaveLength(2);
});
