import { User, GameHistory} from './types';
export const API_URL = 'http://localhost:5001/api';

const handleApiError = error => { throw error; };


export const userApi = {
 // был сделан промт запрос на эту функцию (определение базового url api)
  getCurrentUser: async () => {
      try {
          const response = await fetch(`${API_URL}/users/me`);
          if (!response.ok) throw new Error('Failed to fetch current user');
          return await response.json();
      } catch (error) {
          handleApiError(error);
          return null; 
      }
  },
  // по аналогии с предыдущей
  getUser: async (userId) => {
    try {
        const response = await fetch(`${API_URL}/users/${userId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch user ${userId}`);
        }
        return await response.json();
    } catch (error) {
        handleApiError(error);
        return null;
    }
    },
    getAllUsers: async () => {
        try {
            const response = await fetch(`${API_URL}/users`);
            if (!response.ok) {
                throw new Error('Failed to fetch all users');
            }
            return await response.json();
        } catch (error) {
            handleApiError(error);
            return null;
        }
    },

    getLeaderboard: async (page = 1, perPage = 10) => {
        try {
            const response = await fetch(`${API_URL}/leaderboard?page=${page}&per_page=${perPage}`);
            if (!response.ok) {
                throw new Error('Failed to fetch leaderboard');
            }
            return await response.json();
        } catch (error) {
            handleApiError(error);
            return null;
        }
    },

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
      },
    
    getGameHistory: async (page: number = 1, perPage: number = 10): Promise<GameHistory[]> => {
        try {
          const response = await fetch(`${API_URL}/users/game-history?page=${page}&per_page=${perPage}`);
          if (!response.ok) throw new Error('Failed to fetch game history');
          return await response.json();
        } catch (error) {
          return handleApiError(error);
        }
      },
    getUserGameHistory: async (userId: number, page: number = 1, perPage: number = 10): Promise<GameHistory[]> => {
        try {
          const response = await fetch(`${API_URL}/users/${userId}/game-history?page=${page}&per_page=${perPage}`);
          if (!response.ok) throw new Error('Failed to fetch user game history');
          return await response.json();
        } catch (error) {
          return handleApiError(error);
        }
      },
    };

    export const locationApi = {
        searchLocations: async (query: string): Promise<string[]> => {
          try {
            const response = await fetch(`${API_URL}/locations/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Failed to search locations');
            return await response.json();
          } catch (error) {
            return handleApiError(error);
          }
        },
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