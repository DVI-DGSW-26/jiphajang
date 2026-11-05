import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import { useToast } from '../components/Toast.tsx';
import { API } from '../config/api.ts';
import { warehouseColumns, warehouseFields } from '../config/forms/master.ts';
import { gridColumns } from '../forms/fromConfig.ts';
import type { AuthMe } from '../lib/api.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { MasterList } from './MasterList.tsx';
import type { Warehouse } from './master.ts';

const COLUMNS = gridColumns<Warehouse>(warehouseColumns);

const rowKey = (row: Warehouse) => row.id;
const rowLabel = (row: Warehouse) => row.name;

export function WarehousesTab({ me }: { me: AuthMe }) {
  const list = useList<Warehouse>(API.warehouses, null);
  const toast = useToast();

  return (
    <MasterList
      me={me}
      title="창고"
      path={API.warehouses}
      list={list}
      columns={COLUMNS}
      rowKey={rowKey}
      rowLabel={rowLabel}
      addLabel="창고 추가"
      empty={{
        title: '등록한 창고가 없어요',
        description: '컨테이너가 도착하고 출고가 나가는 현지 창고를 등록해요.',
      }}
      renderAdd={(close) => (
        <FormDialog title="창고 추가" onClose={close}>
          <FieldForm
            defs={warehouseFields}
            submitLabel="창고 추가하기"
            onClose={close}
            onSubmit={async (values: FormValues) => {
              const row = await postListRow<Warehouse>(API.warehouses, values);
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
