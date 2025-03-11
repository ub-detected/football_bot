import React, { useState, useEffect, useRef } from 'react';
import { userApi } from '../api';
import { User } from '../types';
import { Trophy, Medal } from 'lucide-react';

const Leaderboard = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const listContainerRef = useRef(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { users: newUsers, pagination } = await userApi.getLeaderboard(page);
      setUsers(prev => [...prev, ...newUsers]);
      setHasMore(page < pagination.total_pages);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = () => {
    if (!listContainerRef.current || loading || loadingMore || !hasMore) return;

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
      await loadUsers();
    } finally {
      setLoadingMore(false);
    }
  };

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