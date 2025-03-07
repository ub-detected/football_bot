import React, { useState, useEffect } from 'react';
import { Trophy, Medal } from 'lucide-react';
import { userApi } from '../api';
import { User } from '../types';

const Leaderboard = () => {
  const [topPlayers, setTopPlayers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [leaderboardData, userData] = await Promise.all([
          userApi.getLeaderboard(),
          userApi.getCurrentUser()
        ]);
        
        setTopPlayers(leaderboardData);
        setCurrentUser(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching leaderboard data:', err);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Находим ранг текущего пользователя
  const getCurrentUserRank = () => {
    if (!currentUser) return null;
    
    const userIndex = topPlayers.findIndex(player => player.id === currentUser.id);
    if (userIndex !== -1) {
      return userIndex + 1;
    }
    
    return topPlayers.length + 1; // Если пользователь не в топе
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy /> Таблица лидеров
        </h1>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <h2 className="text-lg font-semibold mb-4">Лучшие игроки</h2>
              {topPlayers.map((player, index) => (
                <div key={player.id} className="flex items-center gap-4 mb-4">
                  <div className="w-8 text-center">
                    {index === 0 && <Medal className="text-yellow-400" />}
                    {index === 1 && <Medal className="text-gray-400" />}
                    {index === 2 && <Medal className="text-amber-700" />}
                    {index > 2 && <span className="text-gray-600">{index + 1}</span>}
                  </div>
                  <img
                    src={player.photoUrl}
                    alt={player.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{player.username}</p>
                  </div>
                  <div className="text-blue-600 font-bold">{player.score}</div>
                </div>
              ))}
            </div>

            {currentUser && (
              <div className="bg-blue-50 rounded-xl shadow-md p-4">
                <h2 className="text-lg font-semibold mb-4">Ваша позиция</h2>
                <div className="flex items-center gap-4">
                  <div className="w-8 text-center">
                    <span className="text-gray-600">{getCurrentUserRank()}</span>
                  </div>
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium">{currentUser.username}</p>
                  </div>
                  <div className="text-blue-600 font-bold">{currentUser.score}</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;