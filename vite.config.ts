/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { readMockOptions } from './mock/api.ts';
import { mockApi } from './mock/plugin.ts';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // npm run dev:mock — 서버 없이 가짜 서버로 띄워요 (mock/api.ts)
  const mock = mode === 'mock';

  return {
    plugins: [react(), ...(mock ? [mockApi(readMockOptions(env))] : [])],
    build: {
      // 글꼴 조각을 CSS에 base64로 넣지 않고 따로 내보내요. 필요한 글자 범위만 받아요.
      assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
    },
    server: {
      port: 5173,
      // 서버는 서버 담당이 따로 만들어요. 개발 중에는 /api 요청을 그쪽으로 넘겨요.
      proxy:
        !mock && env.API_PROXY_TARGET
          ? { '/api': { target: env.API_PROXY_TARGET, changeOrigin: true } }
          : undefined,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      css: false,
    },
  };
});
