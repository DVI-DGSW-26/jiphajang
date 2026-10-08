import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { expect, test } from 'vitest';
import { App } from './App.tsx';
import type { AuthMe } from './lib/api.ts';

const me: AuthMe = { name: '홍길동', role: 'REPORTER' };

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App me={me} />
    </MemoryRouter>,
  );
}

test('처음 주소로 들어오면 출하 원장을 보여줘요', () => {
  renderAt('/');
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('출하 원장');
  expect(screen.getByRole('link', { name: '출하 원장' })).toHaveAttribute('aria-current', 'page');
  expect(document.title).toBe('출하 원장 · 집하장');
});

test('상단 바에 메뉴 다섯 개와 로그인한 사람을 보여줘요', () => {
  renderAt('/ledger');
  const nav = screen.getByRole('navigation', { name: '주 메뉴' });
  expect(nav).toHaveTextContent('Invoice출하 원장결과재고·선적마스터');
  expect(screen.getByText('홍길동')).toHaveTextContent('보고자');
  expect(screen.getByRole('button', { name: '로그아웃' })).toBeInTheDocument();
});

test('메뉴를 누르면 그 화면으로 가요', () => {
  renderAt('/ledger');
  fireEvent.click(screen.getByRole('link', { name: '재고·선적' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('재고·선적');
  expect(screen.getByRole('link', { name: '재고·선적' })).toHaveAttribute('aria-current', 'page');
});

test('결과 목록에서 결과로 들어가고, 자료가 없는 결과는 그렇다고 말해요', () => {
  renderAt('/results');
  expect(screen.getAllByRole('listitem')).toHaveLength(5);

  fireEvent.click(screen.getByRole('link', { name: /U71X Offset Cost Review/ }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('U71X Offset Cost Review');
  expect(screen.getByText('계산 기준을 받고 있어요')).toBeInTheDocument();
  // 결과 아래 화면에서도 상단 바는 결과에 밑줄이에요
  expect(screen.getByRole('link', { name: '결과' })).toHaveAttribute('aria-current', 'page');
});

test('없는 주소는 길을 알려줘요', () => {
  renderAt('/nope');
  expect(screen.getByText('이 주소에는 화면이 없어요')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '출하 원장으로 가기' })).toHaveAttribute(
    'href',
    '/ledger',
  );

  renderAt('/results/nope');
  expect(screen.getAllByText('이 주소에는 화면이 없어요')).toHaveLength(2);
});
