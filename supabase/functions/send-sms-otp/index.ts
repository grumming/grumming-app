import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS configuration with restricted origins for production
const ALLOWED_ORIGINS = [
  'https://grummingcom.lovable.app',
  'https://grumming.com',
  'https://www.grumming.com',
  'http://localhost:5173',
  'http://localhost:8080',
];

// Check if origin matches allowed patterns (including Lovable preview URLs)
function isAllowedOrigin(origin: string): boolean {
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow Lovable preview URLs (e.g., id-preview--*.lovable.app)
  if (/^https:\/\/[a-z0-9-]+--[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Helper to mask phone numbers in logs for PII protection
function maskPhone(phone: string): string {
  if (phone.length <= 6) return '***';
  return phone.slice(0, 5) + '***' + phone.slice(-2);
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// SMS Provider credentials
const FAST2SMS_API_KEY = Deno.env.get('FAST2SMS_API_KEY');
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

// Rate limit: max 3 OTP sends per phone per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_SEND_ATTEMPTS = 3;

// Generate a 6-digit OTP using cryptographically secure random
function generateOTP(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = (array[0] % 900000) + 100000;
  return otp.toString();
}

// Check if phone is in test whitelist (dynamic from database)
async function getTestPhoneOtp(supabase: any, phone: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('test_phone_whitelist')
      .select('otp_code, is_active')
      .eq('phone', phone)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    console.log(`Test phone detected: ${maskPhone(phone)}, using fixed OTP`);
    return data.otp_code;
  } catch (error) {
    console.error('Error checking test whitelist');
    return null;
  }
}

// Send SMS via Fast2SMS (for Indian numbers)
async function sendSMSViaFast2SMS(phone: string, otp: string): Promise<boolean> {
  if (!FAST2SMS_API_KEY) {
    console.log('FAST2SMS_API_KEY not configured, skipping Fast2SMS');
    return false;
  }

  // Extract the 10-digit number without country code
  const phoneNumber = phone.replace('+91', '').replace(/\D/g, '');
  
  if (phoneNumber.length !== 10) {
    console.error('Invalid phone number length for Fast2SMS');
    return false;
  }

  const message = `Your Grumming verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  try {
    // Using Fast2SMS Quick Transactional Route
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': FAST2SMS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route: 'q', // Quick SMS route (for OTP)
        message: message,
        language: 'english',
        flash: 0,
        numbers: phoneNumber,
      }),
    });

    const result = await response.json();
    console.log('Fast2SMS response status:', response.status);

    if (result.return === true || result.return === 'true') {
      console.log('SMS sent successfully via Fast2SMS');
      return true;
    } else {
      console.error('Fast2SMS error:', result.status_code || 'unknown');
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS via Fast2SMS');
    return false;
  }
}

// Send SMS via Twilio (fallback provider)
async function sendSMSViaTwilio(phone: string, otp: string): Promise<boolean> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.log('Twilio credentials not configured, skipping Twilio');
    return false;
  }

  const message = `Your Grumming verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`;

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    
    const response = await fetch(url, {
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
    });

    const result = await response.json();
    console.log('Twilio response status:', response.status);

    if (response.ok && result.sid) {
      console.log('SMS sent successfully via Twilio');
      return true;
    } else {
      console.error('Twilio error:', result.code || 'unknown');
      return false;
    }
  } catch (error) {
    console.error('Error sending SMS via Twilio');
    return false;
  }
}

// Send SMS with fallback providers
async function sendSMS(phone: string, otp: string): Promise<{ sent: boolean; provider: string }> {
  // Try Twilio first (primary provider)
  console.log('Attempting to send SMS via Twilio...');
  const twilioResult = await sendSMSViaTwilio(phone, otp);
  if (twilioResult) {
    return { sent: true, provider: 'Twilio' };
  }

  // Fallback to Fast2SMS
  console.log('Twilio failed, attempting Fast2SMS fallback...');
  const fast2smsResult = await sendSMSViaFast2SMS(phone, otp);
  if (fast2smsResult) {
    return { sent: true, provider: 'Fast2SMS' };
  }

  console.error('All SMS providers failed');
  return { sent: false, provider: 'none' };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, isSignUp } = await req.json();
    console.log('Received OTP request for phone:', maskPhone(phone), 'isSignUp:', isSignUp);

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

    const tempEmail = `${phone.replace('+', '')}@phone.grumming.app`;
    
    // Search for existing user
    let existingUser = null;
    let page = 1;
    
    while (!existingUser && page <= 5) {
      const { data: usersPage } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      
      if (usersPage?.users && usersPage.users.length > 0) {
        existingUser = usersPage.users.find(u => 
          u.phone === phone || u.email === tempEmail
        );
        
        if (!existingUser && usersPage.users.length === 1000) {
          page++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // If signup mode, check if user already exists
    if (isSignUp && existingUser) {
      console.log(`User already exists for phone ${maskPhone(phone)}, blocking signup OTP`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account already exists',
          code: 'ACCOUNT_EXISTS',
          message: 'This mobile number is already registered. Please login instead.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If login mode, check if user does NOT exist
    if (!isSignUp && !existingUser) {
      console.log(`No account found for phone ${maskPhone(phone)}, blocking login OTP`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No account found',
          code: 'NO_ACCOUNT',
          message: 'This mobile number is not registered. Please sign up first.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit for all numbers (live mode)
    const rateLimitCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
    const { data: recentAttempts, error: rateLimitError } = await supabase
      .from('otp_rate_limits')
      .select('*')
      .eq('phone', phone)
      .eq('attempt_type', 'send')
      .gte('attempted_at', rateLimitCutoff);

    if (rateLimitError) {
      console.error('Rate limit check error');
    }

    if (recentAttempts && recentAttempts.length >= MAX_SEND_ATTEMPTS) {
      console.log(`Rate limit exceeded for ${maskPhone(phone)}: ${recentAttempts.length} attempts in last minute`);
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
      console.error('Failed to record rate limit attempt');
    }

    // Check if this is a test phone number
    const testOtp = await getTestPhoneOtp(supabase, phone);
    
    if (testOtp) {
      // Test phone - use fixed OTP from whitelist, skip SMS
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      
      // Delete any existing OTP for this phone first
      await supabase.from('phone_otps').delete().eq('phone', phone);
      
      // Store test OTP in database
      const { error: dbError } = await supabase
        .from('phone_otps')
        .insert({
          phone,
          otp_code: testOtp,
          expires_at: expiresAt.toISOString(),
          verified: false,
        });

      if (dbError) {
        console.error('Database error storing OTP');
        return new Response(
          JSON.stringify({ error: 'Failed to generate OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Test mode: OTP stored for ${maskPhone(phone)}, no SMS sent`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent successfully',
          isTestMode: true,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate OTP for regular numbers (live mode)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry
    console.log(`Generated OTP for phone: ${maskPhone(phone)}, expires at: ${expiresAt.toISOString()}`);

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
      console.error('Database error storing OTP');
      return new Response(
        JSON.stringify({ error: 'Failed to generate OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS with fallback providers
    const { sent: smsSent, provider } = await sendSMS(phone, otp);
    console.log(`SMS send result: ${smsSent} via ${provider}`);

    // Cleanup old rate limit records (older than 1 hour)
    const cleanupCutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    await supabase
      .from('otp_rate_limits')
      .delete()
      .lt('attempted_at', cleanupCutoff);

    // If SMS failed, return error
    if (!smsSent) {
      console.error(`All SMS providers failed for ${maskPhone(phone)}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send SMS. Please try again later.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-sms-otp');
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
