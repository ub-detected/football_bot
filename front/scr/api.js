export const API_URL = 'http://localhost:5001/api';

const handleApiError = error => { throw error; };

// был сделан промт запрос на эту функцию (определение базового url api)
export const userApi = {
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
};