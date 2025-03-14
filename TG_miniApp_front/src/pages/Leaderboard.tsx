import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Trophy, Medal, RefreshCw, ChevronDown, ArrowLeft, Clock, UserIcon } from 'lucide-react';
import { userApi, PaginationData } from '../api';
import { User, GameHistory } from '../types';

const Leaderboard = () => {
  const [topPlayers, setTopPlayers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  // Добавляем состояния для просмотра профиля
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [playerGameHistory, setPlayerGameHistory] = useState<GameHistory[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Реф для отслеживания, находится ли компонент в процессе загрузки
  const isLoadingRef = useRef(false);
  // Реф для отслеживания, достигнут ли конец списка
  const endReachedRef = useRef(false);
  // Реф для контейнера списка (для определения прокрутки)
  const listContainerRef = useRef<HTMLDivElement>(null);
  // Реф для отслеживания первого рендера
  const isFirstRender = useRef(true);
  // Реф для отслеживания, происходит ли прокрутка
  const isScrolling = useRef(false);

  // Добавляем эффект для автоматического фокуса на прокручиваемом контейнере
  useEffect(() => {
    if (listContainerRef.current && !loading && topPlayers.length > 0) {
      listContainerRef.current.focus();
    }
  }, [loading, topPlayers]);

  // Обработчик события прокрутки
  useEffect(() => {
    const handleScroll = () => {
      isScrolling.current = true;
      
      // Устанавливаем таймер, чтобы сбросить флаг прокрутки через 100 мс после завершения прокрутки
      const timer = setTimeout(() => {
        isScrolling.current = false;
      }, 100);
      
      return () => clearTimeout(timer);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Функция для загрузки данных таблицы лидеров
  const fetchLeaderboard = useCallback(async (page: number = 1, reset: boolean = false, force: boolean = false) => {
    // Если происходит прокрутка и это не принудительное обновление, прерываем
    if ((isScrolling.current && !force) || isLoadingRef.current) return;
    
    try {
      if (page === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      isLoadingRef.current = true;
      
      const [leaderboardData, userData] = await Promise.all([
        userApi.getLeaderboard(page),
        page === 1 ? userApi.getCurrentUser() : Promise.resolve(currentUser)
      ]);
      
      if (reset) {
        setTopPlayers(leaderboardData.users);
      } else {
        setTopPlayers(prev => [...prev, ...leaderboardData.users]);
      }
      
      setPagination(leaderboardData.pagination);
      
      if (page === 1) {
        setCurrentUser(userData);
        
        // Определяем ранг текущего пользователя
        if (userData) {
          // Проверяем, есть ли пользователь в первой странице
          const userIndex = leaderboardData.users.findIndex(player => player.id === userData.id);
          if (userIndex !== -1) {
            setCurrentUserRank(userIndex + 1);
          } else {
            // Если пользователя нет в первой странице, делаем дополнительный запрос
            // для определения его позиции
            try {
              const allUsersResponse = await userApi.getAllUsers();
              
              // Сортируем пользователей по очкам
              const sortedUsers = allUsersResponse.sort((a: User, b: User) => b.score - a.score);
              const userRankIndex = sortedUsers.findIndex((player: User) => player.id === userData.id);
              
              if (userRankIndex !== -1) {
                setCurrentUserRank(userRankIndex + 1);
              }
            } catch (err) {
              console.error('Error determining user rank:', err);
            }
          }
        }
      }
      
      // Проверяем, достигнут ли конец списка
      if (leaderboardData.pagination.page >= leaderboardData.pagination.total_pages) {
        endReachedRef.current = true;
      } else {
        endReachedRef.current = false;
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
      setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [currentUser]);

  // Загрузка данных при первом рендере
  useEffect(() => {
    if (isFirstRender.current) {
      fetchLeaderboard(1, true, true);
      isFirstRender.current = false;
    }
    
    // Устанавливаем интервал для периодического обновления,
    // но только если не происходит прокрутка
    const intervalId = setInterval(() => {
      if (!isScrolling.current && !isLoadingRef.current) {
        fetchLeaderboard(1, true);
      }
    }, 30000); // Обновляем каждые 30 секунд
    
    return () => clearInterval(intervalId);
  }, [fetchLeaderboard]);

  // Обработчик прокрутки для подгрузки данных
  useEffect(() => {
    const handleScroll = () => {
      if (!listContainerRef.current || loading || loadingMore || endReachedRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
      
      // Если пользователь прокрутил до конца списка (с запасом в 200px)
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        // Загружаем следующую страницу
        if (pagination && pagination.page < pagination.total_pages) {
          fetchLeaderboard(pagination.page + 1, false, true);
        }
      }
    };
    
    const listContainer = listContainerRef.current;
    if (listContainer) {
      listContainer.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (listContainer) {
        listContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [loading, loadingMore, pagination, fetchLeaderboard]);

  // Функция для обновления данных
  const handleRefresh = () => {
    fetchLeaderboard(1, true, true);
  };

  // Функция для загрузки дополнительных данных
  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.total_pages) {
      fetchLeaderboard(pagination.page + 1, false, true);
    }
  };

  // Функция для просмотра профиля игрока
  const viewPlayerProfile = async (player: User) => {
    try {
      setLoadingProfile(true);
      setSelectedPlayer(player);
      
      // Используем новый API-метод для получения истории игр конкретного пользователя
      let gameHistory;
      
      // Определяем, смотрим ли мы свой профиль
      const isCurrentUser = currentUser?.id === player.id;
      
      if (isCurrentUser) {
        // Если смотрим свой профиль, используем текущий API-метод
        gameHistory = await userApi.getGameHistory();
      } else {
        // Если смотрим другого игрока, используем новый API-метод
        gameHistory = await userApi.getUserGameHistory(player.id);
      }
      
      // Если история пустая для другого игрока, и мы находимся в демо-режиме,
      // можно использовать генерацию демо-истории (опционально)
      if (gameHistory.length === 0 && !isCurrentUser) {
        // Комментарий для разработчика: раскомментируйте код ниже, если хотите
        // использовать демо-историю когда нет реальных данных
        /*
        gameHistory = generateDemoGameHistory(player, 5);
        */
      }
      
      setPlayerGameHistory(gameHistory);
    } catch (error) {
      console.error('Failed to fetch player profile:', error);
      setError('Не удалось загрузить профиль игрока.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Функция для генерации демо-истории игр (для других игроков)
  const generateDemoGameHistory = (player: User, count: number): GameHistory[] => {
    const history: GameHistory[] = [];
    const gameResults = ['Победа', 'Поражение', 'Ничья'];
    const gameNames = ['Футбол во дворе', 'Матч на стадионе', 'Товарищеская игра', 'Вечерний матч', 'Дворовой турнир'];
    
    for (let i = 0; i < count; i++) {
      const isWin = Math.random() > 0.5;
      const isDraw = !isWin && Math.random() > 0.7;
      const result = isDraw ? gameResults[2] : (isWin ? gameResults[0] : gameResults[1]);
      
      const scoreA = Math.floor(Math.random() * 5);
      const scoreB = isDraw ? scoreA : (isWin ? Math.floor(Math.random() * scoreA) : scoreA + 1 + Math.floor(Math.random() * 3));
      
      const pointsEarned = isDraw ? 0 : (isWin ? 10 + Math.floor(Math.random() * 20) : -1 * (5 + Math.floor(Math.random() * 15)));
      
      const daysAgo = Math.floor(Math.random() * 60);
      const playedAt = new Date();
      playedAt.setDate(playedAt.getDate() - daysAgo);
      
      history.push({
        id: i + 1,
        user: player,
        gameRoom: {
          id: 1000 + i,
          name: gameNames[Math.floor(Math.random() * gameNames.length)],
          status: 'completed',
          players: [],
          teamA: [],
          teamB: [],
          creator: player,
          maxPlayers: 10,
          location: 'Демо локация',
          timeRange: 'Демо время',
          captainA: null,
          captainB: null,
          scoreA: scoreA,
          scoreB: scoreB,
          captainASubmitted: false,
          captainBSubmitted: false,
          scoreMismatch: false,
          scoreSubmissionAttempts: 0
        },
        wasWinner: isWin,
        team: Math.random() > 0.5 ? 'A' : 'B',
        scoreA: scoreA,
        scoreB: scoreB,
        wasCaptain: Math.random() > 0.7,
        result: result,
        pointsEarned: pointsEarned,
        playedAt: playedAt.toISOString(),
        createdAt: playedAt.toISOString()
      });
    }
    
    // Сортируем по дате (сначала новые)
    return history.sort((a, b) => 
      new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
    );
  };
  
  // Функция для возврата к списку лидеров
  const returnToLeaderboard = () => {
    setSelectedPlayer(null);
    setPlayerGameHistory([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg relative">
        {/* Кнопка обновления */}
        {!loading && (
          <button 
            onClick={handleRefresh}
            className="absolute right-4 top-4 bg-white/20 rounded-full p-2"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        )}
        
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Trophy /> Таблица лидеров
        </h1>
      </div>

      <div className="p-4">
        {loading && !selectedPlayer ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
            {error}
          </div>
        ) : selectedPlayer ? (
          // Отображаем профиль выбранного игрока
          <div className="animate-fade-in">
            <button 
              onClick={returnToLeaderboard}
              className="mb-4 inline-flex items-center gap-2 text-blue-600 font-medium"
            >
              <ArrowLeft size={18} /> Вернуться к таблице лидеров
            </button>
            
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center mb-6">
                <img
                  src={selectedPlayer.photoUrl}
                  alt={selectedPlayer.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="ml-4">
                  <h2 className="text-xl font-bold">{selectedPlayer.username}</h2>
                  <div className="flex items-center gap-2 text-blue-600">
                    <Trophy size={18} /> {selectedPlayer.score} трофеев
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{selectedPlayer.gamesPlayed}</div>
                  <div className="text-sm text-gray-600">Игр сыграно</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">{selectedPlayer.gamesWon}</div>
                  <div className="text-sm text-gray-600">Побед</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold">
                    {selectedPlayer.gamesPlayed > 0 
                      ? Math.round((selectedPlayer.gamesWon / selectedPlayer.gamesPlayed) * 100) 
                      : 0}%
                  </div>
                  <div className="text-sm text-gray-600">Процент побед</div>
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-4">История игр</h3>
              
              {loadingProfile ? (
                <div className="flex justify-center items-center h-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              ) : playerGameHistory.length === 0 ? (
                <p className="text-gray-500 text-center py-4">У этого игрока пока нет истории игр.</p>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                  {playerGameHistory.map(game => (
                    <div 
                      key={game.id} 
                      className={`border rounded-lg p-3 ${
                        game.wasWinner ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium">{game.gameRoom.name}</div>
                        <div className={`text-sm font-bold px-2 py-1 rounded-full ${
                          game.wasWinner ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                        }`}>
                          {game.result}
                        </div>
                      </div>
                      
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(game.playedAt).toLocaleDateString()}
                        </div>
                        {game.gameDuration && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full">
                              {game.gameDuration}
                            </span>
                          </div>
                        )}
                        <div>
                          {game.pointsEarned > 0 ? '+' : ''}{game.pointsEarned} ⭐
                        </div>
                      </div>
                      
                      {/* Информация о времени игры */}
                      {game.gameStartTime && game.gameEndTime && (
                        <div className="text-xs text-gray-500 mt-1 mb-2">
                          <div className="flex justify-between">
                            <span>Начало: {new Date(game.gameStartTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                            <span>Конец: {new Date(game.gameEndTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex justify-center items-center gap-2">
                        <div className="text-center">
                          <div className="text-blue-800 text-xs">Команда A</div>
                          <div className="font-bold">{game.scoreA}</div>
                        </div>
                        <div className="text-xs font-bold">:</div>
                        <div className="text-center">
                          <div className="text-red-800 text-xs">Команда B</div>
                          <div className="font-bold">{game.scoreB}</div>
                        </div>
                      </div>
                </div>
              ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Блок с текущим пользователем - всегда отображается вверху */}
            {currentUser && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Ваша позиция</h2>
                <div className={`bg-white rounded-xl shadow-md p-4 flex items-center justify-between your-position`}>
                  <div className="flex items-center">
                    <div className="text-xl font-bold w-10 text-center">{currentUserRank || '?'}</div>
                    <img
                      src={currentUser.photoUrl}
                      alt={currentUser.username}
                      className="w-12 h-12 rounded-full object-cover mx-4"
                    />
                    <div className="font-semibold">{currentUser.username}</div>
                  </div>
                  <div className="score text-blue-600 text-xl font-bold">{currentUser.score}</div>
                </div>
              </div>
            )}
            
            {/* Заголовок списка - вынесен из прокручиваемой области */}
            <h2 className="text-xl font-semibold mb-4">Лучшие игроки</h2>
            
            {/* Список лидеров с возможностью прокрутки */}
            <div 
              ref={listContainerRef} 
              className="bg-white rounded-xl shadow-md p-4 max-h-[calc(100vh-300px)] overflow-y-auto scrollbar-hide"
              tabIndex={0}
              style={{ outline: 'none' }}
            >
              {topPlayers.map((player, index) => (
                <div 
                  key={player.id} 
                  className={`player-card bg-white rounded-xl shadow-md p-4 flex items-center justify-between hover:bg-gray-100 cursor-pointer ${
                    currentUser && player.id === currentUser.id ? 'your-position' : ''
                  }`}
                  onClick={() => viewPlayerProfile(player)}
                >
                  <div className="flex items-center">
                    {index < 3 ? (
                      <div className="w-8 h-8 flex items-center justify-center">
                        {index === 0 && <Medal className="w-8 h-8 text-yellow-400" />}
                        {index === 1 && <Medal className="w-8 h-8 text-gray-400" />}
                        {index === 2 && <Medal className="w-8 h-8 text-amber-600" />}
                      </div>
                    ) : (
                      <div className="text-lg font-semibold w-8 h-8 flex items-center justify-center">{index + 1}</div>
                    )}
                    <img
                      src={player.photoUrl}
                      alt={player.username}
                      className="w-12 h-12 rounded-full object-cover mx-3"
                    />
                    <div className="font-semibold">{player.username}</div>
                  </div>
                  <div className="score text-blue-600 text-xl font-bold">{player.score}</div>
                </div>
              ))}
              
              {/* Индикатор загрузки дополнительных данных */}
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              {/* Кнопка "Загрузить еще" */}
              {!loadingMore && pagination && pagination.page < pagination.total_pages && (
                <button 
                  onClick={handleLoadMore}
                  className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 font-medium"
                >
                  <ChevronDown size={16} />
                  Загрузить еще
                </button>
              )}
              
              {/* Сообщение о конце списка */}
              {pagination && pagination.page >= pagination.total_pages && topPlayers.length > 0 && (
                <div className="text-center text-gray-500 py-2">
                  Вы достигли конца списка
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;

// Стили для скрытия скроллбара
const style = document.createElement('style');
style.textContent = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;
document.head.appendChild(style);