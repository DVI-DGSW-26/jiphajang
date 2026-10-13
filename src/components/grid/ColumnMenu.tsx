import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Props = {
  columns: readonly { key: string; header: string }[];
  hidden: ReadonlySet<string>;
  /** 메뉴를 연 버튼. 그 아래 오른쪽에 맞춰 띄워요 */
  anchor: HTMLElement;
  onToggle: (key: string) => void;
  /** 너비·숨김·정렬을 처음으로. 바꾼 게 없으면 `null` */
  onReset: (() => void) | null;
  onClose: () => void;
};

const MENU_WIDTH = 240;

/**
 * 열 보기 메뉴 — 열을 숨기고 다시 보여요. 바꾼 것은 이 브라우저에 기억해요(`gridView.ts`).
 * 너비는 머리줄 오른쪽 끝을 끌어서 바꾸고, 두 번 누르면 원래대로예요.
 */
export function ColumnMenu({ columns, hidden, anchor, onToggle, onReset, onClose }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const shown = columns.length - hidden.size;

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const left = Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8);
    setPosition({ top: rect.bottom + 4, left: Math.max(8, left) });
  }, [anchor]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !anchor.contains(target)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        anchor.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [anchor, onClose]);

  return (
    <div
      ref={menuRef}
      className="jh-filter-menu"
      role="dialog"
      aria-label="열 보기"
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
    >
      <div className="jh-filter-menu__body">
        <div className="jh-filter-menu__list jh-filter-menu__list--tall">
          {columns.map((column) => {
            const visible = !hidden.has(column.key);
            return (
              <label key={column.key} className="jh-filter-menu__check">
                <input
                  type="checkbox"
                  checked={visible}
                  // 한 열은 남겨요
                  disabled={visible && shown === 1}
                  onChange={() => onToggle(column.key)}
                />
                {column.header}
              </label>
            );
          })}
        </div>
        <p className="jh-filter-menu__hint">
          너비는 머리줄 오른쪽 끝을 끌어요. 두 번 누르면 원래대로.
        </p>
      </div>
      <div className="jh-filter-menu__actions">
        {onReset && (
          <button type="button" className="jh-button" onClick={onReset}>
            처음 보기로
          </button>
        )}
        <button type="button" className="jh-button" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
