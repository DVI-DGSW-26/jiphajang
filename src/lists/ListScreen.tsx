import { type ReactNode, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { EmptyState } from '../components/EmptyState.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { isPeriod, monthPeriod, type Period, PeriodFilter } from '../components/PeriodFilter.tsx';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatFileDate } from '../lib/format.ts';
import { useList } from '../lib/useList.ts';
import { ListError } from './ListError.tsx';
import { useRowEdit } from './useRowEdit.ts';

/** 주소창의 `?from=&to=`. 없거나 틀리면 이번 달 */
function usePeriod(today: Date): [Period, (period: Period) => void] {
  const [params, setParams] = useSearchParams();
  const from = params.get('from');
  const to = params.get('to');
  const fallback = monthPeriod(today);
  const period = from && to && isPeriod(from, to) ? { from, to } : fallback;
  const setPeriod = useCallback(
    (next: Period) => setParams({ from: next.from, to: next.to }, { replace: true }),
    [setParams],
  );
  return [period, setPeriod];
}

type Props<Row> = {
  me: AuthMe;
  title: string;
  eyebrow?: ReactNode;
  /** `/api` 뒤의 목록 경로 — `/results/export-declarations` */
  path: string;
  columns: GridColumn<Row>[];
  /** 행 id. 고칠 때 `PATCH <경로>/<id>`에 써요 */
  rowKey: (row: Row) => string;
  /** 저장 실패 알림에서 행을 가리킬 글자 — Invoice 번호 등 */
  rowLabel: (row: Row) => string;
  /** 기간이 어느 날짜 기준인지 — “Ship date” */
  basis: string;
  /** 기간에 행이 없을 때 */
  empty: { title: string; description: string; actions?: ReactNode };
};

/**
 * 목록 화면의 틀 — 기간을 골라 그 기간 행을 다 받아 엑셀처럼 보여주고(`useList`),
 * 직접 입력 칸은 보고자만 표에서 바로 고쳐요(`patchListRow`). 결과·원장 목록이 모두 이 틀을 써요.
 * 화면마다 다른 것은 열과 문구뿐이에요.
 */
export function ListScreen<Row>({
  me,
  title,
  eyebrow,
  path,
  columns,
  rowKey,
  rowLabel,
  basis,
  empty,
}: Props<Row>) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = usePeriod(today);
  const { rows, total, state, reload, replaceRow } = useList<Row>(path, period);
  const canEdit = me.role === 'REPORTER';
  const onEdit = useRowEdit({ path, rowKey, rowLabel, replaceRow });

  const loading = state.status === 'loading';
  const hasInputs = columns.some((column) => column.edit);

  return (
    <Page title={title} eyebrow={eyebrow} wide>
      <div className="jh-list-head">
        <PeriodFilter value={period} onChange={setPeriod} basis={basis} today={today} />
        {!canEdit && hasInputs && (
          <p className="jh-list-head__note">열람자는 고를 수 있고 복사만 할 수 있어요.</p>
        )}
      </div>

      {state.status === 'error' ? (
        <ListError title={title} error={state.error} onRetry={reload} />
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
          caption={`${title} ${period.from} ~ ${period.to}`}
          columns={columns}
          rows={rows}
          rowKey={rowKey}
          viewId={path}
          canEdit={canEdit && hasInputs && !loading}
          onEdit={onEdit}
          download={
            loading
              ? null
              : {
                  fileName: `${title}_${formatFileDate(period.from)}-${formatFileDate(period.to)}`,
                  title,
                  description: `기간 ${period.from} ~ ${period.to} (${basis} 기준) · 작성 ${me.name}`,
                }
          }
          toolbar={
            loading && total !== null ? (
              <span className="jh-list-loading" role="status">
                불러오는 중 {rows.length.toLocaleString('en-US')} / {total.toLocaleString('en-US')}
                행
              </span>
            ) : null
          }
        />
      )}
    </Page>
  );
}
