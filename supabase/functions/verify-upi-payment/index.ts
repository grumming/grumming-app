import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpayKeySecret) {
      console.error('RAZORPAY_KEY_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Payment verification not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get the webhook signature from headers
    const signature = req.headers.get('x-razorpay-signature');
    const body = await req.text();
    
    console.log('Received webhook payload');

    // Verify webhook signature if present (Razorpay webhook)
    if (signature) {
      const expectedSignature = createHmac('sha256', razorpayKeySecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid webhook signature');
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      console.log('Webhook signature verified');
    }

    const payload = JSON.parse(body);
    console.log('Webhook event:', payload.event);

    // Handle different payment events
    let bookingId: string | null = null;
    let paymentStatus: string = '';
    let paymentId: string = '';
    let userId: string | null = null;

    if (payload.event === 'payment.captured' || payload.event === 'payment.authorized') {
      // Payment successful
      const payment = payload.payload?.payment?.entity;
      if (payment) {
        bookingId = payment.notes?.booking_id || payment.description?.match(/booking_id:(\S+)/)?.[1];
        paymentId = payment.id;
        paymentStatus = 'confirmed';
        console.log(`Payment captured: ${paymentId} for booking: ${bookingId}`);
      }
    } else if (payload.event === 'payment.failed') {
      // Payment failed
      const payment = payload.payload?.payment?.entity;
      if (payment) {
        bookingId = payment.notes?.booking_id || payment.description?.match(/booking_id:(\S+)/)?.[1];
        paymentId = payment.id;
        paymentStatus = 'payment_failed';
        console.log(`Payment failed: ${paymentId} for booking: ${bookingId}`);
      }
    } else if (payload.event === 'order.paid') {
      // Order paid (alternative event)
      const order = payload.payload?.order?.entity;
      if (order) {
        bookingId = order.notes?.booking_id || order.receipt;
        paymentId = order.id;
        paymentStatus = 'confirmed';
        console.log(`Order paid: ${paymentId} for booking: ${bookingId}`);
      }
    } else if (payload.booking_id && payload.status) {
      // Direct API call format for manual verification
      bookingId = payload.booking_id;
      paymentStatus = payload.status === 'success' ? 'confirmed' : 'payment_failed';
      paymentId = payload.payment_id || 'manual_verification';
      console.log(`Manual verification: ${paymentId} for booking: ${bookingId}`);
    } else {
      console.log('Unhandled event type:', payload.event);
      return new Response(
        JSON.stringify({ received: true, message: 'Event type not handled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!bookingId) {
      console.error('No booking ID found in webhook payload');
      return new Response(
        JSON.stringify({ error: 'No booking ID in payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update booking status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .update({ 
        status: paymentStatus === 'confirmed' ? 'upcoming' : 'payment_failed'
      })
      .eq('id', bookingId)
      .select('user_id, salon_name, service_name, booking_date, booking_time')
      .single();

    if (bookingError) {
      console.error('Error updating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Failed to update booking', details: bookingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    userId = booking?.user_id;
    console.log(`Booking ${bookingId} updated to status: ${paymentStatus}`);

    // Create notification for the user
    if (userId) {
      const notificationTitle = paymentStatus === 'confirmed' 
        ? '✅ Payment Successful!' 
        : '❌ Payment Failed';
      
      const notificationMessage = paymentStatus === 'confirmed'
        ? `Your booking at ${booking.salon_name} for ${booking.service_name} on ${booking.booking_date} has been confirmed.`
        : `Payment for your booking at ${booking.salon_name} failed. Please try again.`;

      const { error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'payment',
          link: '/my-bookings'
        });

      if (notifError) {
        console.error('Error creating notification:', notifError);
      } else {
        console.log('Notification created for user:', userId);
      }

      // Try to send push notification
      try {
        const pushResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            user_id: userId,
            title: notificationTitle,
            body: notificationMessage,
            data: { type: 'payment', link: '/my-bookings', booking_id: bookingId }
          })
        });
        
        if (pushResponse.ok) {
          console.log('Push notification sent successfully');
        }
      } catch (pushError) {
        console.error('Failed to send push notification:', pushError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        booking_id: bookingId,
        status: paymentStatus,
        message: 'Payment verification processed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook processing error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
