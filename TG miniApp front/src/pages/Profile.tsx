import React, { useState, useEffect } from 'react';
import { Trophy, Award, Star } from 'lucide-react';
import { userApi } from '../api';
import { User } from '../types';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const userData = await userApi.getCurrentUser();
        setUser(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Не удалось загрузить данные пользователя. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Вычисляем процент побед
  const calculateWinRate = () => {
    if (!user || user.gamesPlayed === 0) return '0%';
    return `${Math.round((user.gamesWon / user.gamesPlayed) * 100)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg">
        {loading ? (
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 rounded-full bg-blue-400 animate-pulse"></div>
            <div className="h-6 w-32 bg-blue-400 rounded mt-4 animate-pulse"></div>
          </div>
        ) : error ? (
          <div className="text-center">
            <p>Ошибка загрузки профиля</p>
          </div>
        ) : user && (
          <div className="flex flex-col items-center">
            <img
              src={user.photoUrl}
              alt={user.username}
              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
            />
            <h1 className="text-2xl font-bold mt-4">{user.username}</h1>
          </div>
        )}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-md animate-pulse">
              <div className="h-5 w-24 bg-gray-200 mb-2 rounded"></div>
              <div className="h-8 w-12 bg-gray-300 rounded"></div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-md animate-pulse">
              <div className="h-5 w-24 bg-gray-200 mb-2 rounded"></div>
              <div className="h-8 w-12 bg-gray-300 rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : user && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                  <Trophy size={20} />
                  <span className="font-semibold">Игр сыграно</span>
                </div>
                <p className="text-2xl font-bold">{user.gamesPlayed}</p>
              </div>
              
              <div className="bg-white rounded-xl p-4 shadow-md">
                <div className="flex items-center gap-2 text-green-600 mb-2">
                  <Award size={20} />
                  <span className="font-semibold">Игр выиграно</span>
                </div>
                <p className="text-2xl font-bold">{user.gamesWon}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md mb-4">
              <div className="flex items-center gap-2 text-yellow-600 mb-2">
                <Star size={20} />
                <span className="font-semibold">Процент побед</span>
              </div>
              <p className="text-2xl font-bold">{calculateWinRate()}</p>
            </div>

            <div className="bg-white rounded-xl p-4 shadow-md">
              <div className="flex items-center gap-2 text-purple-600 mb-2">
                <Trophy size={20} />
                <span className="font-semibold">Общий счет</span>
              </div>
              <p className="text-2xl font-bold">{user.score}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;