import { User, GameRoom } from './types';

const API_URL = 'http://localhost:5000/api';

// Функция для обработки ошибок API
const handleApiError = (error: any) => {
  console.error('API Error:', error);
  throw error;
};

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
  
  // Получить таблицу лидеров
  getLeaderboard: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_URL}/leaderboard`);
      if (!response.ok) throw new Error('Failed to fetch leaderboard');
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  }
};

// API для работы с игровыми комнатами
export const gameRoomApi = {
  // Получить список всех игровых комнат
  getGameRooms: async (): Promise<GameRoom[]> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms`);
      if (!response.ok) throw new Error('Failed to fetch game rooms');
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
  joinGameRoom: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/join`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(`Failed to join game room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  // Покинуть игровую комнату
  leaveGameRoom: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}/leave`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(`Failed to leave game room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  }
}; 