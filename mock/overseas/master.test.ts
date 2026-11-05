import { expect, test } from 'vitest';
import { handleMock, MOCK_TOKEN_PREFIX, type MockOptions } from '../api.ts';

const reporter: MockOptions = {
  role: 'REPORTER',
  scenario: 'ok',
  name: '홍길동',
  scale: 1,
  tokenTtl: 0,
};
const viewer: MockOptions = { ...reporter, role: 'VIEWER' };
const authorization = `Bearer ${MOCK_TOKEN_PREFIX}.1`;

const call = (method: string, url: string, body?: unknown, options = reporter) =>
  handleMock({ method, url, authorization, body }, options);

type PartRow = { id: string; partNo: string; unitPrice: string | null; customerName: string };

test('기간 없이 마스터 전체를 받아요. 품번에는 고객사 이름과 현재 단가가 들어 있어요', () => {
  const body = call('GET', '/master/parts').json as { items: PartRow[]; total: number };
  expect(body.total).toBe(3);
  expect(body.items[0]).toMatchObject({
    partNo: 'P1',
    customerName: '고객사 A',
    unitPrice: '1.2500',
  });
  expect((call('GET', '/master/warehouses').json as { total: number }).total).toBe(3);
});

test('단가를 더해도 이력은 남고, 오늘 적용되는 단가만 현재 단가가 돼요', () => {
  const past = call('POST', '/master/parts/p2/prices', {
    unitPrice: '0.6000',
    effectiveFrom: '2026-02-01',
  });
  expect(past.status).toBe(201);
  expect(past.json).toMatchObject({ unitPrice: '0.6000', priceEffectiveFrom: '2026-02-01' });

  // 앞으로 적용될 단가는 그날까지 현재 단가가 아니에요
  const future = call('POST', '/master/parts/p2/prices', {
    unitPrice: '0.9000',
    effectiveFrom: '2999-01-01',
  });
  expect(future.json).toMatchObject({ unitPrice: '0.6000' });

  const history = call('GET', '/master/parts/p2/prices').json as {
    items: { unitPrice: string; current: boolean }[];
  };
  expect(history.items.map((row) => [row.unitPrice, row.current])).toEqual([
    ['0.9000', false],
    ['0.6000', true],
    ['0.5000', false],
  ]);
});

test('같은 적용일로 다시 더하면 나중 것이 적용되고, 앞의 것도 남아요', () => {
  call('POST', '/master/parts/p3/prices', { unitPrice: '0.4100', effectiveFrom: '2026-03-01' });
  const fixed = call('POST', '/master/parts/p3/prices', {
    unitPrice: '0.4200',
    effectiveFrom: '2026-03-01',
  });
  expect(fixed.json).toMatchObject({ unitPrice: '0.4200' });
  const history = call('GET', '/master/parts/p3/prices').json as { total: number };
  expect(history.total).toBe(3);
});

test('단가는 품번 칸 고치기로 바꿀 수 없어요', () => {
  const response = call('PATCH', '/master/parts/p1', { unitPrice: '9.0000' });
  expect(response.status).toBe(400);
});

test('품번을 추가하면 첫 단가까지 들어가요. 같은 고객사에 같은 품번은 409', () => {
  const body = {
    partNo: 'P9',
    customerId: 'c2',
    productCode: 'R2',
    project: null,
    setQty: '50',
    unitPrice: '2.0000',
    effectiveFrom: '2026-01-15',
  };
  const created = call('POST', '/master/parts', body);
  expect(created.status).toBe(201);
  expect(created.json).toMatchObject({
    partNo: 'P9',
    customerName: '고객사 B',
    setQty: 50,
    unitPrice: '2.0000',
  });
  expect(call('POST', '/master/parts', body).status).toBe(409);
});

test('칸을 고치면 계산 칸까지 돌려주고, 필수 칸은 비울 수 없어요', () => {
  const patched = call('PATCH', '/master/customers/c1', { paymentTermDays: '45' });
  expect(patched.json).toMatchObject({ paymentTermDays: 45 });
  expect(call('PATCH', '/master/customers/c1', { name: null }).status).toBe(400);
  expect(call('PATCH', '/master/customers/c1', { name: '고객사 B' }).status).toBe(400);

  // 고객사 이름을 바꾸면 품번 목록에도 따라와요
  call('PATCH', '/master/customers/c2', { name: '고객사 B2' });
  const parts = call('GET', '/master/parts').json as { items: PartRow[] };
  expect(parts.items.find((row) => row.partNo === 'P3')?.customerName).toBe('고객사 B2');
});

test('열람자는 받기만 해요. 토큰이 없으면 401', () => {
  expect(call('GET', '/master/parts/p1/prices', undefined, viewer).status).toBe(200);
  expect(call('POST', '/master/warehouses', { name: '창고 9' }, viewer).status).toBe(403);
  expect(
    call('POST', '/master/parts/p1/prices', { unitPrice: '1', effectiveFrom: '2026-01-01' }, viewer)
      .status,
  ).toBe(403);
  expect(call('PATCH', '/master/warehouses/w1', { region: 'x' }, viewer).status).toBe(403);
  expect(handleMock({ method: 'POST', url: '/master/warehouses' }, reporter).status).toBe(401);
});
