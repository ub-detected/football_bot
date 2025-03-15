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
        
        // Проверяем наличие пользователя в WebApp.initDataUnsafe
        const telegramUser = WebApp.initDataUnsafe.user;
        console.log('Пользователь из WebApp:', telegramUser);
        
        let userData = null;
        
        // Способ 1: Через полные данные initData
        if (WebApp.initData) {
          console.log('Способ 1: Telegram initData найден, выполняем аутентификацию...');
          
          try {
            // Аутентифицируем пользователя с данными из Telegram
            userData = await userApi.authWithTelegram();
            console.log('Аутентификация успешна:', userData);
          } catch (error) {
            console.error('Ошибка аутентификации через initData:', error);
          }
        }
        
        // Способ 2: Если первый способ не сработал, попробуем через ID из initDataUnsafe
        if (!userData && telegramUser && telegramUser.id) {
          console.log('Способ 2: Используем Telegram ID из initDataUnsafe:', telegramUser.id);
          
          try {
            userData = await userApi.authWithTelegramId(telegramUser.id);
            console.log('Аутентификация через ID успешна:', userData);
          } catch (error) {
            console.error('Ошибка аутентификации через Telegram ID:', error);
          }
        }
        
        // Способ 3: Если предыдущие способы не сработали, используем getCurrentUser
        if (!userData) {
          console.log('Способ 3: Используем getCurrentUser...');
          
          try {
            userData = await userApi.getCurrentUser();
            console.log('Получены данные пользователя через getCurrentUser:', userData);
          } catch (error) {
            console.error('Ошибка получения данных пользователя через getCurrentUser:', error);
          }
        }
        
        // Если удалось получить пользователя, настраиваем тему
        if (userData && userData.themePreference) {
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