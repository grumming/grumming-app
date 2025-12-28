import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export const useFavorites = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch favorites from database
  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('favorite_salons')
      .select('salon_id')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching favorites:', error);
    } else {
      setFavorites(data?.map(f => f.salon_id) || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback((salonId: string | number) => {
    return favorites.includes(String(salonId));
  }, [favorites]);

  const toggleFavorite = useCallback(async (salonId: string | number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (!user) {
      toast({
        title: 'Login required',
        description: 'Please login to save favorites.',
        variant: 'destructive',
      });
      return;
    }

    const salonIdStr = String(salonId);
    const isCurrentlyFavorite = favorites.includes(salonIdStr);

    // Optimistic update
    if (isCurrentlyFavorite) {
      setFavorites(prev => prev.filter(id => id !== salonIdStr));
    } else {
      setFavorites(prev => [...prev, salonIdStr]);
    }

    try {
      if (isCurrentlyFavorite) {
        const { error } = await supabase
          .from('favorite_salons')
          .delete()
          .eq('user_id', user.id)
          .eq('salon_id', salonIdStr);

        if (error) throw error;

        toast({
          title: 'Removed from favorites',
          description: 'Salon removed from your favorites.',
        });
      } else {
        const { error } = await supabase
          .from('favorite_salons')
          .insert({
            user_id: user.id,
            salon_id: salonIdStr,
          });

        if (error) throw error;

        toast({
          title: 'Added to favorites',
          description: 'Salon saved to your favorites.',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      // Revert optimistic update
      if (isCurrentlyFavorite) {
        setFavorites(prev => [...prev, salonIdStr]);
      } else {
        setFavorites(prev => prev.filter(id => id !== salonIdStr));
      }
      toast({
        title: 'Error',
        description: 'Failed to update favorites.',
        variant: 'destructive',
      });
    }
  }, [user, favorites, toast]);

  return {
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    refetch: fetchFavorites,
  };
};
