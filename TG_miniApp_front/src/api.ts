import { User, GameRoom, GameHistory } from './types';

// Добавляем импорт Telegram Web App SDK
import WebApp from '@twa-dev/sdk';

// Используем динамический URL в зависимости от окружения
// В production используем относительный путь, который будет работать через Nginx
export const API_URL = window.location.origin + '/api';

// Функция для обработки ошибок API
const handleApiError = (error: any) => {
  throw error;
};

// Интерфейс для пагинации
export interface PaginationData {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

// Интерфейс для ответа с пагинацией
export interface PaginatedResponse<T> {
  users: T[];
  pagination: PaginationData;
}

// API для работы с пользователями
export const userApi = {
  // Аутентификация через Telegram
  authWithTelegram: async (): Promise<User> => {
    try {
      // Получаем initData из Telegram Web App
      const initData = WebApp.initData;
      console.log('Отправка initData на сервер:', initData ? `${initData.substring(0, 50)}...` : 'пусто');
      
      // Получаем данные пользователя напрямую из WebApp
      const telegramUser = WebApp.initDataUnsafe.user;
      console.log('WebApp.initDataUnsafe:', JSON.stringify(WebApp.initDataUnsafe, null, 2));
      console.log('User из WebApp:', telegramUser ? JSON.stringify(telegramUser, null, 2) : 'user недоступен');
      
      // Проверяем, есть ли хоть какие-то данные для аутентификации
      if (!initData && !telegramUser) {
        console.error('ОШИБКА: Нет данных инициализации от Telegram и нет прямого доступа к пользователю');
        throw new Error('No authentication data from Telegram');
      }
      
      // Формируем объект для отправки на сервер
      const authData: any = { initData };
      
      // Если есть прямой доступ к пользователю, добавляем его данные
      if (telegramUser) {
        authData.userData = telegramUser;
      }
      
      // Отправляем данные на сервер для проверки и аутентификации
      const response = await fetch(`${API_URL}/auth/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Если есть ID пользователя, добавляем его в заголовок
          ...(telegramUser && telegramUser.id ? {'X-Telegram-ID': telegramUser.id.toString()} : {})
        },
        body: JSON.stringify(authData)
      });
      
      // Проверяем ответ от сервера
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка аутентификации: ${response.status} ${response.statusText}`, errorText);
        
        // Если первая попытка не удалась и у нас есть ID пользователя, попробуем использовать запасной метод
        if (telegramUser && telegramUser.id) {
          console.log('Первая попытка аутентификации не удалась, пробуем через запасной метод authWithTelegramId');
          return userApi.authWithTelegramId(telegramUser.id);
        }
        
        throw new Error(`Failed to authenticate with Telegram: ${response.status} ${response.statusText}`);
      }
      
      const userData = await response.json();
      console.log('Данные пользователя получены:', userData);
      return userData;
    } catch (error) {
      console.error('Ошибка в authWithTelegram:', error);
      
      // Попытка восстановления через getCurrentUser если все методы аутентификации не сработали
      try {
        console.log('Пробуем получить пользователя через getCurrentUser после сбоя аутентификации');
        return await userApi.getCurrentUser();
      } catch (fallbackError) {
        console.error('Запасной метод тоже не сработал:', fallbackError);
        return handleApiError(error);
      }
    }
  },
  
