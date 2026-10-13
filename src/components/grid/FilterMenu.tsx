import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

type Props = {
  header: string;
  /** 다른 열 필터로 걸러진 뒤 남은 값들 */
  labels: string[];
  /** 지금 보여주는 값. `null`이면 거르지 않는 중 */
  selected: ReadonlySet<string> | null;
  sortDirection: 'asc' | 'desc' | null;
  /** 메뉴를 연 버튼. 그 아래에 띄워요 */
  anchor: HTMLElement;
  onSort: (direction: 'asc' | 'desc') => void;
  /** `null`이면 필터를 지워요 */
  onApply: (selected: ReadonlySet<string> | null) => void;
  onClose: () => void;
};

const MENU_WIDTH = 260;

/**
 * 엑셀 자동 필터 메뉴 — 위에 정렬, 아래에 값 목록.
 * 표가 가로로 스크롤되는 상자 안에 있어 잘리지 않게 화면 기준(`fixed`)으로 띄워요.
 */
export function FilterMenu({
  header,
  labels,
  selected,
  sortDirection,
  anchor,
  onSort,
  onApply,
  onClose,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const searchId = useId();
  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(selected ? labels.filter((label) => selected.has(label)) : labels),
  );
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    const rect = anchor.getBoundingClientRect();
    const left = Math.min(rect.left, window.innerWidth - MENU_WIDTH - 8);
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

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query ? labels.filter((label) => label.toLowerCase().includes(query)) : labels;
  }, [labels, search]);

  const allVisibleChecked = visible.length > 0 && visible.every((label) => checked.has(label));

  const toggleAll = () => {
    setChecked((current) => {
      const next = new Set(current);
      for (const label of visible) {
        if (allVisibleChecked) next.delete(label);
        else next.add(label);
      }
      return next;
    });
  };

  const toggle = (label: string) => {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const apply = () => {
    // 검색 중이면 엑셀처럼 검색에 걸린 값 중 체크한 것만 보여줘요
    const chosen = search.trim() ? visible.filter((label) => checked.has(label)) : [...checked];
    onApply(chosen.length === labels.length ? null : new Set(chosen));
  };

  return (
    <div
      ref={menuRef}
      className="jh-filter-menu"
      role="dialog"
      aria-label={`${header} 필터`}
      style={{ top: position.top, left: position.left, width: MENU_WIDTH }}
    >
      <div className="jh-filter-menu__sort">
        <button
          type="button"
          className="jh-filter-menu__item"
          aria-pressed={sortDirection === 'asc'}
          onClick={() => onSort('asc')}
        >
          오름차순 정렬
        </button>
        <button
          type="button"
          className="jh-filter-menu__item"
          aria-pressed={sortDirection === 'desc'}
          onClick={() => onSort('desc')}
        >
          내림차순 정렬
        </button>
      </div>
      <div className="jh-filter-menu__body">
        <label className="jh-visually-hidden" htmlFor={searchId}>
          값 찾기
        </label>
        <input
          id={searchId}
          className="jh-input jh-filter-menu__search"
          placeholder="찾기"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          // biome-ignore lint/a11y/noAutofocus: 메뉴를 열면 바로 값을 찾을 수 있게 해요
          autoFocus
        />
        <div className="jh-filter-menu__list">
          {visible.length === 0 ? (
            <p className="jh-filter-menu__none">맞는 값이 없어요.</p>
          ) : (
            <>
              <label className="jh-filter-menu__check">
                <input type="checkbox" checked={allVisibleChecked} onChange={toggleAll} />
                {search.trim() ? '(찾은 값 모두)' : '(모두 선택)'}
              </label>
              {visible.map((label) => (
                <label key={label} className="jh-filter-menu__check">
                  <input
                    type="checkbox"
                    checked={checked.has(label)}
                    onChange={() => toggle(label)}
                  />
                  {label}
                </label>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="jh-filter-menu__actions">
        {selected && (
          <button type="button" className="jh-button" onClick={() => onApply(null)}>
            필터 지우기
          </button>
        )}
        <button type="button" className="jh-button" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="jh-button jh-button--primary"
          onClick={apply}
          disabled={checked.size === 0}
        >
          확인
        </button>
      </div>
    </div>
  );
}
