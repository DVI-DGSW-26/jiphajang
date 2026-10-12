import { type ReactNode, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../components/Button.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { parseDate, parseDecimal, parseText } from '../components/grid/parsers.ts';
import { isPeriod, monthPeriod, type Period, PeriodFilter } from '../components/PeriodFilter.tsx';
import { useToast } from '../components/Toast.tsx';
import { Page } from '../layout/Page.tsx';
import { ApiError, type AuthMe, apiFetch } from '../lib/api.ts';
import { sumDecimal } from '../lib/decimal.ts';
import {
  formatDate,
  formatKrw,
  formatQty,
  formatRate,
  formatUnitPrice,
  formatUsd,
} from '../lib/format.ts';
import { useList } from '../lib/useList.ts';
import {
  EXPORT_DECLARATIONS_PATH,
  type ExportDeclarationInput,
  type ExportDeclarationRow,
} from './exportDeclarations.ts';

type Row = ExportDeclarationRow;

const sumOf = (rows: Row[], pick: (row: Row) => string | number | null) =>
  sumDecimal(rows.map(pick));

/** 열 — `docs/source-analysis.md` 3.3. 출처가 있는 열은 자동 칸이라 고칠 수 없어요 */
const COLUMNS: GridColumn<Row>[] = [
  { key: 'no', header: 'No', numeric: true, source: 'calc', value: (r) => r.no, width: 64 },
  {
    key: 'shipDate',
    header: 'Ship date',
    source: 'read',
    value: (r) => r.shipDate,
    format: (v) => formatDate(v as string),
  },
  { key: 'invoiceNo', header: 'Invoice', source: 'calc', value: (r) => r.invoiceNo },
  { key: 'customer', header: '고객사', source: 'master', value: (r) => r.customer },
  {
    key: 'declarationNo',
    header: '필증#',
    value: (r) => r.declarationNo,
    edit: { parse: parseText },
    width: 150,
  },
  { key: 'blNo', header: 'BL#', value: (r) => r.blNo, edit: { parse: parseText }, width: 120 },
  {
    key: 'shippedOn',
    header: '선적일자',
    value: (r) => r.shippedOn,
    format: (v) => formatDate(v as string | null),
    edit: { parse: parseDate },
    width: 120,
  },
  { key: 'itemName', header: '품명', source: 'read', value: (r) => r.itemName },
  {
    key: 'unitPrice',
    header: '단가 (USD)',
    numeric: true,
    source: 'read',
    value: (r) => r.unitPrice,
    format: formatUnitPrice,
  },
  {
    key: 'setQty',
    header: 'Set QTY',
    numeric: true,
    source: 'master',
    value: (r) => r.setQty,
    format: formatQty,
  },
  {
    key: 'boxQty',
    header: 'Box QTY',
    numeric: true,
    source: 'read',
    value: (r) => r.boxQty,
    format: formatQty,
    total: (rows) => formatQty(sumOf(rows, (r) => r.boxQty)),
  },
  {
    key: 'totalQty',
    header: 'Total QTY',
    numeric: true,
    source: 'calc',
    value: (r) => r.totalQty,
    format: formatQty,
    total: (rows) => formatQty(sumOf(rows, (r) => r.totalQty)),
  },
  {
    key: 'amountUsd',
    header: '금액 (USD)',
    numeric: true,
    source: 'calc',
    value: (r) => r.amountUsd,
    format: formatUsd,
    total: (rows) => formatUsd(sumOf(rows, (r) => r.amountUsd)),
  },
  {
    key: 'exchangeRate',
    header: '환율',
    numeric: true,
    value: (r) => r.exchangeRate,
    format: formatRate,
    edit: { parse: parseDecimal },
    width: 110,
  },
  {
    key: 'amountKrw',
    header: '금액 (KRW)',
    numeric: true,
    source: 'calc',
    value: (r) => r.amountKrw,
    format: formatKrw,
    total: (rows) => formatKrw(sumOf(rows, (r) => r.amountKrw)),
  },
];

const rowKey = (row: Row) => row.id;

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

/**
 * 수출신고취합 — 한국 출하를 기간으로 모아 보고, 필증#·BL#·선적일자·환율을 표에서 바로 넣어요.
 * 목록 화면의 틀이에요. 다른 결과·원장 화면도 이 모양을 따라요.
 */
export function ExportDeclarationsPage({ me, eyebrow }: { me: AuthMe; eyebrow: ReactNode }) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = usePeriod(today);
  const { rows, total, state, reload, replaceRow } = useList<Row>(EXPORT_DECLARATIONS_PATH, period);
  const toast = useToast();
  const canEdit = me.role === 'REPORTER';

  const onEdit = useCallback(
    async (row: Row, column: GridColumn<Row>, value: string | null) => {
      const key = column.key as ExportDeclarationInput;
      const same = (item: Row) => item.id === row.id;
      // 엑셀처럼 바로 바꿔 보여주고, 서버가 계산 칸까지 채운 행으로 다시 바꿔요
      replaceRow(same, { ...row, [key]: value });
      try {
        const saved = await apiFetch<Row>(
          `${EXPORT_DECLARATIONS_PATH}/${encodeURIComponent(row.id)}`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [key]: value }),
          },
        );
        replaceRow(same, saved);
      } catch (error) {
        replaceRow(same, row);
        const reason = error instanceof Error ? error.message : '';
        toast(`${row.invoiceNo}의 ${column.header}을 저장하지 못했어요. ${reason}`.trim(), 'bad');
        throw error;
      }
    },
    [replaceRow, toast],
  );

  const loading = state.status === 'loading';

  return (
    <Page title="수출신고취합" eyebrow={eyebrow} wide>
      <div className="jh-list-head">
        <PeriodFilter value={period} onChange={setPeriod} basis="Ship date" today={today} />
        {!canEdit && (
          <p className="jh-list-head__note">열람자는 고를 수 있고 복사만 할 수 있어요.</p>
        )}
      </div>

      {state.status === 'error' ? (
        <ListError error={state.error} onRetry={reload} />
      ) : rows.length === 0 ? (
        loading ? (
          <p className="jh-list-loading" role="status">
            불러오는 중이에요.
          </p>
        ) : (
          <EmptyState
            title="이 기간에는 한국 출하가 없어요"
            description="위에서 기간을 바꿔 보세요. Invoice를 올리면 여기에 쌓여요."
            actions={
              <Link className="jh-button" to="/invoices">
                Invoice로 가기
              </Link>
            }
          />
        )
      ) : (
        <Grid
          caption={`수출신고취합 ${period.from} ~ ${period.to}`}
          columns={COLUMNS}
          rows={rows}
          rowKey={rowKey}
          canEdit={canEdit && !loading}
          onEdit={onEdit}
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

function ListError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        title="서버에 아직 이 목록이 없어요"
        description="서버 담당이 수출신고취합 API를 만들면 여기에 나와요. 지금은 가짜 서버(npm run dev:mock)로 볼 수 있어요."
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
