import { useMemo, useState } from 'react';
import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import {
  parsePositiveWhole,
  parseProductCode,
  parseText,
  required,
} from '../components/grid/parsers.ts';
import { useToast } from '../components/Toast.tsx';
import type { AuthMe } from '../lib/api.ts';
import { formatDate, formatQty, formatUnitPrice } from '../lib/format.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { MasterList } from './MasterList.tsx';
import { CUSTOMERS_PATH, type Customer, PARTS_PATH, type Part } from './master.ts';
import { PriceHistoryDialog } from './PriceHistoryDialog.tsx';
import { parseEffectiveFrom, parseUnitPrice } from './priceFields.ts';

const parsePartNo = required(parseText, '품번을 넣어 주세요.');
const parseCode = required(parseProductCode, '제품코드를 넣어 주세요. 예: MT');
const parseSetQty = required(parsePositiveWhole, '박스당 수량을 넣어 주세요. 예: 100');
const parseCustomer = required(parseText, '고객사를 골라 주세요.');

const rowKey = (row: Part) => row.id;
const rowLabel = (row: Part) => row.partNo;

function AddPartDialog({
  onAdded,
  onClose,
}: {
  onAdded: (row: Part) => void;
  onClose: () => void;
}) {
  const customers = useList<Customer>(CUSTOMERS_PATH, null);

  return (
    <FormDialog title="품번 추가" onClose={onClose}>
      {customers.state.status === 'loading' ? (
        <p className="jh-list-loading" role="status">
          고객사를 불러오는 중이에요.
        </p>
      ) : customers.rows.length === 0 ? (
        <>
          <p className="jh-dialog__body">
            {customers.state.status === 'error'
              ? '고객사 목록을 불러오지 못했어요. 닫고 다시 해 주세요.'
              : '고객사를 먼저 추가해 주세요.'}
          </p>
          <div className="jh-dialog__actions">
            <button type="button" className="jh-button" onClick={onClose}>
              닫기
            </button>
          </div>
        </>
      ) : (
        <FieldForm
          fields={[
            { key: 'partNo', label: '품번', parse: parsePartNo },
            {
              key: 'customerId',
              label: '고객사',
              parse: parseCustomer,
              options: customers.rows.map((row) => ({ value: row.id, label: row.name })),
            },
            {
              key: 'productCode',
              label: '제품코드',
              parse: parseCode,
              hint: '인보이스 번호 앞자리예요.',
            },
            { key: 'project', label: '프로젝트', parse: parseText },
            { key: 'setQty', label: '박스당 수량', parse: parseSetQty, numeric: true },
            { key: 'unitPrice', label: '단가 (USD)', parse: parseUnitPrice, numeric: true },
            {
              key: 'effectiveFrom',
              label: '단가 적용일',
              parse: parseEffectiveFrom,
              initial: formatDate(new Date()),
            },
          ]}
          submitLabel="품번 추가하기"
          onClose={onClose}
          onSubmit={async (values: FormValues) => {
            onAdded(await postListRow<Part>(PARTS_PATH, values));
            onClose();
          }}
        />
      )}
    </FormDialog>
  );
}

export function PartsTab({ me }: { me: AuthMe }) {
  const list = useList<Part>(PARTS_PATH, null);
  const toast = useToast();
  const [historyId, setHistoryId] = useState<string | null>(null);
  const { replaceRow } = list;
  // 단가를 더하면 행이 바뀌어요. 창은 늘 최신 행을 봐요
  const historyPart = list.rows.find((row) => row.id === historyId) ?? null;

  const columns = useMemo<GridColumn<Part>[]>(
    () => [
      { key: 'partNo', header: '품번', value: (r) => r.partNo, edit: { parse: parsePartNo } },
      { key: 'customerName', header: '고객사', source: 'master', value: (r) => r.customerName },
      {
        key: 'productCode',
        header: '제품코드',
        value: (r) => r.productCode,
        edit: { parse: parseCode },
      },
      { key: 'project', header: '프로젝트', value: (r) => r.project, edit: { parse: parseText } },
      {
        key: 'setQty',
        header: '박스당 수량',
        numeric: true,
        value: (r) => r.setQty,
        format: formatQty,
        edit: { parse: parseSetQty },
      },
      {
        key: 'unitPrice',
        header: '현재 단가 (USD)',
        numeric: true,
        source: 'calc',
        value: (r) => r.unitPrice,
        format: formatUnitPrice,
        // 값은 단가 그대로라 복사·엑셀에는 단가만 들어가요
        render: (r) => (
          <>
            {formatUnitPrice(r.unitPrice)}{' '}
            <button
              type="button"
              className="jh-link-button"
              aria-label={`${r.partNo} 단가 이력`}
              onClick={() => setHistoryId(r.id)}
            >
              이력
            </button>
          </>
        ),
      },
      {
        key: 'priceEffectiveFrom',
        header: '단가 적용일',
        source: 'calc',
        value: (r) => r.priceEffectiveFrom,
        format: (v) => formatDate(v as string),
      },
    ],
    [],
  );

  return (
    <>
      <MasterList
        me={me}
        title="품번"
        path={PARTS_PATH}
        list={list}
        columns={columns}
        rowKey={rowKey}
        rowLabel={rowLabel}
        addLabel="품번 추가"
        empty={{
          title: '등록한 품번이 없어요',
          description: '품번과 단가를 넣으면 컨테이너 입고와 인보이스에 자동으로 채워져요.',
        }}
        renderAdd={(close) => (
          <AddPartDialog
            onClose={close}
            onAdded={(row) => {
              list.appendRow(row);
              toast(`${row.partNo}을 추가했어요.`);
            }}
          />
        )}
      />
      {historyPart && (
        <PriceHistoryDialog
          me={me}
          part={historyPart}
          onChanged={(row) => replaceRow((item) => item.id === row.id, row)}
          onClose={() => setHistoryId(null)}
        />
      )}
    </>
  );
}
