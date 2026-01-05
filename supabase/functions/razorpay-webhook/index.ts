import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!razorpayKeySecret) {
    console.error("RAZORPAY_KEY_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook secret not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let logId: string | null = null;

  try {
    const signature = req.headers.get("x-razorpay-signature");
    const body = await req.text();

    console.log("Razorpay webhook received");

    // Verify webhook signature
    if (signature) {
      const expectedSignature = createHmac("sha256", razorpayKeySecret)
        .update(body)
        .digest("hex");

      if (signature !== expectedSignature) {
        console.error("Invalid webhook signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.log("Webhook signature verified");
    } else {
      console.warn("No signature provided - rejecting for security");
      return new Response(JSON.stringify({ error: "Signature required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.parse(body);
    const event = payload.event as string;
    const eventId = payload.payload?.payment?.entity?.id || payload.payload?.order?.entity?.id || null;
    console.log("Webhook event:", event);

    // Log the webhook event to database
    const { data: logData, error: logError } = await supabase
      .from("webhook_logs")
      .insert({
        event_type: event,
        event_id: eventId,
        payload: payload,
        status: "received",
      })
      .select("id")
      .single();

    if (logError) {
      console.error("Failed to log webhook:", logError);
    } else {
      logId = logData?.id;
      console.log("Webhook logged with ID:", logId);
    }

    // Handle payment.captured or order.paid
    if (event === "payment.captured" || event === "payment.authorized") {
      const payment = payload.payload?.payment?.entity;
      if (!payment) {
        console.log("No payment entity in payload");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const razorpayPaymentId = payment.id as string;
      const razorpayOrderId = payment.order_id as string;
      const notes = payment.notes || {};
      const bookingId = notes.booking_id as string | undefined;

      console.log(`Payment captured: ${razorpayPaymentId}, order: ${razorpayOrderId}, booking: ${bookingId}`);

      if (!bookingId) {
        console.warn("No booking_id in payment notes, skipping DB update");
        return new Response(JSON.stringify({ received: true, warning: "No booking_id" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch booking
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, status, payment_id, service_price, user_id, salon_id, salon_name, service_name, booking_date, booking_time, completion_pin")
        .eq("id", bookingId)
        .single();

      if (bookingError || !booking) {
        console.error("Booking not found:", bookingId, bookingError);
        return new Response(JSON.stringify({ error: "Booking not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Idempotency: If already confirmed with this payment_id, skip
      if (booking.status === "confirmed" && booking.payment_id === razorpayPaymentId) {
        console.log("Booking already confirmed with this payment, skipping");
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if payment record already exists
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
        console.log("Creating payment record...");
        const { error: paymentInsertError } = await supabase.from("payments").insert({
          booking_id: bookingId,
          user_id: booking.user_id,
          salon_id: booking.salon_id,
          amount: serviceAmount,
          currency: "INR",
          status: "captured",
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          payment_method: "razorpay",
          platform_fee: platformFee,
          salon_amount: salonAmount,
          fee_percentage: feePercentage,
          captured_at: new Date().toISOString(),
        });

        if (paymentInsertError) {
          console.error("Failed to insert payment record:", paymentInsertError);
        } else {
          console.log("Payment record created");
        }
      }

      // Mark any pending penalties as paid
      const { error: penaltyError } = await supabase
        .from("cancellation_penalties")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
          paid_booking_id: bookingId,
        })
        .eq("user_id", booking.user_id)
        .eq("is_paid", false)
        .eq("is_waived", false);

      if (penaltyError) {
        console.error("Failed to update penalties:", penaltyError);
      }

      // Update booking to confirmed
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          status: "confirmed",
          payment_id: razorpayPaymentId,
          payment_method: "upi",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Failed to update booking:", updateError);
      } else {
        console.log("Booking confirmed via webhook");
      }

      // Create in-app notification
      const { error: notifError } = await supabase.from("notifications").insert({
        user_id: booking.user_id,
        title: "✅ Payment Successful!",
        message: `Your booking at ${booking.salon_name} for ${booking.service_name} on ${booking.booking_date} at ${booking.booking_time} is confirmed. PIN: ${booking.completion_pin || "----"}`,
        type: "payment",
        link: "/my-bookings",
      });

      if (notifError) {
        console.error("Failed to create notification:", notifError);
      }

      // Send push notification (best-effort)
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            user_id: booking.user_id,
            title: "✅ Payment Successful!",
            body: `Booking confirmed at ${booking.salon_name}. PIN: ${booking.completion_pin || "----"}`,
            notification_type: "booking_confirmations",
            data: {
              type: "payment",
              link: "/my-bookings",
              booking_id: bookingId,
            },
          }),
        });
      } catch (e) {
        console.error("Push notification failed:", e);
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
            booking_id: bookingId,
            payment_id: razorpayPaymentId,
            amount: serviceAmount,
          }),
        });
      } catch (e) {
        console.error("Payment receipt email failed:", e);
      }

      // Update log status
      if (logId) {
        await supabase.from("webhook_logs").update({
          status: "processed",
          processed_at: new Date().toISOString(),
        }).eq("id", logId);
      }

      return new Response(
        JSON.stringify({ received: true, booking_confirmed: true, booking_id: bookingId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle payment.failed
    if (event === "payment.failed") {
      const payment = payload.payload?.payment?.entity;
      const notes = payment?.notes || {};
      const bookingId = notes.booking_id as string | undefined;
      const errorDesc = payment?.error_description || "Payment failed";

      console.log(`Payment failed for booking: ${bookingId}, reason: ${errorDesc}`);

      if (bookingId) {
        // Update booking to payment_failed
        await supabase
          .from("bookings")
          .update({ status: "payment_failed", updated_at: new Date().toISOString() })
          .eq("id", bookingId);

        // Get user_id for notification
        const { data: booking } = await supabase
          .from("bookings")
          .select("user_id, salon_name")
          .eq("id", bookingId)
          .single();

        if (booking?.user_id) {
          await supabase.from("notifications").insert({
            user_id: booking.user_id,
            title: "❌ Payment Failed",
            message: `Payment for your booking at ${booking.salon_name} failed. Please try again or choose Pay at Salon.`,
            type: "payment",
            link: "/my-bookings",
          });
        }
      }

      return new Response(
        JSON.stringify({ received: true, event: "payment.failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle order.paid as backup
    if (event === "order.paid") {
      const order = payload.payload?.order?.entity;
      const notes = order?.notes || {};
      const bookingId = notes.booking_id as string | undefined;

      console.log(`Order paid event for booking: ${bookingId}`);

      // The payment.captured event should handle this, but we can use order.paid as backup
      // Just acknowledge receipt
      return new Response(
        JSON.stringify({ received: true, event: "order.paid", booking_id: bookingId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update log to processed for unhandled events
    if (logId) {
      await supabase.from("webhook_logs").update({
        status: "processed",
        processed_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    // Other events - just acknowledge
    console.log("Unhandled event type:", event);
    return new Response(
      JSON.stringify({ received: true, event }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook processing error:", errorMessage);

    // Update log to failed
    if (logId) {
      await supabase.from("webhook_logs").update({
        status: "failed",
        error_message: errorMessage,
        processed_at: new Date().toISOString(),
      }).eq("id", logId);
    }

    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
