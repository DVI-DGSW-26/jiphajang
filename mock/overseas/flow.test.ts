import { expect, test } from 'vitest';
import { today } from '../../src/overseas/calc.ts';
import type {
  CollectionRow,
  CollectionSummary,
  ContainerRow,
  Invoice,
  InvoicePreview,
  StockLotRow,
  StockRow,
} from '../../src/overseas/types.ts';
import { handleMock, MOCK_TOKEN_PREFIX, type MockOptions } from '../api.ts';

const reporter: MockOptions = {
  role: 'REPORTER',
  scenario: 'ok',
  name: '홍길동',
  scale: 1,
  tokenTtl: 0,
};
const authorization = `Bearer ${MOCK_TOKEN_PREFIX}.1`;
const call = (method: string, url: string, body?: unknown, options = reporter) =>
  handleMock({ method, url, authorization, body }, options);

const head = { customerId: 'c1', shipFromWarehouseId: 'w1', invoiceDate: '2026-11-06' };
const lines = (boxQty: string, partId = 'p1') => [{ partId, boxQty }];

const lots = (partId = 'p1') =>
  (call('GET', `/stock/by-container?partId=${partId}`).json as { items: StockLotRow[] }).items;
const lotPallets = () =>
  lots().map((row) => [row.containerNo, row.remainingPallets, row.reservedPallets]);

// 아래 시험은 차례대로 이어져요. 가짜 서버의 상태가 남아요

test('미리보기: 번호·납품처·수금 예정일·FIFO 배정을 저장 없이 계산해요', () => {
  const body = call('POST', '/invoices/preview', { ...head, lines: lines('6') })
    .json as InvoicePreview;
  expect(body).toMatchObject({
    invoiceNo: 'MT261106A',
    shipTo: '납품처 A',
    paymentTerms: 'Net30',
    dueDate: '2026-12-06',
    totalPallets: 6,
    totalQty: 600,
    totalAmount: '750.00',
    availability: [{ partNo: 'P1', availablePallets: 21, allocatedPallets: 6 }],
  });
  expect(body.lines[0]).toMatchObject({
    setQty: 100,
    unitPrice: '1.2500',
    allocation: 'VX260807A 1 → VX260915A 5',
    shortage: 0,
  });
  expect(lotPallets()[0]).toEqual(['VX260807A', 1, 0]);
});

test('재고가 모자라면 저장하지 않아요. 선적 중 컨테이너는 배정하지 않아요', () => {
  const short = call('POST', '/invoices/preview', { ...head, lines: lines('22') })
    .json as InvoicePreview;
  expect(short.lines[0]?.shortage).toBe(1);
  const saved = call('POST', '/invoices', { ...head, lines: lines('22'), action: 'send' });
  expect(saved.status).toBe(409);
  expect(lotPallets()[0]).toEqual(['VX260807A', 1, 0]);
});

test('임시 저장은 번호도 예약도 없어요. 고친 뒤 보내면 번호를 받고 예약해요', () => {
  const draft = call('POST', '/invoices', { ...head, poNo: 'PO-1', lines: lines('2') })
    .json as Invoice;
  expect(draft).toMatchObject({ status: 'DRAFT', invoiceNo: null, poNo: 'PO-1', totalQty: 200 });
  expect(lotPallets()[0]).toEqual(['VX260807A', 1, 0]);

  const changed = call('PUT', `/invoices/${draft.id}`, { ...head, lines: lines('1') })
    .json as Invoice;
  expect(changed).toMatchObject({ status: 'DRAFT', totalQty: 100 });

  const sent = call('PUT', `/invoices/${draft.id}`, {
    ...head,
    lines: lines('1'),
    action: 'send',
  }).json as Invoice;
  expect(sent).toMatchObject({ status: 'PENDING', invoiceNo: 'MT261106A' });
  expect(lotPallets()[0]).toEqual(['VX260807A', 1, 1]);
  expect(call('PUT', `/invoices/${draft.id}`, { ...head, lines: lines('1') }).status).toBe(409);

  // 취소하면 예약이 풀려요. 취소한 번호는 다시 쓰지 않아요
  expect(call('POST', `/invoices/${draft.id}/cancel`).json).toMatchObject({ status: 'CANCELED' });
  expect(lotPallets()[0]).toEqual(['VX260807A', 1, 0]);
  expect(call('POST', `/invoices/${draft.id}/cancel`).status).toBe(409);
  expect(call('POST', `/invoices/${draft.id}/confirm`).status).toBe(409);
});

