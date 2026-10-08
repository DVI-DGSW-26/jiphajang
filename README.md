<p align="center"><img src="assets/logo/jiphajang-logo.svg" width="220" alt="집하장"></p>

# 집하장

> 흩어진 데이터를 한 지붕 아래로 — 물류팀 업무 보고 서비스

한국·현지 출하 **Invoice**를 읽어 품번·단가·고객사·결제조건 같은 **마스터**와 하나의 **출하 원장**에 모으고,
수출신고취합·현지 Invoice List·수금현황·U71X Offset·재고/선적 현황이 그 원장을 끌어다 써요.
결과는 엑셀과 PDF(A4 가로)로 내려받아요. 범위와 일정은 [`docs/scope-schedule.md`](docs/scope-schedule.md)에 있어요.

이 저장소는 **화면(프런트엔드)** 이에요. 서버는 서버 담당이 따로 만들어요.

## 실행

Node 24 이상이 필요해요.

```sh
npm install
cp .env.example .env   # API_PROXY_TARGET에 서버 주소를 넣으면 /api 요청을 그쪽으로 넘겨요
npm run dev            # http://localhost:5173
```

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 검사 후 `dist/`에 빌드 |
| `npm run typecheck` | 타입 검사 |
| `npm run lint` / `npm run format` | Biome 검사 / 자동 정리 |
| `npm test` | Vitest 테스트 |
| `npm run manual:pdf` | 디자인 매뉴얼 HTML을 PDF로 다시 뽑기 (Chrome·Edge 필요) |

React 19 · Vite · TypeScript · Biome · Vitest. 글꼴은 사내망에서도 뜨도록 `@fontsource`로 함께 묶어요.

## 폴더

| 경로 | 내용 |
|---|---|
| `src/` | 화면 소스. 디자인 토큰은 `src/styles/tokens.css` |
| `docs/design-manual.pdf` | 디자인 매뉴얼 (버전 2, 2026-10) |
| `docs/design-manual/` | 매뉴얼 PDF의 원본 HTML. 고친 뒤 `npm run manual:pdf` |
| `docs/requirements.md` | 확정된 요구사항, 받을 자료, 미정 항목 |
| `docs/design-manual.md` | 개발용 요약: 토큰·글꼴·문구·부품·출력물 규칙 |
| `docs/scope-schedule.pdf` | 개발 범위 및 일정 원본 (2026-08-27) |
| `docs/scope-schedule.md` | 개발용 요약: 개발 대상·주차별 일정·선행자료 |
| `assets/logo/` | 로고(흰 바탕용·진한 바탕용), 앱 아이콘 SVG/PNG |

## 디자인 원칙

1. 한 번 입력하면 어디서나 끌어온다
2. 자동과 직접 입력은 눈으로 구분된다
3. 한 화면에 주 버튼은 하나
4. 출력물은 종이 기준
