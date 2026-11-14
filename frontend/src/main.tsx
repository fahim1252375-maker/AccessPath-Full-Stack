import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n/index.ts';
import './styles/index.css';
import { App } from './app/App.tsx';

export function mountAccessPath() {
  const rootEl = document.getElementById('root');
  if (!rootEl) return;
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
