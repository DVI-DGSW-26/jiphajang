import { type ReactNode, useEffect, useState } from 'react';
import { ApiError, type AuthMe, fetchMe, nextRefreshDelayMs, refreshToken } from '../lib/api.ts';
import {
  hasToken,
  loginRetryUsed,
  redirectToLoginOnce,
  startAccountSwitch,
  startLogin,
} from '../lib/auth.ts';
import { AuthScreen } from './AuthScreen.tsx';

type MeState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ok'; me: AuthMe };

/**
 * 로그인하지 않았으면 화면을 그리지 않아요.
 *
 * **401에 자동으로 다시 로그인하는 것은 한 번뿐이에요** (`lib/auth.ts`).
 * 그룹에 없거나 서비스 사용자에 연결되지 않은 계정도 401이라, 막지 않으면 무한히 돌아요.
 */
export function AuthGate({ children }: { children: (me: AuthMe) => ReactNode }) {
  const [tokenPresent] = useState(hasToken);
  const [state, setState] = useState<MeState>({ status: 'loading' });
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!tokenPresent) return;
    const controller = new AbortController();
    fetchMe(controller.signal).then(
      (me) => setState({ status: 'ok', me }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error });
      },
    );
    return () => controller.abort();
  }, [tokenPresent]);

  /*
   * 만료 1분 전에 미리 갱신해요. **실패해도 아무 일도 하지 않아요** — 지금 토큰이 죽는
   * 순간 401이 오고 아래 경로가 그때 로그인으로 보내요. 수명은 서버가 준 값을 써요.
   */
  useEffect(() => {
    if (!tokenPresent) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const tick = () => {
      refreshToken().then(
        (expiresIn) => {
          if (!stopped) timer = setTimeout(tick, nextRefreshDelayMs(expiresIn));
        },
        () => {},
      );
    };
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [tokenPresent]);

  const unauthorized =
    state.status === 'error' && state.error instanceof ApiError && state.error.status === 401;

  // 저장소 쓰기와 페이지 이동은 부수효과라 렌더가 아니라 여기서 해요.
  useEffect(() => {
    if (unauthorized && redirectToLoginOnce()) setRedirecting(true);
  }, [unauthorized]);

  if (!tokenPresent) {
    return (
      <AuthScreen title="DVI 계정으로 로그인해 주세요">
        <p>사내 통합 로그인을 써요. 로그인하면 집하장으로 돌아와요.</p>
        <button type="button" className="jh-button jh-button--primary" onClick={startLogin}>
          로그인하기
        </button>
      </AuthScreen>
    );
  }

  // 이동이 시작되기 직전의 렌더도 여기로 와요. 오류 화면을 먼저 깜빡이지 않아요.
  if (redirecting || (unauthorized && !loginRetryUsed())) {
    return (
      <AuthScreen title="다시 로그인하는 중이에요">
        <p>잠시만 기다려 주세요.</p>
      </AuthScreen>
    );
  }

  if (state.status === 'loading') {
    return (
      <AuthScreen title="불러오는 중이에요">
        <p>로그인한 계정을 확인하고 있어요.</p>
      </AuthScreen>
    );
  }

  if (state.status === 'error') {
    return (
      <AuthScreen title="로그인했는데 들어갈 수 없어요">
        {unauthorized ? (
          <p>
            계정이 사내 그룹에 속해 있으면 들어올 수 있어요. 서버 담당에게 Keycloak 아이디를 알려
            주세요.
          </p>
        ) : (
          <p>{state.error instanceof Error ? state.error.message : '서버가 답하지 않아요.'}</p>
        )}
        <div className="jh-auth__actions">
          <button type="button" className="jh-button jh-button--primary" onClick={startLogin}>
            다시 로그인하기
          </button>
          {/* 토큰만 지우면 Keycloak 세션이 같은 계정으로 다시 들여보내요 */}
          {unauthorized && (
            <button type="button" className="jh-button" onClick={startAccountSwitch}>
              다른 계정으로 로그인하기
            </button>
          )}
        </div>
      </AuthScreen>
    );
  }

  return <>{children(state.me)}</>;
}
