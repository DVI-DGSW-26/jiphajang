import { Navigate, Route, Routes } from 'react-router';
import { TopBar } from './layout/TopBar.tsx';
import type { AuthMe } from './lib/api.ts';
import { HOME_PATH } from './menu.ts';
import {
  InvoicesPage,
  LedgerPage,
  MasterPage,
  NotFoundPage,
  StockPage,
} from './pages/MenuPages.tsx';
import { ResultPage, ResultsPage } from './pages/ResultPages.tsx';

/** 로그인한 뒤의 앱. 상단 바 아래에 메뉴별 화면을 그려요 */
export function App({ me }: { me: AuthMe }) {
  return (
    <>
      <a className="jh-skip-link" href="#main">
        본문으로 건너뛰기
      </a>
      <TopBar me={me} />
      <Routes>
        <Route index element={<Navigate to={HOME_PATH} replace />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="results/:slug" element={<ResultPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="master" element={<MasterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
