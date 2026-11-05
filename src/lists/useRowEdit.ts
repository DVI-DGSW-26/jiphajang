import { useCallback } from 'react';
import type { GridColumn } from '../components/grid/gridModel.ts';
import { useToast } from '../components/Toast.tsx';
import { patchListRow } from '../lib/useList.ts';

type Options<Row> = {
  path: string;
  rowKey: (row: Row) => string;
  /** 저장 실패 알림에서 행을 가리킬 글자 — Invoice 번호 등 */
  rowLabel: (row: Row) => string;
  replaceRow: (same: (row: Row) => boolean, next: Row) => void;
};

/** 표에서 고친 칸을 저장해요. 실패하면 원래 값으로 돌리고 알려요 */
export function useRowEdit<Row>({ path, rowKey, rowLabel, replaceRow }: Options<Row>) {
  const toast = useToast();

  return useCallback(
    async (row: Row, column: GridColumn<Row>, value: string | null) => {
      const id = rowKey(row);
      const same = (item: Row) => rowKey(item) === id;
      // 엑셀처럼 바로 바꿔 보여주고, 서버가 계산 칸까지 채운 행으로 다시 바꿔요
      replaceRow(same, { ...row, [column.key]: value });
      try {
        replaceRow(same, await patchListRow<Row>(path, id, { [column.key]: value }));
      } catch (error) {
        replaceRow(same, row);
        const reason = error instanceof Error ? error.message : '';
        toast(`${rowLabel(row)}의 ${column.header}을 저장하지 못했어요. ${reason}`.trim(), 'bad');
        throw error;
      }
    },
    [path, rowKey, rowLabel, replaceRow, toast],
  );
}
