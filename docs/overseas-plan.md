# 해외 출고 전산화 — 작업 계획 (초안)

> **검토 중인 초안이에요. 확인이 끝나기 전에는 구현을 시작하지 않아요.**
> 미확정 사항은 9장 질문으로 남겼고, 임시 동작은 mock에서만 써요.
>
> **이 저장소는 공개예요.** 고객사·창고 이름, 품번, 단가, 수량은 `고객사 A`, `창고 1`, `P1`처럼 바꿔 적어요(`source-analysis.md`와 같은 규칙).
> 아래 값은 모두 예시이고, 샘플의 구조만 따랐어요.

## 1. 현재 상태

| 영역 | 지금 모습 | 위치 |
|---|---|---|
| 메뉴 | Invoice · 출하 원장 · 결과 · 재고·선적 · 마스터. 첫 화면은 출하 원장 | `src/menu.ts`, `src/App.tsx` |
| 동작하는 화면 | 출하 원장, 수출신고취합, 현지 Invoice List. 가짜 서버 기준이고 열은 잠정 | `src/ledger/`, `src/results/` |
| 빈 화면 | Invoice, 재고·선적, 마스터 | `src/pages/MenuPages.tsx` |
| 목록 틀 | 기간을 골라 전체 행을 받고, 표에서 칸을 고치면 `PATCH`로 저장 | `src/lists/ListScreen.tsx`, `src/lib/useList.ts` |
| 공통 표 | 필터·정렬, 범위 복사, 칸 수정, 합계줄, 보기 설정 기억, xlsx 다운로드 | `src/components/grid/` |
| 가짜 서버 | 로그인 흉내와 목록 받기·고치기(`GET`/`PATCH`)만 처리 | `mock/api.ts`, `mock/list.ts`, `mock/plugin.ts` |
| 로그인·연결 | Keycloak 연동, 만료 시 팝업 재로그인, 연결 끊김 시 재전송(POST 제외) | `src/lib/auth.ts`, `src/lib/api.ts` |
| 자료 분석 | 부정확한 자료로 만든 잠정 문서. 흐름과 질문은 참고하되 파일 모양은 믿지 않아요 | `docs/source-analysis.md` |

## 2. 기획과 기존 코드의 차이

### 유지

- 로그인과 역할(보고자·열람자), `apiFetch`의 만료·재연결 처리
- 공통 표, `ListScreen`, 기간 필터, xlsx 다운로드, 토스트, 확인 창
- API 공통 약속: 날짜 `YYYY-MM-DD`, 금액·단가는 문자열, 오류는 `{ message }`, 목록은 `{ items, total }`
- 가짜 서버 구조(`vite --mode mock`, `MOCK_ROLE` 등 상황 설정)

### 수정

| 대상 | 지금 | 바꿀 내용 |
|---|---|---|
| `src/menu.ts`, `src/App.tsx`, `src/App.test.tsx` | 메뉴 5개 + 결과 목록 | 3장의 메뉴 6개로 |
| `useList`, `ListScreen` | 기간이 꼭 있어야 해요 | 기간 없는 목록(마스터), 기준일 목록(재고), 표 위 요약 칸 지원 |
| `Field` | `input`만 있어요 | 고르기 칸(고객사·창고·품번) 추가 |
| `mock/api.ts`, `mock/plugin.ts` | `GET`·`PATCH`, JSON 응답만 | `POST`, 첨부 파일, 파일 응답 추가 |
| `SourceTag` | 판독 · 계산 · 마스터 | 그대로 두되 새 화면은 계산·마스터만 써요. `판독`은 이관을 정한 뒤 판단 |
| 인보이스 흐름 | 엑셀 업로드 → 판독 → 원장 | 화면에서 직접 작성. 업로드는 과거 데이터 이관용으로만 |

### 범위 외로 숨김

메뉴와 라우트에서만 빼고 **코드는 지우지 않아요.** 국내 출고를 시작할 때 다시 쓸 수 있어요.

