import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, email } = await req.json();

    if (!user_id || !email) {
      console.error("Missing required fields:", { user_id, email });
      return new Response(
        JSON.stringify({ error: "user_id and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Sending email OTP to:", email);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTPs for this user/email
    await supabase
      .from("email_otps")
      .delete()
      .eq("user_id", user_id)
      .eq("email", email);

    // Store new OTP
    const { error: insertError } = await supabase
      .from("email_otps")
      .insert({
        user_id,
        email,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to generate OTP" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "Grumming <onboarding@resend.dev>",
      to: [email],
      subject: "Verify your email - Grumming",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9f4f1; padding: 40px 20px;">
          <div style="max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #c9a07a; font-size: 28px; margin: 0;">Grumming</h1>
              <p style="color: #666; font-size: 14px; margin-top: 8px;">Beauty at your fingertips</p>
            </div>
            
            <h2 style="color: #333; font-size: 20px; text-align: center; margin-bottom: 10px;">Verify Your Email</h2>
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 30px;">Use this code to verify your email address:</p>
            
            <div style="background: linear-gradient(135deg, #c9a07a 0%, #e8c9a9 100%); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 30px;">
              <span style="font-size: 36px; font-weight: bold; color: white; letter-spacing: 8px;">${otp}</span>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center;">This code expires in 10 minutes.</p>
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 20px;">If you didn't request this, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in send-email-otp:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
