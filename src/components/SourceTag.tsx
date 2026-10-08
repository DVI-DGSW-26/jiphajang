/**
 * 값의 출처 — 디자인 매뉴얼 8장.
 * 판독(Invoice에서 읽음) · 계산 · 마스터는 미색 칸에 이 표시를 붙이고, 직접 입력은 흰 칸으로 둬요.
 */
export type Source = 'read' | 'calc' | 'master';

export const SOURCE_LABEL: Record<Source, string> = {
  read: '판독',
  calc: '계산',
  master: '마스터',
};

const SOURCE_TITLE: Record<Source, string> = {
  read: 'Invoice에서 읽은 값',
  calc: '다른 값으로 계산한 값',
  master: '마스터에서 가져온 값',
};

export function SourceTag({ source }: { source: Source }) {
  return (
    <span className="jh-source" title={SOURCE_TITLE[source]}>
      {SOURCE_LABEL[source]}
    </span>
  );
}
