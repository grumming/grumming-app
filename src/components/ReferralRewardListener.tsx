import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ReferralSuccessAnimation } from './ReferralSuccessAnimation';

interface ReferralNotification {
  id: string;
  title: string;
  message: string;
  type: string;
}

export const ReferralRewardListener = () => {
  const { user } = useAuth();
  const [showCelebration, setShowCelebration] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(100);

  const extractRewardAmount = useCallback((title: string): number => {
    // Extract amount from titles like "🎉 You earned ₹100!" or "🎁 Welcome reward unlocked!"
    const match = title.match(/₹(\d+)/);
    return match ? parseInt(match[1], 10) : 100;
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('referral-reward-listener')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as ReferralNotification;
          
          // Check if this is a referral reward notification
          if (notification.type === 'referral') {
            const amount = extractRewardAmount(notification.title);
            setRewardAmount(amount);
            setShowCelebration(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, extractRewardAmount]);

  const handleAnimationComplete = useCallback(() => {
    setShowCelebration(false);
  }, []);

  return (
    <ReferralSuccessAnimation
      isVisible={showCelebration}
      onComplete={handleAnimationComplete}
      rewardAmount={rewardAmount}
    />
  );
};
