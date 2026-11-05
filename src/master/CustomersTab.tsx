import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { INVOICE_TEMPLATE } from '../config/enums.ts';
import { customerColumns, customerFields } from '../config/forms/master.ts';
import { gridColumns } from '../forms/fromConfig.ts';
import type { AuthMe } from '../lib/api.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { MasterList } from './MasterList.tsx';
import type { Customer } from './master.ts';

const COLUMNS = gridColumns<Customer>(customerColumns, {
  paymentTermDays: {
    format: (value) => (value === null || value === undefined || value === '' ? '' : `Net${value}`),
  },
  invoiceTemplate: {
    format: (value) =>
      value ? (INVOICE_TEMPLATE[value as keyof typeof INVOICE_TEMPLATE] ?? String(value)) : '',
  },
});

const rowKey = (row: Customer) => row.id;
const rowLabel = (row: Customer) => row.name;

export function CustomersTab({ me }: { me: AuthMe }) {
  const list = useList<Customer>(API.customers, null);
  const toast = useToast();

  return (
    <MasterList
      me={me}
      title="고객사"
      path={API.customers}
      list={list}
      columns={COLUMNS}
      rowKey={rowKey}
      rowLabel={rowLabel}
      addLabel="고객사 추가"
      empty={{
        title: '등록한 고객사가 없어요',
        description: '이름, 납품처, 결제 조건을 넣으면 인보이스에 자동으로 채워져요.',
      }}
      renderAdd={(close) => (
        <FormDialog title="고객사 추가" onClose={close}>
          <FieldForm
            defs={customerFields}
            submitLabel="고객사 추가하기"
            onClose={close}
            onSubmit={async (values: FormValues) => {
              const row = await postListRow<Customer>(API.customers, values);
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
