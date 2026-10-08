# 로그인 — 서버와 맞출 것

DVI 통합 로그인(Keycloak, realm `dvi`)을 **Hi_yo 관리팀 화면과 같은 방식**으로 붙여요.
서버가 로그인을 대신 처리하고, 화면에는 토큰만 넘겨요. 화면에는 OIDC 라이브러리가 없어요.

화면 코드는 `src/lib/auth.ts`, `src/lib/api.ts`, `src/auth/`에 있어요.
**아래 경로는 아직 서버에 없어요.** 서버 담당이 이 약속대로 만들어 주면 화면은 그대로 붙어요.
모양이 달라지면 이 문서와 `src/lib/api.ts`를 같이 고쳐요.

## 흐름

```
[로그인하기] → GET {API}/auth/login?redirect=<화면>/auth/callback
            → Keycloak 로그인 (비밀번호 · OTP)
            → 서버가 <화면>/auth/callback#token=<JWT> 로 돌려보냄
            → 화면이 토큰을 sessionStorage에 두고 Authorization: Bearer 로 붙임
```

`{API}`는 `VITE_API_BASE_URL`이고, 비워 두면 `/api`예요.

## 서버가 만들 것

| 경로 | 약속 |
|---|---|
| `GET /auth/login?redirect=` | Keycloak 로그인으로 302. **`redirect`는 등록된 주소만** 받고, 아니면 400과 함께 그 주소를 그대로 보여줘요. `prompt=login`이 붙으면 Keycloak에 그대로 넘겨요(계정 바꾸기) |
| 로그인 뒤 돌려보내기 | 성공 `<redirect>#token=<JWT>`, 실패 `<redirect>#error=<사람이 읽을 문구>`. **쿼리(`?`)가 아니라 fragment(`#`)** — 접근 로그에 토큰이 남지 않아요 |
| `GET /auth/me` | Bearer로 인증. `{ "name": "홍길동", "role": "REPORTER" \| "VIEWER" }`. 그룹이 없거나 사용자에 연결되지 않은 계정은 **401** |
| `GET /auth/refresh` | **세션 쿠키로 인증** (Bearer 없음). `{ "token": "...", "expiresIn": 900 }`. 화면은 만료 1분 전에 불러요 |
| `POST /auth/logout` | 서버 세션을 끊어요. 이미 로그아웃 상태여도 200 |
| 나머지 API | Bearer JWT 검증. 권한 없으면 403 |

- **역할**: 보고자(`REPORTER`)는 쓰고 고칠 수 있고, 열람자(`VIEWER`)는 내려받기만 해요
  (`requirements.md`). 화면은 토큰 안의 롤을 직접 읽지 않고 `/auth/me`만 믿어요.
  **권한 검사는 서버가 해요** — 화면에서 버튼을 숨기는 것은 편의일 뿐이에요.
- **같은 오리진**: 배포 때는 서버가 화면(`dist/`)까지 같이 내보내요(`requirements.md` 배포).
  화면과 API가 같은 오리진이라 **CORS 설정이 필요 없고**, `SameSite=Lax` 갱신 쿠키도 그대로 실려요.
  개발 중에도 Vite 프록시(`/api`)로 같은 오리진이 돼요.
- **쿠키**: 개발 중 갱신 401은 정상일 수 있어요(서버 세션 쿠키가 프록시를 거치며 빠질 때).
  화면은 그때 다시 로그인으로 안내해요.

## 사람이 해야 할 것

| 무엇 | 누가 |
|---|---|
| 이 서비스용 **confidential client** 만들기 (시크릿은 서버만 가져요). Hi_yo의 클라이언트를 같이 쓰지 않아요 | SSO 담당 |
| 그 클라이언트에 서버 콜백 주소 등록 (Spring 기본값 `/login/oauth2/code/keycloak`) | SSO 담당 |
| 화면 콜백 주소 등록 — 개발 `http://localhost:5173/auth/callback`, 배포 주소는 정해지면 | 서버 담당 |
| 쓸 사람에게 그룹 배정 — 보고자 · 열람자를 그룹으로 나눌지 정하기 | SSO 담당 |
| 가입하고 OTP 등록, Keycloak 아이디를 서버 담당에게 알리기 | 쓰는 사람 |

**넷이 다 돼야 들어와요.** 하나라도 빠지면 로그인은 되는데 `/auth/me`가 401이거나
`#error=`로 돌아와요. 이유는 서버 로그에만 남으니 아이디를 알려 주면 서버 담당이 찾아줘요.