| 대상 | 처리 |
|---|---|
| 수출신고취합 (`src/results/ExportDeclarationsPage.tsx`) | 숨김. 국내 출고 범위 |
| U71X Offset, 결과 목록 (`src/pages/ResultPages.tsx`) | 숨김 |
| 출하 원장 (`src/ledger/`) | 숨김. 한국·현지를 합친 화면이라 새 흐름과 맞지 않아요 |
| 현지 Invoice List (`src/results/LocalInvoicesPage.tsx`) | 숨김. 보고서 범위가 정해지면 열을 다시 맞춰 재사용 검토(Q20) |
| PO 관리, 재고 소진 역추적 | 만들지 않아요. 인보이스에 PO 번호 칸만 둘 수 있어요(Q5) |

## 3. 메뉴 재구성안

업무 순서대로 놓아요.

| 메뉴 | 주소 | 화면 |
|---|---|---|
| 컨테이너 입고 | `/containers` | 등록 양식 + 최근 입고 목록 |
| 인보이스 작성 | `/invoices/new` | 작성 양식. 저장한 건은 `/invoices/:id`에서 봐요 |
| 출고 확정 | `/shipments` | 인보이스 목록, BOL 첨부, 확정 |
| 수금 관리 | `/collections` | 요약 + 수금 목록 |
| 재고 현황 | `/stock` | 고객사별 재고 + 컨테이너별 잔량 |
| 마스터 | `/master/parts`, `/customers`, `/warehouses` | 탭 3개 |

- 첫 화면(`HOME_PATH`)은 `/invoices/new`로 제안해요. 매일 가장 많이 쓸 화면이라고 봤어요.
- 저장된 인보이스를 찾아 보는 입구는 출고 확정 목록이에요. 별도 인보이스 목록 메뉴는 두지 않아요.
- 열람자에게는 입력 칸과 버튼을 숨기고 조회와 내려받기만 열어요. 실제 권한 검사는 서버가 해요.
- 메뉴 이름은 와이어프레임 기준이에요.

## 4. 화면별 구성

새 코드는 기능별 폴더(`src/containers/`, `src/invoices/`, `src/shipments/`, `src/collections/`, `src/stock/`, `src/master/`)에 둬요.

| 화면 | 구성 | 공통 표 활용 |
|---|---|---|
| 컨테이너 입고 | 등록 양식(`Field`, 고르기 칸) → 품번을 고르면 팔레트당 수량·단가·총수량·금액 표시 | 최근 입고 목록: `ListScreen` + `Grid`(읽기 전용) |
| 인보이스 작성 | 머리 양식 + **품목 줄 편집기** + FIFO 배정 표시 + 합계 + 저장 | `Grid`가 아니라 `DataTable` 칸에 입력칸을 넣어요. `Grid`는 행 추가를 지원하지 않아요 |
| 인보이스 상세 | 머리·품목·배정 보기, 출력 단추, 상태 | `DataTable` |
| 출고 확정 | 기간 필터 + 목록. 행마다 BOL 첨부·출고 확정 단추 | `ListScreen` + `Grid`. 고객사·창고·상태는 열 필터로 걸러요. 단추는 `render`로 넣어요 |
| 수금 관리 | 요약 칸 3개(미수금 합계, 이번 달 수금 예정, 지연 건수) + 목록 | `Grid`. 지연 행은 `rowNeedsCheck`로 강조. 입금 입력은 Q15에 따라 칸 수정 또는 작은 창 |
| 재고 현황 | 기준일 + 표 2개 | `Grid` 2개(읽기 전용). `viewId`를 각각 줘요. 합계줄과 다운로드 사용 |
| 마스터 | 탭 3개. 추가는 작은 창, 값 수정은 칸 수정 | `Grid` + `onEdit`. 단가 이력은 작은 창의 `DataTable` |

**화면에서 계산하지 않아요.** 번호, 금액, FIFO 배정, 재고, 지연일은 모두 서버 응답을 그대로 보여줘요(`/invoices/preview`). 미확정 규칙이 바뀌어도 화면 코드는 거의 그대로이고, 표시 칸만 조정하면 돼요.

