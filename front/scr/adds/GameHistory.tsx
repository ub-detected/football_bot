import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameHistory } from '../types';
import { Clock, Trophy, Award, Flag, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { userApi } from '../api';

interface GameHistoryListProps {
  history: GameHistory[];
  loading: boolean;
}

const GameHistoryItem: React.FC<{ game: GameHistory }> = ({ game }) => {
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    };
    return (
        <div 
          className={`bg-white rounded-xl p-4 shadow-md border-l-4 ${
            game.wasWinner ? 'border-green-500' : 'border-red-500'
          } mb-3 animate-fade-in`}
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-800">ВСТАВИТЬ НАЗВАНИЕ ИГРЫ</h3>
              <p className="text-sm text-gray-500">{formatDate(game.playedAt || game.createdAt)}</p>
              <p className="text-sm text-gray-600 mt-1">
                <span className="font-medium">Локация:</span>
              </p>
              {game.wasCaptain && (
                <p className="text-xs text-blue-600 mt-1 flex items-center">
                  <Star size={12} className="mr-1" />
                  Капитан команды
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1">
                {game.wasWinner ? (
                  <Trophy size={16} className="text-green-500" />
                ) : (
                  <Flag size={16} className="text-red-500" />
                )}
                <span className={game.wasWinner ? 'text-green-600' : 'text-red-600'}>
                  {game.wasWinner ? 'Победа' : 'Поражение'}
                </span>
              </div>
              <p className="mt-1 text-lg font-bold">
                {game.scoreA} : {game.scoreB}
              </p>
              <p className="text-xs text-gray-500">
                {game.team === 'A' ? 'Команда A' : 'Команда B'}
              </p>
              {game.pointsEarned !== 0 && (
                <p className={`text-xs ${game.pointsEarned > 0 ? 'text-green-600' : 'text-red-600'} mt-1 font-semibold`}>
                  {game.pointsEarned > 0 ? '+' : ''}{game.pointsEarned} очков
                </p>
              )}
            </div>
          </div>
        </div>
      );
    };
const GameHistoryList: React.FC<GameHistoryListProps> = ({ history: initialHistory, loading: initialLoading }) => {
  const [history, setHistory] = useState<GameHistory[]>(initialHistory);
  const [loading, setLoading] = useState(initialLoading);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(true);
  const isLoadingRef = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setHistory(initialHistory);
    setLoading(initialLoading);
  }, [initialHistory, initialLoading]);
  const fetchMoreHistory = useCallback(async () => {
    if (isLoadingRef.current || !hasMore) return;
    try {
      setLoadingMore(true);
      isLoadingRef.current = true;
      const nextPage = page + 1;
      const moreHistory = await userApi.getGameHistory(nextPage);
      if (moreHistory.length === 0) {
        setHasMore(false);
      } else {
        setHistory(prev => [...prev, ...moreHistory]);
        setPage(nextPage);
      }
    } catch (err) {
      console.error('Error fetching more game history:', err);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      isLoadingRef.current = false;
    }
  }, [page, hasMore]);
  useEffect(() => {
    const handleScroll = () => {
      if (!listContainerRef.current || loading || loadingMore || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = listContainerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        fetchMoreHistory();
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
  }, [loading, loadingMore, hasMore, fetchMoreHistory]);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  if (loading && history.length === 0) {
    return (
      <div className="mt-6">
        <div className="text-gray-700 font-semibold mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span>История игр</span>
          </div>
          <div className="animate-pulse h-6 w-6 bg-gray-200 rounded-full"></div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white rounded-xl p-4 shadow-md animate-pulse">
              <div className="h-5 w-32 bg-gray-200 mb-2 rounded"></div>
              <div className="h-4 w-24 bg-gray-200 mb-2 rounded"></div>
              <div className="h-6 w-20 bg-gray-300 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (history.length === 0) {
    return (
      <div className="mt-6">
        <div className="text-gray-700 font-semibold mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <span>История игр</span>
          </div>
          <div className="w-6"></div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-md text-center text-gray-500">
          <p>У вас пока нет завершенных игр</p>
        </div>
      </div>
    );
}
  return (
    <div className="mt-6">
      <div 
        className="text-gray-700 font-semibold mb-3 flex items-center justify-between cursor-pointer"
        onClick={toggleExpanded}
      >
        <div className="flex items-center gap-2">
          <Clock size={18} />
          <span>История игр ({history.length})</span>
        </div>
        <div className="text-blue-600">
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      {expanded && (
        <div 
          ref={listContainerRef}
          className="max-h-[400px] overflow-y-auto no-scrollbar bg-white rounded-xl shadow-md p-4"
        >
          {history.map((game) => (
            <GameHistoryItem key={game.id} game={game} />
          ))}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          )}
          {!loadingMore && hasMore && (
            <button 
              onClick={fetchMoreHistory}
              className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 font-medium"
            >
              <ChevronDown size={16} />
              Загрузить еще
            </button>
          )}
          {!hasMore && history.length > 0 && (
            <div className="text-center text-gray-500 py-2">
              Вы достигли конца списка
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default GameHistoryList; 