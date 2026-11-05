import { sumMoney } from '../overseas/calc.ts';
import type { StockRow } from '../overseas/types.ts';

export type DisplayRow = StockRow & { subtotal?: boolean };

export const isPlain = (row: DisplayRow) => !row.subtotal;
export const QTY_KEYS = ['onHandQty', 'reservedQty', 'inTransitQty'] as const;

/** 창고 → 고객사 묶음마다 소계 행을 넣어요. 합계는 표의 합계줄이 맡아요 */
export function withSubtotals(rows: readonly StockRow[]): DisplayRow[] {
  const result: DisplayRow[] = [];
  let group: StockRow[] = [];
  const flush = () => {
    const [first] = group;
    if (!first) return;
    result.push(...group, {
      ...first,
      id: `subtotal/${first.warehouseId}/${first.customerName}`,
      partNo: '소계',
      onHandQty: group.reduce((sum, row) => sum + row.onHandQty, 0),
      reservedQty: group.reduce((sum, row) => sum + row.reservedQty, 0),
      inTransitQty: group.reduce((sum, row) => sum + row.inTransitQty, 0),
      unitPrice: null,
      stockAmount: sumMoney(group.map((row) => row.stockAmount)),
      subtotal: true,
    });
    group = [];
  };
  for (const row of rows) {
    const [first] = group;
    if (
      first &&
      (first.warehouseId !== row.warehouseId || first.customerName !== row.customerName)
    ) {
      flush();
    }
    group.push(row);
  }
  flush();
  return result;
}