### 공통 부품에 더할 것

| 부품 | 내용 | 비고 |
|---|---|---|
| `SelectField` | 라벨·오류 문구가 `Field`와 같은 고르기 칸. 품번은 검색 필요 | 새로 |
| 폼 창 | `ConfirmDialog`와 같은 모양의 입력 창 | 새로 |
| `useList` | `period`를 생략하거나 `asOf`를 보낼 수 있게 | 기존 호출은 그대로 동작해야 해요 |
| `ListScreen` | 표 위 요약 칸 | 수금 단계에서. 마스터는 탭이 있어 `MasterList`를 따로 뒀어요 |
| `Grid` 행 단추 | `render`로 넣을 수 있지만, 칸 선택(끌기·키보드)과 충돌하는지 **구현 전에 확인** | 충돌하면 고쳐요 |
| 파일 첨부 | BOL·사진 올리기. `apiFetch`에 `FormData`를 넘기는 방식 | 새로 |
| 인보이스 출력 | `xlsx.ts`는 시트 하나짜리 표 전용이라 고객사별 양식을 못 만들어요. PDF 기능도 아직 없어요 | 서버 출력을 제안(Q22) |
| 이관 파일 읽기 | 저장소에 xlsx 읽기 기능이 없어요 | 서버 처리를 제안(Q21) |

## 5. 데이터 구조·API 초안 (서버 담당 전달용)

### 5.1 원칙

1. **재고는 입력값이 아니라 계산값이에요.** 남은 팔레트를 직접 고치는 API를 두지 않아요.
2. **단가는 덮어쓰지 않아요.** 적용일과 함께 새 행을 추가해요.
3. **발행한 문서는 그때 값을 보관해요.** 인보이스 줄과 수금은 마스터가 바뀌어도 변하지 않게 스냅샷을 가져요.
4. **미확정 규칙은 서버 한 곳에 모아요.** 단가 결정, 차감 시점, 번호 규칙을 함수나 설정으로 분리해요.
5. **동시 작업을 막아요.** FIFO 배정과 재고 검사는 저장 트랜잭션 안에서 다시 해요. 미리보기 결과는 믿지 않아요.

### 5.2 데이터 구조

금액·단가는 문자열(decimal)이에요. `*`는 스냅샷, `(계산)`은 저장값으로 고칠 수 없는 값이에요.

**고객사 `customer`**: `id`, `name`, `shipToName`(납품처), `paymentTermDays`(Net30 → 30)

**창고 `warehouse`**: `id`, `name`, `region`(nullable)

**품번 `part`**: `id`, `partNo`, `customerId`, `customerName`(계산), `productCode`, `project`(nullable), `setQty`, `unitPrice`(계산: 오늘 적용 단가), `priceEffectiveFrom`(계산)

**단가 이력 `part_price`**: `id`, `partId`, `unitPrice`, `effectiveFrom`, `createdAt`, `createdBy`, `current`(계산) — 고치거나 지우지 않고 추가만 해요. 같은 적용일이면 나중에 추가한 값이 적용돼요(잘못 넣은 단가를 이력을 남기며 바로잡는 방법이에요)

**컨테이너 `container`**: `id`, `containerNo`, `warehouseId`, `status`(`IN_TRANSIT` / `RECEIVED`), `receivedOn`(nullable), `tariff`(형식은 Q16), `origin`(`MANUAL` / `MIGRATION`)

**컨테이너 품목 `container_lot`**: `id`, `containerId`, `partId`, `initialPallets`, `setQty*`, `unitPrice*`, `remainingPallets`(계산), `reservedPallets`(계산), `availablePallets`(계산)

- 화면은 컨테이너 하나에 품번 하나로 받지만, 저장은 한 층 나눠요. 한 컨테이너에 여러 품번이 실릴 수 있으면(Q10) 표 구조를 바꾸지 않아도 돼요.

