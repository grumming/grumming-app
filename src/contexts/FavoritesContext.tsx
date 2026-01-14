import { createContext, useContext, useCallback, ReactNode, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface FavoritesContextType {
  favorites: string[];
  isLoading: boolean;
  isFavorite: (salonId: string | number) => boolean;
  toggleFavorite: (salonId: string | number, e?: React.MouseEvent) => Promise<void>;
  refetch: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('favorite_salons')
        .select('salon_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching favorites:', error);
        return [];
      }
      return data?.map(f => f.salon_id) || [];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 15, // Keep in cache for 15 minutes
  });

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['favorites', user?.id] });
  }, [queryClient, user?.id]);

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
    queryClient.setQueryData(['favorites', user.id], (old: string[] = []) => 
      isCurrentlyFavorite 
        ? old.filter(id => id !== salonIdStr)
        : [...old, salonIdStr]
    );

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
      queryClient.setQueryData(['favorites', user.id], favorites);
      toast({
        title: 'Error',
        description: 'Failed to update favorites.',
        variant: 'destructive',
      });
    }
  }, [user, favorites, queryClient]);

  const contextValue = useMemo(() => ({
    favorites,
    isLoading,
    isFavorite,
    toggleFavorite,
    refetch
  }), [favorites, isLoading, isFavorite, toggleFavorite, refetch]);

  return (
    <FavoritesContext.Provider value={contextValue}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    // Return safe defaults instead of crashing
    console.warn('useFavorites called outside of FavoritesProvider, returning defaults');
    return {
      favorites: [],
      isLoading: false,
      isFavorite: () => false,
      toggleFavorite: async () => {},
      refetch: async () => {},
    };
  }
  return context;
};
