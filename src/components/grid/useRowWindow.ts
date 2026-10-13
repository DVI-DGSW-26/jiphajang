import { type RefObject, useCallback, useLayoutEffect, useState } from 'react';

/**
 * 보이는 행만 그리기 — 행이 몇천 개여도 화면에 보이는 행과 위아래 조금만 그려요.
 * 나머지는 빈 줄 높이로 자리만 잡아서 스크롤바는 전체 길이 그대로예요.
 * 행 높이는 모두 같다고 봐요(표 칸은 한 줄이에요).
 */

/** 위아래로 더 그려 둘 행 수. 빨리 스크롤해도 빈 곳이 덜 보여요 */
const OVERSCAN = 12;
/** 아직 재지 못했을 때(시험 환경 등) 쓰는 값 */
const FALLBACK_ROW_HEIGHT = 33;
const FALLBACK_VIEWPORT = 900;

export type RowWindow = { start: number; end: number };

/** 그릴 행 범위 `[start, end)` */
export function rowWindow(
  scrollTop: number,
  viewport: number,
  rowHeight: number,
  count: number,
  overscan = OVERSCAN,
): RowWindow {
  const height = rowHeight > 0 ? rowHeight : FALLBACK_ROW_HEIGHT;
  const visible = viewport > 0 ? viewport : FALLBACK_VIEWPORT;
  const start = Math.max(0, Math.floor(scrollTop / height) - overscan);
  const end = Math.min(count, Math.ceil((scrollTop + visible) / height) + overscan);
  return { start: Math.min(start, end), end };
}

/**
 * 스크롤 상자(`wrapRef`)를 보고 그릴 행 범위를 정해요.
 * `scrollToRow`는 그 행이 머리줄·합계줄에 가리지 않게 상자를 스크롤해요.
 */
export function useRowWindow(
  wrapRef: RefObject<HTMLElement | null>,
  bodyRef: RefObject<HTMLElement | null>,
  count: number,
) {
  const [scroll, setScroll] = useState({ top: 0, viewport: 0 });
  const [rowHeight, setRowHeight] = useState(FALLBACK_ROW_HEIGHT);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    setScroll((current) =>
      current.top === wrap.scrollTop && current.viewport === wrap.clientHeight
        ? current
        : { top: wrap.scrollTop, viewport: wrap.clientHeight },
    );
  }, [wrapRef]);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    measure();
    wrap.addEventListener('scroll', measure, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(wrap);
    return () => {
      wrap.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [wrapRef, measure]);

  // 실제 행 높이를 한 번 재요. 글꼴에 따라 1~2px 달라질 수 있어요
  useLayoutEffect(() => {
    const row = bodyRef.current?.querySelector<HTMLElement>('tr[aria-rowindex]');
    const height = row?.getBoundingClientRect().height ?? 0;
    if (height > 0 && Math.abs(height - rowHeight) > 0.5) setRowHeight(height);
  });

  const visible = rowWindow(scroll.top, scroll.viewport, rowHeight, count);

  const scrollToRow = useCallback(
    (index: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const table = wrap.querySelector('table');
      const head = table?.tHead?.getBoundingClientRect().height ?? 0;
      const foot = table?.tFoot?.getBoundingClientRect().height ?? 0;
      const top = index * rowHeight;
      const bottom = top + rowHeight;
      if (top < wrap.scrollTop) wrap.scrollTop = top;
      else if (bottom > wrap.scrollTop + wrap.clientHeight - head - foot) {
        wrap.scrollTop = bottom - wrap.clientHeight + head + foot;
      }
      // 스크롤 이벤트는 다음 그리기 때 와요. 기다리지 않고 바로 그릴 행을 다시 정해요
      measure();
    },
    [wrapRef, rowHeight, measure],
  );

  return { visible, rowHeight, scrollToRow };
}
