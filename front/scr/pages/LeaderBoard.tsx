import React, { useState, useEffect, useRef, useCallback } from 'react';
import { userApi, PaginationData } from '../api';
import { User, GameHistory } from '../types';
import { Trophy, Medal, RefreshCw, ChevronDown, ArrowLeft, Clock, UserIcon } from 'lucide-react';

const Leaderboard = () => {
  const [playerGameHistory, setPlayerGameHistory] = useState<GameHistory[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [topPlayers, setTopPlayers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);
  const endReachedRef = useRef(false);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (listContainerRef.current && !loading && topPlayers.length > 0) {
      listContainerRef.current.focus();
    }
  }, []);

  const fetchLeaderboard = useCallback(async (page: number = 1, reset: boolean = false) => {
    if (isLoadingRef.current) return;
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
        if (userData) {
          const userIndex = leaderboardData.users.findIndex(player => player.id === userData.id);
          if (userIndex !== -1) {
            setCurrentUserRank(userIndex + 1);
          } else {
            try {
              const allUsersResponse = await userApi.getAllUsers();
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

  useEffect(() => {
    fetchLeaderboard(1, true);
  }, [fetchLeaderboard]);

  useEffect(() => {
    const handleScroll = () => {
      if (!listContainerRef.current || loading || loadingMore || endReachedRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 200) {
        if (pagination && pagination.page < pagination.total_pages) {
          fetchLeaderboard(pagination.page + 1);
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

  const handleRefresh = () => {
    fetchLeaderboard(1, true);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.total_pages) {
      fetchLeaderboard(pagination.page + 1);
    }
  };

  const returnToLeaderboard = () => {
    setSelectedPlayer(null);
    setPlayerGameHistory([]);
  };

//ЕСЛИ НЕТ В БАЗЕ ДАННЫХ НИКОГО
  const viewPlayerProfile = async (player: User) => {
    try {
      setLoadingProfile(true);
      setSelectedPlayer(player);
      let gameHistory;
      const isCurrentUser = currentUser?.id === player.id;
      
      if (isCurrentUser) {
        gameHistory = await userApi.getGameHistory();
      } else {
        gameHistory = await userApi.getUserGameHistory(player.id);
      }
      if (gameHistory.length === 0 && !isCurrentUser) {
      }
      setPlayerGameHistory(gameHistory);
    } catch (error) {
      console.error('Failed to fetch player profile:', error);
      setError('Не удалось загрузить профиль игрока.');
    } finally {
      setLoadingProfile(false);
    }
  };
 //ГЕНЕРАЦИЯ ДЕМО ИГР
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
      //ДОБАВИТЬ ИЗ GAMEROOM которую делает коля
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
  return history.sort((a, b) => 
    new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );
};
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg relative">
        {!loading && (
          <button 
            onClick={handleRefresh}
            className="absolute right-4 top-4 bg-white/20 rounded-full p-2"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        )}
      <h1 className="text-2xl font-bold flex items-center gap-2"><Trophy /> Таблица лидеров</h1>
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
                        <div className="font-medium"></div>
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
            <h2 className="text-xl font-semibold mb-4">Лучшие игроки</h2>
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
              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
                </div>
              )}
              {!loadingMore && pagination && pagination.page < pagination.total_pages && (
                <button 
                  onClick={handleLoadMore}
                  className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 font-medium"
                >
                  <ChevronDown size={16} />
                  Загрузить еще
                </button>
              )}
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