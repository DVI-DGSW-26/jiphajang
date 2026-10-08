import { apiBase, clearToken, getToken, markAuthenticated, setToken } from './auth.ts';

/** 서버가 2xx가 아닌 답을 줬어요. 401은 화면이 로그인으로 안내해요 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * **세션 쿠키로 인증하는 경로.** 토큰을 붙이지 않아요 — 갱신을 부를 때의 토큰은
 * 이미 만료됐거나 만료 직전이라 신원을 증명할 수 없어요.
 */
const COOKIE_AUTH_PATHS = new Set(['/auth/refresh', '/auth/logout']);

/**
 * 서버를 부르는 유일한 자리. 화면에서 `fetch`를 직접 쓰지 않아요.
 *
 * 토큰이 없으면 헤더를 붙이지 않아요 — 서버가 401을 주고 화면이 로그인으로 안내해요.
 * 여기서 로그인으로 보내지 않아요. 이동은 화면의 일이에요 (`AuthGate`).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const cookieAuth = COOKIE_AUTH_PATHS.has(path);
  const token = getToken();
  if (!cookieAuth && token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    ...(cookieAuth ? { credentials: 'include' as const } : {}),
  });

  if (!response.ok) {
    // 서버가 준 문구가 있으면 그대로 보여줘요. 화면에서 이유를 지어내지 않아요.
    const message = await response.text().catch(() => '');
    throw new ApiError(response.status, message || `서버가 ${response.status}로 답했어요.`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * 로그인한 사람 (`GET /auth/me`). **권한은 이 응답으로만 판단해요** — 토큰 안의 롤을
 * 직접 읽지 않아요. 모양은 `docs/auth.md`에서 서버와 맞춘 것이에요.
 */
export interface AuthMe {
  name: string;
  /** 보고자는 쓰고 고칠 수 있고, 열람자는 내려받기만 해요 (`docs/requirements.md`) */
  role: 'REPORTER' | 'VIEWER';
}

export async function fetchMe(signal?: AbortSignal): Promise<AuthMe> {
  const me = await apiFetch<AuthMe>('/auth/me', signal ? { signal } : {});
  // 토큰이 실제로 통했어요. 이제서야 자동 재로그인을 한 번 더 쓸 수 있게 풀어요.
  markAuthenticated();
  return me;
}

/**
 * 토큰 갱신 (`GET /auth/refresh`). 받은 토큰은 보관만 하고 **수명(초)만** 돌려줘요.
 *
 * 쿠키가 `SameSite=Lax`면 화면과 API가 같은 사이트여야 실려요. 개발 중에는 401이
 * 정상일 수 있어요 — 그래서 실패해도 로그아웃시키지 않아요 (`AuthGate`).
 */
export async function refreshToken(): Promise<number> {
  const data = await apiFetch<{ token: string; expiresIn: number }>('/auth/refresh');
  setToken(data.token);
  return data.expiresIn;
}

/**
 * 로그아웃 (`POST /auth/logout`). 서버는 새 토큰이 안 나오게 막을 뿐이고, 이미 받은 토큰은
 * 만료까지 살아 있어요 — **화면이 토큰을 지워야 로그아웃이 끝나요.**
 *
 * 그래서 **요청이 실패해도 토큰을 지워요.** 공용 PC에 토큰이 남는 쪽이 더 위험해요.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<void>('/auth/logout', { method: 'POST' });
  } catch {
    // 서버 세션이 남아요. 토큰은 아래에서 지워요.
  }
  clearToken();
  window.location.assign('/');
}

/** 다음 갱신까지 기다릴 밀리초. 만료 1분 전, 그래도 30초보다 자주 부르지 않아요 */
export function nextRefreshDelayMs(expiresIn: number): number {
  return Math.max(expiresIn - 60, 30) * 1000;
}
