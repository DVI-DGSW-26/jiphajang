import { type ReactNode, useState } from 'react';
import { NavLink } from 'react-router';
import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatFileDate } from '../lib/format.ts';
import type { useList } from '../lib/useList.ts';
import { ListError } from '../lists/ListError.tsx';
import { useRowEdit } from '../lists/useRowEdit.ts';

const TABS = [
  { path: '/master/parts', label: '품번' },
  { path: '/master/customers', label: '고객사' },
  { path: '/master/warehouses', label: '창고' },
];

type Props<Row> = {
  me: AuthMe;
  /** 탭 이름 — “품번” */
  title: string;
  path: string;
  list: ReturnType<typeof useList<Row>>;
  columns: GridColumn<Row>[];
  rowKey: (row: Row) => string;
  rowLabel: (row: Row) => string;
  /** 추가 단추 글자 — “품번 추가” */
  addLabel: string;
  renderAdd: (close: () => void) => ReactNode;
  empty: { title: string; description: string };
};

/** 마스터 탭 하나 — 기간 없이 전체를 받아요. 보고자만 칸을 고치고 추가해요 */
export function MasterList<Row>({
  me,
  title,
  path,
  list,
  columns,
  rowKey,
  rowLabel,
  addLabel,
  renderAdd,
  empty,
}: Props<Row>) {
  const [adding, setAdding] = useState(false);
  const canEdit = me.role === 'REPORTER';
  const { rows, state, reload, replaceRow } = list;
  const onEdit = useRowEdit({ path, rowKey, rowLabel, replaceRow });
  const loading = state.status === 'loading';
  const name = `마스터_${title}`;

  return (
    <Page
      title="마스터"
      wide
      actions={
        canEdit ? (
          <Button variant="primary" onClick={() => setAdding(true)}>
            {addLabel}
          </Button>
        ) : undefined
      }
    >
      <nav className="jh-tabs" aria-label="마스터 종류">
        {TABS.map((tab) => (
          <NavLink key={tab.path} to={tab.path} className="jh-tabs__link">
            {tab.label}
          </NavLink>
        ))}
      </nav>

      {state.status === 'error' ? (
        <ListError title={`${title} 마스터`} error={state.error} onRetry={reload} />
      ) : rows.length === 0 ? (
        loading ? (
          <p className="jh-list-loading" role="status">
            불러오는 중이에요.
          </p>
        ) : (
          <EmptyState {...empty} />
        )
      ) : (
        <Grid
          caption={`${title} 마스터`}
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          viewId={path}
          canEdit={canEdit && !loading}
          onEdit={onEdit}
          download={
            loading
              ? null
              : {
                  fileName: `${name}_${formatFileDate(new Date())}`,
                  title: name,
                  description: `작성 ${me.name}`,
                }
          }
        />
      )}

      {adding && renderAdd(() => setAdding(false))}
    </Page>
  );
}