**인보이스 `invoice`**: `id`, `invoiceNo`, `customerId`, `warehouseId`, `invoiceDate`, `poNo`(nullable), `status`(`PENDING_SHIPMENT` / `SHIPPED`, 취소는 Q12), `shipToName*`, `paymentTermDays*`, `dueDate`(계산), `totalAmount`(계산), `shippedOn`(nullable), `origin`(`MANUAL` / `MIGRATION`)

**인보이스 줄 `invoice_line`**: `id`, `invoiceId`, `lineNo`, `partId`, `partNo*`, `setQty*`, `boxQty`, `unitPrice*`, `totalQty`(계산), `amount`(계산)

**출고 배정 `shipment_allocation`**: `id`, `invoiceLineId`, `containerLotId`, `pallets`, `seq`. 예약·차감 상태는 인보이스 상태에서 구해요.

**첨부 `shipment_attachment`**: `id`, `invoiceId`, `fileName`, `contentType`, `size`, `uploadedAt`, `uploadedBy`

**수금 `collection`**: `id`, `invoiceId`, `plannedOn`, `plannedAmount`, `receivedAmount`(계산), `outstanding`(계산), `delayDays`(계산, nullable)

**입금 `payment`**: `id`, `collectionId`, `paidOn`, `amount`, `createdBy` — 부분 입금을 위해 수금과 분리해요

```
customer 1─N part 1─N part_price
warehouse 1─N container 1─N container_lot N─1 part
customer 1─N invoice N─1 warehouse
invoice 1─N invoice_line 1─N shipment_allocation N─1 container_lot
invoice 1─1 collection 1─N payment
invoice 1─N shipment_attachment
```

### 5.3 재고 계산

```
remainingPallets = initialPallets − Σ 배정(인보이스 SHIPPED)
reservedPallets  = Σ 배정(인보이스 PENDING_SHIPMENT)
availablePallets = remainingPallets − reservedPallets   (RECEIVED 컨테이너만, Q8)
```

위 식은 "작성 시 예약, 확정 시 차감" 가정이에요(Q4). 바뀌면 서버 식과 표시 칸만 조정해요.

### 5.4 API

`/api` 아래예요. 목록은 공통 약속(`from`, `to`, `page`, `size` → `{ items, total }`)을 따라요. 마스터처럼 기간이 없는 목록은 `from`·`to`를 생략할 수 있어야 해서 **서버와 새로 맞춰야 해요.**

| 메서드 · 경로 | 용도 | 비고 |
|---|---|---|
| `GET·POST /master/customers`, `PATCH …/{id}` | 고객사 | |
| `GET·POST /master/warehouses`, `PATCH …/{id}` | 창고 | |
| `GET·POST /master/parts`, `PATCH …/{id}` | 품번 | 단가는 여기서 못 고쳐요. `POST` 본문에 첫 `unitPrice`·`effectiveFrom` 포함 |
| `GET·POST /master/parts/{id}/prices` | 단가 이력 조회·추가 | `POST` 응답은 현재 단가까지 다시 구한 품번 행. `PATCH`·`DELETE` 없음 |
| `GET·POST /containers`, `PATCH …/{id}` | 입고 목록·등록, 상태·입고일 변경 | 배정이 있으면 팔레트 수 변경 거부(409) |
| `POST /invoices/preview` | 저장 없이 번호·금액·배정·재고 부족 계산 | 번호는 예상값 |
| `POST /invoices` | 저장, 번호 발급, 배정 | 재고 부족이면 409 |
| `GET /invoices`, `GET /invoices/{id}` | 목록(`status` 필터), 상세(줄·배정 포함) | |
| `GET /invoices/{id}/document?format=xlsx\|pdf` | 고객사별 양식 출력 | 담당은 Q22 |
| `POST /invoices/{id}/attachments` | BOL·사진 올리기 | `multipart/form-data` |
| `GET /invoices/{id}/attachments/{fileId}` | 내려받기 | |
| `POST /invoices/{id}/confirm-shipment` | 출고 확정: 차감, 수금 생성 | 이미 확정이면 409 |
| `GET /collections`, `GET /collections/summary` | 수금 목록, 요약 3개 | 요약에 `month` |
| `POST /collections/{id}/payments` | 입금 등록 | 입금 정정은 Q15 |
| `GET /stock/by-customer?asOf=` | 고객사별 재고 | 재고 금액 기준은 Q17 |
| `GET /stock/by-lot?asOf=&partId=&warehouseId=` | 컨테이너별 잔량(FIFO 순서) | |
| `POST /migrations/opening-balance` | 기준일 잔액 이관 | 방식은 Q21 |

