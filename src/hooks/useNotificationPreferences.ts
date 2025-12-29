import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  booking_reminders: boolean;
  booking_confirmations: boolean;
  promotions: boolean;
  app_updates: boolean;
  created_at: string;
  updated_at: string;
}

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notification preferences
  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching notification preferences:', error);
        return null;
      }

      // If no preferences exist, create default ones
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from('notification_preferences')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating notification preferences:', insertError);
          return null;
        }
        return newData as NotificationPreferences;
      }

      return data as NotificationPreferences;
    },
    enabled: !!user,
  });

  // Update preferences
  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<Pick<NotificationPreferences, 'booking_reminders' | 'booking_confirmations' | 'promotions' | 'app_updates'>>) => {
      if (!user || !preferences) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notification_preferences')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as NotificationPreferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences', user?.id] });
    },
    onError: (error) => {
      console.error('Error updating notification preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences',
        variant: 'destructive',
      });
    },
  });

  return {
    preferences,
    isLoading,
    updatePreferences,
  };
};
