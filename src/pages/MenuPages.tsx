import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState.tsx';
import { Page } from '../layout/Page.tsx';
import { HOME_PATH } from '../menu.ts';

/*
 * 아직 만들지 않은 메뉴의 첫 화면.
 * **누르면 아무 일도 안 일어나는 버튼은 두지 않아요** — 준비 중이면 그렇게 말해요.
 */

export function ContainersPage() {
  return (
    <Page title="컨테이너 입고">
      <EmptyState
        title="컨테이너 입고는 준비하고 있어요"
        description="현지 창고에 들어온 컨테이너를 등록하면 재고가 늘어요."
      />
    </Page>
  );
}

export function InvoiceNewPage() {
  return (
    <Page title="인보이스 작성">
      <EmptyState
        title="인보이스 작성은 준비하고 있어요"
        description="고객사와 품목을 넣으면 번호와 금액을 계산하고, 출고할 컨테이너를 오래된 순서로 배정해요."
      />
    </Page>
  );
}

export function ShipmentsPage() {
  return (
    <Page title="출고 확정">
      <EmptyState
        title="출고 확정은 준비하고 있어요"
        description="창고에서 BOL을 받아 확정하면 재고가 빠지고 수금 예정이 만들어져요."
      />
    </Page>
  );
}

export function CollectionsPage() {
  return (
    <Page title="수금 관리">
      <EmptyState
        title="수금 관리는 준비하고 있어요"
        description="입금을 확인하면 미수와 지연일을 계산해요."
      />
    </Page>
  );
}

export function StockPage() {
  return (
    <Page title="재고 현황">
      <EmptyState
        title="재고 현황은 준비하고 있어요"
        description="고객사별 재고와 컨테이너별 잔량을 입고와 출고 기록으로 계산해서 보여줘요."
      />
    </Page>
  );
}

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
