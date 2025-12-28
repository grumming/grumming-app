import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('favorite_salons')
        .select('salon_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setFavorites(data?.map((f) => f.salon_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (salonId: string) => favorites.includes(salonId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (salonId: string) => {
      if (!user) {
        toast.error('Please login to save favorites');
        return false;
      }

      const isCurrentlyFavorite = favorites.includes(salonId);

      // Optimistic update
      if (isCurrentlyFavorite) {
        setFavorites((prev) => prev.filter((id) => id !== salonId));
      } else {
        setFavorites((prev) => [...prev, salonId]);
      }

      try {
        if (isCurrentlyFavorite) {
          const { error } = await supabase
            .from('favorite_salons')
            .delete()
            .eq('user_id', user.id)
            .eq('salon_id', salonId);

          if (error) throw error;
          toast.success('Removed from favorites');
        } else {
          const { error } = await supabase
            .from('favorite_salons')
            .insert({ user_id: user.id, salon_id: salonId });

          if (error) throw error;
          toast.success('Added to favorites');
        }
        return true;
      } catch (error) {
        console.error('Error toggling favorite:', error);
        // Revert optimistic update
        if (isCurrentlyFavorite) {
          setFavorites((prev) => [...prev, salonId]);
        } else {
          setFavorites((prev) => prev.filter((id) => id !== salonId));
        }
        toast.error('Failed to update favorites');
        return false;
      }
    },
    [user, favorites]
  );

  return {
    favorites,
    loading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
};
