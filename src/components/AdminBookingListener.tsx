import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdmin } from '@/hooks/useAdmin';
import { Calendar } from 'lucide-react';

interface BookingPayload {
  id: string;
  salon_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  service_price: number;
  status: string;
  user_id: string;
}

export const AdminBookingListener = () => {
  const { toast } = useToast();
  const { isAdmin } = useAdmin();

  useEffect(() => {
    if (!isAdmin) return;

    console.log('Setting up real-time booking listener for admin...');

    const channel = supabase
      .channel('admin-bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('New booking received:', payload);
          const booking = payload.new as BookingPayload;
          
          toast({
            title: '🎉 New Booking!',
            description: `${booking.service_name} at ${booking.salon_name} for ₹${booking.service_price}`,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Booking updated:', payload);
          const booking = payload.new as BookingPayload;
          const oldBooking = payload.old as BookingPayload;
          
          // Only notify on status changes
          if (oldBooking.status !== booking.status) {
            const statusEmoji = 
              booking.status === 'completed' ? '✅' :
              booking.status === 'cancelled' ? '❌' :
              '📋';
            
            toast({
              title: `${statusEmoji} Booking ${booking.status}`,
              description: `${booking.service_name} at ${booking.salon_name}`,
              duration: 4000,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up booking listener...');
      supabase.removeChannel(channel);
    };
  }, [isAdmin, toast]);

  // This component doesn't render anything
  return null;
};

export default AdminBookingListener;
