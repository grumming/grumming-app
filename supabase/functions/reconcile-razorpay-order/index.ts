import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RazorpayOrderPaymentsResponse = {
  count: number;
  items: Array<{
    id: string;
    status: string;
    method?: string;
    amount?: number;
    currency?: string;
    captured?: boolean;
    created_at?: number;
  }>;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { booking_id, razorpay_order_id } = await req.json();

    if (!booking_id || !razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: "booking_id and razorpay_order_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!keyId || !keySecret) {
      throw new Error("Payment gateway not configured");
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If we already confirmed this booking, return early (idempotent).
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, payment_id, service_price, user_id, salon_id, salon_name")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.payment_id && booking.status === "confirmed") {
      return new Response(
        JSON.stringify({ status: "captured", payment_id: booking.payment_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const auth = btoa(`${keyId}:${keySecret}`);

    const paymentsRes = await fetch(
      `https://api.razorpay.com/v1/orders/${razorpay_order_id}/payments`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!paymentsRes.ok) {
      const text = await paymentsRes.text();
      console.error("Razorpay order payments fetch failed:", text);
      throw new Error("Failed to fetch payment status");
    }

    const paymentsData = (await paymentsRes.json()) as RazorpayOrderPaymentsResponse;

    if (!paymentsData?.items?.length) {
      // No payment attempt created for this order.
      return new Response(
        JSON.stringify({ status: "cancelled", payments_count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const capturedPayment = paymentsData.items.find(
      (p) => p.status === "captured" || p.captured === true
    );

    if (!capturedPayment) {
      // Payment exists but isn't captured yet (UPI collect can be "in process").
      const last = paymentsData.items[0];
      return new Response(
        JSON.stringify({
          status: "pending",
          payments_count: paymentsData.items.length,
          last_payment_status: last?.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const razorpayPaymentId = capturedPayment.id;

    // Avoid duplicate payment records
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", razorpayPaymentId)
      .maybeSingle();

    const serviceAmount = parseFloat(booking.service_price as unknown as string);
    const feePercentage = 8;
    const platformFee = Math.round(serviceAmount * feePercentage) / 100;
    const salonAmount = serviceAmount - platformFee;

    if (!existingPayment) {
      const { error: paymentInsertError } = await supabase.from("payments").insert({
        booking_id,
        user_id: booking.user_id,
        salon_id: booking.salon_id,
        amount: serviceAmount,
        currency: "INR",
        status: "captured",
        razorpay_order_id,
        razorpay_payment_id: razorpayPaymentId,
        payment_method: "razorpay",
        platform_fee: platformFee,
        salon_amount: salonAmount,
        fee_percentage: feePercentage,
        captured_at: new Date().toISOString(),
      });

      if (paymentInsertError) {
        console.error("Failed to insert payment record:", paymentInsertError);
      }
    }

    // Mark any pending penalties as paid for this user (platform revenue)
    const { error: penaltyError } = await supabase
      .from("cancellation_penalties")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        paid_booking_id: booking_id,
      })
      .eq("user_id", booking.user_id)
      .eq("is_paid", false)
      .eq("is_waived", false);

    if (penaltyError) {
      console.error("Failed to update penalties:", penaltyError);
    }

    // Update booking with confirmed status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        payment_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
    }

    // Send payment receipt email (best-effort)
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-payment-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          booking_id,
          payment_id: razorpayPaymentId,
          amount: serviceAmount,
        }),
      });
    } catch (e) {
      console.error("Failed to send payment receipt:", e);
    }

    return new Response(
      JSON.stringify({ status: "captured", payment_id: razorpayPaymentId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in reconcile-razorpay-order:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
