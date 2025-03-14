import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { userApi } from '../api';

interface ThemeSwitchProps {
  initialTheme?: 'light' | 'dark';
}

/**
 * Переключатель темы с сохранением в API и применением темы
 */
const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ initialTheme = 'light' }) => {
  const [isDark, setIsDark] = useState(initialTheme === 'dark');
  
  // Применяем тему при первом рендере
  useEffect(() => {
    applyTheme(isDark);
  }, []);
  
  // Функция для применения темы
  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  };
  
  const toggleTheme = async () => {
    const newIsDark = !isDark;
    
    // Применяем тему мгновенно для лучшего UX
    applyTheme(newIsDark);
    
    // Сохраняем настройки в API
    const newTheme = newIsDark ? 'dark' : 'light';
    try {
      await userApi.setThemePreference(newTheme);
      console.log('Тема успешно сохранена:', newTheme);
    } catch (error) {
      console.error('Ошибка при сохранении настроек темы:', error);
    }
    
    // Обновляем локальное состояние
    setIsDark(newIsDark);
  };

  return (
    <div className="flex items-center">
      <label className="inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={isDark} 
          onChange={toggleTheme} 
        />
        <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
        <span className="ms-3 text-sm font-medium flex items-center">
          {isDark ? <Moon size={16} className="mr-1" /> : <Sun size={16} className="mr-1" />}
          {isDark ? 'Темная' : 'Светлая'}
        </span>
      </label>
    </div>
  );
};

export default ThemeSwitch; 