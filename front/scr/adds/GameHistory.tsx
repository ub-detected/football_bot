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
  const isLoadingRef = useRef(false);
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
};
export default GameHistoryList; 