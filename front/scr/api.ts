import { User} from './types';
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


    // ПОТОМ УДАЛИТЬ 
    setCurrentUser: async (userId) => {
        try {
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
                console.warn('New endpoint failed, trying legacy endpoint');
            }

            const response = await fetch(`${API_URL}/users/set-current/${userId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
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

    
    

};
