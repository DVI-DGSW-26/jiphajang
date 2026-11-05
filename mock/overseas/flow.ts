import { API } from '../../src/config/api.ts';
import { TARIFF_RATE } from '../../src/config/enums.ts';
import type { Part } from '../../src/master/master.ts';
import {
  addDays,
  collectionFigures,
  lineAmount,
  sequenceLetter,
  sumMoney,
  today,
} from '../../src/overseas/calc.ts';
import type {
  CollectionRow,
  CollectionSummary,
  ContainerRow,
  Invoice,
  InvoiceAllocation,
  InvoiceLine,
  InvoicePreview,
  PreviewLine,
  StockLotRow,
  StockRow,
} from '../../src/overseas/types.ts';
import type { MockResponse } from '../api.ts';
import { mockList } from '../list.ts';
import { DATE, DECIMAL } from '../sample.ts';
import { allocateFifo, type FifoLot } from './fifo.ts';
import {
  allParts,
  customerById,
  fail,
  type MockAction,
  partById,
  text,
  warehouseById,
} from './master.ts';
import {
  type StoredContainer,
  type StoredLot,
  seedContainers,
  seedShippedInvoices,
} from './seed.ts';

/**
 * 가짜 흐름 — 입고 → 인보이스(FIFO 예약) → 출고 확정(차감, 수금 생성) → 수금 → 재고.
 * 고친 값은 개발 서버를 끄기 전까지 남아요. 재고는 저장하지 않고 항상 계산해요.
 *
 * TODO(확인 필요) 아래는 임시 가정이에요.
 * - 재고는 작성 때 예약하고 확정 때 차감해요 (Q4)
 * - FIFO는 고른 창고 안에서, 입고 완료 컨테이너만 쓰고, 입고일이 같으면 컨테이너 번호순이에요 (Q7, Q8, Q9)
 * - 품번은 인보이스 일자와 상관없이 현재 단가를 써요 (Q2)
 * - 임시 저장에는 번호를 주지 않아요. 취소한 번호는 다시 쓰지 않아요 (Q11, Q12)
 * - BOL 없이도 확정할 수 있어요 (Q19)
 */

const POSITIVE_WHOLE = /^[1-9]\d*$/;

const containers: StoredContainer[] = seedContainers();
const invoices: Invoice[] = [];
const collections: CollectionRow[] = [];

let nextId = 1000;
const newId = (prefix: string) => `${prefix}${nextId++}`;

function allocationsOf(status: Invoice['status'], asOf?: string): InvoiceAllocation[] {
  return invoices
    .filter((invoice) => invoice.status === status)
    .filter((invoice) => {
      if (!asOf) return true;
      return (invoice.shippedDate ?? invoice.invoiceDate) <= asOf;
    })
    .flatMap((invoice) => invoice.lines.flatMap((line) => line.allocations));
}

const palletsOf = (allocations: InvoiceAllocation[], lotId: string) =>
  allocations.reduce((sum, item) => sum + (item.lotId === lotId ? item.pallets : 0), 0);

const remainingOf = (lot: StoredLot, asOf?: string) =>
  lot.openingRemaining - palletsOf(allocationsOf('SHIPPED', asOf), lot.id);

const reservedOf = (lot: StoredLot, asOf?: string) =>
  palletsOf(allocationsOf('PENDING', asOf), lot.id);

const byFifo = (a: StoredContainer, b: StoredContainer) =>
  (a.receivedDate ?? '').localeCompare(b.receivedDate ?? '') ||
  a.containerNo.localeCompare(b.containerNo);

/** 품번이 실린 입고 완료 컨테이너를 오래된 순서로 */
function fifoLots(partId: string, warehouseId: string): (FifoLot & { lot: StoredLot })[] {
  return containers
    .filter((item) => item.status === 'RECEIVED' && item.warehouseId === warehouseId)
    .sort(byFifo)
    .flatMap((item) =>
      item.lots
        .filter((lot) => lot.partId === partId)
        .map((lot) => ({
          id: lot.id,
          containerNo: item.containerNo,
          available: remainingOf(lot) - reservedOf(lot),
          lot,
        })),
    );
}

// ── 컨테이너 ────────────────────────────────────────

