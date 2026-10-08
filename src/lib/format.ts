/**
 * 숫자·날짜 형식 — 디자인 매뉴얼 9장(상태 · 숫자 · 레이아웃).
 *
 * 금액·단가·환율은 서버가 **문자열(decimal)** 로 보내요. `Number()`로 바꾸면 소수 오차가
 * 생기니, 문자열을 그대로 `Intl.NumberFormat`에 넘겨요(문자열을 정확한 십진수로 읽어요).
 * 반올림은 사사오입이에요.
 *
 * 값이 없으면(`null`, `undefined`, 빈 문자열) 빈 문자열을 돌려줘요 — 빈 칸은 비워 둬요.
 * 숫자로 읽을 수 없는 값도 빈 문자열이에요. 화면에 `NaN`을 띄우지 않아요.
 */

export type NumericInput = number | string | null | undefined;

const MINUS = '−'; // − (매뉴얼: 음수는 앞에 −)

function makeFormat(fractionDigits: number): Intl.NumberFormat {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
    useGrouping: true,
  });
}

const formats = {
  qty: makeFormat(0),
  unitPrice: makeFormat(4),
  usd: makeFormat(2),
  rate: makeFormat(2),
  krw: makeFormat(0),
};

function isNumeric(value: NumericInput): value is number | string {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  return /^\s*[-+]?(\d+\.?\d*|\.\d+)\s*$/.test(value);
}

function format(value: NumericInput, nf: Intl.NumberFormat): string {
  if (!isNumeric(value)) return '';
  // 문자열은 그대로 넘겨요. Intl.NumberFormat은 문자열을 정확한 십진수로 다뤄요.
  const text = nf.format(typeof value === 'string' ? (value.trim() as `${number}`) : value);
  // −0 같은 표시는 0으로, 음수 부호는 −로
  if (/^-0(\.0+)?$/.test(text)) return text.slice(1);
  return text.replace(/^-/, MINUS);
}

/** 수량(Set · Box · Total QTY, 재고): 정수, 천 단위 쉼표 — `60,000` */
export const formatQty = (value: NumericInput) => format(value, formats.qty);

/** 단가(USD): 소수 4자리 — `0.5120` */
export const formatUnitPrice = (value: NumericInput) => format(value, formats.unitPrice);

/** 금액(USD): 소수 2자리, 천 단위 쉼표 — `30,720.00` */
export const formatUsd = (value: NumericInput) => format(value, formats.usd);

/** 환율: 소수 2자리 — `1,385.50` */
export const formatRate = (value: NumericInput) => format(value, formats.rate);

/** 금액(KRW): 정수, 천 단위 쉼표 — `42,562,560` */
export const formatKrw = (value: NumericInput) => format(value, formats.krw);

export type DateInput = Date | string | null | undefined;

/**
 * 날짜를 `YYYY-MM-DD`로. 서버는 날짜를 `YYYY-MM-DD` 문자열로 보내요(시간대 없음).
 *
 * **문자열 날짜는 `new Date()`로 읽지 않아요.** `new Date('2026-10-07')`은 UTC 자정이라
 * 미국 시간대에서 하루 앞 날짜로 보여요. 앞 10자만 확인해서 그대로 써요.
 * `Date` 객체는 브라우저 시간대의 날짜로 써요.
 */
export function formatDate(value: DateInput): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
  }
  if (Number.isNaN(value.getTime())) return '';
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 표 안에서 좁을 때 `MM-DD` */
export function formatShortDate(value: DateInput): string {
  return formatDate(value).slice(5);
}

/** 파일 이름에 붙이는 기준일 `YYYYMMDD` — 매뉴얼 10장 `결과 이름_기준일` */
export function formatFileDate(value: DateInput): string {
  return formatDate(value).replaceAll('-', '');
}
