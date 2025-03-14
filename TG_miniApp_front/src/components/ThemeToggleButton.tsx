import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';

/**
 * Упрощенная версия переключателя темы для тестирования
 * Не использует API-вызовы для сохранения темы
 */
const ThemeToggleButton: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  
  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <button 
      onClick={toggleTheme}
      className="bg-blue-600 text-white py-2 px-4 rounded-full flex items-center gap-2"
      style={{ 
        width: 'auto', 
        minWidth: '120px',
        justifyContent: 'center',
        transition: 'background-color 0.3s'
      }}
    >
      {isDark ? (
        <>
          <Sun size={16} /> Светлая
        </>
      ) : (
        <>
          <Moon size={16} /> Темная
        </>
      )}
    </button>
  );
};

export default ThemeToggleButton; 