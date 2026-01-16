import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Platform commission percentage - enforced server-side only
const PLATFORM_FEE_PERCENTAGE = 8;

interface PaymentRequest {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  payment_method?: string;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's auth token to verify identity
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    
    if (claimsError || !claimsData?.user) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.user.id;
    console.log("Authenticated user:", authenticatedUserId);

    // 2. Parse request - only accept booking_id and razorpay IDs from client
    const body: PaymentRequest = await req.json();
    const {
      booking_id,
      razorpay_order_id,
      razorpay_payment_id,
      payment_method
    } = body;

    if (!booking_id || !razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: booking_id and razorpay_order_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 3. Fetch booking from database to get all payment details
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, user_id, salon_id, service_price, salon_name, service_name, status")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Verify that the authenticated user owns this booking
    if (booking.user_id !== authenticatedUserId) {
      console.error("User does not own booking:", { authenticatedUserId, bookingUserId: booking.user_id });
      return new Response(
        JSON.stringify({ error: "Unauthorized - You do not own this booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Use booking data for payment details (not client-provided)
    const amount = booking.service_price;
    const user_id = booking.user_id;
    const salon_id = booking.salon_id;

    console.log("Processing payment:", { booking_id, amount, razorpay_order_id, user_id });

    // 6. Calculate split using server-enforced fee percentage
    const platform_fee = Math.round((amount * PLATFORM_FEE_PERCENTAGE) / 100 * 100) / 100;
    const salon_amount = amount - platform_fee;

    // 7. Create payment record
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
        fee_percentage: PLATFORM_FEE_PERCENTAGE,
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
