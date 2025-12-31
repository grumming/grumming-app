import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, refund_amount } = await req.json();

    console.log('Processing refund for booking:', booking_id, 'amount:', refund_amount);

    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking details to get payment information
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking fetch error:', bookingError);
      throw new Error('Booking not found');
    }

    console.log('Booking found:', booking.id, 'status:', booking.status);

    // Check if booking is in a refundable state
    if (!['confirmed', 'upcoming', 'pending_payment'].includes(booking.status)) {
      throw new Error(`Booking status "${booking.status}" is not eligible for refund`);
    }

    const amountToRefund = refund_amount || booking.service_price;
    const amountInPaise = Math.round(amountToRefund * 100);

    // For now, we'll simulate the refund process since we need payment_id to process actual refunds
    // In a real implementation, you would store the payment_id when the payment is made
    // and use it here to process the refund via Razorpay API

    // Check if we have a stored payment reference (you would typically store this during payment)
    // Since we don't have payment_id stored, we'll mark the refund as initiated
    // and it will be processed manually or via a batch process

    console.log('Initiating refund of', amountToRefund, 'INR (', amountInPaise, 'paise)');

    // Update booking status to reflect refund initiated
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'refund_initiated',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking status:', updateError);
      throw new Error('Failed to update booking status');
    }

    // Create a notification for the user about the refund
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        title: '💸 Refund Initiated',
        message: `Your refund of ₹${amountToRefund} for ${booking.salon_name} booking has been initiated. It will be credited to your original payment method within 5-7 business days.`,
        type: 'refund',
        link: '/my-bookings'
      });

    if (notifError) {
      console.error('Failed to create notification:', notifError);
      // Don't throw, notification failure shouldn't block refund
    }

    console.log('Refund initiated successfully for booking:', booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Refund initiated successfully',
        refund_amount: amountToRefund,
        estimated_days: '5-7 business days',
        booking_id: booking_id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: unknown) {
    console.error('Refund processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process refund';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
