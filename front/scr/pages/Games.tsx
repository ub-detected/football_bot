import React, { useState} from 'react';
const Games = () => {
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
      
};

export default Games;