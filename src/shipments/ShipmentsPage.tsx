import { type ChangeEvent, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/Button.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { Grid } from '../components/grid/Grid.tsx';
import { PeriodFilter, yearPeriod } from '../components/PeriodFilter.tsx';
import { SelectField } from '../components/SelectField.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { enumOptions, INVOICE_STATUS, type InvoiceStatus } from '../config/enums.ts';
import { shipmentColumns } from '../config/forms/shipments.ts';
import { gridColumns } from '../forms/fromConfig.ts';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatFileDate, formatShortDate } from '../lib/format.ts';
import { useList } from '../lib/useList.ts';
import { sendJson } from '../lib/useQuery.ts';
import { ListError } from '../lists/ListError.tsx';
import { usePeriod } from '../lists/usePeriod.ts';
import { InvoiceBadge } from '../overseas/StatusBadge.tsx';
import type { Invoice } from '../overseas/types.ts';
import { useMasterData } from '../overseas/useMasterData.ts';

const rowKey = (row: Invoice) => row.id;
const STATUS_OPTIONS = enumOptions(INVOICE_STATUS);

function actionText(row: Invoice): string {
  if (row.status === 'SHIPPED') {
    return `${formatShortDate(row.shippedDate)} 확정 · BOL ${row.bolFiles.length}건`;
  }
  return row.status === 'PENDING' ? `BOL ${row.bolFiles.length}건` : '';
}

/** 출고 확정 — 창고에서 BOL을 받아 확정하면 재고가 빠지고 수금이 만들어져요 */
export function ShipmentsPage({ me }: { me: AuthMe }) {
  const today = useMemo(() => new Date(), []);
  const [period, setPeriod] = usePeriod(today, yearPeriod(today));
  const { rows, state, reload, replaceRow } = useList<Invoice>(API.invoices, period);
  const { customerOptions, warehouseOptions } = useMasterData();
  const toast = useToast();
  const canEdit = me.role === 'REPORTER';

  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [status, setStatus] = useState<string>('PENDING');
  const [confirming, setConfirming] = useState<Invoice | null>(null);
  const [busy, setBusy] = useState(false);

  const shown = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!customerId || row.customerId === customerId) &&
          (!warehouseId || row.shipFromWarehouseId === warehouseId) &&
          (!status || row.status === status),
      ),
    [rows, customerId, warehouseId, status],
  );

  const columns = useMemo(() => {
    const replaced = (row: Invoice) => replaceRow((item) => item.id === row.id, row);
    const attach = async (row: Invoice, event: ChangeEvent<HTMLInputElement>) => {
      const fileNames = [...(event.target.files ?? [])].map((file) => file.name);
      event.target.value = '';
      if (fileNames.length === 0) return;
      // TODO(확인 필요): 파일 저장은 서버와 정한 뒤예요. 지금은 이름만 보내요 (Q22)
      try {
        replaced(await sendJson<Invoice>(API.invoiceAttachments(row.id), 'POST', { fileNames }));
        toast(`BOL ${fileNames.length}건을 첨부했어요.`);
      } catch (error) {
        toast(error instanceof Error ? error.message : '첨부하지 못했어요.', 'bad');
      }
    };

    return gridColumns<Invoice>(shipmentColumns, {
      invoiceNo: {
        value: (row) => row.invoiceNo ?? '(번호 없음)',
        render: (row) => <Link to={`/invoices/${row.id}`}>{row.invoiceNo ?? '(번호 없음)'}</Link>,
      },
      status: {
        format: (value) => INVOICE_STATUS[value as InvoiceStatus] ?? '',
        render: (row) => <InvoiceBadge status={row.status} />,
      },
      actions: {
        value: actionText,
        render: (row) =>
          row.status === 'PENDING' && canEdit ? (
            <span className="jh-cell-actions">
              <label className="jh-button jh-button--small">
                <input
                  type="file"
                  multiple
                  className="jh-visually-hidden"
                  aria-label={`${row.invoiceNo} BOL 첨부`}
                  onChange={(event) => void attach(row, event)}
                />
                BOL 첨부
              </label>
              {row.bolFiles.length > 0 && <span>BOL {row.bolFiles.length}건</span>}
              <Button
                className="jh-button--small"
                aria-label={`${row.invoiceNo} 출고 확정`}
                onClick={() => setConfirming(row)}
              >
                출고 확정
              </Button>
            </span>
          ) : (
            actionText(row)
          ),
      },
    });
  }, [canEdit, replaceRow, toast]);

  const confirm = async () => {
    if (!confirming) return;
    setBusy(true);
    try {
      const row = await sendJson<Invoice>(API.invoiceConfirm(confirming.id), 'POST');
      replaceRow((item) => item.id === row.id, row);
      toast(`${row.invoiceNo}을 출고 확정했어요. 수금 예정을 만들었어요.`);
      setConfirming(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : '확정하지 못했어요.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  const allOption = { placeholder: '전체' };

  return (
    <Page title="출고 확정" wide>
      <div className="jh-filters">
        <PeriodFilter value={period} onChange={setPeriod} basis="인보이스 일자" today={today} />
        <SelectField
          label="고객사"
          options={customerOptions}
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          {...allOption}
        />
        <SelectField
          label="창고"
          options={warehouseOptions}
          value={warehouseId}
          onChange={(event) => setWarehouseId(event.target.value)}
          {...allOption}
        />
        <SelectField
          label="상태"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          {...allOption}
        />
      </div>

      {state.status === 'error' ? (
        <ListError title="출고" error={state.error} onRetry={reload} />
      ) : shown.length === 0 ? (
        state.status === 'loading' ? (
          <p className="jh-list-loading" role="status">
            불러오는 중이에요.
          </p>
        ) : (
          <EmptyState
            title="조건에 맞는 인보이스가 없어요"
            description="상태나 기간을 바꿔 보거나, 새 인보이스를 작성해 주세요."
            actions={
              canEdit ? (
                <Link className="jh-button" to="/invoices/new">
                  인보이스 작성하기
                </Link>
              ) : undefined
            }
          />
        )
      ) : (
        <Grid
          caption={`출고 ${period.from} ~ ${period.to}`}
          columns={columns}
          rows={shown}
          rowKey={rowKey}
          viewId={API.invoices}
          download={{
            fileName: `출고_${formatFileDate(period.from)}-${formatFileDate(period.to)}`,
            title: '출고 확정',
            description: `기간 ${period.from} ~ ${period.to} · 작성 ${me.name}`,
          }}
        />
      )}

      <ConfirmDialog
        open={confirming !== null}
        title="출고를 확정할까요?"
        confirmLabel="출고 확정하기"
        busy={busy}
        onConfirm={() => void confirm()}
        onClose={() => setConfirming(null)}
      >
        {confirming?.invoiceNo}의 팔레트가 재고에서 빠지고 수금 예정이 만들어져요. 되돌릴 수 없어요.
      </ConfirmDialog>
    </Page>
  );
}
