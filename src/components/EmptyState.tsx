import type { ReactNode } from 'react';

type Props = {
  /** 지금 상황 — “아직 올린 Invoice가 없어요” */
  title: string;
  /** 무엇을 하면 되는지 */
  description?: ReactNode;
  /** 다음 행동 버튼. 주 버튼은 하나만 */
  actions?: ReactNode;
};

/** 빈 화면 — 디자인 매뉴얼 7장. 빈 표 대신 지금 상황과 다음 행동을 알려줘요 */
export function EmptyState({ title, description, actions }: Props) {
  return (
    <section className="jh-empty">
      <svg className="jh-empty__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </svg>
      <h2 className="jh-empty__title">{title}</h2>
      {description && <p className="jh-empty__body">{description}</p>}
      {actions && <div className="jh-empty__actions">{actions}</div>}
    </section>
  );
}
