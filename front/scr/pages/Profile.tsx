import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Award, Star, Users, X, ChevronDown, ChevronUp, Moon, Sun } from 'lucide-react';
import { userApi } from '../api';
import { User, GameHistory} from '../types';
import ThemeSwitch from '../adds/ThemeSwitch';

const Profile = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<GameHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
    const isFirstRender = useRef(true);
    const fetchUserData = useCallback(async () => {
        try {
          setLoading(true);
          const userData = await userApi.getCurrentUser();
          setUser(userData);
          setError(null);
        } catch (err) {
          setError('Не удалось загрузить данные пользователя. Пожалуйста, попробуйте позже.');
        } finally {
          setLoading(false);
        }
      }, []);
      const fetchGameHistory = useCallback(async () => {
        if (!user) return;
        
        try {
          setHistoryLoading(true);
          const history = await userApi.getGameHistory();
          setGameHistory(history);
        } catch (err) {
          // Обработка ошибки без вывода в консоль
        } finally {
          setHistoryLoading(false);
        }
      }, [user]);
    useEffect(() => {
        if (isFirstRender.current) {
          fetchUserData().then(() => {
            isFirstRender.current = false;
          });
        }
      }, [fetchUserData]);
      const handleRefresh = () => {
        fetchUserData().then(() => {
          {/*ДОБАВИТЬ ОБНОВЛЕНИЕ ИСТОРИИ ИГР!!!!!!*/};
        });
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
                
                <div className="flex items-center gap-2 mt-4">
                  <button 
                    onClick={handleRefresh}
                    className="flex items-center gap-1 bg-white/20 text-white px-3 py-1 rounded-full text-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                      <path d="M16 21h5v-5" />
                    </svg>
                    Обновить
                  </button>
                </div>
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
                <div className="bg-white rounded-xl shadow-md p-6 mb-4">
                  <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Настройки
                  </h2>
                  <div className="border-b pb-4 mb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">Тема оформления</h3>
                        <p className="text-sm text-gray-500">Выберите светлую или темную тему</p>
                        <ThemeSwitch initialTheme={user.themePreference || 'light'} />
                      </div>
                    </div>
                  </div>
                </div>
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
                  <p className="text-2xl font-bold">победки</p>
                </div>
    
                <div className="bg-white rounded-xl p-4 shadow-md mb-6">
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
}
export default Profile;