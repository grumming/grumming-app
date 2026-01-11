import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

/**
 * Hook to handle pending profile updates and referral applications after signup.
 * Salon owner redirects are now handled by SalonOwnerRouteGuard.
 */
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

    const applyPendingReferral = async () => {
      if (!user) return;

      const pendingReferralCode = localStorage.getItem('pendingReferralCode');
      if (!pendingReferralCode) return;

      try {
        console.log('Applying pending referral code:', pendingReferralCode);
        
        // Find the referrer by code using secure RPC function
        const { data: referrerResult, error: codeError } = await supabase
          .rpc('validate_referral_code', { p_code: pendingReferralCode.toUpperCase() });

        if (codeError || !referrerResult || referrerResult.length === 0 || !referrerResult[0].is_valid) {
          console.log('Invalid referral code:', pendingReferralCode);
          localStorage.removeItem('pendingReferralCode');
          return;
        }

        const referrerId = referrerResult[0].referrer_id;

        // Don't allow self-referral
        if (referrerId === user.id) {
          console.log('Cannot use own referral code');
          localStorage.removeItem('pendingReferralCode');
          return;
        }

        // Check if already referred
        const { data: existingReferral } = await supabase
          .from('referrals')
          .select('id')
          .eq('referee_id', user.id)
          .maybeSingle();

        if (existingReferral) {
          console.log('User already has a referral');
          localStorage.removeItem('pendingReferralCode');
          return;
        }

        // Create the referral with pending status
        const { error: insertError } = await supabase
          .from('referrals')
          .insert({
            referrer_id: referrerId,
            referee_id: user.id,
            status: 'pending',
          });

        if (insertError) {
          console.error('Failed to create referral:', insertError);
          localStorage.removeItem('pendingReferralCode');
          return;
        }

        console.log('Referral created successfully!');
        localStorage.removeItem('pendingReferralCode');
        
        toast({
          title: '🎉 Referral applied!',
          description: 'Complete your first booking to unlock rewards for both of you!',
        });
      } catch (error) {
        console.error('Error applying referral:', error);
        localStorage.removeItem('pendingReferralCode');
      }
    };

    updatePendingProfile();
    applyPendingReferral();
  }, [user, toast]);
};
