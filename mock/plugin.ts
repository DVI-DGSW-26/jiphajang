import type { Plugin } from 'vite';
import { handleMock, type MockOptions } from './api.ts';

/** 가짜 응답을 조금 늦게 줘요. 불러오는 중 화면도 볼 수 있게 */
const DELAY_MS = 300;

/** `vite --mode mock`일 때만 `/api`를 가짜 서버가 받아요 (`mock/api.ts`) */
export function mockApi(options: MockOptions): Plugin {
  return {
    name: 'jiphajang-mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        const response = handleMock(
          {
            method: req.method ?? 'GET',
            url: req.url ?? '/',
            authorization: req.headers.authorization,
          },
          options,
        );
        setTimeout(() => {
          res.statusCode = response.status;
          for (const [key, value] of Object.entries(response.headers ?? {})) {
            res.setHeader(key, value);
          }
          if (response.json === undefined) {
            res.end();
            return;
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(response.json));
        }, DELAY_MS);
      });
      server.config.logger.info(
        `  ➜  가짜 서버: ${options.name}(${options.role}), 상황 ${options.scenario}`,
      );
    },
  };
}
