import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export const usePendingProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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
        
        // Find the referrer by code
        const { data: referrerData, error: codeError } = await supabase
          .from('referral_codes')
          .select('user_id')
          .eq('code', pendingReferralCode.toUpperCase())
          .maybeSingle();

        if (codeError || !referrerData) {
          console.log('Invalid referral code:', pendingReferralCode);
          localStorage.removeItem('pendingReferralCode');
          return;
        }

        // Don't allow self-referral
        if (referrerData.user_id === user.id) {
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
            referrer_id: referrerData.user_id,
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

    // Note: Salon owner redirect is now handled directly in Auth.tsx
    // to avoid showing customer dashboard briefly before redirecting

    updatePendingProfile();
    applyPendingReferral();
  }, [user, toast, navigate]);
};
