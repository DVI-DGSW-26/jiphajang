/**
 * 메뉴 — 해외 출고 범위(`docs/overseas-plan.md` 3장). 업무 순서대로예요.
 *
 * 결과 목록(`RESULTS`)은 범위 밖이라 메뉴에서 뺐어요. 국내 출고를 시작하면 다시 써요.
 */

export type MenuItem = { path: string; label: string };

export const MENU: MenuItem[] = [
  { path: '/inbound', label: '컨테이너 입고' },
  { path: '/invoices/new', label: '인보이스 작성' },
  { path: '/shipments', label: '출고 확정' },
  { path: '/collections', label: '수금 관리' },
  { path: '/stock', label: '재고 현황' },
  { path: '/master', label: '마스터' },
];

/** 로그인하면 처음 보는 화면 */
export const HOME_PATH = '/invoices/new';

export type ResultItem = {
  slug: string;
  title: string;
  kind: '한국 출하' | '현지 출하';
  summary: string;
  /** 계산 기준을 아직 받지 못한 결과 */
  waitingForSource?: boolean;
};

export const RESULTS: ResultItem[] = [
  {
    slug: 'export-declarations',
    title: '수출신고취합',
    kind: '한국 출하',
    summary: '한국 출하 Invoice를 수출신고번호·BL·선적일·환율과 함께 모아 봐요.',
  },
  {
    slug: 'local-invoice-list',
    title: '현지 출하 Invoice List',
    kind: '현지 출하',
    summary: '현지 창고에서 고객사로 보낸 Invoice를 품번별로 모아 봐요.',
  },
  {
    slug: 'collections',
    title: '현지 수금현황',
    kind: '현지 출하',
    summary: '현지 출하 Invoice의 수금 예정일과 미수를 봐요.',
    waitingForSource: true,
  },
  {
    slug: 'u71x-offset',
    title: 'U71X Offset Cost Review',
    kind: '한국 출하',
    summary: 'U71X 출하분의 Offset Cost와 소급 정산을 봐요.',
    waitingForSource: true,
  },
  {
    slug: 'stock-shipment',
    title: '현지 창고 재고 및 출하 현황',
    kind: '현지 출하',
    summary: '기준일의 창고별 재고·선적중 수량·재고금액과 날짜별 출하를 봐요.',
  },
];