수정·취소 API는 Q12가 정해진 뒤 추가해요.

**미리보기 응답 예시**

```json
{
  "invoiceNo": "MT261106A",
  "dueDate": "2026-12-06",
  "shipToName": "납품처 A",
  "lines": [
    {
      "lineNo": 1,
      "partId": "p1",
      "setQty": 100,
      "boxQty": 6,
      "totalQty": 600,
      "unitPrice": "1.2500",
      "amount": "750.00",
      "allocations": [
        { "containerLotId": "l1", "containerNo": "VX260807A", "pallets": 1 },
        { "containerLotId": "l2", "containerNo": "VX260915A", "pallets": 5 }
      ],
      "shortage": 0
    }
  ],
  "totalAmount": "750.00"
}
```

**재고 부족 응답(409)**: 공통 모양에 상세를 더해요. `{ "message": "...", "shortages": [{ "partId": "p1", "requested": 22, "available": 21 }] }`

**중복 저장 방지:** 화면은 POST를 자동으로 다시 보내지 않아요(`src/lib/api.ts`). 하지만 응답만 유실되면 사람이 다시 누를 수 있어요. `POST /invoices`, `/payments`는 `Idempotency-Key` 헤더로 중복을 막아 주길 제안해요.

### 5.5 계산 규칙 (기획 기준)

| 값 | 식 | 예시(가상 값) |
|---|---|---|
| Total QTY | Set QTY × Box QTY | 100 × 6 = 600 |
| Total Amount | Total QTY × Unit Price | 600 × 1.2500 = 750.00 |
| 인보이스 번호 | 제품코드 + YYMMDD + 순번 | MT261106A (Q11) |
| 수금 계획일 | 인보이스 일자 + 결제조건 일수 | 2026-11-06 + 30 = 2026-12-06 |
| 지연일 | 수금일 − 계획일. 수금 전이면 오늘 − 계획일. 계획일 전이면 표시 안 함 | Q15 |
| 미수 | 계획 금액 − 실적 금액 | Q14 |

## 6. 상태 흐름

```
컨테이너   IN_TRANSIT → RECEIVED                재고 증가
인보이스   (저장) PENDING_SHIPMENT → SHIPPED    저장 시 예약, 확정 시 차감 + 수금 생성
수금       미수 → 부분 입금 → 완료              입금 합계로 계산
```

기획에 **되돌리는 흐름**이 아직 없어요(인보이스 수정·취소, 확정 취소, 입금 정정). 실제 운영에 꼭 필요해서 Q12로 물어요.

## 7. mock 데이터

### 7.1 파일 구성

| 파일 | 역할 |
|---|---|
| `mock/overseas/seed.ts` | 시작 데이터(가상 값) |
| `mock/overseas/store.ts` | 개발 서버가 켜져 있는 동안 유지되는 저장소 |
| `mock/overseas/fifo.ts` | 배정 계산. 화면과 무관한 순수 함수 |
| `mock/overseas/rules.ts` | 번호·금액·수금 계산, 미확정 규칙을 설정값으로 |
| `mock/overseas/routes.ts` | `POST` 등 동작 API. `mock/api.ts`의 `default`에서 연결 |

목록 받기는 기존 `mockList`를 재사용해요. `handleMock`에 `POST` 경로를 더하고, `plugin.ts`에는 multipart 첨부와 파일 응답 처리를 더해요. 모두 빌드 결과에는 들어가지 않아요.

