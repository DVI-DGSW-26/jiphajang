import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/black-han-sans/400.css';
import './styles/tokens.css';
import './styles/base.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { AuthCallback } from './auth/AuthCallback.tsx';
import { AuthGate } from './auth/AuthGate.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소가 없어요. index.html을 확인해 주세요.');

createRoot(root).render(
  <StrictMode>
    {/* 화면 이동 라이브러리가 아직 없어요. 로그인 콜백 하나만 주소로 갈라요. */}
    {window.location.pathname === '/auth/callback' ? (
      <AuthCallback />
    ) : (
      <AuthGate>{() => <App />}</AuthGate>
    )}
  </StrictMode>,
);
