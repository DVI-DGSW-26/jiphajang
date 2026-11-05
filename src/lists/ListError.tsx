import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { ApiError } from '../lib/api.ts';

/** 목록을 못 받았을 때. 404는 서버에 아직 API가 없는 경우예요 */
export function ListError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="서버에 아직 이 목록이 없어요"
        description={`서버 담당이 ${title} API를 만들면 여기에 나와요. 지금은 가짜 서버(npm run dev:mock)로 볼 수 있어요.`}
      />
    );
  }
  return (
    <EmptyState
      title="목록을 불러오지 못했어요"
      description={
        error instanceof Error && error.message ? error.message : '서버가 답하지 않아요.'
      }
      actions={
        <Button variant="primary" onClick={onRetry}>
          다시 불러오기
        </Button>
      }
    />
  );
}
