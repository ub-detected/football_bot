import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { userApi } from '../api';

interface ThemeToggleProps {
  initialTheme?: 'light' | 'dark';
  onChange?: (theme: 'light' | 'dark') => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ initialTheme = 'light', onChange }) => {
  const [isDark, setIsDark] = useState(initialTheme === 'dark');
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Применяем тему при первом рендере
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
    }
  }, []);
  
  const toggleTheme = async () => {
    setIsAnimating(true);
    
    // Изменение темы в DOM
    if (isDark) {
      document.documentElement.classList.remove('dark-theme');
    } else {
      document.documentElement.classList.add('dark-theme');
    }
    
    // Сохраняем в API
    const newTheme = isDark ? 'light' : 'dark';
    try {
      await userApi.setThemePreference(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
    
    // Обновляем состояние
    setIsDark(!isDark);
    if (onChange) {
      onChange(newTheme);
    }
    
    // Завершаем анимацию
    setTimeout(() => {
      setIsAnimating(false);
    }, 500);
  };

  return (
    <button 
      onClick={toggleTheme}
      className={`theme-toggle ${isAnimating ? 'animating' : ''} ${isDark ? 'dark' : 'light'}`}
      aria-label="Переключить тему"
      title={isDark ? 'Переключить на светлую тему' : 'Переключить на темную тему'}
    >
      <div className="toggle-track">
        <div className="toggle-moon">
          <Moon size={16} className="text-white" />
        </div>
        <div className="toggle-sun">
          <Sun size={16} className="text-yellow-300" />
        </div>
        <div className="toggle-thumb"></div>
      </div>
    </button>
  );
};

export default ThemeToggle; 