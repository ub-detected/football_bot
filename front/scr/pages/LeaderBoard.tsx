import React, { useState, useEffect, useRef, useCallback } from 'react';
import { userApi, PaginationData } from '../api';
import { User, GameHistory } from '../types';
import { Trophy, Medal, RefreshCw, ChevronDown, ArrowLeft, Clock, UserIcon } from 'lucide-react';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
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