function containerRows(): ContainerRow[] {
  return [...containers]
    .sort((a, b) => {
      // 선적 중이 맨 위, 그다음 최근 입고 순
      if (!a.receivedDate || !b.receivedDate) return a.receivedDate ? 1 : b.receivedDate ? -1 : 0;
      return b.receivedDate.localeCompare(a.receivedDate);
    })
    .flatMap((item) =>
      item.lots.map((lot) => ({
        id: lot.id,
        containerId: item.id,
        containerNo: item.containerNo,
        warehouseId: item.warehouseId,
        warehouseName: warehouseById(item.warehouseId)?.name ?? '',
        status: item.status,
        receivedDate: item.receivedDate,
        tariffRate: item.tariffRate,
        partId: lot.partId,
        partNo: partById(lot.partId)?.partNo ?? '',
        initialPallets: lot.pallets,
        remainingPallets: remainingOf(lot),
        reservedPallets: reservedOf(lot),
      })),
    );
}

export const containerList = mockList<ContainerRow>({
  path: API.containers,
  rows: containerRows,
  inputs: [],
});

function createContainer(body: unknown): MockResponse {
  const containerNo = text(body, 'containerNo');
  const warehouseId = text(body, 'warehouseId');
  const status = text(body, 'status');
  const receivedDate = text(body, 'receivedDate');
  const tariffRate = text(body, 'tariffRate');
  if (!containerNo) return fail(400, '컨테이너 번호를 넣어 주세요.');
  if (containers.some((item) => item.containerNo === containerNo)) {
    return fail(409, '같은 번호의 컨테이너가 이미 있어요.');
  }
  if (!warehouseById(warehouseId)) return fail(400, '도착 창고를 다시 골라 주세요.');
  if (status !== 'RECEIVED' && status !== 'IN_TRANSIT')
    return fail(400, '상태를 다시 골라 주세요.');
  if (status === 'RECEIVED' && !DATE.test(receivedDate)) {
    return fail(400, '입고 완료면 입고일을 넣어 주세요.');
  }
  if (!(tariffRate in TARIFF_RATE)) return fail(400, '관세를 다시 골라 주세요.');

  const raw = (body as { lines?: unknown }).lines;
  const lines = Array.isArray(raw) ? raw : [];
  if (lines.length === 0) return fail(400, '품목을 한 줄 이상 넣어 주세요.');
  const lots: StoredLot[] = [];
  for (const line of lines) {
    const part = partById(text(line, 'partId'));
    const pallets = text(line, 'pallets');
    if (!part) return fail(400, '품번을 다시 골라 주세요.');
    if (!POSITIVE_WHOLE.test(pallets)) return fail(400, '팔레트 수는 1 이상으로 넣어 주세요.');
    if (!part.unitPrice) return fail(400, `${part.partNo}에 적용할 단가가 없어요.`);
    lots.push({
      id: newId('l'),
      partId: part.id,
      pallets: Number(pallets),
      openingRemaining: Number(pallets),
      qtyPerPallet: part.setQtyPerBox,
      unitPrice: part.unitPrice,
    });
  }
  const row: StoredContainer = {
    id: newId('ct'),
    containerNo,
    warehouseId,
    status,
    receivedDate: status === 'RECEIVED' ? receivedDate : null,
    tariffRate,
    lots,
  };
  containers.push(row);
  return { status: 201, json: { id: row.id } };
}

function receiveContainer(id: string, body: unknown): MockResponse {
  const row = containers.find((item) => item.id === id);
  if (!row) return fail(404, '이 컨테이너를 찾지 못했어요.');
  if (row.status === 'RECEIVED') return fail(409, '이미 입고 완료된 컨테이너예요.');
  const receivedDate = text(body, 'receivedDate');
  if (!DATE.test(receivedDate)) return fail(400, '입고일을 넣어 주세요.');
  row.status = 'RECEIVED';
  row.receivedDate = receivedDate;
  return { status: 200, json: { id: row.id } };
}

// ── 인보이스 ────────────────────────────────────────

const allocationText = (allocations: { containerNo: string; pallets: number }[]) =>
  allocations.map((item) => `${item.containerNo} ${item.pallets}`).join(' → ');

type RawLine = { partId: string; boxQty: string };

