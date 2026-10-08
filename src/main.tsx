import '@fontsource/ibm-plex-sans-kr/400.css';
import '@fontsource/ibm-plex-sans-kr/500.css';
import '@fontsource/ibm-plex-sans-kr/600.css';
import '@fontsource/ibm-plex-sans-kr/700.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/black-han-sans/400.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { App } from './App.tsx';
import { AuthCallback } from './auth/AuthCallback.tsx';
import { AuthGate } from './auth/AuthGate.tsx';
import { ToastProvider } from './components/Toast.tsx';

const root = document.getElementById('root');
if (!root) throw new Error('#root 요소가 없어요. index.html을 확인해 주세요.');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* 로그인 콜백은 로그인 전에 열려야 해서 AuthGate 바깥에 둬요 */}
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<AuthGate>{(me) => <App me={me} />}</AuthGate>} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
);
