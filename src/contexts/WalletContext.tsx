import React, { createContext, useContext, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

interface WalletOperationResult {
  success: boolean;
  error?: string;
  transaction_id?: string;
  new_balance?: number;
}

interface WalletContextType {
  wallet: Wallet | null | undefined;
  transactions: WalletTransaction[];
  isLoading: boolean;
  addCredits: (params: { amount: number; category: WalletTransaction['category']; description?: string; referenceId?: string }) => Promise<WalletOperationResult>;
  useCredits: (params: { amount: number; category: WalletTransaction['category']; description?: string; referenceId?: string }) => Promise<WalletOperationResult>;
  refetchWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Subscribe to realtime wallet transaction updates
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
          
          queryClient.invalidateQueries({ queryKey: ['wallet', user.id] });
          queryClient.invalidateQueries({ queryKey: ['wallet-transactions', user.id] });
          
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

  // Pre-fetch wallet on user login
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Pre-fetch transactions
  const { data: transactions = [], isLoading: isLoadingTransactions } = useQuery({
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
    staleTime: 1000 * 60 * 5,
  });

  const addCreditsMutation = useMutation({
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
      if (!user) throw new Error('No user found');

      // Use atomic database function with row-level locking
      const { data, error } = await supabase.rpc('credit_wallet', {
        _user_id: user.id,
        _amount: amount,
        _category: category,
        _description: description || null,
        _reference_id: referenceId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; transaction_id?: string; new_balance?: number };
      if (!result.success) {
        throw new Error(result.error || 'Failed to credit wallet');
      }
      
      return result;
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

  const useCreditsMutation = useMutation({
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
      if (!user) throw new Error('No user found');

      // Use atomic database function with row-level locking
      const { data, error } = await supabase.rpc('debit_wallet', {
        _user_id: user.id,
        _amount: amount,
        _category: category,
        _description: description || null,
        _reference_id: referenceId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; transaction_id?: string; new_balance?: number };
      if (!result.success) {
        throw new Error(result.error || 'Failed to debit wallet');
      }
      
      return result;
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

  return (
    <WalletContext.Provider
      value={{
        wallet,
        transactions,
        isLoading: isLoadingWallet || isLoadingTransactions,
        addCredits: addCreditsMutation.mutateAsync,
        useCredits: useCreditsMutation.mutateAsync,
        refetchWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  return context;
};
