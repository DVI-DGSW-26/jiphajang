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
 */

export type MockOptions = {
  role: 'REPORTER' | 'VIEWER';
  scenario: 'ok' | 'no-group' | 'login-error';
  name: string;
};

export type MockRequest = {
  method: string;
  /** `/api` 뒤의 경로와 쿼리 — `/auth/me`, `/auth/login?redirect=…` */
  url: string;
  authorization?: string | undefined;
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
  };
}

export function handleMock(request: MockRequest, options: MockOptions): MockResponse {
  const url = new URL(request.url, 'http://mock.local');
  const route = `${request.method.toUpperCase()} ${url.pathname}`;
  const bearer = request.authorization?.startsWith(`Bearer ${MOCK_TOKEN_PREFIX}`) ?? false;

  switch (route) {
    case 'GET /auth/login': {
      // 진짜 서버는 Keycloak을 거쳐 돌아와요. 가짜는 바로 돌려보내요.
      const redirect = url.searchParams.get('redirect');
      if (!redirect) return message(400, 'redirect 주소가 없어요.');
      const target =
        options.scenario === 'login-error'
          ? `${redirect}#error=${encodeURIComponent('가짜 서버: 로그인하지 못했어요. 다시 로그인해 주세요.')}`
          : `${redirect}#token=${MOCK_TOKEN_PREFIX}.${Date.now()}`;
      return { status: 302, headers: { Location: target } };
    }

    case 'GET /auth/me':
      if (!bearer) return message(401, '로그인해 주세요.');
      if (options.scenario === 'no-group') {
        return message(401, '가짜 서버: 이 계정은 집하장 그룹에 없어요.');
      }
      return { status: 200, json: { name: options.name, role: options.role } };

    case 'GET /auth/refresh':
      return { status: 200, json: { token: `${MOCK_TOKEN_PREFIX}.${Date.now()}`, expiresIn: 900 } };

    case 'POST /auth/logout':
      return { status: 204 };

    default:
      return message(404, `가짜 서버에 아직 없는 API예요: ${route}`);
  }
}