function readRawLines(body: unknown): RawLine[] {
  const raw = body && typeof body === 'object' ? (body as { lines?: unknown }).lines : null;
  return (Array.isArray(raw) ? raw : []).map((line) => ({
    partId: text(line, 'partId'),
    boxQty: text(line, 'boxQty'),
  }));
}

type Computed = {
  lines: PreviewLine[];
  allocations: FifoLotAllocation[][];
  availability: InvoicePreview['availability'];
};
type FifoLotAllocation = { lotId: string; containerNo: string; pallets: number };

/** 줄마다 금액과 FIFO 배정을 계산해요. 같은 품번이 두 줄이면 앞줄이 쓴 만큼 빼요 */
function computeLines(raw: RawLine[], warehouseId: string): Computed {
  const used = new Map<string, number>();
  const seen = new Map<string, InvoicePreview['availability'][number]>();
  const lines: PreviewLine[] = [];
  const allocations: FifoLotAllocation[][] = [];

  for (const line of raw) {
    const part = partById(line.partId);
    const box = POSITIVE_WHOLE.test(line.boxQty) ? Number(line.boxQty) : null;
    if (!part) {
      lines.push({
        partId: line.partId,
        partNo: '',
        boxQty: box,
        setQty: null,
        totalQty: null,
        unitPrice: null,
        amount: null,
        allocation: '',
        shortage: 0,
      });
      allocations.push([]);
      continue;
    }
    const lots = warehouseId ? fifoLots(part.id, warehouseId) : [];
    if (!seen.has(part.id)) {
      seen.set(part.id, {
        partId: part.id,
        partNo: part.partNo,
        availablePallets: lots.reduce((sum, lot) => sum + Math.max(lot.available, 0), 0),
        allocatedPallets: 0,
      });
    }
    const result = allocateFifo(
      lots.map((lot) => ({ ...lot, available: lot.available - (used.get(lot.id) ?? 0) })),
      box ?? 0,
    );
    for (const item of result.allocations) {
      used.set(item.lotId, (used.get(item.lotId) ?? 0) + item.pallets);
    }
    const availability = seen.get(part.id);
    if (availability) {
      availability.allocatedPallets += result.allocations.reduce(
        (sum, item) => sum + item.pallets,
        0,
      );
    }
    const totalQty = box === null ? null : part.setQtyPerBox * box;
    lines.push({
      partId: part.id,
      partNo: part.partNo,
      boxQty: box,
      setQty: part.setQtyPerBox,
      totalQty,
      unitPrice: part.unitPrice,
      amount: totalQty !== null && part.unitPrice ? lineAmount(totalQty, part.unitPrice) : null,
      allocation: allocationText(result.allocations),
      shortage: warehouseId ? result.shortage : 0,
    });
    allocations.push(result.allocations);
  }
  return { lines, allocations, availability: [...seen.values()] };
}

function nextInvoiceNo(first: Part, invoiceDate: string): string {
  const prefix = `${first.productCode}${invoiceDate.slice(2).replaceAll('-', '')}`;
  const count = invoices.filter((item) => item.invoiceNo?.startsWith(prefix)).length;
  return `${prefix}${sequenceLetter(count)}`;
}

const partNosText = (lines: { partNo: string }[]) => {
  const [first] = lines;
  if (!first) return '';
  return lines.length > 1 ? `${first.partNo} 외 ${lines.length - 1}` : first.partNo;
};

function preview(body: unknown): MockResponse {
  const customer = customerById(text(body, 'customerId'));
  const warehouseId = text(body, 'shipFromWarehouseId');
  const invoiceDate = text(body, 'invoiceDate');
  const validDate = DATE.test(invoiceDate);
  const { lines, availability } = computeLines(readRawLines(body), warehouseId);
  const first = partById(lines[0]?.partId ?? '');
  const result: InvoicePreview = {
    invoiceNo: first && validDate ? nextInvoiceNo(first, invoiceDate) : null,
    shipTo: customer?.shipTo ?? null,
    paymentTerms: customer ? `Net${customer.paymentTermDays}` : null,
    dueDate: customer && validDate ? addDays(invoiceDate, customer.paymentTermDays) : null,
    lines,
    totalPallets: lines.reduce((sum, line) => sum + (line.boxQty ?? 0), 0),
    totalQty: lines.reduce((sum, line) => sum + (line.totalQty ?? 0), 0),
    totalAmount: sumMoney(lines.map((line) => line.amount)),
    availability,
  };
  return { status: 200, json: result };
}

