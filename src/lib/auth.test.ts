import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import {
  clearToken,
  getToken,
  loginRetryUsed,
  loginUrl,
  markAuthenticated,
  readCallbackHash,
  redirectToLoginOnce,
  setToken,
} from './auth.ts';

beforeEach(() => {
  vi.stubGlobal('location', { origin: 'http://localhost:5173', assign: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
  sessionStorage.clear();
});

test('콜백 fragment에서 토큰과 오류를 꺼내요', () => {
  expect(readCallbackHash('#token=abc.def')).toEqual({ token: 'abc.def' });
  expect(readCallbackHash('#error=%EA%B6%8C%ED%95%9C')).toEqual({ error: '권한' });
  expect(readCallbackHash('')).toEqual({});
});

test('로그인 주소에 돌아올 주소를 실어요', () => {
  expect(loginUrl()).toBe(
    `/api/auth/login?redirect=${encodeURIComponent('http://localhost:5173/auth/callback')}`,
  );
});

test('토큰은 sessionStorage에 두고 localStorage에는 두지 않아요', () => {
  setToken('t1');
  expect(getToken()).toBe('t1');
  expect(sessionStorage.getItem('jh.accessToken')).toBe('t1');
  expect(localStorage.length).toBe(0);
});

test('401 자동 재로그인은 한 번만 가요', () => {
  expect(redirectToLoginOnce()).toBe(true);
  expect(loginRetryUsed()).toBe(true);
  // 토큰을 다시 받아도 표시는 그대로예요 — 받은 것과 통하는 것은 달라요.
  setToken('t2');
  expect(redirectToLoginOnce()).toBe(false);
  expect(location.assign).toHaveBeenCalledTimes(1);

  // /auth/me가 통하면 다음 만료 때 한 번 더 갈 수 있어요.
  markAuthenticated();
  expect(redirectToLoginOnce()).toBe(true);
});
