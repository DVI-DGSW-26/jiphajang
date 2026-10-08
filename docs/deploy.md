# 배포 — 서버가 화면을 같이 내보낼 때

서버가 화면 파일까지 같이 내보내요(`requirements.md` 배포). 화면과 API가 **같은 주소**를 써서
로그인 갱신 쿠키가 그대로 실리고 CORS 설정이 필요 없어요. 이 문서는 서버 담당이 볼 안내예요.

## 1. 화면 파일 받기

화면은 빌드하면 정적 파일(`dist/`)만 나와요. 둘 중 편한 쪽을 써요.

| 방법 | 하는 일 |
|---|---|
| GitHub에서 내려받기 | `main`에 머지될 때마다 GitHub Actions가 빌드해서 `jiphajang-dist-<커밋>`으로 30일 남겨요. 저장소 **Actions → CI → 해당 실행 → Artifacts** |
| 직접 빌드 | Node 24 이상에서 `npm ci && npm run build` → `dist/` |

**API 주소는 빌드할 때 정해져요.** 화면은 기본으로 같은 주소의 `/api`로 요청해요. 다른 경로를 쓰려면 빌드 전에
`VITE_API_BASE_URL`을 넣어야 해요(예: `VITE_API_BASE_URL=/backend npm run build`). 배포한 뒤에는 바꿀 수 없어요.

## 2. 내보내는 규칙

| 요청 | 답 |
|---|---|
| `/api/**` | API. **없는 API도 `index.html`이 아니라 JSON 404**로 답해요 |
| `dist/`에 있는 파일 (`/assets/…`, `/favicon.svg`) | 그 파일 |
| 그 밖의 모든 주소 (`/`, `/ledger`, `/results/…`, `/auth/callback` 등) | `dist/index.html` |

- 셋째 줄이 빠지면 새로고침하거나 로그인에서 돌아올 때(`/auth/callback`) 404가 나요.
- **화면 파일은 로그인 없이 열려야 해요.** 로그인 안내 화면도 이 파일이 그려요. 보호는 `/api`에서 해요.
- 캐시
  - `/assets/*`는 파일 이름에 해시가 붙어 있어요. 오래 캐시해도 돼요(`Cache-Control: public, max-age=31536000, immutable`).
  - `index.html`은 캐시하지 않아요(`Cache-Control: no-cache`). 그래야 새 배포가 바로 보여요.

## 3. 설정 예시

서버 스택이 정해지면 그쪽에 맞춰요. 아래는 예시예요.

### nginx 앞에 둘 때

```nginx
server {
  listen 80;
  root /srv/jiphajang/dist;

  location /api/ {
    proxy_pass http://127.0.0.1:8080;   # API 서버
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    try_files $uri =404;
  }

  location / {
    add_header Cache-Control "no-cache";
    try_files $uri /index.html;
  }
}
```

### Spring Boot가 직접 내보낼 때

`dist/` 안의 파일을 `src/main/resources/static/`에 넣고, 없는 주소는 `index.html`로 돌려요.
API 컨트롤러는 `/api` 아래에 둬요.

```java
@Configuration
class SpaConfig implements WebMvcConfigurer {
  @Override
  public void addResourceHandlers(ResourceHandlerRegistry registry) {
    registry.addResourceHandler("/**")
        .addResourceLocations("classpath:/static/")
        .resourceChain(true)
        .addResolver(new PathResourceResolver() {
          @Override
          protected Resource getResource(String path, Resource location) throws IOException {
            Resource file = location.createRelative(path);
            if (file.exists() && file.isReadable()) return file;
            // API는 화면으로 돌리지 않아요 — 없는 API는 404 그대로
            return path.startsWith("api/") ? null : location.createRelative("index.html");
          }
        });
  }
}
```

Spring Security를 쓰면 화면 경로(`/`, `/assets/**`, `/favicon.svg`, 그 밖의 화면 주소)는 `permitAll`로 열고,
`/api/**`만 Bearer JWT로 막아요(`docs/auth.md`).

## 4. 배포한 뒤 확인

- [ ] `<배포 주소>/`를 열면 로그인 안내 화면이 나와요
- [ ] `<배포 주소>/results`에서 새로고침해도 화면이 나와요(404 아님)
- [ ] `<배포 주소>/api/없는-주소`는 JSON 404예요(로그인 화면 HTML 아님)
- [ ] Keycloak에 `<배포 주소>/auth/callback`이 등록돼 있고, 로그인하면 출하 원장으로 돌아와요
- [ ] 새로 배포한 뒤 새로고침하면 바뀐 화면이 바로 보여요(`index.html` 캐시 없음)

테스트 서버와 운영 서버를 나누면 서버마다 콜백 주소를 따로 등록해요.