### 7.2 시작 데이터 (샘플 구조, 값은 가상)

```ts
const warehouses = [
  { id: 'w1', name: '창고 1', region: '미국' },
  { id: 'w2', name: '창고 2', region: '멕시코' },
  { id: 'w3', name: '창고 3', region: '멕시코' },
];

const customers = [
  { id: 'c1', name: '고객사 A', shipToName: '납품처 A', paymentTermDays: 30, paymentTermLabel: 'Net30' },
  { id: 'c2', name: '고객사 B', shipToName: '납품처 B', paymentTermDays: 30, paymentTermLabel: 'Net30' },
];

const parts = [
  { id: 'p1', partNo: 'P1', customerId: 'c1', productCode: 'MT', project: '모델 1', setQty: 100 },
  { id: 'p2', partNo: 'P2', customerId: 'c1', productCode: 'MC', project: '모델 2', setQty: 500 },
  { id: 'p3', partNo: 'P3', customerId: 'c2', productCode: 'R1', project: '모델 3', setQty: 600 },
];

const partPrices = [
  { partId: 'p1', unitPrice: '1.2500', effectiveFrom: '2026-01-01' },
  { partId: 'p2', unitPrice: '0.5000', effectiveFrom: '2026-01-01' },
  { partId: 'p3', unitPrice: '0.4000', effectiveFrom: '2026-01-01' },
];

// P1의 컨테이너 3개. 창고 1
const containers = [
  { containerNo: 'VX260807A', status: 'RECEIVED',   receivedOn: '2026-09-05', partId: 'p1', initialPallets: 20, remaining: 1 },
  { containerNo: 'VX260915A', status: 'RECEIVED',   receivedOn: '2026-10-15', partId: 'p1', initialPallets: 20, remaining: 20 },
  { containerNo: 'VX261019A', status: 'IN_TRANSIT', receivedOn: null,         partId: 'p1', initialPallets: 30, remaining: 30 },
];
```

### 7.3 mock·서버 공통 시험 사례

위 데이터로 시작하고, 사례 1 → 3 → 4는 이어서 진행해요. 서버 담당에게도 그대로 전달할 수 있어요.

| # | 동작 | 기대 결과 |
|---|---|---|
| 1 | P1을 Box 6으로 작성 | VX260807A 1 + VX260915A 5 배정, 인보이스 출고 대기 |
| 2 | (시작 상태에서) P1을 Box 22로 작성 | 가용 21이라 저장 불가, 부족 1 |
| 3 | 1번 뒤 P1을 Box 3으로 작성 | VX260915A 3 배정 |
| 4 | 1번 인보이스 출고 확정 | VX260807A 잔량 0, VX260915A 잔량 15·출고 대기 3, 수금 예정 생성 |
| 5 | 같은 인보이스를 또 확정 | 409, 재고 변화 없음 |
| 6 | 750.00 인보이스에 300.00 입금 | 미수 450.00 |

사례 2와 3은 선적 중 컨테이너를 배정하지 않는다는 임시 가정이에요(Q8).

`.env.mock.local`에 상황 설정을 더해 재고 부족, 지연 건 등을 볼 수 있게 해요.

## 8. 개발 순서

요청한 순서를 따라요. 다만 **인보이스 작성의 FIFO 배정과 재고 초과 검사는 컨테이너 데이터가 있어야 해요.** 그래서 2단계에서는 번호·금액·출력까지만 하고, 배정은 4단계에서 붙여요. 요청 순서에 없던 컨테이너 입고와 출고 확정은 4단계에 넣었어요.

