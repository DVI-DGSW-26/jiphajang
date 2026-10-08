/**
 * DVI 통합 로그인(Keycloak) 연동 — Hi_yo 관리팀 화면과 같은 방식이에요.
 *
 * 서버가 로그인을 대신 처리해요. **화면에 OIDC 라이브러리를 넣지 않아요** —
 * 로그인 주소로 브라우저를 통째로 보내면 서버가 Keycloak을 거쳐 토큰을 들고 돌아와요.
 * 서버가 지켜야 할 약속은 `docs/auth.md`에 있어요.
 *
 * 흐름
 * 1. 로그인 버튼 → `/auth/login`으로 **화면 이동** (fetch 아님)
 * 2. 서버가 `<화면>/auth/callback#token=<JWT>`로 돌려보내요
 * 3. 토큰을 보관하고 이후 요청에 `Authorization: Bearer`로 붙여요
 *
 * **토큰을 `localStorage`에 두지 않아요.** XSS 한 번에 털려요. 탭 안에서만 사는
 * `sessionStorage`에 두고, 그것도 막혀 있으면 메모리에만 둬요.
 *
 * **토큰을 로그·오류 문구에 넣지 않아요.**
 */

const TOKEN_KEY = 'jh.accessToken';
/** 401 자동 재로그인을 한 번만 하기 위한 표시 */
const RETRIED_KEY = 'jh.loginRetried';

/** `sessionStorage`가 막혀 있어도 화면은 돌아야 해요. 그때는 이 값만 써요 */
let memoryToken: string | null = null;

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // 사생활 보호 모드 등. 메모리에만 남아요 — 새로고침하면 다시 로그인해요.
  }
}

/** API 주소. 개발 중에는 Vite가 `/api`를 서버로 넘겨줘요 (`vite.config.ts`) */
export function apiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
}

export function getToken(): string | null {
  return memoryToken ?? readSession(TOKEN_KEY);
}

export function hasToken(): boolean {
  return getToken() !== null;
}

/**
 * 받은 토큰을 보관해요.
 *
 * **여기서 재시도 표시를 지우지 않아요.** 토큰을 받은 것과 그 토큰이 통하는 것은 달라요 —
 * 그룹에 없거나 서비스 사용자에 연결되지 않은 계정도 로그인은 되고 토큰도 받아요.
 * 여기서 지우면 `401 → 로그인 → 토큰 → 401`이 끝없이 돌아요.
 * 표시는 `/auth/me`가 실제로 통했을 때만 지워요 (`markAuthenticated`).
 */
export function setToken(token: string): void {
  memoryToken = token;
  writeSession(TOKEN_KEY, token);
}

/** `/auth/me`가 통했어요. 다음 만료 때 한 번 더 조용히 다녀올 수 있게 표시를 풀어요 */
export function markAuthenticated(): void {
  writeSession(RETRIED_KEY, null);
}

export function clearToken(): void {
  memoryToken = null;
  writeSession(TOKEN_KEY, null);
}

/**
 * 로그인 시작 주소. **fetch로 부르지 않아요** — 브라우저가 통째로 이동해야
 * Keycloak 로그인 화면(OTP 포함)이 떠요.
 *
 * **돌아올 주소를 명시해서 보내요.** 등록되지 않은 주소면 서버가 400과 함께 그 주소를
 * 그대로 보여줘요 — 배포 주소가 바뀌었을 때 무엇을 등록해달라고 할지 화면에 나와요.
 */
export function loginUrl(): string {
  const redirect = `${window.location.origin}/auth/callback`;
  return `${apiBase()}/auth/login?redirect=${encodeURIComponent(redirect)}`;
}

/** 로그인 버튼을 눌렀을 때. 표시를 지우고 무조건 가요 */
export function startLogin(): void {
  writeSession(RETRIED_KEY, null);
  clearToken();
  window.location.assign(loginUrl());
}

/**
 * **계정을 바꿔서** 로그인해요.
 *
 * `prompt=login`이 없으면 토큰을 지워도 **Keycloak 세션이 살아 있어 같은 계정으로
 * 조용히 다시 로그인**돼요 (Hi_yo에서 직원이 겪은 일). 평소 로그인에는 붙이지 않아요.
 */
export function startAccountSwitch(): void {
  writeSession(RETRIED_KEY, null);
  clearToken();
  window.location.assign(`${loginUrl()}&prompt=login`);
}

/**
 * 401을 만났을 때의 자동 재로그인. **한 번만 가요.**
 *
 * 401이 만료 때문만은 아니에요 — 그룹에 없거나 서비스 사용자에 연결되지 않은 계정도 401이고,
 * 그 경우는 다시 로그인해도 계속 401이라 무한히 돌아요.
 *
 * @returns 이동을 시작했으면 `true`. 이미 한 번 갔다 왔으면 `false`.
 */
export function redirectToLoginOnce(): boolean {
  if (readSession(RETRIED_KEY) !== null) return false;

  writeSession(RETRIED_KEY, '1');
  clearToken();
  window.location.assign(loginUrl());
  return true;
}

/** 자동 재로그인을 이미 썼는가. 안내 문구를 가르는 데 써요 */
export function loginRetryUsed(): boolean {
  return readSession(RETRIED_KEY) !== null;
}

/**
 * 콜백 주소의 fragment에서 결과를 꺼내요.
 *
 * **쿼리스트링이 아니라 fragment예요.** fragment는 서버로 가지 않아 접근 로그에 토큰이
 * 남지 않아요. 꺼낸 뒤에는 주소창에서도 지워요 (`AuthCallback`).
 */
export function readCallbackHash(hash: string): { token?: string; error?: string } {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const token = params.get('token');
  const error = params.get('error');
  return {
    ...(token ? { token } : {}),
    ...(error ? { error } : {}),
  };
}
