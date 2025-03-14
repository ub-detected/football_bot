import React, { useState, useRef, useEffect } from 'react';
import { locationApi } from '../api';
import { MapPin } from 'lucide-react';

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  darkMode?: boolean;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Введите локацию',
  darkMode = false
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const resultsRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setQuery(value);
  }, [value]);
  
  useEffect(() => {
    const fetchLocations = async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        const locations = await locationApi.searchLocations(query);
        setResults(locations);
      } catch (error) {
        console.error('Error fetching locations:', error);
      } finally {
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(fetchLocations, 300);
    return () => clearTimeout(timeoutId);
  }, [query]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowResults(true);
    setSelectedIndex(-1);
  };
  
  const handleSelect = (location: string) => {
    setQuery(location);
    onChange(location);
    setShowResults(false);
    inputRef.current?.blur();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      const item = resultsRef.current?.children[selectedIndex + 1];
      item?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      const item = resultsRef.current?.children[selectedIndex - 1];
      item?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };
  
  return (
    <div className="relative">
      <div className={`relative flex items-center ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg`}>
        <MapPin size={18} className={`mx-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full py-2 px-2 rounded-lg outline-none ${darkMode ? 'bg-gray-800 text-white placeholder-gray-400' : 'bg-white text-gray-800 placeholder-gray-500'}`}
        />
        {loading && (
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <div className={`animate-spin h-4 w-4 border-2 ${darkMode ? 'border-gray-700 border-l-gray-300' : 'border-gray-300 border-l-blue-600'} rounded-full`}></div>
          </div>
        )}
      </div>
      
      {showResults && results.length > 0 && (
        <ul 
          ref={resultsRef}
          className={`absolute z-10 mt-1 w-full border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} rounded-lg shadow-lg max-h-60 overflow-auto`}
        >
          {results.map((location, index) => (
            <li
              key={location}
              onClick={() => handleSelect(location)}
              className={`px-4 py-2 cursor-pointer ${darkMode 
                ? `${index === selectedIndex ? 'bg-blue-900 text-white' : 'text-gray-300 hover:bg-gray-700'}`
                : `${index === selectedIndex ? 'bg-blue-100' : 'hover:bg-gray-100'}`
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className={darkMode ? 'text-gray-400' : 'text-gray-500'} />
                <span>{location}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationAutocomplete; 