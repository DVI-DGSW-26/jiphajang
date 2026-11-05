import { useParams } from 'react-router';
import type { AuthMe } from '../lib/api.ts';
import { NotFoundPage } from '../pages/MenuPages.tsx';
import { CustomersTab } from './CustomersTab.tsx';
import { PartsTab } from './PartsTab.tsx';
import { WarehousesTab } from './WarehousesTab.tsx';

/** 마스터 — 품번 · 고객사 · 창고 탭 */
export function MasterPage({ me }: { me: AuthMe }) {
  const { tab } = useParams();
  if (tab === 'parts') return <PartsTab me={me} />;
  if (tab === 'customers') return <CustomersTab me={me} />;
  if (tab === 'warehouses') return <WarehousesTab me={me} />;
  return <NotFoundPage />;
}
