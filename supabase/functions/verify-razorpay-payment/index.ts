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
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      booking_id 
    } = await req.json();

    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!keySecret) {
      console.error('Razorpay secret not configured');
      throw new Error('Payment gateway not configured');
    }

    console.log(`Verifying payment: ${razorpay_payment_id} for order: ${razorpay_order_id}`);

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const encoder = new TextEncoder();
    const key = encoder.encode(keySecret);
    const message = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      key,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signature = await crypto.subtle.sign("HMAC", cryptoKey, message);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error('Payment verification failed');
    }

    console.log('Payment verified successfully');

    // Update booking status if booking_id provided
    if (booking_id) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Fetch booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select('service_price, user_id, salon_id, salon_name')
        .eq('id', booking_id)
        .single();

      if (bookingError) {
        console.error('Failed to fetch booking:', bookingError);
        throw new Error('Booking not found');
      }

      // IMPORTANT: Only use service_price for salon earnings calculation
      // Penalties are platform revenue and NOT included in salon earnings
      const serviceAmount = parseFloat(booking.service_price);
      const feePercentage = 8; // Platform takes 8% commission on SERVICE ONLY
      const platformFee = Math.round(serviceAmount * feePercentage) / 100;
      const salonAmount = serviceAmount - platformFee;

      console.log(`Payment breakdown - Service: ₹${serviceAmount}, Platform Fee (8%): ₹${platformFee}, Salon Amount: ₹${salonAmount}`);

      // Create payment record in payments table
      // Store only the SERVICE amount, not the total (which may include penalty)
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          booking_id,
          user_id: booking.user_id,
          salon_id: booking.salon_id,
          amount: serviceAmount, // Only service amount, NOT including penalty
          currency: 'INR',
          status: 'captured',
          razorpay_order_id,
          razorpay_payment_id,
          payment_method: 'razorpay',
          platform_fee: platformFee,
          salon_amount: salonAmount, // Salon gets 92% of service price only
          fee_percentage: feePercentage,
          captured_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.error('Failed to create payment record:', paymentError);
        // Continue - don't fail the whole payment for this
      } else {
        console.log('Payment record created successfully with salon_amount:', salonAmount);
      }

      // Mark any pending penalties as paid for this user
      // Penalties go to platform, NOT to salons
      const { data: paidPenalties, error: penaltyError } = await supabase
        .from('cancellation_penalties')
        .update({ 
          is_paid: true, 
          paid_at: new Date().toISOString(),
          paid_booking_id: booking_id
        })
        .eq('user_id', booking.user_id)
        .eq('is_paid', false)
        .eq('is_waived', false)
        .select('id, penalty_amount');

      if (penaltyError) {
        console.error('Failed to update penalties:', penaltyError);
      } else if (paidPenalties && paidPenalties.length > 0) {
        const totalPenalty = paidPenalties.reduce((sum, p) => sum + parseFloat(p.penalty_amount), 0);
        console.log(`Marked ${paidPenalties.length} penalties as paid, total: ₹${totalPenalty} (platform revenue)`);
      }

      // Store payment_id for future refunds and update status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ 
          status: 'confirmed',
          payment_id: razorpay_payment_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id);

      if (updateError) {
        console.error('Failed to update booking:', updateError);
      } else {
        console.log('Booking status updated to confirmed');
        
        // Send payment receipt email
        try {
          const receiptResponse = await fetch(`${supabaseUrl}/functions/v1/send-payment-receipt`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              booking_id,
              payment_id: razorpay_payment_id,
              amount: serviceAmount, // Send service amount for receipt
            }),
          });
          
          const receiptResult = await receiptResponse.json();
          console.log('Payment receipt email result:', receiptResult);
        } catch (emailError) {
          console.error('Failed to send payment receipt email:', emailError);
          // Don't fail the payment verification if email fails
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment verified successfully',
      payment_id: razorpay_payment_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error in verify-razorpay-payment:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
