import { useMemo, useState } from 'react';
import { EmptyState } from '../components/EmptyState.tsx';
import { Field } from '../components/Field.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import { SelectField } from '../components/SelectField.tsx';
import { API } from '../config/api.ts';
import { FIFO_NOTE, stockColumns, stockLotColumns } from '../config/forms/stock.ts';
import { formatCell, gridColumns } from '../forms/fromConfig.ts';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatFileDate, formatMoney, formatQty } from '../lib/format.ts';
import type { ListPage } from '../lib/useList.ts';
import { useQuery } from '../lib/useQuery.ts';
import { ListError } from '../lists/ListError.tsx';
import { sumMoney, today } from '../overseas/calc.ts';
import type { StockLotRow, StockRow } from '../overseas/types.ts';
import { useMasterData } from '../overseas/useMasterData.ts';
import { type DisplayRow, isPlain, type QTY_KEYS, withSubtotals } from './subtotals.ts';

const sumQty = (rows: DisplayRow[], key: (typeof QTY_KEYS)[number]) =>
  formatQty(rows.filter(isPlain).reduce((sum, row) => sum + row[key], 0));

const strongWhenSubtotal = (key: keyof StockRow, type: Parameters<typeof formatCell>[0]) => ({
  render: (row: DisplayRow) => {
    const text = formatCell(type, row[key]);
    return row.subtotal ? <strong>{text}</strong> : text;
  },
});

const STOCK_COLUMNS = gridColumns<DisplayRow>(stockColumns, {
  partNo: strongWhenSubtotal('partNo', 'text'),
  onHandQty: { ...strongWhenSubtotal('onHandQty', 'number'), total: (r) => sumQty(r, 'onHandQty') },
  reservedQty: {
    ...strongWhenSubtotal('reservedQty', 'number'),
    total: (r) => sumQty(r, 'reservedQty'),
  },
  inTransitQty: {
    ...strongWhenSubtotal('inTransitQty', 'number'),
    total: (r) => sumQty(r, 'inTransitQty'),
  },
  stockAmount: {
    ...strongWhenSubtotal('stockAmount', 'money'),
    total: (rows) => formatMoney(sumMoney(rows.filter(isPlain).map((row) => row.stockAmount))),
  },
});

const LOT_COLUMNS = gridColumns<StockLotRow>(stockLotColumns, {
  fifoOrder: { format: (value) => (value === null || value === undefined ? '-' : String(value)) },
  receivedDate: {
    format: (value) => (value === null || value === undefined ? '선적 중' : String(value)),
  },
});

const stockRowKey = (row: DisplayRow) => row.id;
const lotRowKey = (row: StockLotRow) => row.id;

function withQuery(path: string, values: Record<string, string>): string {
  const query = new URLSearchParams(Object.entries(values).filter(([, value]) => value !== ''));
  return `${path}?${query}`;
}

/** 재고 현황 — 입고와 출고 기록으로 계산한 값만 보여줘요. 여기서는 고치지 않아요 */
export function StockPage({ me }: { me: AuthMe }) {
  const { warehouseOptions, partOptions } = useMasterData();
  const [warehouseId, setWarehouseId] = useState('');
  const [asOf, setAsOf] = useState(() => today());
  const [partId, setPartId] = useState('');
  // 품번을 고르기 전에는 첫 품번을 보여줘요
  const shownPartId = partId || partOptions[0]?.value || '';

  const stock = useQuery<ListPage<StockRow>>(withQuery(API.stockByCustomer, { warehouseId, asOf }));
  const lots = useQuery<ListPage<StockLotRow>>(
    shownPartId
      ? withQuery(API.stockByContainer, { partId: shownPartId, warehouseId, asOf })
      : null,
  );

  const rows = useMemo(() => withSubtotals(stock.state.data?.items ?? []), [stock.state.data]);
  const lotRows = lots.state.data?.items ?? [];

  return (
    <Page title="재고 현황" wide>
      <div className="jh-filters">
        <SelectField
          label="창고"
          options={warehouseOptions}
          placeholder="전체"
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
        />
        <Field
          label="기준일"
          type="date"
          value={asOf}
          onChange={(event) => {
            if (event.target.value) setAsOf(event.target.value);
          }}
        />
      </div>

      <section className="jh-section" aria-label="고객사별 재고">
        <h2 className="jh-section__title">고객사별 재고</h2>
        {stock.state.status === 'error' ? (
          <ListError title="재고" error={stock.state.error} onRetry={stock.reload} />
        ) : rows.length === 0 ? (
          stock.state.status === 'loading' ? (
            <p className="jh-list-loading" role="status">
              불러오는 중이에요.
            </p>
          ) : (
            <EmptyState title="재고가 없어요" description="컨테이너를 입고하면 여기에 계산돼요." />
          )
        ) : (
          <Grid
            caption={`고객사별 재고 ${asOf}`}
            columns={STOCK_COLUMNS}
            rows={rows}
            rowKey={stockRowKey}
            download={{
              fileName: `재고현황_${formatFileDate(asOf)}`,
              title: '고객사별 재고',
              description: `기준일 ${asOf} · 작성 ${me.name}`,
            }}
          />
        )}
      </section>

      <section className="jh-section" aria-label="컨테이너별 잔량">
        <h2 className="jh-section__title">컨테이너별 잔량</h2>
        <div className="jh-filters">
          <SelectField
            label="품번"
            options={partOptions}
            value={shownPartId}
            onChange={(event) => setPartId(event.target.value)}
          />
        </div>
        {lots.state.status === 'error' ? (
          <ListError title="컨테이너별 잔량" error={lots.state.error} onRetry={lots.reload} />
        ) : lotRows.length === 0 ? (
          lots.state.status === 'loading' ? (
            <p className="jh-list-loading" role="status">
              불러오는 중이에요.
            </p>
          ) : (
            <EmptyState
              title="이 품번이 실린 컨테이너가 없어요"
              description="다른 품번이나 창고를 골라 주세요."
            />
          )
        ) : (
          <Grid
            caption={`컨테이너별 잔량 ${asOf}`}
            columns={LOT_COLUMNS}
            rows={lotRows}
            rowKey={lotRowKey}
            download={{
              fileName: `컨테이너별잔량_${formatFileDate(asOf)}`,
              title: '컨테이너별 잔량',
              description: `기준일 ${asOf} · 작성 ${me.name}`,
            }}
          />
        )}
        <p className="jh-note">{FIFO_NOTE}</p>
      </section>
    </Page>
  );
}