| 단계 | 내용 | 완료 기준 | 먼저 답이 필요한 질문 |
|---|---|---|---|
| 0 | 메뉴 교체, 범위 외 숨김, `useList`·`ListScreen` 확장, mock 뼈대 | 새 메뉴 6개가 뜨고 기존 시험 통과 | 첫 화면 |
| 1 | 마스터(품번·단가 이력, 고객사, 창고) | 단가 추가 시 이력 유지, 열람자는 조회만 | Q1, Q7, Q18 |
| 2 | 인보이스 작성·출력 | 저장하면 번호·금액 계산, 고객사 양식 출력 자리 | Q2, Q3, Q5, Q11, Q18, Q22 |
| 3 | 기준일 잔액 이관 | 잔여 컨테이너·미수금·과거 인보이스 투입 | Q21 |
| 4 | 컨테이너 입고, FIFO 배정, 출고 확정, 재고 현황 | 7.3 사례 1~5 통과 | Q4, Q6, Q8, Q9, Q10, Q12, Q13, Q16, Q17, Q19 |
| 5 | 수금 관리 | 7.3 사례 6, 지연·미수·요약 맞음 | Q14, Q15 |
| 6 | 보고서 | 보고서별 엑셀 다운로드 | Q20 |

단계마다 기능 브랜치 → `develop` PR로 올려요. `develop`에 머지되면 테스트 서버에 자동 배포되는데, 서버 API가 없으면 "서버에 아직 이 목록이 없어요"가 나오는 화면이 있어요. 서버 담당과 시점을 맞춰요.

## 9. 확인할 질문

### 실무자 — 기획에 미확정으로 적힌 것

| # | 질문 | 영향 |
|---|---|---|
| Q1 | Set QTY와 단가는 품번별 고정인가요, 출하마다 바뀌나요? | 인보이스 줄에서 고칠 수 있게 할지 |
| Q2 | 판매 단가는 컨테이너별인가요, 분기별인가요? **한 줄이 단가가 다른 컨테이너 2개에 걸치면** 금액은 어떻게 내고 줄을 나누나요? | 지금 식(`Total QTY × Unit Price`)은 단가 하나만 가정해요. 금액 계산, 양식 |
| Q3 | Box QTY는 곧 팔레트 수인가요? 기획에 "박스당 수량"과 "팔레트당 수량"이 함께 나와요. 기존 분석은 Set QTY = 팔레트당 수량으로 봤어요 | 다르면 FIFO 배정에 환산이 필요해요 |
| Q4 | 재고 차감은 작성 시점인가요, 출고 확정 시점인가요? | 재고 식과 "출고 대기" 표시 |
| Q5 | 인보이스에 PO 번호를 적나요? | 칸과 양식 |
| Q6 | 재고표의 "맞교환"은 어떤 경우이고 어떻게 처리하나요? | 재고 이벤트 추가 가능성 |

### 실무자 — 기획을 옮기다 새로 나온 것

