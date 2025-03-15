import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Award, Star, Moon, Sun } from 'lucide-react';
import { userApi } from '../api';
import { User, GameHistory } from '../types';
import GameHistoryList from '../components/GameHistoryList';
import ThemeSwitch from '../components/ThemeSwitch';
import WebApp from '@twa-dev/sdk';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  
  // Предотвращаем постоянные обновления
  const isFirstRender = useRef(true);

  // Функция для загрузки данных пользователя
  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("Начинаем загрузку данных пользователя...");
      
      // Проверяем доступность Telegram WebApp
      if (typeof WebApp !== 'undefined' && WebApp.initData) {
        console.log("Пытаемся авторизоваться через Telegram WebApp...");
        console.log("WebApp данные доступны:", !!WebApp.initData);
        console.log("WebApp.initDataUnsafe доступен:", !!WebApp.initDataUnsafe);
        
        try {
          // Выводим информацию о пользователе из Telegram (для отладки)
          if (WebApp.initDataUnsafe && WebApp.initDataUnsafe.user) {
            const tgUser = WebApp.initDataUnsafe.user;
            console.log("Данные пользователя из Telegram:", {
              id: tgUser.id, 
              username: tgUser.username, 
              firstName: tgUser.first_name,
              lastName: tgUser.last_name,
              photoUrl: tgUser.photo_url,
              languageCode: tgUser.language_code
            });
          } else {
            console.log("initDataUnsafe.user недоступен");
          }
          
          // Аутентификация через Telegram - всегда используем этот метод, 
          // чтобы получить актуальные данные пользователя
          console.log("Отправляем запрос на авторизацию через Telegram API...");
          const userData = await userApi.authWithTelegram();
          console.log("Успешная аутентификация через Telegram", userData);
          setUser(userData);
          setError(null);
          return;
        } catch (authError) {
          console.error('Ошибка аутентификации через Telegram:', authError);
          // Если аутентификация через Telegram не удалась, пробуем обычный метод
        }
      } else {
        console.log("Telegram WebApp API недоступен, используем резервный метод");
      }
      
      // Запасной вариант - получение текущего пользователя через обычный API
      console.log("Используем запасной метод получения данных пользователя...");
      const userData = await userApi.getCurrentUser();
      console.log("Получены данные пользователя через обычный API", userData);
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error("Ошибка при получении данных пользователя:", err);
      setError('Не удалось загрузить данные пользователя. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Функция для загрузки истории игр
  const fetchGameHistory = useCallback(async () => {
    if (!user) return;
    
    try {
      setHistoryLoading(true);
      const history = await userApi.getGameHistory();
      setGameHistory(history);
    } catch (err) {
      // Обработка ошибки без вывода в консоль
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  // Загрузка данных только при первом рендере компонента
  useEffect(() => {
    // Всегда обновляем данные при открытии профиля
    fetchUserData().then(() => {
      isFirstRender.current = false;
    });
    
    // Добавляем обработчик для обновления данных при открытии вкладки
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Вкладка стала активной, обновляем данные...');
        fetchUserData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Удаляем слушатель при размонтировании
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUserData]);

  // Загрузка истории игр после получения данных пользователя
  useEffect(() => {
    if (user) {
      fetchGameHistory();
    }
  }, [user, fetchGameHistory]);

  // Вычисляем процент побед
  const calculateWinRate = () => {
    if (!user || user.gamesPlayed === 0) return '0%';
    return `${Math.round((user.gamesWon / user.gamesPlayed) * 100)}%`;
  };

  // Функция для принудительного обновления данных
  const handleRefresh = () => {
    console.log("Ручное обновление данных пользователя...");
    
    // Сначала сбрасываем текущие данные
    setUser(null);
    setGameHistory([]);
    
    // Затем заново загружаем все
    fetchUserData().then(() => {
      fetchGameHistory();
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-blue-400 animate-pulse"></div>
            <div className="h-6 w-32 bg-blue-400 rounded mt-4 animate-pulse"></div>
          </div>
        ) : error ? (
          <div className="text-center">
            <p>Ошибка загрузки профиля</p>
          </div>
        ) : user && (
          <div className="flex flex-col items-center">
            <img
              src={user.photoUrl}
              alt={user.username}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <h1 className="text-2xl font-bold mt-4">{user.username}</h1>
            
            <div className="flex items-center gap-2 mt-4">
              {/* Кнопка для обновления данных */}
              <button 
                onClick={handleRefresh}
                className="flex items-center gap-1 bg-white/20 text-white px-3 py-1 rounded-full text-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                  <path d="M16 21h5v-5" />
                </svg>
                Обновить
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-md animate-pulse">
              <div className="h-5 w-24 bg-gray-200 mb-2 rounded"></div>
              <div className="h-8 w-12 bg-gray-300 rounded"></div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md animate-pulse">
              <div className="h-5 w-24 bg-gray-200 mb-2 rounded"></div>
              <div className="h-8 w-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : user && (
          <>
            {/* Блок с настройками профиля */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-4">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Настройки
              </h2>
              
              <div className="border-b pb-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">Тема оформления</h3>
                    <p className="text-sm text-gray-500">Выберите светлую или темную тему</p>
                  </div>
                  <ThemeSwitch initialTheme={user.themePreference || 'light'} />
                </div>
              </div>
              
              {/* Здесь можно добавить другие настройки пользователя */}
            </div>
            
            {/* Блок статистики */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Trophy size={20} />
                  <span className="font-semibold">Игр сыграно</span>
                </div>
                <p className="text-2xl font-bold">{user.gamesPlayed}</p>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Award size={20} />
                  <span className="font-semibold">Игр выиграно</span>
                </div>
                <p className="text-2xl font-bold">{user.gamesWon}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md mb-4">
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <Star size={20} />
                <span className="font-semibold">Процент побед</span>
              </div>
              <p className="text-2xl font-bold">{calculateWinRate()}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md mb-6">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Trophy size={20} />
                <span className="font-semibold">Общий счет</span>
              </div>
              <p className="text-2xl font-bold">{user.score}</p>
            </div>
            
            {/* Компонент истории игр */}
            <GameHistoryList 
              history={gameHistory}
              loading={historyLoading}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;