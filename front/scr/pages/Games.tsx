import React, { useState, useRef, useEffect, useCallback} from 'react';
import { userApi } from '../api';
import { Users, MapPin, Clock, Crown, Plus, X, Castle as Whistle, Search, Filter, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { User } from '../types';
import { API_URL } from '../api';
import { useNavigate } from 'react-router-dom';
import LocationAutocomplete from '../adds/LocationAutocomplete';

const Games = () => {
    const isFirstRender = useRef(true);
    const isScrolling = useRef(false);
    const [isJoiningGame, setIsJoiningGame] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [locationFilter, setLocationFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [showFilters, setShowFilters] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [newGame, setNewGame] = useState({
      name: '',
      location: '',
      maxPlayers: 16,
      timeRange: ''
    });
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
      const [timeSliderValue, setTimeSliderValue] = useState(8)
      const [selectedTimeRanges, setSelectedTimeRanges] = useState<string[]>([]);

      const handleTimeSliderChange = (value: number) => {
        setTimeSliderValue(value);
        const timeRange = getTimeRangeFromSlider(value);
        setNewGame({ ...newGame, timeRange });
      };
      const handleTimeRangeFilterToggle = (timeRange: string) => {
        if (selectedTimeRanges.includes(timeRange)) {
          setSelectedTimeRanges(prev => prev.filter(item => item !== timeRange));
        } else {
          setSelectedTimeRanges(prev => [...prev, timeRange]);
        }
      };
    

      const fetchData = useCallback(async (force = false) => {
        if (isScrolling.current && !force) return;
        try {
          setLoading(true);
          const queryParams: {
            name?: string;
            location?: string;
            timeRange?: string;
          } = {};
          if (searchQuery) queryParams.name = searchQuery;
          if (locationFilter) queryParams.location = locationFilter;
          if (selectedTimeRanges.length > 0) {
            queryParams.timeRange = selectedTimeRanges.join(',');
          }
          const [userData] = await Promise.all([
            //ДОБАВИТЬ ВЗАИМОДЕЙСТВИЕ С ГЕЙМРУМ
            userApi.getCurrentUser()
          ]);
          setCurrentUser(userData);
          setError('');
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
                navigate(`/game-rooms/${data.activeRooms[0].id}`);
                return;
              }
            }
          } catch (err) {
          }
        } catch (err) {
          setError('Не удалось загрузить список игр. Пожалуйста, попробуйте позже.');
        } finally {
          setLoading(false);
        }
      }, [navigate, searchQuery, locationFilter, selectedTimeRanges]);
    
      useEffect(() => {
        const handleScroll = () => {
          isScrolling.current = true;
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

      useEffect(() => {
        if (isFirstRender.current) {
          fetchData();
          isFirstRender.current = false;
        } else {
          fetchData();
        }
      }, [fetchData, searchQuery, locationFilter, selectedTimeRanges]);
    
      // ДОБАВИТЬ ПРОВЕРКУ НАЛИЧИЯ ПОЛЬЗОВАТЕЛЯ В ИГРЕ
      const handleRefresh = () => {
        fetchData(true);
      };
    
      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
          setLoading(true);
          // СОЗДАТЬ НОВУЮ КОМНАТУ
          setNewGame({
            name: '',
            location: '',
            maxPlayers: 16,
            timeRange: ''
          });
          setIsModalOpen(false);
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
          //ДОБАВИТЬ ОБНАВЛЕНИЕ СПИСКА КОМНАТ
          await fetchData(true);
        } catch (err: any) {
          if (err.response && err.response.data && err.response.data.activeRooms && err.response.data.activeRooms.length > 0) {
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
      };

      const clearFilters = () => {
        setSearchQuery('');
        setLocationFilter('');
        setSelectedTimeRanges([]);
      };

      return (
        <div className="min-h-screen bg-gray-50 pb-20">
          <div className="bg-blue-600 text-white p-6 rounded-b-3xl shadow-lg relative">
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
              className={`w-full rounded-xl py-3 mb-6 flex items-center justify-center gap-2 font-medium`}
            >
              <Plus size={20} /> Создать игру
            </button>
            { (
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
            ) : 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <p className="text-gray-600">Нет доступных игр. Создайте новую!</p>
              </div>
            ) : (
              <div className="space-y-4">
              </div>
            )}
          </div>
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