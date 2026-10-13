import {
  EXPORT_DECLARATION_INPUTS,
  type ExportDeclarationInput,
  type ExportDeclarationRow,
} from '../src/results/exportDeclarations.ts';

/**
 * 가짜 수출신고취합 — 화면을 만들 때 볼 예시예요. **실제 고객사·품번·금액이 아니에요.**
 * 2025-01-01부터 오늘까지 날짜마다 정해진 규칙으로 만들어서, 새로고침해도 같은 행이 나와요.
 * 고친 값은 개발 서버를 끄기 전까지만 남아요.
 */

const CUSTOMERS = [
  { code: 'C', name: '고객사 A' },
  { code: 'R', name: '고객사 B' },
  { code: 'E', name: '고객사 C' },
  { code: 'M', name: '고객사 D' },
];

const ITEMS = [
  { name: '품목 P1', unitPrice: '0.5120', setQty: 2400 },
  { name: '품목 P2', unitPrice: '1.2850', setQty: 1200 },
  { name: '품목 P3', unitPrice: '0.0875', setQty: 9600 },
  { name: '품목 P4', unitPrice: '3.4000', setQty: 600 },
  { name: '품목 P5', unitPrice: '0.7310', setQty: 3000 },
];

/** 같은 글자면 늘 같은 수 */
function hash(text: string): number {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** 소수 문자열 × 정수 → 소수 문자열 (자릿수 유지) */
function multiply(decimal: string, factor: string, digits: number): string {
  const [aWhole = '0', aFrac = ''] = decimal.split('.');
  const [bWhole = '0', bFrac = ''] = factor.split('.');
  const scale = aFrac.length + bFrac.length;
  const product = BigInt(aWhole + aFrac) * BigInt(bWhole + bFrac);
  // 사사오입으로 digits 자리까지
  const drop = scale - digits;
  const rounded =
    drop > 0 ? (product + 5n * 10n ** BigInt(drop - 1)) / 10n ** BigInt(drop) : product;
  const text = rounded.toString().padStart(digits + 1, '0');
  return digits > 0 ? `${text.slice(0, -digits)}.${text.slice(-digits)}` : text;
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function withDerived(row: ExportDeclarationRow): ExportDeclarationRow {
  const totalQty = row.setQty * row.boxQty;
  const amountUsd = multiply(row.unitPrice, String(totalQty), 2);
  return {
    ...row,
    totalQty,
    amountUsd,
    amountKrw: row.exchangeRate ? multiply(amountUsd, row.exchangeRate, 0) : null,
  };
}

function generate(): ExportDeclarationRow[] {
  const rows: ExportDeclarationRow[] = [];
  // 최근 2주는 아직 필증·BL·환율을 안 넣은 것으로 둬요(채울 칸을 보여주려고)
  const recent = iso(new Date(Date.now() - 14 * 86_400_000));
  let no = 0;
  const today = Date.now();
  for (let day = new Date(Date.UTC(2025, 0, 1)); day.getTime() <= today; ) {
    const date = iso(day);
    const seed = hash(date);
    if (seed % 3 === 0 && day.getUTCDay() !== 0) {
      no++;
      const customer = CUSTOMERS[seed % CUSTOMERS.length] ?? CUSTOMERS[0];
      const invoiceNo = `V${customer?.code}${date.slice(2).replaceAll('-', '')}A`;
      const filled = date < recent;
      const rate = (1300 + (seed % 12000) / 100).toFixed(2);
      const lines = 1 + ((seed >> 3) % 3);
      for (let line = 0; line < lines; line++) {
        const item = ITEMS[(seed >> (line + 2)) % ITEMS.length] ?? ITEMS[0];
        if (!item) continue;
        rows.push(
          withDerived({
            id: `${invoiceNo}-${line + 1}`,
            no,
            shipDate: date,
            invoiceNo,
            customer: customer?.name ?? '',
            declarationNo: filled ? `1234-${String(seed % 100000).padStart(5, '0')}-X` : null,
            blNo: filled ? `BL${String(seed % 1000000).padStart(6, '0')}` : null,
            shippedOn: filled ? iso(new Date(day.getTime() + 2 * 86_400_000)) : null,
            itemName: item.name,
            unitPrice: item.unitPrice,
            setQty: item.setQty,
            boxQty: 1 + ((seed >> (line + 5)) % 20),
            totalQty: 0,
            amountUsd: '0',
            exchangeRate: filled ? rate : null,
            amountKrw: null,
          }),
        );
      }
    }
    day = new Date(day.getTime() + 86_400_000);
  }
  return rows;
}

let store: ExportDeclarationRow[] | null = null;
const rowsInStore = () => {
  store ??= generate();
  return store;
};

export function listExportDeclarations(params: URLSearchParams) {
  const from = params.get('from') ?? '0000-00-00';
  const to = params.get('to') ?? '9999-99-99';
  const page = Math.max(0, Number(params.get('page') ?? 0) || 0);
  const size = Math.min(1000, Math.max(1, Number(params.get('size') ?? 500) || 500));
  const matched = rowsInStore().filter((row) => row.shipDate >= from && row.shipDate <= to);
  return { items: matched.slice(page * size, (page + 1) * size), total: matched.length };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^\d+(\.\d+)?$/;

/** 직접 입력 칸 고치기. 고친 뒤 계산 칸까지 새로 구해서 행 전체를 돌려줘요 */
export function patchExportDeclaration(
  id: string,
  body: unknown,
): { row: ExportDeclarationRow } | { error: string; status: number } {
  const rows = rowsInStore();
  const index = rows.findIndex((row) => row.id === id);
  const current = rows[index];
  if (!current) return { status: 404, error: '이 행을 찾지 못했어요. 새로고침해 주세요.' };
  if (!body || typeof body !== 'object') return { status: 400, error: '고칠 값이 없어요.' };

  const next = { ...current };
  for (const [key, value] of Object.entries(body)) {
    if (!EXPORT_DECLARATION_INPUTS.includes(key as ExportDeclarationInput)) {
      return { status: 400, error: `‘${key}’는 고칠 수 없는 칸이에요.` };
    }
    if (value !== null && typeof value !== 'string') {
      return { status: 400, error: '값은 글자나 빈 값이어야 해요.' };
    }
    if (value !== null && key === 'shippedOn' && !DATE.test(value)) {
      return { status: 400, error: '선적일자는 YYYY-MM-DD로 넣어 주세요.' };
    }
    if (value !== null && key === 'exchangeRate' && !DECIMAL.test(value)) {
      return { status: 400, error: '환율은 숫자로 넣어 주세요.' };
    }
    next[key as ExportDeclarationInput] = value;
  }
  const saved = withDerived(next);
  rows[index] = saved;
  return { row: saved };
}
