/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    build: {
      // 글꼴 조각을 CSS에 base64로 넣지 않고 따로 내보내요. 필요한 글자 범위만 받아요.
      assetsInlineLimit: (file: string) => (/\.woff2?$/.test(file) ? false : undefined),
    },
    server: {
      port: 5173,
      // 서버는 서버 담당이 따로 만들어요. 개발 중에는 /api 요청을 그쪽으로 넘겨요.
      proxy: env.API_PROXY_TARGET
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
