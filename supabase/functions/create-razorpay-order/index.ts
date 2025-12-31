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
    const { amount, currency = 'INR', receipt, notes, booking_id } = await req.json();

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

    // Use the amount from the database for security (server-side validation)
    const validatedAmount = parseFloat(booking.service_price);
    console.log(`Creating order for validated amount: ${validatedAmount} ${currency} for booking: ${booking_id}`);

    console.log(`Creating order for validated amount: ${validatedAmount} ${currency} for booking: ${booking_id}`);

    // Create Razorpay order with validated amount
    const auth = btoa(`${keyId}:${keySecret}`);
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(validatedAmount * 100), // Razorpay expects amount in paise
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
        notes: { ...notes, booking_id },
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