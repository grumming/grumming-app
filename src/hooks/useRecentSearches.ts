import { useState, useEffect } from 'react';
import { SalonBasic } from '@/data/salonsData';

const RECENT_SEARCHES_KEY = 'recent_salon_searches';
const SEARCH_HISTORY_KEY = 'search_query_history';
const MAX_RECENT_SEARCHES = 5;
const MAX_SEARCH_HISTORY = 8;

export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<SalonBasic[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);

  useEffect(() => {
    const storedSalons = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (storedSalons) {
      try {
        setRecentSearches(JSON.parse(storedSalons));
      } catch {
        setRecentSearches([]);
      }
    }

    const storedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
    if (storedHistory) {
      try {
        setSearchHistory(JSON.parse(storedHistory));
      } catch {
        setSearchHistory([]);
      }
    }
  }, []);

  const addRecentSearch = (salon: SalonBasic) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s.id !== salon.id);
      const updated = [salon, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const addSearchQuery = (query: string) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return;
    
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== trimmed);
      const updated = [query.trim(), ...filtered].slice(0, MAX_SEARCH_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  const clearSearchHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  };

  return { 
    recentSearches, 
    addRecentSearch, 
    clearRecentSearches,
    searchHistory,
    addSearchQuery,
    clearSearchHistory
  };
};
