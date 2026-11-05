import { useMemo, useState } from 'react';
import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { partColumns, partFields } from '../config/forms/master.ts';
import { gridColumns } from '../forms/fromConfig.ts';
import type { AuthMe } from '../lib/api.ts';
import { formatPrice } from '../lib/format.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { today } from '../overseas/calc.ts';
import { MasterList } from './MasterList.tsx';
import type { Customer, Part } from './master.ts';
import { PriceHistoryDialog } from './PriceHistoryDialog.tsx';

const rowKey = (row: Part) => row.id;
const rowLabel = (row: Part) => row.partNo;

function AddPartDialog({
  onAdded,
  onClose,
}: {
  onAdded: (row: Part) => void;
  onClose: () => void;
}) {
  const customers = useList<Customer>(API.customers, null);

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
          defs={partFields}
          options={{
            customerId: customers.rows.map((row) => ({ value: row.id, label: row.name })),
          }}
          initial={{ priceEffectiveFrom: today() }}
          submitLabel="품번 추가하기"
          onClose={onClose}
          onSubmit={async (values: FormValues) => {
            onAdded(await postListRow<Part>(API.parts, values));
            onClose();
          }}
        />
      )}
    </FormDialog>
  );
}

export function PartsTab({ me }: { me: AuthMe }) {
  const list = useList<Part>(API.parts, null);
  const toast = useToast();
  const [historyId, setHistoryId] = useState<string | null>(null);
  const { replaceRow } = list;
  // 단가를 더하면 행이 바뀌어요. 창은 늘 최신 행을 봐요
  const historyPart = list.rows.find((row) => row.id === historyId) ?? null;

  const columns = useMemo(
    () =>
      gridColumns<Part>(partColumns, {
        unitPrice: {
          // 값은 단가 그대로라 복사·엑셀에는 단가만 들어가요
          render: (row) => (
            <>
              {formatPrice(row.unitPrice)}{' '}
              <button
                type="button"
                className="jh-link-button"
                aria-label={`${row.partNo} 단가 변경`}
                onClick={() => setHistoryId(row.id)}
              >
                단가 변경
              </button>
            </>
          ),
        },
      }),
    [],
  );

  return (
    <>
      <MasterList
        me={me}
        title="품번"
        path={API.parts}
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
