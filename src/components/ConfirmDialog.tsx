import { type ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from './Button.tsx';

type Props = {
  open: boolean;
  /** “Invoice를 삭제할까요?” */
  title: string;
  /** 무엇이 어떻게 되는지 — “MC261005A가 출하 원장에서 사라지고 되돌릴 수 없어요.” */
  children: ReactNode;
  /** 오른쪽 버튼 글자. 일어날 일을 써요 — “삭제하기” */
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
};

/**
 * 확인창 — 디자인 매뉴얼 7장. **되돌릴 수 없는 일에만** 띄워요.
 * 왼쪽은 항상 “닫기”예요(“취소” 말고). 처음 초점도 “닫기”에 둬서 엔터 한 번에 지워지지 않게 해요.
 * Esc와 바깥 클릭은 닫기와 같아요.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
}: Props) {
  const titleId = useId();
  const bodyId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: 바깥 클릭으로 닫기. 키보드는 Esc로 닫아요
    // biome-ignore lint/a11y/useKeyWithClickEvents: 위와 같아요
    <div
      className="jh-dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="jh-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
      >
        <h2 id={titleId} className="jh-dialog__title">
          {title}
        </h2>
        <p id={bodyId} className="jh-dialog__body">
          {children}
        </p>
        <div className="jh-dialog__actions">
          <button
            ref={closeRef}
            type="button"
            className="jh-button"
            onClick={onClose}
            disabled={busy}
          >
            닫기
          </button>
          <Button variant="danger-fill" onClick={onConfirm} busy={busy} busyLabel="처리 중…">
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
