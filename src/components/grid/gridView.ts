import type { Sort } from './gridModel.ts';

/**
 * 표 보기 설정 — 정렬, 열 너비, 숨긴 열. 목록마다 이 브라우저에 기억해요(`localStorage`).
 *
 * **필터는 기억하지 않아요.** 다른 기간을 열었을 때 행이 말없이 빠져 있으면 자료가 없는 줄 알아요.
 *
 * 저장한 값은 믿지 않고 읽을 때마다 걸러요 — 열은 물류팀 자료가 오면 바뀌어요.
 * 없어진 열의 설정은 버리고, 모든 열을 숨긴 값이면 숨김을 풀어요.
 * 저장소가 막혀 있으면(사생활 보호 모드 등) 기억하지 않을 뿐 표는 그대로 써요.
 */

export type GridView = {
  sort: Sort;
  /** 사람이 끌어서 바꾼 너비(px)만. 없는 열은 원래 너비예요 */
  widths: Readonly<Record<string, number>>;
  hidden: readonly string[];
};

export const EMPTY_VIEW: GridView = { sort: null, widths: {}, hidden: [] };

export const MIN_WIDTH = 48;
export const MAX_WIDTH = 800;

const PREFIX = 'jh.grid.v1.';

export function clampWidth(width: number): number {
  return Math.round(Math.min(Math.max(width, MIN_WIDTH), MAX_WIDTH));
}

export function isEmptyView(view: GridView): boolean {
  return view.sort === null && Object.keys(view.widths).length === 0 && view.hidden.length === 0;
}

/** 저장한 글자를 읽어요. 모양이 틀리거나 없는 열이면 그 부분만 버려요 */
export function parseGridView(text: string | null, columnKeys: readonly string[]): GridView {
  if (!text) return EMPTY_VIEW;
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return EMPTY_VIEW;
  }
  if (!data || typeof data !== 'object') return EMPTY_VIEW;
  const known = new Set(columnKeys);
  const raw = data as Record<string, unknown>;

  let sort: Sort = null;
  const rawSort = raw.sort as Record<string, unknown> | null | undefined;
  if (
    rawSort &&
    typeof rawSort.key === 'string' &&
    known.has(rawSort.key) &&
    (rawSort.direction === 'asc' || rawSort.direction === 'desc')
  ) {
    sort = { key: rawSort.key, direction: rawSort.direction };
  }

  const widths: Record<string, number> = {};
  if (raw.widths && typeof raw.widths === 'object') {
    for (const [key, value] of Object.entries(raw.widths)) {
      if (known.has(key) && typeof value === 'number' && Number.isFinite(value)) {
        widths[key] = clampWidth(value);
      }
    }
  }

  let hidden = Array.isArray(raw.hidden)
    ? [
        ...new Set(
          raw.hidden.filter((key): key is string => typeof key === 'string' && known.has(key)),
        ),
      ]
    : [];
  if (hidden.length >= known.size) hidden = [];
  if (sort && hidden.includes(sort.key)) sort = null;

  return { sort, widths, hidden };
}

export function readGridView(id: string, columnKeys: readonly string[]): GridView {
  try {
    return parseGridView(localStorage.getItem(PREFIX + id), columnKeys);
  } catch {
    return EMPTY_VIEW;
  }
}

/** 처음 보기와 같으면 지워요 */
export function writeGridView(id: string, view: GridView): void {
  try {
    if (isEmptyView(view)) localStorage.removeItem(PREFIX + id);
    else localStorage.setItem(PREFIX + id, JSON.stringify(view));
  } catch {
    // 막혀 있어요. 이번에만 그대로 써요.
  }
}
