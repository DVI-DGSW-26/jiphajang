import {
  CUSTOMERS_PATH,
  type Customer,
  PARTS_PATH,
  type Part,
  type PartPrice,
  WAREHOUSES_PATH,
  type Warehouse,
} from '../../src/master/master.ts';
import type { MockResponse } from '../api.ts';
import { mockList } from '../list.ts';
import { DATE, DECIMAL, iso } from '../sample.ts';
import { type StoredPrice, seedCustomers, seedParts, seedPrices, seedWarehouses } from './seed.ts';

/**
 * 가짜 마스터. 고친 값은 개발 서버를 끄기 전까지 남아요.
 * 단가는 더하기만 해요. 같은 적용일이면 나중에 더한 것이 적용돼요.
 */

const customers = seedCustomers();
const warehouses = seedWarehouses();
const parts = seedParts();
const prices = seedPrices();

let nextId = 100;
const newId = (prefix: string) => `${prefix}${nextId++}`;

const WHOLE = /^\d+$/;
const POSITIVE_WHOLE = /^[1-9]\d*$/;
const PRODUCT_CODE = /^[A-Z0-9]+$/;

const fail = (status: number, text: string): MockResponse => ({ status, json: { message: text } });

/** 이 품번의 단가. 적용일이 늦은 것부터, 같으면 나중에 더한 것부터 */
function pricesOf(partId: string): StoredPrice[] {
  return prices
    .map((price, order) => ({ price, order }))
    .filter(({ price }) => price.partId === partId)
    .sort((a, b) => b.price.effectiveFrom.localeCompare(a.price.effectiveFrom) || b.order - a.order)
    .map(({ price }) => price);
}

function currentPrice(partId: string): StoredPrice | undefined {
  const today = iso(new Date());
  return pricesOf(partId).find((price) => price.effectiveFrom <= today);
}

/** 계산 칸을 채워요 — 고객사 이름, 현재 단가와 적용일 */
function derivePart(part: Part): Part {
  const price = currentPrice(part.id);
  return {
    ...part,
    setQty: Number(part.setQty),
    customerName: customers.find((row) => row.id === part.customerId)?.name ?? '',
    unitPrice: price?.unitPrice ?? null,
    priceEffectiveFrom: price?.effectiveFrom ?? null,
  };
}

function partRows(): Part[] {
  parts.forEach((part, index) => {
    parts[index] = derivePart(part);
  });
  return parts;
}

export const customerList = mockList<Customer>({
  path: CUSTOMERS_PATH,
  rows: () => customers,
  inputs: ['name', 'shipToName', 'paymentTermDays'],
  required: ['name', 'shipToName', 'paymentTermDays'],
  check: (key, value, row) => {
    if (key === 'name' && customers.some((item) => item.name === value && item.id !== row.id)) {
      return '같은 이름의 고객사가 이미 있어요.';
    }
    if (key === 'paymentTermDays' && !WHOLE.test(value)) {
      return '결제조건 일수는 숫자로 넣어 주세요.';
    }
    return null;
  },
  derive: (row) => ({ ...row, paymentTermDays: Number(row.paymentTermDays) }),
});

export const warehouseList = mockList<Warehouse>({
  path: WAREHOUSES_PATH,
  rows: () => warehouses,
  inputs: ['name', 'region'],
  required: ['name'],
  check: (key, value, row) =>
    key === 'name' && warehouses.some((item) => item.name === value && item.id !== row.id)
      ? '같은 이름의 창고가 이미 있어요.'
      : null,
});

export const partList = mockList<Part>({
  path: PARTS_PATH,
  rows: partRows,
  inputs: ['partNo', 'productCode', 'project', 'setQty'],
  required: ['partNo', 'productCode', 'setQty'],
  check: (key, value, row) => {
    if (
      key === 'partNo' &&
      parts.some(
        (item) => item.partNo === value && item.customerId === row.customerId && item.id !== row.id,
      )
    ) {
      return '이 고객사에 같은 품번이 이미 있어요.';
    }
    if (key === 'productCode' && !PRODUCT_CODE.test(value)) {
      return '제품코드는 영문 대문자와 숫자로 넣어 주세요.';
    }
    if (key === 'setQty' && !POSITIVE_WHOLE.test(value)) {
      return '박스당 수량은 1 이상으로 넣어 주세요.';
    }
    return null;
  },
  derive: derivePart,
});

/** 본문에서 글자 칸을 읽어요. 없거나 글자가 아니면 빈 글자 */
function text(body: unknown, key: string): string {
  const value = body && typeof body === 'object' ? (body as Record<string, unknown>)[key] : null;
  return typeof value === 'string' ? value.trim() : '';
}

function checkPrice(unitPrice: string, effectiveFrom: string): string | null {
  if (!DECIMAL.test(unitPrice)) return '단가는 숫자로 넣어 주세요.';
  if (!DATE.test(effectiveFrom)) return '적용일은 YYYY-MM-DD로 넣어 주세요.';
  return null;
}

