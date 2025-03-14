getGameRooms: async (filters?: { name?: string; location?: string; timeRange?: string }): Promise<GameRoom[]> => {
    try {
      let url = `${API_URL}/game-rooms`;
      
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
  
  getGameRoom: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(`${API_URL}/game-rooms/${roomId}`);
      if (!response.ok) throw new Error(`Failed to fetch game room with ID ${roomId}`);
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
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
  startTeamSelection: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(${API_URL}/game-rooms/${roomId}/start-team-selection, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(Failed to start team selection for game room with ID ${roomId});
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  startGame: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(${API_URL}/game-rooms/${roomId}/start-game, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(Failed to start game for room with ID ${roomId});
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  endGame: async (roomId: number): Promise<GameRoom> => {
    try {
      const response = await fetch(${API_URL}/game-rooms/${roomId}/end-game, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error(Failed to end game for room with ID ${roomId});
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  submitScore: async (roomId: number, score: string): Promise<{ room?: GameRoom; message?: string; captainASubmitted?: boolean; captainBSubmitted?: boolean }> => {
    try {
      const response = await fetch(${API_URL}/game-rooms/${roomId}/submit-score, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ score })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        const error: any = new Error(Failed to submit score for game room with ID ${roomId});
        error.response = { data: errorData };
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      return handleApiError(error);
    }
  },
  
  reportPlayer: async (roomId: number, reportedUserId: number, reason: string): Promise<void> => {
    try {
      const response = await fetch(${API_URL}/game-rooms/${roomId}/report-player, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reportedUserId, reason })
      });
      
      if (!response.ok) throw new Error(Failed to report player in game room with ID ${roomId});
    } catch (error) {
      return handleApiError(error);
    }
  }
};
