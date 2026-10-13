import { afterEach, beforeEach, expect, test, vi } from 'vitest';

/** 들어왔는지·끊겼는지는 모듈 안에 있어요. 시험마다 새로 불러요 */
async function load() {
  vi.resetModules();
  const api = await import('./api.ts');
  const auth = await import('./auth.ts');
  const connection = await import('./connection.ts');
  return { ...api, ...auth, ...connection };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** `down`이면 연결 실패, `status`면 그 상태로 답하는 서버. 받은 순서를 적어 둬요 */
function server() {
  const state = { down: false, status: 200, received: [] as string[] };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const path = url.replace(/^\/api/, '');
      if (path === '/auth/me') return json({ name: '홍길동', role: 'REPORTER' });
      if (state.down) throw new TypeError('Failed to fetch');
      state.received.push(`${init.method ?? 'GET'} ${path} ${init.body ?? ''}`.trim());
      if (state.status !== 200) return json({ message: '잠시 후 다시 해 주세요' }, state.status);
      return json({ ok: true });
    }),
  );
  return state;
}

async function signIn() {
  const modules = await load();
  const state = server();
  modules.setToken('t1');
  await modules.fetchMe();
  return { ...modules, state };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

test('들어오기 전의 연결 실패는 그대로 오류예요', async () => {
  const { apiFetch } = await load();
  const state = server();
  state.down = true;
  await expect(apiFetch('/ledger')).rejects.toBeInstanceOf(TypeError);
});

test('끊기면 기다렸다가 다시 연결되면 이어서 보내요', async () => {
  const { apiFetch, isOffline, state } = await signIn();
  state.down = true;
  const request = apiFetch('/ledger');
  await vi.waitFor(() => expect(isOffline()).toBe(true));

  // 아직 끊겨 있으면 2초 뒤 다시 해 봐도 계속 기다려요
  await vi.advanceTimersByTimeAsync(2000);
  expect(isOffline()).toBe(true);

  state.down = false;
  await vi.advanceTimersByTimeAsync(4000);
  await expect(request).resolves.toEqual({ ok: true });
  expect(isOffline()).toBe(false);
});

test('끊긴 동안 고친 값은 고친 순서대로 하나씩 저장해요', async () => {
  const { apiFetch, isOffline, tryAgainNow, state } = await signIn();
  state.down = true;
  const first = apiFetch('/ledger/1', { method: 'PATCH', body: '{"a":"1"}' });
  await vi.waitFor(() => expect(isOffline()).toBe(true));
  // 끊긴 동안 부른 요청은 보내 보지도 않고 줄 뒤에 서요
  const second = apiFetch('/ledger/1', { method: 'PATCH', body: '{"a":"2"}' });

  state.down = false;
  tryAgainNow();
  await Promise.all([first, second]);
  expect(state.received).toEqual(['PATCH /ledger/1 {"a":"1"}', 'PATCH /ledger/1 {"a":"2"}']);
  expect(isOffline()).toBe(false);
});

test('서버가 다시 켜지는 중(502·503·504)이어도 기다려요', async () => {
  const { apiFetch, isOffline, tryAgainNow, state } = await signIn();
  state.status = 503;
  const request = apiFetch('/ledger');
  await vi.waitFor(() => expect(isOffline()).toBe(true));
  state.status = 200;
  tryAgainNow();
  await expect(request).resolves.toEqual({ ok: true });
});

test('POST는 두 번 들어갈 수 있어 기다리지 않고 실패해요', async () => {
  const { apiFetch, isOffline, state } = await signIn();
  state.down = true;
  await expect(apiFetch('/invoices', { method: 'POST', body: '{}' })).rejects.toBeInstanceOf(
    TypeError,
  );
  expect(isOffline()).toBe(false);
});

test('기다리던 요청을 끊으면 줄에서 빠지고, 남은 게 없으면 끊김 표시도 내려요', async () => {
  const { apiFetch, isOffline, state } = await signIn();
  state.down = true;
  const controller = new AbortController();
  const request = apiFetch('/ledger', { signal: controller.signal });
  await vi.waitFor(() => expect(isOffline()).toBe(true));
  controller.abort();
  await expect(request).rejects.toThrow();
  expect(isOffline()).toBe(false);
});
