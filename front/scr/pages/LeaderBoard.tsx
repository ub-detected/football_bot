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
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">Таблица лидеров</h1>
      <div 
        ref={listContainerRef}
        className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto"
      >
        {users.map((user, index) => (
          <div 
            className="bg-white rounded-lg p-4 shadow flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              {index < 3 ? (
                <Medal 
                  size={24} 
                  className={index === 0 ? 'text-yellow-500' : 
                            index === 1 ? 'text-gray-400' : 
                            'text-amber-700'} 
                />
              ) : (
                <span className="text-gray-500">#{index + 1}</span>
              )}
              <img 
                className="w-10 h-10 rounded-full"
              />
              <span className="font-medium"></span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" />
              <span className="text-green-600 font-bold"></span>
            </div>
          </div>
        ))}

        {loadingMore && (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>
    </div>
  );
};
export default Leaderboard;