/** 본문을 읽어 인보이스를 만들어요. 임시 저장은 예약하지 않고, 보내면 번호를 주고 예약해요 */
function buildInvoice(
  body: unknown,
  send: boolean,
  id: string,
): { invoice: Invoice } | { failure: MockResponse } {
  const customer = customerById(text(body, 'customerId'));
  const warehouseId = text(body, 'shipFromWarehouseId');
  const warehouse = warehouseById(warehouseId);
  const invoiceDate = text(body, 'invoiceDate');
  if (!customer) return { failure: fail(400, '고객사를 다시 골라 주세요.') };
  if (!warehouse) return { failure: fail(400, '출고 창고를 다시 골라 주세요.') };
  if (!DATE.test(invoiceDate)) return { failure: fail(400, '인보이스 일자를 넣어 주세요.') };

  const raw = readRawLines(body);
  if (send && raw.length === 0) return { failure: fail(400, '품목을 한 줄 이상 넣어 주세요.') };
  const { lines, allocations } = computeLines(raw, warehouseId);
  const invoiceLines: InvoiceLine[] = [];
  for (const [index, line] of lines.entries()) {
    const part = partById(line.partId);
    if (!part || part.customerId !== customer.id) {
      return { failure: fail(400, '이 고객사의 품번을 골라 주세요.') };
    }
    if (line.boxQty === null || line.setQty === null || line.totalQty === null) {
      return { failure: fail(400, 'Box QTY는 1 이상으로 넣어 주세요.') };
    }
    if (!line.unitPrice || !line.amount) {
      return { failure: fail(400, `${part.partNo}에 적용할 단가가 없어요.`) };
    }
    if (send && line.shortage > 0) {
      return {
        failure: fail(
          409,
          `${part.partNo} 재고가 ${line.shortage}팔레트 모자라요. 가용 재고를 확인해 주세요.`,
        ),
      };
    }
    invoiceLines.push({
      partId: line.partId,
      partNo: line.partNo,
      boxQty: line.boxQty,
      setQty: line.setQty,
      totalQty: line.totalQty,
      unitPrice: line.unitPrice,
      amount: line.amount,
      allocation: send ? line.allocation : '',
      allocations: send ? (allocations[index] ?? []) : [],
    });
  }

  const first = partById(invoiceLines[0]?.partId ?? '');
  return {
    invoice: {
      id,
      invoiceNo: send && first ? nextInvoiceNo(first, invoiceDate) : null,
      customerId: customer.id,
      customerName: customer.name,
      shipFromWarehouseId: warehouseId,
      warehouseName: warehouse.name,
      invoiceDate,
      poNo: text(body, 'poNo') || null,
      shipTo: customer.shipTo,
      paymentTerms: `Net${customer.paymentTermDays}`,
      dueDate: addDays(invoiceDate, customer.paymentTermDays),
      status: send ? 'PENDING' : 'DRAFT',
      lines: invoiceLines,
      partNos: partNosText(invoiceLines),
      totalPallets: invoiceLines.reduce((sum, line) => sum + line.boxQty, 0),
      totalQty: invoiceLines.reduce((sum, line) => sum + line.totalQty, 0),
      totalAmount: sumMoney(invoiceLines.map((line) => line.amount)),
      shippedDate: null,
      bolFiles: [],
    },
  };
}

const wantsSend = (body: unknown) => text(body, 'action') === 'send';

function createInvoice(body: unknown): MockResponse {
  const built = buildInvoice(body, wantsSend(body), newId('inv'));
  if ('failure' in built) return built.failure;
  invoices.unshift(built.invoice);
  return { status: 201, json: built.invoice };
}

const findInvoice = (id: string) => invoices.find((item) => item.id === id);

