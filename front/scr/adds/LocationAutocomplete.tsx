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
}) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<string[]>([]);
  const resultsRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
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


};

export default LocationAutocomplete; 