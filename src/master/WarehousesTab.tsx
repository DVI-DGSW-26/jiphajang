import { FieldForm, type FormValues } from '../components/FieldForm.tsx';
import { FormDialog } from '../components/FormDialog.tsx';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { parseText, required } from '../components/grid/parsers.ts';
import { useToast } from '../components/Toast.tsx';
import type { AuthMe } from '../lib/api.ts';
import { postListRow, useList } from '../lib/useList.ts';
import { MasterList } from './MasterList.tsx';
import { WAREHOUSES_PATH, type Warehouse } from './master.ts';

const parseName = required(parseText, '창고 이름을 넣어 주세요.');

const COLUMNS: GridColumn<Warehouse>[] = [
  { key: 'name', header: '이름', value: (r) => r.name, edit: { parse: parseName } },
  { key: 'region', header: '지역', value: (r) => r.region, edit: { parse: parseText } },
];

const rowKey = (row: Warehouse) => row.id;
const rowLabel = (row: Warehouse) => row.name;

export function WarehousesTab({ me }: { me: AuthMe }) {
  const list = useList<Warehouse>(WAREHOUSES_PATH, null);
  const toast = useToast();

  return (
    <MasterList
      me={me}
      title="창고"
      path={WAREHOUSES_PATH}
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
            fields={[
              { key: 'name', label: '이름', parse: parseName },
              { key: 'region', label: '지역', parse: parseText },
            ]}
            submitLabel="창고 추가하기"
            onClose={close}
            onSubmit={async (values: FormValues) => {
              const row = await postListRow<Warehouse>(WAREHOUSES_PATH, values);
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
