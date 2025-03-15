import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import WebApp from '@twa-dev/sdk';

// Вызываем WebApp.ready() для уведомления Telegram о готовности приложения
try {
  console.log('Вызываем WebApp.ready() для уведомления Telegram...');
  WebApp.ready();
  WebApp.expand();
  console.log('WebApp инициализирован');
} catch (error) {
  console.error('Ошибка при инициализации WebApp:', error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
