import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSalonOwner } from '@/hooks/useSalonOwner';
import { playNotificationSound, isSoundEnabled } from '@/utils/notificationSound';

interface BookingPayload {
  id: string;
  salon_id: string | null;
  salon_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  service_price: number;
  status: string;
  user_id: string;
}

export const SalonOwnerBookingListener = () => {
  const { toast } = useToast();
  const { isSalonOwner, ownedSalons, isLoading } = useSalonOwner();

  useEffect(() => {
    if (isLoading || !isSalonOwner || ownedSalons.length === 0) return;

    const salonIds = ownedSalons.map(s => s.id);
    const salonNames = ownedSalons.map(s => s.name);

    console.log('Setting up real-time booking listener for salon owner...', { salonIds, salonNames });

    const channel = supabase
      .channel('salon-owner-bookings')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          const booking = payload.new as BookingPayload;
          
          // Check if this booking is for one of the owner's salons
          const isOwnSalon = 
            (booking.salon_id && salonIds.includes(booking.salon_id)) ||
            salonNames.includes(booking.salon_name);

          if (isOwnSalon) {
            console.log('New booking for your salon:', booking);
            
            // Play notification sound if enabled
            if (isSoundEnabled()) {
              playNotificationSound('booking');
            }
            
            toast({
              title: '🎉 New Booking!',
              description: `${booking.service_name} on ${booking.booking_date} at ${booking.booking_time} - ₹${booking.service_price}`,
              duration: 8000,
            });
          }
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
          const booking = payload.new as BookingPayload;
          const oldBooking = payload.old as BookingPayload;
          
          // Check if this booking is for one of the owner's salons
          const isOwnSalon = 
            (booking.salon_id && salonIds.includes(booking.salon_id)) ||
            salonNames.includes(booking.salon_name);

          if (isOwnSalon && oldBooking.status !== booking.status) {
            console.log('Booking status changed:', booking);
            
            // Only notify for external status changes (e.g., user cancelled)
            if (booking.status === 'cancelled' && oldBooking.status !== 'cancelled') {
              if (isSoundEnabled()) {
                playNotificationSound('alert');
              }
              
              toast({
                title: '❌ Booking Cancelled',
                description: `${booking.service_name} on ${booking.booking_date} was cancelled`,
                duration: 5000,
                variant: 'destructive',
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Salon owner realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up salon owner booking listener...');
      supabase.removeChannel(channel);
    };
  }, [isSalonOwner, ownedSalons, isLoading, toast]);

  // This component doesn't render anything
  return null;
};

export default SalonOwnerBookingListener;
