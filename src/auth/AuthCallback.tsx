import { useEffect, useState } from 'react';
import { readCallbackHash, sendLoginToOpener, setToken, startLogin } from '../lib/auth.ts';
import { AuthScreen } from './AuthScreen.tsx';

/**
 * 로그인 뒤 서버가 돌려보내는 자리 — `<화면>/auth/callback#token=<JWT>`.
 *
 * 꺼낸 토큰은 주소창에서 바로 지워요. 그대로 두면 새로고침·뒤로 가기·화면 공유에
 * 토큰이 따라다녀요.
 *
 * 로그인이 끝나 **팝업에서 다시 로그인한 경우**에는 토큰을 여는 창에 건네고 닫혀요
 * (`SessionExpiredDialog`).
 */
export function AuthCallback() {
  // 아래에서 주소창을 지우므로 주소는 한 번만 읽어요.
  const [result] = useState(() => readCallbackHash(window.location.hash));
  const [handedOver, setHandedOver] = useState(false);

  useEffect(() => {
    if (result.token && sendLoginToOpener(result.token)) {
      window.history.replaceState(null, '', window.location.pathname);
      setHandedOver(true);
      window.close();
    } else if (result.token) {
      setToken(result.token);
      window.location.replace('/');
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [result]);

  if (handedOver) {
    return (
      <AuthScreen title="다시 로그인했어요">
        <p>이 창은 닫아도 돼요. 하던 창에서 이어서 하면 돼요.</p>
      </AuthScreen>
    );
  }

  if (result.token) {
    return (
      <AuthScreen title="로그인하는 중이에요">
        <p>잠시만 기다려 주세요.</p>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen title="로그인하지 못했어요">
      {/* 서버가 준 이유를 그대로 보여줘요. 화면에서 문구를 지어내지 않아요. */}
      <p>{result.error ?? '로그인 결과를 받지 못했어요. 다시 로그인해 주세요.'}</p>
      <button type="button" className="jh-button jh-button--primary" onClick={startLogin}>
        다시 로그인하기
      </button>
    </AuthScreen>
  );
}
