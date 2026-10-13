import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { AuthMe } from '../lib/api.ts';
import { clearToken, getToken } from '../lib/auth.ts';
import { isSessionExpired, resumeSession, waitForLogin } from '../lib/session.ts';
import { SessionExpiredDialog } from './SessionExpiredDialog.tsx';

const me: AuthMe = { name: '홍길동', role: 'REPORTER' };

function answerMe(next: AuthMe | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      next
        ? new Response(JSON.stringify(next), { status: 200 })
        : new Response(JSON.stringify({ message: '그룹에 없어요.' }), { status: 401 }),
    ),
  );
}

/** 팝업 대신 이 창을 돌려줘요. 팝업이 보낸 것처럼 이 창에서 메시지를 쏴요 */
function sendFromPopup(token: string) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'jh.login', token },
        origin: window.location.origin,
        source: window,
      }),
    );
  });
}

beforeEach(() => {
  vi.stubGlobal(
    'open',
    vi.fn(() => window),
  );
  void waitForLogin();
});

afterEach(() => {
  if (isSessionExpired()) resumeSession('cleanup');
  vi.unstubAllGlobals();
  clearToken();
  sessionStorage.clear();
});

test('로그인이 끝나면 창을 띄우고, 같은 사람으로 다시 들어오면 닫혀요', async () => {
  answerMe(me);
  render(<SessionExpiredDialog me={me} />);
  expect(screen.getByRole('alertdialog', { name: '로그인이 끝났어요' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '다시 로그인하기' }));
  expect(window.open).toHaveBeenCalledTimes(1);
  expect(screen.getByText('새 창에서 로그인해 주세요.')).toBeInTheDocument();

  sendFromPopup('t2');
  await vi.waitFor(() => expect(isSessionExpired()).toBe(false));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(getToken()).toBe('t2');
});

test('다른 창이 보낸 토큰은 받지 않아요', () => {
  answerMe(me);
  render(<SessionExpiredDialog me={me} />);
  // 로그인 버튼을 누르기 전이라 기다리는 팝업이 없어요
  sendFromPopup('t2');
  expect(isSessionExpired()).toBe(true);
  expect(getToken()).toBeNull();
});

test('팝업이 막히면 허용하라고 알려줘요', () => {
  vi.stubGlobal(
    'open',
    vi.fn(() => null),
  );
  render(<SessionExpiredDialog me={me} />);
  fireEvent.click(screen.getByRole('button', { name: '다시 로그인하기' }));
  expect(screen.getByRole('alert')).toHaveTextContent('브라우저가 새 창을 막았어요');
});

test('들어갈 수 없는 계정이면 창을 두고 이유를 보여줘요', async () => {
  answerMe(null);
  render(<SessionExpiredDialog me={me} />);
  fireEvent.click(screen.getByRole('button', { name: '다시 로그인하기' }));
  sendFromPopup('t2');
  expect(await screen.findByRole('alert')).toHaveTextContent('이 계정으로는 들어갈 수 없어요');
  expect(isSessionExpired()).toBe(true);
  expect(getToken()).toBeNull();
});

test('다른 사람으로 들어오면 이어서 저장하지 않고 새로 열어요', async () => {
  answerMe({ name: '김철수', role: 'REPORTER' });
  const reload = vi.fn();
  vi.stubGlobal('location', { ...window.location, origin: window.location.origin, reload });
  render(<SessionExpiredDialog me={me} />);
  fireEvent.click(screen.getByRole('button', { name: '다시 로그인하기' }));
  sendFromPopup('t2');
  await vi.waitFor(() => expect(reload).toHaveBeenCalled());
  expect(isSessionExpired()).toBe(true);
});
