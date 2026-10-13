/**
 * 개발용 가짜 서버 — `npm run dev:mock`.
 *
 * 서버가 아직 없어서, `docs/auth.md`에서 서버와 맞춘 약속대로 답하는 가짜를 둬요.
 * Vite 개발 서버 안에서 돌아요(`mock/plugin.ts`). **빌드 결과에는 들어가지 않아요.**
 *
 * 로그인은 `fetch`가 아니라 페이지 이동이라, 서비스 워커(MSW 등)로는 흉내 낼 수 없어요.
 * 그래서 개발 서버가 직접 받아요.
 *
 * 상황은 `.env.mock.local`로 바꿔요 (`.env.example` 참고).
 * - `MOCK_ROLE=VIEWER` — 열람자로 들어가요
 * - `MOCK_SCENARIO=no-group` — 로그인은 되는데 `/auth/me`가 401 (그룹에 없는 계정)
 * - `MOCK_SCENARIO=login-error` — 로그인에서 `#error=`로 돌아와요
 * - `MOCK_SCALE=20` — 목록 행을 20배로 (많은 행에서 느려지지 않는지 볼 때)
 * - `MOCK_TOKEN_TTL=60` — 토큰이 60초 뒤 끝나고 갱신도 안 돼요 (로그인 만료 창을 볼 때)
 *
 * 목록은 예시 데이터로 답해요(`mock/list.ts`). 받기·고치기 모양은 서버와 맞춘 약속이고, 열은 잠정이에요.
 */

import { exportDeclarations } from './exportDeclarations.ts';
import { ledger } from './ledger.ts';
import type { MockList } from './list.ts';
import { localInvoices } from './localInvoices.ts';

/** 가짜 목록. 받기·고치기는 모두 같은 약속이에요 (`mock/list.ts`) */
const MOCK_LISTS: MockList[] = [exportDeclarations, localInvoices, ledger];

export type MockOptions = {
  role: 'REPORTER' | 'VIEWER';
  scenario: 'ok' | 'no-group' | 'login-error';
  name: string;
  /** 목록 행 배수 (1~100) */
  scale: number;
  /** 토큰 수명(초). 0이면 끝나지 않아요. 정하면 갱신도 401이에요 */
  tokenTtl: number;
};

export type MockRequest = {
  method: string;
  /** `/api` 뒤의 경로와 쿼리 — `/auth/me`, `/auth/login?redirect=…` */
  url: string;
  authorization?: string | undefined;
  /** JSON 본문 (PATCH 등) */
  body?: unknown;
};

export type MockResponse = {
  status: number;
  headers?: Record<string, string>;
  json?: unknown;
};

export const MOCK_TOKEN_PREFIX = 'mock-token';

const message = (status: number, text: string): MockResponse => ({
  status,
  json: { message: text },
});

export function readMockOptions(env: Record<string, string | undefined>): MockOptions {
  return {
    role: env.MOCK_ROLE === 'VIEWER' ? 'VIEWER' : 'REPORTER',
    scenario:
      env.MOCK_SCENARIO === 'no-group' || env.MOCK_SCENARIO === 'login-error'
        ? env.MOCK_SCENARIO
        : 'ok',
    name: env.MOCK_NAME || '홍길동',
    scale: Number(env.MOCK_SCALE) || 1,
    tokenTtl: Math.max(Number(env.MOCK_TOKEN_TTL) || 0, 0),
  };
}

/** 가짜 토큰은 `mock-token.<만든 시각>`이에요. 수명을 정했으면 지난 것은 통하지 않아요 */
function validToken(authorization: string | undefined, options: MockOptions, now: number): boolean {
  const prefix = `Bearer ${MOCK_TOKEN_PREFIX}.`;
  if (!authorization?.startsWith(prefix)) return false;
  if (options.tokenTtl === 0) return true;
  const issued = Number(authorization.slice(prefix.length));
  return now - issued < options.tokenTtl * 1000;
}

export function handleMock(
  request: MockRequest,
  options: MockOptions,
  now = Date.now(),
): MockResponse {
  const url = new URL(request.url, 'http://mock.local');
  const route = `${request.method.toUpperCase()} ${url.pathname}`;
  const bearer = validToken(request.authorization, options, now);

  switch (route) {
    case 'GET /auth/login': {
      // 진짜 서버는 Keycloak을 거쳐 돌아와요. 가짜는 바로 돌려보내요.
      const redirect = url.searchParams.get('redirect');
      if (!redirect) return message(400, 'redirect 주소가 없어요.');
      const target =
        options.scenario === 'login-error'
          ? `${redirect}#error=${encodeURIComponent('가짜 서버: 로그인하지 못했어요. 다시 로그인해 주세요.')}`
          : `${redirect}#token=${MOCK_TOKEN_PREFIX}.${now}`;
      return { status: 302, headers: { Location: target } };
    }

    case 'GET /auth/me':
      if (!bearer) return message(401, '로그인해 주세요.');
      if (options.scenario === 'no-group') {
        return message(401, '가짜 서버: 이 계정은 집하장 그룹에 없어요.');
      }
      return { status: 200, json: { name: options.name, role: options.role } };

    case 'GET /auth/refresh':
      // 수명을 정했으면 세션 쿠키가 없는 것처럼 굴어요 — 다시 로그인해야 해요
      if (options.tokenTtl > 0) return message(401, '가짜 서버: 세션이 끝났어요.');
      return { status: 200, json: { token: `${MOCK_TOKEN_PREFIX}.${now}`, expiresIn: 900 } };

    case 'POST /auth/logout':
      return { status: 204 };

    default: {
      const list = MOCK_LISTS.find((item) => item.path === url.pathname);
      if (request.method.toUpperCase() === 'GET' && list) {
        if (!bearer) return message(401, '로그인해 주세요.');
        return { status: 200, json: list.list(url.searchParams) };
      }
      const patch = /^PATCH (.+)\/([^/]+)$/.exec(route);
      const patchList = MOCK_LISTS.find((item) => item.path === patch?.[1]);
      if (patch?.[2] && patchList) {
        if (!bearer) return message(401, '로그인해 주세요.');
        if (options.role !== 'REPORTER') return message(403, '보고자만 고칠 수 있어요.');
        const result = patchList.patch(decodeURIComponent(patch[2]), request.body);
        return 'row' in result
          ? { status: 200, json: result.row }
          : message(result.status, result.error);
      }
      return message(404, `가짜 서버에 아직 없는 API예요: ${route}`);
    }
  }
}
