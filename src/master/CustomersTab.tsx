import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { parseText, parseWholeNumber, required } from '../components/grid/parsers.ts';
import { useToast } from '../components/Toast.tsx';
import type { AuthMe } from '../lib/api.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { MasterList } from './MasterList.tsx';
import { CUSTOMERS_PATH, type Customer } from './master.ts';

const parseName = required(parseText, '고객사 이름을 넣어 주세요.');
const parseShipTo = required(parseText, '납품처를 넣어 주세요.');
const parseTerm = required(parseWholeNumber, '결제조건 일수를 넣어 주세요. 예: 30');

const COLUMNS: GridColumn<Customer>[] = [
  { key: 'name', header: '이름', value: (r) => r.name, edit: { parse: parseName } },
  { key: 'shipToName', header: '납품처', value: (r) => r.shipToName, edit: { parse: parseShipTo } },
  {
    key: 'paymentTermDays',
    header: '결제조건',
    numeric: true,
    value: (r) => r.paymentTermDays,
    format: (v) => (v === null || v === undefined || v === '' ? '' : `Net${v}`),
    edit: { parse: parseTerm },
  },
];

const rowKey = (row: Customer) => row.id;
const rowLabel = (row: Customer) => row.name;

export function CustomersTab({ me }: { me: AuthMe }) {
  const list = useList<Customer>(CUSTOMERS_PATH, null);
  const toast = useToast();

  return (
    <MasterList
      me={me}
      title="고객사"
      path={CUSTOMERS_PATH}
      list={list}
      columns={COLUMNS}
      rowKey={rowKey}
      rowLabel={rowLabel}
      addLabel="고객사 추가"
      empty={{
        title: '등록한 고객사가 없어요',
        description: '이름, 납품처, 결제조건을 넣으면 인보이스에 자동으로 채워져요.',
      }}
      renderAdd={(close) => (
        <FormDialog title="고객사 추가" onClose={close}>
          <FieldForm
            fields={[
              { key: 'name', label: '이름', parse: parseName },
              { key: 'shipToName', label: '납품처', parse: parseShipTo },
              {
                key: 'paymentTermDays',
                label: '결제조건 일수',
                parse: parseTerm,
                numeric: true,
                hint: 'Net30이면 30이에요.',
              },
            ]}
            submitLabel="고객사 추가하기"
            onClose={close}
            onSubmit={async (values: FormValues) => {
              const row = await postListRow<Customer>(CUSTOMERS_PATH, values);
              list.appendRow(row);
              toast(`${row.name}을 추가했어요.`);
              close();
            }}
          />
        </FormDialog>
      )}
    />
  );
}
