import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { QUERY_STALE_TIMES, QUERY_KEYS } from '@/lib/queryConfig';

interface FavoritesContextType {
  favorites: string[];
  isLoading: boolean;
  isFavorite: (salonId: string | number) => boolean;
  toggleFavorite: (salonId: string | number, e?: React.MouseEvent) => Promise<void>;
  refetch: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

async function fetchFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('favorite_salons')
    .select('salon_id')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching favorites:', error);
    return [];
  }

  return data?.map(f => f.salon_id) || [];
}

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: QUERY_KEYS.favorites(user?.id),
    queryFn: () => fetchFavorites(user!.id),
    enabled: !!user,
    staleTime: QUERY_STALE_TIMES.favorites,
  });

  const toggleMutation = useMutation({
    mutationFn: async (salonId: string) => {
      if (!user) throw new Error('Must be logged in');
      
      const isFav = favorites.includes(salonId);
      
      if (isFav) {
        const { error } = await supabase
          .from('favorite_salons')
          .delete()
          .eq('user_id', user.id)
          .eq('salon_id', salonId);
        if (error) throw error;
        return { action: 'removed' as const, salonId };
      } else {
        const { error } = await supabase
          .from('favorite_salons')
          .insert({ user_id: user.id, salon_id: salonId });
        if (error) throw error;
        return { action: 'added' as const, salonId };
      }
    },
    onMutate: async (salonId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.favorites(user?.id) });
      
      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData<string[]>(QUERY_KEYS.favorites(user?.id));
      
      // Optimistically update
      queryClient.setQueryData<string[]>(QUERY_KEYS.favorites(user?.id), (old = []) => {
        if (old.includes(salonId)) {
          return old.filter(id => id !== salonId);
        }
        return [...old, salonId];
      });
      
      return { previousFavorites };
    },
    onError: (error, _salonId, context) => {
      // Rollback on error
      if (context?.previousFavorites) {
        queryClient.setQueryData(QUERY_KEYS.favorites(user?.id), context.previousFavorites);
      }
      console.error('Error toggling favorite:', error);
      toast({
        title: 'Error',
        description: 'Failed to update favorites.',
        variant: 'destructive',
      });
    },
    onSuccess: (result) => {
      if (result.action === 'added') {
        toast({
          title: 'Added to favorites',
          description: 'Salon saved to your favorites.',
        });
      } else {
        toast({
          title: 'Removed from favorites',
          description: 'Salon removed from your favorites.',
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.favorites(user?.id) });
    },
  });

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
    
    await toggleMutation.mutateAsync(String(salonId));
  }, [user, toggleMutation]);

  const refetch = useCallback(async () => {
    if (user?.id) {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.favorites(user.id) });
    }
  }, [user?.id, queryClient]);

  return (
    <FavoritesContext.Provider value={{ favorites, isLoading, isFavorite, toggleFavorite, refetch }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (context === undefined) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
