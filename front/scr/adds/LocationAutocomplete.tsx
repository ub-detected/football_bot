import React, { useState, useEffect, useRef} from 'react';
import { locationApi } from '../api';

interface LocationAutocompleteProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    darkMode?: boolean;
  }
  
const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  value,
  onChange,
}) => {
  const [query, setQuery] = useState(value);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const resultsRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

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

};

export default LocationAutocomplete; 