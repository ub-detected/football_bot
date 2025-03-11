import React, { useState, useEffect, useRef } from 'react';
import { userApi } from '../api';
import { User } from '../types';
import { Trophy, Medal, RefreshCw, ChevronDown, ArrowLeft, Clock, UserIcon } from 'lucide-react';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listContainerRef = useRef(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  const loadPlayers = async () => {
    try {
      setIsLoading(true);
            const response = await fetch(`http://localhost:5001/api/leaderboard?page=${page}`);
            const data = await response.json();
            setUsers(prevPlayers => [...prevPlayers, ...data.users]);
            setHasMore(page < data.pagination.total_pages);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = () => {
    if (!listContainerRef.current || isLoading || loadingMore || !hasMore) return;
        const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadMore();
        }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      setPage(prev => prev + 1);
      await loadPlayers();
    } finally {
      setLoadingMore(false);
    }
  };
  if (isLoading && players.length === 0) {
    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Таблица лидеров</h1>
            <div className="text-center">Загрузка...</div>
        </div>
    );
}

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold mb-4">Таблица лидеров</h1>
      <div 
        ref={listContainerRef}
        className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto"
        onScroll={handleScroll}
      >
        {users.map((user, index) => (
          <div 
            key={user.id} 
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
                src={user.photoUrl} 
                alt={user.username} 
                className="w-10 h-10 rounded-full"
              />
              <span className="font-medium">{user.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={20} className="text-yellow-500" />
              <span className="text-green-600 font-bold">{user.score}</span>
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