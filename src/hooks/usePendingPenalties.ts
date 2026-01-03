import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface PendingPenalty {
  id: string;
  penalty_amount: number;
  salon_name: string;
  service_name: string;
  created_at: string;
}

export function usePendingPenalties() {
  const { user } = useAuth();
  const [penalties, setPenalties] = useState<PendingPenalty[]>([]);
  const [totalPenalty, setTotalPenalty] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPenalties();
    } else {
      setPenalties([]);
      setTotalPenalty(0);
      setLoading(false);
    }
  }, [user]);

  const fetchPenalties = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('cancellation_penalties')
      .select('id, penalty_amount, salon_name, service_name, created_at')
      .eq('user_id', user.id)
      .eq('is_paid', false)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setPenalties(data);
      setTotalPenalty(data.reduce((sum, p) => sum + Number(p.penalty_amount), 0));
    }
    setLoading(false);
  };

  const markPenaltiesAsPaid = async (bookingId: string) => {
    if (!user || penalties.length === 0) return;

    // Mark all pending penalties as paid for this booking
    const penaltyIds = penalties.map(p => p.id);
    
    await supabase
      .from('cancellation_penalties')
      .update({ 
        is_paid: true, 
        paid_at: new Date().toISOString(),
        paid_booking_id: bookingId
      })
      .in('id', penaltyIds);

    // Refresh penalties
    fetchPenalties();
  };

  return {
    penalties,
    totalPenalty,
    loading,
    hasPenalties: penalties.length > 0,
    markPenaltiesAsPaid,
    refetch: fetchPenalties,
  };
}