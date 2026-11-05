import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button.tsx';
import { ConfirmDialog } from '../components/ConfirmDialog.tsx';
import { type Column, DataTable } from '../components/DataTable.tsx';
import { EmptyState } from '../components/EmptyState.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { invoiceHeadFields, invoiceLineFields } from '../config/forms/invoice.ts';
import { formatCell, isNumericType } from '../forms/fromConfig.ts';
import { Page } from '../layout/Page.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatMoney, formatQty } from '../lib/format.ts';
import { sendJson, useQuery } from '../lib/useQuery.ts';
import { ListError } from '../lists/ListError.tsx';
import { InvoiceBadge } from '../overseas/StatusBadge.tsx';
import type { Invoice, InvoiceLine } from '../overseas/types.ts';
import { InvoiceEditor } from './InvoiceEditor.tsx';
import { InvoiceOutput } from './InvoiceOutput.tsx';

const backLink = (
  <Link className="jh-back-link" to="/shipments">
    출고 확정
  </Link>
);

/** `/invoices/new` — 보고자만 작성해요 */
export function InvoiceNewPage({ me }: { me: AuthMe }) {
  const navigate = useNavigate();
  return (
    <Page title="인보이스 작성" wide>
      {me.role === 'REPORTER' ? (
        <InvoiceEditor onSaved={(invoice) => navigate(`/invoices/${invoice.id}`)} />
      ) : (
        <EmptyState
          title="보고자만 작성할 수 있어요"
          description="작성한 인보이스는 출고 확정 화면에서 볼 수 있어요."
        />
      )}
    </Page>
  );
}

// 줄의 칸 이름은 정의를 따르되, 입력 칸인 품번은 `partNo`로 보여줘요
const LINE_COLUMNS: Column<InvoiceLine>[] = invoiceLineFields.map((def) => ({
  key: def.key,
  header: def.label,
  ...(isNumericType(def.type) ? { numeric: true } : {}),
  ...(def.source ? { source: def.source } : {}),
  cell: (row) =>
    def.key === 'partId'
      ? row.partNo
      : formatCell(def.type, (row as unknown as Record<string, unknown>)[def.key]),
}));

const HEAD_VALUE: Record<string, (invoice: Invoice) => string> = {
  customerId: (invoice) => invoice.customerName,
  shipFromWarehouseId: (invoice) => invoice.warehouseName,
};

/** 보고 나면 고칠 수 없는 인보이스. 출고 대기면 취소할 수 있어요 */
function InvoiceView({
  me,
  invoice,
  onChanged,
}: {
  me: AuthMe;
  invoice: Invoice;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const cancel = async () => {
    setBusy(true);
    try {
      await sendJson(API.invoiceCancel(invoice.id), 'POST');
      toast(`${invoice.invoiceNo}을 취소했어요. 예약한 재고를 풀었어요.`);
      setConfirming(false);
      onChanged();
    } catch (error) {
      toast(error instanceof Error ? error.message : '취소하지 못했어요.', 'bad');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Page
      title={`인보이스 ${invoice.invoiceNo ?? '(번호 없음)'}`}
      eyebrow={backLink}
      wide
      actions={
        me.role === 'REPORTER' && invoice.status === 'PENDING' ? (
          <Button variant="danger" onClick={() => setConfirming(true)}>
            인보이스 취소
          </Button>
        ) : undefined
      }
    >
      <p className="jh-status-line">
        <InvoiceBadge status={invoice.status} />
      </p>
      <section className="jh-section" aria-label="기본 정보">
        <h2 className="jh-section__title">기본 정보</h2>
        <dl className="jh-details">
          {invoiceHeadFields.map((def) => {
            const custom = HEAD_VALUE[def.key];
            const value = custom
              ? custom(invoice)
              : formatCell(def.type, (invoice as unknown as Record<string, unknown>)[def.key]);
            return (
              <div key={def.key}>
                <dt>{def.label}</dt>
                <dd>{value || '-'}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="jh-section" aria-label="품목">
        <h2 className="jh-section__title">품목</h2>
        <DataTable
          caption="품목"
          columns={LINE_COLUMNS}
          rows={invoice.lines}
          rowKey={(row) => `${row.partId}-${row.boxQty}-${row.allocation}`}
        />
      </section>

      <section className="jh-section" aria-label="합계">
        <h2 className="jh-section__title">합계</h2>
        <dl className="jh-stats">
          <div className="jh-stat">
            <dt>총 팔레트</dt>
            <dd>{formatQty(invoice.totalPallets)}</dd>
          </div>
          <div className="jh-stat">
            <dt>총수량</dt>
            <dd>{formatQty(invoice.totalQty)}</dd>
          </div>
          <div className="jh-stat">
            <dt>총금액</dt>
            <dd>{formatMoney(invoice.totalAmount)}</dd>
          </div>
        </dl>
      </section>

      <InvoiceOutput />

      <ConfirmDialog
        open={confirming}
        title="인보이스를 취소할까요?"
        confirmLabel="인보이스 취소하기"
        busy={busy}
        onConfirm={() => void cancel()}
        onClose={() => setConfirming(false)}
      >
        {invoice.invoiceNo}이 취소되고 예약한 재고가 풀려요. 되돌릴 수 없어요.
      </ConfirmDialog>
    </Page>
  );
}

/** `/invoices/:id` — 임시 저장은 보고자가 고치고, 나머지는 읽기만 해요 */
export function InvoiceDetailPage({ me }: { me: AuthMe }) {
  const { id = '' } = useParams();
  const { state, reload } = useQuery<Invoice>(API.invoice(id));
  const invoice = state.data;

  if (!invoice) {
    return (
      <Page title="인보이스">
        {state.status === 'error' ? (
          <ListError title="인보이스" error={state.error} onRetry={reload} />
        ) : (
          <p className="jh-list-loading" role="status">
            불러오는 중이에요.
          </p>
        )}
      </Page>
    );
  }
  if (invoice.status === 'DRAFT' && me.role === 'REPORTER') {
    return (
      <Page title="인보이스 수정" eyebrow={backLink} wide>
        <InvoiceEditor key={invoice.id} draft={invoice} onSaved={reload} />
      </Page>
    );
  }
  return <InvoiceView me={me} invoice={invoice} onChanged={reload} />;
}
