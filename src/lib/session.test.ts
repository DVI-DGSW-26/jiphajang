import { afterEach, beforeEach, expect, test, vi } from 'vitest';

/** 들어왔는지·만료됐는지는 모듈 안에 있어요. 시험마다 새로 불러요 */
async function load() {
  vi.resetModules();
  const api = await import('./api.ts');
  const auth = await import('./auth.ts');
  const session = await import('./session.ts');
  return { ...api, ...auth, ...session };
}

type Route = (path: string, authorization: string | null) => Response | undefined;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** `valid` 토큰만 통하는 서버. 갱신은 `refresh`가 정해요 */
function server(valid: { token: string }, route: Route = () => undefined) {
  const fetch = vi.fn(async (url: string, init: RequestInit = {}) => {
    const path = url.replace(/^\/api/, '');
    const authorization = new Headers(init.headers).get('Authorization');
    const routed = route(path, authorization);
    if (routed) return routed;
    if (authorization !== `Bearer ${valid.token}`)
      return json({ message: '로그인해 주세요.' }, 401);
    if (path === '/auth/me') return json({ name: '홍길동', role: 'REPORTER' });
    return json({ id: '1', saved: true });
  });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const refreshFails: Route = (path) =>
  path === '/auth/refresh' ? json({ message: '세션이 끝났어요.' }, 401) : undefined;

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test('들어오기 전의 401은 그대로 오류예요 — 로그인 안내는 AuthGate가 해요', async () => {
  const { apiFetch, ApiError } = await load();
  server({ token: 'none' });
  await expect(apiFetch('/ledger')).rejects.toBeInstanceOf(ApiError);
});

test('들어온 뒤 401이면 갱신하고 같은 요청을 다시 보내요', async () => {
  const { apiFetch, fetchMe, setToken, isSessionExpired } = await load();
  const valid = { token: 't1' };
  const fetch = server(valid, (path) => {
    if (path !== '/auth/refresh') return undefined;
    valid.token = 't2';
    return json({ token: 't2', expiresIn: 900 });
  });
  setToken('t1');
  await fetchMe();
  valid.token = 'dead'; // 토큰이 끝났어요

  await expect(apiFetch('/ledger/1', { method: 'PATCH', body: '{}' })).resolves.toEqual({
    id: '1',
    saved: true,
  });
  expect(isSessionExpired()).toBe(false);
  expect(fetch.mock.calls.map(([url]) => url)).toEqual([
    '/api/auth/me',
    '/api/ledger/1',
    '/api/auth/refresh',
    '/api/ledger/1',
  ]);
});

test('갱신도 안 되면 다시 로그인할 때까지 기다렸다가 이어서 보내요', async () => {
  const { apiFetch, fetchMe, setToken, isSessionExpired, resumeSession } = await load();
  const valid = { token: 't1' };
  const fetch = server(valid, refreshFails);
  setToken('t1');
  await fetchMe();
  valid.token = 't2';

  const first = apiFetch('/ledger/1', { method: 'PATCH', body: '{}' });
  const second = apiFetch('/ledger/2', { method: 'PATCH', body: '{}' });
  await vi.waitFor(() => expect(isSessionExpired()).toBe(true));
  // 두 요청이 함께 401을 받아도 갱신은 한 번이에요
  expect(fetch.mock.calls.filter(([url]) => url === '/api/auth/refresh')).toHaveLength(1);

  resumeSession('t2');
  await expect(first).resolves.toEqual({ id: '1', saved: true });
  await expect(second).resolves.toEqual({ id: '1', saved: true });
  expect(isSessionExpired()).toBe(false);
  expect(sessionStorage.getItem('jh.accessToken')).toBe('t2');
});

test('기다리는 중에 요청을 끊으면 그 요청만 그만 기다려요', async () => {
  const { apiFetch, fetchMe, setToken, isSessionExpired } = await load();
  const valid = { token: 't1' };
  server(valid, refreshFails);
  setToken('t1');
  await fetchMe();
  valid.token = 't2';

  const controller = new AbortController();
  const request = apiFetch('/ledger', { signal: controller.signal });
  await vi.waitFor(() => expect(isSessionExpired()).toBe(true));
  controller.abort();
  await expect(request).rejects.toThrow();
  // 창은 그대로예요. 다른 요청이 아직 기다릴 수 있어요
  expect(isSessionExpired()).toBe(true);
});

test('/auth/me는 기다리지 않아요 — 다시 로그인한 계정을 확인할 때 써요', async () => {
  const { apiFetch, fetchMe, setToken, ApiError } = await load();
  const valid = { token: 't1' };
  server(valid, refreshFails);
  setToken('t1');
  await fetchMe();
  valid.token = 't2';
  await expect(apiFetch('/auth/me')).rejects.toBeInstanceOf(ApiError);
});
