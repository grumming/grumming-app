import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { amount, currency = 'INR', receipt, notes, booking_id, penalty_amount = 0 } = await req.json();

    // Validate booking_id is required for payment security
    if (!booking_id) {
      console.error('Missing booking_id in payment request');
      return new Response(JSON.stringify({ error: 'Booking ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!keyId || !keySecret) {
      console.error('Razorpay credentials not configured');
      throw new Error('Payment gateway not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase credentials not configured');
      throw new Error('Server configuration error');
    }

    // Initialize Supabase client with service role for validation
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch booking to validate amount server-side
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('service_price, status, user_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Invalid booking:', bookingError?.message || 'Booking not found');
      return new Response(JSON.stringify({ error: 'Invalid booking' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate booking is in a payable status (pending_payment or payment_failed for retry)
    const payableStatuses = ['pending_payment', 'payment_failed', 'upcoming'];
    if (!payableStatuses.includes(booking.status)) {
      console.error('Booking status not payable:', booking.status);
      return new Response(JSON.stringify({ error: 'Booking cannot be paid for' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate total amount: service price + any penalty
    // Penalty is platform revenue, not salon revenue
    const servicePrice = parseFloat(booking.service_price);
    const penaltyAmount = parseFloat(penalty_amount) || 0;
    const totalAmount = servicePrice + penaltyAmount;
    
    console.log(`Creating order - Service: ${servicePrice}, Penalty: ${penaltyAmount}, Total: ${totalAmount} ${currency} for booking: ${booking_id}`);

    // Create Razorpay order with total amount (service + penalty)
    const auth = btoa(`${keyId}:${keySecret}`);
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100), // Razorpay expects amount in paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: { ...notes, booking_id, service_price: servicePrice, penalty_amount: penaltyAmount },
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorData);
      throw new Error('Failed to create payment order');
    }

    const order = await orderResponse.json();
    console.log('Order created successfully:', order.id);

    return new Response(JSON.stringify({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: keyId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in create-razorpay-order:', error.message);
    return new Response(JSON.stringify({ error: 'Payment processing failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});