  // Получить текущего пользователя
  getCurrentUser: async (): Promise<User> => {
    try {
      // Получаем данные пользователя из Telegram
      const telegramUser = WebApp.initDataUnsafe.user;
      
      const headers: HeadersInit = {};
      
      // Если есть данные пользователя из Telegram, добавляем его ID в заголовок
      if (telegramUser && telegramUser.id) {
        headers['X-Telegram-ID'] = telegramUser.id.toString();
        console.log('Добавлен заголовок X-Telegram-ID:', telegramUser.id);
        
        // Для отладки выводим всю доступную информацию о пользователе
        console.log('Данные пользователя из WebApp.initDataUnsafe:', JSON.stringify(telegramUser, null, 2));
      } else {
        console.log('Нет данных пользователя в WebApp.initDataUnsafe.user');
      }
      
      console.log('Отправка запроса на /api/users/me с заголовками:', headers);
      const response = await fetch(`${API_URL}/users/me`, { headers });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка получения пользователя: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to fetch current user: ${response.statusText}`);
      }
      
      const userData = await response.json();
      console.log('Получены данные пользователя:', userData);
      return userData;
    } catch (error) {
      console.error('Ошибка в getCurrentUser:', error);
      return handleApiError(error);
    }
  },
  
  // Получить пользователя по ID
  getUser: async (userId: number): Promise<User> => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}`);
      if (!response.ok) throw new Error(`Failed to fetch user with ID ${userId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Получить всех пользователей
  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_URL}/users`);
      if (!response.ok) throw new Error('Failed to fetch all users');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Установить текущего пользователя (только для тестирования)
  setCurrentUser: async (userId: number): Promise<User> => {
    try {
      // Пробуем сначала новый эндпоинт
      try {
        const response = await fetch(`${API_URL}/users/switch/${userId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          return await response.json();
        }
      } catch (switchError) {
        // Если новый эндпоинт не работает, пробуем старый
        console.warn('New endpoint failed, trying legacy endpoint');
      }

      // Старый эндпоинт как запасной вариант
      const response = await fetch(`${API_URL}/users/set-current/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Если ответ не успешный, собираем всю информацию для отладки
      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch {
          errorText = 'Не удалось получить текст ошибки';
        }
        
        throw new Error(`Failed to set current user with ID ${userId}. Status: ${response.status}. Response: ${errorText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error (setCurrentUser):', error);
      throw error;
    }
  },
  
  // Получить таблицу лидеров
  getLeaderboard: async (page: number = 1, perPage: number = 10): Promise<PaginatedResponse<User>> => {
    try {
      const response = await fetch(`${API_URL}/leaderboard?page=${page}&per_page=${perPage}`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Получить историю игр пользователя
  getGameHistory: async (page: number = 1, perPage: number = 10): Promise<GameHistory[]> => {
    try {
      const response = await fetch(`${API_URL}/users/game-history?page=${page}&per_page=${perPage}`);
      if (!response.ok) throw new Error('Failed to fetch game history');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Получить историю игр конкретного пользователя по ID
  getUserGameHistory: async (userId: number, page: number = 1, perPage: number = 10): Promise<GameHistory[]> => {
    try {
      const response = await fetch(`${API_URL}/users/${userId}/game-history?page=${page}&per_page=${perPage}`);
      if (!response.ok) throw new Error('Failed to fetch user game history');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Установить предпочтения темы пользователя
  setThemePreference: async (theme: 'light' | 'dark'): Promise<User> => {
    try {
      // Получаем данные пользователя из Telegram
      const telegramUser = WebApp.initDataUnsafe.user;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Если есть данные пользователя из Telegram, добавляем его ID в заголовок
      if (telegramUser && telegramUser.id) {
        headers['X-Telegram-ID'] = telegramUser.id.toString();
      }
      
      const response = await fetch(`${API_URL}/users/theme-preference`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ theme })
      });
      if (!response.ok) throw new Error('Failed to set theme preference');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Добавляем метод для быстрой аутентификации по Telegram ID
  authWithTelegramId: async (telegramId: string | number): Promise<User> => {
    try {
      console.log(`Быстрая аутентификация по Telegram ID: ${telegramId}`);
      
      const response = await fetch(`${API_URL}/auth/telegram-id/${telegramId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ошибка аутентификации по Telegram ID: ${response.status}`, errorText);
        throw new Error(`Failed to authenticate with Telegram ID: ${response.status}`);
      }
      
      const userData = await response.json();
      console.log('Данные пользователя получены:', userData);
      return userData;
    } catch (error) {
      console.error('Ошибка в authWithTelegramId:', error);
      return handleApiError(error);
    }
  }
};

// API для работы с игровыми комнатами
export const gameRoomApi = {
  // Получить список всех игровых комнат
  getGameRooms: async (filters?: { name?: string; location?: string; timeRange?: string }): Promise<GameRoom[]> => {
    try {
      let url = `${API_URL}/game-rooms`;
      
      // Добавляем параметры запроса, если они указаны
      if (filters) {
        const params = new URLSearchParams();
        if (filters.name) params.append('name', filters.name);
        if (filters.location) params.append('location', filters.location);
        if (filters.timeRange) params.append('timeRange', filters.timeRange);
        
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch game rooms');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Получить конкретную игровую комнату по ID
  getGameRoom: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}`);
      if (!response.ok) throw new Error(`Failed to fetch game room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Создать новую игровую комнату
  createGameRoom: async (roomData: {
    name: string;
    maxPlayers: number;
    location: string;
    timeRange: string;
  }): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(roomData)
      });
      
      if (!response.ok) throw new Error('Failed to create game room');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Присоединиться к игровой комнате
  joinGameRoom: async (roomId: number): Promise<{ room: GameRoom; roomIsFull: boolean }> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/join`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(`Failed to join game room with ID ${roomId}`);
        error.response = { data: errorData };
        throw error;
      }
      
      const data = await response.json();
      return {
        room: data.room || data,
        roomIsFull: data.roomIsFull || false
      };
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Покинуть игровую комнату
  leaveGameRoom: async (roomId: number): Promise<void> => {
    const response = await fetch(`${API_URL}/game-rooms/${roomId}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ошибка при выходе из комнаты');
    }

    return;
  },
  
  // Начать выбор команд
  startTeamSelection: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/start-team-selection`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(`Failed to start team selection for game room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Начать игру
  startGame: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/start-game`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(`Failed to start game for room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Завершить игру (для капитанов)
  endGame: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/end-game`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(`Failed to end game for room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Отправить счет игры (для капитанов)
  submitScore: async (roomId: number, score: string): Promise<{ room?: GameRoom; message?: string; captainASubmitted?: boolean; captainBSubmitted?: boolean }> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/submit-score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(`Failed to submit score for game room with ID ${roomId}`);
        error.response = { data: errorData };
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Пожаловаться на игрока
  reportPlayer: async (roomId: number, reportedUserId: number, reason: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/report-player`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportedUserId, reason })
      });
      
      if (!response.ok) throw new Error(`Failed to report player in game room with ID ${roomId}`);
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// API для работы с локациями
export const locationApi = {
  // Поиск локаций по запросу
  searchLocations: async (query: string): Promise<string[]> => {
    try {
      const response = await fetch(`${API_URL}/locations/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Failed to search locations');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Получить все локации
  getAllLocations: async (): Promise<string[]> => {
    try {
      const response = await fetch(`${API_URL}/locations`);
      if (!response.ok) throw new Error('Failed to fetch locations');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  }
}; 