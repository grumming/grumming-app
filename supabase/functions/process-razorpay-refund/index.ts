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
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - No authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - Invalid token' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    console.log('User authenticated:', user.id);

    // ===== ADMIN AUTHORIZATION CHECK =====
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to verify permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!roleData) {
      console.error('User is not an admin:', user.id);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - Admin access required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log('Admin authorization confirmed for user:', user.id);

    // ===== PROCESS REFUND REQUEST =====
    const { booking_id, refund_amount } = await req.json();

    console.log('Processing refund for booking:', booking_id, 'amount:', refund_amount, 'initiated by admin:', user.id);

    if (!booking_id) {
      throw new Error('booking_id is required');
    }

    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

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

    console.log('Booking found:', booking.id, 'status:', booking.status, 'payment_id:', booking.payment_id);

    // ===== AUDIT LOG =====
    // Log the refund attempt for audit trail
    try {
      await supabase
        .from('refund_audit_log')
        .insert({
          booking_id: booking_id,
          admin_user_id: user.id,
          action: 'refund_initiated',
          previous_status: booking.status,
          new_status: 'refund_processing',
          refund_amount: refund_amount || booking.service_price,
          note: `Refund initiated by admin ${user.id}`
        });
    } catch (auditError) {
      console.error('Failed to create audit log:', auditError);
      // Don't fail the refund if audit log fails
    }

    // Check if booking is in a refundable state
    if (!['confirmed', 'upcoming', 'pending_payment'].includes(booking.status)) {
      throw new Error(`Booking status "${booking.status}" is not eligible for refund`);
    }

    const amountToRefund = refund_amount || booking.service_price;
    const amountInPaise = Math.round(amountToRefund * 100);

    let refundId = null;
    let refundStatus = 'initiated';

    // If we have a payment_id, process actual Razorpay refund
    if (booking.payment_id) {
      console.log('Processing Razorpay refund for payment:', booking.payment_id);

      const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      
      const refundResponse = await fetch(
        `https://api.razorpay.com/v1/payments/${booking.payment_id}/refund`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amountInPaise,
            speed: 'normal',
            notes: {
              booking_id: booking_id,
              reason: 'Customer requested cancellation',
            },
          }),
        }
      );

      const refundData = await refundResponse.json();
      console.log('Razorpay refund response:', refundData);

      if (!refundResponse.ok) {
        console.error('Razorpay refund failed:', refundData);
        throw new Error(refundData.error?.description || 'Razorpay refund failed');
      }

      refundId = refundData.id;
      refundStatus = refundData.status || 'processed';
      console.log('Razorpay refund successful:', refundId, 'status:', refundStatus);
    } else {
      console.log('No payment_id found - marking as manual refund required');
      refundStatus = 'manual_required';
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: booking.payment_id ? 'refunded' : 'refund_initiated',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('Failed to update booking status:', updateError);
      throw new Error('Failed to update booking status');
    }

    // Create a notification for the user about the refund
    const notificationMessage = booking.payment_id
      ? `Your refund of ₹${amountToRefund} for ${booking.salon_name} booking has been processed. It will be credited to your original payment method within 5-7 business days.`
      : `Your refund of ₹${amountToRefund} for ${booking.salon_name} booking has been initiated. Our team will process it within 5-7 business days.`;

    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: booking.user_id,
        title: booking.payment_id ? '✅ Refund Processed' : '💸 Refund Initiated',
        message: notificationMessage,
        type: 'refund',
        link: '/my-bookings'
      });

    if (notifError) {
      console.error('Failed to create notification:', notifError);
    }

    // Send refund email notification
    try {
      const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-refund-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          user_id: booking.user_id,
          booking_id: booking_id,
          salon_name: booking.salon_name,
          service_name: booking.service_name,
          refund_amount: amountToRefund,
          refund_status: booking.payment_id ? 'processed' : 'initiated',
          refund_id: refundId,
          estimated_days: '5-7 business days',
        }),
      });
      const emailResult = await emailResponse.json();
      console.log('Refund email notification result:', emailResult);
    } catch (emailError) {
      console.error('Failed to send refund email:', emailError);
      // Don't fail the refund if email fails
    }

    console.log('Refund completed for booking:', booking_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: booking.payment_id ? 'Refund processed successfully' : 'Refund initiated - manual processing required',
        refund_id: refundId,
        refund_status: refundStatus,
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