let first: Invoice;

test('보내면 FIFO대로 예약하고, 다음 인보이스는 남은 곳에서 배정해요', () => {
  first = call('POST', '/invoices', { ...head, lines: lines('6'), action: 'send' }).json as Invoice;
  expect(first.invoiceNo).toBe('MT261106B');
  expect(first.lines[0]?.allocation).toBe('VX260807A 1 → VX260915A 5');
  expect(lotPallets().slice(0, 2)).toEqual([
    ['VX260807A', 1, 1],
    ['VX260915A', 20, 5],
  ]);

  const next = call('POST', '/invoices', { ...head, lines: lines('3'), action: 'send' })
    .json as Invoice;
  expect(next.invoiceNo).toBe('MT261106C');
  expect(next.lines[0]?.allocation).toBe('VX260915A 3');
});

test('BOL을 첨부하고 출고 확정하면 재고가 빠지고 수금이 생겨요. 두 번은 안 돼요', () => {
  const attached = call('POST', `/invoices/${first.id}/attachments`, {
    fileNames: ['bol.pdf'],
  }).json as Invoice;
  expect(attached.bolFiles).toEqual(['bol.pdf']);

  const confirmed = call('POST', `/invoices/${first.id}/confirm`).json as Invoice;
  expect(confirmed).toMatchObject({ status: 'SHIPPED', shippedDate: today() });
  expect(lotPallets().slice(0, 2)).toEqual([
    ['VX260807A', 0, 0],
    ['VX260915A', 15, 3],
  ]);
  expect(call('POST', `/invoices/${first.id}/confirm`).status).toBe(409);
  expect(lotPallets()[1]).toEqual(['VX260915A', 15, 3]);

  const { items } = call('GET', '/collections').json as { items: CollectionRow[] };
  expect(items[0]).toMatchObject({
    invoiceNo: 'MT261106B',
    containers: 'VX260807A (1), VX260915A (5)',
    plannedAmount: '750.00',
    plannedDate: '2026-12-06',
    outstanding: '750.00',
    status: 'UNPAID',
  });
});

test('재고 현황: 현지 재고·출고 대기·선적 중·재고 금액을 계산해요', () => {
  const { items } = call('GET', '/stock/by-customer?warehouseId=w1').json as { items: StockRow[] };
  expect(items).toHaveLength(1);
  expect(items[0]).toMatchObject({
    partNo: 'P1',
    onHandQty: 1500,
    reservedQty: 300,
    inTransitQty: 3000,
    unitPrice: '1.2500',
    stockAmount: '1875.00',
  });

  expect(lots().map((row) => [row.fifoOrder, row.containerNo, row.receivedDate])).toEqual([
    [1, 'VX260807A', '2026-09-05'],
    [2, 'VX260915A', '2026-10-15'],
    [null, 'VX261019A', null],
  ]);

  // 예전 기준일에는 입고 전 컨테이너가 선적 중으로, 뒤의 출고가 빠지지 않은 값으로 보여요
  const past = call('GET', '/stock/by-customer?warehouseId=w1&asOf=2026-10-01').json as {
    items: StockRow[];
  };
  expect(past.items[0]).toMatchObject({ onHandQty: 100, inTransitQty: 5000, reservedQty: 0 });
});

test('수금: 부분 입금은 미수가 남고, 수금일 없이는 금액을 넣지 못해요', () => {
  const { items } = call('GET', '/collections').json as { items: CollectionRow[] };
  const id = items[0]?.id;
  expect(call('PATCH', `/collections/${id}`, { paidAmount: '300' }).status).toBe(400);
  expect(call('PATCH', `/collections/${id}`, { paidDate: '2026-11-20' }).status).toBe(200);
  const partial = call('PATCH', `/collections/${id}`, { paidAmount: '300' }).json as CollectionRow;
  expect(partial).toMatchObject({ outstanding: '450.00', status: 'PARTIAL' });
  const paid = call('PATCH', `/collections/${id}`, { paidAmount: '750.00' }).json as CollectionRow;
  expect(paid).toMatchObject({ outstanding: '0.00', status: 'PAID', delayDays: 0 });
  expect(call('PATCH', `/collections/${id}`, { plannedAmount: '1.00' }).status).toBe(400);
});

