import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'recent-cities';
const MAX_RECENT_CITIES = 5;

export const useRecentCities = () => {
  const [recentCities, setRecentCities] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setRecentCities(JSON.parse(stored));
      } catch {
        setRecentCities([]);
      }
    }
  }, []);

  const addRecentCity = useCallback((city: string) => {
    setRecentCities((prev) => {
      // Remove if already exists, then add to front
      const filtered = prev.filter((c) => c.toLowerCase() !== city.toLowerCase());
      const updated = [city, ...filtered].slice(0, MAX_RECENT_CITIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearRecentCities = useCallback(() => {
    setRecentCities([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { recentCities, addRecentCity, clearRecentCities };
};