| # | 질문 | 영향 |
|---|---|---|
| Q7 | FIFO는 **선택한 창고 안에서만** 적용하나요? 샘플은 품번마다 창고가 하나인데, 품번이 여러 창고에 있을 수 있나요? (기존 자료에 그런 사례가 있었어요) | 배정 범위, 품번 마스터의 창고 칸 |
| Q8 | 선적 중 컨테이너는 배정에서 빼나요? 선적 중일 때 입고일은 비워 두나요? | 가용 재고, FIFO 순서 |
| Q9 | 창고가 FIFO와 다른 컨테이너를 실제로 내보내면 배정을 손으로 바꾸나요? 입고일이 같으면 무엇이 먼저인가요? | 수동 변경 화면 |
| Q10 | 한 컨테이너에 품번이 여러 개 실릴 수 있나요? | 입고 화면 구성 |
| Q11 | 인보이스 번호: 한 장에 **제품코드가 다른 품번**을 섞을 수 있나요? 순번은 제품코드·날짜별인가요? R 계열도 같은 규칙인가요? (기존 자료에는 R 계열 번호 형식이 다르게 나와요) | 번호 규칙, 품목 고르기 제한 |
| Q12 | 인보이스 수정·취소, 출고 확정 취소가 필요한가요? 어느 상태까지 허용하나요? | 재고·수금 되돌리기, API 추가 |
| Q13 | 실사 재고가 장부와 다르면 어떻게 맞추나요? 기획은 "재고를 직접 고치지 않는다"인데, 조정 기록은 필요할 것 같아요 | 5번째 이벤트(재고 조정) 추가 여부 |
| Q14 | 조기 지급 할인(Discount)이 있나요? 있으면 미수가 계속 남아 보여요. 할인액 입력이 필요한가요? | 미수 식, 수금 칸 |
| Q15 | 부분 입금 시 지연일은 어느 입금일 기준인가요? 조기 입금은 음수로 보이나요, 숨기나요? 초과 입금과 입금 정정은요? | 지연일 식, 입력 방식 |
| Q16 | 관세 적용은 켜고 끄는 값인가요, 비율인가요? 입력하면 **어떤 금액이 달라지나요?** | 칸 형식. 지금은 계산 규칙이 없어요 |
| Q17 | 재고 금액의 단가는 판가인가요, 원가인가요? 기존 보고서처럼 선적 중도 포함하나요? | 재고 현황 금액 |
| Q18 | 고객사별 양식은 몇 개이고, 정확한 최신 양식을 받을 수 있나요? Bill To, Remit To, 인도조건, Carrier, Tracking, Packing Slip도 필요한가요? | 고객사 마스터 칸, 작성·확정 화면, 출력 |
| Q19 | 출고 확정에 BOL 첨부가 필수인가요? 부분 출고가 있나요? 출고일은 따로 입력하나요? | 확정 조건, 상태 |
| Q20 | 보고서는 무엇인가요? 기존 "현지 Invoice List"와 "재고 및 출하 현황(품번×날짜)"도 만드나요? 6개 화면에는 없어요 | 6단계 범위 |
| Q21 | 이관 기준일과 담당자는요? 잔액 파일은 누가 준비하나요? 남은 컨테이너의 **원래 입고일과 단가**를 알 수 있나요? 업로드 화면이 필요한가요, 서버가 한 번 넣으면 되나요? | 3단계 방식, FIFO 순서 |
| Q23 | 금액 반올림은 소수 몇 자리이고, 줄마다 하나요, 합계에서 하나요? | 금액 일치 |

### 서버 담당

| # | 질문 | 제안 |
|---|---|---|
| Q22 | 계산(FIFO·번호·금액)과 인보이스 엑셀·PDF 출력을 서버가 맡을 수 있나요? BOL 파일 저장 위치는요? | 전부 서버 |
| Q24 | 기간 없는 목록, `asOf` 조회, `preview`, `Idempotency-Key`, 409 상세 모양을 받아 줄 수 있나요? | 5.4 기준 |
| Q25 | 역할은 보고자·열람자 둘로 충분한가요? 창고 담당이 직접 확정하나요? | 실무자 답과 함께 판단 |
| Q26 | "오늘"은 어느 시간대 기준인가요? 한국과 미국·멕시코는 날짜가 달라요 | 서버 기준 하나로 통일 |

### 프로젝트 책임자

| # | 질문 | 이유 |
|---|---|---|
| Q27 | 새 범위를 `scope-schedule.md`와 PDF에 어떻게 반영할까요? | 지금 문서는 "PDF가 기준"이고 한국 출하·U71X가 범위 안이라 이 계획과 달라요 |
| Q28 | 새 일정은 언제까지인가요? | 15주 일정은 옛 범위 기준이고 착수일도 비어 있어요 |
| Q29 | 실제 샘플 값으로 화면을 시연해야 하나요? | 공개 저장소에는 못 올려요. 필요하면 git 제외 파일(예: `mock/overseas/seed.local.ts`)로 분리해요 |

## 10. 구현 시작 전에 고칠 문서

확인이 끝나면 아래 문서도 함께 맞춰요. 이번에는 이 문서만 만들었어요.

- `README.md`: 서비스 소개가 옛 흐름이에요
- `docs/requirements.md`: 범위, 메뉴, 받을 자료
- `docs/scope-schedule.md`: Q27 답에 따라
- `docs/source-analysis.md`: 새 범위 안내 추가
