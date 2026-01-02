import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  booking_id: string;
  user_id: string;
  salon_id: string;
  amount: number;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  payment_method?: string;
  fee_percentage?: number;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PaymentRequest = await req.json();
    const {
      booking_id,
      user_id,
      salon_id,
      amount,
      razorpay_order_id,
      razorpay_payment_id,
      payment_method,
      fee_percentage = 10 // Default 10% platform fee
    } = body;

    console.log("Processing payment:", { booking_id, amount, razorpay_order_id });

    // Calculate split
    const platform_fee = Math.round((amount * fee_percentage) / 100 * 100) / 100;
    const salon_amount = amount - platform_fee;

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        booking_id,
        user_id,
        salon_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        status: razorpay_payment_id ? "captured" : "pending",
        payment_method,
        platform_fee,
        salon_amount,
        fee_percentage,
        captured_at: razorpay_payment_id ? new Date().toISOString() : null
      })
      .select()
      .single();

    if (paymentError) {
      console.error("Error creating payment:", paymentError);
      throw paymentError;
    }

    console.log("Payment created:", payment.id);

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        platform_fee,
        salon_amount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    console.error("Error in process-payment:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
