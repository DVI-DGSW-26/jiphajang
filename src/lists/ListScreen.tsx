import { type ReactNode, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { isPeriod, monthPeriod, type Period, PeriodFilter } from '../components/PeriodFilter.tsx';
import { useToast } from '../components/Toast.tsx';
import { Page } from '../layout/Page.tsx';
import { ApiError, type AuthMe } from '../lib/api.ts';
import { formatFileDate } from '../lib/format.ts';
import { patchListRow, useList } from '../lib/useList.ts';

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
  const toast = useToast();
  const canEdit = me.role === 'REPORTER';

  const onEdit = useCallback(
    async (row: Row, column: GridColumn<Row>, value: string | null) => {
      const id = rowKey(row);
      const same = (item: Row) => rowKey(item) === id;
      // 엑셀처럼 바로 바꿔 보여주고, 서버가 계산 칸까지 채운 행으로 다시 바꿔요
      replaceRow(same, { ...row, [column.key]: value });
      try {
        replaceRow(same, await patchListRow<Row>(path, id, { [column.key]: value }));
      } catch (error) {
        replaceRow(same, row);
        const reason = error instanceof Error ? error.message : '';
        toast(`${rowLabel(row)}의 ${column.header}을 저장하지 못했어요. ${reason}`.trim(), 'bad');
        throw error;
      }
    },
    [path, rowKey, rowLabel, replaceRow, toast],
  );

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

function ListError({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: unknown;
  onRetry: () => void;
}) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="서버에 아직 이 목록이 없어요"
        description={`서버 담당이 ${title} API를 만들면 여기에 나와요. 지금은 가짜 서버(npm run dev:mock)로 볼 수 있어요.`}
      />
    );
  }
  return (
    <EmptyState
      title="목록을 불러오지 못했어요"
      description={
        error instanceof Error && error.message ? error.message : '서버가 답하지 않아요.'
      }
      actions={
        <Button variant="primary" onClick={onRetry}>
          다시 불러오기
        </Button>
      }
    />
  );
}
