import { useEffect } from 'react';

/** 브라우저 탭 제목 — `출하 원장 · 집하장`. 화면 제목(h1)과 같은 말을 써요 */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · 집하장`;
  }, [title]);
}
