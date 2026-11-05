import type { EnumOption } from '../enums.ts';

/**
 * 페이지별 칸·열 정의의 모양.
 *
 * **아직 물류팀 원본 자료를 받지 못해서 모든 정의가 임시예요.** 자료가 오면 항목이 바뀌므로
 * 화면 코드에 항목을 적지 않고 `src/config/forms/`에 모아요. 화면은 이 정의를 읽어 그려요.
 * “(확인 필요)” 항목은 `provisional: true`와 `TODO(확인 필요)` 주석을 함께 달아요.
 */

export type CellType = 'text' | 'code' | 'number' | 'price' | 'money' | 'date' | 'select';

/** 자동 칸의 출처 */
export type FieldSource = 'master' | 'calc' | 'rule';

export type FieldDef = {
  key: string;
  label: string;
  type: CellType;
  /** `input`은 사람이 넣는 칸, `auto`는 계산하거나 마스터에서 가져오는 읽기 전용 칸 */
  mode: 'input' | 'auto';
  source?: FieldSource;
  required?: boolean;
  /** 다른 칸이 이 값일 때만 필수 — 입고 완료일 때의 입고일 */
  requiredWhen?: { key: string; equals: string };
  /** `number` 칸의 최솟값 */
  min?: number;
  options?: readonly EnumOption[];
  initial?: string;
  hint?: string;
  /** 원본 자료로 확인해야 하는 칸 */
  provisional?: boolean;
};

export type ColumnDef = {
  key: string;
  label: string;
  type: CellType;
  source?: FieldSource;
  /** 표에서 바로 고칠 수 있는 칸 */
  editable?: boolean;
  required?: boolean;
  min?: number;
  /** 날짜를 `MM-DD`로 보여줘요 */
  short?: boolean;
  provisional?: boolean;
};
