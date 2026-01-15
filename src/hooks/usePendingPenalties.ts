import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { QUERY_STALE_TIMES, QUERY_KEYS } from '@/lib/queryConfig';

interface PendingPenalty {
  id: string;
  penalty_amount: number;
  salon_name: string;
  service_name: string;
  created_at: string;
}

async function fetchPenalties(userId: string): Promise<PendingPenalty[]> {
  const { data, error } = await supabase
    .from('cancellation_penalties')
    .select('id, penalty_amount, salon_name, service_name, created_at')
    .eq('user_id', userId)
    .eq('is_paid', false)
    .eq('is_waived', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching penalties:', error);
    return [];
  }
  
  return data || [];
}

export function usePendingPenalties() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: penalties = [], isLoading: loading } = useQuery({
    queryKey: QUERY_KEYS.penalties(user?.id),
    queryFn: () => fetchPenalties(user!.id),
    enabled: !!user,
    staleTime: QUERY_STALE_TIMES.penalties,
  });

  const totalPenalty = penalties.reduce((sum, p) => sum + Number(p.penalty_amount), 0);

  const markPenaltiesAsPaid = async (bookingId: string, collectingSalonId?: string, paymentMethod?: 'upi' | 'salon') => {
    if (!user || penalties.length === 0) {
      console.log('markPenaltiesAsPaid: No user or no pending penalties');
      return;
    }

    // Validate: Cash/salon payments MUST have a collecting salon ID for remittance tracking
    if (paymentMethod === 'salon' && !collectingSalonId) {
      console.error('markPenaltiesAsPaid: Cash payment requires collecting_salon_id for remittance tracking');
      throw new Error('Cash payment penalties require a collecting salon ID');
    }

    // Mark all pending penalties as paid for this booking
    const penaltyIds = penalties.map(p => p.id);
    console.log('markPenaltiesAsPaid: Marking penalties as paid', { penaltyIds, bookingId, collectingSalonId, paymentMethod });
    
    // Update each penalty individually to ensure collecting_salon_id is set correctly
    for (const penaltyId of penaltyIds) {
      const updateData: Record<string, unknown> = { 
        is_paid: true, 
        paid_at: new Date().toISOString(),
        paid_booking_id: bookingId
      };
      
      // If collecting salon is specified (cash payment), track it for remittance
      if (collectingSalonId) {
        updateData.collecting_salon_id = collectingSalonId;
      }
      
      const { error } = await supabase
        .from('cancellation_penalties')
        .update(updateData)
        .eq('id', penaltyId)
        .eq('user_id', user.id);

      if (error) {
        console.error('markPenaltiesAsPaid: Error updating penalty', penaltyId, error);
      } else {
        console.log('markPenaltiesAsPaid: Updated penalty', { penaltyId, collectingSalonId });
      }
    }

    // Invalidate cache to refetch
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.penalties(user.id) });
  };

  const refetch = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.penalties(user.id) });
    }
  };

  return {
    penalties,
    totalPenalty,
    loading,
    hasPenalties: penalties.length > 0,
    markPenaltiesAsPaid,
    refetch,
  };
}
