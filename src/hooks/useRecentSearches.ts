import { useState, useEffect } from 'react';
import { SalonBasic } from '@/data/salonsData';

const RECENT_SEARCHES_KEY = 'recent_salon_searches';
const MAX_RECENT_SEARCHES = 5;

export const useRecentSearches = () => {
  const [recentSearches, setRecentSearches] = useState<SalonBasic[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
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

  const clearRecentSearches = () => {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
    setRecentSearches([]);
  };

  return { recentSearches, addRecentSearch, clearRecentSearches };
};
