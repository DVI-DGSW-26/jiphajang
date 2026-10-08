import { Link, useParams } from 'react-router';
import { Badge } from '../components/Badge.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Page } from '../layout/Page.tsx';
import { RESULTS } from '../menu.ts';
import { NotFoundPage } from './MenuPages.tsx';

/** 결과 목록 — 결과는 입력 화면이 아니라 출하 원장을 조회·집계한 화면이에요 */
export function ResultsPage() {
  return (
    <Page title="결과">
      <ul className="jh-result-list">
        {RESULTS.map((result) => (
          <li key={result.slug}>
            <Link className="jh-result-card" to={`/results/${result.slug}`}>
              <span className="jh-result-card__badges">
                <Badge tone="kind">{result.kind}</Badge>
                {result.waitingForSource && <Badge tone="wait">자료 받는 중</Badge>}
              </span>
              <span className="jh-result-card__title">{result.title}</span>
              <span className="jh-result-card__summary">{result.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Page>
  );
}

export function ResultPage() {
  const { slug } = useParams();
  const result = RESULTS.find((item) => item.slug === slug);
  if (!result) return <NotFoundPage />;

  return (
    <Page
      title={result.title}
      eyebrow={
        <Link className="jh-back-link" to="/results">
          결과 목록
        </Link>
      }
    >
      {result.waitingForSource ? (
        <EmptyState
          title="계산 기준을 받고 있어요"
          description="물류팀에게 원본 파일과 계산 기준을 받으면 이 결과를 만들어요."
        />
      ) : (
        <EmptyState
          title="아직 보여줄 출하가 없어요"
          description={`${result.summary} Invoice가 출하 원장에 쌓이면 여기에 나와요.`}
        />
      )}
    </Page>
  );
}
