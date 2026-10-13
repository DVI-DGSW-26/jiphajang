import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '../components/Button.tsx';
import { ApiError, type AuthMe, fetchMe } from '../lib/api.ts';
import {
  clearToken,
  openLoginWindow,
  readLoginMessage,
  setToken,
  startLogin,
} from '../lib/auth.ts';
import { resumeSession, useSessionExpired } from '../lib/session.ts';

type Step =
  | { kind: 'idle' }
  | { kind: 'blocked' }
  | { kind: 'waiting' }
  | { kind: 'checking' }
  | { kind: 'failed'; message: string };

/**
 * 로그인이 끝났을 때 — 화면을 덮고 다시 로그인을 받아요.
 *
 * **이 창은 그대로 두고 팝업에서 로그인해요.** 표에서 고치던 값과 저장을 기다리는 요청이
 * 그대로 남았다가, 다시 로그인하면 이어서 저장돼요 (`lib/session.ts`).
 *
 * 다시 로그인한 사람이 **다른 사람**이면 이어서 저장하지 않고 새로 열어요 —
 * 앞사람이 고치던 값을 뒷사람 이름으로 저장하면 안 돼요.
 */
export function SessionExpiredDialog({ me }: { me: AuthMe }) {
  const expired = useSessionExpired();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const popup = useRef<Window | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const loginRef = useRef<HTMLButtonElement>(null);

  // 창이 뜰 때 초점을 로그인 버튼으로 옮겨요
  useEffect(() => {
    if (!expired) return;
    setStep({ kind: 'idle' });
    loginRef.current?.focus();
  }, [expired]);

  useEffect(() => {
    if (!expired) return;
    const onMessage = async (event: MessageEvent) => {
      const token = readLoginMessage(event, popup.current);
      if (!token) return;
      popup.current = null;
      setStep({ kind: 'checking' });
      setToken(token);
      try {
        const next = await fetchMe();
        if (next.name !== me.name || next.role !== me.role) {
          window.location.reload();
          return;
        }
        resumeSession(token);
      } catch (error) {
        clearToken();
        setStep({
          kind: 'failed',
          message:
            error instanceof ApiError && error.status === 401
              ? '이 계정으로는 들어갈 수 없어요. 처음 쓰던 계정으로 로그인해 주세요.'
              : error instanceof Error && error.message
                ? error.message
                : '서버가 답하지 않아요.',
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [expired, me]);

  if (!expired) return null;

  const login = () => {
    popup.current = openLoginWindow();
    setStep(popup.current ? { kind: 'waiting' } : { kind: 'blocked' });
  };

  const checking = step.kind === 'checking';

  return (
    <div className="jh-dialog-backdrop">
      <div
        className="jh-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className="jh-dialog__title">
          로그인이 끝났어요
        </h2>
        <div id={bodyId} className="jh-dialog__body">
          <p>
            고치던 값은 그대로 있어요. 새 창에서 다시 로그인하면 저장하지 못한 것부터 이어서
            저장해요.
          </p>
          {step.kind === 'waiting' && <p role="status">새 창에서 로그인해 주세요.</p>}
          {checking && <p role="status">로그인한 계정을 확인하고 있어요.</p>}
          {step.kind === 'blocked' && (
            <p role="alert">
              브라우저가 새 창을 막았어요. 주소창 오른쪽에서 팝업을 허용한 뒤 다시 눌러 주세요.
            </p>
          )}
          {step.kind === 'failed' && <p role="alert">{step.message}</p>}
        </div>
        <div className="jh-dialog__actions">
          {/* 팝업을 끝내 못 쓰면 이 창에서 로그인해요. 저장하지 못한 값은 사라져요 */}
          <button type="button" className="jh-button" onClick={startLogin} disabled={checking}>
            이 창에서 로그인
          </button>
          <Button
            ref={loginRef}
            variant="primary"
            onClick={login}
            busy={checking}
            busyLabel="확인 중…"
          >
            {step.kind === 'waiting' ? '새 창 다시 열기' : '다시 로그인하기'}
          </Button>
        </div>
        {(step.kind === 'blocked' || step.kind === 'failed') && (
          <p className="jh-dialog__note">“이 창에서 로그인”은 저장하지 못한 값이 사라져요.</p>
        )}
      </div>
    </div>
  );
}