function updateDraft(id: string, body: unknown): MockResponse {
  const index = invoices.findIndex((item) => item.id === id);
  const current = invoices[index];
  if (!current) return fail(404, '이 인보이스를 찾지 못했어요.');
  if (current.status !== 'DRAFT') return fail(409, '임시 저장 상태만 고칠 수 있어요.');
  const built = buildInvoice(body, wantsSend(body), id);
  if ('failure' in built) return built.failure;
  invoices[index] = built.invoice;
  return { status: 200, json: built.invoice };
}

function cancelInvoice(id: string): MockResponse {
  const invoice = findInvoice(id);
  if (!invoice) return fail(404, '이 인보이스를 찾지 못했어요.');
  if (invoice.status !== 'PENDING') return fail(409, '출고 대기 상태만 취소할 수 있어요.');
  invoice.status = 'CANCELED';
  return { status: 200, json: invoice };
}

const deriveCollection = (row: CollectionRow): CollectionRow => ({
  ...row,
  ...collectionFigures(row, today()),
});

function addCollection(invoice: Invoice, id: string, containerText: string): void {
  collections.unshift(
    deriveCollection({
      id,
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo ?? '',
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      containers: containerText,
      plannedAmount: invoice.totalAmount,
      plannedDate: invoice.dueDate,
      paidDate: null,
      paidAmount: null,
      delayDays: null,
      outstanding: invoice.totalAmount,
      status: 'UNPAID',
      isOverdue: false,
    }),
  );
}

/** 출고 확정 — 예약을 실제 차감으로 바꾸고 수금을 만들어요 */
function confirmInvoice(id: string): MockResponse {
  const invoice = findInvoice(id);
  if (!invoice) return fail(404, '이 인보이스를 찾지 못했어요.');
  if (invoice.status !== 'PENDING') return fail(409, '출고 대기 상태만 확정할 수 있어요.');
  invoice.status = 'SHIPPED';
  invoice.shippedDate = today();
  const pallets = new Map<string, number>();
  for (const item of invoice.lines.flatMap((line) => line.allocations)) {
    pallets.set(item.containerNo, (pallets.get(item.containerNo) ?? 0) + item.pallets);
  }
  addCollection(
    invoice,
    newId('col'),
    [...pallets].map(([containerNo, count]) => `${containerNo} (${count})`).join(', '),
  );
  return { status: 200, json: invoice };
}

function attachBol(id: string, body: unknown): MockResponse {
  const invoice = findInvoice(id);
  if (!invoice) return fail(404, '이 인보이스를 찾지 못했어요.');
  if (invoice.status !== 'PENDING') return fail(409, '출고 대기 상태에서만 첨부할 수 있어요.');
  const raw = (body as { fileNames?: unknown } | null)?.fileNames;
  const names = Array.isArray(raw) ? raw.filter((name) => typeof name === 'string') : [];
  if (names.length === 0) return fail(400, '첨부할 파일을 골라 주세요.');
  invoice.bolFiles.push(...(names as string[]));
  return { status: 200, json: invoice };
}

export const invoiceList = mockList<Invoice>({
  path: API.invoices,
  rows: () => invoices,
  date: (row) => row.invoiceDate,
  inputs: [],
});

// ── 수금 ────────────────────────────────────────────

function collectionRows(): CollectionRow[] {
  collections.forEach((row, index) => {
    collections[index] = deriveCollection(row);
  });
  return collections;
}

export const collectionList = mockList<CollectionRow>({
  path: API.collections,
  rows: collectionRows,
  date: (row) => row.plannedDate,
  inputs: ['paidDate', 'paidAmount'],
  check: (key, value) => {
    if (key === 'paidDate' && !DATE.test(value)) return '수금일은 YYYY-MM-DD로 넣어 주세요.';
    if (key === 'paidAmount' && !DECIMAL.test(value)) return '실적 금액은 0 이상으로 넣어 주세요.';
    return null;
  },
  checkRow: (row) =>
    Number(row.paidAmount ?? 0) > 0 && !row.paidDate ? '수금일을 먼저 넣어 주세요.' : null,
  derive: deriveCollection,
});

function collectionSummary(): MockResponse {
  const rows = collectionRows();
  const month = today().slice(0, 7);
  const summary: CollectionSummary = {
    outstandingTotal: sumMoney(rows.map((row) => row.outstanding)),
    dueThisMonth: sumMoney(
      rows.filter((row) => row.plannedDate.startsWith(month)).map((row) => row.outstanding),
    ),
    overdueCount: rows.filter((row) => row.isOverdue).length,
  };
  return { status: 200, json: summary };
}

