import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: string;
    user_id: string;
    phone: string | null;
    full_name: string | null;
  };
  schema: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Welcome notification function triggered");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    // Only process INSERT events on profiles table
    if (payload.type !== "INSERT" || payload.table !== "profiles") {
      console.log("Ignoring non-INSERT event or non-profiles table");
      return new Response(JSON.stringify({ message: "Ignored" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone, full_name } = payload.record;

    if (!phone) {
      console.log("No phone number found for user, skipping SMS");
      return new Response(JSON.stringify({ message: "No phone number" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format phone number (ensure it has country code)
    let formattedPhone = phone.replace(/\s+/g, "").replace(/-/g, "");
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+91" + formattedPhone; // Default to India
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!accountSid || !authToken || !twilioPhone) {
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "Twilio not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userName = full_name || "there";
    const welcomeMessage = `🎉 Welcome to Grumming, ${userName}! We're thrilled to have you. Book your first appointment and get exciting discounts with code FIRST100. Happy grooming! 💇‍♂️`;

    console.log(`Sending welcome SMS to ${formattedPhone}`);

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: formattedPhone,
        From: twilioPhone,
        Body: welcomeMessage,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Twilio API error:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: result }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Welcome SMS sent successfully:", result.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: result.sid }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in welcome notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
