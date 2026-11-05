import { parseDate, parseDecimal, required } from '../components/grid/parsers.ts';

/** 단가 입력 칸 — 품번 추가와 단가 이력이 같이 써요 */
export const parseUnitPrice = required(parseDecimal, '단가를 넣어 주세요. 예: 1.2500');
export const parseEffectiveFrom = required(parseDate, '적용일을 넣어 주세요. 예: 2026-10-12');