// ── 재고 ────────────────────────────────────────────

const asOfOf = (params: URLSearchParams) => {
  const value = params.get('asOf') ?? '';
  return DATE.test(value) ? value : today();
};

/** 지난 기준일이면 그날까지의 출고만 세요. 오늘이면 날짜를 앞으로 적은 예약까지 모두 세요 */
const cutOff = (asOf: string) => (asOf < today() ? asOf : undefined);

function stockByCustomer(params: URLSearchParams): MockResponse {
  const asOf = asOfOf(params);
  const cut = cutOff(asOf);
  const warehouseId = params.get('warehouseId');
  const rows = new Map<string, StockRow>();
  for (const item of containers) {
    if (warehouseId && item.warehouseId !== warehouseId) continue;
    const received = item.status === 'RECEIVED' && (item.receivedDate ?? '') <= asOf;
    for (const lot of item.lots) {
      const part = partById(lot.partId);
      if (!part) continue;
      const key = `${item.warehouseId}/${part.id}`;
      const row = rows.get(key) ?? {
        id: key,
        warehouseId: item.warehouseId,
        warehouseName: warehouseById(item.warehouseId)?.name ?? '',
        customerName: part.customerName,
        partId: part.id,
        partNo: part.partNo,
        onHandQty: 0,
        reservedQty: 0,
        inTransitQty: 0,
        unitPrice: part.unitPrice,
        stockAmount: '0.00',
      };
      if (received) row.onHandQty += remainingOf(lot, cut) * lot.qtyPerPallet;
      else row.inTransitQty += lot.pallets * lot.qtyPerPallet;
      row.reservedQty += reservedOf(lot, cut) * lot.qtyPerPallet;
      row.stockAmount = lineAmount(row.onHandQty, row.unitPrice ?? '0');
      rows.set(key, row);
    }
  }
  const items = [...rows.values()].sort(
    (a, b) =>
      a.warehouseName.localeCompare(b.warehouseName) ||
      a.customerName.localeCompare(b.customerName) ||
      a.partNo.localeCompare(b.partNo),
  );
  return { status: 200, json: { items, total: items.length } };
}

function stockByContainer(params: URLSearchParams): MockResponse {
  const asOf = asOfOf(params);
  const cut = cutOff(asOf);
  const partId = params.get('partId') ?? '';
  const warehouseId = params.get('warehouseId');
  if (!partById(partId)) return fail(400, '품번을 골라 주세요.');
  const scoped = containers.filter(
    (item) =>
      (!warehouseId || item.warehouseId === warehouseId) &&
      item.lots.some((lot) => lot.partId === partId),
  );
  const isReceived = (item: StoredContainer) =>
    item.status === 'RECEIVED' && (item.receivedDate ?? '') <= asOf;
  const ordered = [
    ...scoped.filter(isReceived).sort(byFifo),
    ...scoped.filter((c) => !isReceived(c)),
  ];
  let order = 0;
  const items: StockLotRow[] = ordered.flatMap((item) =>
    item.lots
      .filter((lot) => lot.partId === partId)
      .map((lot) => {
        const received = isReceived(item);
        if (received) order += 1;
        return {
          id: lot.id,
          fifoOrder: received ? order : null,
          containerNo: item.containerNo,
          receivedDate: received ? item.receivedDate : null,
          initialPallets: lot.pallets,
          remainingPallets: received ? remainingOf(lot, cut) : lot.pallets,
          reservedPallets: reservedOf(lot, cut),
          unitPrice: lot.unitPrice,
          tariffRate: TARIFF_RATE[item.tariffRate as keyof typeof TARIFF_RATE] ?? item.tariffRate,
        };
      }),
  );
  return { status: 200, json: { items, total: items.length } };
}

// ── 시작 이력 ───────────────────────────────────────

