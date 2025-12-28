import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const usePendingProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const updatePendingProfile = async () => {
      if (!user) return;

      const pendingProfileData = localStorage.getItem('pendingProfile');
      if (!pendingProfileData) return;

      try {
        const { fullName, email } = JSON.parse(pendingProfileData);
        
        // Update the profile
        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            email: email,
          })
          .eq('user_id', user.id);

        if (error) {
          console.error('Failed to update profile:', error);
          return;
        }

        // Clear the pending profile data
        localStorage.removeItem('pendingProfile');
        
        toast({
          title: 'Profile updated!',
          description: `Welcome, ${fullName}!`,
        });
      } catch (error) {
        console.error('Error processing pending profile:', error);
      }
    };

    updatePendingProfile();
  }, [user, toast]);
};
