import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';

type Tone = 'ok' | 'bad';
type ToastItem = { id: number; message: string; tone: Tone };

/** 알림이 떠 있는 시간. 매뉴얼은 2~4초 */
export const TOAST_MS = 3000;

const ToastContext = createContext<((message: string, tone?: Tone) => void) | null>(null);

/**
 * 알림(토스트) — 디자인 매뉴얼 7장. 화면 아래 가운데, 3초, **한 번에 하나만**.
 * 새 알림이 오면 이전 알림을 바로 바꿔요. 사과 문구는 쓰지 않아요.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);

  const show = useCallback((message: string, tone: Tone = 'ok') => {
    setToast((current) => ({ id: (current?.id ?? 0) + 1, message, tone }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* 읽기 프로그램이 알림을 읽도록 영역은 늘 두고, 내용만 바꿔요 */}
      <div className="jh-toast-region" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`jh-toast${toast.tone === 'bad' ? ' jh-toast--bad' : ''}`}>
            {toast.message}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/** `const toast = useToast(); toast('엑셀 파일을 저장했어요.')` */
export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast는 ToastProvider 안에서만 써요.');
  return show;
}
