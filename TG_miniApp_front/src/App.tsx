import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Leaderboard from './pages/Leaderboard';
import Games from './pages/Games';
import Profile from './pages/Profile';
import GameRoom from './pages/GameRoom';
import WebApp from '@twa-dev/sdk';
import { userApi } from './api';

function App() {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Инициализация Telegram и аутентификация пользователя
  useEffect(() => {
    const initTelegram = async () => {
      try {
        console.log('Инициализация Telegram Web App...');
        
        // Проверяем наличие initData от Telegram
        if (WebApp.initData) {
          console.log('Telegram initData найден, выполняем аутентификацию...');
          
          try {
            // Аутентифицируем пользователя с данными из Telegram
            const userData = await userApi.authWithTelegram();
            console.log('Аутентификация успешна:', userData.username);
            
            // Устанавливаем тему в соответствии с настройками пользователя
            if (userData.themePreference) {
              const isDark = userData.themePreference === 'dark';
              if (isDark) {
                document.documentElement.classList.add('dark-theme');
              } else {
                document.documentElement.classList.remove('dark-theme');
              }
            }
            
            // Уведомляем Telegram о готовности приложения
            WebApp.ready();
            WebApp.expand();
          } catch (error) {
            console.error('Ошибка аутентификации через Telegram:', error);
          }
        } else {
          console.log('Telegram initData не найден, работаем в режиме отладки');
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Ошибка инициализации Telegram:', error);
        setIsInitialized(true); // Всё равно продолжаем работу приложения
      }
    };
    
    initTelegram();
  }, []);
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 max-w-md mx-auto relative">
        {!isInitialized ? (
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Загрузка приложения...</p>
          </div>
        ) : (
          <>
            <Routes>
              <Route path="/" element={<Leaderboard />} />
              <Route path="/games" element={<Games />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/game-rooms/:roomId" element={<GameRoom />} />
            </Routes>
            <Navigation />
          </>
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;