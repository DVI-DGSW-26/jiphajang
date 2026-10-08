import type { ReactNode } from 'react';
import { usePageTitle } from './usePageTitle.ts';

type Props = {
  /** 화면 제목. 한 화면에 하나 — 매뉴얼 4장 `title` */
  title: string;
  /** 제목 위의 작은 길잡이 — “결과” */
  eyebrow?: ReactNode;
  /** 제목 오른쪽의 행동. 주 버튼은 하나만 */
  actions?: ReactNode;
  children: ReactNode;
};

/** 화면 하나의 틀. 제목과 탭 제목을 같이 맞춰요 */
export function Page({ title, eyebrow, actions, children }: Props) {
  usePageTitle(title);
  return (
    <main className="jh-main" id="main">
      <div className="jh-page-head">
        <div>
          {eyebrow && <div className="jh-page-head__eyebrow">{eyebrow}</div>}
          <h1 className="jh-title">{title}</h1>
        </div>
        {actions && <div className="jh-page-head__actions">{actions}</div>}
      </div>
      {children}
    </main>
  );
}
