import { User, GameRoom, GameHistory } from './types';

export const API_URL = 'http://localhost:5001/api';

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
  // Получить текущего пользователя
  getCurrentUser: async (): Promise<User> => {
    try {
      const response = await fetch(`${API_URL}/users/me`);
      if (!response.ok) throw new Error('Failed to fetch current user');
      return await response.json();
    } catch (error) {
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
      const response = await fetch(`${API_URL}/users/theme-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme })
      });
      if (!response.ok) throw new Error('Failed to set theme preference');
      return await response.json();
    } catch (error) {
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