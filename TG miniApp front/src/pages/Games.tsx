import React, { useState, useEffect } from 'react';
import { Users, MapPin, Clock, Crown, Plus, X, Castle as Whistle } from 'lucide-react';
import { gameRoomApi } from '../api';
import { GameRoom } from '../types';

const Games = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGame, setNewGame] = useState({
    name: '',
    location: '',
    maxPlayers: 16,
    timeRange: ''
  });
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGameRooms();
  }, []);

  const fetchGameRooms = async () => {
    try {
      setLoading(true);
      const rooms = await gameRoomApi.getGameRooms();
      setGameRooms(rooms);
      setError(null);
    } catch (err) {
      console.error('Error fetching game rooms:', err);
      setError('Не удалось загрузить игровые комнаты. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      await gameRoomApi.createGameRoom(newGame);
      
      // Сбрасываем форму и закрываем модальное окно
      setNewGame({
        name: '',
        location: '',
        maxPlayers: 16,
        timeRange: ''
      });
      setIsModalOpen(false);
      
      // Обновляем список комнат
      await fetchGameRooms();
    } catch (err) {
      console.error('Error creating game room:', err);
      setError('Не удалось создать игровую комнату. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (roomId: number) => {
    try {
      setLoading(true);
      await gameRoomApi.joinGameRoom(roomId);
      await fetchGameRooms();
    } catch (err) {
      console.error('Error joining game room:', err);
      setError('Не удалось присоединиться к игровой комнате. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGame = async (roomId: number) => {
    try {
      setLoading(true);
      await gameRoomApi.leaveGameRoom(roomId);
      await fetchGameRooms();
    } catch (err) {
      console.error('Error leaving game room:', err);
      setError('Не удалось покинуть игровую комнату. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxPlayersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 16 : Math.max(2, Math.min(32, parseInt(e.target.value) || 16));
    setNewGame({ ...newGame, maxPlayers: value });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Whistle /> Игры
        </h1>
      </div>

      <div className="p-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-blue-600 text-white rounded-xl py-3 mb-6 flex items-center justify-center gap-2 font-medium"
        >
          <Plus size={20} /> Создать игру
        </button>

        {loading && !isModalOpen ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        ) : gameRooms.length === 0 ? (
          <div className="bg-gray-100 rounded-xl p-8 text-center">
            <p className="text-gray-600">Нет доступных игр. Создайте новую!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gameRooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold">{room.name}</h2>
                  <div className="flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    <Users size={14} />
                    <span>{room.players.length}/{room.maxPlayers}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <MapPin size={14} />
                  <span>{room.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                  <Clock size={14} />
                  <span>{room.timeRange}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <img
                    src={room.creator.photoUrl}
                    alt={room.creator.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="flex items-center gap-1 text-sm">
                    <Crown size={14} className="text-yellow-500" />
                    <span>{room.creator.username}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    // Проверяем, является ли пользователь участником комнаты
                    const isPlayerInRoom = room.players.some(player => 
                      // В реальном приложении здесь должна быть проверка на текущего пользователя
                      player.username === room.players[0].username
                    );
                    
                    if (isPlayerInRoom) {
                      handleLeaveGame(room.id);
                    } else {
                      handleJoinGame(room.id);
                    }
                  }}
                  className={`w-full py-2 rounded-lg font-medium ${
                    // Проверяем, является ли пользователь участником комнаты
                    room.players.some(player => 
                      // В реальном приложении здесь должна быть проверка на текущего пользователя
                      player.username === room.players[0].username
                    )
                      ? 'bg-red-100 text-red-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {room.players.some(player => 
                    // В реальном приложении здесь должна быть проверка на текущего пользователя
                    player.username === room.players[0].username
                  )
                    ? 'Покинуть игру'
                    : 'Присоединиться'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания игры */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Создать новую игру</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Название</label>
                <input
                  type="text"
                  value={newGame.name}
                  onChange={(e) => setNewGame({ ...newGame, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Локация</label>
                <input
                  type="text"
                  value={newGame.location}
                  onChange={(e) => setNewGame({ ...newGame, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Максимальное количество игроков</label>
                <input
                  type="number"
                  min="2"
                  max="32"
                  value={newGame.maxPlayers}
                  onChange={handleMaxPlayersChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              
              <div className="mb-6">
                <label className="block text-gray-700 mb-2">Временной диапазон</label>
                <input
                  type="text"
                  value={newGame.timeRange}
                  onChange={(e) => setNewGame({ ...newGame, timeRange: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Например: 2-5 мин"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать игру'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;