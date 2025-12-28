import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
}

interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit';
  category: 'referral_bonus' | 'referee_bonus' | 'promo_code' | 'booking_discount' | 'cashback' | 'refund' | 'manual' | 'referral';
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export const useWallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscribe to realtime wallet transaction updates for referral rewards
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('wallet-referral-rewards')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'wallet_transactions',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newTransaction = payload.new as WalletTransaction;
          
          // Refresh wallet data for any new transaction
          queryClient.invalidateQueries({ queryKey: ['wallet', user.id] });
          queryClient.invalidateQueries({ queryKey: ['wallet-transactions', user.id] });
          
          // Show notification for referral rewards
          if (newTransaction.category === 'referral') {
            const isReferrerReward = newTransaction.description?.includes('Friend completed');
            
            sonnerToast.success(
              isReferrerReward ? '🎉 Referral Reward!' : '🎁 Welcome Bonus!',
              {
                description: `₹${newTransaction.amount} has been added to your wallet${isReferrerReward ? ' - Your friend completed their first booking!' : ' for completing your first booking!'}`,
                duration: 6000,
              }
            );
          }
          
          // Show notification for cashback
          if (newTransaction.category === 'cashback') {
            sonnerToast.success(
              '💰 Cashback Earned!',
              {
                description: `₹${newTransaction.amount} cashback credited for your booking!`,
                duration: 5000,
              }
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Fetch wallet
  const { data: wallet, isLoading: isLoadingWallet, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching wallet:', error);
        return null;
      }

      // If no wallet exists, create one
      if (!data) {
        const { data: newWallet, error: createError } = await supabase
          .from('wallets')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (createError) {
          console.error('Error creating wallet:', createError);
          return null;
        }
        return newWallet as Wallet;
      }

      return data as Wallet;
    },
    enabled: !!user,
  });

  // Fetch transactions
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['wallet-transactions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data as WalletTransaction[];
    },
    enabled: !!user,
  });

  // Add credits mutation
  const addCredits = useMutation({
    mutationFn: async ({ 
      amount, 
      category, 
      description, 
      referenceId 
    }: { 
      amount: number; 
      category: WalletTransaction['category']; 
      description?: string;
      referenceId?: string;
    }) => {
      if (!user || !wallet) throw new Error('No wallet found');

      // Create transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          amount,
          type: 'credit',
          category,
          description,
          reference_id: referenceId,
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance + amount,
          total_earned: wallet.total_earned + amount,
        })
        .eq('id', wallet.id);

      if (walletError) throw walletError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast({
        title: 'Credits added',
        description: 'Your wallet has been credited successfully.',
      });
    },
    onError: (error) => {
      console.error('Error adding credits:', error);
      toast({
        title: 'Error',
        description: 'Failed to add credits. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Use credits mutation
  const useCredits = useMutation({
    mutationFn: async ({ 
      amount, 
      category, 
      description, 
      referenceId 
    }: { 
      amount: number; 
      category: WalletTransaction['category']; 
      description?: string;
      referenceId?: string;
    }) => {
      if (!user || !wallet) throw new Error('No wallet found');
      if (wallet.balance < amount) throw new Error('Insufficient balance');

      // Create transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          amount,
          type: 'debit',
          category,
          description,
          reference_id: referenceId,
        });

      if (txError) throw txError;

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - amount,
          total_spent: wallet.total_spent + amount,
        })
        .eq('id', wallet.id);

      if (walletError) throw walletError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
    },
    onError: (error) => {
      console.error('Error using credits:', error);
      toast({
        title: 'Error',
        description: error.message === 'Insufficient balance' 
          ? 'Insufficient wallet balance.' 
          : 'Failed to use credits. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    wallet,
    transactions,
    isLoading: isLoadingWallet || isLoadingTransactions,
    addCredits: addCredits.mutateAsync,
    useCredits: useCredits.mutateAsync,
    refetchWallet,
  };
};
