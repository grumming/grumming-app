import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useReferral = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Set up realtime subscription for referrals
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up realtime subscription for referrals');
    
    const channel = supabase
      .channel('referrals-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referrals',
        },
        (payload) => {
          console.log('Realtime referral update:', payload);
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['referrals', user.id] });
          queryClient.invalidateQueries({ queryKey: ['userReward', user.id] });
          queryClient.invalidateQueries({ queryKey: ['referralLeaderboard'] });
        }
      )
      .subscribe((status) => {
        console.log('Referrals realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up referrals realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

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

  // Fetch referrals made by user (as referrer)
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

  // Fetch top referrers leaderboard
  const { data: leaderboard, isLoading: isLoadingLeaderboard } = useQuery({
    queryKey: ['referralLeaderboard'],
    queryFn: async () => {
      // Get completed referrals grouped by referrer
      const { data, error } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('status', 'completed');
      
      if (error) throw error;
      if (!data || data.length === 0) return [];
      
      // Count referrals per user
      const referralCounts: Record<string, number> = {};
      data.forEach(r => {
        referralCounts[r.referrer_id] = (referralCounts[r.referrer_id] || 0) + 1;
      });
      
      // Get top 10 referrers
      const topReferrers = Object.entries(referralCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      
      if (topReferrers.length === 0) return [];
      
      // Get profile info for top referrers
      const userIds = topReferrers.map(([id]) => id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);
      
      // Combine data
      return topReferrers.map(([userId, count], index) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          rank: index + 1,
          userId,
          name: profile?.full_name || 'Anonymous User',
          avatarUrl: profile?.avatar_url,
          referralCount: count,
          isCurrentUser: userId === user?.id,
        };
      });
    },
    staleTime: 60000, // Cache for 1 minute
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
    
    // Create the referral with pending status - it will be completed when referee makes first booking
    const { error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerData.user_id,
        referee_id: user.id,
        status: 'pending',
      });
    
    if (insertError) throw insertError;
    
    // Queries will auto-update via realtime subscription
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
    leaderboard,
    isLoading: isLoadingCode || isLoadingReferrals || isLoadingReward,
    isLoadingLeaderboard,
    applyReferralCode,
    getShareUrl,
    getShareText,
  };
};
