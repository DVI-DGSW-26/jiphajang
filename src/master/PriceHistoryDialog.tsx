import { useState } from 'react';
import { Badge } from '../components/Badge.tsx';
import { type Column, DataTable } from '../components/DataTable.tsx';
import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { priceChangeFields } from '../config/forms/master.ts';
import type { AuthMe } from '../lib/api.ts';
import { formatDate, formatPrice } from '../lib/format.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { today } from '../overseas/calc.ts';
import type { Part, PartPrice } from './master.ts';

const COLUMNS: Column<PartPrice>[] = [
  {
    key: 'effectiveFrom',
    header: '적용일',
    cell: (row) => (
      <>
        {formatDate(row.effectiveFrom)} {row.current && <Badge tone="kind">지금 적용</Badge>}
      </>
    ),
  },
  {
    key: 'unitPrice',
    header: '단가',
    numeric: true,
    cell: (row) => formatPrice(row.unitPrice),
  },
  { key: 'createdAt', header: '등록일', cell: (row) => formatDate(row.createdAt) },
];

type Props = {
  me: AuthMe;
  part: Part;
  /** 단가를 더하면 서버가 현재 단가까지 다시 구한 품번 행을 줘요 */
  onChanged: (row: Part) => void;
  onClose: () => void;
};

/** 단가 변경과 이력. **덮어쓰지 않아요** — 틀렸으면 새 행을 더하고, 같은 적용일이면 나중 것이 적용돼요 */
export function PriceHistoryDialog({ me, part, onChanged, onClose }: Props) {
  const path = API.partPrices(part.id);
  const prices = useList<PartPrice>(path, null);
  const toast = useToast();
  // 저장한 뒤 칸을 비우려고 양식을 새로 그려요
  const [formKey, setFormKey] = useState(0);

  return (
    <FormDialog title={`${part.partNo} 단가 변경`} onClose={onClose}>
      {prices.state.status === 'error' ? (
        <p className="jh-field__error" role="alert">
          단가 이력을 불러오지 못했어요.{' '}
          {prices.state.error instanceof Error ? prices.state.error.message : ''}
        </p>
      ) : prices.rows.length === 0 ? (
        <p className="jh-list-loading" role="status">
          {prices.state.status === 'loading' ? '불러오는 중이에요.' : '등록한 단가가 없어요.'}
        </p>
      ) : (
        <div className="jh-dialog__table">
          <DataTable
            caption={`${part.partNo} 단가 이력`}
            columns={COLUMNS}
            rows={prices.rows}
            rowKey={(row) => row.id}
          />
        </div>
      )}

      {me.role === 'REPORTER' ? (
        <FieldForm
          key={formKey}
          defs={priceChangeFields}
          initial={{ effectiveFrom: today() }}
          submitLabel="단가 추가하기"
          onClose={onClose}
          onSubmit={async (values: FormValues) => {
            onChanged(await postListRow<Part>(path, values));
            prices.reload();
            setFormKey((current) => current + 1);
            toast('단가를 추가했어요.');
          }}
        />
      ) : (
        <div className="jh-dialog__actions">
          <button type="button" className="jh-button" onClick={onClose}>
            닫기
          </button>
        </div>
      )}
    </FormDialog>
  );
}
