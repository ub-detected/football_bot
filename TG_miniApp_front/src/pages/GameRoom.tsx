import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, MapPin, Clock, Crown, Flag, AlertTriangle, LogOut, RefreshCw } from 'lucide-react';
import { gameRoomApi, userApi } from '../api';
import { GameRoom as GameRoomType, User } from '../types';

const GameRoom = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [gameRoom, setGameRoom] = useState<GameRoomType | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportedUserId, setReportedUserId] = useState<number | null>(null);
  const [reportReason, setReportReason] = useState('');
  
  // Реф для отслеживания, происходит ли прокрутка
  const isScrolling = useRef(false);
  // Реф для отслеживания первого рендера
  const isFirstRender = useRef(true);

  // Добавляем состояние для отслеживания выполнения действий
  const [isPerformingAction, setIsPerformingAction] = useState(false);

  // Добавляем состояние для истории игры
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  // Функция для загрузки данных
  const fetchData = useCallback(async (force = false) => {
    // Если происходит прокрутка и это не принудительное обновление, прерываем
    if (isScrolling.current && !force) return;
    
    try {
      setLoading(true);
      const [userData, roomData] = await Promise.all([
        userApi.getCurrentUser(),
        gameRoomApi.getGameRoom(parseInt(roomId || '0'))
      ]);
      
      setCurrentUser(userData);
      setGameRoom(roomData);
      
      // Если игра завершена, также получаем историю игры
      if (roomData.status === 'completed') {
        try {
          const history = await userApi.getGameHistory();
          
          // Ищем все записи для этой игровой комнаты
          const roomHistory = history.filter(entry => entry.gameRoom.id === parseInt(roomId || '0'));
          
          // Ищем запись для текущего пользователя
          if (userData) {
            const userEntry = roomHistory.find(entry => entry.user.id === userData.id);
            
            if (userEntry) {
              setGameHistory([userEntry]);
            }
          }
        } catch (historyError) {
          // Подавляем ошибку
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Не удалось загрузить данные игровой комнаты. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

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

  // Загрузка данных при первом рендере
  useEffect(() => {
    if (isFirstRender.current) {
      fetchData(true);
      isFirstRender.current = false;
    }
    
    // Устанавливаем интервал для периодического обновления,
    // но только если не происходит прокрутка
    const intervalId = setInterval(() => {
      if (!isScrolling.current) {
        fetchData();
      }
    }, 10000); // Увеличим интервал до 10 секунд, чтобы уменьшить нагрузку
    
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Функция для принудительного обновления данных
  const handleRefresh = () => {
    fetchData(true);
  };

  const handleStartTeamSelection = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      const updatedRoom = await gameRoomApi.startTeamSelection(parseInt(roomId || '0'));
      setGameRoom(updatedRoom);
    } catch (err) {
      setError('Не удалось начать выбор команд. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleStartGame = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      const updatedRoom = await gameRoomApi.startGame(parseInt(roomId || '0'));
      setGameRoom(updatedRoom);
    } catch (err) {
      setError('Не удалось начать игру. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleEndGame = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      const updatedRoom = await gameRoomApi.endGame(parseInt(roomId || '0'));
      setGameRoom(updatedRoom);
    } catch (err) {
      setError('Не удалось завершить игру. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsPerformingAction(true);
      setLoading(true);
      
      // Формируем строку счета в формате A:B для бэкенда
      const formattedScore = `${scoreA}:${scoreB}`;
      
      const result = await gameRoomApi.submitScore(parseInt(roomId || '0'), formattedScore);
      
      if (result.room) {
        setGameRoom(result.room);
      }
      
      // Сбрасываем значения полей ввода счета
      setScoreA(0);
      setScoreB(0);
      
      const fetchRoomData = async () => {
        try {
          const updatedRoom = await gameRoomApi.getGameRoom(parseInt(roomId || '0'));
          setGameRoom(updatedRoom);
          setLoading(false);
        } catch (err) {
          console.error('Error fetching updated room data:', err);
          setLoading(false);
        }
      };
      
      // Через 2 секунды повторно запрашиваем данные комнаты
      // чтобы убедиться, что получаем самую актуальную информацию
      setTimeout(fetchRoomData, 2000);
    } catch (err: any) {
      console.error('Error submitting score:', err);
      // Более информативное сообщение об ошибке
      if (err.response && err.response.data && err.response.data.message) {
        setError(`Ошибка: ${err.response.data.message}`);
      } else {
        setError('Не удалось отправить счет. Пожалуйста, попробуйте позже.');
      }
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const handleReportPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportedUserId || !reportReason) return;
    
    try {
      setIsPerformingAction(true);
      setLoading(true);
      await gameRoomApi.reportPlayer(parseInt(roomId || '0'), reportedUserId, reportReason);
      setReportModalOpen(false);
      setReportedUserId(null);
      setReportReason('');
      alert('Жалоба отправлена успешно!');
    } catch (err) {
      setError('Не удалось отправить жалобу. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  const openReportModal = (userId: number) => {
    setReportedUserId(userId);
    setReportModalOpen(true);
  };

  const isCreator = currentUser?.id === gameRoom?.creator.id;
  const isCaptainA = currentUser?.id === gameRoom?.captainA?.id;
  const isCaptainB = currentUser?.id === gameRoom?.captainB?.id;
  const isCaptain = isCaptainA || isCaptainB;

  const handleLeaveRoom = async () => {
    try {
      setIsPerformingAction(true);
      setLoading(true);
      await gameRoomApi.leaveGameRoom(parseInt(roomId || '0'));
      navigate('/games');
    } catch (err) {
      setError('Не удалось покинуть комнату. Пожалуйста, попробуйте позже.');
      setLoading(false);
      setIsPerformingAction(false);
    }
  };

  if (loading && !gameRoom) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error && !gameRoom) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
        <button
          onClick={() => navigate('/games')}
          className="mt-4 w-full bg-blue-600 text-white rounded-xl py-3"
        >
          Вернуться к списку игр
        </button>
      </div>
    );
  }

  if (!gameRoom) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl">
          Игровая комната не найдена
        </div>
        <button
          onClick={() => navigate('/games')}
          className="mt-4 w-full bg-blue-600 text-white rounded-xl py-3"
        >
          Вернуться к списку игр
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 relative">
        {/* Кнопка обновления - скрываем при выполнении действий или загрузке */}
        {!loading && !isPerformingAction && !reportModalOpen && (
          <button 
            onClick={handleRefresh}
            className="absolute right-4 top-4 bg-white/20 rounded-full p-2"
            style={{ top: '16px' }}
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        )}
        
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold mr-12">
            {gameRoom?.name || 'Загрузка...'}
          </h1>
          {gameRoom && gameRoom.status === 'waiting' && (
            <button 
              onClick={handleLeaveRoom} 
              className="flex items-center gap-1 bg-red-500 text-white px-3 py-1 rounded-full text-sm absolute right-16 top-4"
            >
              <LogOut size={16} />
              Выйти
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <MapPin size={16} />
          <span>{gameRoom.location}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Clock size={16} />
          <span>{gameRoom.timeRange}</span>
        </div>
      </div>

      <div className="p-4">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        {/* Статус: ожидание */}
        {gameRoom.status === 'waiting' && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold mb-2">Статус: Ожидание игроков</h2>
            <div className="flex items-center gap-2 text-gray-600 mb-4">
              <Users size={18} />
              <span>{gameRoom.players.length}/{gameRoom.maxPlayers}</span>
            </div>
            
            {gameRoom.players.length === gameRoom.maxPlayers && isCreator && (
              <button
                onClick={handleStartTeamSelection}
                className="w-full bg-green-600 text-white rounded-lg py-3 font-medium"
              >
                Начать распределение команд
              </button>
            )}
            
            {gameRoom.players.length < gameRoom.maxPlayers && (
              <p className="text-center text-gray-600">
                Ожидание заполнения комнаты ({gameRoom.maxPlayers - gameRoom.players.length} мест осталось)
              </p>
            )}
          </div>
        )}

        {/* Статус: выбор команд */}
        {gameRoom.status === 'team_selection' && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold mb-4">Статус: Распределение команд</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-1">
                  <span>Команда A</span>
                  {gameRoom.captainA && (
                    <div className="ml-auto flex items-center gap-1 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">
                      <Crown size={12} />
                      <span>Капитан</span>
                    </div>
                  )}
                </h3>
                <ul className="space-y-2">
                  {gameRoom.teamA.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className={player.id === gameRoom.captainA?.id ? 'font-semibold' : ''}>
                        {player.username}
                      </span>
                      {player.id !== currentUser?.id && (
                        <button
                          onClick={() => openReportModal(player.id)}
                          className="ml-auto text-red-500"
                          title="Пожаловаться"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-1">
                  <span>Команда B</span>
                  {gameRoom.captainB && (
                    <div className="ml-auto flex items-center gap-1 text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                      <Crown size={12} />
                      <span>Капитан</span>
                    </div>
                  )}
                </h3>
                <ul className="space-y-2">
                  {gameRoom.teamB.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className={player.id === gameRoom.captainB?.id ? 'font-semibold' : ''}>
                        {player.username}
                      </span>
                      {player.id !== currentUser?.id && (
                        <button
                          onClick={() => openReportModal(player.id)}
                          className="ml-auto text-red-500"
                          title="Пожаловаться"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {isCreator && (
              <button
                onClick={handleStartGame}
                className="w-full bg-green-600 text-white rounded-lg py-3 font-medium"
              >
                Начать игру
              </button>
            )}
          </div>
        )}

        {/* Статус: игра в процессе */}
        {gameRoom.status === 'in_progress' && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold mb-4">Статус: Игра идет</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Команда A</h3>
                <ul className="space-y-2">
                  {gameRoom.teamA.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className={player.id === gameRoom.captainA?.id ? 'font-semibold' : ''}>
                        {player.username}
                        {player.id === gameRoom.captainA?.id && ' (К)'}
                      </span>
                      {player.id !== currentUser?.id && (
                        <button
                          onClick={() => openReportModal(player.id)}
                          className="ml-auto text-red-500"
                          title="Пожаловаться"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-2">Команда B</h3>
                <ul className="space-y-2">
                  {gameRoom.teamB.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className={player.id === gameRoom.captainB?.id ? 'font-semibold' : ''}>
                        {player.username}
                        {player.id === gameRoom.captainB?.id && ' (К)'}
                      </span>
                      {player.id !== currentUser?.id && (
                        <button
                          onClick={() => openReportModal(player.id)}
                          className="ml-auto text-red-500"
                          title="Пожаловаться"
                        >
                          <Flag size={14} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {isCaptain && (
              <div className="mt-4">
                <button
                  onClick={handleEndGame}
                  className={`w-full py-3 rounded-lg font-medium ${
                    (isCaptainA && gameRoom.captainASubmitted) || (isCaptainB && gameRoom.captainBSubmitted)
                      ? 'bg-gray-300 text-gray-700'
                      : 'bg-red-600 text-white'
                  }`}
                  disabled={(isCaptainA && gameRoom.captainASubmitted) || (isCaptainB && gameRoom.captainBSubmitted)}
                >
                  {(isCaptainA && gameRoom.captainASubmitted) || (isCaptainB && gameRoom.captainBSubmitted)
                    ? 'Ожидание другого капитана'
                    : 'Завершить игру'}
                </button>
                {((isCaptainA && gameRoom.captainASubmitted) || (isCaptainB && gameRoom.captainBSubmitted)) && (
                  <p className="text-center text-gray-600 mt-2">
                    Ожидание подтверждения от другого капитана
                  </p>
                )}
              </div>
            )}
            
            {!isCaptain && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                <p className="text-center text-yellow-800">
                  Игра в процессе. Ожидайте завершения от капитанов команд.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Статус: ввод счета */}
        {gameRoom.status === 'score_submission' && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <h2 className="text-lg font-semibold mb-4">Статус: Ввод счета</h2>
            
            {gameRoom && gameRoom.status === 'score_submission' && gameRoom.scoreMismatch && (
              <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl mb-4">
                <p className="font-bold">Внимание! Несовпадение счетов</p>
                <p>Капитаны ввели разные счеты. Попытка {gameRoom.scoreSubmissionAttempts} из 2.</p>
                <p className="mt-2">При повторном несовпадении обеим командам будет засчитано поражение!</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Команда A</h3>
                <ul className="space-y-2">
                  {gameRoom.teamA.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span>{player.username}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-red-50 rounded-xl p-4">
                <h3 className="font-semibold text-red-800 mb-2">Команда B</h3>
                <ul className="space-y-2">
                  {gameRoom.teamB.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span>{player.username}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            {isCaptain && (
              <div className="mt-4">
                {((isCaptainA && !gameRoom.captainASubmitted) || (isCaptainB && !gameRoom.captainBSubmitted)) ? (
                  <form onSubmit={handleSubmitScore}>
                    <div className="mb-4">
                      <label className="block text-gray-700 mb-2">
                        Введите счет матча
                      </label>
                      
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <label className="block text-sm text-gray-600 mb-1">
                            Команда A забила
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={scoreA === 0 ? "" : scoreA}
                            onChange={(e) => {
                              const value = e.target.value;
                              setScoreA(value === "" ? 0 : parseInt(value));
                            }}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center"
                            required
                          />
                        </div>
                        
                        <div className="text-xl font-bold">:</div>
                        
                        <div className="flex-1">
                          <label className="block text-sm text-gray-600 mb-1">
                            Команда B забила
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="99"
                            value={scoreB === 0 ? "" : scoreB}
                            onChange={(e) => {
                              const value = e.target.value;
                              setScoreB(value === "" ? 0 : parseInt(value));
                            }}
                            placeholder="0"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
                    >
                      Отправить счет
                    </button>
                  </form>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="text-center text-yellow-800">
                      Ожидание ввода счета от другого капитана
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {!isCaptain && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mt-4">
                <p className="text-center text-yellow-800">
                  Капитаны вводят счет игры. Пожалуйста, подождите.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Статус: игра завершена */}
        {gameRoom.status === 'completed' && (
          <div className="bg-white rounded-xl shadow-md p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">Статус: Игра завершена</h2>
              
              {/* Отображение полученных/потерянных трофеев текущего игрока */}
              {gameHistory.length > 0 && (
                <div className={`text-sm font-bold px-3 py-1 rounded-full ${
                  gameHistory[0].points_earned > 0 
                    ? 'text-white bg-green-600' 
                    : gameHistory[0].points_earned < 0 
                      ? 'text-white bg-red-600' 
                      : 'text-gray-800 bg-gray-200'
                }`}>
                  {gameHistory[0].points_earned > 0 ? '+' : ''}{gameHistory[0].points_earned} ⭐
                </div>
              )}
            </div>
            
            <div className="flex justify-center items-center gap-4 my-6">
              <div className="text-center">
                <div className="text-blue-800 font-bold text-2xl">Команда A</div>
                <div className="text-4xl font-bold">{gameRoom.scoreA}</div>
              </div>
              <div className="text-xl font-bold">:</div>
              <div className="text-center">
                <div className="text-red-800 font-bold text-2xl">Команда B</div>
                <div className="text-4xl font-bold">{gameRoom.scoreB}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={`rounded-xl p-4 ${
                gameRoom.scoreA !== null && gameRoom.scoreB !== null
                  ? gameRoom.scoreA > gameRoom.scoreB 
                    ? 'bg-green-50' 
                    : gameRoom.scoreA < gameRoom.scoreB 
                      ? 'bg-red-50' 
                      : 'bg-yellow-50'
                  : 'bg-gray-50'
              }`}>
                <h3 className="font-semibold mb-2">Команда A</h3>
                <ul className="space-y-2">
                  {gameRoom.teamA.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="truncate flex-1">{player.username}</span>
                      {gameRoom.scoreA !== null && gameRoom.scoreB !== null && gameRoom.scoreA > gameRoom.scoreB && (
                        <span className="ml-auto text-green-600 font-semibold whitespace-nowrap">Победа</span>
                      )}
                      {gameRoom.scoreA !== null && gameRoom.scoreB !== null && gameRoom.scoreA < gameRoom.scoreB && (
                        <span className="ml-auto text-red-600 whitespace-nowrap">Проигрыш</span>
                      )}
                      {gameRoom.scoreA !== null && gameRoom.scoreB !== null && gameRoom.scoreA === gameRoom.scoreB && (
                        <span className="ml-auto text-yellow-600 whitespace-nowrap">Ничья</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className={`rounded-xl p-4 ${
                gameRoom.scoreA !== null && gameRoom.scoreB !== null
                  ? gameRoom.scoreB > gameRoom.scoreA 
                    ? 'bg-green-50' 
                    : gameRoom.scoreB < gameRoom.scoreA 
                      ? 'bg-red-50' 
                      : 'bg-yellow-50'
                  : 'bg-gray-50'
              }`}>
                <h3 className="font-semibold mb-2">Команда B</h3>
                <ul className="space-y-2">
                  {gameRoom.teamB.map(player => (
                    <li key={player.id} className="flex items-center gap-2">
                      <img
                        src={player.photoUrl}
                        alt={player.username}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="truncate flex-1">{player.username}</span>
                      {gameRoom.scoreB !== null && gameRoom.scoreA !== null && gameRoom.scoreB > gameRoom.scoreA && (
                        <span className="ml-auto text-green-600 font-semibold whitespace-nowrap">Победа</span>
                      )}
                      {gameRoom.scoreB !== null && gameRoom.scoreA !== null && gameRoom.scoreB < gameRoom.scoreA && (
                        <span className="ml-auto text-red-600 whitespace-nowrap">Проигрыш</span>
                      )}
                      {gameRoom.scoreB !== null && gameRoom.scoreA !== null && gameRoom.scoreB === gameRoom.scoreA && (
                        <span className="ml-auto text-yellow-600 whitespace-nowrap">Ничья</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/games')}
              className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
            >
              Вернуться к списку игр
            </button>
          </div>
        )}

        {/* Список всех игроков */}
        <div className="bg-white rounded-xl shadow-md p-4">
          <h2 className="text-lg font-semibold mb-4">Все игроки</h2>
          <ul className="space-y-2">
            {gameRoom.players.map(player => (
              <li key={player.id} className="flex items-center gap-2">
                <img
                  src={player.photoUrl}
                  alt={player.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{player.username}</p>
                  <p className="text-xs text-gray-600">
                    {player.id === gameRoom.creator.id && 'Создатель'}
                    {player.id === gameRoom.captainA?.id && ' • Капитан команды A'}
                    {player.id === gameRoom.captainB?.id && ' • Капитан команды B'}
                  </p>
                </div>
                {player.id !== currentUser?.id && (
                  <button
                    onClick={() => openReportModal(player.id)}
                    className="ml-auto text-red-500"
                    title="Пожаловаться"
                  >
                    <Flag size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Модальное окно для жалобы */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="text-red-500" />
              <h2 className="text-xl font-bold">Пожаловаться на игрока</h2>
            </div>
            
            <form onSubmit={handleReportPlayer}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Причина жалобы</label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-32"
                  placeholder="Опишите причину жалобы..."
                  required
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportModalOpen(false);
                    setReportedUserId(null);
                    setReportReason('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 rounded-lg py-3 font-medium"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white rounded-lg py-3 font-medium"
                >
                  Отправить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom; 