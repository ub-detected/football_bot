import React, { useState, useRef, useCallback} from 'react';
import { userApi } from '../api';
import { User } from '../types';
import { API_URL } from '../api';
import { useNavigate } from 'react-router-dom';

const Games = () => {
    const isFirstRender = useRef(true);
    const isScrolling = useRef(false);
    const [locationFilter, setLocationFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
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
    

};

export default Games;