function addPrice(partId: string, unitPrice: string, effectiveFrom: string): void {
  prices.push({
    id: newId('pr'),
    partId,
    unitPrice,
    effectiveFrom,
    createdAt: iso(new Date()),
  });
}

function createCustomer(body: unknown): MockResponse {
  const name = text(body, 'name');
  const shipToName = text(body, 'shipToName');
  const days = text(body, 'paymentTermDays');
  if (!name || !shipToName || !WHOLE.test(days)) {
    return fail(400, '고객사 칸을 다시 확인해 주세요.');
  }
  if (customers.some((row) => row.name === name)) {
    return fail(409, '같은 이름의 고객사가 이미 있어요.');
  }
  const row: Customer = { id: newId('c'), name, shipToName, paymentTermDays: Number(days) };
  customers.push(row);
  return { status: 201, json: row };
}

function createWarehouse(body: unknown): MockResponse {
  const name = text(body, 'name');
  if (!name) return fail(400, '창고 이름을 넣어 주세요.');
  if (warehouses.some((row) => row.name === name)) {
    return fail(409, '같은 이름의 창고가 이미 있어요.');
  }
  const row: Warehouse = { id: newId('w'), name, region: text(body, 'region') || null };
  warehouses.push(row);
  return { status: 201, json: row };
}

function createPart(body: unknown): MockResponse {
  const partNo = text(body, 'partNo');
  const customerId = text(body, 'customerId');
  const productCode = text(body, 'productCode');
  const setQty = text(body, 'setQty');
  const unitPrice = text(body, 'unitPrice');
  const effectiveFrom = text(body, 'effectiveFrom');
  if (!partNo || !PRODUCT_CODE.test(productCode) || !POSITIVE_WHOLE.test(setQty)) {
    return fail(400, '품번 칸을 다시 확인해 주세요.');
  }
  if (!customers.some((row) => row.id === customerId)) {
    return fail(400, '고객사를 다시 골라 주세요.');
  }
  const problem = checkPrice(unitPrice, effectiveFrom);
  if (problem) return fail(400, problem);
  if (parts.some((row) => row.partNo === partNo && row.customerId === customerId)) {
    return fail(409, '이 고객사에 같은 품번이 이미 있어요.');
  }
  const id = newId('p');
  addPrice(id, unitPrice, effectiveFrom);
  const row = derivePart({
    id,
    partNo,
    customerId,
    customerName: '',
    productCode,
    project: text(body, 'project') || null,
    setQty: Number(setQty),
    unitPrice: null,
    priceEffectiveFrom: null,
  });
  parts.push(row);
  return { status: 201, json: row };
}

function listPrices(partId: string): MockResponse {
  if (!parts.some((row) => row.id === partId)) return fail(404, '이 품번을 찾지 못했어요.');
  const current = currentPrice(partId);
  const items: PartPrice[] = pricesOf(partId).map(({ partId: _partId, ...price }) => ({
    ...price,
    current: price.id === current?.id,
  }));
  return { status: 200, json: { items, total: items.length } };
}

/** 단가를 더하면 현재 단가까지 다시 구한 품번 행을 돌려줘요 */
function createPrice(partId: string, body: unknown): MockResponse {
  const index = parts.findIndex((row) => row.id === partId);
  const part = parts[index];
  if (!part) return fail(404, '이 품번을 찾지 못했어요.');
  const unitPrice = text(body, 'unitPrice');
  const effectiveFrom = text(body, 'effectiveFrom');
  const problem = checkPrice(unitPrice, effectiveFrom);
  if (problem) return fail(400, problem);
  addPrice(partId, unitPrice, effectiveFrom);
  const row = derivePart(part);
  parts[index] = row;
  return { status: 201, json: row };
}

export type MockAction = {
  /** 보고자만 할 수 있어요 */
  write: boolean;
  run: (body: unknown) => MockResponse;
};

const PRICES_ROUTE = new RegExp(`^${PARTS_PATH}/([^/]+)/prices$`);

/** 목록 받기·칸 고치기(`mockList`) 말고 마스터에서 더 받는 요청 */
export function masterAction(method: string, pathname: string): MockAction | null {
  if (method === 'POST' && pathname === CUSTOMERS_PATH) {
    return { write: true, run: createCustomer };
  }
  if (method === 'POST' && pathname === WAREHOUSES_PATH) {
    return { write: true, run: createWarehouse };
  }
  if (method === 'POST' && pathname === PARTS_PATH) return { write: true, run: createPart };

  const match = PRICES_ROUTE.exec(pathname);
  if (!match?.[1]) return null;
  const partId = decodeURIComponent(match[1]);
  if (method === 'GET') return { write: false, run: () => listPrices(partId) };
  if (method === 'POST') return { write: true, run: (body) => createPrice(partId, body) };
  return null;
}
