import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState.tsx';
import { Page } from '../layout/Page.tsx';
import { HOME_PATH } from '../menu.ts';

export function NotFoundPage() {
  return (
    <Page title="화면을 찾지 못했어요">
      <EmptyState
        title="이 주소에는 화면이 없어요"
        description="주소가 바뀌었거나 잘못 들어왔어요. 위 메뉴에서 가려는 화면을 골라 주세요."
        actions={
          <Link className="jh-button jh-button--primary" to={HOME_PATH}>
            인보이스 작성으로 가기
          </Link>
        }
      />
    </Page>
  );
}
