import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, MapPin, Clock, Crown, Plus, X, Castle as Whistle, Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { gameRoomApi, userApi } from '../api';
import { API_URL } from '../api';
import { GameRoom, User } from '../types';
import { useNavigate } from 'react-router-dom';
import LocationAutocomplete from '../components/LocationAutocomplete';

const Games = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGame, setNewGame] = useState({
    name: '',
    location: '',
    maxPlayers: 16,
    timeRange: ''
  });
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Состояния для поиска и фильтрации
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedTimeRanges, setSelectedTimeRanges] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // Предопределенные временные интервалы
  const predefinedTimeRanges = [
    'Раннее утро (6:00-8:00)', 
    'Утро (8:00-10:00)', 
    'Позднее утро (10:00-12:00)',
    'Ранний день (12:00-14:00)', 
    'День (14:00-16:00)', 
    'Поздний день (16:00-18:00)',
    'Ранний вечер (18:00-20:00)', 
    'Вечер (20:00-22:00)', 
    'Поздний вечер (22:00-00:00)',
    'Ночь (00:00-6:00)'
  ];

  // Реф для отслеживания первого рендера
  const isFirstRender = useRef(true);
  // Реф для отслеживания, происходит ли прокрутка
  const isScrolling = useRef(false);
  
  // Добавляем состояние для отслеживания входа в игру
  const [isJoiningGame, setIsJoiningGame] = useState(false);
  
  // Состояние для управления ползунком времени
  const [timeSliderValue, setTimeSliderValue] = useState(8); // Начальное значение - 8:00

  // Функция для преобразования значения ползунка во временной интервал
  const getTimeRangeFromSlider = (value: number): string => {
    const timeRanges = [
      'Раннее утро (6:00-8:00)', 
      'Утро (8:00-10:00)', 
      'Позднее утро (10:00-12:00)',
      'Ранний день (12:00-14:00)', 
      'День (14:00-16:00)', 
      'Поздний день (16:00-18:00)',
      'Ранний вечер (18:00-20:00)', 
      'Вечер (20:00-22:00)', 
      'Поздний вечер (22:00-00:00)',
      'Ночь (00:00-6:00)'
    ];
    
    const index = Math.floor((value - 6) / 2) % 10;
    return timeRanges[index];
  };

  // Функция для установки временного интервала по значению ползунка
  const handleTimeSliderChange = (value: number) => {
    setTimeSliderValue(value);
    const timeRange = getTimeRangeFromSlider(value);
    setNewGame({ ...newGame, timeRange });
  };

  // Функция для обработки выбора временного интервала в фильтре
  const handleTimeRangeFilterToggle = (timeRange: string) => {
    if (selectedTimeRanges.includes(timeRange)) {
      // Если интервал уже выбран, удаляем его
      setSelectedTimeRanges(prev => prev.filter(item => item !== timeRange));
    } else {
      // Иначе добавляем его
      setSelectedTimeRanges(prev => [...prev, timeRange]);
    }
  };

  // Функция для загрузки данных
  const fetchData = useCallback(async (force = false) => {
    // Если происходит прокрутка и это не принудительное обновление, прерываем
    if (isScrolling.current && !force) return;
    
    try {
      setLoading(true);
      
      // Собираем параметры запроса
      const queryParams: {
        name?: string;
        location?: string;
        timeRange?: string;
      } = {};
      
      if (searchQuery) queryParams.name = searchQuery;
      if (locationFilter) queryParams.location = locationFilter;
      
      // Если выбраны интервалы времени, собираем их в строку для запроса
      if (selectedTimeRanges.length > 0) {
        queryParams.timeRange = selectedTimeRanges.join(',');
      }
      
      // Получаем данные с учетом фильтров
      const [rooms, userData] = await Promise.all([
        gameRoomApi.getGameRooms(queryParams),
        userApi.getCurrentUser()
      ]);
      
      setGameRooms(rooms);
      setCurrentUser(userData);
      setError('');
      
      // Проверяем, находится ли пользователь в какой-либо активной комнате
      try {
        const response = await fetch(`${API_URL}/user-active-rooms`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.activeRooms && data.activeRooms.length > 0) {
            // Если пользователь находится в активной комнате, перенаправляем его туда
            navigate(`/game-rooms/${data.activeRooms[0].id}`);
            return;
          }
        }
      } catch (err) {
        // Подавляем ошибку
      }
    } catch (err) {
      setError('Не удалось загрузить список игр. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [navigate, searchQuery, locationFilter, selectedTimeRanges]);

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

  // Загрузка данных при первом рендере и при изменении фильтров
  useEffect(() => {
    if (isFirstRender.current) {
      fetchData();
      isFirstRender.current = false;
    } else {
      // Если это не первый рендер, обновляем данные только при изменении фильтров
      fetchData();
    }
  }, [fetchData, searchQuery, locationFilter, selectedTimeRanges]);

  // Проверка наличия пользователя в запущенной игре
  useEffect(() => {
    if (currentUser && gameRooms.length > 0) {
      // Проверяем, есть ли комната, в которой пользователь является игроком
      // и которая УЖЕ НАЧАТА (не в статусе waiting)
      const roomWithUser = gameRooms.find(
        room => 
          room.players.some(player => player.id === currentUser.id) && 
          room.status !== 'waiting'
      );

      // Редиректим только если пользователь находится в запущенной игре
      if (roomWithUser) {
        navigate(`/game-room/${roomWithUser.id}`);
      }
    }
  }, [currentUser, gameRooms, navigate]);

  // Функция для принудительного обновления данных
  const handleRefresh = () => {
    fetchData(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const createdRoom = await gameRoomApi.createGameRoom(newGame);
      
      // Сбрасываем форму и закрываем модальное окно
      setNewGame({
        name: '',
        location: '',
        maxPlayers: 16,
        timeRange: ''
      });
      setIsModalOpen(false);
      
      // Автоматически обновляем список комнат - принудительное обновление
      await fetchData(true);
    } catch (err) {
      setError('Не удалось создать игровую комнату. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (roomId: number) => {
    try {
      setIsJoiningGame(true);
      setLoading(true);
      const result = await gameRoomApi.joinGameRoom(roomId);
      
      // Обновляем список комнат
      await fetchData(true);
      
      // Проверяем, заполнена ли комната после присоединения
      if (result.roomIsFull) {
        // Если комната заполнена, перенаправляем на страницу игровой комнаты
        navigate(`/game-rooms/${roomId}`);
      }
    } catch (err: any) {
      // Проверяем, есть ли информация о том, что пользователь уже в другой комнате
      if (err.response && err.response.data && err.response.data.activeRooms && err.response.data.activeRooms.length > 0) {
        // Если пользователь уже в другой комнате, перенаправляем его туда
        const activeRoom = err.response.data.activeRooms[0];
        navigate(`/game-rooms/${activeRoom.id}`);
        return;
      }
      
      setError('Не удалось присоединиться к игровой комнате. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
      setIsJoiningGame(false);
    }
  };

  const handleLeaveGame = async (roomId: number) => {
    try {
      setLoading(true);
      await gameRoomApi.leaveGameRoom(roomId);
      
      // Обновляем список комнат
      await fetchData(true);
    } catch (err) {
      setError('Не удалось покинуть игровую комнату. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxPlayersChange = (value: number) => {
    setNewGame({ ...newGame, maxPlayers: value });
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Поиск выполняется автоматически через useEffect при изменении searchQuery
  };
  
  const clearFilters = () => {
    setSearchQuery('');
    setLocationFilter('');
    setSelectedTimeRanges([]);
  };

  const isUserInAnyRoom = currentUser ? gameRooms.some(room => 
    room.players.some(player => player.id === currentUser.id)
  ) : false;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg relative">
        {/* Кнопка обновления в правом верхнем углу - скрываем при входе в игру или открытой модальной */}
        {!isModalOpen && !isJoiningGame && !loading && (
          <button 
            onClick={handleRefresh}
            className="absolute right-4 top-4 bg-white/20 rounded-full p-2"
          >
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        )}
        
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-4">
          <Whistle /> Игры
        </h1>
        
        {/* Поисковая строка */}
        <form onSubmit={handleSearch} className="relative mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск игры по названию..."
            className="w-full bg-white/20 backdrop-blur-sm text-white placeholder-white/70 rounded-xl px-4 py-2 pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
        </form>
        
        {/* Кнопка фильтров */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-white/90 text-sm"
          >
            <Filter size={16} />
            Фильтры
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {(locationFilter || selectedTimeRanges.length > 0) && (
            <button 
              onClick={clearFilters}
              className="text-white/90 text-sm"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
        
        {/* Панель фильтров */}
        {showFilters && (
          <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 animate-fade-in">
            <div className="mb-3">
              <label className="block text-white/90 text-sm mb-1">Локация</label>
              <LocationAutocomplete
                value={locationFilter}
                onChange={setLocationFilter}
                placeholder="Введите район или стадион..."
                darkMode={true}
              />
            </div>
            
            <div>
              <label className="block text-white/90 text-sm mb-1">Временной интервал</label>
              <div className="flex flex-wrap gap-2">
                {predefinedTimeRanges.map(timeRange => (
                  <button
                    key={timeRange}
                    onClick={() => handleTimeRangeFilterToggle(timeRange)}
                    className={`text-xs px-3 py-1 rounded-full ${
                      selectedTimeRanges.includes(timeRange) 
                        ? 'bg-white text-blue-600' 
                        : 'bg-white/20 text-white'
                    }`}
                  >
                    {timeRange}
                  </button>
                ))}
              </div>
              {selectedTimeRanges.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedTimeRanges.map(range => (
                    <div 
                      key={range} 
                      className="inline-flex items-center gap-1 bg-blue-700 text-white text-xs px-2 py-1 rounded-full"
                    >
                      {range.split(' ')[0]}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTimeRangeFilterToggle(range);
                        }}
                        className="hover:text-red-200"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className={`w-full rounded-xl py-3 mb-6 flex items-center justify-center gap-2 font-medium ${
            isUserInAnyRoom 
              ? 'bg-gray-300 text-gray-600' 
              : 'bg-blue-600 text-white'
          }`}
          disabled={isUserInAnyRoom}
        >
          <Plus size={20} /> Создать игру
        </button>
        
        {isUserInAnyRoom && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl mb-4">
            Вы уже присоединились к игре. Покиньте текущую игру, чтобы создать новую.
          </div>
        )}

        {loading && !isModalOpen ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        ) : gameRooms.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-600">Нет доступных игр. Создайте новую!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {gameRooms.map(room => (
              <div key={room.id} className="bg-white rounded-xl shadow-md p-4">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="text-lg font-semibold">{room.name}</h2>
                  <div className="flex items-center gap-1 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    <Users size={14} />
                    <span>{room.players.length}/{room.maxPlayers}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
                  <MapPin size={14} />
                  <span>{room.location}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600 text-sm mb-3">
                  <Clock size={14} />
                  <span>{room.timeRange}</span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <img
                    src={room.creator.photoUrl}
                    alt={room.creator.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="flex items-center gap-1 text-sm">
                    <Crown size={14} className="text-yellow-500" />
                    <span>{room.creator.username}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (currentUser && room.players.some(player => player.id === currentUser.id)) {
                        handleLeaveGame(room.id);
                      } else {
                        handleJoinGame(room.id);
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg font-medium ${
                      currentUser && room.players.some(player => player.id === currentUser.id)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                    disabled={isUserInAnyRoom && !(currentUser && room.players.some(player => player.id === currentUser.id))}
                  >
                    {currentUser && room.players.some(player => player.id === currentUser.id)
                      ? 'Покинуть игру'
                      : 'Присоединиться'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно создания игры */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg max-h-[90vh] overflow-y-auto modal-content">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10 modal-header">
              <h2 className="text-xl font-bold">Создать игру</h2>
              <button onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="mb-4">
                <label className="block mb-1">Название игры</label>
                <input
                  type="text"
                  value={newGame.name}
                  onChange={(e) => setNewGame({...newGame, name: e.target.value})}
                  placeholder="Введите название игры"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-1">Локация</label>
                <LocationAutocomplete
                  value={newGame.location}
                  onChange={(location) => setNewGame({...newGame, location})}
                  placeholder="Введите район или стадион"
                  darkMode={document.documentElement.classList.contains('dark-theme')}
                />
              </div>
              
              <div className="mb-4">
                <label className="block mb-2">
                  Максимальное количество игроков: <span className="font-semibold">{newGame.maxPlayers}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-sm">2</span>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    step="2"
                    value={newGame.maxPlayers}
                    onChange={(e) => handleMaxPlayersChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm">12</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs">Минимум</span>
                  <span className="text-xs">Максимум</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block mb-2">
                  Временной интервал: <span className="font-semibold">{newGame.timeRange}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-sm">6:00</span>
                  <input
                    type="range"
                    min="6"
                    max="24"
                    step="2"
                    value={timeSliderValue}
                    onChange={(e) => handleTimeSliderChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm">00:00</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-xs">Утро</span>
                  <span className="text-xs">Ночь</span>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium"
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать игру'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;