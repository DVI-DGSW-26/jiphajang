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