test('수금 요약과 시작 이력: 완료 건은 미수에서 빠져요', () => {
  const { items } = call('GET', '/collections').json as { items: CollectionRow[] };
  const seededPaid = items.find((row) => row.invoiceNo === 'MT260929A');
  expect(seededPaid).toMatchObject({
    containers: 'VX260624A (6)',
    status: 'PAID',
    delayDays: 0,
    outstanding: '0.00',
  });
  const unpaid = items.find((row) => row.invoiceNo === 'MT261006A');
  expect(unpaid).toMatchObject({ plannedAmount: '875.00', plannedDate: '2026-11-05' });

  const summary = call('GET', '/collections/summary').json as CollectionSummary;
  expect(summary.outstandingTotal).toBe('875.00');
  expect(summary.overdueCount).toBe(today() > '2026-11-05' ? 1 : 0);
});

test('입고 등록: 중복 번호와 빠진 칸을 막고, 입고 완료면 바로 가용 재고가 돼요', () => {
  const container = {
    containerNo: 'VY261101A',
    warehouseId: 'w2',
    status: 'RECEIVED',
    receivedDate: '2026-11-01',
    tariffRate: '0',
    lines: [{ partId: 'p2', pallets: '4' }],
  };
  expect(call('POST', '/containers', { ...container, receivedDate: '' }).status).toBe(400);
  expect(call('POST', '/containers', { ...container, lines: [] }).status).toBe(400);
  expect(call('POST', '/containers', container).status).toBe(201);
  expect(call('POST', '/containers', container).status).toBe(409);

  const preview = call('POST', '/invoices/preview', {
    ...head,
    shipFromWarehouseId: 'w2',
    lines: lines('12', 'p2'),
  }).json as InvoicePreview;
  expect(preview.lines[0]?.allocation).toBe('VY260904A 10 → VY261101A 2');
  expect(preview.invoiceNo).toBe('MC261106A');
});

test('선적 중 컨테이너를 입고 처리하면 FIFO에 들어와요', () => {
  const { items } = call('GET', '/containers').json as { items: ContainerRow[] };
  const row = items.find((item) => item.containerNo === 'VX261019A');
  expect(row).toMatchObject({ status: 'IN_TRANSIT', remainingPallets: 30 });
  expect(call('POST', `/containers/${row?.containerId}/receive`, {}).status).toBe(400);
  const url = `/containers/${row?.containerId}/receive`;
  expect(call('POST', url, { receivedDate: '2026-11-04' }).status).toBe(200);
  expect(call('POST', url, { receivedDate: '2026-11-04' }).status).toBe(409);
  expect(lots().at(-1)).toMatchObject({ fifoOrder: 3, containerNo: 'VX261019A' });
});

test('다른 고객사 품번은 인보이스에 넣지 못해요. 열람자는 받기만 해요', () => {
  const saved = call('POST', '/invoices', { ...head, lines: lines('1', 'p4'), action: 'send' });
  expect(saved.status).toBe(400);

  const viewer: MockOptions = { ...reporter, role: 'VIEWER' };
  expect(call('GET', '/invoices', undefined, viewer).status).toBe(200);
  expect(call('POST', '/invoices/preview', { lines: [] }, viewer).status).toBe(200);
  expect(call('POST', '/invoices', { ...head, lines: lines('1') }, viewer).status).toBe(403);
  expect(call('POST', '/containers', {}, viewer).status).toBe(403);
  expect(call('POST', `/invoices/${first.id}/confirm`, undefined, viewer).status).toBe(403);
  expect(call('PATCH', '/collections/x', { paidDate: '2026-11-01' }, viewer).status).toBe(403);
});
