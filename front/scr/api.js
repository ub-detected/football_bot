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
    }

  
};
