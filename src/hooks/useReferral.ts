import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useReferral = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user's referral code
  const { data: referralCode, isLoading: isLoadingCode } = useQuery({
    queryKey: ['referralCode', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.code || null;
    },
    enabled: !!user?.id,
  });

  // Fetch referrals made by user
  const { data: referrals, isLoading: isLoadingReferrals } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch user's available reward
  const { data: userReward, isLoading: isLoadingReward } = useQuery({
    queryKey: ['userReward', user?.id],
    queryFn: async () => {
      if (!user?.id) return { available: 0, total: 0 };
      
      // Get rewards as referrer
      const { data: referrerRewards } = await supabase
        .from('referrals')
        .select('referrer_reward_amount, referrer_reward_used')
        .eq('referrer_id', user.id)
        .eq('status', 'completed');
      
      // Get rewards as referee
      const { data: refereeRewards } = await supabase
        .from('referrals')
        .select('referee_reward_amount, referee_reward_used')
        .eq('referee_id', user.id)
        .eq('status', 'completed');
      
      let available = 0;
      let total = 0;
      
      referrerRewards?.forEach(r => {
        total += Number(r.referrer_reward_amount);
        if (!r.referrer_reward_used) available += Number(r.referrer_reward_amount);
      });
      
      refereeRewards?.forEach(r => {
        total += Number(r.referee_reward_amount);
        if (!r.referee_reward_used) available += Number(r.referee_reward_amount);
      });
      
      return { available, total };
    },
    enabled: !!user?.id,
  });

  // Validate and apply referral code
  const applyReferralCode = async (code: string) => {
    if (!user?.id) throw new Error('Must be logged in');
    
    // Find the referrer by code
    const { data: referrerData, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id')
      .eq('code', code.toUpperCase())
      .maybeSingle();
    
    if (codeError || !referrerData) {
      throw new Error('Invalid referral code');
    }
    
    if (referrerData.user_id === user.id) {
      throw new Error('Cannot use your own referral code');
    }
    
    // Check if already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_id', user.id)
      .maybeSingle();
    
    if (existingReferral) {
      throw new Error('You have already used a referral code');
    }
    
    // Create the referral
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerData.user_id,
        referee_id: user.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    
    if (insertError) throw insertError;
    
    queryClient.invalidateQueries({ queryKey: ['referrals'] });
    queryClient.invalidateQueries({ queryKey: ['userReward'] });
    
    return true;
  };

  const getShareUrl = () => {
    if (!referralCode) return '';
    return `${window.location.origin}/auth?ref=${referralCode}`;
  };

  const getShareText = () => {
    return `Join Grumming and get ₹100 off your first booking! Use my referral code: ${referralCode}`;
  };

  return {
    referralCode,
    referrals,
    userReward,
    isLoading: isLoadingCode || isLoadingReferrals || isLoadingReward,
    applyReferralCode,
    getShareUrl,
    getShareText,
  };
};
