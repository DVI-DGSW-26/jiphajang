import { useMemo } from 'react';
import type { SelectOption } from '../components/SelectField.tsx';
import { API } from '../config/api.ts';
import { useList } from '../lib/useList.ts';
import type { Customer, Part, Warehouse } from '../master/master.ts';

/** 입력 화면이 고르기 칸에 쓰는 마스터 */
export function useMasterData() {
  const customers = useList<Customer>(API.customers, null);
  const warehouses = useList<Warehouse>(API.warehouses, null);
  const parts = useList<Part>(API.parts, null);

  const customerOptions = useMemo<SelectOption[]>(
    () => customers.rows.map((row) => ({ value: row.id, label: row.name })),
    [customers.rows],
  );
  const warehouseOptions = useMemo<SelectOption[]>(
    () => warehouses.rows.map((row) => ({ value: row.id, label: row.name })),
    [warehouses.rows],
  );
  const partOptions = useMemo<SelectOption[]>(
    () => parts.rows.map((row) => ({ value: row.id, label: row.partNo })),
    [parts.rows],
  );

  return {
    customers: customers.rows,
    warehouses: warehouses.rows,
    parts: parts.rows,
    customerOptions,
    warehouseOptions,
    partOptions,
  };
}
