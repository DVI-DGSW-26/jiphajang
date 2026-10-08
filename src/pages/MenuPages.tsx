import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState.tsx';
import { Page } from '../layout/Page.tsx';
import { HOME_PATH } from '../menu.ts';

/*
 * 메뉴별 첫 화면. 아직 서버와 데이터가 없어 빈 화면만 있어요.
 * **누르면 아무 일도 안 일어나는 버튼은 두지 않아요** — 준비 중이면 그렇게 말해요.
 */

export function InvoicesPage() {
  return (
    <Page title="Invoice">
      <EmptyState
        title="아직 올린 Invoice가 없어요"
        description="한국 출하·현지 출하 Invoice 엑셀을 올리면 읽어서 출하 원장에 넣어요. Invoice 올리기는 준비하고 있어요."
      />
    </Page>
  );
}

export function LedgerPage() {
  return (
    <Page title="출하 원장">
      <EmptyState
        title="출하 원장이 비어 있어요"
        description="Invoice를 올리면 한국 선적과 현지 출하가 여기에 쌓여요."
        actions={
          <Link className="jh-button" to="/invoices">
            Invoice로 가기
          </Link>
        }
      />
    </Page>
  );
}

export function StockPage() {
  return (
    <Page title="재고·선적">
      <EmptyState
        title="재고·선적 기록이 없어요"
        description="한국에서 실은 수량과 현지 출하 수량으로 창고별 재고와 선적중 수량을 보여줘요. 지금은 준비하고 있어요."
      />
    </Page>
  );
}

export function MasterPage() {
  return (
    <Page title="마스터">
      <EmptyState
        title="등록한 마스터가 없어요"
        description="고객사, 코드표, 품번, 단가, 창고, 포워더를 여기서 관리해요. 지금은 준비하고 있어요."
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
            출하 원장으로 가기
          </Link>
        }
      />
    </Page>
  );
}