/** 출고를 마친 인보이스 이력을 넣어요. 잔량은 시드에 이미 반영돼 있어 `lotId`가 `null`이에요 */
function seedHistory(): void {
  const part = allParts().find((item) => item.id === 'p1');
  const customer = customerById('c1');
  const warehouse = warehouseById('w1');
  if (!part?.unitPrice || !customer || !warehouse) return;
  for (const seed of seedShippedInvoices()) {
    const totalQty = part.setQtyPerBox * seed.boxQty;
    const amount = lineAmount(totalQty, part.unitPrice);
    const allocations = [{ lotId: null, containerNo: seed.containerNo, pallets: seed.boxQty }];
    const invoice: Invoice = {
      id: seed.id,
      invoiceNo: seed.invoiceNo,
      customerId: customer.id,
      customerName: customer.name,
      shipFromWarehouseId: warehouse.id,
      warehouseName: warehouse.name,
      invoiceDate: seed.invoiceDate,
      poNo: null,
      shipTo: customer.shipTo,
      paymentTerms: `Net${customer.paymentTermDays}`,
      dueDate: addDays(seed.invoiceDate, customer.paymentTermDays),
      status: 'SHIPPED',
      lines: [
        {
          partId: part.id,
          partNo: part.partNo,
          boxQty: seed.boxQty,
          setQty: part.setQtyPerBox,
          totalQty,
          unitPrice: part.unitPrice,
          amount,
          allocation: allocationText(allocations),
          allocations,
        },
      ],
      partNos: part.partNo,
      totalPallets: seed.boxQty,
      totalQty,
      totalAmount: amount,
      shippedDate: seed.invoiceDate,
      bolFiles: [],
    };
    invoices.push(invoice);
    addCollection(invoice, `col-${seed.id}`, `${seed.containerNo} (${seed.boxQty})`);
    const row = collections[0];
    if (row && seed.paidAmount) {
      collections[0] = deriveCollection({
        ...row,
        paidAmount: seed.paidAmount,
        paidDate: seed.paidDate,
      });
    }
  }
}
seedHistory();

// ── 경로 ────────────────────────────────────────────

const RECEIVE = /^\/containers\/([^/]+)\/receive$/;
const INVOICE_ACTION = /^\/invoices\/([^/]+)\/(cancel|confirm|attachments)$/;
const INVOICE = /^\/invoices\/([^/]+)$/;

/** 목록 받기·칸 고치기(`mockList`) 말고 흐름에서 더 받는 요청 */
export function flowAction(method: string, pathname: string): MockAction | null {
  if (method === 'POST' && pathname === API.containers) {
    return { write: true, run: createContainer };
  }
  if (method === 'POST' && pathname === API.invoicePreview) return { write: false, run: preview };
  if (method === 'POST' && pathname === API.invoices) return { write: true, run: createInvoice };
  if (method === 'GET' && pathname === API.collectionSummary) {
    return { write: false, run: collectionSummary };
  }
  if (method === 'GET' && pathname === API.stockByCustomer) {
    return { write: false, run: (_body, params) => stockByCustomer(params) };
  }
  if (method === 'GET' && pathname === API.stockByContainer) {
    return { write: false, run: (_body, params) => stockByContainer(params) };
  }

  const receive = RECEIVE.exec(pathname);
  if (method === 'POST' && receive?.[1]) {
    const id = decodeURIComponent(receive[1]);
    return { write: true, run: (body) => receiveContainer(id, body) };
  }

  const action = INVOICE_ACTION.exec(pathname);
  if (method === 'POST' && action?.[1]) {
    const id = decodeURIComponent(action[1]);
    if (action[2] === 'cancel') return { write: true, run: () => cancelInvoice(id) };
    if (action[2] === 'confirm') return { write: true, run: () => confirmInvoice(id) };
    return { write: true, run: (body) => attachBol(id, body) };
  }

  const invoice = INVOICE.exec(pathname);
  if (invoice?.[1] && pathname !== API.invoicePreview) {
    const id = decodeURIComponent(invoice[1]);
    if (method === 'GET') {
      return {
        write: false,
        run: () => {
          const row = findInvoice(id);
          return row ? { status: 200, json: row } : fail(404, '이 인보이스를 찾지 못했어요.');
        },
      };
    }
    if (method === 'PUT') return { write: true, run: (body) => updateDraft(id, body) };
  }
  return null;
}
