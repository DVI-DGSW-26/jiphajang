import type { ReactNode } from 'react';

/**
 * 배지 — 디자인 매뉴얼 9장.
 * - `ok`: 정상, 수금, 도착, 읽음
 * - `bad`: 부족, 미수, 오류, 확인 필요
 * - `wait`: 선적중, 도착 예정, 진행 중
 * - `note`: 예시, 참고, 마스터
 * - `kind`: 종류 구분(한국 출하 · 현지 출하)에만
 *
 * 색만으로 구분하지 않아요 — 글자를 꼭 넣어요.
 */
export type BadgeTone = 'ok' | 'bad' | 'wait' | 'note' | 'kind';

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return <span className={`jh-badge jh-badge--${tone}`}>{children}</span>;
}
