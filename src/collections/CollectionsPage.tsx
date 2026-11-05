import { useCallback, useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { PeriodFilter, yearPeriod } from '../components/PeriodFilter.tsx';
import { SelectField } from '../components/SelectField.tsx';
import { API } from '../config/api.ts';
import { COLLECTION_STATUS, type CollectionStatus, enumOptions } from '../config/enums.ts';
import { COLLECTION_NOTE, collectionColumns } from '../config/forms/collections.ts';
import { gridColumns } from '../forms/fromConfig.ts';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatFileDate, formatMoney, formatQty } from '../lib/format.ts';
import { useList } from '../lib/useList.ts';
import { useQuery } from '../lib/useQuery.ts';
import { ListError } from '../lists/ListError.tsx';
import { usePeriod } from '../lists/usePeriod.ts';
import { useRowEdit } from '../lists/useRowEdit.ts';
import { CollectionBadge } from '../overseas/StatusBadge.tsx';
import type { CollectionRow, CollectionSummary } from '../overseas/types.ts';
import { useMasterData } from '../overseas/useMasterData.ts';

const rowKey = (row: CollectionRow) => row.id;
const rowLabel = (row: CollectionRow) => row.invoiceNo;
const OVERDUE = 'OVERDUE';
const STATUS_OPTIONS = [...enumOptions(COLLECTION_STATUS), { value: OVERDUE, label: '지연' }];

const delayText = (value: unknown) => (value === null || value === undefined ? '-' : `${value}일`);

const COLUMNS = gridColumns<CollectionRow>(collectionColumns, {
  status: {
    format: (value) => COLLECTION_STATUS[value as CollectionStatus] ?? '',
    render: (row) => <CollectionBadge status={row.status} />,
  },
  delayDays: {
    format: delayText,
    render: (row) =>
      (row.delayDays ?? 0) > 0 ? (
        <strong className="jh-negative">{delayText(row.delayDays)}</strong>
      ) : (
        delayText(row.delayDays)
      ),
  },
});

/** 수금 관리 — 입금을 표에 넣으면 미수와 지연을 다시 계산해요 */
export function CollectionsPage({ me }: { me: AuthMe }) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = usePeriod(today, yearPeriod(today));
  const { rows, state, reload, replaceRow } = useList<CollectionRow>(API.collections, period);
  const summary = useQuery<CollectionSummary>(API.collectionSummary);
  const { customerOptions } = useMasterData();
  const canEdit = me.role === 'REPORTER';

  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('');

  const saveRow = useRowEdit({ path: API.collections, rowKey, rowLabel, replaceRow });
  const { reload: reloadSummary } = summary;
  const onEdit = useCallback(
    async (row: CollectionRow, column: GridColumn<CollectionRow>, value: string | null) => {
      await saveRow(row, column, value);
      reloadSummary();
    },
    [saveRow, reloadSummary],
  );

  const shown = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!customerId || row.customerId === customerId) &&
          (!status || (status === OVERDUE ? row.isOverdue : row.status === status)),
      ),
    [rows, customerId, status],
  );

  const figures = summary.state.data;

  return (
    <Page title="수금 관리" wide>
      <dl className="jh-stats jh-stats--page">
        <div className="jh-stat">
          <dt>미수금 합계</dt>
          <dd>{figures ? formatMoney(figures.outstandingTotal) : '-'}</dd>
        </div>
        <div className="jh-stat">
          <dt>이번 달 수금 예정 금액</dt>
          <dd>{figures ? formatMoney(figures.dueThisMonth) : '-'}</dd>
        </div>
        <div className="jh-stat">
          <dt>지연 건수</dt>
          <dd>{figures ? `${formatQty(figures.overdueCount)}건` : '-'}</dd>
        </div>
      </dl>

      <div className="jh-filters">
        <PeriodFilter value={period} onChange={setPeriod} basis="계획일" today={today} />
        <SelectField
          label="고객사"
          options={customerOptions}
          placeholder="전체"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
        />
        <SelectField
          label="상태"
          options={STATUS_OPTIONS}
          placeholder="전체"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        />
      </div>

      {state.status === 'error' ? (
        <ListError title="수금" error={state.error} onRetry={reload} />
      ) : shown.length === 0 ? (
        state.status === 'loading' ? (
          <p className="jh-list-loading" role="status">
            불러오는 중이에요.
          </p>
        ) : (
          <EmptyState
            title="조건에 맞는 수금이 없어요"
            description="출고를 확정하면 수금 예정이 만들어져요."
          />
        )
      ) : (
        <Grid
          caption={`수금 ${period.from} ~ ${period.to}`}
          columns={COLUMNS}
          rows={shown}
          rowKey={rowKey}
          viewId={API.collections}
          canEdit={canEdit}
          onEdit={onEdit}
          download={{
            fileName: `수금_${formatFileDate(period.from)}-${formatFileDate(period.to)}`,
            title: '수금 관리',
            description: `기간 ${period.from} ~ ${period.to} · 작성 ${me.name}`,
          }}
        />
      )}
      <p className="jh-note">{COLLECTION_NOTE}</p>
    </Page>
  );
}
