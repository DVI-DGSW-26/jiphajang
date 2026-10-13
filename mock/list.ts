/**
 * 가짜 목록 하나 — 서버와 맞춘 목록 약속(`src/lib/useList.ts`)대로 답해요.
 * 열과 상관없이 모든 목록이 같아요. 목록마다 다른 것은 행, 기간 기준 날짜, 고칠 수 있는 칸뿐이에요.
 */

/** 서버의 `size` 상한 (2026-10-13 서버 합의) */
export const MAX_PAGE_SIZE = 1000;

export type MockListResult<Row> = { row: Row } | { error: string; status: number };

export type MockList = {
  /** `/api` 뒤의 경로 — `/results/export-declarations` */
  path: string;
  list: (params: URLSearchParams) => { items: unknown[]; total: number };
  patch: (id: string, body: unknown) => MockListResult<unknown>;
};

type Options<Row extends { id: string }> = {
  path: string;
  /** 가게 전체 행. 고친 값은 개발 서버를 끄기 전까지 남아요 */
  rows: () => Row[];
  /** 기간으로 거를 날짜 */
  date: (row: Row) => string;
  /** 직접 입력 칸 — 고칠 수 있는 것은 이것뿐이에요 */
  inputs: readonly (keyof Row & string)[];
  /** 칸 값이 틀리면 문구. 맞으면 `null` */
  check?: (key: keyof Row & string, value: string) => string | null;
  /** 고친 뒤 계산 칸을 다시 구해요 */
  derive?: (row: Row) => Row;
};

export function mockList<Row extends { id: string }>({
  path,
  rows,
  date,
  inputs,
  check,
  derive = (row) => row,
}: Options<Row>): MockList {
  return {
    path,
    list(params) {
      const from = params.get('from') ?? '0000-00-00';
      const to = params.get('to') ?? '9999-99-99';
      const page = Math.max(0, Number(params.get('page') ?? 0) || 0);
      const size = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(params.get('size') ?? 500) || 500));
      const matched = rows().filter((row) => date(row) >= from && date(row) <= to);
      return { items: matched.slice(page * size, (page + 1) * size), total: matched.length };
    },
    patch(id, body) {
      const all = rows();
      const index = all.findIndex((row) => row.id === id);
      const current = all[index];
      if (!current) return { status: 404, error: '이 행을 찾지 못했어요. 새로고침해 주세요.' };
      if (!body || typeof body !== 'object') return { status: 400, error: '고칠 값이 없어요.' };

      const next = { ...current };
      for (const [key, value] of Object.entries(body)) {
        if (!(inputs as readonly string[]).includes(key)) {
          return { status: 400, error: `‘${key}’는 고칠 수 없는 칸이에요.` };
        }
        if (value !== null && typeof value !== 'string') {
          return { status: 400, error: '값은 글자나 빈 값이어야 해요.' };
        }
        const problem = value === null ? null : check?.(key as keyof Row & string, value);
        if (problem) return { status: 400, error: problem };
        (next as Record<string, unknown>)[key] = value;
      }
      const saved = derive(next);
      all[index] = saved;
      return { row: saved };
    },
  };
}
