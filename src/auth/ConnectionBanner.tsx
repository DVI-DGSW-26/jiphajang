import { useEffect } from 'react';
import { Button } from '../components/Button.tsx';
import { tryAgainNow, useConnection } from '../lib/connection.ts';

/**
 * 연결이 끊겼을 때 화면 아래에 떠요. 화면은 막지 않아요 — 계속 보고 고칠 수 있고,
 * 고친 값은 연결되면 순서대로 저장돼요 (`lib/connection.ts`).
 *
 * 기다리는 저장이 있는 동안 창을 닫거나 새로고침하면 브라우저가 한 번 물어요.
 */
export function ConnectionBanner() {
  const { offline, waiting } = useConnection();

  useEffect(() => {
    if (!offline || waiting === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [offline, waiting]);

  if (!offline) return null;

  return (
    <div className="jh-connection" role="status">
      <p className="jh-connection__text">
        <strong>연결이 끊겼어요.</strong> 다시 연결되면 이어서 저장하고 불러와요.
        {waiting > 0 && ` 기다리는 요청 ${waiting}개`}
      </p>
      <Button onClick={tryAgainNow}>지금 다시 시도</Button>
    </div>
  );
}
