import { type ReactNode, useEffect, useId, useRef } from 'react';

type Props = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * 입력 창. 띄울 때만 그려요.
 * Esc로 닫지만 **바깥 클릭으로는 닫지 않아요** — 넣던 값이 날아가지 않게요.
 */
export function FormDialog({ title, onClose, children }: Props) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // 부르는 쪽이 매번 새 함수를 넘겨도, 입력 중에 초점이 옮겨 가지 않게 해요
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first =
      dialogRef.current?.querySelector<HTMLElement>('input, select') ??
      dialogRef.current?.querySelector<HTMLElement>('button');
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, []);

  return (
    <div className="jh-dialog-backdrop">
      <div
        ref={dialogRef}
        className="jh-dialog jh-dialog--form"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="jh-dialog__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
