import { expect, test } from 'vitest';
import { handleMock, MOCK_TOKEN_PREFIX, type MockOptions, readMockOptions } from './api.ts';

const ok: MockOptions = { role: 'REPORTER', scenario: 'ok', name: '홍길동' };
const redirect = encodeURIComponent('http://localhost:5173/auth/callback');

test('로그인하면 콜백 주소의 fragment로 토큰을 돌려보내요', () => {
  const response = handleMock({ method: 'GET', url: `/auth/login?redirect=${redirect}` }, ok);
  expect(response.status).toBe(302);
  expect(response.headers?.Location).toMatch(
    new RegExp(`^http://localhost:5173/auth/callback#token=${MOCK_TOKEN_PREFIX}\\.`),
  );
});

test('토큰이 있으면 /auth/me가 이름과 역할을, 없으면 401을 줘요', () => {
  const me = handleMock(
    { method: 'GET', url: '/auth/me', authorization: `Bearer ${MOCK_TOKEN_PREFIX}.1` },
    { ...ok, role: 'VIEWER' },
  );
  expect(me).toEqual({ status: 200, json: { name: '홍길동', role: 'VIEWER' } });
  expect(handleMock({ method: 'GET', url: '/auth/me' }, ok).status).toBe(401);
});

test('그룹에 없는 계정과 로그인 실패도 흉내 내요', () => {
  const noGroup = handleMock(
    { method: 'GET', url: '/auth/me', authorization: `Bearer ${MOCK_TOKEN_PREFIX}.1` },
    { ...ok, scenario: 'no-group' },
  );
  expect(noGroup.status).toBe(401);

  const loginError = handleMock(
    { method: 'GET', url: `/auth/login?redirect=${redirect}` },
    { ...ok, scenario: 'login-error' },
  );
  expect(loginError.headers?.Location).toContain('#error=');
});

test('없는 API는 약속한 오류 모양 { message }로 404를 줘요', () => {
  expect(handleMock({ method: 'GET', url: '/invoices' }, ok)).toEqual({
    status: 404,
    json: { message: '가짜 서버에 아직 없는 API예요: GET /invoices' },
  });
});

test('환경 변수로 상황을 골라요. 모르는 값은 기본값이에요', () => {
  expect(readMockOptions({})).toEqual(ok);
  expect(
    readMockOptions({ MOCK_ROLE: 'VIEWER', MOCK_SCENARIO: 'no-group', MOCK_NAME: '김철수' }),
  ).toEqual({
    role: 'VIEWER',
    scenario: 'no-group',
    name: '김철수',
  });
  expect(readMockOptions({ MOCK_SCENARIO: 'weird' }).scenario).toBe('ok');
});

const bearer = `Bearer ${MOCK_TOKEN_PREFIX}.1`;

test('수출신고취합은 기간 안의 행을 쪽으로 나눠 줘요', () => {
  const all = handleMock(
    {
      method: 'GET',
      url: '/results/export-declarations?from=2025-01-01&to=2025-03-31',
      authorization: bearer,
    },
    ok,
  );
  const body = all.json as { items: { shipDate: string }[]; total: number };
  expect(body.total).toBeGreaterThan(10);
  expect(
    body.items.every((row) => row.shipDate >= '2025-01-01' && row.shipDate <= '2025-03-31'),
  ).toBe(true);

  const page = handleMock(
    {
      method: 'GET',
      url: '/results/export-declarations?from=2025-01-01&to=2025-03-31&page=1&size=5',
      authorization: bearer,
    },
    ok,
  ).json as { items: unknown[]; total: number };
  expect(page.items).toEqual(body.items.slice(5, 10));
  expect(page.total).toBe(body.total);
});

test('직접 입력 칸을 고치면 계산 칸까지 새로 구한 행을 돌려줘요. 열람자는 403', () => {
  const list = handleMock(
    {
      method: 'GET',
      url: '/results/export-declarations?from=2025-02-01&to=2025-02-28',
      authorization: bearer,
    },
    ok,
  ).json as { items: { id: string; amountUsd: string }[] };
  const row = list.items[0];
  if (!row) throw new Error('가짜 행이 없어요');
  const url = `/results/export-declarations/${encodeURIComponent(row.id)}`;

  const saved = handleMock(
    { method: 'PATCH', url, authorization: bearer, body: { exchangeRate: '2' } },
    ok,
  );
  expect(saved.status).toBe(200);
  expect(saved.json).toMatchObject({
    exchangeRate: '2',
    amountKrw: String(Math.round(Number(row.amountUsd) * 2)),
  });

  expect(
    handleMock({ method: 'PATCH', url, authorization: bearer, body: { amountUsd: '1' } }, ok)
      .status,
  ).toBe(400);
  expect(
    handleMock(
      { method: 'PATCH', url, authorization: bearer, body: { blNo: 'X' } },
      { ...ok, role: 'VIEWER' },
    ).status,
  ).toBe(403);
});
