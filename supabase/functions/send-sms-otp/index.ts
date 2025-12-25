import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Twilio credentials
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

// Rate limit: max 3 OTP sends per phone per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SEND_ATTEMPTS = 3;

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send SMS via Twilio
async function sendSMSViaTwilio(phone: string, otp: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('Missing Twilio credentials');
    return false;
  }

  const message = `Your Grumming verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_PHONE_NUMBER,
          Body: message,
        }),
      }
    );

    const result = await response.json();
    console.log('Twilio response:', JSON.stringify(result));

    if (result.error_code || result.error_message) {
      console.error('Twilio error:', result.error_message);
      return false;
    }

    return result.status === 'queued' || result.status === 'sent' || result.sid;
  } catch (error) {
    console.error('Error sending SMS via Twilio:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    console.log('Received OTP request for phone:', phone);

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone number format (Indian numbers)
    const phoneRegex = /^\+91[6-9][0-9]{9}$/;
    if (!phoneRegex.test(phone)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Indian phone number format. Use +91XXXXXXXXXX (starting with 6-9)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Check rate limit
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { data: recentAttempts, error: rateLimitError } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('phone', phone)
      .eq('attempt_type', 'send')
      .gte('attempted_at', rateLimitCutoff);

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (recentAttempts && recentAttempts.length >= MAX_SEND_ATTEMPTS) {
      console.log(`Rate limit exceeded for ${phone}: ${recentAttempts.length} attempts in last minute`);
      return new Response(
        JSON.stringify({ error: 'Too many OTP requests. Please wait 1 minute before trying again.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record this attempt
    const { error: recordError } = await supabase
      .from('otp_rate_limits')
      .insert({
        phone,
        attempt_type: 'send',
        ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
      });

    if (recordError) {
      console.error('Failed to record rate limit attempt:', recordError);
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    console.log(`Generated OTP: ${otp} for phone: ${phone}, expires at: ${expiresAt.toISOString()}`);

    // Delete any existing OTP for this phone first
    await supabase.from('phone_otps').delete().eq('phone', phone);

    // Store OTP in database
    const { error: dbError } = await supabase
      .from('phone_otps')
      .insert({
        phone,
        otp_code: otp,
        expires_at: expiresAt.toISOString(),
        verified: false,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to send SMS via Twilio
    let smsSent = false;
    if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
      try {
        smsSent = await sendSMSViaTwilio(phone, otp);
        console.log(`SMS send result via Twilio: ${smsSent}`);
      } catch (smsError) {
        console.error('Twilio error:', smsError);
      }
    } else {
      console.log('Twilio credentials not configured');
    }

    // If SMS failed, still return success (OTP stored in DB for testing)
    if (!smsSent) {
      console.log(`[DEV MODE] OTP for ${phone}: ${otp}`);
    }

    // Cleanup old rate limit records (older than 1 hour)
    const cleanupCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('otp_rate_limits')
      .delete()
      .lt('attempted_at', cleanupCutoff);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: smsSent ? 'OTP sent successfully' : 'OTP generated (check logs in dev mode)',
        // Remove debug_otp in production
        debug_otp: smsSent ? undefined : otp
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sms-otp:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
