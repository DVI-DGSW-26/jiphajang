import { Navigate, Route, Routes } from 'react-router';
import { TopBar } from './layout/TopBar.tsx';
import type { AuthMe } from './lib/api.ts';
import { MasterPage } from './master/MasterPage.tsx';
import { HOME_PATH } from './menu.ts';
import {
  CollectionsPage,
  ContainersPage,
  InvoiceNewPage,
  NotFoundPage,
  ShipmentsPage,
  StockPage,
} from './pages/MenuPages.tsx';

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
        <Route path="containers" element={<ContainersPage />} />
        <Route path="invoices" element={<Navigate to="/invoices/new" replace />} />
        <Route path="invoices/new" element={<InvoiceNewPage />} />
        <Route path="shipments" element={<ShipmentsPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="master" element={<Navigate to="/master/parts" replace />} />
        <Route path="master/:tab" element={<MasterPage me={me} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
